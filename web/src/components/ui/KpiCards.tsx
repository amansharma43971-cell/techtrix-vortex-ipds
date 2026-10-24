import React from 'react';
import { Package, CheckCircle, AlertTriangle, Truck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatNumber } from '../../lib/format';

export const KpiCards: React.FC = () => {
  const { batches, highlightChanged } = useStore();

  // Compute live values from batches
  const totalBags = batches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
  const totalMT = (totalBags * 0.05).toFixed(1);

  const eligibleBatches = batches.filter((b) => (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') && b.availableQuantity > 0);
  const availableBags = eligibleBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
  const eligibleBatchesCount = eligibleBatches.length;

  const pendingBatches = batches.filter((b) => b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation');
  const pendingBags = pendingBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
  const pendingCount = pendingBatches.length;

  const holdRejectedBatches = batches.filter((b) => b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected');
  const holdRejectedBags = holdRejectedBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
  const holdRejectedCount = holdRejectedBatches.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch w-full mb-6">
      {/* 1. Total Stock */}
      <div
        className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all h-full ${
          highlightChanged ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Total Stock
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-[28px] font-black text-slate-900 font-mono tracking-tight leading-none">
              {formatNumber(totalBags)} <span className="text-xs font-normal text-slate-500 font-sans">Bags</span>
            </div>
            <div className="text-[12px] text-slate-500 mt-2 flex items-center justify-between">
              <span>{totalMT} MT in godown</span>
              <span className="text-blue-600 font-semibold">{batches.length} lots</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0B4DA8] hover:text-[#08387D]">
          <span>View Details</span>
          <span className="text-slate-400">→</span>
        </div>
      </div>

      {/* 2. Available for Dispatch */}
      <div
        className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all h-full ${
          highlightChanged ? 'ring-2 ring-emerald-400' : ''
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Available Stock
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-[28px] font-black text-emerald-700 font-mono tracking-tight leading-none">
              {formatNumber(availableBags)} <span className="text-xs font-normal text-slate-500 font-sans">Bags</span>
            </div>
            <div className="text-[12px] text-slate-500 mt-2 flex items-center justify-between">
              <span>{(availableBags * 0.05).toFixed(1)} MT FIFO-ready</span>
              <span className="text-emerald-600 font-semibold">{eligibleBatchesCount} lots cleared</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 hover:text-emerald-900">
          <span>View Details</span>
          <span className="text-slate-400">→</span>
        </div>
      </div>

      {/* 3. Needs Inspection */}
      <div
        className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all h-full ${
          highlightChanged ? 'ring-2 ring-amber-400' : ''
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Inspections
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-[28px] font-black text-amber-600 font-mono tracking-tight leading-none">
              {formatNumber(pendingBags)} <span className="text-xs font-normal text-slate-500 font-sans">Bags</span>
            </div>
            <div className="text-[12px] text-slate-500 mt-2 flex items-center justify-between">
              <span>{(pendingBags * 0.05).toFixed(1)} MT lab assay pending</span>
              <span className="text-amber-700 font-semibold">{pendingCount} lots</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 hover:text-amber-900">
          <span>View Details</span>
          <span className="text-slate-400">→</span>
        </div>
      </div>

      {/* 4. On Hold / Rejected */}
      <div
        className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-rose-400 hover:shadow-md transition-all h-full ${
          highlightChanged ? 'ring-2 ring-rose-400' : ''
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Dispatches in Progress
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-[28px] font-black text-rose-600 font-mono tracking-tight leading-none">
              {formatNumber(holdRejectedBags)} <span className="text-xs font-normal text-slate-500 font-sans">Bags</span>
            </div>
            <div className="text-[12px] text-slate-500 mt-2 flex items-center justify-between">
              <span>{(holdRejectedBags * 0.05).toFixed(1)} MT quarantined</span>
              <span className="text-rose-700 font-semibold">{holdRejectedCount} lots blocked</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-700 hover:text-rose-900">
          <span>View Details</span>
          <span className="text-slate-400">→</span>
        </div>
      </div>
    </div>
  );
};
