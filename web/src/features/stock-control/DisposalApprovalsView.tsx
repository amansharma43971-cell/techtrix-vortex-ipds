import React from 'react';
import { useStore } from '../../store/useStore';

export const DisposalApprovalsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
            Condemnation &amp; Write-off
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">Disposal &amp; Write-off Approval</h1>
          <p className="text-xs text-slate-500 mt-1">
            Formal condemnation workflow for certified unrecoverable stock. Ledger deduction occurs exclusively upon recording certified completion.
          </p>
        </div>
        <button className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all">
          + Submit Disposal Request
        </button>
      </div>
    </div>
  );
};

export default DisposalApprovalsView;
