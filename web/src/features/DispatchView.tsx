import React, { useState, useMemo } from 'react';
import { 
  Truck, Search, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, 
  FileText, QrCode, Printer, RefreshCw, ChevronRight, Lock, 
  MapPin, Clock, ArrowLeft, Camera, CheckSquare, XCircle, AlertOctagon
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { MOCK_RATION_SHOPS, MOCK_COMMODITIES, MOCK_BATCHES, MOCK_APPROVALS, RationShop, Batch } from '../mocks/mockData';
import { StatusPill } from '../components/ui/StatusPill';
import { AgeBadge } from '../components/ui/AgeBadge';
import { QuantityText } from '../components/ui/QuantityText';
import { BatchChip } from '../components/ui/BatchChip';
import { calculateAgeDays } from '../lib/formatters';

interface AllocationSlice {
  batch: Batch;
  qty_g: number;
  percentage: number;
  isOverride?: boolean;
}

export const DispatchView: React.FC = () => {
  const { density, activeRole, addLedgerMovement, addApprovalRequest, setScreen } = useUIStore();
  const { t } = useTranslation();

  // Workflow steps: 1 = Configure & Allocate, 2 = Pick & Scan, 3 = Gate Pass & Seal
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [searchFps, setSearchFps] = useState('');
  const [selectedFps, setSelectedFps] = useState<RationShop | null>(MOCK_RATION_SHOPS[0]);
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>('c1');
  const [requestedKg, setRequestedKg] = useState<number>(1000); // 1000 kg = 1,000,000 g

  // Override Drawer
  const [showOverrideDrawer, setShowOverrideDrawer] = useState(false);
  const [overrideBatchId, setOverrideBatchId] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('PHYSICAL_ACCESS_BLOCKED');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [overrideAck, setOverrideAck] = useState(false);
  const [isOverrideApplied, setIsOverrideApplied] = useState(false);

  // Scanning State (Step 2)
  const [scannedItems, setScannedItems] = useState<{ [key: string]: boolean }>({});
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Dispatch Confirmation (Step 3)
  const [vehicleNo, setVehicleNo] = useState('MH-31-AP-4921');
  const [driverName, setDriverName] = useState('Raju Kulkarni');
  const [driverPhone, setDriverPhone] = useState('9823012944');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [gatePassRef, setGatePassRef] = useState('');

  // Selected commodity
  const selectedCommodity = useMemo(() => {
    return MOCK_COMMODITIES.find(c => c.id === selectedCommodityId) || MOCK_COMMODITIES[0];
  }, [selectedCommodityId]);

  // Filtered FPS list for search
  const filteredFps = useMemo(() => {
    if (!searchFps.trim()) return MOCK_RATION_SHOPS;
    const q = searchFps.toLowerCase();
    return MOCK_RATION_SHOPS.filter(s => 
      s.fps_code.toLowerCase().includes(q) || 
      s.owner_name.toLowerCase().includes(q) || 
      s.village_ward.toLowerCase().includes(q)
    );
  }, [searchFps]);

  // Available batches for selected commodity (Sorted by FIFO or FEFO)
  const availableBatches = useMemo(() => {
    const list = MOCK_BATCHES.filter(b => 
      b.commodity_id === selectedCommodityId && 
      b.status === 'AVAILABLE' && 
      b.current_qty_g > 0
    );
    if (selectedCommodity.policy === 'FEFO') {
      return [...list].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    }
    // Default FIFO: Oldest received first
    return [...list].sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());
  }, [selectedCommodityId, selectedCommodity]);

  // Total available stock in grams
  const totalAvailableGrams = useMemo(() => {
    return availableBatches.reduce((acc, b) => acc + b.current_qty_g, 0);
  }, [availableBatches]);

  const requestedGrams = (requestedKg || 0) * 1000;
  const isShortfall = requestedGrams > totalAvailableGrams;

  // Auto-calculated allocation slices
  const allocation = useMemo((): AllocationSlice[] => {
    if (requestedGrams <= 0 || availableBatches.length === 0) return [];

    let remainingToAllocate = requestedGrams;
    const slices: AllocationSlice[] = [];

    if (isOverrideApplied && overrideBatchId) {
      const chosen = availableBatches.find(b => b.id === overrideBatchId);
      if (chosen) {
        const take = Math.min(chosen.current_qty_g, remainingToAllocate);
        slices.push({
          batch: chosen,
          qty_g: take,
          percentage: (take / requestedGrams) * 100,
          isOverride: true
        });
        remainingToAllocate -= take;
      }
    }

    for (const b of availableBatches) {
      if (remainingToAllocate <= 0) break;
      if (isOverrideApplied && b.id === overrideBatchId) continue; // Already counted

      const take = Math.min(b.current_qty_g, remainingToAllocate);
      slices.push({
        batch: b,
        qty_g: take,
        percentage: (take / requestedGrams) * 100,
        isOverride: false
      });
      remainingToAllocate -= take;
    }

    return slices;
  }, [requestedGrams, availableBatches, isOverrideApplied, overrideBatchId]);

  // Handle Maker-Checker Override Submission
  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideBatchId || !overrideJustification || !overrideAck) return;

    const chosen = availableBatches.find(b => b.id === overrideBatchId);
    const skipped = availableBatches[0];

    addApprovalRequest({
      id: `appr-${Date.now()}`,
      request_type: 'FIFO_EXCEPTION',
      reference_no: `EXC-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: `FIFO Override for ${selectedFps?.fps_code} (${selectedCommodity.name})`,
      requested_by_id: 'u-curr',
      requested_by_name: 'Current Operator',
      details: overrideJustification,
      skipped_batch: skipped ? `${skipped.batch_no} (${calculateAgeDays(skipped.received_date)}d old)` : undefined,
      chosen_batch: chosen ? `${chosen.batch_no} (${calculateAgeDays(chosen.received_date)}d old)` : undefined,
      reason_code: overrideReason,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      sla_due_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString()
    });

    setIsOverrideApplied(true);
    setShowOverrideDrawer(false);
  };

  // Complete Dispatch Seal
  const handleSealDispatch = () => {
    const ref = `DSP-2026-NAG-${Math.floor(1000 + Math.random() * 9000)}`;
    setGatePassRef(ref);

    // Ledger movements for each allocated batch
    allocation.forEach(slice => {
      addLedgerMovement({
        movement_id: Math.floor(5000 + Math.random() * 5000),
        created_at: new Date().toISOString(),
        movement_type: 'DISPATCH',
        batch_no: slice.batch.batch_no,
        bin_code: slice.batch.bin_code,
        qty_delta_g: -slice.qty_g,
        balance_after_g: Math.max(0, slice.batch.current_qty_g - slice.qty_g),
        ref_no: ref,
        actor: `${activeRole} (Operator)`,
        row_hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
      });
    });

    setDispatchSuccess(true);
  };

  return (
    <div data-page="dispatch" className="space-y-6">
      {/* Workflow Progress Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('dispatch.title')}
            </h1>
            <p className="text-xs text-muted-foreground">
              Automated FIFO/FEFO Multi-Batch Allocation & Gate Pass Generator
            </p>
          </div>
        </div>

        {/* 3 Steps indicator */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              step === 1 ? 'bg-brand text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">1</span>
            Allocation
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <button 
            onClick={() => step > 1 && setStep(2)}
            disabled={step < 2}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              step === 2 ? 'bg-brand text-white shadow-sm' : 'bg-muted text-muted-foreground disabled:opacity-50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">2</span>
            Pick & Verify
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <button 
            onClick={() => step === 3 && setStep(3)}
            disabled={step < 3}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              step === 3 ? 'bg-brand text-white shadow-sm' : 'bg-muted text-muted-foreground disabled:opacity-50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">3</span>
            Gate Pass Seal
          </button>
        </div>
      </div>

      {/* STEP 1: CONFIGURE & ALLOCATE */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: FPS, Commodity, Quantity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" />
                Select Destination FPS Ration Shop
              </h2>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search FPS Code, owner, or ward..."
                  value={searchFps}
                  onChange={(e) => setSearchFps(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {filteredFps.map(fps => (
                  <div 
                    key={fps.id}
                    onClick={() => setSelectedFps(fps)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer border transition-all ${
                      selectedFps?.id === fps.id 
                        ? 'border-brand bg-brand/5 shadow-xs' 
                        : 'border-border/60 hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground">{fps.fps_code}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fps.distance_km} km
                      </span>
                    </div>
                    <div className="text-foreground/90 font-medium truncate mt-0.5">{fps.owner_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{fps.village_ward}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commodity & Quantity Inputs */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Select Commodity
                </label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {MOCK_COMMODITIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.policy} Policy)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Requested Order Quantity
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Available: <span className="font-mono font-bold text-foreground"><QuantityText grams={totalAvailableGrams} /></span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min="50"
                    step="50"
                    value={requestedKg}
                    onChange={(e) => setRequestedKg(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand tabular-nums"
                  />
                  <span className="text-xs font-bold text-muted-foreground px-2 py-2 bg-muted rounded-lg border border-border">
                    kg
                  </span>
                </div>
                {/* Quick select pills */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[500, 1000, 2000, 5000].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRequestedKg(qty)}
                      className={`text-[10px] px-2 py-1 rounded border font-mono ${
                        requestedKg === qty ? 'bg-brand/10 border-brand text-brand font-bold' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {qty} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* FIFO Override Button */}
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowOverrideDrawer(true)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    isOverrideApplied 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isOverrideApplied ? 'FIFO Override Pending Approval' : 'Request Manual FIFO Bypass'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Batch Allocation Bar & Table */}
          <div className="lg:col-span-8 space-y-4">
            {/* Shortfall Alert */}
            {isShortfall && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertOctagon className="w-4 h-4" />
                  Stock Shortfall Warning: Insufficient Available Batches
                </div>
                <p className="text-xs text-red-600/90 dark:text-red-300">
                  Requested <strong>{requestedKg} kg</strong> exceeds the godown's non-quarantined available stock of <strong>{(totalAvailableGrams / 1000).toLocaleString('en-IN')} kg</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setRequestedKg(totalAvailableGrams / 1000)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold shadow-xs hover:bg-red-700"
                  >
                    Allocate Maximum Available ({totalAvailableGrams / 1000} kg)
                  </button>
                  <button
                    onClick={() => setRequestedKg(500)}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-semibold hover:bg-red-500/5"
                  >
                    Reset to 500 kg
                  </button>
                </div>
              </div>
            )}

            {/* Proportional Multi-Batch Split Bar */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Automated Batch Allocation Split
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Enforcing {selectedCommodity.policy} rule across active stacks
                  </p>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {allocation.length} batch(es) split
                </span>
              </div>

              {/* The Visual Stacked Bar */}
              <div className="h-6 w-full rounded-lg overflow-hidden flex bg-muted p-0.5 border border-border">
                {allocation.map((slice, idx) => {
                  const colors = [
                    'bg-emerald-500 hover:bg-emerald-600',
                    'bg-teal-500 hover:bg-teal-600',
                    'bg-cyan-500 hover:bg-cyan-600',
                    'bg-blue-500 hover:bg-blue-600'
                  ];
                  const color = slice.isOverride ? 'bg-amber-500' : colors[idx % colors.length];

                  return (
                    <div
                      key={slice.batch.id}
                      style={{ width: `${slice.percentage}%` }}
                      className={`h-full ${color} transition-all relative group cursor-pointer border-r border-background/20 last:border-r-0`}
                      title={`${slice.batch.batch_no}: ${(slice.qty_g / 1000).toLocaleString('en-IN')} kg (${slice.percentage.toFixed(1)}%)`}
                    >
                      {slice.percentage > 12 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white truncate px-1">
                          {slice.percentage.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bar legend */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {allocation.map((slice) => (
                  <div key={slice.batch.id} className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-2.5 h-2.5 rounded-xs ${slice.isOverride ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="font-mono text-foreground font-semibold">{slice.batch.batch_no}</span>
                    <span className="text-muted-foreground font-mono">({(slice.qty_g / 1000).toLocaleString('en-IN')} kg)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch Allocation Table */}
            <div className="rounded-xl bg-surface border border-border overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Pick Sequence & Location Manifest
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Target Destination: <strong className="text-foreground">{selectedFps?.fps_code}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/10">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Batch ID</th>
                      <th className="py-2.5 px-3">Bin Location</th>
                      <th className="py-2.5 px-3">Batch Age</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-right">To Pick</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {allocation.map((slice, idx) => {
                      const ageDays = calculateAgeDays(slice.batch.received_date);
                      return (
                        <tr key={slice.batch.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-muted-foreground">
                            #{idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <BatchChip batchNo={slice.batch.batch_no} />
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                              {slice.batch.bin_code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <AgeBadge days={ageDays} />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground tabular-nums">
                            <QuantityText grams={slice.batch.current_qty_g} />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground tabular-nums">
                            <QuantityText grams={slice.qty_g} />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {idx === 0 && !slice.isOverride ? (
                              <StatusPill status="NEXT_TO_DISPATCH" />
                            ) : slice.isOverride ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                BYPASS PENDING
                              </span>
                            ) : (
                              <StatusPill status="AVAILABLE" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer CTA */}
              <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Sum of allocation matches requested quantity: <strong className="text-foreground font-mono">{requestedKg} kg</strong>
                </div>
                <button
                  type="button"
                  disabled={allocation.length === 0 || isShortfall}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white font-semibold text-xs shadow-sm hover:bg-brand/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Confirm Allocation & Review Pick List
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PICK & SCAN VERIFICATION */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" />
                Step 2: Physical Pick Manifest & Scan Verification
              </h2>
              <p className="text-xs text-muted-foreground">
                Walking path optimized in walking order. Scan QR barcodes on pallet stacks to unlock dispatch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Printer className="w-3.5 h-3.5" /> Print Pick Sheet
              </button>
              <button 
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isCameraActive ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> {isCameraActive ? 'Camera Scanner Active' : 'Toggle Camera Scanner'}
              </button>
            </div>
          </div>

          {/* Simulated Scanner Viewport */}
          {isCameraActive && (
            <div className="p-6 rounded-xl bg-black text-white text-center space-y-3 border border-border relative overflow-hidden">
              <div className="w-48 h-48 mx-auto border-2 border-dashed border-emerald-400 rounded-lg flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-pulse" />
                <QrCode className="w-16 h-16 text-emerald-400 mb-2 opacity-80" />
                <span className="text-[10px] font-mono text-emerald-300">Point phone camera at Stack QR Label</span>
              </div>
              <p className="text-xs text-zinc-400">
                Simulating video feed. Click "Simulate Scan" below to confirm each batch.
              </p>
            </div>
          )}

          {/* Pick Tasks Table */}
          <div className="rounded-xl bg-surface border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/20">
                    <th className="py-2.5 px-4">Walking Order</th>
                    <th className="py-2.5 px-4">Bin Code</th>
                    <th className="py-2.5 px-4">Batch Number</th>
                    <th className="py-2.5 px-4">Quantity to Pick</th>
                    <th className="py-2.5 px-4 text-center">Physical Scan Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {allocation.map((slice, idx) => {
                    const isScanned = !!scannedItems[slice.batch.id];
                    return (
                      <tr key={slice.batch.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          Stop #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {slice.batch.bin_code}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {slice.batch.batch_no}
                        </td>
                        <td className="py-3 px-4 font-mono text-foreground font-semibold">
                          <QuantityText grams={slice.qty_g} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isScanned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3.5 h-3.5" /> Barcode Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" /> Awaiting Scan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setScannedItems(prev => ({ ...prev, [slice.batch.id]: !prev[slice.batch.id] }))}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                              isScanned 
                                ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                          >
                            {isScanned ? 'Unmark' : 'Simulate Scan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Object.values(scannedItems).filter(Boolean).length} of {allocation.length} items scanned and verified
              </span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white font-semibold text-xs shadow-sm hover:bg-brand/90 transition-all cursor-pointer"
              >
                Proceed to Gate Pass & Vehicle Seal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: GATE PASS & SEAL */}
      {step === 3 && (
        <div className="max-w-3xl mx-auto space-y-6">
          {!dispatchSuccess ? (
            <div className="p-6 rounded-xl bg-surface border border-border space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Issue Gate Pass & Cryptographic Seal
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Vehicle registration, driver identity, and tamper-proof chain seal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Back to Pick List
                </button>
              </div>

              {/* Summary of dispatch */}
              <div className="p-4 rounded-lg bg-muted/40 border border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Destination FPS</span>
                  <strong className="font-mono text-foreground">{selectedFps?.fps_code}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Commodity</span>
                  <strong className="text-foreground">{selectedCommodity.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Weight</span>
                  <strong className="font-mono text-foreground font-bold">{requestedKg} kg</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Batches Included</span>
                  <strong className="font-mono text-foreground">{allocation.length} batches</strong>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-border bg-background text-foreground uppercase"
                    placeholder="e.g. MH-31-AP-4921"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g. Raju Kulkarni"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Driver Phone *
                  </label>
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground"
                    placeholder="e.g. 9823012944"
                    required
                  />
                </div>
              </div>

              {/* Compliance acknowledgment */}
              <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 text-xs flex items-start gap-2.5">
                <CheckSquare className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  I confirm that all physical bags have been weighed on the electronic weighbridge, batch stencils match the manifest, and moisture is verified under 12%.
                </span>
              </div>

              {/* Primary Seal CTA */}
              <button
                type="button"
                onClick={handleSealDispatch}
                className="w-full py-3 rounded-lg bg-brand hover:bg-brand/90 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                Commit to Ledger & Issue Gate Pass
              </button>
            </div>
          ) : (
            /* SUCCESS STATE */
            <div className="p-8 rounded-xl bg-surface border border-emerald-500/30 text-center space-y-6 shadow-md">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                  CRYPTOGRAPHIC SEAL ATTESTED
                </span>
                <h2 className="text-xl font-bold text-foreground pt-2">
                  Gate Pass Issued Successfully
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  Reference: <strong>{gatePassRef}</strong>
                </p>
              </div>

              {/* QR Code Graphic */}
              <div className="p-4 rounded-lg bg-background border border-border max-w-xs mx-auto flex flex-col items-center space-y-2">
                <div className="w-36 h-36 bg-zinc-900 rounded-lg p-2 flex items-center justify-center">
                  <QrCode className="w-28 h-28 text-white" />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground break-all text-center">
                  SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => alert(`Simulated Download of Gate Pass PDF: ${gatePassRef}`)}
                  className="px-4 py-2 rounded-lg bg-foreground text-background font-semibold text-xs flex items-center gap-2 hover:opacity-90"
                >
                  <FileText className="w-4 h-4" /> Download Gate Pass PDF
                </button>
                <button
                  type="button"
                  onClick={() => setScreen('verify')}
                  className="px-4 py-2 rounded-lg border border-border font-semibold text-xs text-foreground flex items-center gap-2 hover:bg-muted"
                >
                  <QrCode className="w-4 h-4" /> Open Public Verify Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDispatchSuccess(false);
                    setStep(1);
                  }}
                  className="px-4 py-2 rounded-lg bg-brand text-white font-semibold text-xs flex items-center gap-2 hover:bg-brand/90"
                >
                  <RefreshCw className="w-4 h-4" /> Start New Dispatch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FIFO EXCEPTION OVERRIDE DRAWER (Maker-Checker Guard) */}
      {showOverrideDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-surface border-l border-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Request Manual FIFO Bypass
              </div>
              <button 
                onClick={() => setShowOverrideDrawer(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleApplyOverride} className="mt-4 space-y-4 flex-1 flex flex-col">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                <strong>Maker-Checker Policy:</strong> Any deviation from the oldest batch triggers an immediate audit alert and requires dual-supervisor approval before gate pass generation.
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Select Alternative Non-FIFO Batch *
                </label>
                <select
                  value={overrideBatchId}
                  onChange={(e) => setOverrideBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-mono"
                  required
                >
                  <option value="">-- Choose batch to prioritize --</option>
                  {availableBatches.slice(1).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_no} (Bin: {b.bin_code}, Age: {calculateAgeDays(b.received_date)}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Reason Code *
                </label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
                  required
                >
                  <option value="PHYSICAL_ACCESS_BLOCKED">Physical access blocked (Crane/forklift path obstructed)</option>
                  <option value="DAMAGED_STACK">Damaged stack / Torn bag packaging</option>
                  <option value="PEST_INFESTATION">Suspected pest or moisture infestation</option>
                  <option value="QUALITY_SUSPECT">Quality suspect awaiting re-test</option>
                  <option value="TESTING_SAMPLE">Batch reserved for NABL laboratory audit</option>
                  <option value="COURT_ADMIN_ORDER">District Magistrate / Court hold order</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Justification & Godown Log Reference *
                </label>
                <textarea
                  rows={3}
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  placeholder="Provide precise details of the obstruction or issue..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-none"
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideAck}
                    onChange={(e) => setOverrideAck(e.target.checked)}
                    className="mt-0.5 rounded text-brand focus:ring-brand"
                    required
                  />
                  <span>
                    I acknowledge that this action bypasses the automated FIFO algorithm, flags my user ID in the tamper-proof ledger, and routes to the Approvals Inbox for Maker-Checker sign-off.
                  </span>
                </label>
              </div>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOverrideDrawer(false)}
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!overrideBatchId || !overrideJustification || !overrideAck}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  Submit for Maker-Checker Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

