import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDealFlowSocket } from '../hooks/useDealFlowSocket';
import { UserRole } from '../types';
import {
  LayoutDashboard, Kanban, ShieldCheck, Truck, CreditCard,
  HeartPulse, BarChart3, Settings, ExternalLink, RefreshCw,
  Radio, Sparkles, ChevronDown
} from 'lucide-react';

export const Navbar: React.FC<{ onReload?: () => void }> = ({ onReload }) => {
  const { currentUser, currentRole, switchRole, customers } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [liveConnected, setLiveConnected] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hook into internal WebSocket for live deal-flow notifications
  useDealFlowSocket((msg) => {
    setLiveConnected(true);
    if (msg.message || msg.type) {
      setToastMessage(msg.message || `Event: ${msg.type}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  });

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pipeline', path: '/pipeline', icon: Kanban },
    { name: 'Approvals', path: '/approvals', icon: ShieldCheck, roles: ['sales_manager', 'finance_ops', 'admin'] },
    { name: 'Fulfillment', path: '/fulfillment', icon: Truck },
    { name: 'Hybrid Billing', path: '/billing', icon: CreditCard },
    { name: 'Deal Health', path: '/deal-health', icon: HeartPulse },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Admin Config', path: '/admin/rules', icon: Settings, roles: ['sales_manager', 'admin', 'finance_ops'] },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    if (role === 'customer') {
      const acme = customers.find(c => c.company_name.includes('Acme')) || customers[0];
      if (acme) {
        navigate(`/portal?token=${acme.portal_token}`);
      } else {
        navigate('/portal');
      }
    } else {
      switchRole(role);
    }
  };

  const isPortal = location.pathname.startsWith('/portal');

  if (isPortal) {
    return (
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              DF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-slate-900 text-base tracking-tight">Customer Portal</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Restricted Isolated View
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Live negotiation & electronic order confirmation</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden md:inline-flex text-xs text-slate-500 font-medium">
              Internal margin & cost data strictly hidden
            </span>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-slate-100 border-b border-slate-800/80 px-6 py-2.5 transition-all">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Brand */}
          <div className="flex items-center space-x-7">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center text-white font-black text-xs shadow-md shadow-sky-500/20 transition-transform group-hover:scale-105">
                360
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-black tracking-tight text-white text-base">DealFlow<span className="text-sky-400">360</span></span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400/90 bg-sky-950/70 px-1.5 py-0.5 rounded-full border border-sky-800/60 hidden sm:inline-block">
                    Engine
                  </span>
                </div>
              </div>
            </Link>

            {/* Nav Items */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navLinks.map((item) => {
                if (item.roles && !item.roles.includes(currentRole)) {
                  return null;
                }
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Live Socket Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-soft-pulse"></span>
              <span className="text-[10px] font-semibold text-slate-300">Live</span>
            </div>

            {onReload && (
              <button
                onClick={onReload}
                title="Reload data from backend"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Quick Customer Portal Shortcut */}
            <button
              onClick={() => {
                const acme = customers.find(c => c.company_name.includes('Acme')) || customers[0];
                if (acme) {
                  navigate(`/portal?token=${acme.portal_token}`);
                }
              }}
              className="hidden sm:flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700/70 font-semibold transition"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Customer Portal</span>
            </button>

            {/* Role Switcher Pill */}
            <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold hidden sm:inline">Role:</span>
              <div className="relative flex items-center">
                <select
                  value={currentRole}
                  onChange={handleRoleChange}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  <option value="sales_rep" className="bg-slate-900 text-white">Sales Rep (Alex)</option>
                  <option value="sales_manager" className="bg-slate-900 text-white">Sales Manager (Morgan)</option>
                  <option value="finance_ops" className="bg-slate-900 text-white">Finance/Ops (Taylor)</option>
                  <option value="admin" className="bg-slate-900 text-white">Admin (Full Control)</option>
                  <option value="customer" className="bg-slate-900 text-sky-400">Customer View (Portal)</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none absolute right-0" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-medium flex items-center space-x-2 animate-bounce">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
