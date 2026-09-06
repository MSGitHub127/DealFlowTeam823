import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  FileSpreadsheet
} from 'lucide-react';

interface NavbarProps {
  onReload: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { currentRole, currentUser, logout, isAdmin, customers } = useAuth();

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

  return (
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

        {/* Primary Action Button: New Quote */}
        {canCreateQuote && (
          <div className="p-3">
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
          </div>
        )}

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
  );
};