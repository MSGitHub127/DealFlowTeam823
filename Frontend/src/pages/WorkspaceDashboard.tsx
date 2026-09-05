import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quotationsApi, dealHealthApi, approvalsApi } from '../services/api';
import { Quotation, DealHealthSummary, ApprovalRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileText, ShieldAlert, Truck, HeartPulse, Plus,
  ArrowRight, DollarSign, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Sparkles
} from 'lucide-react';

export const WorkspaceDashboard: React.FC = () => {
  const { currentRole, customers } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [healthSummary, setHealthSummary] = useState<DealHealthSummary | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [qRes, hRes, aRes] = await Promise.all([
        quotationsApi.list(),
        dealHealthApi.getAlerts(),
        approvalsApi.list('pending')
      ]);
      setQuotes(qRes.data);
      setHealthSummary(hRes.data);
      setPendingApprovals(aRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPipelineVal = quotes.reduce((acc, q) => acc + q.total_amount, 0);
  const avgMargin = quotes.length ? (quotes.reduce((acc, q) => acc + q.total_margin_pct, 0) / quotes.length).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-sky-900/50">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Self-Governing Deal Execution System</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Sales Operations Command Center</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Enforcing pricing discipline, real-time multi-warehouse fulfillment, blended-risk governance, and portal negotiation.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/quote/new"
            className="flex items-center space-x-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-sky-500/30 transition transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Quote</span>
          </Link>
          <Link
            to="/pipeline"
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition"
          >
            <span>View Pipeline</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pipeline Value</span>
            <span className="p-2 bg-sky-50 text-sky-600 rounded-lg"><DollarSign className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">${totalPipelineVal.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">{quotes.length} active deals in cycle</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Margin</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{avgMargin}%</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Blended across all products</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Approvals</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ShieldAlert className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{pendingApprovals.length}</h3>
            <p className="text-xs text-amber-600 font-semibold mt-1">
              {pendingApprovals.filter(a => a.blended_risk === 'HIGH').length} High-Risk flagged
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Deal Health Alerts</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><HeartPulse className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{healthSummary?.total_active_alerts || 0}</h3>
            <p className="text-xs text-rose-600 font-semibold mt-1">
              {healthSummary?.stalled_count || 0} stalled, {healthSummary?.anomaly_count || 0} anomalies
            </p>
          </div>
        </div>
      </div>

      {/* 8-Step Quick Test Flow Helper Card */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-sky-900 font-bold text-sm">
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
            <span>Quick Test Flow Navigation (Official 8-Step Walkthrough)</span>
          </div>
          <span className="text-xs text-sky-700 bg-sky-100 px-2 py-0.5 rounded font-medium">Evaluation Guide</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link to="/admin/rules" className="bg-white p-2.5 rounded-lg border border-sky-200 hover:border-sky-400 hover:shadow-sm transition">
            <span className="font-bold text-slate-800">1. Setup Config</span>
            <p className="text-slate-500 text-[11px] mt-0.5">Tiers, Warehouses, Plans</p>
          </Link>
          <Link to="/quote/new" className="bg-white p-2.5 rounded-lg border border-sky-200 hover:border-sky-400 hover:shadow-sm transition">
            <span className="font-bold text-slate-800">2-4. Quote & Upsell</span>
            <p className="text-slate-500 text-[11px] mt-0.5">Bad discount badge + upsell</p>
          </Link>
          <Link to="/approvals" className="bg-white p-2.5 rounded-lg border border-sky-200 hover:border-sky-400 hover:shadow-sm transition">
            <span className="font-bold text-slate-800">5. Multi-Split Appr.</span>
            <p className="text-slate-500 text-[11px] mt-0.5">Greedy warehouse split</p>
          </Link>
          <Link
            to={customers[0] ? `/portal?token=${customers[0].portal_token}` : '/portal'}
            className="bg-white p-2.5 rounded-lg border border-sky-200 hover:border-sky-400 hover:shadow-sm transition"
          >
            <span className="font-bold text-slate-800">7-8. Portal Negotiate</span>
            <p className="text-slate-500 text-[11px] mt-0.5">Counter-discount & pay</p>
          </Link>
        </div>
      </div>

      {/* Main Grid: Recent Quotes & Urgent Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>Active Quotations & Deals</span>
            </h2>
            <Link to="/pipeline" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View Kanban →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Quote #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Margin</th>
                  <th className="py-2.5 px-3">Risk Band</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.slice(0, 6).map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-800">{q.quote_number}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{q.customer_name}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">${q.total_amount.toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600">{q.total_margin_pct}%</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        q.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                        q.blended_risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {q.blended_risk}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-slate-600 font-medium">{q.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/quote/${q.id}`)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                      >
                        Edit / View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals & Deal Health Alerts */}
        <div className="space-y-6">
          {/* Urgent Approvals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Approval Queue</span>
              </h3>
              <Link to="/approvals" className="text-xs font-semibold text-sky-600">All ({pendingApprovals.length})</Link>
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No pending discount approvals.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingApprovals.slice(0, 3).map((appr) => (
                  <div key={appr.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{appr.quote_number}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        appr.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {appr.blended_risk} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{appr.customer_name} — Step {appr.current_step}</p>
                    <div className="mt-2 text-right">
                      <Link
                        to="/approvals"
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800"
                      >
                        Review Deal →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deal Health Alerts Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <HeartPulse className="h-4 w-4 text-rose-600" />
                <span>At-Risk Alerts</span>
              </h3>
              <Link to="/deal-health" className="text-xs font-semibold text-sky-600">Manage →</Link>
            </div>
            <div className="space-y-2 text-xs">
              {healthSummary?.alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="p-2.5 rounded-lg border border-rose-100 bg-rose-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 uppercase text-[10px]">{a.alert_type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400">{a.quote_number}</span>
                  </div>
                  <p className="text-slate-700 text-[11px] mt-1 leading-relaxed">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
