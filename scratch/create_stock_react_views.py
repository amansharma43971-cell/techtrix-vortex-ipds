import os

os.makedirs('web/src/features/stock-control', exist_ok=True)

damaged_stock_view = """import React, { useState } from 'react';
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
"""

clearance_orders_view = """import React from 'react';
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
"""

stock_transfers_view = """import React from 'react';
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
"""

stock_verify_view = """import React from 'react';
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
"""

disposal_view = """import React from 'react';
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
"""

with open('web/src/features/stock-control/DamagedStockView.tsx', 'w', encoding='utf-8') as f:
    f.write(damaged_stock_view)

with open('web/src/features/stock-control/ClearanceOrdersView.tsx', 'w', encoding='utf-8') as f:
    f.write(clearance_orders_view)

with open('web/src/features/stock-control/StockTransfersView.tsx', 'w', encoding='utf-8') as f:
    f.write(stock_transfers_view)

with open('web/src/features/stock-control/StockVerificationView.tsx', 'w', encoding='utf-8') as f:
    f.write(stock_verify_view)

with open('web/src/features/stock-control/DisposalApprovalsView.tsx', 'w', encoding='utf-8') as f:
    f.write(disposal_view)

print("All 5 React stock-control feature components created successfully.")

