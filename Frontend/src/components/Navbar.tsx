import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDealFlowSocket } from "../hooks/useDealFlowSocket";
import { UserRole } from "../types";
import {
  LayoutDashboard,
  Kanban,
  ShieldCheck,
  Truck,
  CreditCard,
  HeartPulse,
  BarChart3,
  Settings,
  ExternalLink,
  RefreshCw,
  Radio,
  LogOut,
  X,
  User,
} from "lucide-react";

interface SidebarProps {
  onReload?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Navbar: React.FC<SidebarProps> = ({
  onReload,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { currentUser, currentRole, isAdmin, customers, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [, setLiveConnected] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDealFlowSocket((msg) => {
    setLiveConnected(true);
    if (msg.message || msg.type) {
      setToastMessage(msg.message || `Event: ${msg.type}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  });

  const navLinks: { name: string; path: string; icon: any; roles?: UserRole[] }[] = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Pipeline", path: "/pipeline", icon: Kanban, roles: ["sales_rep", "sales_manager", "admin"] },
    { name: "Approvals", path: "/approvals", icon: ShieldCheck, roles: ["sales_manager", "finance_ops", "admin"] },
    { name: "Fulfillment", path: "/fulfillment", icon: Truck, roles: ["finance_ops", "admin"] },
    { name: "Hybrid Billing", path: "/billing", icon: CreditCard, roles: ["finance_ops", "admin"] },
    { name: "Deal Health", path: "/deal-health", icon: HeartPulse, roles: ["sales_manager", "admin"] },
    { name: "Reports", path: "/reports", icon: BarChart3, roles: ["sales_manager", "finance_ops", "admin"] },
    { name: "Admin Config", path: "/admin/rules", icon: Settings, roles: ["admin"] },
  ];

  const isPortal = location.pathname.startsWith("/portal");

  if (isPortal) {
    return (
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 transition-all text-slate-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className="font-['Caveat',cursive] text-2xl sm:text-3xl font-bold text-[#c9822f] tracking-wide select-none inline-block overflow-visible"
                  style={{ lineHeight: 1.4, paddingTop: '2px', paddingBottom: '2px' }}
                >
                  DealFlow360
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  Customer Portal Isolated View
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Live negotiation & electronic order confirmation</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden md:inline-flex text-xs text-slate-400 font-medium">
              🔒 Internal margins & costs strictly hidden server-side
            </span>
            <button
              onClick={() => navigate("/")}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 shadow-sm transition"
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
      <aside
        className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 z-40 transition-all duration-300 p-4 overscroll-none select-none ${
          isCollapsed ? "w-20" : "w-64"
        }`}
        style={{ overscrollBehavior: 'none' }}
      >
        {/* Top Header & Brand with Toggle Button */}
        <div className="flex flex-col space-y-6">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center py-2.5 px-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[#c9822f] hover:text-[#e09b45] transition-all group focus:outline-none overflow-visible"
              title="Expand Sidebar (DF360)"
            >
              <span
                className="font-['Caveat',cursive] text-2xl font-bold tracking-tight select-none group-hover:scale-110 transition-transform inline-block overflow-visible"
                style={{ lineHeight: 1.4, paddingTop: '2px', paddingBottom: '2px' }}
              >
                DF360
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-1 pt-2 pb-1 overflow-visible">
              <Link to="/" className="flex items-center group py-1.5 px-1 overflow-visible focus:outline-none">
                <span
                  className="font-['Caveat',cursive] text-[29px] font-bold text-[#c9822f] tracking-wide select-none transition-transform group-hover:scale-105 inline-block overflow-visible"
                  style={{ lineHeight: 1.5, paddingTop: '4px', paddingBottom: '4px' }}
                >
                  DealFlow360
                </span>
              </Link>

              {/* Toggle Collapse Button */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none flex-shrink-0"
                title="Collapse Sidebar"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          )}

          {/* Navigation Items (Strict Role-Based Access) */}
          <nav className="flex flex-col space-y-1.5">
            {navLinks.map((item) => {
              if (item.roles && !isAdmin && !item.roles.includes(currentRole)) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-[14.5px] transition-all ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon className="h-5 w-5 min-w-[1.25rem] flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate tracking-wide">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls & Authentic Role Status */}
        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-1`}>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400" title="WebSocket Live Sync Active">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              {!isCollapsed && (
                <span className="text-[11px] font-semibold text-slate-300">
                  Live Sync
                </span>
              )}
            </div>

            {onReload && !isCollapsed && (
              <button
                onClick={onReload}
                title="Reload data"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Customer Portal Shortcut */}
          <button
            onClick={() => {
              const acme = customers.find((c) => c.company_name.includes("Acme")) || customers[0];
              if (acme) navigate(`/portal?token=${acme.portal_token}`);
            }}
            title="Customer Portal"
            className={`w-full flex items-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-sky-400 border border-slate-700/70 text-[13px] font-semibold transition ${
              isCollapsed ? "justify-center py-2.5 px-0" : "space-x-3 py-2 px-3"
            }`}
          >
            <ExternalLink className="h-4 w-4 min-w-[1rem] flex-shrink-0" />
            {!isCollapsed && <span>Customer Portal</span>}
          </button>

          {/* Authentic Locked Role Badge */}
          <div
            title={isCollapsed ? `Assigned Scope: ${isAdmin ? 'Administrator' : currentRole.replace('_', ' ')}` : undefined}
            className={`w-full flex items-center rounded-xl bg-slate-800/80 border border-slate-700/70 transition ${
              isCollapsed ? "justify-center py-2.5 px-0" : "space-x-3 py-2 px-3"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isAdmin ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'} flex-shrink-0`} />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-tight">
                  Assigned Scope
                </span>
                <span className="text-[13px] font-bold text-white truncate leading-tight">
                  {isAdmin && 'Administrator'}
                  {!isAdmin && currentRole === 'sales_rep' && 'Sales Rep (Alex)'}
                  {!isAdmin && currentRole === 'sales_manager' && 'Sales Manager (Morgan)'}
                  {!isAdmin && currentRole === 'finance_ops' && 'Finance/Ops (Taylor)'}
                </span>
              </div>
            )}
          </div>

          {/* Sign Out to Login */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign Out"
            className={`w-full flex items-center rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 border border-slate-700/70 text-[13px] font-medium transition ${
              isCollapsed ? "justify-center py-2.5 px-0" : "space-x-3 py-2 px-3"
            }`}
          >
            <LogOut className="h-4 w-4 min-w-[1rem] text-rose-400 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

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
