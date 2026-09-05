import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class FulfillmentOrder(Base):
    __tablename__ = "fulfillment_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    quotation_id = Column(String(36), ForeignKey("quotations.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, split_suggested, accepted, partially_shipped, shipped
    est_ship_date = Column(Date, nullable=True)
    actual_ship_date = Column(DateTime, nullable=True)
    total_shipments = Column(Integer, default=1)
    total_shipping_cost = Column(Float, default=0.0)
    is_split = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    quotation = relationship("Quotation", back_populates="fulfillment_orders")
    split_lines = relationship("FulfillmentSplitLine", back_populates="fulfillment_order", cascade="all, delete-orphan")
    backorders = relationship("BackorderLine", back_populates="fulfillment_order", cascade="all, delete-orphan")

class FulfillmentSplitLine(Base):
    __tablename__ = "fulfillment_split_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fulfillment_order_id = Column(String(36), ForeignKey("fulfillment_orders.id"), nullable=False)
    quotation_line_id = Column(String(36), ForeignKey("quotation_lines.id"), nullable=False)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    qty_allocated = Column(Integer, default=0)
    status = Column(String(50), default="allocated")  # allocated, packed, shipped

    fulfillment_order = relationship("FulfillmentOrder", back_populates="split_lines")
    warehouse = relationship("Warehouse")
    product = relationship("Product")
    quotation_line = relationship("QuotationLine")

class BackorderLine(Base):
    __tablename__ = "backorder_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fulfillment_order_id = Column(String(36), ForeignKey("fulfillment_orders.id"), nullable=False)
    quotation_line_id = Column(String(36), ForeignKey("quotation_lines.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    qty_backordered = Column(Integer, default=0)
    is_consolidated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    fulfillment_order = relationship("FulfillmentOrder", back_populates="backorders")
    product = relationship("Product")
    quotation_line = relationship("QuotationLine")
