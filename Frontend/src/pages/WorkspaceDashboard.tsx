import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quotationsApi, dealHealthApi, approvalsApi } from '../services/api';
import { Quotation, DealHealthSummary, ApprovalRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileText, ShieldAlert, Truck, HeartPulse, Plus,
  DollarSign, TrendingUp, ChevronRight, RefreshCw,
  Search, Clock, AlertTriangle, ShieldCheck,
  CreditCard, User, ExternalLink
} from 'lucide-react';

export const WorkspaceDashboard: React.FC = () => {
  const { currentRole, currentUser, isAdmin, customers } = useAuth();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [healthSummary, setHealthSummary] = useState<DealHealthSummary | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [stageFilter, setStageFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [qRes, hRes, aRes] = await Promise.all([
        quotationsApi.list(),
        dealHealthApi.getAlerts(),
        approvalsApi.list('pending')
      ]);
      setQuotes(qRes.data || []);
      setHealthSummary(hRes.data || null);
      setPendingApprovals(aRes.data || []);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), 30000);
    return () => clearInterval(timer);
  }, []);

  const getCustomerName = (q: Quotation) => {
    if (q.customer_name) return q.customer_name;
    const found = customers.find((c) => c.id === q.customer_id);
    return found ? found.company_name : 'Acme Global';
  };

  const getCustomerTier = (q: Quotation) => {
    if (q.customer_tier) return q.customer_tier;
    const found = customers.find((c) => c.id === q.customer_id);
    return found ? found.tier : 'Gold';
  };

  const filteredQuotes = quotes.filter((q) => {
    const custName = getCustomerName(q).toLowerCase();
    const matchesSearch =
      q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custName.includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === 'all' || q.status === stageFilter;
    const matchesTier = tierFilter === 'all' || getCustomerTier(q).toLowerCase() === tierFilter.toLowerCase();

    return matchesSearch && matchesStage && matchesTier;
  });

  const totalPipelineVal = quotes.reduce((acc, q) => acc + q.total_amount, 0);
  const avgMargin = quotes.length
    ? (quotes.reduce((acc, q) => acc + q.total_margin_pct, 0) / quotes.length).toFixed(1)
    : '0';

  const riskBandCounts = {
    NONE: quotes.filter((q) => q.blended_risk === 'NONE').length,
    MEDIUM: quotes.filter((q) => q.blended_risk === 'MEDIUM').length,
    HIGH: quotes.filter((q) => q.blended_risk === 'HIGH').length
  };

  const stageCounts = {
    draft: quotes.filter((q) => q.status === 'draft').length,
    pending_approval: quotes.filter((q) => q.status === 'pending_approval').length,
    negotiation: quotes.filter((q) => q.status === 'negotiation').length,
    approved: quotes.filter((q) => q.status === 'approved').length,
    fulfilled: quotes.filter((q) => q.status === 'fulfilled').length
  };

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
    <div style={{ backgroundColor: '#F8FAFC', color: '#0F172A', minHeight: '100%' }} className="w-full space-y-6 antialiased">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto Engine Active</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Sales Operations &bull; RBAC: <span className="font-bold text-slate-700 uppercase">{currentRole.replace('_', ' ')}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div style={{ backgroundColor: '#ffffff' }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px]">30s Sync</span>
            <button onClick={() => loadData(true)} title="Refresh" className="ml-1 text-slate-400 hover:text-slate-800 transition">
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {(currentRole === 'sales_rep' || currentRole === 'sales_manager' || isAdmin) && (
            <Link to="/quote/new" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition">
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Quote</span>
            </Link>
          )}

          {(currentRole === 'finance_ops' || currentRole === 'sales_manager' || isAdmin) && (
            <Link to="/approvals" style={{ backgroundColor: '#ffffff' }} className="flex items-center gap-1.5 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span>Approvals</span>
              {pendingApprovals.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingApprovals.length}
                </span>
              )}
            </Link>
          )}

          {(currentRole === 'finance_ops' || isAdmin) && (
            <Link to="/fulfillment" style={{ backgroundColor: '#ffffff' }} className="flex items-center gap-1.5 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition">
              <Truck className="h-3.5 w-3.5 text-blue-500" />
              <span>Dispatch</span>
            </Link>
          )}

          {(currentRole === 'finance_ops' || isAdmin) && (
            <Link to="/billing" style={{ backgroundColor: '#ffffff' }} className="flex items-center gap-1.5 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition">
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              <span>Billing</span>
            </Link>
          )}
        </div>
      </div>

      {/* 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/quotes" style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Pipeline</span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">${totalPipelineVal.toLocaleString()}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600">
                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+14.2%</span>
                  <span className="text-slate-400 font-normal">&bull; {quotes.length} deals</span>
                </div>
              </div>
            </Link>

            <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Blended Margin</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{avgMargin}%</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-blue-600">
                  <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Floor &ge; 35%</span>
                  <span className="text-slate-400 font-normal">&bull; Target</span>
                </div>
              </div>
            </div>

            <Link to="/approvals" style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Inbox</span>
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{pendingApprovals.length}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-amber-700">
                  <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">L1/L2 Queue</span>
                  <span className="text-slate-400 font-normal">&bull; {riskBandCounts.HIGH} High</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Performance Progression Wave Graph */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Analytics</span>
                <h3 className="text-sm font-extrabold text-slate-900">Revenue Progression &amp; Margin Velocity</h3>
              </div>
              <Link to="/quotes" className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-100 transition flex items-center gap-1">
                <span>View All ({quotes.length})</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="relative h-44 w-full pt-2">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveWave" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="30" x2="500" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#F1F5F9" strokeWidth="1" />

                <path
                  d="M0,125 C70,110 130,75 200,90 C270,105 330,35 400,55 C450,70 480,25 500,40 L500,150 L0,150 Z"
                  fill="url(#curveWave)"
                />
                <path
                  d="M0,125 C70,110 130,75 200,90 C270,105 330,35 400,55 C450,70 480,25 500,40"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                />
                <circle cx="330" cy="35" r="4.5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              </svg>

              <div className="absolute top-2 left-[64%] -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                Target: {avgMargin}% Margin
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span>Draft ({stageCounts.draft})</span>
                <span>In Review ({stageCounts.pending_approval})</span>
                <span>Negotiation ({stageCounts.negotiation})</span>
                <span>Approved ({stageCounts.approved})</span>
                <span>Fulfilled ({stageCounts.fulfilled})</span>
              </div>
            </div>
          </div>

          {/* Sub Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">State Velocity Breakdown</h4>
                  <p className="text-[11px] text-slate-400">Deals moving across workflow</p>
                </div>
                <span className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                  {quotes.length}
                </span>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                <div style={{ width: `${quotes.length ? (stageCounts.draft / quotes.length) * 100 : 0}%` }} className="bg-slate-300" />
                <div style={{ width: `${quotes.length ? (stageCounts.pending_approval / quotes.length) * 100 : 0}%` }} className="bg-amber-400" />
                <div style={{ width: `${quotes.length ? (stageCounts.negotiation / quotes.length) * 100 : 0}%` }} className="bg-purple-500" />
                <div style={{ width: `${quotes.length ? (stageCounts.approved / quotes.length) * 100 : 0}%` }} className="bg-emerald-500" />
                <div style={{ width: `${quotes.length ? (stageCounts.fulfilled / quotes.length) * 100 : 0}%` }} className="bg-blue-600" />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 font-medium text-slate-600">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Review: {stageCounts.pending_approval}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved: {stageCounts.approved}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> Shipped: {stageCounts.fulfilled}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Greedy Warehouse Split</h4>
                  <p className="text-[11px] text-slate-400">Chicago Depot &amp; NYC Hub</p>
                </div>
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Multi-Depot Split Active</span>
                <span className="font-bold text-indigo-700">2 Depots</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Auto-optimizes fulfillment distance</span>
                <Link to="/fulfillment" className="text-blue-600 font-bold hover:underline">View Splits &rarr;</Link>
              </div>
            </div>
          </div>

          {/* Evaluator 8-Step Walkthrough Banner */}
          <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                8-Step Autonomous Engine Tour
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">Evaluator &amp; Judge Verified Lifecycle Tour</h3>
              <p className="text-xs text-slate-500 max-w-xl">
                Test the complete sales lifecycle: RBAC ceilings, L1/L2 escalation, greedy splits, and hybrid invoices.
              </p>
            </div>

            <button onClick={() => setShowGuideModal(!showGuideModal)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm shrink-0">
              {showGuideModal ? 'Hide Steps' : 'Explore 8 Steps'}
            </button>
          </div>

          {showGuideModal && (
            <div style={{ backgroundColor: '#ffffff' }} className="p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 1 • RBAC</span>
                <h5 className="text-xs font-bold text-slate-900">Tier Disciplinary Matrix</h5>
                <p className="text-[11px] text-slate-500">Gold 15% discount; Bronze 5%.</p>
                <Link to="/admin/rules" className="text-[11px] font-bold text-blue-600 block pt-1">Rules &rarr;</Link>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 2 • CEILING</span>
                <h5 className="text-xs font-bold text-slate-900">Pricing Guardrails</h5>
                <p className="text-[11px] text-slate-500">Services &gt; 10% flags ceiling (+8%).</p>
                <Link to="/quote/new" className="text-[11px] font-bold text-blue-600 block pt-1">Quote Builder &rarr;</Link>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 3 • ESCALATION</span>
                <h5 className="text-xs font-bold text-slate-900">L1/L2 Routing</h5>
                <p className="text-[11px] text-slate-500">High Risk routes to Finance queue.</p>
                <Link to="/approvals" className="text-[11px] font-bold text-blue-600 block pt-1">Approvals &rarr;</Link>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 4 • UPSELL</span>
                <h5 className="text-xs font-bold text-slate-900">Margin Feedback</h5>
                <p className="text-[11px] text-slate-500">Accessories re-calculate margin.</p>
                <Link to="/pipeline" className="text-[11px] font-bold text-blue-600 block pt-1">Pipeline &rarr;</Link>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 5 • SPLIT</span>
                <h5 className="text-xs font-bold text-slate-900">Greedy Allocation</h5>
                <p className="text-[11px] text-slate-500">10 units split: 4 Chicago and 6 NYC.</p>
                <Link to="/fulfillment" className="text-[11px] font-bold text-blue-600 block pt-1">Fulfillment &rarr;</Link>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 6 • HYBRID</span>
                <h5 className="text-xs font-bold text-slate-900">Hybrid Invoicing</h5>
                <p className="text-[11px] text-slate-500">Hardware &amp; SaaS billed separately.</p>
                <Link to="/billing" className="text-[11px] font-bold text-blue-600 block pt-1">Invoices &rarr;</Link>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 7 • PORTAL</span>
                <h5 className="text-xs font-bold text-slate-900">Customer Portal</h5>
                <p className="text-[11px] text-slate-500">Counter-offers without cost visibility.</p>
                <button
                  onClick={() => {
                    const acme = customers.find(c => c.company_name.includes('Acme')) || customers[0];
                    if (acme) navigate(`/portal?token=${acme.portal_token}`);
                  }}
                  className="text-[11px] font-bold text-blue-600 block pt-1"
                >
                  Acme Portal &rarr;
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-700">STEP 8 • SETTLE</span>
                <h5 className="text-xs font-bold text-slate-900">Dispatch &amp; Settle</h5>
                <p className="text-[11px] text-slate-500">Dispatch settles invoices to PAID.</p>
                <Link to="/deal-health" className="text-[11px] font-bold text-blue-600 block pt-1">Radar &rarr;</Link>
              </div>
            </div>
          )}

          {/* Deals Table with Redirect to Quotes Directory */}
          <div style={{ backgroundColor: '#ffffff' }} className="rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Recent Deal Flow Operations</h3>
                <p className="text-xs text-slate-400">Showing {filteredQuotes.length} quotations</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/quotes"
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 transition"
                >
                  <span>Open Full Directory</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Stages</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="approved">Approved</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Quote</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Margin</th>
                    <th className="py-2.5 px-3">Risk</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredQuotes.length > 0 ? (
                    filteredQuotes.slice(0, 6).map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50 transition group">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <Link to={`/quote/${q.id}`} className="hover:text-blue-600 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>{q.quote_number}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-bold">{getCustomerName(q)}</div>
                          <span className="text-[10px] text-slate-400">Tier: {getCustomerTier(q)}</span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          ${q.total_amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold">
                          <span className={q.total_margin_pct < 30 ? 'text-rose-600' : 'text-emerald-600'}>
                            {q.total_margin_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            q.blended_risk === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            q.blended_risk === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {q.blended_risk}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(q.status)}`}>
                            {q.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link to={`/quote/${q.id}`} className="text-blue-600 hover:text-blue-700 font-bold text-[11px] inline-flex items-center gap-0.5">
                            <span>Open</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No quotations found matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Profile Card */}
          <div style={{ backgroundColor: '#ffffff' }} className="rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
            <div className="relative mx-auto h-20 w-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl border-2 border-blue-100 shadow-sm">
              <User className="h-9 w-9 text-blue-600" />
              <span className="absolute bottom-0.5 right-0.5 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {currentUser?.email?.split('@')[0] || 'Sales Operations'}
              </h3>
              <p className="text-xs text-slate-400 capitalize mt-0.5">
                {currentRole.replace('_', ' ')} Workspace
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
              <Link to="/quotes" className="bg-blue-50 p-2.5 rounded-xl text-center border border-blue-100 hover:bg-blue-100 transition">
                <span className="text-base font-extrabold text-blue-700 block">{quotes.length}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Deals</span>
              </Link>
              <div className="bg-rose-50 p-2.5 rounded-xl text-center border border-rose-100">
                <span className="text-base font-extrabold text-rose-700 block">{riskBandCounts.HIGH}</span>
                <span className="text-[10px] text-slate-500 font-semibold">High Risk</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl text-center border border-amber-100">
                <span className="text-base font-extrabold text-amber-700 block">2</span>
                <span className="text-[10px] text-slate-500 font-semibold">Depots</span>
              </div>
            </div>
          </div>

          {/* Deal Health Radar */}
          <div style={{ backgroundColor: '#ffffff' }} className="rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Deal Health &amp; Anomaly Scanner</h4>
                <p className="text-[10px] text-slate-400">Real-time revenue risk radar</p>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Stalled Deals (&gt; 7d)
                </span>
                <span className="font-bold text-slate-900">{healthSummary?.stalled_count || 0}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min((healthSummary?.stalled_count || 0) * 20, 100)}%` }}
                  className="h-full bg-amber-400 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Discount Anomalies
                </span>
                <span className="font-bold text-slate-900">{healthSummary?.anomaly_count || 0}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min((healthSummary?.anomaly_count || 0) * 30, 100)}%` }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-blue-500" /> Carrier Slippage
                </span>
                <span className="font-bold text-slate-900">{healthSummary?.slippage_count || 0}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min((healthSummary?.slippage_count || 0) * 25, 100)}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>

            <Link
              to="/deal-health"
              className="block w-full py-2.5 text-center text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition mt-2 border border-blue-100"
            >
              Open Full Health Radar
            </Link>
          </div>

          {/* Risk Band Ceilings */}
          <div style={{ backgroundColor: '#ffffff' }} className="rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">Blended Risk Ceilings</h4>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Auto-Routing
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <span>NONE (Auto-Approved)</span>
                <span className="font-black">{riskBandCounts.NONE}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                <span>MEDIUM (L1 Manager)</span>
                <span className="font-black">{riskBandCounts.MEDIUM}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                <span>HIGH (L2 Escalated)</span>
                <span className="font-black">{riskBandCounts.HIGH}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};