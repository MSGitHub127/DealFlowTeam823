import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    rep_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="draft")  # draft, pending_approval, approved, negotiation, confirmed, fulfilled, cancelled
    blended_risk = Column(String(50), default="NONE")  # NONE, MEDIUM, HIGH
    total_amount = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    total_margin = Column(Float, default=0.0)
    total_margin_pct = Column(Float, default=0.0)
    total_discount_amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    last_activity_at = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    customer = relationship("Customer")
    rep = relationship("User")
    lines = relationship("QuotationLine", back_populates="quotation", cascade="all, delete-orphan")
    negotiation_comments = relationship("NegotiationComment", back_populates="quotation", cascade="all, delete-orphan")
    approval_requests = relationship("ApprovalRequest", back_populates="quotation", cascade="all, delete-orphan")
    fulfillment_orders = relationship("FulfillmentOrder", back_populates="quotation", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="quotation", cascade="all, delete-orphan")

class QuotationLine(Base):
    __tablename__ = "quotation_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id"), nullable=True)
    qty = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    discount_pct = Column(Float, default=0.0)
    limit_pct = Column(Float, default=0.0)
    line_excess = Column(Float, default=0.0)
    line_status = Column(String(20), default="OK")  # OK, OVER
    line_total = Column(Float, default=0.0)
    line_margin = Column(Float, default=0.0)
    line_margin_pct = Column(Float, default=0.0)
    is_recurring = Column(Boolean, default=False)
    subscription_plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=True)

    quotation = relationship("Quotation", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    subscription_plan = relationship("SubscriptionPlan")

class NegotiationComment(Base):
    __tablename__ = "negotiation_comments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=False)
    quotation_line_id = Column(String(36), ForeignKey("quotation_lines.id"), nullable=True)
    author_type = Column(String(20), default="customer")  # customer, rep, manager
    author_name = Column(String(100), nullable=False)
    comment = Column(Text, nullable=False)
    proposed_discount_pct = Column(Float, nullable=True)
    proposed_delivery_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    quotation = relationship("Quotation", back_populates="negotiation_comments")
    line = relationship("QuotationLine")
