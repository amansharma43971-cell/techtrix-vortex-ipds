import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RotateCcw,
  Download,
  FileText,
  Camera,
  Upload,
  Info,
  Lock,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  X,
  Sparkles,
  Layers,
  Building,
  Check,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusPill } from '../../components/ui/StatusPill';
import { BatchItem, CommodityType, QualityInspectionRecord } from '../../data/types';
import { formatNumber, calculateAgeDays } from '../../lib/format';

// Official Commodity Standards based on BIS & FCI regulatory mandates
const COMMODITY_STANDARDS: Record<
  string,
  {
    standard: string;
    maxMoisture: number;
    moistureTolerance: number;
    maxForeignMatter: number;
    maxDamagedGrains: number;
    sampleSizeKg: number;
  }
> = {
  Wheat: {
    standard: 'BIS IS 14887:2014 & FCI Uniform Specs',
    maxMoisture: 12.0,
    moistureTolerance: 14.0,
    maxForeignMatter: 0.75,
    maxDamagedGrains: 2.0,
    sampleSizeKg: 10
  },
  Rice: {
    standard: 'FCI Uniform Specifications for Grade A & Common Rice',
    maxMoisture: 14.0,
    moistureTolerance: 15.0,
    maxForeignMatter: 0.5,
    maxDamagedGrains: 3.0,
    sampleSizeKg: 10
  },
  Sugar: {
    standard: 'IS 5982:2003 (Plantation White Sugar)',
    maxMoisture: 0.1,
    moistureTolerance: 0.15,
    maxForeignMatter: 0.05,
    maxDamagedGrains: 0.0,
    sampleSizeKg: 5
  },
  Pulses: {
    standard: 'Agmark Grade Standards for Whole & Split Pulses',
    maxMoisture: 12.0,
    moistureTolerance: 13.0,
    maxForeignMatter: 1.0,
    maxDamagedGrains: 3.0,
    sampleSizeKg: 5
  }
};

export const QualityView: React.FC = () => {
  const { batches, inspections, addInspection, overrideInspection, user, setToast } = useStore();

  // Filter & Queue State
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'id' | 'arrivalDate' | 'quantity' | 'status'>('arrivalDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showStandards, setShowStandards] = useState(false);

  // Modal Dialogs
  const [inspectModalBatch, setInspectModalBatch] = useState<BatchItem | null>(null);
  const [overrideModalBatch, setOverrideModalBatch] = useState<BatchItem | null>(null);
  const [historyModalBatch, setHistoryModalBatch] = useState<BatchItem | null>(null);

  // 1. DYNAMIC SUMMARY METRICS (Derived strictly from persisted records)
  const stats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let holdCount = 0;
    let rejectedCount = 0;
    let reinspectionCount = 0;

    batches.forEach((b) => {
      const s = b.qualityStatus;
      if (s === 'Pending Inspection' || s === 'Pending Allocation') {
        pendingCount++;
      } else if (s === 'Eligible' || s === 'Approved') {
        approvedCount++;
      } else if (s === 'Hold') {
        holdCount++;
      } else if (s === 'Rejected') {
        rejectedCount++;
      } else if (s === 'Reinspection Required') {
        reinspectionCount++;
      }
    });

    return { pendingCount, approvedCount, holdCount, rejectedCount, reinspectionCount };
  }, [batches]);

  // Unique warehouses for filter dropdown
  const uniqueWarehouses = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.warehouse) set.add(b.warehouse);
    });
    return Array.from(set);
  }, [batches]);

  // Filter & Sort Batches for the Inspection Queue
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = b.id.toLowerCase().includes(q);
        const matchComm = b.commodity.toLowerCase().includes(q);
        const matchLoc = (b.warehouse || '').toLowerCase().includes(q) || (b.storageSection || '').toLowerCase().includes(q);
        const matchSup = (b.supplier || '').toLowerCase().includes(q);
        const matchInsp = (b.inspectorName || '').toLowerCase().includes(q);
        if (!matchId && !matchComm && !matchLoc && !matchSup && !matchInsp) return false;
      }

      if (commodityFilter !== 'ALL' && b.commodity !== commodityFilter) {
        return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && b.qualityStatus !== 'Pending Inspection' && b.qualityStatus !== 'Pending Allocation') return false;
        if (statusFilter === 'APPROVED' && b.qualityStatus !== 'Eligible' && b.qualityStatus !== 'Approved') return false;
        if (statusFilter === 'HOLD' && b.qualityStatus !== 'Hold') return false;
        if (statusFilter === 'REJECTED' && b.qualityStatus !== 'Rejected') return false;
        if (statusFilter === 'REINSPECTION' && b.qualityStatus !== 'Reinspection Required') return false;
      }

      if (warehouseFilter !== 'ALL' && b.warehouse !== warehouseFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'id') comp = a.id.localeCompare(b.id);
      else if (sortField === 'quantity') comp = a.availableQuantity - b.availableQuantity;
      else if (sortField === 'status') comp = a.qualityStatus.localeCompare(b.qualityStatus);
      else if (sortField === 'arrivalDate') {
        comp = new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime();
      }
      return sortAsc ? comp : -comp;
    });
  }, [batches, searchQuery, commodityFilter, statusFilter, warehouseFilter, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredBatches.length / pageSize) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBatches.slice(start, start + pageSize);
  }, [filteredBatches, page, pageSize]);

  // Export inspection queue to CSV
  const handleExportCsv = () => {
    const headers = [
      'Batch ID',
      'Commodity',
      'Arrival Date',
      'Age (Days)',
      'Received Bags',
      'Available Bags',
      'Warehouse Location',
      'Quality Status',
      'Last Inspected At',
      'Inspector',
      'Hold/Reject Remarks'
    ];
    const rows = filteredBatches.map((b) => [
      b.id,
      b.commodity,
      b.arrivalDate,
      calculateAgeDays(b.arrivalDate),
      b.totalQuantity,
      b.availableQuantity,
      b.warehouse || 'Central Godown',
      b.qualityStatus,
      b.inspectedAt || 'N/A',
      b.inspectorName || 'N/A',
      `"${(b.holdReason || b.inspectionRemarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BhandarSetu_Quality_Registry_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Quick Pass all pending for demo efficiency
  const handleQuickPassAllPending = () => {
    const pending = batches.filter((b) => b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation');
    if (pending.length === 0) {
      setToast({ id: `t-${Date.now()}`, type: 'info', message: 'No pending batches found in queue.' });
      return;
    }
    if (!confirm(`Are you sure you want to approve all ${pending.length} pending batches under BIS/FCI Standard Specs?`)) return;

    pending.forEach((b) => {
      const std = COMMODITY_STANDARDS[b.commodity] || COMMODITY_STANDARDS.Wheat;
      const rec: QualityInspectionRecord = {
        id: `INSP-${b.id}-${Date.now().toString().slice(-4)}`,
        batchId: b.id,
        commodity: b.commodity,
        sampleQuantityKg: std.sampleSizeKg,
        moisturePercent: +(std.maxMoisture - 0.8).toFixed(1),
        hasInfestation: false,
        foreignMatterPercent: 0.35,
        packagingCondition: 'Good',
        visualObservation: 'Rapid pass batch verification. Grains sound, clear luster, standard moisture.',
        decision: 'Approved',
        decisionReason: `Conforms strictly to ${std.standard}. Safe for FIFO dispatch.`,
        assayerName: user.name || 'Dr. V. K. Sharma (Senior Quality Assayer)',
        assayerRole: 'Senior Assayer',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        labCertificateRef: `FCI-RAPID-QC-${b.id}`
      };
      addInspection(rec);
    });

    setToast({
      id: `t-${Date.now()}`,
      type: 'success',
      message: `Successfully approved ${pending.length} batches and cleared to FIFO Eligible!`
    });
  };

  return (
    <div data-page="quality" className="space-y-6 max-w-[1536px] mx-auto pb-12">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Assay &amp; Compliance Module
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">BIS IS 14887:2014 &amp; FCI Mandate</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#0B4DA8]" />
            Quality Inspection &amp; Quarantine Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard laboratory assay inspection, defect hold management, maker-checker supervisor overrides, and FIFO release authorization
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowStandards(!showStandards)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Commodity Standards</span>
            {showStandards ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <button
            onClick={handleQuickPassAllPending}
            className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Approve all pending batches to Eligible status for demonstration"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Quick Pass All Pending</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. OFFICIAL COMMODITY STANDARDS BANNER (Collapsible) */}
      {showStandards && (
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 p-5 rounded-2xl border border-blue-200/80 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-700" />
              Statutory Quality Standards &amp; Permissible Threshold Limits
            </h3>
            <span className="text-xs text-slate-500 font-medium">Enforced at Gate Receipt &amp; Stored Stock Inspection</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Object.entries(COMMODITY_STANDARDS).map(([comm, spec]) => (
              <div key={comm} className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-bold text-sm text-slate-900">{comm}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">Sample {spec.sampleSizeKg} kg</span>
                </div>
                <p className="text-[11px] text-blue-800 font-medium mb-2.5 line-clamp-1">{spec.standard}</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Safe Max Moisture:</span>
                    <span className="font-bold text-emerald-700 font-mono">≤ {spec.maxMoisture}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Upper Tolerance:</span>
                    <span className="font-bold text-amber-700 font-mono">≤ {spec.moistureTolerance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Foreign Matter:</span>
                    <span className="font-bold text-slate-800 font-mono">≤ {spec.maxForeignMatter}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DYNAMIC SUMMARY KPI CARDS (Calculated from persisted data) */}
      {/* 1. DYNAMIC SUMMARY METRIC CARDS (4 PRIMARY METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Inspections */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pending Inspections</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 font-mono">{stats.pendingCount}</span>
            <span className="text-xs text-slate-500 font-mono">Batches</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Awaiting physical sampling &amp; lab assay</p>
        </div>

        {/* Approved Batches */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Approved Batches</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">{stats.approvedCount}</span>
            <span className="text-xs text-slate-500 font-mono">Batches</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Passed BIS specs · Available for FIFO</p>
        </div>

        {/* On-Hold Batches */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'HOLD' ? 'ALL' : 'HOLD'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'HOLD'
              ? 'bg-orange-50/80 border-orange-400 ring-2 ring-orange-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">On-Hold Batches</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-600 font-mono">{stats.holdCount}</span>
            <span className="text-xs text-slate-500 font-mono">Batches</span>
          </div>
          <p className="text-[11px] text-orange-700 font-medium mt-1">Aeration / Moisture hold in Bay H</p>
        </div>

        {/* Rejected & Re-inspection Batches */}
        <div
          onClick={() => { setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED'); setPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'REJECTED' || statusFilter === 'REINSPECTION'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Rejected &amp; Re-inspect</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 font-mono">{stats.rejectedCount + stats.reinspectionCount}</span>
            <span className="text-xs text-slate-500 font-mono">Batches</span>
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">{stats.rejectedCount} Rejected · {stats.reinspectionCount} Re-testing</p>
        </div>
      </div>

      {/* 4. INSPECTION QUEUE & TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Batch ID, Commodity, Location, Assayer..."
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

            {/* Quality Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Assay</option>
              <option value="APPROVED">Approved / Eligible</option>
              <option value="HOLD">On Hold</option>
              <option value="REJECTED">Rejected</option>
              <option value="REINSPECTION">Re-inspection Required</option>
            </select>

            {/* Warehouse Filter */}
            {uniqueWarehouses.length > 0 && (
              <select
                value={warehouseFilter}
                onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Warehouses</option>
                {uniqueWarehouses.map((wh) => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </select>
            )}

            {/* Reset Filters */}
            {(searchQuery || commodityFilter !== 'ALL' || statusFilter !== 'ALL' || warehouseFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCommodityFilter('ALL');
                  setStatusFilter('ALL');
                  setWarehouseFilter('ALL');
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. INSPECTION QUEUE TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => { setSortField('id'); setSortAsc(sortField === 'id' ? !sortAsc : true); }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Batch ID</span>
                    {sortField === 'id' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-3 px-4">Commodity</th>
                <th
                  onClick={() => { setSortField('quantity'); setSortAsc(sortField === 'quantity' ? !sortAsc : true); }}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Quantity</span>
                    {sortField === 'quantity' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th
                  onClick={() => { setSortField('arrivalDate'); setSortAsc(sortField === 'arrivalDate' ? !sortAsc : true); }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Arrival / Age</span>
                    {sortField === 'arrivalDate' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-3 px-4">Location / Godown</th>
                <th
                  onClick={() => { setSortField('status'); setSortAsc(sortField === 'status' ? !sortAsc : true); }}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Inspection Status</span>
                    {sortField === 'status' && (sortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-3 px-4">Last Inspected</th>
                <th className="py-3 px-4">Inspector / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-10 h-10 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No batches match your filter criteria.</p>
                      <p className="text-xs text-slate-400">Try loosening your search query or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBatches.map((b) => {
                  const age = calculateAgeDays(b.arrivalDate);
                  const isPending = b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation';
                  const isHoldOrRejected = b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Batch ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{b.id}</span>
                          {b.qrToken && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 font-mono">
                              QR
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Commodity */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{b.commodity}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {COMMODITY_STANDARDS[b.commodity]?.standard.slice(0, 22)}...
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="font-bold text-slate-900">{formatNumber(b.availableQuantity)} Bags</span>
                        <div className="text-[10px] text-slate-400 font-normal">
                          ~{((b.availableQuantity * 50) / 1000).toFixed(1)} MT
                        </div>
                      </td>

                      {/* Arrival / Age */}
                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-700">{b.arrivalDate}</div>
                        <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {age}d aged
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{b.warehouse || 'Central Godown'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {b.storageSection ? `Sec ${b.storageSection}` : ''} {b.binCode ? `• ${b.binCode}` : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <StatusPill status={b.qualityStatus} />
                      </td>

                      {/* Last Inspected */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {b.inspectedAt ? b.inspectedAt : <span className="text-slate-300">Not inspected</span>}
                      </td>

                      {/* Inspector / Notes */}
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        {b.inspectorName && (
                          <div className="font-medium text-slate-900 truncate text-[11px]">{b.inspectorName}</div>
                        )}
                        <div className="text-[11px] text-slate-500 truncate" title={b.holdReason || b.inspectionRemarks || b.notes}>
                          {b.holdReason || b.inspectionRemarks || b.notes || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Inspect Button */}
                        <button
                          onClick={() => setInspectModalBatch(b)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                            isPending
                              ? 'bg-[#0B4DA8] hover:bg-[#08387D] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isPending ? 'Inspect Now' : 'Re-Inspect'}
                        </button>

                        {/* Supervisor Override (Only if Hold or Rejected) */}
                        {isHoldOrRejected && (
                          <button
                            onClick={() => setOverrideModalBatch(b)}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                            title="Supervisor Maker-Checker Override"
                          >
                            Override
                          </button>
                        )}

                        {/* History / Detail */}
                        <button
                          onClick={() => setHistoryModalBatch(b)}
                          className="px-2 py-1 rounded text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                          title="View Inspection History & Audit Trail"
                        >
                          <History className="w-3.5 h-3.5 inline" />
                        </button>
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
            Showing <span className="font-bold text-slate-800">{filteredBatches.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(page * pageSize, filteredBatches.length)}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredBatches.length}</span> batches
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
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

      {/* 6. INSPECTION MODAL (Detailed Form) */}
      {inspectModalBatch && (
        <InspectionModal
          batch={inspectModalBatch}
          onClose={() => setInspectModalBatch(null)}
          onSubmit={(record) => {
            addInspection(record);
            setInspectModalBatch(null);
            setToast({
              id: `t-${Date.now()}`,
              type: record.decision === 'Approved' ? 'success' : record.decision === 'Hold' ? 'info' : 'error',
              message: `Batch ${record.batchId} inspection logged: Decision is ${record.decision}`
            });
          }}
        />
      )}

      {/* 7. SUPERVISOR OVERRIDE MODAL (Maker-Checker Security) */}
      {overrideModalBatch && (
        <SupervisorOverrideModal
          batch={overrideModalBatch}
          onClose={() => setOverrideModalBatch(null)}
          onSubmit={(supervisor, reason, certRef) => {
            overrideInspection(overrideModalBatch.id, supervisor, reason, certRef);
            setOverrideModalBatch(null);
            setToast({
              id: `t-${Date.now()}`,
              type: 'success',
              message: `Supervisor override recorded. Batch ${overrideModalBatch.id} released to FIFO Eligible.`
            });
          }}
        />
      )}

      {/* 8. INSPECTION HISTORY MODAL */}
      {historyModalBatch && (
        <InspectionHistoryModal
          batch={historyModalBatch}
          inspections={inspections.filter((i) => i.batchId === historyModalBatch.id)}
          onClose={() => setHistoryModalBatch(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// INSPECTION FORM MODAL COMPONENT
// ============================================================================
interface InspectionModalProps {
  batch: BatchItem;
  onClose: () => void;
  onSubmit: (record: QualityInspectionRecord) => void;
}

const InspectionModal: React.FC<InspectionModalProps> = ({ batch, onClose, onSubmit }) => {
  const { user } = useStore();
  const standard = COMMODITY_STANDARDS[batch.commodity] || COMMODITY_STANDARDS.Wheat;

  // Form States
  const [sampleQuantityKg, setSampleQuantityKg] = useState<number>(standard.sampleSizeKg);
  const [moisturePercent, setMoisturePercent] = useState<number>(standard.maxMoisture - 0.5);
  const [hasInfestation, setHasInfestation] = useState<boolean>(false);
  const [foreignMatterPercent, setForeignMatterPercent] = useState<number>(0.35);
  const [damagedGrainPercent, setDamagedGrainPercent] = useState<number>(0.5);
  const [packagingCondition, setPackagingCondition] = useState<'Good' | 'Damaged' | 'Stained' | 'Torn'>('Good');
  const [visualObservation, setVisualObservation] = useState<string>('Clean sound grain with standard luster. No rancid or sour smell.');
  const [inspectorName, setInspectorName] = useState<string>(user.name || 'Dr. V. K. Sharma (Senior Quality Assayer)');
  const [inspectorRole, setInspectorRole] = useState<string>('Senior Quality Assayer');
  const [labCertificateRef, setLabCertificateRef] = useState<string>(`LAB-FCI-${batch.id}-${new Date().getFullYear()}`);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Moisture gauge calculation
  const moistureDelta = moisturePercent - standard.maxMoisture;
  const isMoistureExceeded = moisturePercent > standard.maxMoisture;
  const isToleranceExceeded = moisturePercent > standard.moistureTolerance;

  const handleDecision = (decision: 'Approved' | 'Hold' | 'Rejected' | 'Reinspection Required') => {
    // Validation: Require reason for Hold or Reject
    if ((decision === 'Hold' || decision === 'Rejected' || decision === 'Reinspection Required') && !decisionReason.trim()) {
      setErrorMsg(`Mandatory justification remark is required when placing a batch on ${decision}.`);
      return;
    }

    if (decision === 'Approved' && (hasInfestation || isToleranceExceeded)) {
      setErrorMsg(`Cannot approve batch while live infestation is detected or moisture exceeds the statutory threshold (${standard.moistureTolerance}%).`);
      return;
    }

    const record: QualityInspectionRecord = {
      id: `INSP-${batch.id}-${Date.now().toString().slice(-4)}`,
      batchId: batch.id,
      commodity: batch.commodity,
      sampleQuantityKg,
      moisturePercent,
      hasInfestation,
      foreignMatterPercent,
      packagingCondition,
      visualObservation,
      decision,
      decisionReason: decisionReason.trim() || `Approved in accordance with ${standard.standard}`,
      assayerName: inspectorName,
      assayerRole: inspectorRole,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      labCertificateRef,
      photoUrl: photoPreview
    };

    onSubmit(record);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Quality Assay &amp; Physical Verification
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Batch ID: <span className="font-bold text-slate-800">{batch.id}</span> • Commodity: <span className="font-bold text-slate-800">{batch.commodity}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* 1. AUTO-LOADED STOCK INWARD INFORMATION */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Arrival Date</span>
              <div className="font-mono font-bold text-slate-800">{batch.arrivalDate}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Available Qty</span>
              <div className="font-mono font-bold text-slate-800">{formatNumber(batch.availableQuantity)} Bags</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Godown / Bay</span>
              <div className="font-medium text-slate-800">{batch.warehouse || 'Central'} {batch.binCode ? `• ${batch.binCode}` : ''}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Supplier / Source</span>
              <div className="font-medium text-slate-800 truncate">{batch.supplier || 'FCI Pool Depo'}</div>
            </div>
          </div>

          {/* 2. STATUTORY STANDARD REFERENCE BANNER */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-blue-900">
            <div>
              <span className="font-bold text-blue-950">Target Benchmark: {standard.standard}</span>
              <div className="text-[11px] text-blue-700 mt-0.5">
                Safe Moisture Limit: ≤ <strong>{standard.maxMoisture}%</strong> (Tolerance ≤ {standard.moistureTolerance}%) • Max Foreign Matter: ≤ <strong>{standard.maxForeignMatter}%</strong>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-blue-800 border border-blue-200">
              Min Sample {standard.sampleSizeKg} kg
            </span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 3. ASSAY TEST PARAMETERS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sample Size (kg) */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Sample Size Taken (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={sampleQuantityKg}
                onChange={(e) => setSampleQuantityKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Recommended: {standard.sampleSizeKg} kg per 100 bags</span>
            </div>

            {/* Moisture Percentage */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold">
                  Moisture Content (%) <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    isToleranceExceeded
                      ? 'bg-red-100 text-red-700'
                      : isMoistureExceeded
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isToleranceExceeded
                    ? 'CRITICAL DEFECT'
                    : isMoistureExceeded
                    ? 'ELEVATED'
                    : 'SAFE BENCHMARK'}
                </span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={moisturePercent}
                onChange={(e) => setMoisturePercent(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg text-slate-800 font-mono font-bold focus:outline-none ${
                  isToleranceExceeded
                    ? 'border-red-400 bg-red-50/30'
                    : isMoistureExceeded
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-slate-200'
                }`}
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {isToleranceExceeded
                  ? `Exceeds upper tolerance limit of ${standard.moistureTolerance}%. Mandatory hold or reject.`
                  : isMoistureExceeded
                  ? `Exceeds ideal safe limit (${standard.maxMoisture}%). Secondary drying recommended.`
                  : `Within ideal safe limit (≤ ${standard.maxMoisture}%).`}
              </span>
            </div>

            {/* Infestation Check */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Live Insect / Weevil Infestation <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHasInfestation(false)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    !hasInfestation
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nil Infestation (Clean)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHasInfestation(true)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    hasInfestation
                      ? 'bg-red-50 border-red-400 text-red-800 ring-1 ring-red-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Active Infestation</span>
                </button>
              </div>
            </div>

            {/* Foreign Matter / Impurities */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Foreign Matter / Impurities (%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={foreignMatterPercent}
                onChange={(e) => setForeignMatterPercent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Permissible standard: ≤ {standard.maxForeignMatter}%</span>
            </div>

            {/* Packaging / Bag Condition */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Gunny / Bagging Condition
              </label>
              <select
                value={packagingCondition}
                onChange={(e) => setPackagingCondition(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Good">Good / Sound HDPE or Jute Bagging</option>
                <option value="Damaged">Minor Hook Tears / Stitched Repairs</option>
                <option value="Stained">Moisture Stains / Weather Bleached</option>
                <option value="Torn">Severe Bag Burst / Spillage</option>
              </select>
            </div>

            {/* Lab Certificate Ref */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Laboratory Certificate / Sample Slip Ref
              </label>
              <input
                type="text"
                value={labCertificateRef}
                onChange={(e) => setLabCertificateRef(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. FCI-QC-2025-XXXX"
              />
            </div>
          </div>

          {/* 4. VISUAL / SENSORY OBSERVATIONS */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Visual &amp; Sensory Observations (Grain color, smell, molds, fungus)
            </label>
            <textarea
              rows={2}
              value={visualObservation}
              onChange={(e) => setVisualObservation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Record grain luster, discoloration, fungal growth, or abnormal odor..."
            />
          </div>

          {/* 5. PHOTO EVIDENCE & PRESETS */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Photo Evidence / Grain Assay Documentation
            </label>
            <div className="flex items-center gap-3">
              <label className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center gap-2 font-medium text-slate-700">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Upload Sample Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setPhotoPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              {/* Sample Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                <button
                  type="button"
                  onClick={() => setPhotoPreview('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px]"
                >
                  Clear Amber Grain
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoPreview('https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px]"
                >
                  High Moisture Grain
                </button>
              </div>

              {photoPreview && (
                <div className="relative ml-auto">
                  <img src={photoPreview} alt="Evidence" className="w-10 h-10 object-cover rounded-lg border border-slate-300" />
                  <button
                    onClick={() => setPhotoPreview('')}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 6. DECISION REMARKS / REASON */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Inspection Remarks / Mandatory Reason for Hold or Reject
            </label>
            <input
              type="text"
              value={decisionReason}
              onChange={(e) => { setDecisionReason(e.target.value); setErrorMsg(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Required if placing on Hold, Rejected, or Re-inspection..."
            />
          </div>

          {/* 7. ASSAYER SIGN-OFF */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Assayer: {inspectorName}</span>
              <div className="text-[10px] text-slate-400">Designation: {inspectorRole} • Digital Audit Timestamp: {new Date().toLocaleString()}</div>
            </div>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Modal Footer / Decision Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {/* Re-Inspection */}
          <button
            type="button"
            onClick={() => handleDecision('Reinspection Required')}
            className="px-3.5 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Request Re-Inspection
          </button>

          {/* Reject */}
          <button
            type="button"
            onClick={() => handleDecision('Rejected')}
            className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Reject Batch (Quarantine Bay Q)
          </button>

          {/* Hold */}
          <button
            type="button"
            onClick={() => handleDecision('Hold')}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Place On Hold
          </button>

          {/* Approve */}
          <button
            type="button"
            onClick={() => handleDecision('Approved')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve (Pass to FIFO Eligible)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUPERVISOR OVERRIDE MODAL COMPONENT (Maker-Checker Security)
// ============================================================================
interface SupervisorOverrideModalProps {
  batch: BatchItem;
  onClose: () => void;
  onSubmit: (supervisor: string, reason: string, certRef: string) => void;
}

const SupervisorOverrideModal: React.FC<SupervisorOverrideModalProps> = ({ batch, onClose, onSubmit }) => {
  const { user } = useStore();
  const [supervisorName, setSupervisorName] = useState<string>('Aayush Tripathi (Godown Manager)');
  const [labCertRef, setLabCertRef] = useState<string>(`INDEP-NABL-CERT-${batch.id}`);
  const [justification, setJustification] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Maker-checker invariant: Approver cannot be identical to the original assayer
    const originalAssayer = batch.inspectorName || '';
    if (originalAssayer && supervisorName.toLowerCase().trim() === originalAssayer.toLowerCase().trim()) {
      setErrorMsg('Maker-Checker Security Violation: Supervisor approver cannot be the identical person who placed the hold or rejection.');
      return;
    }

    if (!justification.trim() || justification.trim().length < 10) {
      setErrorMsg('Mandatory audit justification required (minimum 10 characters).');
      return;
    }

    onSubmit(supervisorName, justification.trim(), labCertRef);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Maker-Checker Supervisor Override</h3>
              <p className="text-xs text-amber-800">Authorized Release of Flagged Stock</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Batch ID:</span>
              <span className="font-bold text-slate-900">{batch.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="font-semibold text-amber-700">{batch.qualityStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Original Assayer:</span>
              <span className="font-mono text-slate-800">{batch.inspectorName || 'Dr. V. K. Sharma'}</span>
            </div>
            <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 mt-1">
              <strong>Recorded Hold Reason:</strong> {batch.holdReason || batch.inspectionRemarks || 'Quality inspection hold'}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Independent Approving Supervisor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => { setSupervisorName(e.target.value); setErrorMsg(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Supervisor Name"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Must be an independent officer per PostgreSQL SQLSTATE BS004</span>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Independent Lab Re-Assay Certificate Ref <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={labCertRef}
              onChange={(e) => setLabCertRef(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. NABL-ACCREDITED-QC-890"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Mandatory Release Justification &amp; Corrective Action <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => { setJustification(e.target.value); setErrorMsg(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Detail reasons for overturning hold (e.g. batch aerated, moisture dropped to 11.8%, re-tested by independent central lab)..."
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Release to Eligible</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// INSPECTION HISTORY MODAL COMPONENT
// ============================================================================
interface InspectionHistoryModalProps {
  batch: BatchItem;
  inspections: QualityInspectionRecord[];
  onClose: () => void;
}

const InspectionHistoryModal: React.FC<InspectionHistoryModalProps> = ({ batch, inspections, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Inspection &amp; Assay Audit Trail</h3>
              <p className="text-xs text-slate-500 font-mono">
                Batch ID: <span className="font-bold text-slate-800">{batch.id}</span> ({batch.commodity})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
          {inspections.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No historical inspection records found for this batch.</p>
            </div>
          ) : (
            inspections.map((insp, idx) => (
              <div key={insp.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{insp.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        insp.decision === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : insp.decision === 'Hold'
                          ? 'bg-amber-100 text-amber-800'
                          : insp.decision === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {insp.decision}
                    </span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{insp.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400">Moisture:</span>{' '}
                    <span className="font-bold font-mono text-slate-800">{insp.moisturePercent ?? 'N/A'}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Infestation:</span>{' '}
                    <span className={`font-bold ${insp.hasInfestation ? 'text-red-600' : 'text-emerald-600'}`}>
                      {insp.hasInfestation ? 'YES' : 'Nil'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Packaging:</span>{' '}
                    <span className="font-semibold text-slate-800">{insp.packagingCondition}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sample:</span>{' '}
                    <span className="font-mono text-slate-800">{insp.sampleQuantityKg} kg</span>
                  </div>
                </div>

                <div className="text-slate-700">
                  <strong>Findings &amp; Remarks:</strong> {insp.decisionReason || insp.visualObservation}
                </div>

                {insp.overrideBy && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <strong>Supervisor Override by {insp.overrideBy}:</strong> {insp.overrideReason} (Cert: {insp.labCertificateRef})
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200">
                  <span>Assayer: {insp.assayerName}</span>
                  <span>Cert: {insp.labCertificateRef || 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
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
