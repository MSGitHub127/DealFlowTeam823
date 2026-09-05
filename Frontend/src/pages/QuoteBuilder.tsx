import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quotationsApi, productsApi, authApi } from '../services/api';
import { Quotation, Product, Customer, UpsellSuggestion, QuotationLine } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Trash2, ShieldAlert, Sparkles, CheckCircle2,
  AlertTriangle, ArrowRight, ArrowLeft, Save, Send, RefreshCw, ShoppingCart, Tag,
  Minus, Layers, Check, FileText, Building, Info
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
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Canvas notes
  const [quoteNotes, setQuoteNotes] = useState<string>('');

  // New quote panel fields
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newQuoteNotes, setNewQuoteNotes] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newLineQty, setNewLineQty] = useState<number>(1);
  const [newLineDiscount, setNewLineDiscount] = useState<string>('0');

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
        setQuoteNotes(qRes.data.notes || '');
        setIsSaved(true);
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

  const handleCreateQuote = async (redirectToCanvas: boolean = true) => {
    if (!selectedCustomerId) return;
    setSaving(true);
    try {
      const payload: any = {
        customer_id: selectedCustomerId,
        notes: newQuoteNotes.trim() || undefined
      };
      if (selectedProductId) {
        const discountVal = Math.min(100, Math.max(0, parseFloat(newLineDiscount) || 0));
        payload.lines = [{
          product_id: selectedProductId,
          qty: newLineQty,
          discount_pct: discountVal
        }];
      }
      const res = await quotationsApi.create(payload);
      if (redirectToCanvas) {
        navigate(`/quote/${res.data.id}`);
      } else {
        navigate('/pipeline');
      }
    } catch (e) {
      console.error('Error creating quotation:', e);
      alert('Failed to save quotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!quote) return;
    setSaving(true);
    try {
      const res = await quotationsApi.update(quote.id, {
        notes: quoteNotes
      });
      setQuote(res.data);
      setQuoteNotes(res.data.notes || '');
      setIsSaved(true);
      setSaveSuccessMsg('Quotation draft saved successfully in Pipeline!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e) {
      console.error('Failed to save quotation:', e);
      alert('Failed to save quotation changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLine = async () => {
    if (!quote || !selectedProductId) return;
    setSaving(true);
    try {
      const discountVal = Math.min(100, Math.max(0, parseFloat(newLineDiscount) || 0));
      const res = await quotationsApi.addLine(quote.id, {
        product_id: selectedProductId,
        qty: newLineQty,
        discount_pct: discountVal
      });
      setQuote(res.data);
      setIsSaved(true);
      loadSuggestions(res.data.id);
      setSelectedProductId('');
      setNewLineQty(1);
      setNewLineDiscount('0');
      setSaveSuccessMsg('Line item added and quotation updated.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
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
      setIsSaved(true);
      loadSuggestions(res.data.id);
      setSaveSuccessMsg('Line item removed and quotation recalculated.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
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
      setIsSaved(true);
      loadSuggestions(res.data.id);
      setSaveSuccessMsg(`Upsell '${sugg.product_name}' attached to quotation.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
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
    return <div className="p-16 text-center text-slate-400 font-medium text-xs">Loading Quotation Canvas...</div>;
  }

  // Blank state: Create new quote via rich New Quotation Panel
  if (!quote && id === 'new') {
    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const tierDiscountLimit = selectedCustomer?.tier === 'Gold' ? 15 : selectedCustomer?.tier === 'Silver' ? 10 : 5;
    const discountVal = Math.min(100, Math.max(0, parseFloat(newLineDiscount) || 0));
    const isDiscountOver = discountVal > tierDiscountLimit;

    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/pipeline')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Deal Pipeline</span>
          </button>
          <span className="text-xs bg-sky-50 text-sky-700 font-bold px-2.5 py-1 rounded-full border border-sky-200">
            Quotation Builder v2.0
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">New Quotation Panel</h1>
                <p className="text-xs text-slate-500">
                  Select customer account, configure contract terms, and add initial line items to persist as a draft.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Section: Account & Tier Rules */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  1. Customer Account
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.tier} Tier) — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Contract Tier &amp; Ceiling</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      selectedCustomer.tier === 'Gold' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                      selectedCustomer.tier === 'Silver' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                      'bg-orange-50 text-orange-800 border-orange-200'
                    }`}>
                      {selectedCustomer.tier} Tier
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Standard discount ceiling for {selectedCustomer.tier} accounts is <strong className="text-slate-800">{tierDiscountLimit}%</strong>. Discounts beyond this ceiling will trigger multi-step managerial approval.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  2. Commercial Notes &amp; Payment Terms (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newQuoteNotes}
                  onChange={(e) => setNewQuoteNotes(e.target.value)}
                  placeholder="e.g. Net-30 payment terms, 1-year annual contract, dedicated onboarding included..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>
            </div>

            {/* Right Section: Initial Line Item (Optional) */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  3. Initial Product Line (Optional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- No initial product (Blank Canvas) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.category}] · ${p.base_price}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{selectedProduct.name}</span>
                    <span className="font-black text-sky-700">${selectedProduct.base_price}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Quantity
                      </label>
                      <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setNewLineQty(Math.max(1, newLineQty - 1))}
                          className="p-2 hover:bg-slate-100 text-slate-600 transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={newLineQty}
                          onChange={(e) => setNewLineQty(parseInt(e.target.value) || 1)}
                          className="w-full bg-transparent text-center text-xs font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setNewLineQty(newLineQty + 1)}
                          className="p-2 hover:bg-slate-100 text-slate-600 transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Discount (%)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={newLineDiscount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || (/^\d*\.?\d*$/.test(val) && parseFloat(val) <= 100)) {
                              setNewLineDiscount(val);
                            }
                          }}
                          placeholder="0"
                          className="w-full p-2 pr-6 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sky-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Discount Status:</span>
                    {isDiscountOver ? (
                      <span className="font-bold text-rose-600 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>OVER limit ({discountVal}% &gt; {tierDiscountLimit}%)</span>
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-600 flex items-center space-x-1">
                        <Check className="h-3 w-3" />
                        <span>Within Limit (≤{tierDiscountLimit}%)</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center space-x-2 font-bold text-slate-800">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Instant Database Persistence</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Saving will generate a permanent Quotation ID (<code className="text-sky-700">QT-XXXX</code>), register it on the Pipeline Kanban board, and save all line items and terms.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/pipeline')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleCreateQuote(false)}
                disabled={saving || !selectedCustomerId}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs shadow-sm hover:shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5 text-slate-600" />
                <span>{saving ? 'Saving...' : 'Save Draft to Pipeline'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateQuote(true)}
                disabled={saving || !selectedCustomerId}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{saving ? 'Creating...' : 'Open Quotation Canvas →'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) return <div className="p-12 text-center text-slate-500">Quotation not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between">
        <Link
          to="/pipeline"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Deal Pipeline</span>
        </Link>
        {isSaved && (
          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <Check className="h-3 w-3" />
            <span>Saved in Database</span>
          </span>
        )}
      </div>

      {/* Save Success Toast Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-semibold shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{quote.quote_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              quote.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              quote.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {quote.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customer: <strong className="text-slate-800 font-bold">{quote.customer_name}</strong> ({quote.customer_tier} Tier) · Sales Rep: {quote.rep_name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
            title="Save changes and quotation notes"
          >
            <Save className="h-3.5 w-3.5 text-slate-600" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleSubmitQuote}
            disabled={saving || quote.lines.length === 0}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit / Route Deal</span>
          </button>
        </div>
      </div>

      {/* Real-time Blended Risk Evaluation Pill Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
        quote.blended_risk === 'HIGH' ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
        quote.blended_risk === 'MEDIUM' ? 'bg-amber-50/70 border-amber-200 text-amber-900' :
        'bg-emerald-50/70 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center space-x-3">
          <span className={`p-2 rounded-xl flex items-center justify-center ${
            quote.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-700' :
            quote.blended_risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xs uppercase tracking-wider">
                Blended Risk: {quote.blended_risk}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                quote.blended_risk === 'HIGH' ? 'bg-rose-200/80 text-rose-900' :
                quote.blended_risk === 'MEDIUM' ? 'bg-amber-200/80 text-amber-900' :
                'bg-emerald-200/80 text-emerald-900'
              }`}>
                {quote.blended_risk === 'HIGH' ? 'Sales Manager → Finance Chain' :
                 quote.blended_risk === 'MEDIUM' ? 'Sales Manager Review' :
                 'Auto-Approved'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {quote.blended_risk === 'HIGH' && 'One or more lines exceed permitted category discount floors. Both Manager and Finance signoffs required.'}
              {quote.blended_risk === 'MEDIUM' && 'Moderate discount excess. Step 1 (Sales Manager) signoff required.'}
              {quote.blended_risk === 'NONE' && 'All lines conform strictly to customer tier and category ceilings.'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Blended Margin</span>
          <span className="text-base font-black text-slate-900">{quote.total_margin_pct}%</span>
        </div>
      </div>

      {/* Main Grid: Products Cart & Upsell Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cart Table & Line Addition */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-sky-600" />
              <span>Quotation Line Items</span>
            </h2>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Product / Category</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Base Price</th>
                    <th className="py-2.5 px-3">Discount</th>
                    <th className="py-2.5 px-3">Net Total</th>
                    <th className="py-2.5 px-3">Margin</th>
                    <th className="py-2.5 px-3 text-center">Limit Status</th>
                    <th className="py-2.5 px-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-medium">
                        No items added yet. Select a product below to populate cart.
                      </td>
                    </tr>
                  ) : (
                    quote.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{line.product_name}</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                              {line.product_category}
                            </span>
                            {line.is_recurring && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                                Recurring SaaS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{line.qty}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">${line.unit_price.toFixed(2)}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{line.discount_pct}%</td>
                        <td className="py-3 px-3 font-black text-slate-900">${line.line_total.toLocaleString()}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">
                          ${line.line_margin.toLocaleString()} ({line.line_margin_pct}%)
                        </td>
                        <td className="py-3 px-3 text-center">
                          {line.line_status === 'OVER' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              OVER (+{line.line_excess}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              OK (≤{line.limit_pct}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteLine(line.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Remove line"
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

            {/* Inline Add Line Form */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Product Catalog
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.category}] · ${p.base_price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Quantity
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setNewLineQty(Math.max(1, newLineQty - 1))}
                    className="p-2 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={newLineQty}
                    onChange={(e) => setNewLineQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-transparent text-center text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewLineQty(newLineQty + 1)}
                    className="p-2 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Discount (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newLineDiscount}
                    onFocus={(e) => {
                      if (newLineDiscount === '0') {
                        setNewLineDiscount('');
                      } else {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewLineDiscount('');
                        return;
                      }
                      if (/^\d*\.?\d*$/.test(val)) {
                        const num = parseFloat(val);
                        if (isNaN(num) || num <= 100) {
                          setNewLineDiscount(val);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (newLineDiscount === '' || isNaN(parseFloat(newLineDiscount))) {
                        setNewLineDiscount('0');
                      } else {
                        const num = Math.min(100, Math.max(0, parseFloat(newLineDiscount)));
                        setNewLineDiscount(num.toString());
                      }
                    }}
                    placeholder="0"
                    className="w-full p-2.5 pr-6 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              <div className="sm:col-span-1">
                <button
                  onClick={handleAddLine}
                  disabled={!selectedProductId || saving}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  + Add Line
                </button>
              </div>
            </div>
          </div>

          {/* Deal Notes & Commercial Terms Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Commercial Terms &amp; Deal Notes</h3>
              </div>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center space-x-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Notes'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={quoteNotes}
              onChange={(e) => {
                setQuoteNotes(e.target.value);
                setIsSaved(false);
              }}
              placeholder="Specify commercial contract clauses, SLA requirements, billing terms (e.g., Net-30), custom shipping arrangements..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />

            <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 font-bold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setQuoteNotes((prev) => (prev ? `${prev} · Net-30 standard payment` : 'Net-30 standard payment'));
                  setIsSaved(false);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              >
                + Net-30 Terms
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuoteNotes((prev) => (prev ? `${prev} · 99.9% Enterprise SLA` : '99.9% Enterprise SLA guarantee'));
                  setIsSaved(false);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              >
                + Enterprise SLA
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuoteNotes((prev) => (prev ? `${prev} · Free onboarding bundle` : 'Free onboarding bundle included'));
                  setIsSaved(false);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              >
                + Free Onboarding
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Breakdown & Upsells */}
        <div className="space-y-6">
          {/* Financial Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Financial Breakdown
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Gross Catalog Value</span>
                <span className="font-semibold text-slate-800">${(quote.total_amount + quote.total_discount_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Volume Concessions</span>
                <span className="font-bold">-${quote.total_discount_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Base Cost of Goods</span>
                <span className="font-semibold text-slate-800">${quote.total_cost.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-900 text-sm">
                <span className="font-black">Net Contract Total</span>
                <span className="font-black text-sky-600">${quote.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl font-bold border border-emerald-200/60">
                <span className="text-xs">Gross Margin</span>
                <span className="text-sm font-black">${quote.total_margin.toLocaleString()} ({quote.total_margin_pct}%)</span>
              </div>
            </div>
          </div>

          {/* B5 Upsell & Cross-Sell Panel */}
          <div className="bg-gradient-to-br from-sky-50/50 to-slate-50/60 rounded-2xl border border-sky-200/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-sky-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Upsell Suggestions</h3>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                {suggestions.length} ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Co-purchase recommendations based on cart velocity and positive margin delta.
            </p>

            <div className="space-y-2.5 pt-1">
              {suggestions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium">
                  No upsell suggestions for current items.
                </div>
              ) : (
                suggestions.map((sugg) => (
                  <div
                    key={sugg.rule_id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:border-sky-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-900">{sugg.product_name}</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                            {sugg.category}
                          </span>
                          {sugg.is_promoted && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-bold flex items-center space-x-0.5">
                              <Tag className="h-2 w-2" />
                              <span>PROMOTED</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">${sugg.suggested_price}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 italic">{sugg.reason}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[10px] font-bold text-emerald-600">
                        +${sugg.margin_delta} margin ({sugg.margin_delta_pct}%)
                      </span>
                      <button
                        onClick={() => handleAddSuggestion(sugg)}
                        className="text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition"
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
