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
  ChevronDown,
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
  const { currentRole, switchRole, customers } = useAuth();
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

  const navLinks = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Pipeline", path: "/pipeline", icon: Kanban },
    {
      name: "Approvals",
      path: "/approvals",
      icon: ShieldCheck,
      roles: ["sales_manager", "finance_ops", "admin"],
    },
    { name: "Fulfillment", path: "/fulfillment", icon: Truck },
    { name: "Hybrid Billing", path: "/billing", icon: CreditCard },
    { name: "Deal Health", path: "/deal-health", icon: HeartPulse },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    {
      name: "Admin Config",
      path: "/admin/rules",
      icon: Settings,
      roles: ["sales_manager", "admin", "finance_ops"],
    },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    if (role === "customer") {
      const acme =
        customers.find((c) => c.company_name.includes("Acme")) || customers[0];
      if (acme) {
        navigate(`/portal?token=${acme.portal_token}`);
      } else {
        navigate("/portal");
      }
    } else {
      switchRole(role);
    }
  };

  const isPortal = location.pathname.startsWith("/portal");

  if (isPortal) {
    return (
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
              DF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-slate-900 text-base tracking-tight">
                  Customer Portal
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Restricted Isolated View
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
          >
            Return to Workspace
          </button>
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
        {/* Top Header & Brand with 3 Lines Hamburger Toggle Button */}
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between px-1">
            <Link
              to="/"
              className="flex items-center space-x-3 overflow-hidden"
            >
              <div className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-md">
                360
              </div>
              {!isCollapsed && (
                <div className="flex flex-col transition-opacity duration-200">
                  <span className="font-black tracking-tight text-white text-lg">
                    DealFlow<span className="text-sky-400">360</span>
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400/90 bg-sky-950/70 px-1.5 py-0.5 rounded-full border border-sky-800/60 w-fit">
                    Engine
                  </span>
                </div>
              )}
            </Link>

            {/* 3 Lines (Hamburger) Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <Menu className="h-6 w-6 text-sky-400" />
              ) : (
                <X className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((item) => {
              if (item.roles && !item.roles.includes(currentRole)) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon className="h-5 w-5 min-w-[1.25rem]" />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls & Role Switcher */}
        <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800">
          <div
            className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-1`}
          >
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {!isCollapsed && (
                <span className="text-xs font-semibold text-slate-300">
                  Live Socket
                </span>
              )}
            </div>

            {onReload && (
              <button
                onClick={onReload}
                title="Reload data"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              const acme =
                customers.find((c) => c.company_name.includes("Acme")) ||
                customers[0];
              if (acme) navigate(`/portal?token=${acme.portal_token}`);
            }}
            title={isCollapsed ? "Customer Portal" : undefined}
            className={`flex items-center space-x-2 text-xs py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700/70 font-semibold ${
              isCollapsed ? "justify-center px-0" : "justify-center px-3"
            }`}
          >
            <ExternalLink className="h-4 w-4 min-w-[1rem]" />
            {!isCollapsed && <span>Customer Portal</span>}
          </button>

          {/* Role Switcher */}
          <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80">
            {!isCollapsed && (
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Current Role
              </span>
            )}
            <div className="relative flex items-center justify-center">
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className={`bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer appearance-none ${
                  isCollapsed ? "w-6 text-center pl-1" : "w-full pr-4"
                }`}
              >
                <option value="sales_rep" className="bg-slate-900 text-white">
                  Sales Rep (Alex)
                </option>
                <option
                  value="sales_manager"
                  className="bg-slate-900 text-white"
                >
                  Sales Manager (Morgan)
                </option>
                <option value="finance_ops" className="bg-slate-900 text-white">
                  Finance/Ops (Taylor)
                </option>
                <option value="admin" className="bg-slate-900 text-white">
                  Admin (Full Control)
                </option>
                <option value="customer" className="bg-slate-900 text-sky-400">
                  Customer View (Portal)
                </option>
              </select>
              {!isCollapsed && (
                <ChevronDown className="h-3 w-3 text-slate-400 pointer-events-none absolute right-0" />
              )}
            </div>
          </div>
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
