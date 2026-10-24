import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Download, 
  Search, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Eye
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { BatchItem, CommodityType, QualityStatus } from '../../data/types';
import { calculateAgeDays, formatNumber } from '../../lib/format';
import { getNextToDispatchBatchId } from '../../lib/fifo';

export const InventoryView: React.FC = () => {
  const { batches, setSelectedBatch, setToast } = useStore();

  // Multi-facet filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<'ALL' | CommodityType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QualityStatus>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [ageTierFilter, setAgeTierFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Sorting state
  const [sortField, setSortField] = useState<string>('fifo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Controlled stock adjustment modal
  const [adjustmentTarget, setAdjustmentTarget] = useState<BatchItem | null>(null);
  const [adjustAction, setAdjustAction] = useState<'REDUCTION' | 'ADDITION'>('REDUCTION');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>('Storage Moisture Loss');
  const [adjustOfficer, setAdjustOfficer] = useState<string>('Aayush Tripathi (Warehouse Manager)');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // 1. Calculate 6 Persisted Summary Metrics (Zero double-counting)
  const totalStockReceivedBags = useMemo(() => 
    batches.reduce((sum, b) => sum + (b.totalQuantity || b.availableQuantity || 0), 0),
    [batches]
  );
  const totalStockReceivedMT = useMemo(() => 
    (totalStockReceivedBags * 50 / 1000).toFixed(1),
    [totalStockReceivedBags]
  );

  const currentAvailableStockBags = useMemo(() => 
    batches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0),
    [batches]
  );
  const currentAvailableStockMT = useMemo(() => 
    (currentAvailableStockBags * 50 / 1000).toFixed(1),
    [currentAvailableStockBags]
  );

  const eligibleBatches = useMemo(() => 
    batches.filter(b => b.qualityStatus === 'Eligible'),
    [batches]
  );
  const eligibleStockBags = useMemo(() => 
    eligibleBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0),
    [eligibleBatches]
  );
  const eligibleStockPct = useMemo(() => 
    Math.round((eligibleStockBags / (currentAvailableStockBags || 1)) * 100),
    [eligibleStockBags, currentAvailableStockBags]
  );

  const pendingInspectionBatches = useMemo(() => 
    batches.filter(b => b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation'),
    [batches]
  );
  const pendingInspectionStockBags = useMemo(() => 
    pendingInspectionBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0),
    [pendingInspectionBatches]
  );

  const holdRejectedBatches = useMemo(() => 
    batches.filter(b => b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected'),
    [batches]
  );
  const holdRejectedStockBags = useMemo(() => 
    holdRejectedBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0),
    [holdRejectedBatches]
  );

  const activeBatchesCount = useMemo(() => 
    batches.filter(b => b.availableQuantity > 0).length,
    [batches]
  );

  // Oldest eligible batch stars
  const starWheat = useMemo(() => getNextToDispatchBatchId(batches, 'Wheat'), [batches]);
  const starRice = useMemo(() => getNextToDispatchBatchId(batches, 'Rice'), [batches]);
  const starSugar = useMemo(() => getNextToDispatchBatchId(batches, 'Sugar'), [batches]);
  const starPulses = useMemo(() => getNextToDispatchBatchId(batches, 'Pulses'), [batches]);

  // Age category tier function
  const getAgeTier = (age: number) => {
    if (age <= 30) {
      return { tier: 'Fresh', label: 'Fresh (≤30d)', badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
    } else if (age <= 90) {
      return { tier: 'Normal', label: 'Normal (31-90d)', badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200' };
    } else if (age <= 180) {
      return { tier: 'Ageing', label: 'Ageing (91-180d)', badgeClass: 'bg-amber-50 text-amber-900 border border-amber-300' };
    } else {
      return { tier: 'High Age', label: 'High Age (>180d)', badgeClass: 'bg-rose-50 text-rose-800 border border-rose-300' };
    }
  };

  // Safe date parser
  const parseDate = (str: string) => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else if (parts[2].length === 4) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
    return new Date(str);
  };

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Global search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mId = b.id.toLowerCase().includes(q);
        const mComm = b.commodity.toLowerCase().includes(q);
        const mSupp = (b.supplier || '').toLowerCase().includes(q);
        const mBin = (b.binCode || '').toLowerCase().includes(q);
        const mSec = (b.storageSection || '').toLowerCase().includes(q);
        const mRec = (b.receiptNo || '').toLowerCase().includes(q);
        if (!mId && !mComm && !mSupp && !mBin && !mSec && !mRec) return false;
      }

      // Commodity
      if (commodityFilter !== 'ALL' && b.commodity !== commodityFilter) return false;

      // Quality Status
      if (statusFilter !== 'ALL' && b.qualityStatus !== statusFilter) return false;

      // Warehouse / Bay
      if (warehouseFilter !== 'ALL') {
        const loc = (b.binCode || b.storageSection || '').toUpperCase();
        if (warehouseFilter === 'BAY-A' && !loc.includes('BAY-A')) return false;
        if (warehouseFilter === 'BAY-B' && !loc.includes('BAY-B')) return false;
        if (warehouseFilter === 'BAY-C' && !loc.includes('BAY-C')) return false;
        if (warehouseFilter === 'QUARANTINE' && !loc.includes('QUAR')) return false;
      }

      // Age Tier
      if (ageTierFilter !== 'ALL') {
        const age = calculateAgeDays(b.arrivalDate);
        if (ageTierFilter === '<=30' && age > 30) return false;
        if (ageTierFilter === '31-90' && (age <= 30 || age > 90)) return false;
        if (ageTierFilter === '91-180' && (age <= 90 || age > 180)) return false;
        if (ageTierFilter === '>180' && age <= 180) return false;
      }

      // Date Range
      if (dateFrom) {
        const tFrom = new Date(dateFrom).getTime();
        const tArr = parseDate(b.arrivalDate).getTime();
        if (tArr < tFrom) return false;
      }
      if (dateTo) {
        const tTo = new Date(dateTo).getTime();
        const tArr = parseDate(b.arrivalDate).getTime();
        if (tArr > tTo) return false;
      }

      return true;
    });
  }, [batches, searchQuery, commodityFilter, statusFilter, warehouseFilter, ageTierFilter, dateFrom, dateTo]);

  // Sort batches
  const sortedBatches = useMemo(() => {
    const list = [...filteredBatches];
    const factor = sortOrder === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortField === 'fifo') {
        const aEligible = a.qualityStatus === 'Eligible' && a.availableQuantity > 0 ? 0 : 1;
        const bEligible = b.qualityStatus === 'Eligible' && b.availableQuantity > 0 ? 0 : 1;
        if (aEligible !== bEligible) return (aEligible - bEligible) * factor;

        const tA = parseDate(a.arrivalDate).getTime();
        const tB = parseDate(b.arrivalDate).getTime();
        if (tA !== tB) return (tA - tB) * factor;
        return a.id.localeCompare(b.id) * factor;
      } else if (sortField === 'id') {
        return a.id.localeCompare(b.id) * factor;
      } else if (sortField === 'commodity') {
        return a.commodity.localeCompare(b.commodity) * factor;
      } else if (sortField === 'arrivalDate') {
        return (parseDate(a.arrivalDate).getTime() - parseDate(b.arrivalDate).getTime()) * factor;
      } else if (sortField === 'totalQuantity') {
        const qA = a.totalQuantity || a.availableQuantity;
        const qB = b.totalQuantity || b.availableQuantity;
        return (qA - qB) * factor;
      } else if (sortField === 'dispatched') {
        const dA = Math.max(0, (a.totalQuantity || a.availableQuantity) - a.availableQuantity);
        const dB = Math.max(0, (b.totalQuantity || b.availableQuantity) - b.availableQuantity);
        return (dA - dB) * factor;
      } else if (sortField === 'availableQuantity') {
        return (a.availableQuantity - b.availableQuantity) * factor;
      } else if (sortField === 'qualityStatus') {
        return a.qualityStatus.localeCompare(b.qualityStatus) * factor;
      } else if (sortField === 'age') {
        return (calculateAgeDays(a.arrivalDate) - calculateAgeDays(b.arrivalDate)) * factor;
      }
      return 0;
    });

    return list;
  }, [filteredBatches, sortField, sortOrder]);

  // Pagination
  const totalEntries = sortedBatches.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedBatches = sortedBatches.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCommodityFilter('ALL');
    setStatusFilter('ALL');
    setWarehouseFilter('ALL');
    setAgeTierFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSortField('fifo');
    setSortOrder('asc');
    setPage(1);
    setToast({
      id: Date.now().toString(),
      message: 'All inventory filters reset.',
      type: 'info'
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Batch ID',
      'Commodity',
      'Arrival Date',
      'Age (Days)',
      'Ageing Category',
      'Total Received (Bags)',
      'Dispatched (Bags)',
      'Available Stock (Bags)',
      'Net Weight (Kg)',
      'Net Weight (MT)',
      'Quality Status',
      'Storage Bay / Bin',
      'Warehouse Depot',
      'Supplier / Pool Source',
      'Receipt / Challan No',
      'Vehicle No',
      'Notes'
    ];
    const rows = batches.map(b => {
      const age = calculateAgeDays(b.arrivalDate);
      const ageTier = getAgeTier(age).tier;
      const totalBags = b.totalQuantity || b.availableQuantity;
      const availBags = b.availableQuantity;
      const dispatchedBags = Math.max(0, totalBags - availBags);
      const weightKg = totalBags * 50;
      const weightMT = (weightKg / 1000).toFixed(2);
      return [
        b.id,
        b.commodity,
        b.arrivalDate,
        age,
        ageTier,
        totalBags,
        dispatchedBags,
        availBags,
        weightKg,
        weightMT,
        b.qualityStatus,
        `"${(b.binCode || b.storageSection || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(b.warehouse || 'Surajpur Central Depot').replace(/"/g, '""')}"`,
        `"${(b.supplier || 'FCI Central Pool').replace(/"/g, '""')}"`,
        `"${(b.receiptNo || 'RC-SEED').replace(/"/g, '""')}"`,
        `"${(b.vehicleNo || 'UP-16-BT-4412').replace(/"/g, '""')}"`,
        `"${(b.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bhandarsetu_batches_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({
      id: Date.now().toString(),
      message: 'Inventory CSV exported successfully.',
      type: 'success'
    });
  };

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentTarget) return;

    if (adjustQty <= 0) {
      alert('Adjustment quantity must be greater than 0.');
      return;
    }

    if (adjustAction === 'REDUCTION' && adjustQty > adjustmentTarget.availableQuantity) {
      alert(`Cannot deduct ${adjustQty} bags: Only ${adjustmentTarget.availableQuantity} bags available.`);
      return;
    }

    const prevQty = adjustmentTarget.availableQuantity;
    if (adjustAction === 'REDUCTION') {
      adjustmentTarget.availableQuantity -= adjustQty;
      if (adjustmentTarget.availableQuantity === 0) {
        adjustmentTarget.qualityStatus = 'Exhausted';
      }
    } else {
      adjustmentTarget.availableQuantity += adjustQty;
      if (adjustmentTarget.qualityStatus === 'Exhausted') {
        adjustmentTarget.qualityStatus = 'Eligible';
      }
    }

    setToast({
      id: Date.now().toString(),
      message: `Stock adjusted for ${adjustmentTarget.id}: ${adjustAction === 'REDUCTION' ? '-' : '+'}${adjustQty} bags. Balance: ${adjustmentTarget.availableQuantity} bags.`,
      type: 'success'
    });

    setAdjustmentTarget(null);
  };

  return (
    <div data-page="inventory" className="space-y-6 max-w-[1536px] mx-auto pb-16">
      
      {/* Header: Breadcrumbs, Title, Primary Actions */}
      <div className="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>BhandarSetu</span>
            <span>/</span>
            <span>Godown Operations</span>
            <span>/</span>
            <span className="text-[#0B4DA8] font-bold">Inventory &amp; Batches</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Commodity Inventory &amp; Batches</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200">
              {batches.length} Lots Registered
            </span>
          </div>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Searchable physical lot ledger, FIFO dispatch eligibility queue, ageing analysis, and bin allocations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/stock-allocation"
            className="px-4 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Boxes className="w-4 h-4" />
            <span>+ Stock Allocation</span>
          </Link>
        </div>
      </div>

      {/* 1. SUMMARY CARDS (4 CLEAN PRIMARY METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Received */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Total Stock</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">{formatNumber(totalStockReceivedBags)}</span>
            <span className="text-xs text-slate-500 font-mono">Bags</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 mt-2">
            <span>{totalStockReceivedMT} MT Gate Intake</span>
            <span className="font-semibold text-slate-700">{batches.length} Lots</span>
          </div>
        </div>

        {/* Card 2: Available for Dispatch */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Available for Dispatch</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-700">{formatNumber(eligibleStockBags)}</span>
            <span className="text-xs text-slate-500 font-mono">Bags</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 mt-2">
            <span className="text-emerald-700 font-semibold">{eligibleStockPct}% FIFO Cleared</span>
            <span>{formatNumber(currentAvailableStockBags)} Bags Total</span>
          </div>
        </div>

        {/* Card 3: Needs Inspection */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Needs Inspection</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-600">{formatNumber(pendingInspectionStockBags)}</span>
            <span className="text-xs text-slate-500 font-mono">Bags</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 mt-2">
            <span className="text-amber-700 font-semibold">{pendingInspectionBatches.length} Lots in Quarantine</span>
            <span>Testing Req.</span>
          </div>
        </div>

        {/* Card 4: Hold / Rejected */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">On Hold / Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <span className="text-xs">✕</span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-rose-600">{formatNumber(holdRejectedStockBags)}</span>
            <span className="text-xs text-slate-500 font-mono">Bags</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 mt-2">
            <span className="text-rose-700 font-semibold">{holdRejectedBatches.length} Lots Blocked</span>
            <span>Bay Q</span>
          </div>
        </div>
      </div>

      {/* 2. BATCH INVENTORY TABLE CARD */}
      <div className="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-sm space-y-5">
        
        {/* TOOLBAR: SEARCH & MULTI-FACET FILTERS */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search by batch ID, commodity, supplier, bin, receipt..."
                className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]"
              />
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSort('fifo')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortField === 'fifo' ? 'bg-[#0B4DA8] text-white shadow-2xs' : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>★ FIFO Priority Order</span>
              </button>

              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Filter Dropdowns Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* Commodity Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Commodity</label>
              <select
                value={commodityFilter}
                onChange={(e) => { setCommodityFilter(e.target.value as any); setPage(1); }}
                className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]"
              >
                <option value="ALL">All Commodities</option>
                <option value="Wheat">🌾 Wheat (Gehun)</option>
                <option value="Rice">🍚 Rice (Chawal)</option>
                <option value="Sugar">🍬 Sugar (Chini)</option>
                <option value="Pulses">🥣 Pulses (Dal)</option>
              </select>
            </div>

            {/* Quality Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quality Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
                className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Eligible">Eligible (FIFO Cleared)</option>
                <option value="Pending Allocation">Pending Allocation (Gate)</option>
                <option value="Pending Inspection">Pending Inspection (Lab)</option>
                <option value="Hold">Hold (Blocked)</option>
                <option value="Rejected">Rejected (Quarantine)</option>
                <option value="Exhausted">Exhausted (Zero Balance)</option>
              </select>
            </div>

            {/* Warehouse / Storage Bay Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Storage Bay / Zone</label>
              <select
                value={warehouseFilter}
                onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
                className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]"
              >
                <option value="ALL">All Storage Bays</option>
                <option value="BAY-A">Bay A (Wheat Section)</option>
                <option value="BAY-B">Bay B (Rice Section)</option>
                <option value="BAY-C">Bay C (Buffer Section)</option>
                <option value="QUARANTINE">Quarantine Bay Q</option>
              </select>
            </div>

            {/* Stock Ageing Tier Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Stock Ageing Tier</label>
              <select
                value={ageTierFilter}
                onChange={(e) => { setAgeTierFilter(e.target.value); setPage(1); }}
                className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]"
              >
                <option value="ALL">All Ageing Tiers</option>
                <option value="<=30">Fresh (≤ 30 Days)</option>
                <option value="31-90">Normal (31 - 90 Days)</option>
                <option value="91-180">Ageing (91 - 180 Days)</option>
                <option value=">180">High Age (&gt; 180 Days)</option>
              </select>
            </div>

            {/* Rows per page */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="w-full p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]"
              >
                <option value={5}>5 entries</option>
                <option value={10}>10 entries</option>
                <option value={25}>25 entries</option>
                <option value={50}>50 entries</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
          {paginatedBatches.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Batches Match Selected Criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">No inventory records match your active search terms or filters. Try adjusting or clearing your filters.</p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-semibold select-none">
                  <tr>
                    {/* 1. Batch ID */}
                    <th onClick={() => handleSort('id')} className="py-3 px-3.5 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>Batch ID</span>
                        <span className="text-[10px] text-slate-400">{sortField==='id' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 2. Commodity */}
                    <th onClick={() => handleSort('commodity')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>Commodity</span>
                        <span className="text-[10px] text-slate-400">{sortField==='commodity' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 3. Arrival Date */}
                    <th onClick={() => handleSort('arrivalDate')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>Arrival Date</span>
                        <span className="text-[10px] text-slate-400">{sortField==='arrivalDate' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 4. Received Quantity */}
                    <th onClick={() => handleSort('totalQuantity')} className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Received</span>
                        <span className="text-[10px] text-slate-400">{sortField==='totalQuantity' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 5. Dispatched Quantity */}
                    <th onClick={() => handleSort('dispatched')} className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Dispatched</span>
                        <span className="text-[10px] text-slate-400">{sortField==='dispatched' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 6. Available Quantity */}
                    <th onClick={() => handleSort('availableQuantity')} className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Available Stock</span>
                        <span className="text-[10px] text-slate-400">{sortField==='availableQuantity' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 7. Warehouse / Location */}
                    <th className="py-3 px-3.5">Storage Bay / Bin</th>

                    {/* 8. Quality Status */}
                    <th onClick={() => handleSort('qualityStatus')} className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Quality Status</span>
                        <span className="text-[10px] text-slate-400">{sortField==='qualityStatus' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 9. Stock Age in Days */}
                    <th onClick={() => handleSort('age')} className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Stock Age</span>
                        <span className="text-[10px] text-slate-400">{sortField==='age' ? (sortOrder==='asc'?'▲':'▼') : '↕'}</span>
                      </div>
                    </th>

                    {/* 10. Actions */}
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {paginatedBatches.map(b => {
                    const age = calculateAgeDays(b.arrivalDate);
                    const ageTier = getAgeTier(age);
                    const isWheatTop = starWheat === b.id;
                    const isRiceTop = starRice === b.id;
                    const isSugarTop = starSugar === b.id;
                    const isPulsesTop = starPulses === b.id;
                    const isTop = isWheatTop || isRiceTop || isSugarTop || isPulsesTop;

                    const totalBags = b.totalQuantity || b.availableQuantity;
                    const availBags = b.availableQuantity;
                    const dispatchedBags = Math.max(0, totalBags - availBags);

                    let statusBadge = 'bg-slate-100 text-slate-700 border border-slate-200';
                    if (b.qualityStatus === 'Eligible') {
                      statusBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold';
                    } else if (b.qualityStatus === 'Pending Allocation') {
                      statusBadge = 'bg-blue-50 text-blue-800 border border-blue-200 font-bold';
                    } else if (b.qualityStatus === 'Pending Inspection') {
                      statusBadge = 'bg-purple-50 text-purple-800 border border-purple-200 font-bold';
                    } else if (b.qualityStatus === 'Hold') {
                      statusBadge = 'bg-amber-50 text-amber-900 border border-amber-300 font-bold';
                    } else if (b.qualityStatus === 'Rejected') {
                      statusBadge = 'bg-rose-50 text-rose-800 border border-rose-300 font-bold';
                    } else if (b.qualityStatus === 'Exhausted') {
                      statusBadge = 'bg-slate-100 text-slate-500 border border-slate-200';
                    }

                    return (
                      <tr key={b.id} className={`hover:bg-[#F8FAFC] transition-colors ${isTop ? 'bg-amber-50/30' : ''}`}>
                        {/* Batch ID */}
                        <td className="py-3 px-3.5 font-mono font-bold text-[#0F172A] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{b.id}</span>
                            {isTop && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-sans font-bold border border-amber-300">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                Next Out
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Commodity */}
                        <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {b.commodity === 'Wheat' ? '🌾 Wheat' : b.commodity === 'Rice' ? '🍚 Rice' : b.commodity === 'Sugar' ? '🍬 Sugar' : '🥣 Pulses'}
                        </td>

                        {/* Arrival Date */}
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {b.arrivalDate}
                        </td>

                        {/* Received Quantity */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {formatNumber(totalBags)}b
                        </td>

                        {/* Dispatched Quantity */}
                        <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                          {dispatchedBags > 0 ? `${formatNumber(dispatchedBags)}b` : '—'}
                        </td>

                        {/* Available Quantity */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          <span className={availBags > 0 ? 'text-[#0B4DA8]' : 'text-slate-400'}>
                            {formatNumber(availBags)} Bags
                          </span>
                        </td>

                        {/* Storage Bay / Bin */}
                        <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                          <span className="font-bold text-[#0B4DA8]">{b.binCode || b.storageSection || 'Unassigned'}</span>
                        </td>

                        {/* Quality Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] ${statusBadge}`}>
                            {b.qualityStatus}
                          </span>
                        </td>

                        {/* Stock Age in Days */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-slate-900 text-xs">{age} Days</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${ageTier.badgeClass}`}>
                              {ageTier.tier}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedBatch(b)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0B4DA8] hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                              title="View Batch Dossier"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setAdjustmentTarget(b)}
                              className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                              title="Controlled Stock Adjustment"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION BAR */}
          <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="font-medium">
              Showing <span className="font-bold text-slate-900">{totalEntries === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-slate-900">{endIndex}</span> of <span className="font-bold text-slate-900">{totalEntries}</span> matching lots ({batches.length} total in depot)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={currentPage <= 1 ? "px-3 py-1.5 border rounded-lg bg-white text-slate-300 cursor-not-allowed" : "px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 cursor-pointer font-semibold"}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    p === currentPage ? 'bg-[#0B4DA8] text-white shadow-2xs' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ${p}
                </button>
              ))}

              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={currentPage >= totalPages ? "px-3 py-1.5 border rounded-lg bg-white text-slate-300 cursor-not-allowed" : "px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 cursor-pointer font-semibold"}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controlled Stock Adjustment Modal */}
      {adjustmentTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#0B4DA8] uppercase tracking-wider font-bold">Audit-Controlled Correction</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Stock Adjustment: <span className="font-mono text-[#0B4DA8]">{adjustmentTarget.id}</span></h3>
              </div>
              <button onClick={() => setAdjustmentTarget(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600"><span>Commodity:</span><strong>{adjustmentTarget.commodity}</strong></div>
              <div className="flex justify-between text-slate-600"><span>Location:</span><span className="font-mono font-bold">{adjustmentTarget.binCode || adjustmentTarget.storageSection || 'Unassigned'}</span></div>
              <div className="flex justify-between text-slate-900 font-bold"><span>Current Available Balance:</span><span className="font-mono text-[#0B4DA8]">{formatNumber(adjustmentTarget.availableQuantity)} Bags</span></div>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Adjustment Action *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer has-checked:border-rose-400 has-checked:bg-rose-50/50">
                    <input
                      type="radio"
                      name="adjustAction"
                      value="REDUCTION"
                      checked={adjustAction === 'REDUCTION'}
                      onChange={() => setAdjustAction('REDUCTION')}
                      className="text-rose-600 focus:ring-rose-400"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Deduct Stock</span>
                      <span className="text-[10px] text-slate-500">Loss / Spillage / Moisture</span>
                    </div>
                  </label>
                  <label className="p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer has-checked:border-emerald-400 has-checked:bg-emerald-50/50">
                    <input
                      type="radio"
                      name="adjustAction"
                      value="ADDITION"
                      checked={adjustAction === 'ADDITION'}
                      onChange={() => setAdjustAction('ADDITION')}
                      className="text-emerald-600 focus:ring-emerald-400"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Add Stock</span>
                      <span className="text-[10px] text-slate-500">Audit Surplus / Return</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adjustment Quantity (Bags) *</label>
                <input
                  type="number"
                  min={1}
                  max={adjustAction === 'REDUCTION' ? adjustmentTarget.availableQuantity : undefined}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Reason Code *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden"
                  required
                >
                  <option value="Storage Moisture Loss">Moisture Loss during Storage</option>
                  <option value="Handling Spillage & Torn Bags">Handling Spillage &amp; Torn Bags</option>
                  <option value="Physical Audit Count Reconciliation">Physical Audit Count Reconciliation</option>
                  <option value="Bag Re-stitching & Re-weighing">Bag Re-stitching &amp; Re-weighing</option>
                  <option value="Weighbridge Recalibration Variance">Weighbridge Recalibration Variance</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Authorized Officer *</label>
                <input
                  type="text"
                  value={adjustOfficer}
                  onChange={(e) => setAdjustOfficer(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Justification Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Physical verification conducted by audit team..."
                  className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden"
                />
              </div>

              {/* Live Balance Preview */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-blue-900 font-semibold">Projected Balance After Adjustment:</span>
                <span className="font-mono font-bold text-base text-[#0B4DA8]">
                  {formatNumber(adjustAction === 'REDUCTION' ? Math.max(0, adjustmentTarget.availableQuantity - adjustQty) : adjustmentTarget.availableQuantity + adjustQty)} Bags
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAdjustmentTarget(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryView;
