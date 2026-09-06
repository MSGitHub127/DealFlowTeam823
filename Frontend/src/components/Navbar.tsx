import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Kanban,
  FileCheck2,
  Truck,
  Receipt,
  HeartPulse,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Plus,
  FileSpreadsheet,
  UserPlus,
  X,
  User,
  Building,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface NavbarProps {
  onReload?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { currentRole, logout, isAdmin, customers, signup } = useAuth();

  // Admin Create User Modal State
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sales_rep');
  const [tier, setTier] = useState('enterprise');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['sales_rep', 'sales_manager', 'finance_ops', 'admin'] },
    { label: 'Pipeline Board', path: '/pipeline', icon: Kanban, roles: ['sales_rep', 'sales_manager', 'admin'] },
    { label: 'Quotations', path: '/quotes', icon: FileSpreadsheet, roles: ['sales_rep', 'sales_manager', 'admin'] },
    { label: 'Approvals', path: '/approvals', icon: FileCheck2, roles: ['sales_manager', 'finance_ops', 'admin'] },
    { label: 'Fulfillment', path: '/fulfillment', icon: Truck, roles: ['finance_ops', 'admin'] },
    { label: 'Hybrid Billing', path: '/billing', icon: Receipt, roles: ['finance_ops', 'admin'] },
    { label: 'Deal Health', path: '/deal-health', icon: HeartPulse, roles: ['sales_manager', 'admin'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['sales_manager', 'finance_ops', 'admin'] },
    { label: 'Rules & RBAC', path: '/admin/rules', icon: Sliders, roles: ['admin'] },
  ];

  const allowedItems = navItems.filter(item => isAdmin || item.roles.includes(currentRole));
  const canCreateQuote = isAdmin || currentRole === 'sales_rep' || currentRole === 'sales_manager';

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!fullName || !email || !password) {
      setStatusMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        name: fullName,
        email,
        company: company || 'Internal Enterprise',
        password,
        role,
        tier
      });
      setStatusMsg({ type: 'success', text: `Internal user created successfully as ${role}!` });
      setTimeout(() => {
        setFullName('');
        setCompany('');
        setEmail('');
        setPassword('');
        setStatusMsg(null);
        setShowAdminUserModal(false);
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to create internal user.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                  Engine
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

          {/* Primary Action Buttons */}
          <div className="p-3 space-y-2">
            {canCreateQuote && (
              <Link
                to="/quote/new"
                className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all py-2.5 ${
                  isCollapsed ? 'px-0' : 'px-4'
                }`}
                title="Create New Quote"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                {!isCollapsed && <span>New Quotation</span>}
              </Link>
            )}

            {/* Admin Internal User Creation Button */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminUserModal(true)}
                className={`w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all py-2.5 ${
                  isCollapsed ? 'px-0' : 'px-4'
                }`}
                title="Create Internal User"
              >
                <UserPlus className="h-4 w-4 stroke-[2]" />
                {!isCollapsed && <span>Add Internal User</span>}
              </button>
            )}
          </div>

          {/* Links Navigation */}
          <nav className="p-3 space-y-1">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    } ${isCollapsed ? 'justify-center' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile & Portal */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {!isCollapsed && (
            <>
              <a
                href={`/portal?token=${customers[0]?.portal_token || 'test'}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 transition"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                  <span>Customer Portal</span>
                </div>
              </a>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned Scope
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 capitalize">
                    {currentRole.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </>
          )}

          <button
            onClick={logout}
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

      {/* ================= ADMIN CREATE USER MODAL ================= */}
      {showAdminUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision Internal User Account</h3>
                  <p className="text-xs text-slate-500">Create staff credentials and assign RBAC roles.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {statusMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAdminCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Taylor"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>Company</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Internal Staff"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>Work Email *</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@dealflow.com"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Password *</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                    <span>Assigned RBAC Role</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="sales_rep">Sales Rep</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="finance_ops">Finance VP / Ops</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

           
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdminUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};