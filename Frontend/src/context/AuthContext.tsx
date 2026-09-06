import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Customer } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  isAdmin: boolean;
  isDevUser: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  login: (email: string, pass: string, role?: UserRole) => Promise<boolean>;
  signup: (data: { name: string; email: string; company: string; password: string; role: UserRole; tier: string }) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  customers: Customer[];
  refreshCustomers: () => Promise<void>;
  isLoading: boolean;
  presetCredentials: Record<string, { email: string; pass: string; title: string; desc: string; role: UserRole }>;
}

export const PRESET_CREDENTIALS: Record<string, { email: string; pass: string; title: string; desc: string; role: UserRole }> = {
  sales_rep: { email: 'rep@dealflow.com', pass: 'rep123', title: 'Sales Rep (Alex)', desc: 'Quote creation, category discounts, upsell AI', role: 'sales_rep' },
  sales_manager: { email: 'manager@dealflow.com', pass: 'manager123', title: 'Sales Manager (Morgan)', desc: 'L1 margin approvals & rep velocity tracking', role: 'sales_manager' },
  finance_ops: { email: 'finance@dealflow.com', pass: 'finance123', title: 'Finance VP & Ops (Taylor)', desc: 'L2 high-risk sign-off & billing proration math', role: 'finance_ops' },
  admin: { email: 'admin@dealflow.com', pass: 'admin123', title: 'System Administrator (Chief)', desc: 'Unrestricted full access across all 8 modules & rules', role: 'admin' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('dealflow_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const savedRole = localStorage.getItem('dealflow_role');
      return (savedRole as UserRole) || 'sales_rep';
    } catch {
      return 'sales_rep';
    }
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('dealflow_token');
      const savedUser = localStorage.getItem('dealflow_user');
      return Boolean(token && savedUser);
    } catch {
      return false;
    }
  });

  const isAdmin = Boolean(currentUser?.role === 'admin' || currentRole === 'admin');
  const isDevUser = isAdmin; // Alias for backward compatibility

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    setCurrentRole(role);
    try {
      if (role !== 'customer') {
        const creds = PRESET_CREDENTIALS[role] || PRESET_CREDENTIALS.sales_rep;
        const res = await authApi.login({ email: creds.email, password: creds.pass });
        localStorage.setItem('dealflow_token', res.data.access_token);
        localStorage.setItem('dealflow_user', JSON.stringify(res.data.user));
        localStorage.setItem('dealflow_role', role);

        setCurrentUser(res.data.user);
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Error switching role login:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string, role?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password: pass });
      const user: User = res.data.user;
      const assignedRole: UserRole = (user?.role as UserRole) || role || 'sales_rep';

      localStorage.setItem('dealflow_token', res.data.access_token);
      localStorage.setItem('dealflow_user', JSON.stringify(user));
      localStorage.setItem('dealflow_role', assignedRole);

      setCurrentUser(user);
      setCurrentRole(assignedRole);
      setIsAuthenticated(true);

      return true;
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { name: string; email: string; company: string; password: string; role: UserRole; tier: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Simulate account creation or map to existing auth endpoint
      const res = await authApi.login({ email: 'admin@dealflow.com', password: 'admin123' });
      const newUser: User = {
        id: 'new-user-' + Date.now(),
        email: data.email,
        full_name: data.name,
        role: data.role,
        is_active: true
      };

      localStorage.setItem('dealflow_token', res.data.access_token);
      localStorage.setItem('dealflow_user', JSON.stringify(newUser));
      localStorage.setItem('dealflow_role', data.role);

      setCurrentUser(newUser);
      setCurrentRole(data.role);
      setIsAuthenticated(true);
      return true;
    } catch (e) {
      console.error('Signup error:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('dealflow_token');
    localStorage.removeItem('dealflow_user');
    localStorage.removeItem('dealflow_role');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const refreshCustomers = async () => {
    try {
      const res = await authApi.getCustomers();
      setCustomers(res.data);
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  useEffect(() => {
    refreshCustomers();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isAdmin,
        isDevUser,
        switchRole,
        login,
        signup,
        logout,
        isAuthenticated,
        customers,
        refreshCustomers,
        isLoading,
        presetCredentials: PRESET_CREDENTIALS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
