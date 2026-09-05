import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onReload={() => window.location.reload()} />
      <main className="flex-1 pb-16">
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
  );
};
