import React from 'react';
import { Truck } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const RecentDispatchHistoryCard: React.FC = () => {
  const { dispatches, setActiveRoute } = useStore();

  return (
    <div className="p-5 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#0F172A]">Recent Dispatch History</h3>
        <button
          onClick={() => setActiveRoute('dispatch')}
          className="text-[13px] font-semibold text-[#1D6FE8] hover:underline cursor-pointer"
        >
          View All →
        </button>
      </div>

      {/* Dispatch Rows */}
      <div className="divide-y divide-[#F1F5F9] text-xs">
        {dispatches.slice(0, 5).map((disp) => (
          <div
            key={disp.id}
            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Circular Icon */}
              <div className="w-9 h-9 rounded-full bg-[#EBF3FE] text-[#1D6FE8] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1D6FE8] text-[13px]">
                    {disp.id}
                  </span>
                  <span className="font-bold text-[#0F172A] text-[13px]">
                    {disp.commodity} {disp.quantityBags} Bags
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                  <span>{disp.dispatchDate}</span>
                  <span>•</span>
                  <span>Batch: {disp.batchesUsed.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Status Pill */}
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#D6F5E3] text-[#11803F] shrink-0">
              Completed
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

