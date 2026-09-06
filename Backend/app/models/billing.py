import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)  # e.g., "Monthly Pro", "Annual Enterprise"
    cadence = Column(String(50), default="monthly")  # monthly, quarterly, yearly
    billing_cycle_days = Column(Integer, default=30)  # 30, 90, 365
    price = Column(Float, nullable=False, default=0.0)
    proration_rule = Column(String(50), default="daily_rate")  # daily_rate, full_month, none
    cancellation_refund_rule = Column(String(50), default="prorated_credit_note")  # prorated_credit_note, no_refund
    is_active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    status = Column(String(50), default="active")  # active, paused, cancelled
    qty = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    start_date = Column(Date, default=date.today)
    current_cycle_start = Column(Date, default=date.today)
    current_cycle_end = Column(Date, nullable=False)
    next_bill_date = Column(Date, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    customer = relationship("Customer")
    plan = relationship("SubscriptionPlan")
    product = relationship("Product")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    fulfillment_order_id = Column(String(36), ForeignKey("fulfillment_orders.id"), nullable=True)
    invoice_type = Column(String(50), default="shipment_goods")  # shipment_goods, subscription_recurring, one_time_service
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default="issued")  # draft, issued, paid, cancelled
    due_date = Column(Date, nullable=False)
    issued_at = Column(DateTime, default=utcnow)
    paid_at = Column(DateTime, nullable=True)

    quotation = relationship("Quotation", back_populates="invoices")
    customer = relationship("Customer")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    description = Column(String(255), nullable=False)
    qty = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    line_total = Column(Float, default=0.0)
    is_recurring = Column(Boolean, default=False)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="bank_transfer")  # credit_card, bank_transfer, credit_note
    transaction_ref = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    paid_at = Column(DateTime, default=utcnow)

    invoice = relationship("Invoice", back_populates="payments")

class CreditNote(Base):
    __tablename__ = "credit_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    credit_note_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=True)
    subscription_id = Column(String(36), ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float, nullable=False)
    reason = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    customer = relationship("Customer")
