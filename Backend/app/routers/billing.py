from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.billing import (
    SubscriptionPlan, Subscription, Invoice, InvoiceLine, Payment, CreditNote
)
from app.models.user import Customer, User
from app.models.product import Product
from app.schemas.billing import (
    SubscriptionPlanCreate, SubscriptionPlanOut, SubscriptionOut,
    InvoiceOut, PaymentCreate, PaymentOut, CreditNoteOut, ProrationCalcResponse
)
from app.routers.auth import get_current_user, require_role
from app.core.proration import calculate_mid_cycle_proration, calculate_cancellation_refund
from app.core.audit import create_audit_log
from app.core.timeutils import utcnow

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])

class SubscriptionQtyModify(BaseModel):
    new_qty: int

# --- Plans ---
@router.get("/plans", response_model=List[SubscriptionPlanOut])
async def list_plans(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.is_active == True))
    return res.scalars().all()

@router.post("/plans", response_model=SubscriptionPlanOut)
async def create_plan(
    req: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_role(["admin", "finance_ops"]))
):
    plan = SubscriptionPlan(
        name=req.name,
        cadence=req.cadence,
        billing_cycle_days=req.billing_cycle_days,
        price=req.price,
        proration_rule=req.proration_rule,
        cancellation_refund_rule=req.cancellation_refund_rule
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    await create_audit_log(db, "subscription_plan", plan.id, "create", user, f"Created plan {req.name}")
    return plan

# --- Subscriptions ---
@router.get("/subscriptions", response_model=List[SubscriptionOut])
async def list_subscriptions(
    customer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Subscription).options(
        selectinload(Subscription.customer),
        selectinload(Subscription.plan),
        selectinload(Subscription.product)
    ).order_by(Subscription.start_date.desc())
    
    if customer_id:
        query = query.where(Subscription.customer_id == customer_id)
        
    res = await db.execute(query)
    subs = res.scalars().all()
    out = []
    for s in subs:
        out.append(SubscriptionOut(
            id=s.id,
            quotation_id=s.quotation_id,
            customer_id=s.customer_id,
            customer_name=s.customer.company_name if s.customer else "",
            plan_id=s.plan_id,
            plan_name=s.plan.name if s.plan else "",
            product_id=s.product_id,
            product_name=s.product.name if s.product else "",
            status=s.status,
            qty=s.qty,
            unit_price=s.unit_price,
            start_date=s.start_date,
            current_cycle_start=s.current_cycle_start,
            current_cycle_end=s.current_cycle_end,
            next_bill_date=s.next_bill_date,
            cancelled_at=s.cancelled_at
        ))
    return out

@router.patch("/subscriptions/{subscription_id}/modify-qty", response_model=ProrationCalcResponse)
async def modify_subscription_qty(
    subscription_id: str,
    req: SubscriptionQtyModify,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Handles mid-cycle quantity change with live proration calculation (§5.3).
    """
    res = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.plan))
        .where(Subscription.id == subscription_id)
    )
    sub = res.scalars().first()
    if not sub or sub.status != "active":
        raise HTTPException(status_code=404, detail="Active subscription not found")

    old_qty = sub.qty
    new_qty = req.new_qty
    if new_qty <= 0:
        raise HTTPException(status_code=400, detail="New quantity must be > 0. Use cancel endpoint to terminate.")

    proration = calculate_mid_cycle_proration(
        plan_price=sub.unit_price,
        billing_cycle_days=sub.plan.billing_cycle_days,
        cycle_start=sub.current_cycle_start,
        cycle_end=sub.current_cycle_end,
        as_of_date=date.today(),
        old_qty=old_qty,
        new_qty=new_qty
    )

    sub.qty = new_qty
    delta = proration["credit_or_charge"]

    if delta > 0:
        # Additional charge invoice
        inv = Invoice(
            invoice_number=f"INV-PRORATE-{int(utcnow().timestamp())}",
            customer_id=sub.customer_id,
            invoice_type="subscription_recurring",
            subtotal=delta,
            tax_amount=round(delta * 0.10, 2),
            total_amount=round(delta * 1.10, 2),
            status="issued",
            due_date=date.today() + timedelta(days=14)
        )
        db.add(inv)
        await db.flush()
        inv_line = InvoiceLine(
            invoice_id=inv.id,
            product_id=sub.product_id,
            description=proration["explanation"],
            qty=1,
            unit_price=delta,
            line_total=delta,
            is_recurring=True
        )
        db.add(inv_line)
    elif delta < 0:
        # Credit note
        cn = CreditNote(
            credit_note_number=f"CN-{int(utcnow().timestamp())}",
            customer_id=sub.customer_id,
            subscription_id=sub.id,
            amount=abs(delta),
            reason=proration["explanation"]
        )
        db.add(cn)

    await db.commit()
    await create_audit_log(
        db, "subscription", sub.id, "prorate_modify_qty", user,
        proration["explanation"]
    )

    return ProrationCalcResponse(
        subscription_id=sub.id,
        daily_rate=proration["daily_rate_per_unit"],
        remaining_days=proration["remaining_days"],
        old_daily_rate=proration["old_daily_rate"],
        new_daily_rate=proration["new_daily_rate"],
        credit_or_charge=proration["credit_or_charge"],
        explanation=proration["explanation"]
    )

@router.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Cancels subscription and issues credit note per plan rules (§5.3).
    """
    res = await db.execute(
        select(Subscription)
        .options(selectinload(Subscription.plan))
        .where(Subscription.id == subscription_id)
    )
    sub = res.scalars().first()
    if not sub or sub.status != "active":
        raise HTTPException(status_code=404, detail="Active subscription not found")

    refund_data = calculate_cancellation_refund(
        plan_price=sub.unit_price,
        cycle_start=sub.current_cycle_start,
        cycle_end=sub.current_cycle_end,
        cancelled_on=date.today(),
        qty=sub.qty
    )

    sub.status = "cancelled"
    sub.cancelled_at = utcnow()

    credit_note = None
    if refund_data["refund_amount"] > 0:
        credit_note = CreditNote(
            credit_note_number=f"CN-CANCEL-{int(utcnow().timestamp())}",
            customer_id=sub.customer_id,
            subscription_id=sub.id,
            amount=refund_data["refund_amount"],
            reason=refund_data["explanation"]
        )
        db.add(credit_note)

    await db.commit()
    await create_audit_log(
        db, "subscription", sub.id, "cancel", user,
        f"Cancelled subscription. {refund_data['explanation']}"
    )

    return {
        "status": "cancelled",
        "refund_amount": refund_data["refund_amount"],
        "credit_note_number": credit_note.credit_note_number if credit_note else None,
        "explanation": refund_data["explanation"]
    }

# --- Invoices ---
@router.get("/invoices", response_model=List[InvoiceOut])
async def list_invoices(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).options(
        selectinload(Invoice.customer),
        selectinload(Invoice.lines).selectinload(InvoiceLine.product),
        selectinload(Invoice.payments)
    ).order_by(Invoice.issued_at.desc())

    if customer_id:
        query = query.where(Invoice.customer_id == customer_id)
    if status:
        query = query.where(Invoice.status == status)

    res = await db.execute(query)
    invoices = res.scalars().all()
    out = []
    for inv in invoices:
        lines_out = [{
            "id": l.id,
            "product_id": l.product_id,
            "product_name": l.product.name if l.product else "",
            "description": l.description,
            "qty": l.qty,
            "unit_price": l.unit_price,
            "line_total": l.line_total,
            "is_recurring": l.is_recurring
        } for l in inv.lines]

        payments_out = [{
            "id": p.id,
            "invoice_id": p.invoice_id,
            "amount": p.amount,
            "payment_method": p.payment_method,
            "transaction_ref": p.transaction_ref,
            "notes": p.notes,
            "paid_at": p.paid_at
        } for p in inv.payments]

        out.append(InvoiceOut(
            id=inv.id,
            invoice_number=inv.invoice_number,
            quotation_id=inv.quotation_id,
            customer_id=inv.customer_id,
            customer_name=inv.customer.company_name if inv.customer else "",
            fulfillment_order_id=inv.fulfillment_order_id,
            invoice_type=inv.invoice_type,
            subtotal=inv.subtotal,
            tax_amount=inv.tax_amount,
            total_amount=inv.total_amount,
            status=inv.status,
            due_date=inv.due_date,
            issued_at=inv.issued_at,
            paid_at=inv.paid_at,
            lines=lines_out,
            payments=payments_out
        ))
    return out

@router.post("/invoices/{invoice_id}/pay", response_model=PaymentOut)
async def record_payment(
    invoice_id: str,
    req: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = Payment(
        invoice_id=inv.id,
        amount=req.amount,
        payment_method=req.payment_method,
        transaction_ref=req.transaction_ref or f"PAY-{int(utcnow().timestamp())}",
        notes=req.notes
    )
    db.add(payment)

    # Check if invoice is fully paid
    pay_res = await db.execute(select(Payment).where(Payment.invoice_id == inv.id))
    all_payments = pay_res.scalars().all()
    total_paid = sum(p.amount for p in all_payments) + req.amount

    if total_paid >= inv.total_amount:
        inv.status = "paid"
        inv.paid_at = utcnow()

    await db.commit()
    await db.refresh(payment)
    await create_audit_log(
        db, "invoice", inv.id, "record_payment", user,
        f"Payment of ${req.amount:.2f} recorded via {req.payment_method}. Invoice status: {inv.status}."
    )
    return payment

@router.get("/credit-notes", response_model=List[CreditNoteOut])
async def list_credit_notes(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CreditNote).options(selectinload(CreditNote.customer)))
    cns = res.scalars().all()
    out = []
    for c in cns:
        out.append(CreditNoteOut(
            id=c.id,
            credit_note_number=c.credit_note_number,
            customer_id=c.customer_id,
            customer_name=c.customer.company_name if c.customer else "",
            invoice_id=c.invoice_id,
            subscription_id=c.subscription_id,
            amount=c.amount,
            reason=c.reason,
            created_at=c.created_at
        ))
    return out
