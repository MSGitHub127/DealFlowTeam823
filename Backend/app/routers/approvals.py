from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.approval import ApprovalRequest, ApprovalStep, AuditLog
from app.models.quotation import Quotation, QuotationLine
from app.models.user import User
from app.schemas.approval import ApprovalRequestOut, ApprovalStepOut, ApprovalActionRequest, AuditLogOut
from app.routers.auth import get_current_user, require_role
from app.core.audit import create_audit_log
from app.core.timeutils import utcnow

router = APIRouter(prefix="/approvals", tags=["Discount Approvals"])

def _format_approval_out(req: ApprovalRequest) -> ApprovalRequestOut:
    steps_out = []
    for s in req.steps:
        steps_out.append(ApprovalStepOut(
            id=s.id,
            approval_request_id=s.approval_request_id,
            step_number=s.step_number,
            required_role=s.required_role,
            approver_id=s.approver_id,
            approver_name=s.approver.full_name if s.approver else None,
            action=s.action,
            note=s.note,
            reason=s.reason,
            acted_at=s.acted_at
        ))
    
    return ApprovalRequestOut(
        id=req.id,
        quotation_id=req.quotation_id,
        quote_number=req.quotation.quote_number if req.quotation else "",
        customer_name=req.quotation.customer.company_name if (req.quotation and req.quotation.customer) else "",
        total_amount=req.quotation.total_amount if req.quotation else 0.0,
        total_margin_pct=req.quotation.total_margin_pct if req.quotation else 0.0,
        blended_risk=req.blended_risk,
        status=req.status,
        current_step=req.current_step,
        created_at=req.created_at,
        updated_at=req.updated_at,
        steps=steps_out
    )

@router.get("", response_model=List[ApprovalRequestOut])
async def list_approvals(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.quotation).selectinload(Quotation.customer),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approver)
        )
        .order_by(ApprovalRequest.created_at.desc())
    )
    if status:
        query = query.where(ApprovalRequest.status == status)
    
    res = await db.execute(query)
    return [_format_approval_out(a) for a in res.scalars().all()]

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{request_id}", response_model=ApprovalRequestOut)
async def get_approval(request_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.quotation).selectinload(Quotation.customer),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approver)
        )
        .where(ApprovalRequest.id == request_id)
    )
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return _format_approval_out(req)

@router.post("/{request_id}/act", response_model=ApprovalRequestOut)
async def act_on_approval(
    request_id: str,
    action_req: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Acts on an approval step:
    - Step 1: Sales Manager
    - Step 2: Finance (for HIGH risk)
    Action can be 'approved', 'rejected', or 'returned'.
    """
    res = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.quotation),
            selectinload(ApprovalRequest.steps)
        )
        .where(ApprovalRequest.id == request_id)
    )
    app_req = res.scalars().first()
    if not app_req:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if app_req.status != "pending":
        raise HTTPException(status_code=400, detail="Approval request is already resolved")

    # Find the active step
    active_step = next((s for s in app_req.steps if s.step_number == app_req.current_step), None)
    if not active_step:
        raise HTTPException(status_code=400, detail="No active approval step found")

    # Verify role
    if user.role != "admin" and user.role != active_step.required_role:
        raise HTTPException(
            status_code=403,
            detail=f"User role '{user.role}' is not authorized for step requiring '{active_step.required_role}'"
        )

    action = action_req.action.lower()
    active_step.action = action
    active_step.approver_id = user.id
    active_step.note = action_req.note
    active_step.reason = action_req.reason
    active_step.acted_at = utcnow()

    quote = app_req.quotation

    if action == "approved":
        # Check if there is a next step
        next_step = next((s for s in app_req.steps if s.step_number == app_req.current_step + 1), None)
        if next_step:
            app_req.current_step += 1
            await create_audit_log(
                db, "approval", app_req.id, "step_approved", user,
                f"Step {active_step.step_number} approved. Advancing to Step {next_step.step_number} ({next_step.required_role}).",
                {"step": active_step.step_number}, {"current_step": app_req.current_step}
            )
        else:
            app_req.status = "approved"
            quote.status = "approved"
            await create_audit_log(
                db, "quotation", quote.id, "approved", user,
                f"Quotation #{quote.quote_number} fully approved by {user.full_name} ({user.role}).",
                {"status": "pending_approval"}, {"status": "approved"}
            )
    elif action == "rejected":
        app_req.status = "rejected"
        quote.status = "draft"
        await create_audit_log(
            db, "quotation", quote.id, "rejected", user,
            f"Quotation #{quote.quote_number} rejected by {user.full_name}. Reason: {action_req.reason or action_req.note}",
            {"status": "pending_approval"}, {"status": "draft"}
        )
    elif action == "returned":
        app_req.status = "returned"
        quote.status = "draft"
        await create_audit_log(
            db, "quotation", quote.id, "returned_for_revision", user,
            f"Quotation #{quote.quote_number} returned for revision by {user.full_name}. Note: {action_req.note}",
            {"status": "pending_approval"}, {"status": "draft"}
        )

    await db.commit()

    # Reload with all relationships
    res = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.quotation).selectinload(Quotation.customer),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approver)
        )
        .where(ApprovalRequest.id == request_id)
    )
    return _format_approval_out(res.scalars().first())
