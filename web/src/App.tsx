import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { useStore } from './store/useStore';

// Lazy-loaded route views
const DashboardView = lazy(() => import('./features/dashboard/DashboardView'));
const OperatorDashboardView = lazy(() => import('./features/dashboard/OperatorDashboardView'));
const LoginView = lazy(() => import('./features/auth/LoginView'));
const UnauthorizedView = lazy(() => import('./features/auth/UnauthorizedView'));
const UserManagementView = lazy(() => import('./features/users/UserManagementView'));
const AuditLogsView = lazy(() => import('./features/audit/AuditLogsView'));
const AllocationView = lazy(() => import('./features/allocation/AllocationView'));
const InventoryView = lazy(() => import('./features/inventory/InventoryView'));
const ScannerView = lazy(() => import('./features/scanner/ScannerView').then(m => ({ default: m.ScannerView })));
const QualityView = lazy(() => import('./features/quality/QualityView').then(m => ({ default: m.QualityView })));
const FifoView = lazy(() => import('./features/fifo/FifoView').then(m => ({ default: m.FifoView })));
const DispatchView = lazy(() => import('./features/dispatch/DispatchView').then(m => ({ default: m.DispatchView })));
const OutForDeliveryView = lazy(() => import('./features/dispatch/OutForDeliveryView'));
const DeliveryHistoryView = lazy(() => import('./features/dispatch/DeliveryHistoryView'));
const AlertsView = lazy(() => import('./features/alerts/AlertsView').then(m => ({ default: m.AlertsView })));
const ReportsView = lazy(() => import('./features/reports/ReportsView').then(m => ({ default: m.ReportsView })));
const ManagerTasksView = lazy(() => import('./features/tasks/ManagerTasksView'));
const OperatorTasksView = lazy(() => import('./features/tasks/OperatorTasksView'));
const DamagedStockView = lazy(() => import('./features/stock-control/DamagedStockView'));
const ClearanceOrdersView = lazy(() => import('./features/stock-control/ClearanceOrdersView'));
const StockTransfersView = lazy(() => import('./features/stock-control/StockTransfersView'));
const StockVerificationView = lazy(() => import('./features/stock-control/StockVerificationView'));
const DisposalApprovalsView = lazy(() => import('./features/stock-control/DisposalApprovalsView'));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const BatchDetailView = lazy(() => import('./features/batch/BatchDetailView'));

// Loading skeleton
const PageLoadingFallback: React.FC = () => (
  <div className="p-8 space-y-6 max-w-[1536px] mx-auto animate-pulse">
    <div className="h-20 bg-slate-200/70 rounded-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div className="h-28 bg-slate-200/70 rounded-xl" />
      <div className="h-28 bg-slate-200/70 rounded-xl" />
      <div className="h-28 bg-slate-200/70 rounded-xl" />
      <div className="h-28 bg-slate-200/70 rounded-xl" />
    </div>
    <div className="h-96 bg-slate-200/70 rounded-xl" />
  </div>
);

// Dynamic Role-Based Dashboard Dispatcher
const RoleBasedDashboard: React.FC = () => {
  const { currentUser } = useStore();
  if (currentUser?.role === 'WAREHOUSE_ADMIN') {
    return <OperatorDashboardView />;
  }
  return <DashboardView />;
};

// Route Authentication Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, checkSession } = useStore();
  const valid = isAuthenticated && checkSession();

  if (!valid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Manager Role Guard
const ManagerRoute: React.FC<{ children: React.ReactNode; resource: string }> = ({ children, resource }) => {
  const { hasPermission } = useStore();
  if (!hasPermission('VIEW_SYSTEM_DATA') && !hasPermission('MANAGE_USERS')) {
    return <UnauthorizedView requiredPermission="MANAGER / SUPERVISOR ROLE" resourceName={resource} />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/unauthorized" element={<UnauthorizedView />} />

          {/* Authenticated Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dynamic Dashboard based on User Role */}
            <Route index element={<RoleBasedDashboard />} />
            
            {/* Common Operational Modules */}
            <Route path="stock-allocation" element={<AllocationView />} />
            <Route path="stock-inward" element={<Navigate to="/stock-allocation" replace />} />
            <Route path="inventory" element={<InventoryView />} />
            <Route path="scanner" element={<ScannerView />} />
            <Route path="quality" element={<QualityView />} />
            <Route path="fifo" element={<FifoView />} />
            <Route path="dispatch" element={<DispatchView />} />
            <Route path="ready-dispatch" element={<Navigate to="/dispatch?filter=Ready" replace />} />
            <Route path="out-delivery" element={<OutForDeliveryView />} />
            <Route path="delivery-history" element={<DeliveryHistoryView />} />
            <Route path="alerts" element={<AlertsView />} />
            <Route path="my-tasks" element={<OperatorTasksView />} />
            <Route path="operator-tasks" element={<Navigate to="/my-tasks" replace />} />

            {/* Manager-Exclusive Protected Modules */}
            <Route
              path="manager-tasks"
              element={
                <ManagerRoute resource="Task & Quality Follow-up Console">
                  <ManagerTasksView />
                </ManagerRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ManagerRoute resource="Reports & Global Analytics">
                  <ReportsView />
                </ManagerRoute>
              }
            />
            <Route
              path="users"
              element={
                <ManagerRoute resource="User & Role Administration">
                  <UserManagementView />
                </ManagerRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ManagerRoute resource="System Immutable Audit Logs">
                  <AuditLogsView />
                </ManagerRoute>
              }
            />
            {/* Stock Control & Clearance Modules */}
            <Route path="damaged-stock" element={<DamagedStockView />} />
            <Route path="clearance-orders" element={<ClearanceOrdersView />} />
            <Route path="stock-transfers" element={<StockTransfersView />} />
            <Route path="stock-verification" element={<StockVerificationView />} />
            <Route path="disposal-approvals" element={<DisposalApprovalsView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="batch/:token" element={<BatchDetailView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
