import axios from 'axios';
import {
  User, Customer, Product, Quotation, PortalQuotation, ApprovalRequest,
  AuditLog, Warehouse, StockItem, FulfillmentSuggestion, FulfillmentOrder,
  SubscriptionPlan, Subscription, Invoice, CreditNote, DealHealthSummary,
  DiscountTierConfig, CategoryDiscountConfig, ApprovalRule, UpsellRule,
  UpsellSuggestion
} from '../types';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dealflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  getMe: () => api.get<User>('/auth/me'),
  getUsers: () => api.get<User[]>('/auth/users'),
  getCustomers: () => api.get<Customer[]>('/auth/customers'),
};

export const productsApi = {
  list: (category?: string) => api.get<Product[]>('/products', { params: { category } }),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: any) => api.post<Product>('/products', data),
  addVariant: (id: string, data: any) => api.post(`/products/${id}/variants`, data),
  addPriceEntry: (id: string, data: any) => api.post(`/products/${id}/pricelist`, data),
};

export const configApi = {
  getDiscountTiers: () => api.get<DiscountTierConfig[]>('/config/discount-tiers'),
  saveDiscountTier: (data: any) => api.post<DiscountTierConfig>('/config/discount-tiers', data),
  getCategoryCeilings: () => api.get<CategoryDiscountConfig[]>('/config/category-ceilings'),
  saveCategoryCeiling: (data: any) => api.post<CategoryDiscountConfig>('/config/category-ceilings', data),
  getApprovalRules: () => api.get<ApprovalRule[]>('/config/approval-rules'),
  createApprovalRule: (data: any) => api.post<ApprovalRule>('/config/approval-rules', data),
  getUpsellRules: () => api.get<UpsellRule[]>('/config/upsell-rules'),
  createUpsellRule: (data: any) => api.post<UpsellRule>('/config/upsell-rules', data),
};

export const warehouseApi = {
  list: () => api.get<Warehouse[]>('/warehouses'),
  create: (data: any) => api.post<Warehouse>('/warehouses', data),
  getStocks: () => api.get<StockItem[]>('/warehouses/stocks'),
  replenish: (data: any) => api.post('/warehouses/replenish', data),
};

export const quotationsApi = {
  list: (status?: string, rep_id?: string) => api.get<Quotation[]>('/quotations', { params: { status, rep_id } }),
  get: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (data: any) => api.post<Quotation>('/quotations', data),
  update: (id: string, data: any) => api.patch<Quotation>(`/quotations/${id}`, data),
  addLine: (id: string, data: any) => api.post<Quotation>(`/quotations/${id}/lines`, data),
  deleteLine: (id: string, lineId: string) => api.delete<Quotation>(`/quotations/${id}/lines/${lineId}`),
  submit: (id: string) => api.post<Quotation>(`/quotations/${id}/submit`),
  getSuggestions: (id: string) => api.get<UpsellSuggestion[]>(`/quotations/${id}/suggestions`),
};

export const approvalsApi = {
  list: (status?: string) => api.get<ApprovalRequest[]>('/approvals', { params: { status } }),
  get: (id: string) => api.get<ApprovalRequest>(`/approvals/${id}`),
  act: (id: string, data: { action: string; note?: string; reason?: string }) =>
    api.post<ApprovalRequest>(`/approvals/${id}/act`, data),
  getAuditLogs: (entity_type?: string, entity_id?: string) =>
    api.get<AuditLog[]>('/approvals/audit-logs', { params: { entity_type, entity_id } }),
};

export const fulfillmentApi = {
  getSuggestion: (quoteId: string) => api.get<FulfillmentSuggestion>(`/fulfillment/quotation/${quoteId}/suggestion`),
  acceptSplit: (quoteId: string) => api.post<FulfillmentOrder>(`/fulfillment/quotation/${quoteId}/accept`),
  overrideSplit: (quoteId: string, data: any) => api.post<FulfillmentOrder>(`/fulfillment/quotation/${quoteId}/override`, data),
  listOrders: () => api.get<FulfillmentOrder[]>('/fulfillment/orders'),
  shipOrder: (orderId: string) => api.post(`/fulfillment/orders/${orderId}/ship`),
  consolidateBackorders: (orderId: string) => api.post(`/fulfillment/orders/${orderId}/consolidate-backorders`),
};

export const billingApi = {
  getPlans: () => api.get<SubscriptionPlan[]>('/billing/plans'),
  createPlan: (data: any) => api.post<SubscriptionPlan>('/billing/plans', data),
  getSubscriptions: (customer_id?: string) => api.get<Subscription[]>('/billing/subscriptions', { params: { customer_id } }),
  modifySubQty: (subId: string, new_qty: number) => api.patch(`/billing/subscriptions/${subId}/modify-qty`, { new_qty }),
  cancelSub: (subId: string) => api.post(`/billing/subscriptions/${subId}/cancel`),
  getInvoices: (customer_id?: string, status?: string) => api.get<Invoice[]>('/billing/invoices', { params: { customer_id, status } }),
  payInvoice: (invId: string, data: any) => api.post(`/billing/invoices/${invId}/pay`, data),
  getCreditNotes: () => api.get<CreditNote[]>('/billing/credit-notes'),
};

export const portalApi = {
  getQuotation: (quoteId: string, token: string) =>
    api.get<PortalQuotation>(`/portal/quotation/${quoteId}`, { params: { token } }),
  addComment: (quoteId: string, token: string, data: any) =>
    api.post<PortalQuotation>(`/portal/quotation/${quoteId}/comment`, data, { params: { token } }),
  proposeCounterDiscount: (quoteId: string, token: string, data: any) =>
    api.post<PortalQuotation>(`/portal/quotation/${quoteId}/counter-discount`, data, { params: { token } }),
  confirmQuotation: (quoteId: string, token: string, data: any) =>
    api.post<PortalQuotation>(`/portal/quotation/${quoteId}/confirm`, data, { params: { token } }),
};

export const dealHealthApi = {
  getAlerts: () => api.get<DealHealthSummary>('/deal-health/alerts'),
  actOnAlert: (alertId: string, data: { action: string; note?: string }) =>
    api.post(`/deal-health/alerts/${alertId}/act`, data),
};

export const reportsApi = {
  getSummary: (params: any) => api.get('/reports', { params }),
  exportExcelUrl: (params: any) => {
    const q = new URLSearchParams(params).toString();
    return `/api/reports/export.xlsx?${q}`;
  },
  exportPdfUrl: (params: any) => {
    const q = new URLSearchParams(params).toString();
    return `/api/reports/export.pdf?${q}`;
  },
};
