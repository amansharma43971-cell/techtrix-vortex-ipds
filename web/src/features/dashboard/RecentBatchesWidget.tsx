import React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ArrowRight, Star, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatNumber, calculateAgeDays } from '../../lib/format';
import { DEMO_TODAY } from '../../data/seedData';

export const RecentBatchesWidget: React.FC = () => {
  const { batches, setSelectedBatch } = useStore();

  // Top 5 most recently arrived or prioritized batches
  const recentBatches = batches.slice(0, 5);

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B4DA8] flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Recent Grain Batches</h3>
            <p className="text-[11px] text-slate-500">Latest active storage lots in Surajpur depot</p>
          </div>
        </div>

        <Link
          to="/inventory"
          className="text-xs font-semibold text-[#0B4DA8] hover:text-[#0A2F6B] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>View all in Inventory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold select-none">
            <tr>
              <th className="py-2.5 px-3">Batch ID</th>
              <th className="py-2.5 px-3">Commodity</th>
              <th className="py-2.5 px-3">Arrival Date</th>
              <th className="py-2.5 px-3 text-right">Available</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {recentBatches.map((batch, index) => {
              const isFirst = index === 0 && batch.qualityStatus === 'Eligible';
              const age = calculateAgeDays(batch.arrivalDate, DEMO_TODAY);

              return (
                <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                    {isFirst && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                    <span>{batch.id}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {batch.commodity}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                    {batch.arrivalDate}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatNumber(batch.availableQuantity)} Bags
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusPill status={batch.qualityStatus} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setSelectedBatch(batch)}
                      className="p-1 rounded text-slate-500 hover:text-[#0B4DA8] hover:bg-slate-100 cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

