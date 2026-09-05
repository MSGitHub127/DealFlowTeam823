import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { portalApi, authApi, quotationsApi } from '../services/api';
import { PortalQuotation, Customer } from '../types';
import {
  MessageSquare, CheckCircle2, Send, AlertCircle,
  ShieldCheck, Building2, User, FileText, ArrowRight, CornerDownRight
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const navigate = useNavigate();

  const [token, setToken] = useState<string>(tokenParam || '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [portalQuote, setPortalQuote] = useState<PortalQuotation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Negotiation state
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [counterDiscount, setCounterDiscount] = useState<number>(18);
  const [commentText, setCommentText] = useState<string>('');

  const loadCustomers = async () => {
    try {
      const res = await authApi.getCustomers();
      setCustomers(res.data);
      if (!token && res.data.length > 0) {
        const acme = res.data.find(c => c.company_name.includes('Acme')) || res.data[0];
        setToken(acme.portal_token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadQuote = async (activeToken: string) => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const qListRes = await quotationsApi.list();
      const allQuotes = qListRes.data;
      
      const currentCust = customers.find(c => c.portal_token === activeToken);
      let targetQ = allQuotes.find(q => q.customer_id === currentCust?.id);
      if (!targetQ && allQuotes.length > 0) {
        targetQ = allQuotes[0];
      }

      if (targetQ) {
        const res = await portalApi.getQuotation(targetQ.id, activeToken);
        setPortalQuote(res.data);
        if (res.data.lines.length > 0) {
          setSelectedLineId(res.data.lines[0].id);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (token) {
      loadQuote(token);
    }
  }, [token, customers]);

  const handleProposeCounterDiscount = async () => {
    if (!portalQuote || !selectedLineId) return;
    setSubmitting(true);
    try {
      const res = await portalApi.proposeCounterDiscount(portalQuote.id, token, {
        quotation_line_id: selectedLineId,
        proposed_discount_pct: counterDiscount,
        comment: commentText || `Customer procurement requested ${counterDiscount}% volume concession.`
      });
      setPortalQuote(res.data);
      setCommentText('');
      alert(
        res.data.status === 'pending_approval'
          ? `Counter-offer submitted! Because the proposed ${counterDiscount}% discount exceeds standard tier limits, the quote has automatically re-entered sales approval.`
          : 'Counter-offer successfully submitted to your account team.'
      );
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to submit counter offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmQuotation = async () => {
    if (!portalQuote) return;
    setSubmitting(true);
    try {
      const res = await portalApi.confirmQuotation(portalQuote.id, token, {
        notes: 'Confirmed by customer procurement via DealFlow360 secure portal.'
      });
      setPortalQuote(res.data);
      if (res.data.status === 'confirmed') {
        alert('Quotation confirmed! Your order is progressing directly to dispatch.');
      } else {
        alert('Quotation accepted! Revised terms submitted for executive approval.');
      }
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to confirm quotation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Session Switcher Pill */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
        <div className="flex items-center space-x-2.5 text-slate-700">
          <Building2 className="h-4 w-4 text-sky-600" />
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Active Portal Token:</span>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.portal_token}>
                {c.company_name} ({c.tier} Customer) — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Zero Internal Margins Leaked Server-Side</span>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 font-medium text-xs">Accessing secure quotation...</div>
      ) : portalQuote ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{portalQuote.quote_number}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  portalQuote.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  portalQuote.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-sky-50 text-sky-700 border border-sky-200'
                }`}>
                  {portalQuote.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Prepared for <strong className="text-slate-800 font-bold">{portalQuote.company_name}</strong> · Attn: {portalQuote.customer_name}
              </p>
            </div>

            <div>
              <button
                onClick={handleConfirmQuotation}
                disabled={submitting || portalQuote.status === 'confirmed'}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Confirm & Accept Order</span>
              </button>
            </div>
          </div>

          {/* Quotation Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Quoted Line Items & Deliverables</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Discount Applied</th>
                    <th className="py-2.5 px-3 text-right">Net Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {portalQuote.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {l.product_name}
                        {l.is_recurring && (
                          <span className="ml-2 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                            Recurring SaaS
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{l.product_category}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{l.qty}</td>
                      <td className="py-3 px-3 text-slate-700">${l.unit_price.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{l.discount_pct}%</td>
                      <td className="py-3 px-3 font-black text-slate-900 text-right">${l.line_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Value</span>
                  <span className="font-semibold text-slate-800">${(portalQuote.total_amount + portalQuote.total_discount_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Contract Concessions</span>
                  <span className="font-bold">-${portalQuote.total_discount_amount.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-900 font-black text-sm">
                  <span>Net Investment</span>
                  <span className="text-sky-600 font-black">${portalQuote.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Negotiation & Counter-Offer Box */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-sky-600" />
                <span>Line-Level Negotiation & Counter-Offer</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Propose counter discounts directly on specific lines without email back-and-forth.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target Product Line
                </label>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {portalQuote.lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.product_name} (Current: {l.discount_pct}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Proposed Counter Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Business Justification Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Requesting 18% discount concession for immediate fleet signoff..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleProposeCounterDiscount}
                disabled={submitting}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <Send className="h-3.5 w-3.5 text-sky-400" />
                <span>Submit Counter-Offer (Auto Re-routes if Over Limit)</span>
              </button>
            </div>

            {/* Negotiation Comment Thread */}
            {portalQuote.negotiation_comments && portalQuote.negotiation_comments.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Negotiation History</h4>
                <div className="space-y-2">
                  {portalQuote.negotiation_comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.author_name} ({c.author_type})</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{c.comment}</p>
                      {c.proposed_discount_pct !== null && c.proposed_discount_pct !== undefined && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                          Proposed discount: {c.proposed_discount_pct}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 text-xs font-medium">
          No quotation found for this portal token.
        </div>
      )}
    </div>
  );
};
