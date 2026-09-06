from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Quotation Lines ---
class QuotationLineCreate(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    qty: int = 1
    unit_price: Optional[float] = None  # if not provided, looks up price list/base price
    discount_pct: float = 0.0
    is_recurring: bool = False
    subscription_plan_id: Optional[str] = None

class QuotationLineOut(BaseModel):
    id: str
    quotation_id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_category: Optional[str] = None
    variant_id: Optional[str] = None
    variant_label: Optional[str] = None
    qty: int
    unit_price: float
    cost_price: float
    discount_pct: float
    limit_pct: float
    line_excess: float
    line_status: str  # OK, OVER
    line_total: float
    line_margin: float
    line_margin_pct: float
    is_recurring: bool
    subscription_plan_id: Optional[str] = None
    subscription_plan_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Customer Portal Line DTO (Cost/Margin Strictly Excluded) ---
class PortalQuotationLineOut(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_category: Optional[str] = None
    variant_id: Optional[str] = None
    variant_label: Optional[str] = None
    qty: int
    unit_price: float
    discount_pct: float
    line_total: float
    is_recurring: bool
    subscription_plan_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# --- Quotations ---
class QuotationCreate(BaseModel):
    customer_id: str
    notes: Optional[str] = None
    lines: Optional[List[QuotationLineCreate]] = None

class QuotationUpdate(BaseModel):
    customer_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class NegotiationCommentCreate(BaseModel):
    quotation_line_id: Optional[str] = None
    comment: str
    proposed_discount_pct: Optional[float] = None
    proposed_delivery_date: Optional[datetime] = None

class NegotiationCommentOut(BaseModel):
    id: str
    quotation_id: str
    quotation_line_id: Optional[str] = None
    author_type: str
    author_name: str
    comment: str
    proposed_discount_pct: Optional[float] = None
    proposed_delivery_date: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuotationOut(BaseModel):
    id: str
    quote_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_tier: Optional[str] = None
    rep_id: str
    rep_name: Optional[str] = None
    status: str
    blended_risk: str
    total_amount: float
    total_cost: float
    total_margin: float
    total_margin_pct: float
    total_discount_amount: float
    notes: Optional[str] = None
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime
    lines: List[QuotationLineOut] = []
    negotiation_comments: List[NegotiationCommentOut] = []

    model_config = ConfigDict(from_attributes=True)

# --- Customer Portal Quotation DTO (Margin/Cost/Risk Band Hidden) ---
class PortalQuotationOut(BaseModel):
    id: str
    quote_number: str
    customer_name: str
    company_name: str
    status: str  # sent, negotiation, confirmed
    total_amount: float
    total_discount_amount: float
    notes: Optional[str] = None
    created_at: datetime
    lines: List[PortalQuotationLineOut] = []
    negotiation_comments: List[NegotiationCommentOut] = []

    model_config = ConfigDict(from_attributes=True)

class UpsellSuggestionOut(BaseModel):
    rule_id: str
    product_id: str
    product_name: str
    category: str
    base_price: float
    suggested_price: float
    margin_delta: float
    margin_delta_pct: float
    is_promoted: bool
    reason: Optional[str] = None


class QuotationCreate(BaseModel):
    customer_id: str
    notes: Optional[str] = None
    lines: Optional[List[QuotationLineCreate]] = []