import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotationsApi, productsApi, authApi } from '../services/api';
import { Quotation, Product, Customer, UpsellSuggestion, QuotationLine } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Trash2, ShieldAlert, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, Save, Send, RefreshCw, ShoppingCart, Tag
} from 'lucide-react';

export const QuoteBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuth();

  const [quote, setQuote] = useState<Quotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // New quote modal / form fields
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newLineQty, setNewLineQty] = useState<number>(1);
  const [newLineDiscount, setNewLineDiscount] = useState<number>(0);

  const init = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        productsApi.list(),
        authApi.getCustomers()
      ]);
      setProducts(pRes.data);
      setCustomers(cRes.data);

      if (id && id !== 'new') {
        const qRes = await quotationsApi.get(id);
        setQuote(qRes.data);
        loadSuggestions(qRes.data.id);
      } else if (cRes.data.length > 0) {
        setSelectedCustomerId(cRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async (quoteId: string) => {
    try {
      const sRes = await quotationsApi.getSuggestions(quoteId);
      setSuggestions(sRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    init();
  }, [id]);

  const handleCreateQuote = async () => {
    if (!selectedCustomerId) return;
    setSaving(true);
    try {
      const res = await quotationsApi.create({ customer_id: selectedCustomerId });
      navigate(`/quote/${res.data.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLine = async () => {
    if (!quote || !selectedProductId) return;
    setSaving(true);
    try {
      const res = await quotationsApi.addLine(quote.id, {
        product_id: selectedProductId,
        qty: newLineQty,
        discount_pct: newLineDiscount
      });
      setQuote(res.data);
      loadSuggestions(res.data.id);
      setSelectedProductId('');
      setNewLineQty(1);
      setNewLineDiscount(0);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!quote) return;
    try {
      const res = await quotationsApi.deleteLine(quote.id, lineId);
      setQuote(res.data);
      loadSuggestions(res.data.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSuggestion = async (sugg: UpsellSuggestion) => {
    if (!quote) return;
    setSaving(true);
    try {
      const res = await quotationsApi.addLine(quote.id, {
        product_id: sugg.product_id,
        qty: 1,
        discount_pct: 0
      });
      setQuote(res.data);
      loadSuggestions(res.data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!quote) return;
    setSaving(true);
    try {
      const res = await quotationsApi.submit(quote.id);
      setQuote(res.data);
      if (res.data.status === 'approved') {
        alert('Quotation within discount limits — automatically approved! Proceed to fulfillment.');
        navigate('/fulfillment');
      } else {
        alert(`Quotation flagged with ${res.data.blended_risk} risk — automatically routed for approval!`);
        navigate('/approvals');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading Quotation Builder...</div>;
  }

  // Blank state: Create new quote
  if (!quote && id === 'new') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Initiate New Quotation</h2>
            <p className="text-xs text-slate-500 mt-1">Select customer to load contract pricing and tier ceilings.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Account</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.tier} Tier) — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateQuote}
              disabled={saving}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow transition"
            >
              {saving ? 'Creating...' : 'Open Quotation Canvas →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) return <div>Quotation not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Header & Deal Stage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900">{quote.quote_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              quote.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
              quote.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
              'bg-slate-100 text-slate-700'
            }`}>
              {quote.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customer: <strong className="text-slate-800">{quote.customer_name}</strong> ({quote.customer_tier} Tier) · Sales Rep: {quote.rep_name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSubmitQuote}
            disabled={saving || quote.lines.length === 0}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow transition"
          >
            <Send className="h-4 w-4" />
            <span>Submit / Route Deal</span>
          </button>
        </div>
      </div>

      {/* Blended Risk Notification Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        quote.blended_risk === 'HIGH' ? 'bg-rose-50 border-rose-200 text-rose-900' :
        quote.blended_risk === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-900' :
        'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center space-x-3">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-extrabold text-xs uppercase tracking-wider">
              Blended Risk Score: {quote.blended_risk}
            </span>
            <p className="text-xs mt-0.5">
              {quote.blended_risk === 'HIGH' && 'One or more lines severely exceed tier limits. Approval requires Sales Manager and Finance.'}
              {quote.blended_risk === 'MEDIUM' && 'Moderate line excess detected. Requires Sales Manager review.'}
              {quote.blended_risk === 'NONE' && 'All line items adhere to tier discount ceilings. Fast-track ready.'}
            </p>
          </div>
        </div>
        <div className="text-right font-bold text-xs">
          <span>Margin: </span>
          <span className="text-sm font-black">{quote.total_margin_pct}%</span>
        </div>
      </div>

      {/* Main Workspace Grid: Cart Lines & Upsell Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cart Table & Line Addition */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-sky-600" />
              <span>Quotation Line Items</span>
            </h2>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product / Category</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Discount</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Margin</th>
                    <th className="py-2.5 px-3 text-center">Limit Status</th>
                    <th className="py-2.5 px-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No products added yet. Use the selector below to add items.
                      </td>
                    </tr>
                  ) : (
                    quote.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800">{line.product_name}</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-medium">
                              {line.product_category}
                            </span>
                            {line.is_recurring && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded font-semibold">
                                Recurring
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{line.qty}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">${line.unit_price.toFixed(2)}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{line.discount_pct}%</td>
                        <td className="py-3 px-3 font-black text-slate-900">${line.line_total.toLocaleString()}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">
                          ${line.line_margin.toLocaleString()} ({line.line_margin_pct}%)
                        </td>
                        <td className="py-3 px-3 text-center">
                          {line.line_status === 'OVER' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              OVER (+{line.line_excess}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              OK (≤{line.limit_pct}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteLine(line.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Line Form */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.category}] - ${p.base_price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={newLineQty}
                  onChange={(e) => setNewLineQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newLineDiscount}
                  onChange={(e) => setNewLineDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-center"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  onClick={handleAddLine}
                  disabled={!selectedProductId || saving}
                  className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Line to Quotation</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Totals Summary & B5 Upsell Panel */}
        <div className="space-y-6">
          {/* Order Totals Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Financial Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Value</span>
                <span className="font-semibold">${(quote.total_amount + quote.total_discount_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Discounts Applied</span>
                <span className="font-bold">-${quote.total_discount_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Cost of Goods</span>
                <span className="font-semibold">${quote.total_cost.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-900 text-sm">
                <span className="font-extrabold">Net Order Total</span>
                <span className="font-black text-sky-600">${quote.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded-lg font-bold">
                <span>Gross Margin</span>
                <span>${quote.total_margin.toLocaleString()} ({quote.total_margin_pct}%)</span>
              </div>
            </div>
          </div>

          {/* B5: Live Upsell & Cross-Sell Recommendations */}
          <div className="bg-gradient-to-br from-sky-50 to-slate-50 rounded-2xl border border-sky-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Live Upsell Suggestions</h3>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                {suggestions.length} available
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ranked pairings based on historical co-purchase velocity and positive margin delta.
            </p>

            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No active upsell suggestions for current cart items.
                </div>
              ) : (
                suggestions.map((sugg) => (
                  <div
                    key={sugg.rule_id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-sky-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-900">{sugg.product_name}</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            {sugg.category}
                          </span>
                          {sugg.is_promoted && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold flex items-center space-x-0.5">
                              <Tag className="h-2.5 w-2.5" />
                              <span>PROMOTED</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">${sugg.suggested_price}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">{sugg.reason}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-emerald-600">
                        +${sugg.margin_delta} margin ({sugg.margin_delta_pct}%)
                      </span>
                      <button
                        onClick={() => handleAddSuggestion(sugg)}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 hover:bg-sky-100 transition"
                      >
                        + Add to Quote
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
