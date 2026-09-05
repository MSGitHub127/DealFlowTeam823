import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { WorkspaceDashboard } from "./pages/WorkspaceDashboard";
import { PipelineKanban } from "./pages/PipelineKanban";
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

  // Render Login page full-bleed with dark background
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-white">
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Vertical Collapsible Sidebar */}
      {!isPortal && (
        <Navbar
          onReload={() => window.location.reload()}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      )}

      {/* Main Content Area - Dynamic Padding for Collapsible Sidebar */}
      <div
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isPortal ? "pl-0" : isCollapsed ? "pl-20" : "pl-64"
        }`}
      >
        <main className={isPortal ? "" : "p-6 pb-16"}>
          <Routes>
            {/* Internal Sales Ops Workspace with RBAC guards */}
            <Route
              path="/"
              element={<ProtectedRoute element={<WorkspaceDashboard />} />}
            />
            <Route
              path="/pipeline"
              element={<ProtectedRoute roles={['sales_rep', 'sales_manager', 'admin']} element={<PipelineKanban />} />}
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

            {/* Isolated Customer Portal */}
            <Route path="/portal" element={<CustomerPortal />} />

            {/* Fallback */}
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
