import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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

export const App: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const location = useLocation();

  const isPortal = location.pathname.startsWith("/portal");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Vertical Collapsible Sidebar */}
      <Navbar
        onReload={() => window.location.reload()}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area - Dynamic Padding Fixes Content Overlay */}
      <div
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isPortal ? "pl-0" : isCollapsed ? "pl-20" : "pl-64"
        }`}
      >
        <main className="p-6 pb-16">
          <Routes>
            {/* Internal Sales Ops Workspace */}
            <Route path="/" element={<WorkspaceDashboard />} />
            <Route path="/pipeline" element={<PipelineKanban />} />
            <Route path="/quote/:id" element={<QuoteBuilder />} />
            <Route path="/approvals" element={<ApprovalsList />} />
            <Route path="/fulfillment" element={<FulfillmentView />} />
            <Route path="/billing" element={<HybridBillingView />} />
            <Route path="/deal-health" element={<DealHealthView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/admin/rules" element={<AdminConfigView />} />

            {/* Isolated Customer Portal */}
            <Route path="/portal" element={<CustomerPortal />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
