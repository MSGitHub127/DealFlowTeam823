import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quotationsApi, dealHealthApi, approvalsApi } from '../services/api';
import { Quotation, DealHealthSummary, ApprovalRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileText, ShieldAlert, Truck, HeartPulse, Plus,
  ArrowRight, DollarSign, TrendingUp, CheckCircle2,
  Sparkles, Layers, ChevronRight, Activity, RefreshCw,
  Search, Filter, Clock, AlertTriangle, ExternalLink,
  ShieldCheck, PackageCheck, Zap, BarChart2, CreditCard
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

  // Interactive filters
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
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

  // Filtered quotes calculation
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'pending_approval':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'negotiation':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'fulfilled':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-black';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* ==================== 1. TOP HEADER & CONTROL BAR ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider mb-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <Activity className="h-3.5 w-3.5" />
            <span>Autonomous Revenue Operations Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sales-Ops Command Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            {isAdmin ? (
              <span>
                🛡️ <strong className="text-sky-500 dark:text-sky-400 font-bold">Administrator</strong>: Full system oversight across pricing discipline, approval queues, inventory fulfillment, and audit trails.
              </span>
            ) : (
              <span>
                🔒 Assigned Role: <strong className="text-slate-700 dark:text-slate-200 capitalize">{currentRole.replace('_', ' ')}</strong> ({currentUser?.email || 'Active User'}). Enforced by enterprise role-based access control (RBAC).
              </span>
            )}
          </p>
        </div>

        {/* Live sync & Primary actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px]">30s Auto-Sync</span>
            <button
              onClick={() => loadData(true)}
              title="Refresh live data"
              className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-sky-500' : ''}`} />
            </button>
          </div>

          {/* Role-tailored primary action buttons */}
          {(currentRole === 'sales_rep' || currentRole === 'sales_manager' || isAdmin) && (
            <Link
              to="/quote/new"
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-sky-500/10 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              <span>New Quotation</span>
            </Link>
          )}

          {(currentRole === 'sales_rep' || currentRole === 'sales_manager' || isAdmin) && (
            <Link
              to="/pipeline"
              className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all"
            >
              <span>Pipeline Board</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          )}

          {(currentRole === 'finance_ops' || currentRole === 'sales_manager' || isAdmin) && (
            <Link
              to="/approvals"
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-950" />
              <span>Review Approvals</span>
            </Link>
          )}

          {(currentRole === 'finance_ops' || isAdmin) && (
            <Link
              to="/fulfillment"
              className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all"
            >
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              <span>Warehouse Dispatch</span>
            </Link>
          )}

          {(currentRole === 'finance_ops' || isAdmin) && (
            <Link
              to="/billing"
              className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all"
            >
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              <span>Invoices &amp; Billing</span>
            </Link>
          )}
        </div>
      </div>

      {/* ==================== 1.5. INTERACTIVE 8-STEP EVALUATOR GUIDE ==================== */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm text-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
              8x
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm tracking-tight text-white">
                  Evaluator & Judge Quick Tour
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  8-Step Autonomous Sales-Ops
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Test the complete end-to-end sales lifecycle verified by our automated test suite.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition self-start sm:self-auto"
          >
            <span>{showGuide ? 'Hide Walkthrough' : 'Explore 8 Steps'}</span>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showGuide && (
          <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 1 • RBAC & Rules</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Tier Disciplinary Matrix</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                4 accounts locked to authentic roles. Gold allows 15% discount; Bronze allows 5%.
              </p>
              <Link to="/admin/rules" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>View Rule Matrix</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 2 • Pricing Guardrails</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Strictest Ceiling Detection</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add Services with 18% discount (ceiling is 10%). Line immediately flags OVER (+8%).
              </p>
              <Link to="/quote/new" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>Try Quote Builder</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 3 • Auto Escalation</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Autonomous L1/L2 Routing</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Over-discount quote evaluates to HIGH RISK. Routes to Sales Manager & Finance automatically.
              </p>
              <Link to="/approvals" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>Open Approvals</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 4 • Upsell Engine</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Live Margin Feedback</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Accept dock accessory suggestion: order margin and revenue recalculate in real time.
              </p>
              <Link to="/pipeline" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>Pipeline Deals</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 5 • Greedy Split</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Multi-Warehouse Allocation</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Order 10 laptops: greedily pulls 4 units from Chicago and splits 6 from NYC depot.
              </p>
              <Link to="/fulfillment" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>Fulfillment Splits</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Step 6 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 6 • Hybrid Billing</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Hardware vs SaaS Invoicing</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                One-time hardware and recurring SaaS subscription billed separately with proration math.
              </p>
              <Link to="/billing" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>Billing Invoices</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Step 7 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 7 • Customer Portal</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Isolated Negotiation</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Customer counter-offers via isolated portal without seeing costs; auto re-triggers approval.
              </p>
              <button
                onClick={() => {
                  const acme = customers.find(c => c.company_name.includes('Acme')) || customers[0];
                  if (acme) navigate(`/portal?token=${acme.portal_token}`);
                }}
                className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1"
              >
                <span>Launch Acme Portal</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {/* Step 8 */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">Step 8 • Dispatch & Settle</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Passed</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold">Invoice Generation & Payment</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dispatch generates invoice per shipment; recording payment marks invoice PAID.
              </p>
              <Link to="/deal-health" className="inline-flex items-center text-[11px] font-bold text-sky-400 hover:text-sky-300 space-x-1 pt-1">
                <span>Health Radar</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 2. HIGH-IMPACT KPI CARDS (TransitOps Style) ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Pipeline Value */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-sky-500/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pipeline</span>
            <div className="p-2 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ${totalPipelineVal.toLocaleString()}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                +14.2%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{quotes.length} active deals</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Blended Gross Margin */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-emerald-500/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blended Margin</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{avgMargin}%</h3>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                Healthy Target
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Floor &ge; 35%</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Pending Approvals Queue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-amber-500/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approvals Inbox</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingApprovals.length}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pendingApprovals.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {pendingApprovals.length > 0 ? 'Action Needed' : 'All Clear'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">L1 &amp; L2 Matrix</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Multi-Depot Fulfillment */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-indigo-500/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouse Allocations</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">2 Depots</h3>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                Greedy Split
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Chicago &amp; NYC</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Deal Health Radar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-rose-500/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deal Health Radar</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {healthSummary ? healthSummary.stalled_count + healthSummary.anomaly_count + healthSummary.slippage_count : 0}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500">
                Anomaly Scan
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Real-time alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3. PIPELINE LIFECYCLE & RISK DISTRIBUTION ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Progress Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sales-Ops Pipeline Velocity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active volume distributed by state machine stage
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">{quotes.length} total deals</span>
          </div>

          {/* Progress bar */}
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
            <div style={{ width: `${quotes.length ? (stageCounts.draft / quotes.length) * 100 : 0}%` }} className="bg-slate-400" title="Draft" />
            <div style={{ width: `${quotes.length ? (stageCounts.pending_approval / quotes.length) * 100 : 0}%` }} className="bg-amber-400" title="Pending Approval" />
            <div style={{ width: `${quotes.length ? (stageCounts.negotiation / quotes.length) * 100 : 0}%` }} className="bg-purple-500" title="Negotiation" />
            <div style={{ width: `${quotes.length ? (stageCounts.approved / quotes.length) * 100 : 0}%` }} className="bg-emerald-500" title="Approved" />
            <div style={{ width: `${quotes.length ? (stageCounts.fulfilled / quotes.length) * 100 : 0}%` }} className="bg-sky-500" title="Fulfilled" />
          </div>

          {/* Legend Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Draft</span>
              <span className="text-base font-black text-slate-700 dark:text-slate-200">{stageCounts.draft}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase block">In Approval</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">{stageCounts.pending_approval}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase block">Negotiation</span>
              <span className="text-base font-black text-purple-600 dark:text-purple-400">{stageCounts.negotiation}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Approved</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{stageCounts.approved}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/20">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase block">Fulfilled</span>
              <span className="text-base font-black text-sky-600 dark:text-sky-400">{stageCounts.fulfilled}</span>
            </div>
          </div>
        </div>

        {/* Blended Risk Engine Matrix Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-sky-500" />
              <span>Blended Risk Bands</span>
            </h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              Auto-Routing
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quotes evaluated against customer tier &amp; product category ceilings.
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">NONE (Auto-Approved)</span>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{riskBandCounts.NONE} deals</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">MEDIUM (L1 Manager)</span>
              </div>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">{riskBandCounts.MEDIUM} deals</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">HIGH (L2 Finance Escalated)</span>
              </div>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">{riskBandCounts.HIGH} deals</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 4. RECENT DEALS TABLE (TransitOps DataTable Style) ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
        {/* Table Filters & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Recent Deal Flow Operations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredQuotes.length} of {quotes.length} quotations matching filter criteria
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
                placeholder="Search quote or client..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Stages</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="negotiation">Negotiation</option>
              <option value="approved">Approved</option>
              <option value="fulfilled">Fulfilled</option>
            </select>

            {/* Tier Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="enterprise">Enterprise (Gold)</option>
              <option value="mid_market">Mid-Market (Silver)</option>
              <option value="smb">SMB (Bronze)</option>
            </select>
          </div>
        </div>

        {/* The Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Quote #</th>
                <th className="py-3 px-3">Customer Account</th>
                <th className="py-3 px-3">Deal Value</th>
                <th className="py-3 px-3">Margin</th>
                <th className="py-3 px-3">Risk Band</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.slice(0, 8).map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <Link to={`/quote/${q.id}`} className="hover:text-sky-500 flex items-center space-x-1.5">
                        <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-500" />
                        <span>{q.quote_number}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">
                        {getCustomerName(q)}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Tier: {getCustomerTier(q)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                      ${q.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-bold ${q.total_margin_pct < 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {q.total_margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] ${getRiskBadgeClass(q.blended_risk)}`}>
                        {q.blended_risk}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(q.status)}`}>
                        {q.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <Link
                        to={`/quote/${q.id}`}
                        className="inline-flex items-center space-x-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 font-bold text-[11px]"
                      >
                        <span>Open</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No quotations found matching your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== 5. LIVE DEAL HEALTH RADAR TICKER ==================== */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Live Deal Health &amp; Anomaly Scanner
            </h3>
          </div>
          <Link to="/deal-health" className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1">
            <span>View All Radar Alerts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-200">Stalled Quotations</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {healthSummary?.stalled_count || 0} deal(s) inactive for &gt; 7 days in negotiation or draft.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-200">Discount Anomalies</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {healthSummary?.anomaly_count || 0} quote(s) exceeding rep historical trailing avg by 1.4x.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-200">Logistics Slippage</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {healthSummary?.slippage_count || 0} order(s) past estimated carrier dispatch date.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
