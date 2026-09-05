import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { WorkspaceDashboard } from './pages/WorkspaceDashboard';
import { PipelineKanban } from './pages/PipelineKanban';
import { QuoteBuilder } from './pages/QuoteBuilder';
import { ApprovalsList } from './pages/ApprovalsList';
import { FulfillmentView } from './pages/FulfillmentView';
import { HybridBillingView } from './pages/HybridBillingView';
import { CustomerPortal } from './pages/CustomerPortal';
import { DealHealthView } from './pages/DealHealthView';
import { ReportsView } from './pages/ReportsView';
import { AdminConfigView } from './pages/AdminConfigView';
import { Login } from './pages/Login';

export const App: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginPage = location.pathname === '/login';

  // Render Login page full-bleed with dark background and zero white margins/paddings
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-white">
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onReload={() => window.location.reload()} />
      <main className="flex-1 pb-16">
        <Routes>
          {/* Default entry: if not authenticated, immediately land on login page */}
          <Route
            path="/"
            element={isAuthenticated ? <WorkspaceDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/pipeline"
            element={isAuthenticated ? <PipelineKanban /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/quote/:id"
            element={isAuthenticated ? <QuoteBuilder /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/approvals"
            element={isAuthenticated ? <ApprovalsList /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/fulfillment"
            element={isAuthenticated ? <FulfillmentView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/billing"
            element={isAuthenticated ? <HybridBillingView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/deal-health"
            element={isAuthenticated ? <DealHealthView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/reports"
            element={isAuthenticated ? <ReportsView /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin/rules"
            element={isAuthenticated ? <AdminConfigView /> : <Navigate to="/login" replace />}
          />

          {/* Customer Portal is accessible with its own token authentication */}
          <Route path="/portal" element={<CustomerPortal />} />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
          />
        </Routes>
      </main>
    </div>
  );
};
