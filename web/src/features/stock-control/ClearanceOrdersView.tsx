import React from 'react';
import { useStore } from '../../store/useStore';

export const ClearanceOrdersView: React.FC = () => {
  const { currentUser } = useStore();

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
            Bay Clearance Protocol
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">Godown Clearance Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Issue and supervise complete godown bay clearances for routine reorganization, new harvest intake space, or damaged stock segregation.
          </p>
        </div>
        <button className="px-4 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all">
          + Issue Clearance Order
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Active Orders</p>
          <h3 className="text-2xl font-black text-amber-600 font-mono mt-1">1 Bay</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Movement in progress</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Scheduled Volume</p>
          <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">75 Bags</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Authorized relocations</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Cleared &amp; Restocked</p>
          <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">1 Bay Ready</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Inspection complete</p>
        </div>
      </div>
    </div>
  );
};

export default ClearanceOrdersView;
