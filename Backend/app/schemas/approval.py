from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ApprovalActionRequest(BaseModel):
    action: str  # approved, rejected, returned
    note: Optional[str] = None
    reason: Optional[str] = None

class ApprovalStepOut(BaseModel):
    id: str
    approval_request_id: str
    step_number: int
    required_role: str
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    action: str
    note: Optional[str] = None
    reason: Optional[str] = None
    acted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ApprovalRequestOut(BaseModel):
    id: str
    quotation_id: str
    quote_number: Optional[str] = None
    customer_name: Optional[str] = None
    total_amount: Optional[float] = None
    total_margin_pct: Optional[float] = None
    blended_risk: str
    status: str
    current_step: int
    created_at: datetime
    updated_at: datetime
    steps: List[ApprovalStepOut] = []

    model_config = ConfigDict(from_attributes=True)

class AuditLogOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    reason: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
