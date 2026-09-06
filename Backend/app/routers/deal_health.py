from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.deal_health import DealHealthAlert, RepMetric
from app.models.quotation import Quotation
from app.schemas.deal_health import (
    DealHealthAlertOut, AlertActionRequest, DealHealthSummaryOut
)
from app.routers.auth import get_current_user
from app.core.deal_health_engine import scan_deal_health
from app.core.audit import create_audit_log
from app.core.timeutils import utcnow

router = APIRouter(prefix="/deal-health", tags=["Deal Health & Anomaly Monitoring"])

@router.get("/alerts", response_model=DealHealthSummaryOut)
async def get_deal_health_alerts(db: AsyncSession = Depends(get_db)):
    # Run scan to check fresh alerts
    await scan_deal_health(db)

    res = await db.execute(
        select(DealHealthAlert)
        .options(
            selectinload(DealHealthAlert.quotation).selectinload(Quotation.customer),
            selectinload(DealHealthAlert.quotation).selectinload(Quotation.rep)
        )
        .where(DealHealthAlert.is_resolved == False)
        .order_by(DealHealthAlert.created_at.desc())
    )
    alerts = res.scalars().all()

    stalled = 0
    anomaly = 0
    slippage = 0
    alerts_out = []

    for a in alerts:
        if a.alert_type == "stalled":
            stalled += 1
        elif a.alert_type == "discount_anomaly":
            anomaly += 1
        elif a.alert_type == "delivery_slippage":
            slippage += 1

        alerts_out.append(DealHealthAlertOut(
            id=a.id,
            quotation_id=a.quotation_id,
            quote_number=a.quotation.quote_number if a.quotation else "",
            customer_name=a.quotation.customer.company_name if (a.quotation and a.quotation.customer) else "",
            rep_name=a.quotation.rep.full_name if (a.quotation and a.quotation.rep) else "",
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            details=a.details,
            is_resolved=a.is_resolved,
            resolution_action=a.resolution_action,
            created_at=a.created_at,
            resolved_at=a.resolved_at
        ))

    return DealHealthSummaryOut(
        stalled_count=stalled,
        anomaly_count=anomaly,
        slippage_count=slippage,
        total_active_alerts=len(alerts),
        alerts=alerts_out
    )

@router.post("/alerts/{alert_id}/act")
async def act_on_alert(
    alert_id: str,
    req: AlertActionRequest,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    res = await db.execute(
        select(DealHealthAlert)
        .options(selectinload(DealHealthAlert.quotation))
        .where(DealHealthAlert.id == alert_id)
    )
    alert = res.scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    action = req.action.lower()  # nudge, escalate, dismiss
    alert.is_resolved = True
    alert.resolution_action = action
    alert.resolved_at = utcnow()

    msg = f"Alert '{alert.alert_type}' resolved with action '{action}' by {user.full_name}"
    if action == "nudge":
        msg = f"Automated nudge reminder sent to customer for deal #{alert.quotation.quote_number}"
    elif action == "escalate":
        msg = f"Deal #{alert.quotation.quote_number} escalated to Sales Director / VP for immediate intervention"

    await db.commit()
    await create_audit_log(
        db, "deal_health", alert.id, f"alert_{action}", user, msg
    )
    return {"status": "success", "message": msg}
