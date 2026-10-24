import React from 'react';
import { useStore } from '../../store/useStore';

export const StockTransfersView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
            Inter-Depot Transit Ledger
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">Stock Transfer &amp; Relocation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Execute controlled inter-depot movements and bay transfers. Preserves original batch arrival timestamps and quality assay records.
          </p>
        </div>
        <button className="px-4 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all">
          + New Transfer Request
        </button>
      </div>
    </div>
  );
};

export default StockTransfersView;
