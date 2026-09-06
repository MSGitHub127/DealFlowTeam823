from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

class SplitItemAllocation(BaseModel):
    product_id: str
    product_name: str
    warehouse_id: str
    warehouse_name: str
    qty_allocated: int
    shipping_cost_weight: float

class BackorderItem(BaseModel):
    product_id: str
    product_name: str
    qty_backordered: int

class FulfillmentSuggestionOut(BaseModel):
    quotation_id: str
    can_fulfill_completely: bool
    is_split: bool
    total_shipments: int
    estimated_shipping_cost: float
    allocations: List[SplitItemAllocation] = []
    backorders: List[BackorderItem] = []
    message: str

class FulfillmentSplitLineOut(BaseModel):
    id: str
    warehouse_id: str
    warehouse_name: Optional[str] = None
    product_id: str
    product_name: Optional[str] = None
    qty_allocated: int
    status: str

    model_config = ConfigDict(from_attributes=True)

class BackorderLineOut(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    qty_backordered: int
    is_consolidated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FulfillmentOrderOut(BaseModel):
    id: str
    order_number: str
    quotation_id: str
    quote_number: Optional[str] = None
    status: str
    est_ship_date: Optional[date] = None
    actual_ship_date: Optional[datetime] = None
    total_shipments: int
    total_shipping_cost: float
    is_split: bool
    override_reason: Optional[str] = None
    created_at: datetime
    split_lines: List[FulfillmentSplitLineOut] = []
    backorders: List[BackorderLineOut] = []

    model_config = ConfigDict(from_attributes=True)

class FulfillmentOverrideRequest(BaseModel):
    reason: str
    allocations: List[SplitItemAllocation]

class StockReplenishRequest(BaseModel):
    warehouse_id: str
    product_id: str
    qty_added: int
