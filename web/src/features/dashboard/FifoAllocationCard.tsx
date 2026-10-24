import React, { useState } from 'react';
import { Truck, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { calculateFifoAllocation } from '../../lib/fifo';
import { formatNumber } from '../../lib/format';

export const FifoAllocationCard: React.FC = () => {
  const { batches, dispatchFormCommodity, dispatchFormQuantity, setDispatchFormField } = useStore();

  const [inputQty, setInputQty] = useState<number>(dispatchFormQuantity);

  // Run allocation preview based on current commodity and input quantity
  const allocationResult = calculateFifoAllocation(batches, dispatchFormCommodity, inputQty);

  const handleAllocateClick = () => {
    setDispatchFormField('quantity', inputQty);
  };

  const handleQtyChange = (val: number) => {
    setInputQty(val);
    setDispatchFormField('quantity', val);
  };

  // Combine allocated batches + next in queue
  const displayPlanRows = [...allocationResult.allocations];
  if (allocationResult.nextInQueue) {
    displayPlanRows.push(allocationResult.nextInQueue);
  }

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EBF3FE] text-[#1D6FE8] flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <h3 className="text-[16px] font-bold text-[#0F172A]">FIFO Allocation (For Dispatch)</h3>
        </div>
        <p className="text-[12px] text-[#64748B] mt-1">
          Automatically selects the oldest eligible batch first.
        </p>
      </div>

      {/* Light-Blue Tinted Input Box */}
      <div className="p-4 rounded-lg bg-[#F0F6FE] border border-[#BFD7FB] space-y-2">
        <label className="text-[13px] font-semibold text-[#1E293B] block">
          Required Dispatch Quantity ({dispatchFormCommodity})
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              min="1"
              step="10"
              value={inputQty || ''}
              onChange={(e) => handleQtyChange(Number(e.target.value))}
              placeholder="e.g. 120"
              className="w-full px-3 py-2 pr-14 text-sm font-mono font-bold rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
            />
            <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-500 pointer-events-none">
              Bags
            </span>
          </div>

          <button
            type="button"
            onClick={handleAllocateClick}
            className="px-5 py-2 rounded-lg bg-[#1D6FE8] hover:bg-[#1858BA] text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Allocate
          </button>
        </div>
      </div>

      {/* Shortfall Banner if requested > available */}
      {allocationResult.isShortfall && (
        <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
            Stock Shortfall Alert
          </div>
          <p>
            Requested <strong>{inputQty} Bags</strong> exceeds total available eligible {dispatchFormCommodity} stock (
            <strong>{allocationResult.totalAllocatedBags} Bags</strong>). Shortfall:{' '}
            <strong>{allocationResult.shortfallBags} Bags</strong>.
          </p>
        </div>
      )}

      {/* Allocation Plan Table */}
      <div className="space-y-2">
        <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider block">
          Allocation Plan
        </span>

        <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Batch ID</th>
                <th className="py-2.5 px-3 text-right">Quantity Allocated</th>
                <th className="py-2.5 px-3 text-right">Remaining Stock</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {displayPlanRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    No eligible batches to allocate.
                  </td>
                </tr>
              ) : (
                displayPlanRows.map((item, idx) => (
                  <tr key={item.batchId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-[#0F172A] block leading-tight">
                        {item.batchId}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono leading-tight">
                        {item.arrivalDate}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A] tabular-nums">
                      {item.allocatedBags} Bags
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#64748B] tabular-nums">
                      {item.remainingBags} Bags
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.allocatedBags > 0
                            ? 'bg-[#D6F5E3] text-[#11803F]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.allocatedBags > 0 ? 'Allocated' : 'Queue Next'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Note Bar at Bottom */}
      <div className="p-2.5 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] text-[12px] text-[#1E40AF] flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0 text-[#1D6FE8]" />
        <span>FIFO rule applied. Oldest eligible batches are selected first.</span>
      </div>
    </div>
  );
};

