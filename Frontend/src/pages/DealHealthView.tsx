import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dealHealthApi } from '../services/api';
import { DealHealthSummary, DealHealthAlert } from '../types';
import {
  HeartPulse, AlertTriangle, Clock, Zap, TrendingUp,
  BellRing, ArrowUpRight, CheckCircle2, ShieldAlert
} from 'lucide-react';

export const DealHealthView: React.FC = () => {
  const [summary, setSummary] = useState<DealHealthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await dealHealthApi.getAlerts();
      setSummary(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAct = async (alertId: string, action: 'nudge' | 'escalate' | 'dismiss') => {
    setActionLoading(true);
    try {
      const res = await dealHealthApi.actOnAlert(alertId, { action });
      alert(res.data.message);
      await loadAlerts();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to act on alert');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <HeartPulse className="h-6 w-6 text-rose-600" />
            <span>Deal Health & Discount Anomaly Monitoring</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time heuristic & statistical risk detectors for stalled negotiations, margin bleed, and logistics slippage.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stalled Deals</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{summary?.stalled_count || 0}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Inactive for &gt; 7 days without progression</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Discount Anomalies</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{summary?.anomaly_count || 0}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Discounts exceeding 1.4x rep's historical avg</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Logistics Slippage</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Zap className="h-4 w-4" /></span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">{summary?.slippage_count || 0}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Fulfillment ETA passed without carrier dispatch</p>
          </div>
        </div>
      </div>

      {/* Active Alerts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm">Active Deal Health Alerts</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Deal / Quote #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Risk Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Diagnosis Message</th>
                <th className="py-3 px-4 text-right">Intervention Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!summary || summary.alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active deal health alerts! All pipeline deals operating within nominal thresholds.
                  </td>
                </tr>
              ) : (
                summary.alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <button
                        onClick={() => navigate(`/quote/${alert.quotation_id}`)}
                        className="text-sky-600 hover:text-sky-800 flex items-center space-x-1"
                      >
                        <span>{alert.quote_number}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{alert.customer_name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold">
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        alert.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">{alert.message}</td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleAct(alert.id, 'nudge')}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-bold text-[11px] border border-sky-200 transition"
                      >
                        Nudge Customer
                      </button>
                      <button
                        onClick={() => handleAct(alert.id, 'escalate')}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-bold text-[11px] border border-amber-200 transition"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() => handleAct(alert.id, 'dismiss')}
                        className="px-2.5 py-1 text-slate-400 hover:text-slate-600 font-medium text-[11px] transition"
                      >
                        Dismiss
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
