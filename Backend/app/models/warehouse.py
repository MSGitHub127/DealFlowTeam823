import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timeutils import utcnow

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)  # e.g. "Main Warehouse", "East Depot"
    code = Column(String(50), unique=True, index=True, nullable=False)
    location = Column(String(255), nullable=True)
    shipping_cost_weight = Column(Float, default=1.0)  # Lower is cheaper
    is_active = Column(Boolean, default=True)

    stock_items = relationship("Stock", back_populates="warehouse", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    qty_available = Column(Integer, default=0)
    qty_reserved = Column(Integer, default=0)
    reorder_level = Column(Integer, default=5)

    warehouse = relationship("Warehouse", back_populates="stock_items")
    product = relationship("Product")

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    qty_delta = Column(Integer, nullable=False)
    movement_type = Column(String(50), nullable=False)  # replenish, reservation, shipment, return
    reference_id = Column(String(100), nullable=True)  # quotation_id or PO
    created_at = Column(DateTime, default=utcnow)
