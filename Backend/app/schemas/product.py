from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ProductVariantBase(BaseModel):
    attribute_name: str
    attribute_value: str
    extra_price: float = 0.0

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantOut(ProductVariantBase):
    id: str
    product_id: str

    model_config = ConfigDict(from_attributes=True)

class PriceListEntryBase(BaseModel):
    customer_tier: str
    currency: str = "USD"
    custom_price: float
    min_qty: float = 1.0

class PriceListEntryCreate(PriceListEntryBase):
    pass

class PriceListEntryOut(PriceListEntryBase):
    id: str
    product_id: str

    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str
    sku: str
    category: str  # Hardware, Services, Subscriptions
    base_price: float
    cost_price: float
    unit: str = "Units"
    tax_rate: float = 0.10
    description: Optional[str] = None
    is_subscription: bool = False

class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None
    price_entries: Optional[List[PriceListEntryCreate]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    base_price: Optional[float] = None
    cost_price: Optional[float] = None
    unit: Optional[str] = None
    tax_rate: Optional[float] = None
    description: Optional[str] = None
    is_subscription: Optional[bool] = None
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: str
    is_active: bool
    created_at: datetime
    variants: List[ProductVariantOut] = []
    price_entries: List[PriceListEntryOut] = []

    model_config = ConfigDict(from_attributes=True)
