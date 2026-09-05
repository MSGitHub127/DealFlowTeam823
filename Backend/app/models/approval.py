import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected, returned
    current_step = Column(Integer, default=1)  # 1 = Sales Manager, 2 = Finance
    blended_risk = Column(String(50), default="MEDIUM")  # MEDIUM, HIGH
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    quotation = relationship("Quotation", back_populates="approval_requests")
    steps = relationship("ApprovalStep", back_populates="approval_request", cascade="all, delete-orphan")

class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    approval_request_id = Column(String(36), ForeignKey("approval_requests.id"), nullable=False)
    step_number = Column(Integer, default=1)  # 1 or 2
    required_role = Column(String(50), nullable=False)  # sales_manager, finance_ops
    approver_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(50), default="pending")  # pending, approved, rejected, returned
    note = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    acted_at = Column(DateTime, nullable=True)

    approval_request = relationship("ApprovalRequest", back_populates="steps")
    approver = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50), nullable=False)  # quotation, approval, discount_tier, subscription, fulfillment
    entity_id = Column(String(100), nullable=False)
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(50), nullable=False)  # create, update, approve, reject, return, override_split, prorate
    reason = Column(Text, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=utcnow)
