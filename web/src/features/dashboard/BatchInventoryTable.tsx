import React, { useState, useMemo } from 'react';
import { Plus, Search, MoreVertical, Eye, Star, ChevronLeft, ChevronRight, ShieldCheck, AlertTriangle, Ban } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { BatchItem, CommodityType, QualityStatus } from '../../data/types';
import { calculateAgeDays, formatNumber } from '../../lib/format';
import { getNextToDispatchBatchId } from '../../lib/fifo';

interface BatchInventoryTableProps {
  onOpenAddModal: () => void;
  onOpenStatusModal: (batchId: string, action: 'Hold' | 'Eligible' | 'Rejected') => void;
}

export const BatchInventoryTable: React.FC<BatchInventoryTableProps> = ({
  onOpenAddModal,
  onOpenStatusModal
}) => {
  const { batches, setSelectedBatch, highlightChanged } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<'ALL' | CommodityType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QualityStatus>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<keyof BatchItem>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Oldest eligible batch star badge per commodity
  const starWheat = useMemo(() => getNextToDispatchBatchId(batches, 'Wheat'), [batches]);
  const starRice = useMemo(() => getNextToDispatchBatchId(batches, 'Rice'), [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = b.id.toLowerCase().includes(q);
        const matchesComm = b.commodity.toLowerCase().includes(q);
        if (!matchesId && !matchesComm) return false;
      }

      if (commodityFilter !== 'ALL' && b.commodity !== commodityFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && b.qualityStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [batches, searchQuery, commodityFilter, statusFilter]);

  const handleSort = (field: keyof BatchItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-5">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A] leading-tight">Batch Inventory</h2>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            View and manage all commodity batches with status and stock details.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 rounded-[7px] bg-[#1D6FE8] hover:bg-[#1858BA] text-white text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Batch</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by batch ID or commodity..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
          />
        </div>

        {/* Commodity Filter */}
        <select
          value={commodityFilter}
          onChange={(e) => setCommodityFilter(e.target.value as any)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
        >
          <option value="ALL">All Commodities</option>
          <option value="Wheat">Wheat</option>
          <option value="Rice">Rice</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
        >
          <option value="ALL">All Statuses</option>
          <option value="Pending Inspection">Pending Inspection</option>
          <option value="Eligible">Eligible</option>
          <option value="Hold">Hold</option>
          <option value="Rejected">Rejected</option>
          <option value="Exhausted">Exhausted</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                >
                  Batch ID
                </th>
                <th
                  onClick={() => handleSort('commodity')}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                >
                  Commodity
                </th>
                <th
                  onClick={() => handleSort('arrivalDate')}
                  className="py-3 px-3.5 cursor-pointer hover:text-slate-900 select-none"
                >
                  Arrival Date
                </th>
                <th className="py-3 px-3.5 text-right">Total Quantity</th>
                <th className="py-3 px-3.5 text-right">Available Qty</th>
                <th className="py-3 px-3.5 text-center">Quality Status</th>
                <th className="py-3 px-3.5 text-center">Age (Days)</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No batches found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const ageDays = calculateAgeDays(batch.arrivalDate);
                  const isOldestEligible =
                    (batch.commodity === 'Wheat' && starWheat === batch.id) ||
                    (batch.commodity === 'Rice' && starRice === batch.id);

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        highlightChanged ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      {/* Batch ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-[#0F172A] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{batch.id}</span>
                          {isOldestEligible && (
                            <span
                              title="Next to dispatch (FIFO Priority)"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-sans font-bold"
                            >
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Next
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Commodity */}
                      <td className="py-3 px-3.5 font-medium text-[#0F172A]">
                        {batch.commodity}
                      </td>

                      {/* Arrival Date */}
                      <td className="py-3 px-3.5 font-mono text-[#475569]">
                        {batch.arrivalDate}
                      </td>

                      {/* Total Quantity */}
                      <td className="py-3 px-3.5 text-right font-mono text-[#64748B] tabular-nums">
                        {formatNumber(batch.totalQuantity)} Bags
                      </td>

                      {/* Available Qty */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-[#0F172A] tabular-nums">
                        {formatNumber(batch.availableQuantity)} Bags
                      </td>

                      {/* Quality Status Pill */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium leading-none ${
                            batch.qualityStatus === 'Eligible'
                              ? 'bg-[#D6F5E3] text-[#11803F]'
                              : batch.qualityStatus === 'Pending Inspection'
                              ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]'
                              : batch.qualityStatus === 'Hold'
                              ? 'bg-[#FDE9B8] text-[#8A5A00]'
                              : batch.qualityStatus === 'Rejected'
                              ? 'bg-[#FDDCDC] text-[#B42318]'
                              : 'bg-[#ECEEF2] text-[#64748B]'
                          }`}
                        >
                          {batch.qualityStatus}
                        </span>
                      </td>

                      {/* Age (Days) */}
                      <td className="py-3 px-3.5 text-center font-mono text-[#0F172A] tabular-nums">
                        {ageDays} Days
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          {/* Light-blue View Button */}
                          <button
                            onClick={() => setSelectedBatch(batch)}
                            className="px-2.5 py-1 rounded-[6px] bg-[#E6F0FE] text-[#1D6FE8] hover:bg-[#D4E5FD] font-semibold text-xs transition-colors cursor-pointer"
                          >
                            View
                          </button>

                          {/* ⋮ Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === batch.id ? null : batch.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label="Batch actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Popover */}
                          {activeMenuId === batch.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-xl border border-[#E3E8F0] py-1.5 z-40 text-left text-xs animate-in fade-in duration-100"
                            >
                              {batch.qualityStatus !== 'Hold' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onOpenStatusModal(batch.id, 'Hold');
                                  }}
                                  className="w-full px-3 py-1.5 text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  Put on Hold
                                </button>
                              )}

                              {batch.qualityStatus !== 'Eligible' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onOpenStatusModal(batch.id, 'Eligible');
                                  }}
                                  className="w-full px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  Release Hold
                                </button>
                              )}

                              {batch.qualityStatus !== 'Rejected' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onOpenStatusModal(batch.id, 'Rejected');
                                  }}
                                  className="w-full px-3 py-1.5 text-red-700 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Ban className="w-3.5 h-3.5 text-red-500" />
                                  Reject Batch
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setSelectedBatch(batch);
                                }}
                                className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 mt-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                View History
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination / Record count */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>
            Showing 1 to {filteredBatches.length} of {batches.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled
              className="p-1 rounded border border-slate-200 text-slate-300 cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-900">
              1
            </span>
            <button
              disabled
              className="p-1 rounded border border-slate-200 text-slate-300 cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

