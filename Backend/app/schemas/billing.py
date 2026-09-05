from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

class SubscriptionPlanBase(BaseModel):
    name: str
    cadence: str = "monthly"  # monthly, quarterly, yearly
    billing_cycle_days: int = 30
    price: float
    proration_rule: str = "daily_rate"
    cancellation_refund_rule: str = "prorated_credit_note"

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanOut(SubscriptionPlanBase):
    id: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class SubscriptionOut(BaseModel):
    id: str
    quotation_id: Optional[str] = None
    customer_id: str
    customer_name: Optional[str] = None
    plan_id: str
    plan_name: Optional[str] = None
    product_id: str
    product_name: Optional[str] = None
    status: str
    qty: int
    unit_price: float
    start_date: date
    current_cycle_start: date
    current_cycle_end: date
    next_bill_date: date
    cancelled_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ProrationCalcResponse(BaseModel):
    subscription_id: str
    daily_rate: float
    remaining_days: int
    old_daily_rate: float
    new_daily_rate: float
    credit_or_charge: float
    explanation: str

class InvoiceLineOut(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    description: str
    qty: int
    unit_price: float
    line_total: float
    is_recurring: bool

    model_config = ConfigDict(from_attributes=True)

class PaymentCreate(BaseModel):
    amount: float
    payment_method: str = "bank_transfer"  # credit_card, bank_transfer, credit_note
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None

class PaymentOut(BaseModel):
    id: str
    invoice_id: str
    amount: float
    payment_method: str
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None
    paid_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    quotation_id: Optional[str] = None
    customer_id: str
    customer_name: Optional[str] = None
    fulfillment_order_id: Optional[str] = None
    invoice_type: str  # shipment_goods, subscription_recurring, one_time_service
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str  # draft, issued, paid, cancelled
    due_date: date
    issued_at: datetime
    paid_at: Optional[datetime] = None
    lines: List[InvoiceLineOut] = []
    payments: List[PaymentOut] = []

    model_config = ConfigDict(from_attributes=True)

class CreditNoteOut(BaseModel):
    id: str
    credit_note_number: str
    customer_id: str
    customer_name: Optional[str] = None
    invoice_id: Optional[str] = None
    subscription_id: Optional[str] = None
    amount: float
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
