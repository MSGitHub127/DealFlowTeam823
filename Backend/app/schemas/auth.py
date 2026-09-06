from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "sales_rep"  # sales_rep, sales_manager, finance_ops, admin

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CustomerOut(BaseModel):
    id: str
    name: str
    company_name: str
    email: str
    phone: Optional[str] = None
    tier: str
    portal_token: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None
    customer: Optional[CustomerOut] = None
    role: str
