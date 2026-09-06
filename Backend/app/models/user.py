import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from app.database import Base
from app.core.timeutils import utcnow

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # sales_rep, sales_manager, finance_ops, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    tier = Column(String(50), default="Bronze")  # Bronze, Silver, Gold
    portal_token = Column(String(255), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    portal_token_issued_at = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)
