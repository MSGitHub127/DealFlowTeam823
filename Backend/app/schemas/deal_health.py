from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class AlertActionRequest(BaseModel):
    action: str  # nudge, escalate, dismiss
    note: Optional[str] = None

class DealHealthAlertOut(BaseModel):
    id: str
    quotation_id: str
    quote_number: Optional[str] = None
    customer_name: Optional[str] = None
    rep_name: Optional[str] = None
    alert_type: str  # stalled, discount_anomaly, delivery_slippage
    severity: str  # low, medium, high
    message: str
    details: Optional[Dict[str, Any]] = None
    is_resolved: bool
    resolution_action: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DealHealthSummaryOut(BaseModel):
    stalled_count: int
    anomaly_count: int
    slippage_count: int
    total_active_alerts: int
    alerts: List[DealHealthAlertOut] = []
