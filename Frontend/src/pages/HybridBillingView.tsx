import React, { useState, useEffect } from 'react';
import { billingApi } from '../services/api';
import {
  SubscriptionPlan, Subscription, Invoice, CreditNote
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard, Calendar, Repeat, Receipt, DollarSign,
  CheckCircle, AlertCircle, RefreshCw, Plus, Edit2, Ban
} from 'lucide-react';

export const HybridBillingView: React.FC = () => {
  const { currentRole } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [activeTab, setActiveTab] = useState<'subs' | 'invoices' | 'credits' | 'plans'>('subs');
  const [loading, setLoading] = useState<boolean>(true);

  // Proration mid-cycle modal state
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [newSubQty, setNewSubQty] = useState<number>(1);
  const [prorationResult, setProrationResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Payment modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plRes, subRes, invRes, cnRes] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscriptions(),
        billingApi.getInvoices(),
        billingApi.getCreditNotes()
      ]);
      setPlans(plRes.data);
      setSubscriptions(subRes.data);
      setInvoices(invRes.data);
      setCreditNotes(cnRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleModifyQty = async () => {
    if (!selectedSub) return;
    setSubmitting(true);
    try {
      const res = await billingApi.modifySubQty(selectedSub.id, newSubQty);
      setProrationResult(res.data);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to modify subscription quantity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSub = async (subId: string) => {
    if (!confirm('Are you sure you want to cancel this recurring subscription? A prorated credit note will be issued.')) return;
    try {
      const res = await billingApi.cancelSub(subId);
      alert(res.data.explanation);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to cancel subscription');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      await billingApi.payInvoice(selectedInvoice.id, {
        amount: paymentAmount,
        payment_method: 'bank_transfer',
        notes: 'Recorded via Sales Ops Billing Terminal'
      });
      alert('Payment recorded successfully! Invoice status updated.');
      setSelectedInvoice(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-sky-600" />
            <span>Hybrid Billing & Subscription Lifecycle Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Reconciles one-time hardware shipments with recurring SaaS subscriptions and mid-cycle proration.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('subs')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'subs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Active Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'credits' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Credit Notes ({creditNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'plans' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Plans ({plans.length})
          </button>
        </div>
      </div>

      {/* Tab: Subscriptions */}
      {activeTab === 'subs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Repeat className="h-4 w-4 text-sky-600" />
              <span>Customer SaaS Subscriptions & Proration Control</span>
            </h3>
            <span className="text-xs text-slate-500">Live seat adjustments trigger automated proration</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Plan / Product</th>
                  <th className="py-2.5 px-3">Seats / Qty</th>
                  <th className="py-2.5 px-3">Unit Price</th>
                  <th className="py-2.5 px-3">Next Bill Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No subscriptions registered yet.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-800">{s.customer_name}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">{s.product_name}</span>
                        <span className="block text-[11px] text-slate-500">{s.plan_name}</span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">{s.qty} seats</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">${s.unit_price}/cycle</td>
                      <td className="py-3 px-3 font-medium text-slate-600">{s.next_bill_date}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {s.status === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedSub(s);
                                setNewSubQty(s.qty);
                                setProrationResult(null);
                              }}
                              className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-bold text-[11px] border border-sky-200 transition"
                            >
                              Modify Seats
                            </button>
                            <button
                              onClick={() => handleCancelSub(s.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-[11px] border border-rose-200 transition"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-sky-600" />
              <span>Customer Invoices (Goods Shipped & Subscriptions)</span>
            </h3>
            <span className="text-xs text-slate-500">Invoice-per-shipment policy strictly enforced</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Subtotal</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{inv.customer_name}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {inv.invoice_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">${inv.subtotal.toFixed(2)}</td>
                      <td className="py-3 px-3 font-black text-slate-900">${inv.total_amount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-500">{inv.due_date}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentAmount(inv.total_amount);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Credit Notes */}
      {activeTab === 'credits' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Credit Notes & Prorated Refunds</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Credit Note #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Credit Amount</th>
                  <th className="py-2.5 px-3">Reason / Proration Breakdown</th>
                  <th className="py-2.5 px-3">Issued Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No credit notes issued.
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{cn.credit_note_number}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{cn.customer_name}</td>
                      <td className="py-3 px-3 font-black text-emerald-600">${cn.amount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-600">{cn.reason}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(cn.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Plans */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">{p.name}</h4>
                  <span className="text-xs uppercase tracking-wider text-sky-600 font-bold">{p.cadence} cadence</span>
                </div>
                <span className="text-xl font-black text-slate-900">${p.price}</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <p>Cycle Length: <strong>{p.billing_cycle_days} days</strong></p>
                <p>Proration Rule: <strong>{p.proration_rule}</strong></p>
                <p>Refund Rule: <strong>{p.cancellation_refund_rule}</strong></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mid-Cycle Seat Proration Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base">
              Mid-Cycle Subscription Proration
            </h3>
            <p className="text-xs text-slate-500">
              Customer: <strong>{selectedSub.customer_name}</strong> · Current Seats: <strong>{selectedSub.qty}</strong>
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">New Seat Quantity</label>
              <input
                type="number"
                min="1"
                value={newSubQty}
                onChange={(e) => setNewSubQty(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold"
              />
            </div>

            {prorationResult && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-1 text-sky-900">
                <p className="font-bold">Proration Engine Result:</p>
                <p>{prorationResult.explanation}</p>
                <p className="font-extrabold">
                  {prorationResult.credit_or_charge >= 0 ? 'Additional Charge:' : 'Refund Credit:'} ${Math.abs(prorationResult.credit_or_charge).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleModifyQty}
                disabled={submitting}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow transition"
              >
                {submitting ? 'Calculating...' : 'Apply Proration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base">
              Record Payment for Invoice {selectedInvoice.invoice_number}
            </h3>
            <p className="text-xs text-slate-500">
              Customer: <strong>{selectedInvoice.customer_name}</strong> · Outstanding: <strong>${selectedInvoice.total_amount}</strong>
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submitting || paymentAmount <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Confirm Payment & Reconcile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
