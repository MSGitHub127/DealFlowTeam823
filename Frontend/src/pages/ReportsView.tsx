import React, { useState, useEffect } from 'react';
import { reportsApi, authApi } from '../services/api';
import { User } from '../types';
import {
  BarChart3, Download, FileSpreadsheet, FileText,
  Filter, Calendar, RefreshCw
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [period, setPeriod] = useState<string>('all');
  const [repId, setRepId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUsers = async () => {
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (period !== 'all') params.period = period;
      if (repId) params.rep_id = repId;
      if (status) params.status = status;
      if (category) params.category = category;

      const res = await reportsApi.getSummary(params);
      setReportData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [period, repId, status, category]);

  const getExportParams = () => {
    const params: any = {};
    if (period !== 'all') params.period = period;
    if (repId) params.rep_id = repId;
    if (status) params.status = status;
    if (category) params.category = category;
    return params;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-sky-600" />
            <span>Sales Analytics & Performance Reporting</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filterable pipeline metrics, margin analysis, and instant Excel / PDF document generation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={reportsApi.exportExcelUrl(getExportParams())}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel (.XLSX)</span>
          </a>

          <a
            href={reportsApi.exportPdfUrl(getExportParams())}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
          >
            <FileText className="h-4 w-4" />
            <span>Export PDF</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">Time Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">Sales Rep / Team</label>
          <select
            value={repId}
            onChange={(e) => setRepId(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Representatives</option>
            {users.filter(u => u.role === 'sales_rep').map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">Approval / Deal Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="negotiation">Under Negotiation</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">Product Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">All Categories</option>
            <option value="Hardware">Hardware</option>
            <option value="Services">Services</option>
            <option value="Subscriptions">Subscriptions</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Revenue Pipeline</span>
            <p className="text-xl font-black text-slate-900 mt-1">
              ${reportData.summary.total_pipeline_value.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Average Blended Margin</span>
            <p className="text-xl font-black text-emerald-600 mt-1">
              {reportData.summary.average_margin_pct}%
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Approved / Confirmed Deals</span>
            <p className="text-xl font-black text-sky-600 mt-1">
              {reportData.summary.approved_deals} deals
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Awaiting Manager Signoff</span>
            <p className="text-xl font-black text-amber-600 mt-1">
              {reportData.summary.pending_approval} deals
            </p>
          </div>
        </div>
      )}

      {/* Detailed Deals Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Filtered Performance Records</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Quote #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Sales Rep</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Margin %</th>
                <th className="py-2.5 px-3">Risk Band</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!reportData || reportData.deals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching records found for active filters.
                  </td>
                </tr>
              ) : (
                reportData.deals.map((deal: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{deal.quote_number}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{deal.customer}</td>
                    <td className="py-3 px-3 text-slate-600">{deal.rep}</td>
                    <td className="py-3 px-3 font-black text-slate-900">${deal.total_amount.toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{deal.margin_pct}%</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        deal.risk === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                        deal.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {deal.risk}
                      </span>
                    </td>
                    <td className="py-3 px-3 uppercase font-semibold text-[10px] text-slate-600">
                      {deal.status.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{deal.created_at}</td>
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
