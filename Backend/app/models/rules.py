import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class DiscountTierConfig(Base):
    __tablename__ = "discount_tier_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tier = Column(String(50), unique=True, nullable=False)  # Bronze, Silver, Gold
    max_discount_pct = Column(Float, nullable=False)  # e.g. 5.0, 10.0, 15.0

class CategoryDiscountConfig(Base):
    __tablename__ = "category_discount_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category = Column(String(50), unique=True, nullable=False)  # Hardware, Services, Subscriptions
    max_discount_pct = Column(Float, nullable=False)  # e.g. 15.0 for Hardware, 10.0 for Services

class ApprovalRule(Base):
    __tablename__ = "approval_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    risk_band = Column(String(50), nullable=False)  # NONE, MEDIUM, HIGH
    min_excess = Column(Float, default=0.0)  # max single line excess lower bound
    max_excess = Column(Float, default=100.0)  # max single line excess upper bound
    min_total_excess = Column(Float, default=0.0)  # sum of excesses threshold
    approvers = Column(JSON, nullable=False)  # list: ["sales_manager"] or ["sales_manager", "finance_ops"]
    description = Column(String(255), nullable=True)

class UpsellRule(Base):
    __tablename__ = "upsell_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    primary_product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    suggested_product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    co_purchase_score = Column(Float, default=1.0)
    is_promoted = Column(Boolean, default=False)
    min_margin_pct = Column(Float, default=15.0)  # only surface if healthy margin
    reason = Column(String(255), nullable=True)

    primary_product = relationship("Product", foreign_keys=[primary_product_id])
    suggested_product = relationship("Product", foreign_keys=[suggested_product_id])
