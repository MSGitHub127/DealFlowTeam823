export type UserRole = 'sales_rep' | 'sales_manager' | 'finance_ops' | 'admin' | 'customer';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  company_name: string;
  email: string;
  phone?: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  portal_token: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string;
  extra_price: number;
}

export interface PriceListEntry {
  id: string;
  product_id: string;
  customer_tier: string;
  currency: string;
  custom_price: number;
  min_qty: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: 'Hardware' | 'Services' | 'Subscriptions';
  base_price: number;
  cost_price: number;
  unit: string;
  tax_rate: number;
  description?: string;
  is_subscription: boolean;
  is_active: boolean;
  variants?: ProductVariant[];
  price_entries?: PriceListEntry[];
}

export interface QuotationLine {
  id: string;
  quotation_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  variant_id?: string;
  variant_label?: string;
  qty: number;
  unit_price: number;
  cost_price: number;
  discount_pct: number;
  limit_pct: number;
  line_excess: number;
  line_status: 'OK' | 'OVER';
  line_total: number;
  line_margin: number;
  line_margin_pct: number;
  is_recurring: boolean;
  subscription_plan_id?: string;
  subscription_plan_name?: string;
}

export interface PortalQuotationLine {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  variant_id?: string;
  variant_label?: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  is_recurring: boolean;
  subscription_plan_name?: string;
}

export interface NegotiationComment {
  id: string;
  quotation_id: string;
  quotation_line_id?: string;
  author_type: string;
  author_name: string;
  comment: string;
  proposed_discount_pct?: number;
  proposed_delivery_date?: string;
  created_at: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  customer_tier?: string;
  rep_id: string;
  rep_name?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'negotiation' | 'confirmed' | 'fulfilled' | 'cancelled';
  blended_risk: 'NONE' | 'MEDIUM' | 'HIGH';
  total_amount: number;
  total_cost: number;
  total_margin: number;
  total_margin_pct: number;
  total_discount_amount: number;
  notes?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  lines: QuotationLine[];
  negotiation_comments?: NegotiationComment[];
}

export interface PortalQuotation {
  id: string;
  quote_number: string;
  customer_name: string;
  company_name: string;
  status: string;
  total_amount: number;
  total_discount_amount: number;
  notes?: string;
  created_at: string;
  lines: PortalQuotationLine[];
  negotiation_comments?: NegotiationComment[];
}

export interface UpsellSuggestion {
  rule_id: string;
  product_id: string;
  product_name: string;
  category: string;
  base_price: number;
  suggested_price: number;
  margin_delta: number;
  margin_delta_pct: number;
  is_promoted: boolean;
  reason?: string;
}

export interface ApprovalStep {
  id: string;
  approval_request_id: string;
  step_number: number;
  required_role: string;
  approver_id?: string;
  approver_name?: string;
  action: 'pending' | 'approved' | 'rejected' | 'returned';
  note?: string;
  reason?: string;
  acted_at?: string;
}

export interface ApprovalRequest {
  id: string;
  quotation_id: string;
  quote_number?: string;
  customer_name?: string;
  total_amount?: number;
  total_margin_pct?: number;
  blended_risk: 'NONE' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  current_step: number;
  created_at: string;
  updated_at: string;
  steps: ApprovalStep[];
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  user_email?: string;
  user_role?: string;
  action: string;
  reason?: string;
  old_values?: any;
  new_values?: any;
  timestamp: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location?: string;
  shipping_cost_weight: number;
  is_active: boolean;
}

export interface StockItem {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_name: string;
  qty_available: number;
  qty_reserved: number;
  reorder_level: number;
}

export interface SplitItemAllocation {
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  qty_allocated: number;
  shipping_cost_weight: number;
}

export interface BackorderItem {
  product_id: string;
  product_name: string;
  qty_backordered: number;
}

export interface FulfillmentSuggestion {
  quotation_id: string;
  can_fulfill_completely: boolean;
  is_split: boolean;
  total_shipments: number;
  estimated_shipping_cost: number;
  allocations: SplitItemAllocation[];
  backorders: BackorderItem[];
  message: string;
}

export interface FulfillmentOrder {
  id: string;
  order_number: string;
  quotation_id: string;
  quote_number?: string;
  status: string;
  est_ship_date?: string;
  actual_ship_date?: string;
  total_shipments: number;
  total_shipping_cost: number;
  is_split: boolean;
  override_reason?: string;
  created_at: string;
  split_lines: any[];
  backorders: any[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  cadence: string;
  billing_cycle_days: number;
  price: number;
  proration_rule: string;
  cancellation_refund_rule: string;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  quotation_id?: string;
  customer_id: string;
  customer_name?: string;
  plan_id: string;
  plan_name?: string;
  product_id: string;
  product_name?: string;
  status: string;
  qty: number;
  unit_price: number;
  start_date: string;
  current_cycle_start: string;
  current_cycle_end: string;
  next_bill_date: string;
  cancelled_at?: string;
}

export interface InvoiceLine {
  id: string;
  product_id: string;
  product_name?: string;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  is_recurring: boolean;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  transaction_ref?: string;
  notes?: string;
  paid_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  quotation_id?: string;
  customer_id: string;
  customer_name?: string;
  fulfillment_order_id?: string;
  invoice_type: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  issued_at: string;
  paid_at?: string;
  lines: InvoiceLine[];
  payments: Payment[];
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  customer_id: string;
  customer_name?: string;
  invoice_id?: string;
  subscription_id?: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface DealHealthAlert {
  id: string;
  quotation_id: string;
  quote_number?: string;
  customer_name?: string;
  rep_name?: string;
  alert_type: 'stalled' | 'discount_anomaly' | 'delivery_slippage';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: any;
  is_resolved: boolean;
  resolution_action?: string;
  created_at: string;
  resolved_at?: string;
}

export interface DealHealthSummary {
  stalled_count: number;
  anomaly_count: number;
  slippage_count: number;
  total_active_alerts: number;
  alerts: DealHealthAlert[];
}

export interface DiscountTierConfig {
  id: string;
  tier: string;
  max_discount_pct: number;
}

export interface CategoryDiscountConfig {
  id: string;
  category: string;
  max_discount_pct: number;
}

export interface ApprovalRule {
  id: string;
  name: string;
  risk_band: string;
  min_excess: number;
  max_excess: number;
  min_total_excess: number;
  approvers: string[];
  description?: string;
}

export interface UpsellRule {
  id: string;
  primary_product_id: string;
  suggested_product_id: string;
  primary_product_name?: string;
  suggested_product_name?: string;
  co_purchase_score: number;
  is_promoted: boolean;
  min_margin_pct: number;
  reason?: string;
}
