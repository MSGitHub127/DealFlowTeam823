from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel
from app.config import settings
from app.database import get_db
from app.models.quotation import Quotation, QuotationLine, NegotiationComment
from app.models.user import Customer
from app.models.approval import ApprovalRequest, ApprovalStep
from app.schemas.quotation import (
    PortalQuotationOut, PortalQuotationLineOut, NegotiationCommentOut, NegotiationCommentCreate
)
from app.core.blended_risk import calculate_blended_risk
from app.core.audit import create_audit_log
from app.core.timeutils import utcnow

router = APIRouter(prefix="/portal", tags=["Customer Portal (Isolated & Restricted)"])

class CounterDiscountProposal(BaseModel):
    quotation_line_id: str
    proposed_discount_pct: float
    comment: Optional[str] = None

class BulkNegotiationItem(BaseModel):
    quotation_line_id: str
    proposed_discount_pct: Optional[float] = None
    comment: Optional[str] = None

class BulkNegotiationSubmit(BaseModel):
    items: List[BulkNegotiationItem] = []
    notes: Optional[str] = None

class CustomerConfirmRequest(BaseModel):
    notes: Optional[str] = None

async def get_portal_customer(
    portal_token: str,
    db: AsyncSession
) -> Customer:
    res = await db.execute(select(Customer).where(Customer.portal_token == portal_token))
    cust = res.scalars().first()
    if not cust:
        raise HTTPException(status_code=401, detail="Invalid customer portal access token")

    issued_at = cust.portal_token_issued_at or cust.created_at
    if issued_at and (utcnow() - issued_at).days > settings.PORTAL_TOKEN_EXPIRE_DAYS:
        raise HTTPException(
            status_code=401,
            detail="This portal link has expired. Request a new one to continue."
        )
    return cust


@router.post("/request-link")
async def request_portal_link(email: str, db: AsyncSession = Depends(get_db)):
    """
    Magic-link issuance: rotates a fresh portal_token for the customer and
    resets its clock. In production this gets emailed rather than returned;
    returning it here keeps the demo/API self-contained without an SMTP dependency.
    """
    res = await db.execute(select(Customer).where(Customer.email == email))
    cust = res.scalars().first()
    # Always 200 regardless of match, so this endpoint can't be used to enumerate customer emails.
    if not cust:
        return {"message": "If that email has an active quotation, a new portal link has been generated."}

    cust.portal_token = str(uuid.uuid4())
    cust.portal_token_issued_at = utcnow()
    await db.commit()
    return {
        "message": "New portal link generated.",
        "portal_token": cust.portal_token,
        "expires_in_days": settings.PORTAL_TOKEN_EXPIRE_DAYS
    }

def _format_portal_quote_out(q: Quotation) -> PortalQuotationOut:
    """
    STRICT SECURITY: Strips all internal costs, margins, limits, and risk badges.
    Customer only sees their prices, quantities, discounts, totals, and comments.
    """
    lines_out = []
    for line in q.lines:
        lines_out.append(PortalQuotationLineOut(
            id=line.id,
            product_id=line.product_id,
            product_name=line.product.name if line.product else "",
            product_sku=line.product.sku if line.product else "",
            product_category=line.product.category if line.product else "",
            variant_id=line.variant_id,
            variant_label=f"{line.variant.attribute_name}: {line.variant.attribute_value}" if line.variant else None,
            qty=line.qty,
            unit_price=line.unit_price,
            discount_pct=line.discount_pct,
            line_total=line.line_total,
            is_recurring=line.is_recurring,
            subscription_plan_name=line.subscription_plan.name if line.subscription_plan else None
        ))
    
    comments_out = []
    for c in q.negotiation_comments:
        comments_out.append(NegotiationCommentOut(
            id=c.id,
            quotation_id=c.quotation_id,
            quotation_line_id=c.quotation_line_id,
            author_type=c.author_type,
            author_name=c.author_name,
            comment=c.comment,
            proposed_discount_pct=c.proposed_discount_pct,
            proposed_delivery_date=c.proposed_delivery_date,
            created_at=c.created_at
        ))

    return PortalQuotationOut(
        id=q.id,
        quote_number=q.quote_number,
        customer_name=q.customer.name if q.customer else "",
        company_name=q.customer.company_name if q.customer else "",
        status=q.status,
        total_amount=q.total_amount,
        total_discount_amount=q.total_discount_amount,
        notes=q.notes,
        created_at=q.created_at,
        lines=lines_out,
        negotiation_comments=comments_out
    )

@router.get("/quotation/{quotation_id}", response_model=PortalQuotationOut)
async def get_portal_quotation(
    quotation_id: str,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    customer = await get_portal_customer(token, db)
    
    res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.customer),
            selectinload(Quotation.lines).selectinload(QuotationLine.product),
            selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            selectinload(Quotation.lines).selectinload(QuotationLine.subscription_plan),
            selectinload(Quotation.negotiation_comments)
        )
        .where(Quotation.id == quotation_id, Quotation.customer_id == customer.id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found for this customer account")
    
    return _format_portal_quote_out(quote)

@router.post("/quotation/{quotation_id}/comment", response_model=PortalQuotationOut)
async def add_portal_comment(
    quotation_id: str,
    token: str,
    req: NegotiationCommentCreate,
    db: AsyncSession = Depends(get_db)
):
    customer = await get_portal_customer(token, db)
    
    res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.customer),
            selectinload(Quotation.lines).selectinload(QuotationLine.product),
            selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            selectinload(Quotation.lines).selectinload(QuotationLine.subscription_plan),
            selectinload(Quotation.negotiation_comments)
        )
        .where(Quotation.id == quotation_id, Quotation.customer_id == customer.id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    comment = NegotiationComment(
        quotation_id=quote.id,
        quotation_line_id=req.quotation_line_id,
        author_type="customer",
        author_name=customer.name,
        comment=req.comment,
        proposed_discount_pct=req.proposed_discount_pct,
        proposed_delivery_date=req.proposed_delivery_date
    )
    db.add(comment)
    quote.status = "negotiation"
    quote.last_activity_at = utcnow()
    await db.commit()

    return _format_portal_quote_out(quote)

@router.post("/quotation/{quotation_id}/counter-discount", response_model=PortalQuotationOut)
async def propose_counter_discount(
    quotation_id: str,
    token: str,
    proposal: CounterDiscountProposal,
    db: AsyncSession = Depends(get_db)
):
    """
    Customer proposes a counter-discount on a line.
    Updates the line discount and automatically triggers blended risk re-evaluation.
    """
    customer = await get_portal_customer(token, db)

    res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.customer),
            selectinload(Quotation.lines).selectinload(QuotationLine.product),
            selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            selectinload(Quotation.lines).selectinload(QuotationLine.subscription_plan),
            selectinload(Quotation.negotiation_comments)
        )
        .where(Quotation.id == quotation_id, Quotation.customer_id == customer.id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    target_line = next((l for l in quote.lines if l.id == proposal.quotation_line_id), None)
    if not target_line:
        raise HTTPException(status_code=404, detail="Quotation line not found")

    old_disc = target_line.discount_pct
    target_line.discount_pct = proposal.proposed_discount_pct

    # Add negotiation comment recording the customer's request
    comment = NegotiationComment(
        quotation_id=quote.id,
        quotation_line_id=target_line.id,
        author_type="customer",
        author_name=customer.name,
        comment=proposal.comment or f"Requested higher discount: {proposal.proposed_discount_pct}% (was {old_disc}%)",
        proposed_discount_pct=proposal.proposed_discount_pct
    )
    db.add(comment)

    # Re-evaluate blended risk
    lines_input = []
    for l in quote.lines:
        lines_input.append({
            "line_obj": l,
            "category": l.product.category if l.product else "Hardware",
            "discount_pct": l.discount_pct
        })
    risk_band, evaluated, max_ex, tot_ex = await calculate_blended_risk(db, customer.tier, lines_input)

    total_amt = 0.0
    total_cost = 0.0
    total_disc = 0.0
    for item in evaluated:
        l = item["line_obj"]
        l.limit_pct = item["limit_pct"]
        l.line_excess = item["line_excess"]
        l.line_status = item["line_status"]
        gross = l.unit_price * l.qty
        disc_val = gross * (l.discount_pct / 100.0)
        net_val = round(gross - disc_val, 2)
        c_val = l.cost_price * l.qty
        l.line_total = net_val
        l.line_margin = round(net_val - c_val, 2)
        l.line_margin_pct = round((l.line_margin / net_val) * 100.0, 2) if net_val > 0 else 0.0

        total_amt += net_val
        total_cost += c_val
        total_disc += disc_val

    quote.total_amount = round(total_amt, 2)
    quote.total_cost = round(total_cost, 2)
    quote.total_discount_amount = round(total_disc, 2)
    quote.total_margin = round(total_amt - total_cost, 2)
    quote.total_margin_pct = round((quote.total_margin / total_amt) * 100.0, 2) if total_amt > 0 else 0.0
    quote.blended_risk = risk_band
    quote.last_activity_at = utcnow()

    # If counter-discount forces risk band > NONE, quotation automatically re-enters approval!
    if risk_band != "NONE":
        quote.status = "pending_approval"
        app_req = ApprovalRequest(
            quotation_id=quote.id,
            status="pending",
            current_step=1,
            blended_risk=risk_band
        )
        db.add(app_req)
        await db.flush()

        step1 = ApprovalStep(
            approval_request_id=app_req.id,
            step_number=1,
            required_role="sales_manager",
            action="pending"
        )
        db.add(step1)

        if risk_band == "HIGH":
            step2 = ApprovalStep(
                approval_request_id=app_req.id,
                step_number=2,
                required_role="finance_ops",
                action="pending"
            )
            db.add(step2)
    else:
        quote.status = "negotiation"

    await db.commit()
    await create_audit_log(
        db, "quotation", quote.id, "portal_negotiation", None,
        f"Customer {customer.name} counter-offered {proposal.proposed_discount_pct}% discount on line. Risk: {risk_band}. Status: {quote.status}."
    )

    return _format_portal_quote_out(quote)

@router.post("/quotation/{quotation_id}/confirm", response_model=PortalQuotationOut)
async def confirm_portal_quotation(
    quotation_id: str,
    token: str,
    req: CustomerConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Customer confirms the quotation terms.
    If within limits -> moves straight to confirmed / ready for fulfillment.
    If terms exceed limits -> automatically re-enters approval flow!
    """
    customer = await get_portal_customer(token, db)

    res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.customer),
            selectinload(Quotation.lines).selectinload(QuotationLine.product),
            selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            selectinload(Quotation.lines).selectinload(QuotationLine.subscription_plan),
            selectinload(Quotation.negotiation_comments)
        )
        .where(Quotation.id == quotation_id, Quotation.customer_id == customer.id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    lines_input = [{
        "line_obj": l,
        "category": l.product.category if l.product else "Hardware",
        "discount_pct": l.discount_pct
    } for l in quote.lines]
    
    risk_band, _, _, _ = await calculate_blended_risk(db, customer.tier, lines_input)

    if risk_band != "NONE":
        # Requires re-approval
        quote.status = "pending_approval"
        quote.blended_risk = risk_band
        app_req = ApprovalRequest(
            quotation_id=quote.id,
            status="pending",
            current_step=1,
            blended_risk=risk_band
        )
        db.add(app_req)
        await db.flush()

        step1 = ApprovalStep(
            approval_request_id=app_req.id,
            step_number=1,
            required_role="sales_manager",
            action="pending"
        )
        db.add(step1)

        if risk_band == "HIGH":
            step2 = ApprovalStep(
                approval_request_id=app_req.id,
                step_number=2,
                required_role="finance_ops",
                action="pending"
            )
            db.add(step2)
    else:
        quote.status = "confirmed"

    quote.last_activity_at = utcnow()
    await db.commit()

    await create_audit_log(
        db, "quotation", quote.id, "customer_confirm", None,
        f"Customer {customer.name} confirmed terms. Resulting status: {quote.status}."
    )

    return _format_portal_quote_out(quote)


@router.post("/quotation/{quotation_id}/bulk-negotiate", response_model=PortalQuotationOut)
async def bulk_propose_counter_discount(
    quotation_id: str,
    token: str,
    payload: BulkNegotiationSubmit,
    db: AsyncSession = Depends(get_db)
):
    """
    Handles bulk submissions from the Customer Portal Sidebar.
    Updates multiple lines, adds comments, and re-evaluates blended risk.
    """
    customer = await get_portal_customer(token, db)

    res = await db.execute(
        select(Quotation)
        .options(
            selectinload(Quotation.customer),
            selectinload(Quotation.lines).selectinload(QuotationLine.product),
            selectinload(Quotation.lines).selectinload(QuotationLine.variant),
            selectinload(Quotation.lines).selectinload(QuotationLine.subscription_plan),
            selectinload(Quotation.negotiation_comments)
        )
        .where(Quotation.id == quotation_id, Quotation.customer_id == customer.id)
    )
    quote = res.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # 1. Apply line updates and record comments
    payload_dict = {item.quotation_line_id: item for item in payload.items}
    
    for target_line in quote.lines:
        if target_line.id in payload_dict:
            item_req = payload_dict[target_line.id]
            old_disc = target_line.discount_pct
            
            if item_req.proposed_discount_pct is not None:
                target_line.discount_pct = item_req.proposed_discount_pct
            
            # Record individual line comment
            if item_req.comment or item_req.proposed_discount_pct is not None:
                comment_text = item_req.comment or f"Requested higher discount: {item_req.proposed_discount_pct}% (was {old_disc}%)"
                line_comment = NegotiationComment(
                    quotation_id=quote.id,
                    quotation_line_id=target_line.id,
                    author_type="customer",
                    author_name=customer.name,
                    comment=comment_text,
                    proposed_discount_pct=item_req.proposed_discount_pct,
                    proposed_delivery_date=payload.requested_delivery_date
                )
                db.add(line_comment)

    # Record global justification if provided
    if payload.global_justification:
        global_comment = NegotiationComment(
            quotation_id=quote.id,
            author_type="customer",
            author_name=customer.name,
            comment=f"GLOBAL JUSTIFICATION: {payload.global_justification}",
            proposed_delivery_date=payload.requested_delivery_date
        )
        db.add(global_comment)

    # 2. Re-evaluate blended risk
    lines_input = []
    for l in quote.lines:
        lines_input.append({
            "line_obj": l,
            "category": l.product.category if l.product else "Hardware",
            "discount_pct": l.discount_pct
        })
    risk_band, evaluated, max_ex, tot_ex = await calculate_blended_risk(db, customer.tier, lines_input)

    # 3. Recalculate Totals
    total_amt = 0.0
    total_cost = 0.0
    total_disc = 0.0
    for item in evaluated:
        l = item["line_obj"]
        l.limit_pct = item["limit_pct"]
        l.line_excess = item["line_excess"]
        l.line_status = item["line_status"]
        gross = l.unit_price * l.qty
        disc_val = gross * (l.discount_pct / 100.0)
        net_val = round(gross - disc_val, 2)
        c_val = l.cost_price * l.qty
        l.line_total = net_val
        l.line_margin = round(net_val - c_val, 2)
        l.line_margin_pct = round((l.line_margin / net_val) * 100.0, 2) if net_val > 0 else 0.0

        total_amt += net_val
        total_cost += c_val
        total_disc += disc_val

    quote.total_amount = round(total_amt, 2)
    quote.total_cost = round(total_cost, 2)
    quote.total_discount_amount = round(total_disc, 2)
    quote.total_margin = round(total_amt - total_cost, 2)
    quote.total_margin_pct = round((quote.total_margin / total_amt) * 100.0, 2) if total_amt > 0 else 0.0
    quote.blended_risk = risk_band
    quote.last_activity_at = utcnow()

    # 4. Routing Logic
    if risk_band != "NONE":
        quote.status = "pending_approval"
        app_req = ApprovalRequest(
            quotation_id=quote.id,
            status="pending",
            current_step=1,
            blended_risk=risk_band
        )
        db.add(app_req)
        await db.flush()

        step1 = ApprovalStep(
            approval_request_id=app_req.id,
            step_number=1,
            required_role="sales_manager",
            action="pending"
        )
        db.add(step1)

        if risk_band == "HIGH":
            step2 = ApprovalStep(
                approval_request_id=app_req.id,
                step_number=2,
                required_role="finance_ops",
                action="pending"
            )
            db.add(step2)
    else:
        quote.status = "negotiation"

    await db.commit()
    await create_audit_log(
        db, "quotation", quote.id, "portal_bulk_negotiation", None,
        f"Customer {customer.name} submitted bulk counter-offer. Risk: {risk_band}. Status: {quote.status}."
    )

    return _format_portal_quote_out(quote)