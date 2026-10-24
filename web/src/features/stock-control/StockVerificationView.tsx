import React from 'react';
import { useStore } from '../../store/useStore';

export const StockVerificationView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            Audit &amp; Reconciliation
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">Physical Stock Verification</h1>
          <p className="text-xs text-slate-500 mt-1">
            Cycle count audits comparing system snapshot ledger records with physical godown stack counts. Discrepancies require formal Manager reconciliation.
          </p>
        </div>
        <button className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all">
          + Initiate Count Audit
        </button>
      </div>
    </div>
  );
};

export default StockVerificationView;
