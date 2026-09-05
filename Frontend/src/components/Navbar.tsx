import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDealFlowSocket } from '../hooks/useDealFlowSocket';
import { UserRole } from '../types';
import {
  LayoutDashboard, Kanban, ShieldCheck, Truck, CreditCard,
  HeartPulse, BarChart3, Settings, ExternalLink, RefreshCw,
  Radio, LogOut, Zap
} from 'lucide-react';

export const Navbar: React.FC<{ onReload?: () => void }> = ({ onReload }) => {
  const { currentUser, currentRole, customers, logout } = useAuth();
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

  const isPortal = location.pathname.startsWith('/portal');
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return null;
  }

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
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-slate-100 border-b border-slate-800/80 px-4 lg:px-6 py-2 transition-all">
        <div className="flex items-center justify-between w-full max-w-[1600px] mx-auto flex-nowrap gap-2">
          {/* Left: Brand & Navigation */}
          <div className="flex items-center space-x-3 xl:space-x-5 flex-shrink-0 flex-nowrap">
            {/* TransitOps Signature Logo */}
            <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
              <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#c9822f] shadow-sm transition-transform group-hover:scale-105 flex-shrink-0">
                <Zap className="h-4 w-4 text-[#c9822f]" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-['Caveat',cursive] text-2xl font-bold text-[#c9822f] tracking-wide leading-none select-none">
                  DealFlow360
                </span>
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-amber-400/80 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50 hidden sm:inline-block">
                  Engine
                </span>
              </div>
            </Link>

            {/* Nav Items (Strictly Single-Line with whitespace-nowrap) */}
            <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 flex-nowrap">
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
                    className={`whitespace-nowrap flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls & Role Display */}
          <div className="flex items-center space-x-2 xl:space-x-2.5 flex-shrink-0 flex-nowrap">
            {/* Live Socket Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 flex-shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-semibold text-slate-300">Live</span>
            </div>

            {onReload && (
              <button
                onClick={onReload}
                title="Reload data from backend"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex-shrink-0"
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
              className="hidden xl:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700/70 font-semibold transition whitespace-nowrap flex-shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Portal</span>
            </button>

            {/* Authentic Enterprise RBAC Role Badge */}
            {currentRole === 'admin' ? (
              <div className="flex items-center space-x-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-sm flex-shrink-0">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-black text-amber-300 whitespace-nowrap">
                  Administrator (Full Access)
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-sm flex-shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold hidden xl:inline">Role:</span>
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  {currentRole === 'sales_rep' && 'Sales Rep (Alex)'}
                  {currentRole === 'sales_manager' && 'Sales Manager (Morgan)'}
                  {currentRole === 'finance_ops' && 'Finance/Ops (Taylor)'}
                  {currentRole === 'customer' && 'Customer View'}
                </span>
              </div>
            )}

            {/* Sign Out to Login */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out to Login Page"
              className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 border border-slate-700/80 font-medium transition whitespace-nowrap flex-shrink-0"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
              <span className="hidden sm:inline font-medium">Sign Out</span>
            </button>
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
