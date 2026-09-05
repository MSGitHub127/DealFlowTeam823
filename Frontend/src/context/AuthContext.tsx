import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Customer } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  switchRole: (role: UserRole) => Promise<void>;
  customers: Customer[];
  refreshCustomers: () => Promise<void>;
  isLoading: boolean;
}

const PRESET_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  sales_rep: { email: 'rep@dealflow.com', pass: 'rep123' },
  sales_manager: { email: 'manager@dealflow.com', pass: 'manager123' },
  finance_ops: { email: 'finance@dealflow.com', pass: 'finance123' },
  admin: { email: 'admin@dealflow.com', pass: 'admin123' },
  customer: { email: 'rep@dealflow.com', pass: 'rep123' }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('sales_rep');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    setCurrentRole(role);
    try {
      if (role !== 'customer') {
        const creds = PRESET_CREDENTIALS[role];
        const res = await authApi.login({ email: creds.email, password: creds.pass });
        localStorage.setItem('dealflow_token', res.data.access_token);
        setCurrentUser(res.data.user);
      }
    } catch (e) {
      console.error('Error switching role login:', e);
    } finally {
      setIsLoading(false);
    }
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
    // Initial login as Sales Rep
    switchRole('sales_rep').then(() => {
      refreshCustomers();
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        customers,
        refreshCustomers,
        isLoading
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
