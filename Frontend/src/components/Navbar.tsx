import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard, Kanban, ShieldAlert, Truck, CreditCard,
  HeartPulse, BarChart3, Settings, ExternalLink, RefreshCw,
  UserCheck, ShieldCheck
} from 'lucide-react';

export const Navbar: React.FC<{ onReload?: () => void }> = ({ onReload }) => {
  const { currentUser, currentRole, switchRole, customers } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pipeline', path: '/pipeline', icon: Kanban },
    { name: 'Approvals', path: '/approvals', icon: ShieldCheck, roles: ['sales_manager', 'finance_ops', 'admin'] },
    { name: 'Fulfillment', path: '/fulfillment', icon: Truck },
    { name: 'Billing & Subs', path: '/billing', icon: CreditCard },
    { name: 'Deal Health', path: '/deal-health', icon: HeartPulse },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Admin Config', path: '/admin/rules', icon: Settings, roles: ['sales_manager', 'admin', 'finance_ops'] },
  ];

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    if (role === 'customer') {
      // Navigate to portal with Acme Corp token
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
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            DF
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight">DealFlow360 Customer Portal</h1>
            <p className="text-xs text-slate-500">Live Secure Negotiation & Order Confirmation</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            Isolated Customer View (Zero Cost/Margin Leak)
          </span>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center space-x-1 transition"
          >
            <span>Return to Workspace</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 px-6 py-2.5 sticky top-0 z-50 shadow-md">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-sky-500 group-hover:bg-sky-400 transition flex items-center justify-center text-white font-black text-sm shadow">
              360
            </div>
            <div>
              <span className="font-black tracking-tight text-white text-lg">DealFlow<span className="text-sky-400">360</span></span>
              <span className="hidden md:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">
                Sales-Ops Engine
              </span>
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
          {onReload && (
            <button
              onClick={onReload}
              title="Reload data from backend"
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <RefreshCw className="h-4 w-4" />
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
            className="hidden sm:flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open Portal</span>
          </button>

          {/* Role Switcher Pill */}
          <div className="flex items-center space-x-2 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold hidden sm:inline">Role:</span>
            <select
              value={currentRole}
              onChange={handleRoleChange}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="sales_rep" className="bg-slate-800 text-white">Sales Rep (Alex)</option>
              <option value="sales_manager" className="bg-slate-800 text-white">Sales Manager (Morgan)</option>
              <option value="finance_ops" className="bg-slate-800 text-white">Finance / Ops (Taylor)</option>
              <option value="admin" className="bg-slate-800 text-white">Admin (Full Access)</option>
              <option value="customer" className="bg-slate-800 text-sky-400">Customer View (Portal)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
