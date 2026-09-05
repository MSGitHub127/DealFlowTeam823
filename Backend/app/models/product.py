import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(50), nullable=False)  # Hardware, Services, Subscriptions
    base_price = Column(Float, nullable=False, default=0.0)
    cost_price = Column(Float, nullable=False, default=0.0)
    unit = Column(String(50), default="Units")  # Units, Hours, User/Month
    tax_rate = Column(Float, default=0.10)  # 10%
    description = Column(Text, nullable=True)
    is_subscription = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    price_entries = relationship("PriceListEntry", back_populates="product", cascade="all, delete-orphan")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    attribute_name = Column(String(100), nullable=False)  # e.g., 'Size', 'Pack', 'Tier'
    attribute_value = Column(String(100), nullable=False)  # e.g., '16GB', 'Pack of 5'
    extra_price = Column(Float, default=0.0)

    product = relationship("Product", back_populates="variants")

class PriceListEntry(Base):
    __tablename__ = "price_list_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    customer_tier = Column(String(50), nullable=False)  # Bronze, Silver, Gold
    currency = Column(String(10), default="USD")
    custom_price = Column(Float, nullable=False)
    min_qty = Column(Float, default=1.0)

    product = relationship("Product", back_populates="price_entries")
