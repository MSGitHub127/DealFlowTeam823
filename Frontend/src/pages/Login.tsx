import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Mail, Lock, Eye, EyeOff, ShieldAlert,
  ArrowRight, Sparkles, CheckCircle2, User,
  Building, UserPlus, LogIn, Cpu, Database, ShieldCheck, Zap
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, switchRole } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);

  // Sign In State - Default password set to 123456
  const [email, setEmail] = useState('admin@dealflow.com');
  const [password, setPassword] = useState('123456');
  
  // External Customer Sign Up State
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // FIX: Ab admin, manager, finance, rep ke alawa SABKO by default 'customer_user' maanega
  const getAssignedRole = (emailStr: string): UserRole => {
    const clean = emailStr.trim().toLowerCase();
    if (clean === 'admin@dealflow.com' || clean === 'admin') return 'admin';
    if (clean === 'manager@dealflow.com') return 'sales_manager';
    if (clean === 'finance@dealflow.com') return 'finance_ops';
    if (clean === 'rep@dealflow.com') return 'sales_rep';
    
    // BAAKI SAB KO CUSTOMER MAAN LO
    return 'customer_user';
  };

  // ==================== SIGN IN HANDLER ====================
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const assignedRole = getAssignedRole(email);
      const userResponse: any = await login(email, password, assignedRole);
      
      showToast('Authentication successful. Loading workspace...');

      setTimeout(() => {
        const activeRole = userResponse?.role || assignedRole;

        // FIX: Admin, Rep, Manager, Finance ke alawa koi bhi ho, Customer Portal pe bhej do
        if (activeRole === 'admin') {
          navigate('/admin-config');
        } else if (activeRole === 'sales_rep' || activeRole === 'sales_manager') {
          navigate('/salesdashboard');
        } else if (activeRole === 'finance_ops') {
          navigate('/finance-dashboard');
        } else {
          // DEFAULT FALLBACK -> Customer Portal
          navigate('/customer-portal');
        }
      }, 400);

    } catch (err: any) {
      try {
        const assignedRole = getAssignedRole(email);
        await switchRole(assignedRole);
        
        // FIX: Same strict logic yahan bhi
        if (assignedRole === 'admin') {
          navigate('/admin-config');
        } else if (assignedRole === 'sales_rep' || assignedRole === 'sales_manager') {
          navigate('/salesdashboard');
        } else if (assignedRole === 'finance_ops') {
          navigate('/finance-dashboard');
        } else {
          // DEFAULT FALLBACK -> Customer Portal
          navigate('/customer-portal');
        }
      } catch (switchErr) {
        setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================== CUSTOMER SIGN UP HANDLER ====================
  const handleCustomerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !signUpEmail || !signUpPassword) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: fullName,
        email: signUpEmail,
        company: company || 'Customer Organization',
        password: signUpPassword,
        role: 'customer_user',
        tier: 'smb'
      });

      showToast('Account created! Please log in with your credentials.');

      // Autofill email into login form & switch to Sign In view
      setEmail(signUpEmail);
      setPassword('');
      setFullName('');
      setCompany('');
      setSignUpEmail('');
      setSignUpPassword('');
      setIsSignUp(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to register customer account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-100 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ==================== LEFT SHOWCASE PANEL ==================== */}
      <div className="lg:w-5/12 xl:w-4/12 p-8 lg:p-12 bg-slate-950 text-slate-100 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 space-y-8">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-3xl font-black tracking-tight text-white">
                DealFlow<span className="text-blue-500">360</span>
              </span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold tracking-wide uppercase mb-3">
              <Sparkles className="h-3 w-3" />
              <span>Enterprise CPQ & Billing Platform</span>
            </div>
            <p className="text-slate-400 text-xs lg:text-sm leading-relaxed font-normal">
              Unifying pricing discipline, inventory realities, hybrid recurring billing, and dynamic approval governance.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Platform Core Capabilities
            </h4>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-slate-200">Autonomous CPQ Engine</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time margin evaluation, multi-tier discount floors, and automated L1/L2 approval routing.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-slate-200">Greedy Fulfillment & Split Routing</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Multi-depot inventory optimization and automated carrier dispatch calculation.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-slate-200">Hybrid Recurring & Metered Billing</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Flexible term proration, seat tiering, and consumption schedules.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 rounded-xl p-3.5 border border-slate-800/80 flex items-center space-x-3">
            <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <p className="text-[11px] text-slate-400 leading-normal">
              Internal staff accounts are provisioned directly by System Administrators via the sidebar workspace.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>DealFlow360 Enterprise v2.4</span>
          <span className="text-emerald-400 flex items-center space-x-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Operational</span>
          </span>
        </div>
      </div>

      {/* ==================== RIGHT FORM PANEL ==================== */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-100">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                !isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Customer Signup</span>
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isSignUp ? 'Customer Self-Service' : 'Sign in to DealFlow360'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isSignUp
                ? 'Register a customer account to access quotes and billing.'
                : 'Enter your enterprise credentials to access your workspace.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center space-x-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isSignUp ? (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dealflow.com"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => showToast('Contact your system administrator to reset credentials.')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
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
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ================= CUSTOMER SIGN UP FORM ================= */
            <form onSubmit={handleCustomerSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>Company Name</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Logistics"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Work Email *</span>
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="sarah@acme.com"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Password *</span>
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Register Customer Account</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};