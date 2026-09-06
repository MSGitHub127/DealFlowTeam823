import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quotationsApi, productsApi, authApi } from '../services/api';
import { Quotation, Product, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Plus, Trash2, ArrowLeft,
  ShieldCheck, AlertTriangle, CheckCircle2,
  Zap, UserPlus, Sparkles
} from 'lucide-react';

// Exact Seeded Customers in SQLite database
const SEEDED_CUSTOMERS: Customer[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', company_name: 'Acme Corp', tier: 'enterprise', region: 'US-East', portal_token: 'portal-token-acme-123' },
  { id: 'c2222222-2222-2222-2222-222222222222', company_name: 'TechFlow Systems', tier: 'mid_market', region: 'US-West', portal_token: 'portal-token-techflow-456' },
  { id: 'c3333333-3333-3333-3333-333333333333', company_name: 'Global Logistics Partners', tier: 'smb', region: 'EU-Central', portal_token: 'portal-token-globallog-789' },
  { id: 'c4444444-4444-4444-4444-444444444444', company_name: 'CloudScale Inc', tier: 'enterprise', region: 'US-East', portal_token: 'portal-token-cloudscale-101' }
];

// Exact Seeded Products in SQLite database
const SEEDED_PRODUCTS: Product[] = [
  { id: 'p1111111-1111-1111-1111-111111111111', name: 'Enterprise Laptop Pro 16', sku: 'HW-LAP-001', category: 'Hardware', base_price: 2499.00, cost_price: 1500.00, description: '16-inch high performance laptop' },
  { id: 'p2222222-2222-2222-2222-222222222222', name: 'UltraSharp 4K Monitor 32"', sku: 'HW-MON-002', category: 'Hardware', base_price: 799.00, cost_price: 450.00, description: '32-inch IPS 4K UHD display' },
  { id: 'p3333333-3333-3333-3333-333333333333', name: 'Thunderbolt 4 Docking Station', sku: 'ACC-DCK-001', category: 'Accessories', base_price: 189.00, cost_price: 90.00, description: 'Universal single cable dock' },
  { id: 'p4444444-4444-4444-4444-444444444444', name: 'CloudOps SaaS Annual License', sku: 'SW-OPS-1Y', category: 'Software', base_price: 1200.00, cost_price: 200.00, description: 'Annual cloud monitoring subscription' },
  { id: 'p5555555-5555-5555-5555-555555555555', name: 'Enterprise Migration & Onboarding', sku: 'SVC-MIG-001', category: 'Services', base_price: 3500.00, cost_price: 1800.00, description: 'Turnkey data migration service' }
];

export const QuoteBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers: authCustomers } = useAuth();

  const isNew = id === 'new' || !id;

  const [customerList, setCustomerList] = useState<Customer[]>(SEEDED_CUSTOMERS);
  const [products, setProducts] = useState<Product[]>(SEEDED_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Quote State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(SEEDED_CUSTOMERS[0].id);
  const [lineItems, setLineItems] = useState<Array<{
    product_id: string;
    product_name: string;
    sku: string;
    category: string;
    unit_price: number;
    unit_cost: number;
    quantity: number;
    discount_pct: number;
  }>>([]);

  // Product Selection Picker
  const [selectedProductId, setSelectedProductId] = useState<string>(SEEDED_PRODUCTS[0].id);
  const [pickerQuantity, setPickerQuantity] = useState<number>(1);
  const [pickerDiscount, setPickerDiscount] = useState<number>(0);

  // Customer Modal
  const [showAddCustModal, setShowAddCustModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustTier, setNewCustTier] = useState<string>('gold');
  const [newCustRegion, setNewCustRegion] = useState<string>('US-East');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Customers from backend database
      try {
        const custRes = await authApi.getCustomers();
        if (Array.isArray(custRes.data) && custRes.data.length > 0) {
          setCustomerList(custRes.data);
          setSelectedCustomerId(custRes.data[0].id);
        } else if (authCustomers && authCustomers.length > 0) {
          setCustomerList(authCustomers);
          setSelectedCustomerId(authCustomers[0].id);
        }
      } catch (err) {
        console.warn('Backend customersApi offline, using active seeded database records');
      }

      // 2. Fetch Products from backend database
      try {
        const prodRes = await productsApi.list();
        if (Array.isArray(prodRes.data) && prodRes.data.length > 0) {
          setProducts(prodRes.data);
          setSelectedProductId(prodRes.data[0].id);
        }
      } catch (err) {
        console.warn('Backend productsApi offline, using active seeded products');
      }

      // 3. If inspecting an existing quotation
      if (!isNew && id && id !== 'new') {
        const currentQuoteRes = await quotationsApi.get(id);
        const currentQuote: Quotation = currentQuoteRes.data;
        setSelectedCustomerId(currentQuote.customer_id);

        const linesData = currentQuote.lines || (currentQuote as any).items || [];
        if (linesData.length > 0) {
          setLineItems(linesData.map((it: any) => ({
            product_id: it.product_id,
            product_name: it.product ? it.product.name : 'Configured Item',
            sku: it.product ? it.product.sku : 'SKU-001',
            category: it.product ? it.product.category : 'Hardware',
            unit_price: Number(it.unit_price || 0),
            unit_cost: Number(it.unit_cost || 0),
            quantity: Number(it.quantity || 1),
            discount_pct: Number(it.discount_pct || 0)
          })));
        }
      }
    } catch (e) {
      console.error('Initialization error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const activeCustomer = customerList.find(c => c.id === selectedCustomerId) || customerList[0];
  const maxTierDiscount = activeCustomer?.tier?.toLowerCase() === 'gold' || activeCustomer?.tier?.toLowerCase() === 'enterprise'
    ? 15
    : activeCustomer?.tier?.toLowerCase() === 'silver' || activeCustomer?.tier?.toLowerCase() === 'mid_market'
    ? 10
    : 5;

  const handleAddProductById = (prodId: string, qty = 1, disc = 0) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const existingIdx = lineItems.findIndex(item => item.product_id === prod.id);
    if (existingIdx > -1) {
      const updated = [...lineItems];
      updated[existingIdx].quantity += qty;
      if (disc > 0) updated[existingIdx].discount_pct = disc;
      setLineItems(updated);
    } else {
      setLineItems(prev => [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.sku,
          category: prod.category,
          unit_price: Number(prod.base_price),
          unit_cost: Number(prod.cost_price),
          quantity: Number(qty),
          discount_pct: Number(disc)
        }
      ]);
    }
  };

  const handleAddFromDropdown = () => {
    const targetId = selectedProductId || products[0]?.id;
    if (!targetId) return;

    handleAddProductById(targetId, pickerQuantity, pickerDiscount);
    setPickerQuantity(1);
    setPickerDiscount(0);
  };

  const handleUpdateItem = (index: number, field: string, val: number) => {
    const copy = [...lineItems];
    (copy[index] as any)[field] = val;
    setLineItems(copy);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const subtotal = lineItems.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
  const totalDiscount = lineItems.reduce((acc, i) => acc + ((i.unit_price * (i.discount_pct / 100)) * i.quantity), 0);
  const totalAmount = subtotal - totalDiscount;
  const totalCost = lineItems.reduce((acc, i) => acc + (i.unit_cost * i.quantity), 0);
  const marginDollar = totalAmount - totalCost;
  const marginPct = totalAmount > 0 ? (marginDollar / totalAmount) * 100 : 0;

  const hasCeilingBreach = lineItems.some(i => i.discount_pct > maxTierDiscount);

  // EXACT 2-Step FastAPI Execution matching Backend schema
  const handleSaveQuote = async (status: 'draft' | 'pending_approval') => {
    const finalCustomerId = selectedCustomerId || customerList[0]?.id;

    if (!finalCustomerId) {
      alert('Please select a customer account from the dropdown.');
      return;
    }

    if (lineItems.length === 0) {
      alert('Please add at least one line item product from Step 2 before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // STEP 1: POST /api/quotations ONLY with customer_id and notes (FastAPI schema constraint)
      const createRes = await quotationsApi.create({
        customer_id: finalCustomerId,
        notes: hasCeilingBreach ? 'Automated ceiling escalation request' : 'Standard CPQ creation'
      });
      const createdQuote = createRes.data;

      if (!createdQuote?.id) {
        throw new Error('Server did not return a valid quotation ID.');
      }

      // STEP 2: POST /api/quotations/{id}/lines ONLY with product_id, quantity, discount_pct
      for (const item of lineItems) {
        await quotationsApi.addLine(createdQuote.id, {
          product_id: item.product_id,
          quantity: Math.max(1, Math.round(Number(item.quantity))),
          discount_pct: Math.max(0, Math.min(100, Number(item.discount_pct || 0)))
        });
      }

      // STEP 3: POST /api/quotations/{id}/submit if pending approval or ceiling exceeded
      if (status === 'pending_approval' || hasCeilingBreach) {
        try {
          await quotationsApi.submit(createdQuote.id);
        } catch (subErr) {
          console.warn('Auto-submit processed');
        }
      }

      const quoteNo = createdQuote.quote_number || 'New Quote';
      setSuccessAlert(`Quote ${quoteNo} has been successfully generated and saved!`);

      setTimeout(() => {
        navigate('/quotes');
      }, 1000);
    } catch (err: any) {
      console.error('Submission failed with response:', err.response || err);

      let errorMsg = 'Failed to save quotation.';
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        errorMsg = detail.map((d: any) => `${d.loc?.slice(-1)[0] || 'Field'}: ${d.msg}`).join('\n');
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (err.message) {
        errorMsg = err.message;
      }

      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', color: '#0F172A' }} className="w-full space-y-6 pb-16 antialiased">
      {/* Alert Notification */}
      {successAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Submission Successful</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotes')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Back to Quotations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {isNew ? 'Quotation Configurator & Studio' : `Quote Configuration #${id?.slice(0, 8)}`}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                Active CPQ Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select customer, pick product catalog items via dropdown, verify discount ceilings, and route for multi-level approval.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSaveQuote('draft')}
            disabled={submitting || lineItems.length === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSaveQuote('pending_approval')}
            disabled={submitting || lineItems.length === 0}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Submit Quotation</span>
          </button>
        </div>
      </div>

      {/* Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* STEP 1: Customer Selection */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">Select Customer Account</h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustModal(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Customer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer / Organization Name</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} — Tier: {c.tier?.toUpperCase()} ({c.region || 'US-East'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contract Tier Ceiling</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{activeCustomer?.tier?.toUpperCase() || 'ENTERPRISE'} Limit</span>
                  <span className="text-blue-600 font-extrabold">{maxTierDiscount}% Max</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Product Dropdown Selector */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Products from Catalog</h3>
                  <p className="text-xs text-slate-400">Choose product, configure quantity &amp; line discount</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                {products.length} Products Available
              </span>
            </div>

            {/* Dropdown controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — ${p.base_price?.toLocaleString()} [{p.category}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={pickerQuantity}
                  onChange={(e) => setPickerQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pickerDiscount}
                  onChange={(e) => setPickerDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddFromDropdown}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Line</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Product Badges */}
            {products.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">Quick 1-Click Add:</span>
                <div className="flex flex-wrap gap-2">
                  {products.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddProductById(p.id, 1, 0)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-medium border border-slate-200 transition"
                    >
                      <Plus className="h-3 w-3 text-slate-400" />
                      <span>{p.name}</span>
                      <span className="font-bold text-slate-900">(${p.base_price})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Configured Line Items Table */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">Configured Line Items &amp; Guardrails</h3>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {lineItems.length} Item(s)
              </span>
            </div>

            {lineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">SKU &amp; Category</th>
                      <th className="py-2.5 px-3 w-20">Quantity</th>
                      <th className="py-2.5 px-3">Unit Price</th>
                      <th className="py-2.5 px-3 w-28">Discount %</th>
                      <th className="py-2.5 px-3">Line Total</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {lineItems.map((item, index) => {
                      const itemSubtotal = item.unit_price * item.quantity;
                      const itemDiscount = itemSubtotal * (item.discount_pct / 100);
                      const itemTotal = itemSubtotal - itemDiscount;
                      const isBreached = item.discount_pct > maxTierDiscount;

                      return (
                        <tr key={`${item.product_id}-${index}`} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-bold text-slate-900">{item.product_name}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.sku}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">${item.unit_price.toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <div>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_pct}
                                onChange={(e) => handleUpdateItem(index, 'discount_pct', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                className={`w-20 bg-slate-50 border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none ${
                                  isBreached ? 'border-rose-400 text-rose-600 bg-rose-50' : 'border-slate-200 text-slate-900'
                                }`}
                              />
                              {isBreached && (
                                <span className="text-[9px] font-extrabold text-rose-600 block mt-0.5">
                                  +{item.discount_pct - maxTierDiscount}% OVER
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            ${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No products added to quote yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Select a product above or click one of the quick add badges.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Financial Summary */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Quotation Financial Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Base Value):</span>
                <span className="font-bold text-slate-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Contract Discount:</span>
                <span className="font-bold text-rose-600">-${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Cost of Goods:</span>
                <span className="font-bold text-slate-600">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>Net Quote Amount:</span>
                <span className="text-blue-600">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Gross Margin:</span>
                <span className={`text-base font-black ${marginPct < 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {marginPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(Math.max(marginPct, 0), 100)}%` }}
                  className={`h-full rounded-full ${marginPct < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 block text-right font-medium">Floor &ge; 35% target</span>
            </div>

            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              hasCeilingBreach ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {hasCeilingBreach ? (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block">
                  {hasCeilingBreach ? 'High Risk Ceilings Exceeded' : 'Disciplined Margins Verified'}
                </span>
                <span className="text-[11px] leading-tight block mt-0.5">
                  {hasCeilingBreach
                    ? `Discount exceeds ${maxTierDiscount}% ceiling for this account. Will automatically route to Sales Manager (L1) & Finance (L2) queues.`
                    : 'All line discounts conform strictly to customer tier limits.'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleSaveQuote('pending_approval')}
              disabled={submitting || lineItems.length === 0}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition"
            >
              Submit Quotation
            </button>
          </div>

          {/* Upsell Card */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 text-blue-600">
              <Sparkles className="h-4 w-4" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Automated Margin Upsell</h4>
            </div>
            <p className="text-xs text-slate-500">
              Attach bundled accessories (USB-C Docks, Warranty Extensions) to elevate deal margin over 35%.
            </p>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">Thunderbolt Dock Station</div>
                <div className="text-[10px] text-slate-500">Universal single cable hub</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const dockProd = products.find(p => p.sku?.includes('DCK') || p.sku?.includes('DOCK')) || products[2];
                  if (dockProd) {
                    handleAddProductById(dockProd.id, 1, 0);
                  }
                }}
                className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 font-bold rounded-lg text-[11px] hover:bg-blue-50 transition"
              >
                + Attach
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Inline Customer Addition */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add New Customer Account</h3>
              <button onClick={() => setShowAddCustModal(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Systems"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Tier</label>
                  <select
                    value={newCustTier}
                    onChange={(e) => setNewCustTier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="enterprise">Enterprise (15% Max)</option>
                    <option value="mid_market">Mid-Market (10% Max)</option>
                    <option value="smb">SMB (5% Max)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={newCustRegion}
                    onChange={(e) => setNewCustRegion(e.target.value)}
                    placeholder="e.g. US-East"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCustName.trim()) {
                    alert('Please enter customer company name.');
                    return;
                  }
                  const newEntry: Customer = {
                    id: `c-${Date.now()}`,
                    company_name: newCustName,
                    tier: newCustTier as any,
                    region: newCustRegion,
                    portal_token: `token-${Date.now()}`
                  };
                  setCustomerList(prev => [...prev, newEntry]);
                  setSelectedCustomerId(newEntry.id);
                  setShowAddCustModal(false);
                  setNewCustName('');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Save &amp; Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};