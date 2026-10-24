import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/ui/Sidebar';
import { Header } from '../components/ui/Header';
import { ToastNotification } from '../components/ui/ToastNotification';
import { BatchDetailDrawer } from '../components/ui/BatchDetailDrawer';
import { StatusChangeDialog } from '../components/ui/StatusChangeDialog';
import { QualityStatus } from '../data/types';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [statusDialogInfo, setStatusDialogInfo] = useState<{
    batchId: string | null;
    status: QualityStatus | null;
  }>({ batchId: null, status: null });

  const handleOpenStatusModal = (batchId: string, status: QualityStatus) => {
    setStatusDialogInfo({ batchId, status });
  };

  const handleCloseStatusModal = () => {
    setStatusDialogInfo({ batchId: null, status: null });
  };

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] text-[#0F172A] antialiased">
      {/* Fixed Deep-Blue Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top White Bar (76px) */}
        <Header />

        {/* Scrollable Viewport with Router Outlet */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div key={location.pathname} className="animate-pageTransition min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Slide-out Drawer */}
      <BatchDetailDrawer onOpenStatusModal={handleOpenStatusModal} />

      {/* Global Status Change Dialog */}
      <StatusChangeDialog
        batchId={statusDialogInfo.batchId}
        targetStatus={statusDialogInfo.status}
        onClose={handleCloseStatusModal}
      />

      {/* Persistent Toast Notification */}
      <ToastNotification />
    </div>
  );
};

export default AppLayout;

