import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { WorkspaceDashboard } from "./pages/WorkspaceDashboard";
import { PipelineKanban } from "./pages/PipelineKanban";
import { QuotesDirectory } from "./pages/QuotesDirectory";
import { QuoteBuilder } from "./pages/QuoteBuilder";
import { ApprovalsList } from "./pages/ApprovalsList";
import { FulfillmentView } from "./pages/FulfillmentView";
import { HybridBillingView } from "./pages/HybridBillingView";
import { CustomerPortal } from "./pages/CustomerPortal";
import { DealHealthView } from "./pages/DealHealthView";
import { ReportsView } from "./pages/ReportsView";
import { AdminConfigView } from "./pages/AdminConfigView";
import { Login } from "./pages/Login";
import { UserRole } from "./types";

interface ProtectedRouteProps {
  roles?: UserRole[];
  element: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, element }) => {
  const { isAuthenticated, currentRole, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !isAdmin && !roles.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }
  return element;
};

export const App: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginPage = location.pathname === "/login";
  const isPortal = location.pathname.startsWith("/portal");

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Sidebar Navigation */}
      {!isPortal && (
        <Navbar
          onReload={() => window.location.reload()}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      )}

      {/* Main Content Viewport */}
      <div
        className={`flex-1 transition-all duration-300 min-w-0 bg-[#F8FAFC] ${
          isPortal ? "pl-0" : isCollapsed ? "pl-20" : "pl-64"
        }`}
        style={{ overscrollBehavior: 'none', overscrollBehaviorY: 'none' }}
      >
        <main className={isPortal ? "" : "p-4 sm:p-6 pb-16"}>
          <Routes>
            <Route
              path="/"
              element={<ProtectedRoute element={<WorkspaceDashboard />} />}
            />
            <Route
              path="/pipeline"
              element={<ProtectedRoute roles={['sales_rep', 'sales_manager', 'admin']} element={<PipelineKanban />} />}
            />
            {/* Dedicated Quotations Directory Route */}
            <Route
              path="/quotes"
              element={<ProtectedRoute roles={['sales_rep', 'sales_manager', 'admin']} element={<QuotesDirectory />} />}
            />
            {/* CPQ Studio Builder Routes */}
            <Route
              path="/quote/new"
              element={<ProtectedRoute roles={['sales_rep', 'sales_manager', 'admin']} element={<QuoteBuilder />} />}
            />
            <Route
              path="/quote/:id"
              element={<ProtectedRoute roles={['sales_rep', 'sales_manager', 'admin']} element={<QuoteBuilder />} />}
            />
            <Route
              path="/approvals"
              element={<ProtectedRoute roles={['sales_manager', 'finance_ops', 'admin']} element={<ApprovalsList />} />}
            />
            <Route
              path="/fulfillment"
              element={<ProtectedRoute roles={['finance_ops', 'admin']} element={<FulfillmentView />} />}
            />
            <Route
              path="/billing"
              element={<ProtectedRoute roles={['finance_ops', 'admin']} element={<HybridBillingView />} />}
            />
            <Route
              path="/deal-health"
              element={<ProtectedRoute roles={['sales_manager', 'admin']} element={<DealHealthView />} />}
            />
            <Route
              path="/reports"
              element={<ProtectedRoute roles={['sales_manager', 'finance_ops', 'admin']} element={<ReportsView />} />}
            />
            <Route
              path="/admin/rules"
              element={<ProtectedRoute roles={['admin']} element={<AdminConfigView />} />}
            />

            <Route path="/portal" element={<CustomerPortal />} />

            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};