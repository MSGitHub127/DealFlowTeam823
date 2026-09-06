import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quotationsApi } from '../services/api';
import { Quotation } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Plus, LayoutGrid, List, Search, Filter,
  ArrowUpDown, ChevronRight, DollarSign, TrendingUp,
  Clock, CheckCircle2, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';

export const QuotesDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, isAdmin, customers } = useAuth();

  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & View state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'margin'>('date');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  const loadQuotes = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await quotationsApi.list();
      setQuotes(res.data || []);
    } catch (err) {
      console.error('Failed to load quotes directory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  // Top Metric Cards Calculations
  const totalCount = quotes.length;
  const pendingCount = quotes.filter(q => q.status === 'pending_approval').length;
  const totalValue = quotes.reduce((acc, q) => acc + (q.total_amount || 0), 0);
  const avgMargin = totalCount > 0
    ? (quotes.reduce((acc, q) => acc + (q.total_margin_pct || 0), 0) / totalCount).toFixed(1)
    : '0';

  // Filter & Sort Logic
  const filteredQuotes = quotes
    .filter((q) => {
      const qNum = (q.quote_number || '').toLowerCase();
      const cName = (q.customer_name || '').toLowerCase();
      const matchesSearch = qNum.includes(searchQuery.toLowerCase()) || cName.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'amount') return (b.total_amount || 0) - (a.total_amount || 0);
      if (sortBy === 'margin') return (b.total_margin_pct || 0) - (a.total_margin_pct || 0);
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending_approval':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'negotiation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'fulfilled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', color: '#0F172A' }} className="w-full space-y-6 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotations Directory</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              All Deals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of all draft, escalated, and finalized deal configurations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadQuotes(true)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {(isAdmin || currentRole === 'sales_rep' || currentRole === 'sales_manager') && (
            <Link
              to="/quote/new"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Create Quotation</span>
            </Link>
          )}
        </div>
      </div>

      {/* Top 4 Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Quotations</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{totalCount}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Active across lifecycle</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Approval</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{pendingCount}</h3>
            <span className="text-xs text-amber-700 font-semibold mt-1 block">L1 &amp; L2 Review Required</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pipeline Value</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">${totalValue.toLocaleString()}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Cumulative gross contract value</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Average Deal Margin</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{avgMargin}%</h3>
            <span className="text-xs text-blue-600 font-semibold mt-1 block">Target floor &ge; 35%</span>
          </div>
        </div>
      </div>

      {/* Main Quotations Card (Search, Filters, Sort & List/Grid View) */}
      <div style={{ backgroundColor: '#ffffff' }} className="rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Quotation Records
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredQuotes.length} of {quotes.length} total configurations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quote # or customer..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="negotiation">Negotiation</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Fulfilled</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="date">Sort: Latest Created</option>
              <option value="amount">Sort: Highest Deal Value</option>
              <option value="margin">Sort: Highest Margin %</option>
            </select>

            {/* List / Grid Switcher */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Toggle Rendering */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Quote #</th>
                  <th className="py-3 px-3">Customer Account</th>
                  <th className="py-3 px-3">Deal Value</th>
                  <th className="py-3 px-3">Margin</th>
                  <th className="py-3 px-3">Risk Band</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredQuotes.length > 0 ? (
                  filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition group">
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        <Link to={`/quote/${q.id}`} className="text-blue-600 hover:underline flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>{q.quote_number}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{q.customer_name || 'Acme Global'}</div>
                        <span className="text-[10px] text-slate-400 uppercase">Tier: {q.customer_tier || 'Gold'}</span>
                      </td>
                      <td className="py-3.5 px-3 font-black text-slate-900">
                        ${q.total_amount?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`font-bold ${q.total_margin_pct < 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {q.total_margin_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.blended_risk === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          q.blended_risk === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {q.blended_risk}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(q.status)}`}>
                          {q.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          to={`/quote/${q.id}`}
                          className="text-blue-600 hover:text-blue-700 font-bold text-xs inline-flex items-center gap-0.5"
                        >
                          <span>Open</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No quotations match filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuotes.length > 0 ? (
              filteredQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-600 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span>{q.quote_number}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      q.blended_risk === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      q.blended_risk === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {q.blended_risk}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{q.customer_name || 'Acme Global'}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Tier: {q.customer_tier || 'Gold'} &bull; {q.items?.length || 0} Products Configured</p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-normal">Deal Total</span>
                      <span className="text-base font-black text-slate-900">${q.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-normal">Margin</span>
                      <span className={`font-black ${q.total_margin_pct < 30 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {q.total_margin_pct?.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(q.status)}`}>
                      {q.status?.replace('_', ' ')}
                    </span>
                    <Link
                      to={`/quote/${q.id}`}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      <span>Configure</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-8 text-center text-slate-400 text-xs">
                No quotations found matching your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};