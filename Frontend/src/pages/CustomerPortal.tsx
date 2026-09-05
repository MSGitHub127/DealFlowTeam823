import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { portalApi, authApi, quotationsApi } from '../services/api';
import { PortalQuotation, Customer } from '../types';
import {
  MessageSquare, CheckCircle2, Send, AlertCircle,
  HelpCircle, Sparkles, Building2, User
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [token, setToken] = useState<string>(tokenParam || '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [portalQuote, setPortalQuote] = useState<PortalQuotation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Negotiation state
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [counterDiscount, setCounterDiscount] = useState<number>(15);
  const [commentText, setCommentText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'review' | 'negotiate'>('review');

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
      // Find quotation associated with this customer
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
        comment: commentText || `Customer requested ${counterDiscount}% discount concession.`
      });
      setPortalQuote(res.data);
      setCommentText('');
      alert(
        res.data.status === 'pending_approval'
          ? `Counter-offer submitted! Because the proposed ${counterDiscount}% discount exceeds standard thresholds, the quote has automatically re-entered sales approval.`
          : 'Counter-offer submitted to your sales representative!'
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
        notes: 'Confirmed by customer procurement via DealFlow360 portal.'
      });
      setPortalQuote(res.data);
      if (res.data.status === 'confirmed') {
        alert('Quotation successfully confirmed! Order is now progressing to fulfillment.');
      } else {
        alert('Quotation confirmed, but terms require sales management signoff. Automatically routed for approval.');
      }
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to confirm quotation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Customer Account Switcher for Testing/Demo */}
      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
        <div className="flex items-center space-x-2 text-slate-700">
          <Building2 className="h-4 w-4 text-sky-600" />
          <span className="font-bold">Portal Access Token Session:</span>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2 py-1 font-semibold text-slate-800"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.portal_token}>
                {c.company_name} ({c.tier} Customer) — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Zero Internal Margins Leaked Server-Side</span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading your secure quotation...</div>
      ) : portalQuote ? (
        <div className="space-y-6">
          {/* Quote Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-black text-slate-900">{portalQuote.quote_number}</h2>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase bg-sky-100 text-sky-800">
                  {portalQuote.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Prepared exclusively for <strong>{portalQuote.company_name}</strong> (Attn: {portalQuote.customer_name})
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleConfirmQuotation}
                disabled={submitting || portalQuote.status === 'confirmed'}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm & Accept Quotation</span>
              </button>
            </div>
          </div>

          {/* Quotation Details & Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Quotation Items & Pricing</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Discount</th>
                    <th className="py-2.5 px-3 text-right">Net Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {portalQuote.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {l.product_name}
                        {l.is_recurring && (
                          <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold">
                            Recurring
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{l.product_category}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{l.qty}</td>
                      <td className="py-3 px-3 text-slate-800">${l.unit_price.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{l.discount_pct}%</td>
                      <td className="py-3 px-3 font-black text-slate-900 text-right">${l.line_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Total</span>
                  <span className="font-semibold">${(portalQuote.total_amount + portalQuote.total_discount_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Volume Discounts</span>
                  <span>-${portalQuote.total_discount_amount.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-900 font-black text-sm">
                  <span>Net Investment</span>
                  <span className="text-sky-600">${portalQuote.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Negotiation & Counter-Offer Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-sky-600" />
                <span>Live Deal Negotiation & Line Concessions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Propose line adjustments or ask questions directly inside this portal without email friction.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Product Line</label>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  {portalQuote.lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.product_name} (Current: {l.discount_pct}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proposed Counter Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-center"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Business Rationale / Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. If approved at this price, our board is ready to sign contract today..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleProposeCounterDiscount}
                disabled={submitting}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Counter-Offer (Auto Re-evaluates Approval)</span>
              </button>
            </div>

            {/* Conversation Thread */}
            {portalQuote.negotiation_comments && portalQuote.negotiation_comments.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Negotiation History</h4>
                <div className="space-y-2">
                  {portalQuote.negotiation_comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.author_name} ({c.author_type})</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1">{c.comment}</p>
                      {c.proposed_discount_pct !== null && c.proposed_discount_pct !== undefined && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.2 rounded">
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
        <div className="p-12 text-center text-slate-400">
          No quotation found for this token.
        </div>
      )}
    </div>
  );
};
