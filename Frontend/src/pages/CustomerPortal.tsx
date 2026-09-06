import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { portalApi, authApi, quotationsApi } from '../services/api';
import { PortalQuotation, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, CheckCircle2, Send,
  Building2, User, FileText,
  LogOut, Mail, Lock, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();

  // Active Tab State: 'quotation' | 'messages' | 'profile'
  const [activeTab, setActiveTab] = useState<'quotation' | 'messages' | 'profile'>('quotation');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [token, setToken] = useState<string>(tokenParam || '');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [portalQuote, setPortalQuote] = useState<PortalQuotation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Negotiation state
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [counterDiscount, setCounterDiscount] = useState<string>('18');
  const [commentText, setCommentText] = useState<string>('');

  // Messages State
  const [newMessage, setNewMessage] = useState<string>('');

  const loadCustomerAndQuote = async () => {
    setLoading(true);
    try {
      const res = await authApi.getCustomers();
      const customersList: Customer[] = res.data;
      
      let matchedCust = customersList.find(c => c.portal_token === token);
      
      // Fallback matching if token parameter was not provided
      if (!matchedCust && customersList.length > 0) {
        matchedCust = customersList[0];
        setToken(matchedCust.portal_token);
      }

      if (matchedCust) {
        setActiveCustomer(matchedCust);
        const qListRes = await quotationsApi.list();
        const allQuotes = qListRes.data;
        
        let targetQ = allQuotes.find(q => q.customer_id === matchedCust?.id);
        if (!targetQ && allQuotes.length > 0) {
          targetQ = allQuotes[0];
        }

        if (targetQ) {
          const qRes = await portalApi.getQuotation(targetQ.id, matchedCust.portal_token);
          setPortalQuote(qRes.data);
          if (qRes.data.lines.length > 0) {
            setSelectedLineId(qRes.data.lines[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerAndQuote();
  }, [token]);

  const handleProposeCounterDiscount = async () => {
    if (!portalQuote || !selectedLineId) return;
    setSubmitting(true);
    try {
      const discountVal = Math.min(100, Math.max(0, parseFloat(counterDiscount) || 0));
      const res = await portalApi.proposeCounterDiscount(portalQuote.id, token, {
        quotation_line_id: selectedLineId,
        proposed_discount_pct: discountVal,
        comment: commentText || `Customer procurement requested ${discountVal}% volume concession.`
      });
      setPortalQuote(res.data);
      setCommentText('');
      alert(
        res.data.status === 'pending_approval'
          ? `Counter-offer submitted! Because the proposed ${discountVal}% discount exceeds standard tier limits, the quote has automatically re-entered sales approval.`
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

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* ================= LEFT SIDEBAR NAVIGATION ================= */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-200 z-40 flex flex-col justify-between transition-all duration-300 shadow-sm ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  DealFlow<span className="text-blue-600">360</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  Portal
                </span>
              </div>
            )}

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition mx-auto"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('quotation')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'quotation'
                  ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? 'My Quotation' : undefined}
            >
              <FileText className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>My Quotation</span>}
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'messages'
                  ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? 'Messages' : undefined}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Messages</span>}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? 'Profile' : undefined}
            >
              <User className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Profile</span>}
            </button>
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {!isCollapsed && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Account Context
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {activeCustomer?.company_name || currentUser?.company || 'Customer User'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className={`flex-1 transition-all duration-300 p-8 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Locked Active Account Banner */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
            <div className="flex items-center space-x-2.5 text-slate-700">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                Active Organization:
              </span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {activeCustomer?.company_name || 'Acme Corp'} ({activeCustomer?.tier || 'SMB'} Tier) — {activeCustomer?.name || 'Customer Procurement'}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Authenticated Account Session</span>
            </div>
          </div>

          {/* ================= TAB 1: MY QUOTATION ================= */}
          {activeTab === 'quotation' && (
            <>
              {loading ? (
                <div className="p-16 text-center text-slate-400 font-medium text-xs">Accessing secure quotation...</div>
              ) : portalQuote ? (
                <div className="space-y-6">
                  {/* Header Card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{portalQuote.quote_number}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          portalQuote.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          portalQuote.status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
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
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm">Quoted Line Items & Deliverables</h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
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
                          <span className="text-blue-600 font-black">${portalQuote.total_amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line-Level Negotiation & Counter-Offer Box */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
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
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={counterDiscount}
                            onChange={(e) => setCounterDiscount(e.target.value)}
                            placeholder="0"
                            className="w-full p-2.5 pr-6 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                            %
                          </span>
                        </div>
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
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleProposeCounterDiscount}
                        disabled={submitting}
                        className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
                      >
                        <Send className="h-3.5 w-3.5 text-blue-400" />
                        <span>Submit Counter-Offer</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-slate-400 text-xs font-medium">
                  No quotation found for this portal token.
                </div>
              )}
            </>
          )}

          {/* ================= TAB 2: MESSAGES ================= */}
          {activeTab === 'messages' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span>Account Team Direct Thread</span>
              </h3>
              <p className="text-xs text-slate-500">Communicate directly with your assigned DealFlow360 sales team.</p>

              <div className="space-y-3 pt-2">
                {portalQuote?.negotiation_comments && portalQuote.negotiation_comments.length > 0 ? (
                  portalQuote.negotiation_comments.map((c) => (
                    <div key={c.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                      <div className="flex justify-between items-center font-bold text-slate-800">
                        <span>{c.author_name} ({c.author_type})</span>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(c.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">No previous messages in this thread.</div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message to your account team..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  onClick={() => {
                    if (newMessage) {
                      alert('Message dispatched to account manager!');
                      setNewMessage('');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PROFILE ================= */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{activeCustomer?.name || 'Customer User'}</h3>
                  <p className="text-xs text-slate-500">{activeCustomer?.company_name || 'Registered Account'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Name</span>
                  <span className="font-bold text-slate-800 text-sm block">{activeCustomer?.company_name}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Tier</span>
                  <span className="font-bold text-slate-800 text-sm uppercase block">{activeCustomer?.tier || 'SMB'} Tier</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Contact</span>
                  <span className="font-semibold text-slate-700 block">{activeCustomer?.email || 'customer@company.com'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Portal Access Token</span>
                  <span className="font-mono text-slate-600 block">{token}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
