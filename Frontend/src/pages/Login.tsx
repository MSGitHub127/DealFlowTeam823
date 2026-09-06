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

        if (activeRole === 'admin') {
          navigate('/admin-config');
        } else if (activeRole === 'sales_rep' || activeRole === 'sales_manager') {
          navigate('/salesdashboard');
        } else if (activeRole === 'finance_ops') {
          navigate('/finance-dashboard');
        } else {
          navigate('/customer-portal');
        }
      }, 400);

    } catch (err: any) {
      try {
        const assignedRole = getAssignedRole(email);
        await switchRole(assignedRole);
        
        if (assignedRole === 'admin') {
          navigate('/admin-config');
        } else if (assignedRole === 'sales_rep' || assignedRole === 'sales_manager') {
          navigate('/salesdashboard');
        } else if (assignedRole === 'finance_ops') {
          navigate('/finance-dashboard');
        } else {
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-5 py-4 rounded-xl shadow-2xl text-sm font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-5 w-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ==================== LEFT SHOWCASE PANEL (50%) ==================== */}
      <div className="lg:w-1/2 p-10 lg:p-16 bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden shadow-2xl z-20">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 space-y-10">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl lg:text-5xl font-black tracking-tight text-white">
                DealFlow<span className="text-blue-500">360</span>
              </span>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
              <Sparkles className="h-4 w-4" />
              <span>Enterprise CPQ & Billing Platform</span>
            </div>
            <p className="text-slate-400 text-sm lg:text-base leading-relaxed font-normal max-w-lg">
              Unifying pricing discipline, inventory realities, hybrid recurring billing, and dynamic approval governance.
            </p>
          </div>

          <div className="space-y-4 max-w-lg">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Platform Core Capabilities
            </h4>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-start space-x-4 transition-all hover:bg-slate-900">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 mt-1">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-200">Autonomous CPQ Engine</h5>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Real-time margin evaluation, multi-tier discount floors, and automated L1/L2 approval routing.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-start space-x-4 transition-all hover:bg-slate-900">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 mt-1">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-200">Greedy Fulfillment & Split Routing</h5>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Multi-depot inventory optimization and automated carrier dispatch calculation.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-start space-x-4 transition-all hover:bg-slate-900">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 mt-1">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-200">Hybrid Recurring & Metered Billing</h5>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Flexible term proration, seat tiering, and consumption schedules.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 rounded-2xl p-5 border border-slate-800/80 flex items-center space-x-4 max-w-lg">
            <ShieldCheck className="h-6 w-6 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Internal staff accounts are provisioned directly by System Administrators via the sidebar workspace.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-500 mt-12">
          <span>DealFlow360 Enterprise v2.4</span>
          <span className="text-emerald-400 flex items-center space-x-2 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Operational</span>
          </span>
        </div>
      </div>

      {/* ==================== RIGHT FORM PANEL (50%) ==================== */}
      <div className="lg:w-1/2 relative flex items-center justify-center p-6 lg:p-16 bg-slate-50 overflow-hidden">
        
        {/* Awesome Background Blobs behind the form */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/3 translate-y-1/3" />

        {/* Bigger, Glassmorphism Card */}
        <div className="relative z-10 w-full max-w-xl bg-white/70 backdrop-blur-2xl p-10 lg:p-12 rounded-3xl border border-white/50 shadow-[0_8px_40px_rgb(0,0,0,0.08)] space-y-8">
          
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                !isSignUp ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-slate-500 hover:text-slate-900 scale-95'
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                isSignUp ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-slate-500 hover:text-slate-900 scale-95'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Customer Signup</span>
            </button>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isSignUp ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {isSignUp
                ? 'Register a customer account to access quotes and billing.'
                : 'Enter your enterprise credentials to access your workspace.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center space-x-3 animate-in slide-in-from-top-2">
              <ShieldAlert className="h-5 w-5 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isSignUp ? (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dealflow.com"
                  required
                  className="w-full bg-white/80 border border-slate-300 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => showToast('Contact your system administrator to reset credentials.')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors"
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
                    className="w-full bg-white/80 border border-slate-300 rounded-2xl px-5 py-3.5 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-2">
                <label className="flex items-center space-x-3 text-slate-600 cursor-pointer font-medium hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Remember session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-6 rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ================= CUSTOMER SIGN UP FORM ================= */
            <form onSubmit={handleCustomerSignUp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  required
                  className="w-full bg-white/80 border border-slate-300 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span>Company Name</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Logistics"
                  className="w-full bg-white/80 border border-slate-300 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>Work Email *</span>
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="sarah@acme.com"
                  required
                  className="w-full bg-white/80 border border-slate-300 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span>Password *</span>
                </label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-white/80 border border-slate-300 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-6 rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Account...</span>
                  </div>
                ) : (
                  <>
                    <span>Register Customer Account</span>
                    <ArrowRight className="h-5 w-5" />
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