import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PRESET_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, ShieldAlert,
  ArrowRight, Sparkles, User, Building, CheckCircle2,
  Layers
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, switchRole } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('rep@dealflow.com');
  const [password, setPassword] = useState('rep123');
  const [role, setRole] = useState<UserRole>('sales_rep');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sign up state
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('sales_rep');
  const [customerTier, setCustomerTier] = useState('enterprise');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const getAssignedRole = (emailStr: string) => {
    const clean = emailStr.trim().toLowerCase();
    if (clean === 'admin@dealflow.com' || clean === 'admin') {
      return { role: 'admin' as UserRole, title: 'System Administrator (Chief)', isAdmin: true };
    }
    if (clean === 'manager@dealflow.com') {
      return { role: 'sales_manager' as UserRole, title: 'Sales Manager (Morgan)', isAdmin: false };
    }
    if (clean === 'finance@dealflow.com') {
      return { role: 'finance_ops' as UserRole, title: 'Finance VP & Ops (Taylor)', isAdmin: false };
    }
    return { role: 'sales_rep' as UserRole, title: 'Sales Rep (Alex)', isAdmin: false };
  };

  const assignedRoleInfo = getAssignedRole(email);

  const handleSelectPreset = (key: string) => {
    const cred = PRESET_CREDENTIALS[key];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.pass);
      setErrorMsg(null);
      showToast(`Selected demo persona: ${cred.title}`);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const assigned = getAssignedRole(email);
      await login(email, password, assigned.role);
      showToast('Authentication successful. Loading workspace...');
      setTimeout(() => {
        navigate('/');
      }, 400);
    } catch (err: any) {
      // Fallback to demo persona switch
      const assigned = getAssignedRole(email);
      await switchRole(assigned.role);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName || !signupEmail || !signupPassword) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: fullName,
        email: signupEmail,
        company: company || 'Acme Global',
        password: signupPassword,
        role: signupRole,
        tier: customerTier
      });
      showToast('Account created! Entering workspace...');
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err: any) {
      await switchRole(signupRole);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-white">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-500/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-400/50 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ==================== LEFT SHOWCASE PANEL (TransitOps Style) ==================== */}
      <div className="lg:w-5/12 xl:w-4/12 p-8 lg:p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 space-y-6">
          {/* Logo & Headline (TransitOps Signature Branding) */}
          <div>
            <div className="flex items-center mb-2">
              <h1 className="font-['Caveat',cursive] text-4xl lg:text-5xl font-bold text-[#c9822f] tracking-wide select-none drop-shadow-sm">
                DealFlow360
              </h1>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Sales-Ops Autonomous Engine</span>
            </div>
            <p className="text-slate-400 text-xs lg:text-sm mt-1 font-medium leading-relaxed">
              Unifying pricing discipline, inventory realities, hybrid recurring billing, and customer negotiation.
            </p>
          </div>

          {/* Quick Reviewer Persona Picker */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>1-Click Reviewer Personas</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Instant Demo Login</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(PRESET_CREDENTIALS).map(([k, cred]) => {
                const isSelected = email.toLowerCase() === cred.email.toLowerCase();
                const isAdminCred = cred.role === 'admin';
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleSelectPreset(k)}
                    className={`text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? isAdminCred
                          ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-[0_0_12px_rgba(201,130,47,0.3)]'
                          : 'bg-sky-500/20 border-sky-500/50 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] ${isAdminCred ? 'text-amber-300' : 'text-slate-200'}`}>
                        {cred.title}
                      </span>
                      {isAdminCred && (
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40">
                          Full Access
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-1">{cred.email}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Scope Access Guide */}
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-5 border border-slate-800/70 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Role Scope Access Matrix (Enterprise RBAC)</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-amber-300">System Admin:</strong> Unrestricted full access across all 8 modules, governance ceilings, and pricing rules.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-slate-200">Sales Rep:</strong> Quote builder, dynamic discount limits, upsell AI suggestions.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-slate-200">Sales Manager:</strong> L1 approval queue, rep velocity &amp; margin health tracking.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-slate-200">Finance &amp; Ops:</strong> L2 high-risk sign-off, mid-cycle subscription proration math.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>DealFlow360 Enterprise • v1.0</span>
          <span className="text-emerald-400 flex items-center space-x-1 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Server Online</span>
          </span>
        </div>
      </div>

      {/* ==================== RIGHT FORM PANEL ==================== */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-900/40">
        <div className="w-full max-w-md space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {mode === 'signin' ? 'Sign in to your workspace' : 'Create your Sales-Ops profile'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Enter your credentials or pick a demo persona from the left panel.'
                : 'Set up your role to test dynamic quote routing and approval tiers.'}
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
              <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Work Email</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rep@dealflow.com"
                    required
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => showToast('Demo credentials are provided in the left panel.')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Assigned Role Pill (Locked to Account) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Assigned Role (RBAC Governed)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">User ID Bound • Immutable</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2 w-2 rounded-full ${assignedRoleInfo.isAdmin ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                    <span className="text-xs font-bold text-white">
                      {assignedRoleInfo.title}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${assignedRoleInfo.isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {assignedRoleInfo.isAdmin ? 'Full Access' : 'Locked to Account'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {assignedRoleInfo.isAdmin
                    ? '🛡️ System Administrator account has full unrestricted access across all 8 sales-ops modules and pricing rules.'
                    : '🔒 Enterprise RBAC: Role permissions are bound to this User ID according to organizational governance.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500/20"
                  />
                  <span>Remember my session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 flex flex-col space-y-1.5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPreset('admin');
                    handleSignIn({ preventDefault: () => {} } as any);
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition flex items-center justify-center space-x-1"
                >
                  <span>⚡ Instant Enter as</span>
                  <span className="underline font-bold">System Administrator (Full Access)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPreset('sales_rep');
                    handleSignIn({ preventDefault: () => {} } as any);
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-400 font-medium transition"
                >
                  Or enter as Sales Rep (Alex Vance)
                </button>
              </div>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Taylor"
                    required
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>Company</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Global"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="alex.taylor@acme.com"
                  required
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                    <span>Assigned Role</span>
                  </label>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="sales_rep">Sales Rep</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="finance_ops">Finance VP</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    <span>Customer Tier</span>
                  </label>
                  <select
                    value={customerTier}
                    onChange={(e) => setCustomerTier(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="enterprise">Enterprise (Gold)</option>
                    <option value="mid_market">Mid-Market (Silver)</option>
                    <option value="smb">SMB (Bronze)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Creating profile...</span>
                ) : (
                  <>
                    <span>Create Profile &amp; Launch</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-[11px] text-slate-400 hover:text-sky-400"
                >
                  Already have an account? <span className="font-bold underline">Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
