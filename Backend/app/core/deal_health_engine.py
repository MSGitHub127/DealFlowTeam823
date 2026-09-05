from datetime import datetime, date, timedelta
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.quotation import Quotation
from app.models.deal_health import DealHealthAlert, RepMetric
from app.models.fulfillment import FulfillmentOrder
from app.config import settings
from app.core.timeutils import utcnow

async def scan_deal_health(db: AsyncSession) -> List[DealHealthAlert]:
    """
    Periodic or on-demand scan that generates DealHealthAlerts:
    1. STALLED deals (inactivity > config.STALLED_DEAL_DAYS)
    2. ANOMALY discounts (quote avg discount > rep trailing avg * config.ANOMALY_MULTIPLIER)
    3. SLIPPAGE deliveries (estimated ship date passed, not shipped)
    """
    now = utcnow()
    today = date.today()
    alerts_generated = []

    # 1. Scan STALLED Deals
    stalled_threshold = now - timedelta(days=settings.STALLED_DEAL_DAYS)
    quotes_query = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.customer), selectinload(Quotation.rep))
        .where(Quotation.status.in_(["draft", "pending_approval", "negotiation"]))
    )
    quotes = quotes_query.scalars().all()

    for q in quotes:
        days_inactive = (now - q.last_activity_at).days if q.last_activity_at else 0
        if days_inactive >= settings.STALLED_DEAL_DAYS:
            # Check if alert already exists
            existing_alert = await db.execute(
                select(DealHealthAlert).where(
                    DealHealthAlert.quotation_id == q.id,
                    DealHealthAlert.alert_type == "stalled",
                    DealHealthAlert.is_resolved == False
                )
            )
            if not existing_alert.scalars().first():
                alert = DealHealthAlert(
                    quotation_id=q.id,
                    alert_type="stalled",
                    severity="high" if days_inactive >= 14 else "medium",
                    message=f"Deal #{q.quote_number} has been inactive for {days_inactive} days (Stage: {q.status.upper()}).",
                    details={"days_inactive": days_inactive, "customer": q.customer.company_name if q.customer else "Unknown"}
                )
                db.add(alert)
                alerts_generated.append(alert)

    # 2. Scan DISCOUNT ANOMALIES
    rep_metrics_query = await db.execute(select(RepMetric))
    rep_metrics = {rm.rep_id: rm for rm in rep_metrics_query.scalars().all()}

    for q in quotes:
        if q.total_amount > 0:
            gross_val = q.total_amount + q.total_discount_amount
            discount_pct = (q.total_discount_amount / gross_val) * 100.0 if gross_val > 0 else 0.0
            
            rep_metric = rep_metrics.get(q.rep_id)
            trailing_avg = rep_metric.trailing_avg_discount if rep_metric else 5.0
            threshold = trailing_avg * settings.ANOMALY_MULTIPLIER

            if discount_pct > threshold:
                existing_alert = await db.execute(
                    select(DealHealthAlert).where(
                        DealHealthAlert.quotation_id == q.id,
                        DealHealthAlert.alert_type == "discount_anomaly",
                        DealHealthAlert.is_resolved == False
                    )
                )
                if not existing_alert.scalars().first():
                    alert = DealHealthAlert(
                        quotation_id=q.id,
                        alert_type="discount_anomaly",
                        severity="high",
                        message=f"Discount of {discount_pct:.1f}% on #{q.quote_number} exceeds Rep historical avg ({trailing_avg:.1f}%) by {settings.ANOMALY_MULTIPLIER}x.",
                        details={
                            "deal_discount_pct": round(discount_pct, 2),
                            "rep_trailing_avg": round(trailing_avg, 2),
                            "multiplier": settings.ANOMALY_MULTIPLIER
                        }
                    )
                    db.add(alert)
                    alerts_generated.append(alert)

    # 3. Scan DELIVERY SLIPPAGE
    orders_query = await db.execute(
        select(FulfillmentOrder)
        .options(selectinload(FulfillmentOrder.quotation))
        .where(
            FulfillmentOrder.status.in_(["pending", "split_suggested", "accepted", "partially_shipped"]),
            FulfillmentOrder.est_ship_date != None
        )
    )
    orders = orders_query.scalars().all()

    for fo in orders:
        if fo.est_ship_date and fo.est_ship_date < today:
            days_overdue = (today - fo.est_ship_date).days
            existing_alert = await db.execute(
                select(DealHealthAlert).where(
                    DealHealthAlert.quotation_id == fo.quotation_id,
                    DealHealthAlert.alert_type == "delivery_slippage",
                    DealHealthAlert.is_resolved == False
                )
            )
            if not existing_alert.scalars().first():
                alert = DealHealthAlert(
                    quotation_id=fo.quotation_id,
                    alert_type="delivery_slippage",
                    severity="high" if days_overdue >= 3 else "medium",
                    message=f"Fulfillment #{fo.order_number} is overdue by {days_overdue} day(s) (ETA was {fo.est_ship_date}).",
                    details={"days_overdue": days_overdue, "order_number": fo.order_number}
                )
                db.add(alert)
                alerts_generated.append(alert)

    await db.commit()

    if alerts_generated:
        # Push to any connected internal-workspace clients so the Deal Health
        # dashboard updates live instead of only on manual "Reload Data".
        from app.routers.ws import ws_manager
        await ws_manager.broadcast({
            "type": "deal_health_alert",
            "count": len(alerts_generated),
            "alerts": [
                {"quotation_id": a.quotation_id, "alert_type": a.alert_type,
                 "severity": a.severity, "message": a.message}
                for a in alerts_generated
            ]
        })

    return alerts_generated
