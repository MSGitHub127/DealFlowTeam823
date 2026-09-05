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
  Menu,
  X,
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
                <span className="font-['Caveat',cursive] text-2xl sm:text-3xl font-bold text-[#c9822f] tracking-wide leading-none select-none">
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
        className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 z-40 transition-all duration-300 p-4 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top Header & Brand with Toggle Button */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between px-1">
            <Link to="/" className="flex items-center space-x-2 overflow-hidden group">
              <div className="flex items-baseline space-x-1.5">
                <span className="font-['Caveat',cursive] text-2xl sm:text-3xl font-bold text-[#c9822f] tracking-wide leading-none select-none transition-transform group-hover:scale-105">
                  {isCollapsed ? "DF" : "DealFlow360"}
                </span>
                {!isCollapsed && (
                  <span className="text-[9px] uppercase font-extrabold tracking-wider text-amber-400/80 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50 hidden sm:inline-block">
                    Engine
                  </span>
                )}
              </div>
            </Link>

            {/* Toggle Hamburger Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <Menu className="h-5 w-5 text-amber-400" />
              ) : (
                <X className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Navigation Items (Strict Role-Based Access) */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((item) => {
              if (item.roles && !isAdmin && !item.roles.includes(currentRole)) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon className="h-4 w-4 min-w-[1rem]" />
                  {!isCollapsed && (
                    <span className="truncate font-semibold">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls & Authentic Role Status */}
        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-1`}>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
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
            title={isCollapsed ? "Customer Portal" : undefined}
            className={`flex items-center space-x-2 text-xs py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700/70 font-semibold transition ${
              isCollapsed ? "justify-center px-0" : "justify-center px-3"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5 min-w-[0.9rem]" />
            {!isCollapsed && <span>Customer Portal</span>}
          </button>

          {/* Authentic Locked Role Badge */}
          <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
            {!isCollapsed && (
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Assigned Scope
              </span>
            )}
            <div className="flex items-center space-x-1.5">
              <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'} flex-shrink-0`} />
              {!isCollapsed && (
                <span className="text-xs font-bold text-white truncate">
                  {isAdmin && 'Administrator'}
                  {!isAdmin && currentRole === 'sales_rep' && 'Sales Rep (Alex)'}
                  {!isAdmin && currentRole === 'sales_manager' && 'Sales Manager (Morgan)'}
                  {!isAdmin && currentRole === 'finance_ops' && 'Finance/Ops (Taylor)'}
                </span>
              )}
            </div>
          </div>

          {/* Sign Out to Login */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex items-center space-x-2 text-xs py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:border-rose-800/60 text-slate-300 hover:text-rose-300 border border-slate-700/80 font-medium transition ${
              isCollapsed ? "justify-center px-0" : "justify-center px-3"
            }`}
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
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
