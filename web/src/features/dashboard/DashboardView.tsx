import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Briefcase, Plus, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { KpiCards } from '../../components/ui/KpiCards';
import { RecentBatchesWidget } from './RecentBatchesWidget';
import { FifoAllocationCard } from './FifoAllocationCard';
import { ImportantAlertsCard } from './ImportantAlertsCard';
import { RecentDispatchHistoryCard } from './RecentDispatchHistoryCard';
import { StockCommodityChart } from './StockCommodityChart';

export const DashboardView: React.FC = () => {
  const { currentUser, user, selectedWarehouseScope, setWarehouseScope } = useStore();
  const displayName = currentUser?.fullName || user.name;
  const displayRole = currentUser?.roleTitle || user.role;
  const warehouseName = currentUser?.warehouseName || user.location;
  const userInitials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <div data-page="dashboard" className="space-y-6 max-w-[1536px] mx-auto pb-12">
      {/* Welcome Section with Supervisor Oversight & Depot Scope Selector */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5 w-full">
          {/* Left: Avatar + Heading + Compact Inline Meta Labels */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-lg shadow-2xs shrink-0 ring-4 ring-blue-50">
              {userInitials}
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                  Welcome back, {displayName.split(' ')[0]}
                </h1>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">— Here's your warehouse overview.</span>
              </div>
              {/* Compact Inline Labels (No bullets, clean pills) */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap shadow-2xs">
                  👑 Supervisor Oversight
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                  📍 {warehouseName}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Telemetry Active
                </span>
              </div>
            </div>
          </div>

          {/* Depot Scope Selector & Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start 2xl:self-center">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-semibold whitespace-nowrap">Depot Scope:</span>
              <select
                value={selectedWarehouseScope}
                onChange={(e) => setWarehouseScope(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="ALL">All Depots (State Central Scope)</option>
                <option value="GDN-NGP-01">GDN-NGP-01 (Surajpur / Nagpur Depot)</option>
                <option value="GDN-PUN-02">GDN-PUN-02 (Pune Buffer Depot)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/manager-tasks"
                className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Task Follow-up</span>
              </Link>

              <Link
                to="/stock-allocation"
                className="px-3.5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Receive Stock</span>
              </Link>

              <Link
                to="/inventory"
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>Batch Ledger</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Four Equal KPI Cards */}
      <KpiCards />

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (Flexible width) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Compact Recent Batches (Top 5 only, links to /inventory) */}
          <RecentBatchesWidget />

          {/* FIFO Allocation Preview Card */}
          <FifoAllocationCard />
        </div>

        {/* Right Rail (Fixed width ~385px at 1536 viewport) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Stock by Commodity Donut/Bar */}
          <StockCommodityChart />

          {/* Critical Alerts (Top 4 only, links to /alerts) */}
          <ImportantAlertsCard />

          {/* Recent Dispatches (Top 4 only, links to /dispatch) */}
          <RecentDispatchHistoryCard />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
