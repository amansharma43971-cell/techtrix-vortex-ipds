import React, { useState } from 'react';
import { 
  Building2, Radio, ShieldCheck, AlertTriangle, ShieldAlert, 
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, Box, Truck, 
  Layers, Star, X, Play, Pause, AlertOctagon 
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { TRANSLATIONS } from '../i18n/translations';
import { formatQuantity } from '../lib/formatters';
import { 
  MOCK_BATCHES, MOCK_BINS, MOCK_PUTAWAY_TASKS, MOCK_PICK_TASKS, 
  MOCK_LEDGER_FEED, MOCK_APPROVALS, Bin, Batch 
} from '../mocks/mockData';
import { StatusPill } from '../components/ui/StatusPill';
import { AgeBadge } from '../components/ui/AgeBadge';

export const ControlTowerView: React.FC = () => {
  const { language, unitPreference } = useUIStore();
  const t = TRANSLATIONS[language];

  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'BULK' | 'PICK_FACE' | 'QUARANTINE' | 'DISPATCH_STAGING'>('ALL');
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [isFeedPaused, setIsFeedPaused] = useState(false);

  // Aggregated KPIs
  const totalStockGrams = MOCK_BATCHES.reduce((acc, b) => acc + (b.status !== 'EXPIRED' ? b.current_qty_g : 0), 0);
  const heldStockGrams = MOCK_BATCHES.filter(b => b.status === 'QUALITY_HOLD').reduce((acc, b) => acc + b.current_qty_g, 0);
  const nearExpiryBatchesCount = MOCK_BATCHES.filter(b => b.status === 'AVAILABLE' && b.expiry_date === '2026-11-05').length;

  const filteredBins = MOCK_BINS.filter(b => zoneFilter === 'ALL' || b.zone_type === zoneFilter);

  // Next-to-pick queue (FIFO priority order: oldest received date first)
  const nextToPickQueue = [...MOCK_BATCHES]
    .filter(b => b.status === 'AVAILABLE' && b.current_qty_g > 0)
    .sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* 1. HERO KPI STRIP (10 High-Density Operational Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2.5">
        
        {/* KPI 1: Available Stock */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_available_stock}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-white font-mono tabular-nums">
              {formatQuantity(totalStockGrams, unitPreference)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> 100% Invariant
          </span>
        </div>

        {/* KPI 2: Held Stock */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_held_stock}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-red-400 font-mono tabular-nums">
              {formatQuantity(heldStockGrams, unitPreference)}
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <span className="text-[10px] text-red-400/80">Trigger Lock BS001</span>
        </div>

        {/* KPI 3: Quarantined Recall */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            Recall Fenced
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-rose-500 font-mono tabular-nums">
              0.00 kg
            </span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className="text-[10px] text-slate-500">Zero Active Recall</span>
        </div>

        {/* KPI 4: Near Expiry */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_near_expiry}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-amber-400 font-mono tabular-nums">
              {nearExpiryBatchesCount} Batches
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-[10px] text-amber-400/80">FEFO Rush Candidate</span>
        </div>

        {/* KPI 5: FIFO Compliance */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_fifo_compliance}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-400 font-mono tabular-nums">
              99.4%
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-500">Zero Inversion</span>
        </div>

        {/* KPI 6: Inflow Today */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_inbound_today}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-blue-400 font-mono tabular-nums">
              +25.0 MT
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-[10px] text-slate-500">1 Consignment</span>
        </div>

        {/* KPI 7: Outflow Today */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_outbound_today}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-purple-400 font-mono tabular-nums">
              -12.8 MT
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[10px] text-slate-500">4 FPS Dispatches</span>
        </div>

        {/* KPI 8: Open Tasks */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_open_tasks}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-white font-mono tabular-nums">
              {MOCK_PUTAWAY_TASKS.length + MOCK_PICK_TASKS.length}
            </span>
            <Box className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400">{MOCK_PUTAWAY_TASKS.length} Put · {MOCK_PICK_TASKS.length} Pick</span>
        </div>

        {/* KPI 9: Overdue SLA */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_overdue_tasks}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-slate-400 font-mono tabular-nums">
              0
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-[10px] text-emerald-400">100% on SLA</span>
        </div>

        {/* KPI 10: Ledger Integrity */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
            {t.kpi_ledger_integrity}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base font-black text-emerald-400 font-mono tabular-nums">
              VALID
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-500">SHA-256 Intact</span>
        </div>
      </div>

      {/* 2. KANBAN PIPELINES: Inbound Putaway & Outbound Wave Picking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Inbound Kanban */}
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-mono">
              <Box className="w-4 h-4" /> Inbound Putaway Pipeline
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{MOCK_PUTAWAY_TASKS.length} pending slotting</span>
          </div>

          <div className="space-y-2">
            {MOCK_PUTAWAY_TASKS.map((task) => (
              <div key={task.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white">{task.task_no}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">
                      {task.commodity_name}
                    </span>
                    <span className="text-slate-400">{task.batch_no}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 font-mono">
                    <span>Qty: <strong className="text-white">{formatQuantity(task.qty_g, unitPreference)}</strong></span>
                    <span>Target: <strong className="text-emerald-400">{task.suggested_bin_code}</strong></span>
                    <span className="text-amber-400">SLA: 45m rem.</span>
                  </div>
                </div>
                <button 
                  onClick={() => alert(`Opening barcode scanner for Putaway Task ${task.task_no}`)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-sm transition"
                >
                  Scan Putaway
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Outbound Kanban */}
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-mono">
              <Truck className="w-4 h-4" /> Outbound Wave Pick Pipeline
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{MOCK_PICK_TASKS.length} pick lines</span>
          </div>

          <div className="space-y-2">
            {MOCK_PICK_TASKS.map((task) => (
              <div key={task.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white">{task.task_no}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800">
                      {task.bin_code}
                    </span>
                    <span className="text-slate-400">{task.fps_code}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 font-mono">
                    <span>Batch: <strong className="text-white">{task.batch_no}</strong></span>
                    <span>Pick: <strong className="text-purple-400">{formatQuantity(task.qty_g, unitPreference)}</strong></span>
                    <span className="text-slate-500">Walking Seq #{task.pick_sequence}</span>
                  </div>
                </div>
                <button 
                  onClick={() => alert(`Opening barcode scanner for Pick Task ${task.task_no}`)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow-sm transition"
                >
                  Scan Pick
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 2D GODOWN PHYSICAL BIN HEATMAP & WALKING MATRIX */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-emerald-400" />
              2D Godown Physical Bin Heatmap & Walking Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click any bin to inspect physical grain stacks, ages, and recent movements</p>
          </div>

          {/* Zone Selector Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(['ALL', 'BULK', 'PICK_FACE', 'QUARANTINE', 'DISPATCH_STAGING'] as const).map(zone => (
              <button
                key={zone}
                onClick={() => setZoneFilter(zone)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                  zoneFilter === zone 
                    ? 'bg-amber-500 text-slate-950 font-black' 
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {filteredBins.map((bin) => {
            const occPct = Math.round((bin.current_occupancy_g / bin.max_capacity_g) * 100);
            const isQuarantine = bin.zone_type === 'QUARANTINE';
            const isOldest = bin.bin_code === 'BLK-A-01-1';
            const isNearExp = bin.bin_code === 'PF-01';

            let cellBg = 'bg-slate-950 border-slate-800';
            if (isQuarantine) cellBg = 'bg-red-950/70 border-red-800 text-red-200';
            else if (occPct > 80) cellBg = 'bg-purple-950/70 border-purple-800 text-purple-200';
            else if (occPct > 40) cellBg = 'bg-indigo-950/70 border-indigo-800 text-indigo-200';
            else if (occPct > 0) cellBg = 'bg-blue-950/70 border-blue-800 text-blue-200';

            return (
              <div
                key={bin.id}
                onClick={() => setSelectedBin(bin)}
                className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 transition transform relative ${cellBg}`}
              >
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="font-bold text-white">{bin.bin_code}</span>
                  {isOldest && <span title="Oldest FIFO batch">⭐</span>}
                  {isQuarantine && <span title="Quarantine Fenced Cell">🚨</span>}
                  {isNearExp && <span title="Near Expiry Batch">⚠️</span>}
                </div>

                <div className="mt-1 text-sm font-black font-mono">{occPct}%</div>

                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex justify-between">
                  <span>{bin.current_occupancy_g / 1000}kg</span>
                  <span>Seq #{bin.pick_sequence}</span>
                </div>

                {/* Occupancy bar */}
                <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full ${isQuarantine ? 'bg-red-500' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(occPct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. NEXT TO DISPATCH QUEUE & OUTFLOW CLASSIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Next to Dispatch Queue */}
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            Next-to-Dispatch Queue (Strict FIFO Order)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2">Rank</th>
                  <th className="py-2 px-2">Batch No</th>
                  <th className="py-2 px-2">Bin Code</th>
                  <th className="py-2 px-2 text-right">Age</th>
                  <th className="py-2 px-2 text-right">Avail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {nextToPickQueue.slice(0, 5).map((batch, idx) => (
                  <tr key={batch.id} className="hover:bg-slate-800/50">
                    <td className="py-2 px-2 text-emerald-400 font-bold">
                      #{idx + 1} {idx === 0 ? '⭐' : ''}
                    </td>
                    <td className="py-2 px-2 font-bold text-white">{batch.batch_no}</td>
                    <td className="py-2 px-2 text-emerald-400 font-bold">{batch.bin_code}</td>
                    <td className="py-2 px-2 text-right">
                      <AgeBadge ageDays={batch.id === 'b01' ? 112 : batch.id === 'b02' ? 84 : 50} />
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-white">
                      {formatQuantity(batch.current_qty_g, unitPreference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outflow Breakdown by Reason */}
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5 font-mono">
            📊 Outflow Classification by Reason (What Left & Why)
          </h3>
          <div className="space-y-2">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="font-bold text-white">DISPATCH (FPS Ration Shops)</span>
              </div>
              <span className="font-mono font-bold text-white">95,000 kg (86.4%)</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <span className="font-bold text-white">QUALITY_HOLD (Moisture Quarantines)</span>
              </div>
              <span className="font-mono font-bold text-white">12,000 kg (10.9%)</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                <span className="font-bold text-white">RECALL_QUARANTINE (Lab Contaminations)</span>
              </div>
              <span className="font-mono font-bold text-white">2,500 kg (2.3%)</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="font-bold text-white">ADJUSTMENT (Moisture / Normal Shrinkage)</span>
              </div>
              <span className="font-mono font-bold text-white">500 kg (0.4%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. LIVE LEDGER & TELEMETRY STREAM TICKER */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-2 font-mono text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-bold">LIVE TELEMETRY STREAM (PostgreSQL LISTEN/NOTIFY)</span>
          </div>
          <button 
            onClick={() => setIsFeedPaused(!isFeedPaused)}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
          >
            {isFeedPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isFeedPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px] text-slate-300">
          {MOCK_LEDGER_FEED.map((feed) => (
            <div key={feed.movement_id} className="py-1 px-2 rounded bg-slate-950/60 border border-slate-900 flex justify-between items-center">
              <div>
                <span className="text-slate-500 mr-2">{feed.created_at.slice(11, 19)}</span>
                <span className={`font-bold mr-2 ${feed.movement_type === 'DISPATCH' ? 'text-purple-400' : feed.movement_type === 'HOLD' ? 'text-red-400' : 'text-blue-400'}`}>
                  [{feed.movement_type}]
                </span>
                <span>Batch {feed.batch_no} in Bin {feed.bin_code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{formatQuantity(feed.qty_delta_g, unitPreference)}</span>
                <span className="text-[10px] text-slate-500">Hash: {feed.row_hash.slice(0, 8)}...</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. SLIDING BIN DETAIL DRAWER */}
      {selectedBin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Physical Stack Detail</span>
                <h3 className="text-xl font-bold font-mono text-white">{selectedBin.bin_code}</h3>
              </div>
              <button onClick={() => setSelectedBin(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
              <div><span className="text-slate-500 block">Zone Type</span><span className="text-white font-bold">{selectedBin.zone_type}</span></div>
              <div><span className="text-slate-500 block">Pick Sequence</span><span className="text-emerald-400 font-bold">#{selectedBin.pick_sequence}</span></div>
              <div><span className="text-slate-500 block">Max Capacity</span><span className="text-white font-bold">{selectedBin.max_capacity_g / 1000} kg</span></div>
              <div><span className="text-slate-500 block">Occupancy</span><span className="text-amber-400 font-bold">{Math.round((selectedBin.current_occupancy_g / selectedBin.max_capacity_g) * 100)}%</span></div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Batches in this Stack</h4>
              {MOCK_BATCHES.filter(b => b.bin_code === selectedBin.bin_code).map(batch => (
                <div key={batch.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{batch.batch_no}</span>
                    <span className="text-emerald-400 font-bold">{formatQuantity(batch.current_qty_g, unitPreference)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-sans">
                    <span>Recv: {batch.received_date}</span>
                    <StatusPill status={batch.status} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button 
                onClick={() => { alert(`Relocate stack from ${selectedBin.bin_code}`); setSelectedBin(null); }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs"
              >
                Relocate Stack
              </button>
              <button 
                onClick={() => { alert(`Quarantine bin ${selectedBin.bin_code}`); setSelectedBin(null); }}
                className="w-full py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold rounded-lg text-xs"
              >
                Quarantine Entire Stack
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

