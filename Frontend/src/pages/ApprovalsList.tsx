import React, { useState, useEffect } from 'react';
import { approvalsApi } from '../services/api';
import { ApprovalRequest, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, ShieldAlert, Check, X, RotateCcw,
  History, Clock, FileText, UserCheck
} from 'lucide-react';

export const ApprovalsList: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'audit'>('queue');
  const [loading, setLoading] = useState<boolean>(true);

  // Action modal state
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'returned' | null>(null);
  const [actionNote, setActionNote] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, logRes] = await Promise.all([
        approvalsApi.list(),
        approvalsApi.getAuditLogs()
      ]);
      setApprovals(appRes.data);
      setAuditLogs(logRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAct = async () => {
    if (!selectedApproval || !actionType) return;
    setSubmitting(true);
    try {
      await approvalsApi.act(selectedApproval.id, {
        action: actionType,
        note: actionNote,
        reason: actionReason
      });
      setActionType(null);
      setActionNote('');
      setActionReason('');
      setSelectedApproval(null);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to submit approval action.');
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
            <ShieldCheck className="h-6 w-6 text-sky-600" />
            <span>Discount Approvals & Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-tier blended risk routing: Sales Manager (Step 1) & Finance/Ops (Step 2).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Queue ({approvals.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit Trail Log</span>
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Deal / Quote #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Margin %</th>
                  <th className="py-3 px-4">Blended Risk</th>
                  <th className="py-3 px-4">Current Step</th>
                  <th className="py-3 px-4">Approval Chain</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No approval requests in queue. All quotations within limits!
                    </td>
                  </tr>
                ) : (
                  approvals.map((appr) => (
                    <tr key={appr.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{appr.quote_number}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{appr.customer_name}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">${appr.total_amount?.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600">{appr.total_margin_pct}%</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border ${
                          appr.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {appr.blended_risk} RISK
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">
                          Step {appr.current_step} of {appr.steps.length}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          {appr.steps.map((s) => (
                            <span
                              key={s.id}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                s.action === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                s.action === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                s.step_number === appr.current_step ? 'bg-sky-100 text-sky-800 font-bold' :
                                'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {s.required_role === 'sales_manager' ? '1. Manager' : '2. Finance'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {appr.status === 'pending' ? (
                          <button
                            onClick={() => setSelectedApproval(appr)}
                            className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition"
                          >
                            Review & Act
                          </button>
                        ) : (
                          <span className={`text-[11px] font-bold uppercase ${
                            appr.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {appr.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Immutable Audit Log Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <History className="h-4 w-4 text-sky-600" />
              <span>Immutable Governance Audit Trail</span>
            </h3>
            <span className="text-xs text-slate-400">Append-only log of all pricing & approval events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">User / Role</th>
                  <th className="py-2.5 px-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 uppercase text-[10px]">
                      {log.entity_type}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {log.user_email} ({log.user_role})
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 italic">
                      {log.reason || 'No description provided'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screen 6: Reviewer Action Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Review Deal #{selectedApproval.quote_number}
                </h3>
                <p className="text-xs text-slate-500">{selectedApproval.customer_name} · Step {selectedApproval.current_step}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-xs font-black ${
                selectedApproval.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedApproval.blended_risk} RISK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-500">Order Net Total:</span>
                <p className="font-black text-slate-900 text-sm mt-0.5">${selectedApproval.total_amount?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500">Blended Margin:</span>
                <p className="font-black text-emerald-600 text-sm mt-0.5">{selectedApproval.total_margin_pct}%</p>
              </div>
            </div>

            {/* Note and Reason fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Decision Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Strategic account acquisition concession"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Feedback Note to Rep</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal comments or conditions..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Decision Action Buttons */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => { setActionType('approved'); handleAct(); }}
                disabled={submitting}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve Deal</span>
              </button>

              <button
                onClick={() => { setActionType('returned'); handleAct(); }}
                disabled={submitting}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Return w/ Note</span>
              </button>

              <button
                onClick={() => { setActionType('rejected'); handleAct(); }}
                disabled={submitting}
                className="flex items-center justify-center space-x-1.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow transition"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setSelectedApproval(null)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Cancel and close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
