import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Filter,
  RotateCcw,
  Download,
  Plus,
  X,
  FileText,
  Printer,
  MapPin,
  Calendar,
  AlertCircle,
  Hash,
  ShieldCheck,
  Check,
  Eye,
  ArrowRight,
  TrendingDown,
  Building,
  UserCheck,
  QrCode
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CommodityType, DispatchRecord, DispatchStatus, DispatchBatchLine } from '../../data/types';
import { formatNumber, calculateAgeDays } from '../../lib/format';
import { FPS_DESTINATIONS } from '../../data/seedData';

export const DispatchView: React.FC = () => {
  const {
    dispatches,
    batches,
    allocationRequests,
    createDispatchFromAllocation,
    verifyDispatch,
    recordTransitUpdate,
    recordDeliveryConfirmation,
    user,
    setToast,
    setActiveRoute
  } = useStore();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [destinationFilter, setDestinationFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailModalDispatch, setDetailModalDispatch] = useState<DispatchRecord | null>(null);
  const [challanModalDispatch, setChallanModalDispatch] = useState<DispatchRecord | null>(null);
  const [deliveryModalDispatch, setDeliveryModalDispatch] = useState<DispatchRecord | null>(null);
  const [transitModalDispatch, setTransitModalDispatch] = useState<DispatchRecord | null>(null);

  // 1. DYNAMIC SUMMARY METRICS
  const stats = useMemo(() => {
    // Ready to dispatch = count of confirmed allocations not yet dispatched
    const readyToDispatchCount = allocationRequests.filter(
      (r) => (r.status === 'Allocated' || r.status === 'Partially Allocated') && !r.dispatchedAt
    ).length;

    let verificationPendingCount = 0;
    let dispatchedCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let exceptionCount = 0;

    dispatches.forEach((d) => {
      const s = d.status;
      if (s === 'Verification Pending') verificationPendingCount++;
      else if (s === 'Dispatched') dispatchedCount++;
      else if (s === 'In Transit') inTransitCount++;
      else if (s === 'Delivered' || s === 'Completed') deliveredCount++;
      else if (s === 'Delivery Exception') exceptionCount++;
    });

    return {
      readyToDispatchCount,
      verificationPendingCount,
      dispatchedCount,
      inTransitCount,
      deliveredCount,
      exceptionCount
    };
  }, [allocationRequests, dispatches]);

  // Filtered Dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const mId = d.id.toLowerCase().includes(q);
        const mRef = (d.referenceNo || '').toLowerCase().includes(q);
        const mDest = d.destination.toLowerCase().includes(q);
        const mVeh = (d.vehicleNo || '').toLowerCase().includes(q);
        const mDriver = (d.driverName || '').toLowerCase().includes(q);
        const mComm = d.commodity.toLowerCase().includes(q);
        const mBatch = (d.batchesUsed || []).some((b) => b.toLowerCase().includes(q));
        if (!mId && !mRef && !mDest && !mVeh && !mDriver && !mComm && !mBatch) return false;
      }

      if (commodityFilter !== 'ALL' && d.commodity !== commodityFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Delivered' && (d.status !== 'Delivered' && d.status !== 'Completed')) return false;
        else if (statusFilter !== 'Delivered' && d.status !== statusFilter) return false;
      }
      if (destinationFilter !== 'ALL' && d.destination !== destinationFilter) return false;

      return true;
    });
  }, [dispatches, searchQuery, commodityFilter, statusFilter, destinationFilter]);

  const totalPages = Math.ceil(filteredDispatches.length / pageSize) || 1;
  const paginatedDispatches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDispatches.slice(start, start + pageSize);
  }, [filteredDispatches, page, pageSize]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Dispatch ID',
      'Challan Ref',
      'Commodity',
      'Dispatched Bags',
      'Received Bags',
      'Transit Shortage',
      'Destination',
      'Vehicle No',
      'Driver Name',
      'Dispatch Date',
      'Status',
      'Batches Used',
      'Gate Pass No',
      'Remarks'
    ];
    const rows = filteredDispatches.map((d) => [
      d.id,
      d.referenceNo || 'N/A',
      d.commodity,
      d.actualDispatchedBags || d.quantityBags,
      d.receivedQuantityBags ?? 'Pending',
      d.transitDiscrepancyBags ?? 0,
      `"${d.destination.replace(/"/g, '""')}"`,
      d.vehicleNo || 'N/A',
      d.driverName || 'N/A',
      `${d.dispatchDate} ${d.dispatchTime || ''}`.trim(),
      d.status,
      `"${(d.batchesUsed || []).join('; ')}"`,
      d.gatePassNo || 'N/A',
      `"${(d.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BhandarSetu_Dispatch_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-page="dispatch" className="space-y-6 max-w-[1536px] mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Outward Logistics &amp; Challan System
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">Traceable Dispatch Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-[#0B4DA8]" />
            Dispatch Management &amp; Traceable Logistics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Execution of confirmed FIFO allocations, truck loading verification, gate pass generation, and proof-of-delivery reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0B4DA8] hover:bg-[#08387D] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Dispatch</span>
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

      {/* 2. DYNAMIC SUMMARY METRIC CARDS (4 PRIMARY METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ready to Dispatch */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'Verification Pending' ? 'ALL' : 'Verification Pending'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Verification Pending'
              ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ready to Dispatch</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-900 font-mono">{stats.readyToDispatchCount + stats.verificationPendingCount}</span>
            <span className="text-xs text-slate-500 font-mono">Consignments</span>
          </div>
          <p className="text-[11px] text-purple-700 font-medium mt-1">{stats.verificationPendingCount} Staged &middot; Weighment check</p>
        </div>

        {/* In Transit / Dispatched */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'In Transit' ? 'ALL' : 'In Transit'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'In Transit' || statusFilter === 'Dispatched'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">In Transit / Dispatched</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-900 font-mono">{stats.dispatchedCount + stats.inTransitCount}</span>
            <span className="text-xs text-slate-500 font-mono">Lorries</span>
          </div>
          <p className="text-[11px] text-blue-700 font-medium mt-1">{stats.inTransitCount} Active GPS corridor &middot; Gate pass issued</p>
        </div>

        {/* Delivered */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'Delivered' ? 'ALL' : 'Delivered'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Delivered'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Delivered in Full</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-900 font-mono">{stats.deliveredCount}</span>
            <span className="text-xs text-slate-500 font-mono">Receipts</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Digital POD confirmed &middot; Recipient signed</p>
        </div>

        {/* Delivery Exceptions */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'Delivery Exception' ? 'ALL' : 'Delivery Exception'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Delivery Exception'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Delivery Exceptions</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-900 font-mono">{stats.exceptionCount}</span>
            <span className="text-xs text-slate-500 font-mono">Discrepancies</span>
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Transit loss / shortage reports</p>
        </div>
      </div>

      {/* 3. DISPATCH LEDGER QUEUE & TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Dispatch ID, Challan, Vehicle, Destination, Batch..."
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
              <option value="Verification Pending">Verification Pending</option>
              <option value="Dispatched">Dispatched</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Delivery Exception">Delivery Exception</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Destination Filter */}
            <select
              value={destinationFilter}
              onChange={(e) => { setDestinationFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px] truncate"
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Dispatch ID</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Destination FPS</th>
                <th className="py-3 px-4">Vehicle &amp; Driver</th>
                <th className="py-3 px-4 text-right">Dispatched Qty</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Batches Drawn</th>
                <th className="py-3 px-4">Gate Out Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDispatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="w-10 h-10 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No dispatch records found.</p>
                      <p className="text-xs text-slate-400">Click &quot;Create Dispatch&quot; to initiate a dispatch from an allocation.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDispatches.map((d) => {
                  const qty = d.actualDispatchedBags || d.quantityBags;
                  const isDelivered = d.status === 'Delivered' || d.status === 'Completed';
                  const isException = d.status === 'Delivery Exception';
                  const isInTransit = d.status === 'In Transit';
                  const isDispatched = d.status === 'Dispatched';
                  const isVerification = d.status === 'Verification Pending';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Dispatch ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{d.id}</span>
                          {d.qrVerificationToken && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-500 font-mono">
                              QR
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Ref: {d.referenceNo || d.allocationRequestId || '—'}
                        </div>
                      </td>

                      {/* Commodity */}
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {d.commodity}
                      </td>

                      {/* Destination */}
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={d.destination}>
                        <div className="font-medium truncate">{d.destination}</div>
                        <div className="text-[10px] text-slate-400 truncate">{d.destinationContact || 'FPS Incharge'}</div>
                      </td>

                      {/* Vehicle & Driver */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div className="font-bold text-slate-900">{d.vehicleNo || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{d.driverName || 'Transporter Fleet'}</div>
                      </td>

                      {/* Dispatched Qty */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        <div>{formatNumber(qty)} Bags</div>
                        {d.receivedQuantityBags !== undefined && (
                          <div className={`text-[10px] ${isException ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                            Rcvd: {formatNumber(d.receivedQuantityBags)} B
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isException
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : isInTransit
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isVerification
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {isDelivered && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isException && <AlertTriangle className="w-3 h-3 text-red-600" />}
                          {isInTransit && <Truck className="w-3 h-3 text-amber-600" />}
                          {isVerification && <Clock className="w-3 h-3 text-purple-600" />}
                          <span>{d.status}</span>
                        </span>
                      </td>

                      {/* Batches Drawn */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(d.batchesUsed || []).map((b) => (
                            <span
                              key={b}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Gate Out Date */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        <div>{d.dispatchDate}</div>
                        {d.dispatchTime && <div className="text-[10px] text-slate-400">{d.dispatchTime}</div>}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Challan Print */}
                        <button
                          onClick={() => setChallanModalDispatch(d)}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                          title="Print Digital Gate Pass & Challan"
                        >
                          <Printer className="w-3.5 h-3.5 inline mr-1" />
                          <span>Challan</span>
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setDetailModalDispatch(d)}
                          className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="View Full Dispatch Details & Audit Log"
                        >
                          <Eye className="w-3.5 h-3.5 inline" />
                        </button>

                        {/* Transit Update */}
                        {(isDispatched || isInTransit) && (
                          <button
                            onClick={() => setTransitModalDispatch(d)}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                            title="Log Transit Update"
                          >
                            <MapPin className="w-3.5 h-3.5 inline mr-1" />
                            <span>Waypoint</span>
                          </button>
                        )}

                        {/* Delivery Confirmation */}
                        {(isDispatched || isInTransit) && (
                          <button
                            onClick={() => setDeliveryModalDispatch(d)}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                            title="Confirm Shop Delivery & POD"
                          >
                            <Check className="w-3.5 h-3.5 inline mr-1" />
                            <span>Confirm POD</span>
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

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredDispatches.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(page * pageSize, filteredDispatches.length)}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredDispatches.length}</span> dispatches
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

      {/* 4. MODALS */}
      {/* Create Dispatch Modal */}
      {showCreateModal && (
        <CreateDispatchModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => {
            const res = createDispatchFromAllocation(data);
            if (res.success) {
              setShowCreateModal(false);
              setToast({
                id: `t-${Date.now()}`,
                type: 'success',
                message: `Dispatch ${res.dispatchId} created successfully! Inventory deducted from godown.`
              });
            } else {
              alert(res.error || 'Failed to create dispatch');
            }
          }}
        />
      )}

      {/* Challan Printable View Modal */}
      {challanModalDispatch && (
        <DigitalChallanModal
          dispatch={challanModalDispatch}
          onClose={() => setChallanModalDispatch(null)}
        />
      )}

      {/* Detail & Audit Trail Modal */}
      {detailModalDispatch && (
        <DispatchDetailModal
          dispatch={detailModalDispatch}
          onClose={() => setDetailModalDispatch(null)}
          onPrint={() => {
            const d = detailModalDispatch;
            setDetailModalDispatch(null);
            setChallanModalDispatch(d);
          }}
        />
      )}

      {/* Transit Waypoint Modal */}
      {transitModalDispatch && (
        <TransitUpdateModal
          dispatch={transitModalDispatch}
          onClose={() => setTransitModalDispatch(null)}
          onSubmit={(notes) => {
            recordTransitUpdate(transitModalDispatch.id, notes);
            setTransitModalDispatch(null);
            setToast({
              id: `t-${Date.now()}`,
              type: 'info',
              message: `In-transit waypoint updated for ${transitModalDispatch.id}`
            });
          }}
        />
      )}

      {/* Delivery POD Confirmation Modal */}
      {deliveryModalDispatch && (
        <DeliveryConfirmationModal
          dispatch={deliveryModalDispatch}
          onClose={() => setDeliveryModalDispatch(null)}
          onSubmit={(receivedBags, receiverName, podRef, remarks) => {
            const res = recordDeliveryConfirmation(deliveryModalDispatch.id, receivedBags, receiverName, podRef, remarks);
            setDeliveryModalDispatch(null);
            if (res.isException) {
              setToast({
                id: `t-${Date.now()}`,
                type: 'error',
                message: `Delivery exception logged for ${deliveryModalDispatch.id}. Shortage recorded.`
              });
            } else {
              setToast({
                id: `t-${Date.now()}`,
                type: 'success',
                message: `Delivery confirmed in full for ${deliveryModalDispatch.id}!`
              });
            }
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// CREATE DISPATCH MODAL (From Confirmed FIFO Allocation)
// ============================================================================
interface CreateDispatchModalProps {
  onClose: () => void;
  onSubmit: (params: {
    allocationRequestId: string;
    vehicleNo: string;
    driverName: string;
    driverPhone?: string;
    transporterName?: string;
    gatePassNo: string;
    remarks?: string;
    actualBatchLines?: DispatchBatchLine[];
  }) => void;
}

const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({ onClose, onSubmit }) => {
  const { allocationRequests, batches } = useStore();

  // Find eligible confirmed allocations that have not yet been dispatched
  const eligibleAllocations = allocationRequests.filter(
    (r) => (r.status === 'Allocated' || r.status === 'Partially Allocated') && !r.dispatchedAt
  );

  const [selectedReqId, setSelectedReqId] = useState<string>(
    eligibleAllocations.length > 0 ? eligibleAllocations[0].id : ''
  );
  const [vehicleNo, setVehicleNo] = useState('UP-16-BT-9988');
  const [transporterName, setTransporterName] = useState('FCI Dedicated Fleet');
  const [driverName, setDriverName] = useState('Rameshwar Singh');
  const [driverPhone, setDriverPhone] = useState('+91 98112 34567');
  const [gatePassNo, setGatePassNo] = useState(`GP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
  const [remarks, setRemarks] = useState('Truck loaded and bag count verified in sound condition');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedReq = allocationRequests.find((r) => r.id === selectedReqId);

  // Editable actual loaded batch lines
  const [loadedLines, setLoadedLines] = useState<DispatchBatchLine[]>([]);

  // Update loaded lines when selectedReq changes
  React.useEffect(() => {
    if (selectedReq && selectedReq.allocatedBatches) {
      setLoadedLines(
        selectedReq.allocatedBatches.map((b) => ({
          batchId: b.batchId,
          arrivalDate: b.arrivalDate,
          allocatedBags: b.allocatedBags,
          actualLoadedBags: b.allocatedBags,
          qualityStatus: b.qualityStatus,
          warehouse: 'Central Godown'
        }))
      );
    } else {
      setLoadedLines([]);
    }
  }, [selectedReq]);

  const handleLineChange = (batchId: string, actualLoaded: number) => {
    setLoadedLines((prev) =>
      prev.map((l) =>
        l.batchId === batchId
          ? {
              ...l,
              actualLoadedBags: Math.max(0, actualLoaded),
              discrepancyBags: l.allocatedBags - Math.max(0, actualLoaded)
            }
          : l
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqId) {
      setErrorMsg('Please select a confirmed FIFO allocation to dispatch.');
      return;
    }
    if (!vehicleNo.trim() || !driverName.trim()) {
      setErrorMsg('Vehicle registration number and Driver name are mandatory.');
      return;
    }

    const totalLoaded = loadedLines.reduce((sum, l) => sum + l.actualLoadedBags, 0);
    if (totalLoaded <= 0) {
      setErrorMsg('Actual loaded quantity must be greater than 0 bags.');
      return;
    }

    onSubmit({
      allocationRequestId: selectedReqId,
      vehicleNo,
      driverName,
      driverPhone,
      transporterName,
      gatePassNo,
      remarks,
      actualBatchLines: loadedLines
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Outward Dispatch</h3>
              <p className="text-xs text-slate-500">
                Gate pass release, physical truck loading verification, and inventory deduction
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Select Allocation Request */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Select Confirmed FIFO Allocation <span className="text-red-500">*</span>
              </label>
              {eligibleAllocations.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                  No confirmed FIFO allocations are currently ready for dispatch. Please confirm an allocation in the FIFO module first.
                </div>
              ) : (
                <select
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {eligibleAllocations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} • {r.commodity} ({formatNumber(r.allocatedBags)} Bags) • {r.destination} • Ref: {r.referenceNo}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Auto-Loaded Allocation Details */}
            {selectedReq && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Commodity</span>
                  <div className="font-bold text-slate-900">{selectedReq.commodity}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Allocated Stock</span>
                  <div className="font-mono font-bold text-slate-900">{formatNumber(selectedReq.allocatedBags)} Bags</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination</span>
                  <div className="font-medium text-slate-800 truncate">{selectedReq.destination}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Challan Reference</span>
                  <div className="font-mono font-bold text-slate-900">{selectedReq.referenceNo}</div>
                </div>
              </div>
            )}

            {/* Logistics & Vehicle Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Truck / Vehicle Registration No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. UP-16-BT-9988"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Transporter / Fleet Agency
                </label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Gate Pass / Security Serial No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={gatePassNo}
                  onChange={(e) => setGatePassNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Driver Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Driver Phone Number
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Operational Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Batch-Wise Verification & Loading Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Staging Verification: Batch-Wise Loaded Bags</span>
                <span className="text-xs text-slate-500 font-normal">
                  Scale weight check against reserved allocation
                </span>
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Batch ID</th>
                      <th className="p-2.5">Arrival Date</th>
                      <th className="p-2.5 text-right">Planned (Allocated)</th>
                      <th className="p-2.5 text-right text-blue-900">Actual Loaded Bags</th>
                      <th className="p-2.5 text-center">Quality Status</th>
                      <th className="p-2.5">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {loadedLines.map((l) => (
                      <tr key={l.batchId} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{l.batchId}</td>
                        <td className="p-2.5 text-slate-600">{l.arrivalDate}</td>
                        <td className="p-2.5 text-right font-bold text-slate-700">
                          {formatNumber(l.allocatedBags)} Bags
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            max={l.allocatedBags}
                            value={l.actualLoadedBags}
                            onChange={(e) => handleLineChange(l.batchId, parseInt(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-right text-blue-900 bg-white"
                          />
                        </td>
                        <td className="p-2.5 text-center font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {l.qualityStatus}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans text-xs">
                          {l.allocatedBags !== l.actualLoadedBags ? (
                            <span className="text-amber-700 font-semibold">
                              Shortage: {l.allocatedBags - l.actualLoadedBags} B
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Match 100%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Total Actual Loaded:{' '}
              <strong className="text-slate-900 font-mono">
                {formatNumber(loadedLines.reduce((s, l) => s + l.actualLoadedBags, 0))} Bags
              </strong>
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
                disabled={!selectedReqId}
                className="px-4 py-2 rounded-lg bg-[#0B4DA8] hover:bg-[#08387D] text-white font-bold text-xs shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm Gate Out &amp; Deduct Inventory</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// DIGITAL CHALLAN & GATE PASS PRINTABLE MODAL
// ============================================================================
interface DigitalChallanModalProps {
  dispatch: DispatchRecord;
  onClose: () => void;
}

const DigitalChallanModal: React.FC<DigitalChallanModalProps> = ({ dispatch, onClose }) => {
  const qty = dispatch.actualDispatchedBags || dispatch.quantityBags;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 print:m-0 print:border-none print:shadow-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-700" />
            <span className="font-bold text-slate-900 text-xs">Official Outward Gate Pass / Challan Document</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-[#0B4DA8] hover:bg-[#08387D] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Challan</span>
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Challan Body */}
        <div className="p-8 space-y-6 text-slate-900 text-xs" id="printable-challan">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Government of India • Ministry of Consumer Affairs, Food &amp; Public Distribution</div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Department of Food &amp; Public Distribution (iPDS)</h2>
            <div className="text-xs font-semibold text-slate-700">BhandarSetu: Smart Commodity Inventory &amp; FIFO Management System</div>
            <div className="inline-block mt-1 px-3 py-0.5 rounded bg-slate-100 text-slate-900 font-mono font-bold text-xs uppercase border border-slate-300">
              Official Outward Dispatch Challan &amp; Security Gate Pass
            </div>
          </div>

          {/* Challan Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Dispatch ID</span>
              <span className="font-mono font-black text-slate-900 text-sm">{dispatch.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Indent / Challan Ref</span>
              <span className="font-mono font-bold text-slate-800">{dispatch.referenceNo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Date &amp; Time</span>
              <span className="font-mono text-slate-800">{dispatch.dispatchDate} {dispatch.dispatchTime || '12:00'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Gate Pass No</span>
              <span className="font-mono font-bold text-blue-900">{dispatch.gatePassNo || 'GP-OFFICIAL'}</span>
            </div>
          </div>

          {/* Origin & Destination Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Originating Warehouse (Consignor)</span>
              <div className="font-bold text-slate-900">Central Buffer Godown - Unit 1</div>
              <div className="text-slate-600 text-[11px]">Industrial Area, Surajpur, Greater Noida, UP</div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">Godown Manager: Aayush Tripathi (Emp ID: IPDS-GM-042)</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Destination Centre (Consignee)</span>
              <div className="font-bold text-slate-900">{dispatch.destination}</div>
              <div className="text-slate-600 text-[11px]">{dispatch.destinationContact || 'FPS Authorized Licensee'}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">PDS Supply Chain Channel: Fair Price Shop Distribution</div>
            </div>
          </div>

          {/* Vehicle & Logistics Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200 p-3 rounded-xl bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Vehicle Number</span>
              <span className="font-mono font-bold text-slate-900">{dispatch.vehicleNo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Transporter Fleet</span>
              <span className="font-medium text-slate-800 truncate block">{dispatch.transporterName || 'State Civil Supplies'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Driver Name</span>
              <span className="font-medium text-slate-800">{dispatch.driverName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Driver Phone</span>
              <span className="font-mono text-slate-800">{dispatch.driverPhone || 'N/A'}</span>
            </div>
          </div>

          {/* Batch Breakdown Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
              Batch-Wise Commodity Manifest
            </h4>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Batch ID</th>
                    <th className="p-2.5">Arrival Date</th>
                    <th className="p-2.5">Godown Location</th>
                    <th className="p-2.5 text-right">Standard Gunny Bags</th>
                    <th className="p-2.5 text-right">Net Weight (MT)</th>
                    <th className="p-2.5 text-center">Quality Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {(dispatch.batchLines && dispatch.batchLines.length > 0) ? (
                    dispatch.batchLines.map((l, i) => (
                      <tr key={l.batchId}>
                        <td className="p-2.5 font-sans">{i + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{l.batchId}</td>
                        <td className="p-2.5 text-slate-600">{l.arrivalDate}</td>
                        <td className="p-2.5 font-sans text-slate-600">{l.warehouse || 'Central'}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatNumber(l.actualLoadedBags)} Bags</td>
                        <td className="p-2.5 text-right font-bold text-slate-700">{((l.actualLoadedBags * 50) / 1000).toFixed(2)} MT</td>
                        <td className="p-2.5 text-center font-sans text-emerald-800 font-bold">Passed (BIS)</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-2.5 font-sans">1</td>
                      <td className="p-2.5 font-bold text-slate-900">{(dispatch.batchesUsed || []).join(', ')}</td>
                      <td className="p-2.5 text-slate-600">{dispatch.dispatchDate}</td>
                      <td className="p-2.5 font-sans text-slate-600">Central Godown</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatNumber(qty)} Bags</td>
                      <td className="p-2.5 text-right font-bold text-slate-700">{((qty * 50) / 1000).toFixed(2)} MT</td>
                      <td className="p-2.5 text-center font-sans text-emerald-800 font-bold">Passed (BIS)</td>
                    </tr>
                  )}
                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colSpan={4} className="p-2.5 text-right font-sans uppercase">Total Consignment:</td>
                    <td className="p-2.5 text-right text-slate-900 font-black">{formatNumber(qty)} Bags</td>
                    <td className="p-2.5 text-right text-slate-900 font-black">{((qty * 50) / 1000).toFixed(2)} MT</td>
                    <td className="p-2.5 text-center font-sans text-emerald-700">100% Eligible</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification Token / Security Footer */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-[10px]">
            <div>
              <span className="font-bold text-slate-800">Security Verification Token:</span>{' '}
              <span className="font-mono text-slate-600">{dispatch.qrVerificationToken || 'BS-VERIFY-SECURE'}</span>
              <p className="text-slate-400 mt-0.5">Tamper-proof digital seal cryptographically bound to immutable audit log</p>
            </div>
            <div className="font-mono font-bold text-right text-slate-700">
              <div>iPDS Portal Sync: OK</div>
              <div>Status: {dispatch.status}</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-4 gap-4 text-center text-[10px]">
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold text-slate-800 block">Warehouse Officer</span>
              <span className="text-slate-400">Signature &amp; Stamp</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold text-slate-800 block">Quality Assayer</span>
              <span className="text-slate-400">Lab Moisture Cleared</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold text-slate-800 block">Truck Driver</span>
              <span className="text-slate-400">Loaded Bags Count Acknowledged</span>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <span className="font-bold text-slate-800 block">Receiving FPS Dealer</span>
              <span className="text-slate-400">Date &amp; Receipt Acknowledgement</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DISPATCH DETAILS & AUDIT TRAIL MODAL
// ============================================================================
interface DispatchDetailModalProps {
  dispatch: DispatchRecord;
  onClose: () => void;
  onPrint: () => void;
}

const DispatchDetailModal: React.FC<DispatchDetailModalProps> = ({ dispatch, onClose, onPrint }) => {
  const qty = dispatch.actualDispatchedBags || dispatch.quantityBags;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Dispatch Consignment &amp; Chain-of-Custody: {dispatch.id}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Status: <span className="font-bold text-blue-900">{dispatch.status}</span> • Commodity: <span className="font-bold text-slate-800">{dispatch.commodity}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destination</span>
              <span className="font-semibold text-slate-800">{dispatch.destination}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vehicle No</span>
              <span className="font-mono font-bold text-slate-900">{dispatch.vehicleNo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dispatched Bags</span>
              <span className="font-mono font-bold text-slate-900">{formatNumber(qty)} Bags</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gate Pass No</span>
              <span className="font-mono font-bold text-blue-900">{dispatch.gatePassNo || 'N/A'}</span>
            </div>
          </div>

          {dispatch.exceptionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Recorded Delivery Exception / Discrepancy:</strong>
                <p className="text-[11px] mt-0.5">{dispatch.exceptionReason}</p>
              </div>
            </div>
          )}

          {/* Batch Lines Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Assigned Batch Manifest</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b text-slate-600 uppercase text-[10px] font-sans">
                  <tr>
                    <th className="p-2.5">Batch ID</th>
                    <th className="p-2.5">Arrival Date</th>
                    <th className="p-2.5 text-right">Loaded Bags</th>
                    <th className="p-2.5 text-right">Net Weight</th>
                    <th className="p-2.5 text-center">Quality Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(dispatch.batchLines && dispatch.batchLines.length > 0) ? (
                    dispatch.batchLines.map((l) => (
                      <tr key={l.batchId}>
                        <td className="p-2.5 font-bold text-slate-900">{l.batchId}</td>
                        <td className="p-2.5 text-slate-600">{l.arrivalDate}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-800">{formatNumber(l.actualLoadedBags)} Bags</td>
                        <td className="p-2.5 text-right text-slate-600">{((l.actualLoadedBags * 50) / 1000).toFixed(2)} MT</td>
                        <td className="p-2.5 text-center font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {l.qualityStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900">{(dispatch.batchesUsed || []).join(', ')}</td>
                      <td className="p-2.5 text-slate-600">{dispatch.dispatchDate}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-800">{formatNumber(qty)} Bags</td>
                      <td className="p-2.5 text-right text-slate-600">{((qty * 50) / 1000).toFixed(2)} MT</td>
                      <td className="p-2.5 text-center font-sans text-emerald-800 font-bold">Eligible</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Chain-of-Custody Audit Log */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">Chain-of-Custody Audit Events</h4>
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {(dispatch.events && dispatch.events.length > 0) ? (
                dispatch.events.map((ev) => (
                  <div key={ev.id} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          ev.eventType === 'DELIVERED'
                            ? 'bg-emerald-500'
                            : ev.eventType === 'EXCEPTION'
                            ? 'bg-red-500'
                            : ev.eventType === 'IN_TRANSIT'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-slate-800">{ev.description}</div>
                        <div className="text-[10px] text-slate-400">Actor: {ev.actor}</div>
                      </div>
                    </div>
                    <span className="font-mono text-slate-400 text-[10px] whitespace-nowrap">{ev.timestamp}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-2">No historical audit events logged for this record.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={onPrint}
            className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Challan</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TRANSIT UPDATE MODAL
// ============================================================================
interface TransitUpdateModalProps {
  dispatch: DispatchRecord;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

const TransitUpdateModal: React.FC<TransitUpdateModalProps> = ({ dispatch, onClose, onSubmit }) => {
  const [locationNotes, setLocationNotes] = useState('Reached Toll Plaza NH-24. ETA to FPS: 45 minutes. Consignment seal intact.');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-bold text-slate-900">Log Transit Milestone</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Dispatch ID:</span>
              <span className="font-bold text-slate-900">{dispatch.id}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Vehicle:</span>
              <span className="font-bold text-slate-900">{dispatch.vehicleNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination:</span>
              <span className="font-semibold text-slate-800">{dispatch.destination}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Current Location / Waypoint Log <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(locationNotes)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer"
            >
              Confirm Waypoint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DELIVERY CONFIRMATION (POD) MODAL
// ============================================================================
interface DeliveryConfirmationModalProps {
  dispatch: DispatchRecord;
  onClose: () => void;
  onSubmit: (receivedBags: number, receiverName: string, podRef: string, remarks?: string) => void;
}

const DeliveryConfirmationModal: React.FC<DeliveryConfirmationModalProps> = ({ dispatch, onClose, onSubmit }) => {
  const actualDispatched = dispatch.actualDispatchedBags || dispatch.quantityBags;
  const [receivedBags, setReceivedBags] = useState<number>(actualDispatched);
  const [receiverName, setReceiverName] = useState('Arvind Joshi (FPS Dealer)');
  const [podRef, setPodRef] = useState(`POD-${dispatch.id}-${new Date().getFullYear()}`);
  const [remarks, setRemarks] = useState('');

  const discrepancy = actualDispatched - receivedBags;
  const isShortage = discrepancy > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-emerald-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">Proof of Delivery (POD) Receipt</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Dispatch ID:</span>
              <span className="font-bold text-slate-900">{dispatch.id}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Dispatched Quantity:</span>
              <span className="font-bold text-slate-900">{formatNumber(actualDispatched)} Bags</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">FPS Centre:</span>
              <span className="font-semibold text-slate-800 truncate">{dispatch.destination}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Actually Received Quantity (Bags) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max={actualDispatched}
              value={receivedBags}
              onChange={(e) => setReceivedBags(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          {isShortage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Transit Shortage Detected ({discrepancy} Bags)</span>
              </div>
              <p className="text-[11px] text-red-700">
                This receipt will be flagged as a <strong>Delivery Exception</strong> and logged in the reconciliation ledger.
              </p>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Receiving Dealer Name &amp; Designation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Proof of Delivery Document / Signed Slip Ref
            </label>
            <input
              type="text"
              value={podRef}
              onChange={(e) => setPodRef(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Remarks {isShortage && <span className="text-red-500">* (Reason for shortage)</span>}
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isShortage ? 'Mandatory reason for shortage (e.g. 2 bags torn during transit)' : 'Optional notes'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
              required={isShortage}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (isShortage && !remarks.trim()) {
                  alert('Please enter a reason for the delivery shortage.');
                  return;
                }
                onSubmit(receivedBags, receiverName, podRef, remarks);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Delivery</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
