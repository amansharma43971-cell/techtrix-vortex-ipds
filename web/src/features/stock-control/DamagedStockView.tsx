import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { DamagedStockRecord } from '../../data/types';

export const DamagedStockView: React.FC = () => {
  const { currentUser, batches } = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
              Stock Isolation Guard
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Damaged &amp; Held Stock</h1>
          <p className="text-xs text-slate-500 mt-1">
            Isolate, record, and monitor spoiled or questionable commodity stock. Held stock is strictly quarantined from FIFO allocation until authorized lab clearance.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all">
            + Report Damaged Stock
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Affected Bags</p>
          <h3 className="text-2xl font-black text-rose-700 font-mono mt-1">75 Bags</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">3.75 MT quarantined</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Quarantine Hold</p>
          <h3 className="text-2xl font-black text-amber-600 font-mono mt-1">2 Batches</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting aeration / assay</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Disposal Requested</p>
          <h3 className="text-2xl font-black text-purple-700 font-mono mt-1">1 Consignment</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Pest damage failure</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Recheck Required</p>
          <h3 className="text-2xl font-black text-blue-700 font-mono mt-1">1 Batch</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Packaging restitch</p>
        </div>
      </div>
    </div>
  );
};

export default DamagedStockView;
