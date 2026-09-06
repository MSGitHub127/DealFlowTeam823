import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class DealHealthAlert(Base):
    __tablename__ = "deal_health_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # stalled, discount_anomaly, delivery_slippage
    severity = Column(String(20), default="medium")  # low, medium, high
    message = Column(String(255), nullable=False)
    details = Column(JSON, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolution_action = Column(String(50), nullable=True)  # nudged, escalated, dismissed
    created_at = Column(DateTime, default=utcnow)
    resolved_at = Column(DateTime, nullable=True)

    quotation = relationship("Quotation")

class RepMetric(Base):
    __tablename__ = "rep_metrics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rep_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    trailing_avg_discount = Column(Float, default=5.0)  # e.g., 5.0% historical average
    total_deals_count = Column(Integer, default=0)
    deals_won_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utcnow)

    rep = relationship("User")
