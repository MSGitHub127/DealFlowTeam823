import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quotationsApi, dealHealthApi, approvalsApi } from '../services/api';
import { Quotation, DealHealthSummary, ApprovalRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileText, ShieldAlert, Truck, HeartPulse, Plus,
  ArrowRight, DollarSign, TrendingUp, CheckCircle2,
  Sparkles, Layers, ChevronRight, Activity
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
  const avgMargin = quotes.length
    ? (quotes.reduce((acc, q) => acc + q.total_margin_pct, 0) / quotes.length).toFixed(1)
    : '0';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Minimal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="h-3.5 w-3.5" />
            <span>Autonomous Sales Operations Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Workspace</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Active deal orchestration across pricing discipline, warehouse inventory reality, and hybrid billing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/quote/new"
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Quotation</span>
          </Link>
          <Link
            to="/pipeline"
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all"
          >
            <span>Pipeline Board</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pipeline</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">${totalPipelineVal.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">{quotes.length} active deals in cycle</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Blended Margin</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{avgMargin}%</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">Healthy portfolio floor</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{pendingApprovals.length}</h3>
            <p className="text-[11px] text-amber-600 font-bold mt-1">
              {pendingApprovals.filter(a => a.blended_risk === 'HIGH').length} high-risk flagged
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">At-Risk Alerts</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{healthSummary?.total_active_alerts || 0}</h3>
            <p className="text-[11px] text-rose-600 font-bold mt-1">
              {healthSummary?.stalled_count || 0} stalled · {healthSummary?.anomaly_count || 0} anomalies
            </p>
          </div>
        </div>
      </div>

      {/* Official 8-Step Verification Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Quick Test Flow Navigation (Official 8-Step Walkthrough)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Click any stage to execute flow step</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Link
            to="/admin/rules"
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition group"
          >
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Step 1</span>
            <span className="font-bold text-white group-hover:text-sky-300 transition">Setup Backend Data</span>
            <p className="text-slate-400 text-[11px] mt-0.5">Tiers, depots, sub plans</p>
          </Link>

          <Link
            to="/quote/new"
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition group"
          >
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Steps 2-4</span>
            <span className="font-bold text-white group-hover:text-sky-300 transition">Quote, Limit & Upsell</span>
            <p className="text-slate-400 text-[11px] mt-0.5">Live limit check & margin</p>
          </Link>

          <Link
            to="/fulfillment"
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition group"
          >
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Steps 5-6</span>
            <span className="font-bold text-white group-hover:text-sky-300 transition">Split & Hybrid Bill</span>
            <p className="text-slate-400 text-[11px] mt-0.5">Multi-depot stock pull</p>
          </Link>

          <Link
            to={customers[0] ? `/portal?token=${customers[0].portal_token}` : '/portal'}
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition group"
          >
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Steps 7-8</span>
            <span className="font-bold text-white group-hover:text-sky-300 transition">Portal Counter & Pay</span>
            <p className="text-slate-400 text-[11px] mt-0.5">Re-approval trigger</p>
          </Link>
        </div>
      </div>

      {/* Main Content Grid: Recent Deals & Active Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>Active Quotations & Deals</span>
            </h2>
            <Link to="/pipeline" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1">
              <span>View Pipeline</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
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
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-extrabold text-slate-900">{q.quote_number}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{q.customer_name}</td>
                    <td className="py-3 px-3 font-black text-slate-900">${q.total_amount.toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{q.total_margin_pct}%</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        q.blended_risk === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        q.blended_risk === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          q.blended_risk === 'HIGH' ? 'bg-rose-500 animate-pulse' :
                          q.blended_risk === 'MEDIUM' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}></span>
                        {q.blended_risk}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-slate-600 font-medium text-[11px]">{q.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/quote/${q.id}`)}
                        className="text-xs font-bold text-sky-600 hover:text-sky-800 transition"
                      >
                        Open Canvas →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Approvals & Alerts */}
        <div className="space-y-6">
          {/* Urgent Approvals Queue */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Approval Queue</span>
              </h3>
              <Link to="/approvals" className="text-xs font-bold text-sky-600 hover:text-sky-700">
                View All ({pendingApprovals.length})
              </Link>
            </div>

            {pendingApprovals.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">All deals currently approved.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingApprovals.slice(0, 3).map((appr) => (
                  <div key={appr.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-800">{appr.quote_number}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        appr.blended_risk === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {appr.blended_risk}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{appr.customer_name} · Step {appr.current_step}</p>
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

          {/* Deal Health Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <HeartPulse className="h-4 w-4 text-rose-600" />
                <span>At-Risk Alerts</span>
              </h3>
              <Link to="/deal-health" className="text-xs font-bold text-sky-600 hover:text-sky-700">
                Manage
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              {healthSummary?.alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-rose-100 bg-rose-50/40">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-900 uppercase text-[10px] tracking-wider">{a.alert_type.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{a.quote_number}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1 leading-snug">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
