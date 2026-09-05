from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class DiscountTierConfigBase(BaseModel):
    tier: str
    max_discount_pct: float

class DiscountTierConfigCreate(DiscountTierConfigBase):
    pass

class DiscountTierConfigOut(DiscountTierConfigBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

class CategoryDiscountConfigBase(BaseModel):
    category: str
    max_discount_pct: float

class CategoryDiscountConfigCreate(CategoryDiscountConfigBase):
    pass

class CategoryDiscountConfigOut(CategoryDiscountConfigBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

class ApprovalRuleBase(BaseModel):
    name: str
    risk_band: str  # NONE, MEDIUM, HIGH
    min_excess: float = 0.0
    max_excess: float = 100.0
    min_total_excess: float = 0.0
    approvers: List[str]  # e.g. ["sales_manager"] or ["sales_manager", "finance_ops"]
    description: Optional[str] = None

class ApprovalRuleCreate(ApprovalRuleBase):
    pass

class ApprovalRuleOut(ApprovalRuleBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

class UpsellRuleBase(BaseModel):
    primary_product_id: str
    suggested_product_id: str
    co_purchase_score: float = 1.0
    is_promoted: bool = False
    min_margin_pct: float = 15.0
    reason: Optional[str] = None

class UpsellRuleCreate(UpsellRuleBase):
    pass

class UpsellRuleOut(UpsellRuleBase):
    id: str
    primary_product_name: Optional[str] = None
    suggested_product_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
