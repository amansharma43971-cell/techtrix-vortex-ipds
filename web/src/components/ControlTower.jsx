import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Radio, ShieldCheck, AlertTriangle, ShieldAlert, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, Clock, Search, Layers, ChevronRight, X, 
  Play, Pause, RefreshCw, Box, Truck, User, QrCode
} from 'lucide-react';

export default function ControlTower({ apiBase, selectedWarehouse }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [putawayTasks, setPutawayTasks] = useState([]);
  const [pickTasks, setPickTasks] = useState([]);
  const [nextQueue, setNextQueue] = useState([]);
  const [removals, setRemovals] = useState([]);
  const [slottingRecs, setSlottingRecs] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);
  const [binDetail, setBinDetail] = useState(null);
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [tickerPaused, setTickerPaused] = useState(false);
  const [eventLogs, setEventLogs] = useState([]);
  const [selectedRole, setSelectedRole] = useState('SUPERVISOR');

  // Putaway scan modal state
  const [activePutawayTask, setActivePutawayTask] = useState(null);
  const [scanBinInput, setScanBinInput] = useState('');
  const [scanBatchInput, setScanBatchInput] = useState('');
  const [scanOverrideReason, setScanOverrideReason] = useState('');
  const [scanError, setScanError] = useState(null);

  // Pick scan modal state
  const [activePickTask, setActivePickTask] = useState(null);
  const [pickBinInput, setPickBinInput] = useState('');
  const [pickBatchInput, setPickBatchInput] = useState('');
  const [pickQtyInput, setPickQtyInput] = useState('');
  const [pickError, setPickError] = useState(null);

  const fetchControlTowerData = async () => {
    try {
      const whParam = selectedWarehouse ? `?warehouse_id=${selectedWarehouse}` : '';
      const [sumRes, heatRes, ptRes, ptkRes, nextRes, remRes, slotRes] = await Promise.all([
        fetch(`${apiBase}/control-tower/summary${whParam}`).then(r => r.json()).catch(() => null),
        fetch(`${apiBase}/bins/heatmap${whParam}`).then(r => r.json()).catch(() => []),
        fetch(`${apiBase}/putaway-tasks${whParam}`).then(r => r.json()).catch(() => []),
        fetch(`${apiBase}/pick-tasks${whParam}`).then(r => r.json()).catch(() => []),
        fetch(`${apiBase}/analytics/next-to-dispatch${whParam}`).then(r => r.json()).catch(() => []),
        fetch(`${apiBase}/analytics/removals-by-reason${whParam}`).then(r => r.json()).catch(() => []),
        fetch(`${apiBase}/analytics/slotting-recommendations`).then(r => r.json()).catch(() => [])
      ]);

      setSummary(sumRes);
      setHeatmap(Array.isArray(heatRes) ? heatRes : []);
      setPutawayTasks(Array.isArray(ptRes) ? ptRes : []);
      setPickTasks(Array.isArray(ptkRes) ? ptkRes : []);
      setNextQueue(Array.isArray(nextRes) ? nextRes : []);
      setRemovals(Array.isArray(remRes) ? remRes : []);
      setSlottingRecs(Array.isArray(slotRes) ? slotRes : []);
    } catch (err) {
      console.error("Control tower fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControlTowerData();
    const interval = setInterval(fetchControlTowerData, 10000); // Polling backup
    return () => clearInterval(interval);
  }, [selectedWarehouse]);

  // SSE Stream Listener
  useEffect(() => {
    if (!apiBase) return;
    const whParam = selectedWarehouse ? `?warehouse_id=${selectedWarehouse}` : '';
    const evtSource = new EventSource(`${apiBase}/control-tower/stream${whParam}`);

    evtSource.addEventListener('stock.changed', (e) => {
      if (tickerPaused) return;
      try {
        const data = JSON.parse(e.data);
        setEventLogs(prev => [data, ...prev.slice(0, 49)]);
        fetchControlTowerData();
      } catch (err) { }
    });

    evtSource.addEventListener('task.updated', (e) => {
      if (tickerPaused) return;
      try {
        const data = JSON.parse(e.data);
        setEventLogs(prev => [data, ...prev.slice(0, 49)]);
        fetchControlTowerData();
      } catch (err) { }
    });

    evtSource.addEventListener('alert.raised', (e) => {
      try {
        const data = JSON.parse(e.data);
        setEventLogs(prev => [data, ...prev.slice(0, 49)]);
        fetchControlTowerData();
      } catch (err) { }
    });

    return () => evtSource.close();
  }, [selectedWarehouse, tickerPaused, apiBase]);

  // Load Bin Detail on Click
  const handleBinClick = async (binId) => {
    setSelectedBin(binId);
    try {
      const res = await fetch(`${apiBase}/bins/${binId}`);
      const data = await res.json();
      setBinDetail(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Putaway Confirmation
  const handleConfirmPutaway = async () => {
    if (!activePutawayTask) return;
    setScanError(null);
    try {
      const res = await fetch(`${apiBase}/putaway-tasks/${activePutawayTask.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanned_bin_code: scanBinInput,
          scanned_batch_no: scanBatchInput,
          worker_id: 'u0000001-0000-0000-0000-000000000001',
          override_reason: scanOverrideReason || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Putaway failed');
      setActivePutawayTask(null);
      fetchControlTowerData();
    } catch (err) {
      setScanError(err.message);
    }
  };

  // Pick Confirmation
  const handleConfirmPick = async () => {
    if (!activePickTask) return;
    setPickError(null);
    try {
      const res = await fetch(`${apiBase}/pick-tasks/${activePickTask.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanned_bin_code: pickBinInput,
          scanned_batch_no: pickBatchInput,
          picked_qty_kg: parseFloat(pickQtyInput),
          picker_id: 'u0000001-0000-0000-0000-000000000001'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.message || data.detail || 'Pick failed');
      setActivePickTask(null);
      fetchControlTowerData();
    } catch (err) {
      setPickError(err.message);
    }
  };

  const filteredHeatmap = heatmap.filter(b => {
    if (zoneFilter === 'ALL') return true;
    return b.zone_type === zoneFilter;
  });

  return (
    <div className="space-y-6 bg-slate-950 text-slate-100 p-4 sm:p-6 rounded-2xl shadow-2xl border border-slate-800 font-sans">
      
      {/* Control Room Header & Status Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                Stock Allocation Control Tower
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  DARK-STORE OPS
                </span>
              </h1>
              <p className="text-xs text-slate-400">Real-time bin-level allocation, FIFO walking routes & tamper-evident outflow telemetry</p>
            </div>
          </div>
        </div>

        {/* Status Indicators & Role Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">LIVE TELEMETRY</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
            summary?.kpis?.integrity_badge === 'VALID' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-red-950/60 text-red-400 border-red-800'
          }`}>
            <ShieldCheck className="w-4 h-4" />
            <span>LEDGER: {summary?.kpis?.integrity_badge || 'VERIFYING'}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <User className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select 
              value={selectedRole} 
              onChange={e => setSelectedRole(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="SUPERVISOR" className="bg-slate-900">Role: Supervisor</option>
              <option value="STORE_EMPLOYEE" className="bg-slate-900">Role: Picker/Putaway</option>
              <option value="QUALITY_OFFICER" className="bg-slate-900">Role: Quality Officer</option>
              <option value="AUDITOR" className="bg-slate-900">Role: Auditor</option>
            </select>
          </div>
        </div>
      </div>

      {/* TOP KPI STRIP (Live with Trend Badges) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Available Stock</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-white font-mono">{summary?.kpis?.total_available_mt || 0} MT</span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> Live
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{(summary?.kpis?.total_available_kg || 0).toLocaleString()} kg</span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Held / Quarantined</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-red-400 font-mono">{(summary?.kpis?.total_held_kg || 0).toLocaleString()} kg</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <span className="text-[10px] text-red-400/80 font-mono">Trigger Block BS001</span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Near Expiry (≤30d)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-400 font-mono">{summary?.kpis?.near_expiry_batches || 0} Batches</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-[10px] text-amber-400/80">FEFO Priority</span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">FIFO Compliance</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-400 font-mono">{summary?.kpis?.fifo_compliance_pct || 99.4}%</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-500">Zero Inversion</span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Open Putaway</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-400 font-mono">{summary?.kpis?.open_putaway_tasks || 0} Tasks</span>
            <Box className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-[10px] text-blue-400/80">Inbound Slotting</span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Open Picks</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-400 font-mono">{summary?.kpis?.open_pick_tasks || 0} Lines</span>
            <Truck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[10px] text-purple-400/80">Wave Dispatch</span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Overdue Tasks</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-xl font-black font-mono ${summary?.kpis?.overdue_tasks > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {summary?.kpis?.overdue_tasks || 0}
            </span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-500">SLA Enforcement</span>
        </div>
      </div>

      {/* KANBAN SECTION: Inbound Putaway & Outbound Wave Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: INBOUND KANBAN */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Box className="w-4 h-4" /> Inbound Pipeline (Putaway Tasks)
            </h2>
            <span className="text-[11px] font-mono text-slate-400">{putawayTasks.length} active tasks</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {putawayTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">No pending putaway tasks</div>
            ) : (
              putawayTasks.map(task => (
                <div key={task.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{task.task_no}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">
                        {task.commodity_name}
                      </span>
                      <span className="font-mono text-slate-400">Batch: {task.batch_no}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Qty: <strong className="text-white font-mono">{task.qty_g / 1000} kg</strong></span>
                      <span>Target: <strong className="text-emerald-400 font-mono">{task.suggested_bin_code}</strong></span>
                      <span className="text-amber-400">SLA: {new Date(task.sla_due_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>

                  {task.status !== 'DONE' && (
                    <button
                      onClick={() => {
                        setActivePutawayTask(task);
                        setScanBinInput(task.suggested_bin_code);
                        setScanBatchInput(task.batch_no);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Scan Putaway
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL 2: OUTBOUND KANBAN */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> Outbound Pipeline (Wave Pick Lines)
            </h2>
            <span className="text-[11px] font-mono text-slate-400">{pickTasks.length} pick lines</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {pickTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">No pending pick tasks</div>
            ) : (
              pickTasks.map(task => (
                <div key={task.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{task.task_no}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800">
                        {task.bin_code}
                      </span>
                      <span className="font-mono text-slate-400">FPS: {task.fps_code}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Batch: <strong className="text-white font-mono">{task.batch_no}</strong></span>
                      <span>Pick: <strong className="text-purple-400 font-mono">{task.qty_g / 1000} kg</strong></span>
                      <span className="text-slate-500 font-mono">Seq #{task.pick_sequence}</span>
                    </div>
                  </div>

                  {task.status !== 'PICKED' && (
                    <button
                      onClick={() => {
                        setActivePickTask(task);
                        setPickBinInput(task.bin_code);
                        setPickBatchInput(task.batch_no);
                        setPickQtyInput((task.qty_g / 1000).toString());
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Scan Pick
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PANEL 3: 2D GODOWN PHYSICAL BIN HEATMAP */}
      <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> 2D Godown Physical Bin Heatmap & Walking Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Live visual matrix: Occupancy % • Quarantines • Oldest FIFO Pick Targets</p>
          </div>

          {/* Zone Selector Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {['ALL', 'BULK', 'PICK_FACE', 'QUARANTINE', 'DISPATCH_STAGING'].map(zone => (
              <button
                key={zone}
                onClick={() => setZoneFilter(zone)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                  zoneFilter === zone 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {filteredHeatmap.map(bin => {
            const occ = parseFloat(bin.occupancy_pct || 0);
            const isQuar = bin.zone_type === 'QUARANTINE';
            const isHeld = bin.is_held;
            const isNearExp = bin.is_near_expiry;
            const isOldest = bin.is_oldest_eligible;

            let bgColor = 'bg-slate-900 border-slate-800';
            if (isQuar || isHeld) bgColor = 'bg-red-950/70 border-red-800/80 text-red-200';
            else if (occ > 85) bgColor = 'bg-purple-950/70 border-purple-800/80 text-purple-200';
            else if (occ > 50) bgColor = 'bg-indigo-950/70 border-indigo-800/80 text-indigo-200';
            else if (occ > 10) bgColor = 'bg-blue-950/70 border-blue-800/80 text-blue-200';

            return (
              <div
                key={bin.id}
                onClick={() => handleBinClick(bin.id)}
                className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 transition transform relative ${bgColor}`}
              >
                {/* Badges / Indicators */}
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="font-bold text-white">{bin.bin_code}</span>
                  {isOldest && <span title="Oldest FIFO batch in godown">⭐</span>}
                  {isHeld && <span title="Quarantined batch inside">🚨</span>}
                  {isNearExp && <span title="Near expiry batch">⚠️</span>}
                </div>

                <div className="mt-1 text-sm font-black font-mono">
                  {occ.toFixed(0)}%
                </div>

                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex justify-between">
                  <span>{bin.current_occupancy_kg}kg</span>
                  <span>Cap: {bin.max_capacity_kg}kg</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full ${isQuar ? 'bg-red-500' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(occ, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PANEL 4 & 5: NEXT TO DISPATCH & REMOVALS REASON BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Next to Pick Queue */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            ⭐ Next-to-Dispatch Queue (FIFO/FEFO Priority Stack)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2">Batch No</th>
                  <th className="py-2 px-2">Commodity</th>
                  <th className="py-2 px-2">Bin Code</th>
                  <th className="py-2 px-2 text-right">Age</th>
                  <th className="py-2 px-2 text-right">Avail Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {nextQueue.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50">
                    <td className="py-2 px-2 font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 text-[9px] flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      {item.batch_no}
                    </td>
                    <td className="py-2 px-2 text-slate-300 font-sans">{item.commodity_name}</td>
                    <td className="py-2 px-2 font-bold text-emerald-400">{item.bin_code}</td>
                    <td className="py-2 px-2 text-right">{item.age_days}d old</td>
                    <td className="py-2 px-2 text-right font-bold text-white">{item.available_kg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Removals by Reason Breakdown */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
            📊 Outflow Breakdown by Reason (What was removed & why)
          </h2>
          <div className="space-y-2">
            {removals.map((r, idx) => (
              <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    r.reason === 'DISPATCH' ? 'bg-emerald-400' :
                    r.reason === 'QUALITY_HOLD' ? 'bg-red-400' :
                    r.reason === 'RECALL_QUARANTINE' ? 'bg-orange-500' : 'bg-purple-400'
                  }`} />
                  <span className="font-bold text-white">{r.reason}</span>
                  <span className="text-[10px] text-slate-400">({r.movement_count} txns)</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {parseFloat(r.total_removed_kg).toLocaleString()} kg
                </span>
              </div>
            ))}
          </div>

          {/* Slotting Recommendation Alerts */}
          {slottingRecs.length > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs space-y-1 mt-3">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High-Velocity Slotting Recommendation
              </span>
              <p className="text-[11px] text-amber-200">
                Found {slottingRecs.length} Class A fast-moving batch(es) in BULK storage. Recommend moving to PICK_FACE to shorten dispatch walking routes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL 6: REAL-TIME LEDGER EVENT TICKER */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-2 font-mono">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>REAL-TIME PHYSICAL BIN MOVEMENT STREAM</span>
          </div>
          <button
            onClick={() => setTickerPaused(!tickerPaused)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
          >
            {tickerPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            {tickerPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs text-slate-300">
          {eventLogs.length === 0 ? (
            <div className="text-slate-500 py-3 text-center text-[11px]">Awaiting live ledger events via SSE...</div>
          ) : (
            eventLogs.map((log, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded bg-slate-950/50 hover:bg-slate-950 border border-slate-900 text-[11px]">
                <span className="text-slate-500">{new Date(log.created_at || Date.now()).toLocaleTimeString()}</span>
                <span className="text-emerald-400 font-bold">[{log.event_type}]</span>
                <span className="text-white">{JSON.stringify(log.payload)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BIN DETAIL DRAWER MODAL */}
      {selectedBin && binDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Physical Stack Detail</span>
                <h3 className="text-xl font-bold font-mono text-white">{binDetail.bin.bin_code}</h3>
              </div>
              <button onClick={() => setSelectedBin(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
              <div><span className="text-slate-500 block">Zone Type</span><span className="text-white font-bold">{binDetail.bin.zone_type}</span></div>
              <div><span className="text-slate-500 block">Pick Sequence</span><span className="text-emerald-400 font-bold">#{binDetail.bin.pick_sequence}</span></div>
              <div><span className="text-slate-500 block">Capacity</span><span className="text-white font-bold">{binDetail.bin.max_capacity_g / 1000} kg</span></div>
              <div><span className="text-slate-500 block">Rack / Bay / Lvl</span><span className="text-white font-bold">{binDetail.bin.rack}-{binDetail.bin.bay}-{binDetail.bin.level}</span></div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Batches in this Bin</h4>
              {binDetail.batches?.map((b, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">{b.batch_no}</span>
                    <span className="text-emerald-400 font-bold">{b.qty_kg} kg</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between font-sans">
                    <span>{b.commodity_name}</span>
                    <span className="text-slate-500">Recv: {b.received_date}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Movements</h4>
              {binDetail.recent_movements?.map((m, i) => (
                <div key={i} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] font-mono flex justify-between items-center">
                  <div>
                    <span className={`font-bold ${m.qty_delta_kg > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      {m.move_type}
                    </span>
                    <span className="text-slate-400 block text-[10px]">{m.user_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">{m.qty_delta_kg > 0 ? '+' : ''}{m.qty_delta_kg} kg</span>
                    <span className="text-[10px] text-slate-500 block">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PUTAWAY SCAN MODAL */}
      {activePutawayTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" /> Confirm Inbound Putaway Scan
            </h3>
            <p className="text-xs text-slate-400">
              Task: <strong className="font-mono text-white">{activePutawayTask.task_no}</strong> | Qty: <strong className="font-mono text-white">{activePutawayTask.qty_g / 1000} kg</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scanned Bin Code (QR)</label>
                <input
                  type="text"
                  value={scanBinInput}
                  onChange={e => setScanBinInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scanned Batch Number (QR)</label>
                <input
                  type="text"
                  value={scanBatchInput}
                  onChange={e => setScanBatchInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Override Reason (if bin differs)</label>
                <input
                  type="text"
                  value={scanOverrideReason}
                  onChange={e => setScanOverrideReason(e.target.value)}
                  placeholder="e.g. Assigned bin blocked by forklift"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            {scanError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
                {scanError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActivePutawayTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPutaway}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow"
              >
                Confirm Putaway Movement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PICK SCAN MODAL */}
      {activePickTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-purple-400" /> Confirm Outbound Pick Scan
            </h3>
            <p className="text-xs text-slate-400">
              Pick Task: <strong className="font-mono text-white">{activePickTask.task_no}</strong> | Target Bin: <strong className="font-mono text-purple-400">{activePickTask.bin_code}</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scanned Bin Code (QR)</label>
                <input
                  type="text"
                  value={pickBinInput}
                  onChange={e => setPickBinInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Scanned Batch QR</label>
                <input
                  type="text"
                  value={pickBatchInput}
                  onChange={e => setPickBatchInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Picked Quantity (kg)</label>
                <input
                  type="number"
                  value={pickQtyInput}
                  onChange={e => setPickQtyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white font-bold"
                />
              </div>
            </div>

            {pickError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
                {pickError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActivePickTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPick}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow"
              >
                Confirm Pick & Update Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

