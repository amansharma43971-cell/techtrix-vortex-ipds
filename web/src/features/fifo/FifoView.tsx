import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  Filter,
  RotateCcw,
  Download,
  Plus,
  X,
  FileText,
  Truck,
  Building,
  Check,
  Eye,
  Calendar,
  AlertCircle,
  Hash,
  MapPin,
  TrendingDown
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { runSmartFifoAllocation } from '../../lib/fifo';
import { CommodityType, AllocationRequest, AllocationRequestStatus, AllocatedBatchLine } from '../../data/types';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatNumber, calculateAgeDays } from '../../lib/format';
import { FPS_DESTINATIONS } from '../../data/seedData';

export const FifoView: React.FC = () => {
  const {
    batches,
    allocationRequests,
    createAllocationRequest,
    cancelAllocationRequest,
    dispatchAllocationRequest,
    approveAllocationRequest,
    user,
    setToast,
    setActiveRoute
  } = useStore();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [destinationFilter, setDestinationFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailModalRequest, setDetailModalRequest] = useState<AllocationRequest | null>(null);
  const [dispatchConfirmRequest, setDispatchConfirmRequest] = useState<AllocationRequest | null>(null);

  // 1. DYNAMIC SUMMARY METRICS
  const stats = useMemo(() => {
    // Total eligible unreserved stock
    let totalEligibleUnreserved = 0;
    let stockBlockedByQuality = 0;

    batches.forEach((b) => {
      const isEligible = b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved';
      if (isEligible) {
        const unreserved = Math.max(0, b.availableQuantity - (b.reservedQuantity || 0));
        totalEligibleUnreserved += unreserved;
      } else if (
        b.qualityStatus === 'Hold' ||
        b.qualityStatus === 'Rejected' ||
        b.qualityStatus === 'Pending Inspection' ||
        b.qualityStatus === 'Pending Allocation' ||
        b.qualityStatus === 'Reinspection Required'
      ) {
        stockBlockedByQuality += b.availableQuantity;
      }
    });

    let pendingCount = 0;
    let fullyAllocatedCount = 0;
    let partiallyAllocatedCount = 0;
    let dispatchedCount = 0;

    allocationRequests.forEach((r) => {
      if (r.status === 'Draft' || r.status === 'Pending Approval') {
        pendingCount++;
      } else if (r.status === 'Allocated') {
        fullyAllocatedCount++;
      } else if (r.status === 'Partially Allocated') {
        partiallyAllocatedCount++;
      } else if (r.status === 'Dispatched') {
        dispatchedCount++;
      }
    });

    return {
      totalEligibleUnreserved,
      pendingCount,
      fullyAllocatedCount,
      partiallyAllocatedCount,
      stockBlockedByQuality,
      dispatchedCount
    };
  }, [batches, allocationRequests]);

  // Filtered allocation requests
  const filteredRequests = useMemo(() => {
    return allocationRequests.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const mId = r.id.toLowerCase().includes(q);
        const mRef = (r.referenceNo || '').toLowerCase().includes(q);
        const mDest = r.destination.toLowerCase().includes(q);
        const mNotes = (r.notes || '').toLowerCase().includes(q);
        const mComm = r.commodity.toLowerCase().includes(q);
        if (!mId && !mRef && !mDest && !mNotes && !mComm) return false;
      }

      if (commodityFilter !== 'ALL' && r.commodity !== commodityFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (destinationFilter !== 'ALL' && r.destination !== destinationFilter) return false;

      return true;
    });
  }, [allocationRequests, searchQuery, commodityFilter, statusFilter, destinationFilter]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Request ID',
      'Reference No',
      'Commodity',
      'Requested Bags',
      'Allocated Bags',
      'Shortfall Bags',
      'Destination',
      'Requested Date',
      'Status',
      'Created By',
      'Created At',
      'Dispatched At',
      'Notes'
    ];
    const rows = filteredRequests.map((r) => [
      r.id,
      r.referenceNo,
      r.commodity,
      r.requiredQuantityBags,
      r.allocatedBags,
      r.shortfallBags,
      `"${r.destination.replace(/"/g, '""')}"`,
      r.requestedDate,
      r.status,
      r.createdBy,
      r.createdAt,
      r.dispatchedAt || 'N/A',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BhandarSetu_FIFO_Allocation_Requests_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-page="fifo" className="space-y-6 max-w-[1536px] mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              FIFO Allocation &amp; Reservation Engine
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">Policy-Driven Stock Allocator</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-[#0B4DA8]" />
            Smart FIFO Allocation &amp; Reservation Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic arrival-sequence allocation, two-tier reservation locking, shortage detection, and auditable dispatch integration
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0B4DA8] hover:bg-[#08387D] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Allocation Request</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-Step Guided Process Ribbon */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">FIFO Engine Process</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">System Flow</span>
          </div>
          <span className="text-xs text-slate-500">Oldest sound stock is automatically dispatched first</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0B4DA8] font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <div className="font-bold text-slate-900">Select Request</div>
              <div className="text-[10px] text-slate-500">Choose FPS order</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">2</div>
            <div>
              <div className="font-bold text-slate-900">Review Oldest</div>
              <div className="text-[10px] text-slate-500">Earliest arrival lots</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <div className="font-bold text-slate-900">Preview Allocation</div>
              <div className="text-[10px] text-slate-500">Inspect lot breakdown</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">4</div>
            <div>
              <div className="font-bold text-slate-900">Confirm &amp; Stage</div>
              <div className="text-[10px] text-slate-500">Send to dispatch gate</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC SUMMARY METRIC CARDS (4 PRIMARY METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Eligible Unreserved Stock */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Eligible Stock</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">{formatNumber(stats.totalEligibleUnreserved)}</span>
            <span className="text-xs text-slate-500 font-mono">Bags</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Available for FIFO allocation</p>
        </div>

        {/* Pending Requests */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'Pending Approval' ? 'ALL' : 'Pending Approval'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Pending Approval'
              ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pending Requests</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-900 font-mono">{stats.pendingCount}</span>
            <span className="text-xs text-slate-500 font-mono">Orders</span>
          </div>
          <p className="text-[11px] text-purple-700 font-medium mt-1">Awaiting FIFO allocation &amp; sign-off</p>
        </div>

        {/* Fully Allocated */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'Allocated' ? 'ALL' : 'Allocated'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Allocated'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fully Allocated</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-900 font-mono">{stats.fullyAllocatedCount}</span>
            <span className="text-xs text-slate-500 font-mono">Orders</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">100% fulfilled &amp; reserved for dispatch</p>
        </div>

        {/* Stock Blocked by Quality */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Blocked by Quality</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-900 font-mono">{formatNumber(stats.stockBlockedByQuality)}</span>
            <span className="text-xs text-slate-500 font-mono">Bags</span>
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Hold / Rejected quarantine in Bay Q</p>
        </div>
      </div>

      {/* 3. ALLOCATION REQUESTS QUEUE & TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Request ID, Challan, Destination, Notes..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Commodity Filter */}
            <select
              value={commodityFilter}
              onChange={(e) => { setCommodityFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Commodities</option>
              <option value="Wheat">Wheat</option>
              <option value="Rice">Rice</option>
              <option value="Sugar">Sugar</option>
              <option value="Pulses">Pulses</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Allocated">Allocated</option>
              <option value="Partially Allocated">Partially Allocated</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Destination Filter */}
            <select
              value={destinationFilter}
              onChange={(e) => { setDestinationFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
            >
              <option value="ALL">All Destinations</option>
              {FPS_DESTINATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Reset */}
            {(searchQuery || commodityFilter !== 'ALL' || statusFilter !== 'ALL' || destinationFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCommodityFilter('ALL');
                  setStatusFilter('ALL');
                  setDestinationFilter('ALL');
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. ALLOCATION REQUESTS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4 text-right">Requested Qty</th>
                <th className="py-3 px-4 text-right">Allocated Qty</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Batches Assigned</th>
                <th className="py-3 px-4">Dispatch Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-10 h-10 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No allocation requests found.</p>
                      <p className="text-xs text-slate-400">Click &quot;New Allocation Request&quot; above to create a request.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => {
                  const isAllocated = r.status === 'Allocated' || r.status === 'Partially Allocated';
                  const isPendingApproval = r.status === 'Pending Approval';
                  const isDispatched = r.status === 'Dispatched';
                  const isCancelled = r.status === 'Cancelled';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Request ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div>{r.id}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Ref: {r.referenceNo}</div>
                      </td>

                      {/* Commodity */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{r.commodity}</span>
                      </td>

                      {/* Destination */}
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={r.destination}>
                        <div className="font-medium truncate">{r.destination}</div>
                        <div className="text-[10px] text-slate-400">By {r.createdBy}</div>
                      </td>

                      {/* Requested Qty */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNumber(r.requiredQuantityBags)} Bags
                      </td>

                      {/* Allocated Qty */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="font-bold text-slate-900">{formatNumber(r.allocatedBags)} Bags</span>
                        {r.shortfallBags > 0 && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            Shortfall: {formatNumber(r.shortfallBags)} Bags
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === 'Allocated'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : r.status === 'Partially Allocated'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : r.status === 'Pending Approval'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : r.status === 'Dispatched'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {r.status === 'Allocated' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {r.status === 'Partially Allocated' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {r.status === 'Pending Approval' && <Clock className="w-3 h-3 text-purple-600" />}
                          {r.status === 'Dispatched' && <Truck className="w-3 h-3 text-blue-600" />}
                          <span>{r.status}</span>
                        </span>
                      </td>

                      {/* Batches Assigned */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {r.allocatedBatches && r.allocatedBatches.length > 0 ? (
                            r.allocatedBatches.map((b) => (
                              <span
                                key={b.batchId}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-800 border border-blue-100"
                                title={`Rank ${b.fifoRank}: ${b.allocatedBags} Bags from ${b.batchId} (${b.arrivalDate})`}
                              >
                                {b.batchId} ({b.allocatedBags}B)
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px]">No batches</span>
                          )}
                        </div>
                      </td>

                      {/* Dispatch Date */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        <div>{r.requestedDate}</div>
                        {r.dispatchedAt && (
                          <div className="text-[10px] text-blue-700 font-semibold">
                            Dispatched: {r.dispatchId}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* View Details */}
                        <button
                          onClick={() => setDetailModalRequest(r)}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="View FIFO Batch Allocation Breakdown"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          <span>View Plan</span>
                        </button>

                        {/* Approve (If Pending Approval) */}
                        {isPendingApproval && (
                          <button
                            onClick={() => {
                              approveAllocationRequest(r.id);
                              setToast({
                                id: `t-${Date.now()}`,
                                type: 'success',
                                message: `Request ${r.id} approved by Food Officer and locked for dispatch.`
                              });
                            }}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        {/* Dispatch Button (If Allocated) */}
                        {isAllocated && (
                          <button
                            onClick={() => setDispatchConfirmRequest(r)}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5 inline mr-1" />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {/* Cancel / Release Reservation */}
                        {!isDispatched && !isCancelled && (
                          <button
                            onClick={() => {
                              if (confirm(`Cancel Allocation Request ${r.id} and release ${r.allocatedBags} reserved bags back to available pool?`)) {
                                cancelAllocationRequest(r.id);
                                setToast({
                                  id: `t-${Date.now()}`,
                                  type: 'info',
                                  message: `Request ${r.id} cancelled. ${r.allocatedBags} Bags released back to available inventory.`
                                });
                              }
                            }}
                            className="px-2 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                            title="Cancel Request and Release Reserved Stock"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Counter */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredRequests.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(page * pageSize, filteredRequests.length)}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredRequests.length}</span> requests
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-2 font-mono font-medium text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CREATE ALLOCATION REQUEST MODAL WITH LIVE FIFO PREVIEW */}
      {showCreateModal && (
        <CreateAllocationRequestModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => {
            const res = createAllocationRequest(data);
            if (res.success) {
              setShowCreateModal(false);
              setToast({
                id: `t-${Date.now()}`,
                type: 'success',
                message: `Allocation request ${res.requestId} generated and inventory reserved!`
              });
            } else {
              alert(res.error || 'Failed to create allocation request');
            }
          }}
        />
      )}

      {/* 6. REQUEST DETAILS & BATCH BREAKDOWN MODAL */}
      {detailModalRequest && (
        <RequestDetailModal
          request={detailModalRequest}
          onClose={() => setDetailModalRequest(null)}
          onDispatch={(req) => {
            setDetailModalRequest(null);
            setDispatchConfirmRequest(req);
          }}
          onCancel={(req) => {
            setDetailModalRequest(null);
            cancelAllocationRequest(req.id);
            setToast({
              id: `t-${Date.now()}`,
              type: 'info',
              message: `Request ${req.id} cancelled and stock reservations released.`
            });
          }}
        />
      )}

      {/* 7. DISPATCH CONFIRMATION MODAL */}
      {dispatchConfirmRequest && (
        <DispatchConfirmationModal
          request={dispatchConfirmRequest}
          onClose={() => setDispatchConfirmRequest(null)}
          onConfirm={(req) => {
            const res = dispatchAllocationRequest(req.id);
            setDispatchConfirmRequest(null);
            if (res.success) {
              setToast({
                id: `t-${Date.now()}`,
                type: 'success',
                message: `Dispatch ${res.dispatchId} recorded! Physical stock deducted from godown inventory.`
              });
            } else {
              alert(res.error || 'Dispatch failed');
            }
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// CREATE ALLOCATION REQUEST MODAL WITH LIVE FIFO PREVIEW
// ============================================================================
interface CreateModalProps {
  onClose: () => void;
  onSubmit: (data: {
    commodity: CommodityType;
    requiredQuantityBags: number;
    destination: string;
    requestedDate: string;
    referenceNo: string;
    notes?: string;
  }) => void;
}

const CreateAllocationRequestModal: React.FC<CreateModalProps> = ({ onClose, onSubmit }) => {
  const { batches } = useStore();

  const [commodity, setCommodity] = useState<CommodityType>('Wheat');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(120);
  const [destination, setDestination] = useState<string>(FPS_DESTINATIONS[0]);
  const [requestedDate, setRequestedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState<string>(`CHL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [notes, setNotes] = useState<string>('Standard monthly allocation under NFSA scheme');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Live FIFO calculation
  const fifoPreview = useMemo(() => {
    return runSmartFifoAllocation(batches, commodity, requiredQuantity);
  }, [batches, commodity, requiredQuantity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredQuantity || requiredQuantity <= 0) {
      setErrorMsg('Please enter a valid positive quantity of bags.');
      return;
    }
    if (fifoPreview.allocations.length === 0) {
      setErrorMsg(`No unreserved eligible stock available for ${commodity}.`);
      return;
    }

    onSubmit({
      commodity,
      requiredQuantityBags: requiredQuantity,
      destination,
      requestedDate,
      referenceNo,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create FIFO Allocation Demand</h3>
              <p className="text-xs text-slate-500">
                Automated oldest-first batch selection with real-time reservation locking
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Commodity */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Commodity <span className="text-red-500">*</span>
                </label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value as CommodityType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Wheat">Wheat</option>
                  <option value="Rice">Rice</option>
                  <option value="Sugar">Sugar</option>
                  <option value="Pulses">Pulses</option>
                </select>
              </div>

              {/* Required Quantity */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Demand Quantity (Bags) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={requiredQuantity}
                  onChange={(e) => { setRequiredQuantity(Math.max(1, parseInt(e.target.value) || 0)); setErrorMsg(''); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                  ~{((requiredQuantity * 50) / 1000).toFixed(2)} Metric Tonnes
                </span>
              </div>

              {/* Requested Date */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Dispatch Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Destination */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  FPS Destination / Recipient Godown <span className="text-red-500">*</span>
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {FPS_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Reference / Challan */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Official Challan / Indent Ref <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Operational Notes / Special Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Expedited delivery for flood relief"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* LIVE FIFO PREVIEW SECTION */}
            <div className="border border-blue-200 rounded-xl bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  <span className="font-bold text-slate-900 text-sm">Real-Time FIFO Allocation Plan</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Allocated:</span>{' '}
                    <span className="font-mono font-bold text-emerald-800">{formatNumber(fifoPreview.totalAllocatedBags)} Bags</span>
                  </div>
                  {fifoPreview.shortfallBags > 0 && (
                    <div>
                      <span className="text-slate-500">Shortage:</span>{' '}
                      <span className="font-mono font-bold text-amber-800">{formatNumber(fifoPreview.shortfallBags)} Bags</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shortfall Warning Banner */}
              {fifoPreview.isShortfall && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Stock Shortage Detected ({formatNumber(fifoPreview.shortfallBags)} Bags)</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      The godown only has {formatNumber(fifoPreview.totalAllocatedBags)} Bags of unreserved eligible {commodity}. This request will be created as <strong>Partially Allocated</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Quality Blocked Info */}
              {fifoPreview.blockedStockBags > 0 && (
                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700 text-[11px] flex items-center justify-between">
                  <span>Note: <strong>{formatNumber(fifoPreview.blockedStockBags)} Bags</strong> of {commodity} are currently quarantined under Quality Hold or Rejected and excluded from FIFO.</span>
                  <span className="text-[10px] font-mono text-slate-500">BS001 Enforced</span>
                </div>
              )}

              {/* Table of Candidate Batches */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">FIFO Rank</th>
                      <th className="p-2.5">Batch ID</th>
                      <th className="p-2.5">Arrival Date &amp; Age</th>
                      <th className="p-2.5 text-right">Available Before</th>
                      <th className="p-2.5 text-right font-bold text-blue-900">Allocated Qty</th>
                      <th className="p-2.5 text-right">Remaining Stock</th>
                      <th className="p-2.5">Selection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {fifoPreview.allocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                          No eligible batches available for allocation.
                        </td>
                      </tr>
                    ) : (
                      fifoPreview.allocations.map((line) => (
                        <tr key={line.batchId} className="hover:bg-blue-50/30">
                          <td className="p-2.5 font-sans font-bold text-slate-800">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">
                              ⭐ Rank {line.fifoRank}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{line.batchId}</td>
                          <td className="p-2.5 text-slate-600">
                            <div>{line.arrivalDate}</div>
                            <span className="text-[10px] text-slate-400 font-sans">{calculateAgeDays(line.arrivalDate)}d aged</span>
                          </td>
                          <td className="p-2.5 text-right text-slate-600">{formatNumber(line.availableBeforeBags)} B</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700 bg-emerald-50/50">
                            {formatNumber(line.allocatedBags)} Bags
                          </td>
                          <td className="p-2.5 text-right text-slate-600">{formatNumber(line.remainingBags)} B</td>
                          <td className="p-2.5 font-sans text-slate-600 text-[11px] max-w-xs">
                            {line.selectionReason}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Allocating <strong className="text-slate-900 font-mono">{formatNumber(fifoPreview.totalAllocatedBags)}</strong> of{' '}
              <strong className="text-slate-900 font-mono">{formatNumber(requiredQuantity)} Bags</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={fifoPreview.allocations.length === 0}
                className="px-4 py-2 rounded-lg bg-[#0B4DA8] hover:bg-[#08387D] text-white font-bold text-xs shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Reserve Allocation</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// REQUEST DETAILS & FIFO BREAKDOWN MODAL
// ============================================================================
interface DetailModalProps {
  request: AllocationRequest;
  onClose: () => void;
  onDispatch: (request: AllocationRequest) => void;
  onCancel: (request: AllocationRequest) => void;
}

const RequestDetailModal: React.FC<DetailModalProps> = ({ request, onClose, onDispatch, onCancel }) => {
  const isAllocated = request.status === 'Allocated' || request.status === 'Partially Allocated';
  const isDispatched = request.status === 'Dispatched';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Allocation Plan Breakdown: {request.id}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Challan Ref: <span className="font-bold text-slate-800">{request.referenceNo}</span> • Commodity: <span className="font-bold text-slate-800">{request.commodity}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destination</span>
              <span className="font-semibold text-slate-800 text-xs">{request.destination}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Requested Date</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{request.requestedDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Demand / Allocated</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {formatNumber(request.allocatedBags)} / {formatNumber(request.requiredQuantityBags)} Bags
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
              <span className="mt-0.5 inline-block font-bold text-slate-800">{request.status}</span>
            </div>
          </div>

          {request.notes && (
            <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-slate-700">
              <strong>Notes:</strong> {request.notes}
            </div>
          )}

          {/* Batch Allocation Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Assigned Batches (FIFO Order)</span>
              <span className="text-xs text-slate-500 font-normal">
                {request.allocatedBatches.length} batch(es) reserved
              </span>
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Rank</th>
                    <th className="p-2.5">Batch ID</th>
                    <th className="p-2.5">Arrival Date &amp; Age</th>
                    <th className="p-2.5 text-right">Available Before</th>
                    <th className="p-2.5 text-right font-bold text-emerald-800">Allocated Bags</th>
                    <th className="p-2.5 text-right">Remaining Stock</th>
                    <th className="p-2.5">FIFO Selection Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {request.allocatedBatches.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-sans font-bold text-slate-700">⭐ {b.fifoRank}</td>
                      <td className="p-2.5 font-bold text-slate-900">{b.batchId}</td>
                      <td className="p-2.5 text-slate-600">
                        <div>{b.arrivalDate}</div>
                        <span className="text-[10px] text-slate-400 font-sans">{calculateAgeDays(b.arrivalDate)}d aged</span>
                      </td>
                      <td className="p-2.5 text-right text-slate-600">{formatNumber(b.availableBeforeBags)} B</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700 bg-emerald-50/40">
                        {formatNumber(b.allocatedBags)} Bags
                      </td>
                      <td className="p-2.5 text-right text-slate-600">{formatNumber(b.remainingBags)} B</td>
                      <td className="p-2.5 font-sans text-slate-600 text-[11px] max-w-xs">{b.selectionReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Information */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Created By:</span>
              <span className="font-semibold text-slate-800">{request.createdBy} ({request.createdAt})</span>
            </div>
            {request.dispatchedAt && (
              <div className="flex justify-between">
                <span>Dispatched At:</span>
                <span className="font-semibold text-blue-800">{request.dispatchedAt} (ID: {request.dispatchId})</span>
              </div>
            )}
            {request.cancelledAt && (
              <div className="flex justify-between">
                <span>Cancelled At:</span>
                <span className="font-semibold text-red-700">{request.cancelledAt} ({request.cancellationReason})</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            {!isDispatched && !request.cancelledAt && (
              <button
                onClick={() => onCancel(request)}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel &amp; Release Stock
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
            >
              Close
            </button>
            {isAllocated && (
              <button
                onClick={() => onDispatch(request)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm Physical Dispatch</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DISPATCH CONFIRMATION MODAL
// ============================================================================
interface DispatchModalProps {
  request: AllocationRequest;
  onClose: () => void;
  onConfirm: (request: AllocationRequest) => void;
}

const DispatchConfirmationModal: React.FC<DispatchModalProps> = ({ request, onClose, onConfirm }) => {
  const [vehicleNo, setVehicleNo] = useState('DL-01-AB-1234');
  const [driverName, setDriverName] = useState('Rameshwar Singh');
  const [gatePassNo, setGatePassNo] = useState(`GP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-blue-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Authorize Stock Dispatch</h3>
              <p className="text-xs text-blue-800">Request: {request.id} ({request.allocatedBags} Bags)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600">
            Confirm physical lifting of <strong>{request.allocatedBags} Bags</strong> of {request.commodity} for{' '}
            <strong>{request.destination}</strong>. Physical inventory will be deducted from godown stacks.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Truck / Vehicle Number</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Driver Name &amp; Contact</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gate Pass / Challan Number</label>
              <input
                type="text"
                value={gatePassNo}
                onChange={(e) => setGatePassNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(request)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm &amp; Deduct Inventory</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
