import React, { useState } from 'react';
import { 
  ArrowDownLeft, QrCode, CheckCircle2, Printer, 
  MapPin, ShieldAlert, Sparkles, Box, ArrowRight, Layers, FileSpreadsheet
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { MOCK_COMMODITIES, MOCK_BINS, MOCK_PUTAWAY_TASKS, PutawayTask } from '../mocks/mockData';
import { QuantityText } from '../components/ui/QuantityText';
import { BatchChip } from '../components/ui/BatchChip';

export const ReceiptsPutawayView: React.FC = () => {
  const { activeRole, addLedgerMovement } = useUIStore();
  const { t } = useTranslation();

  // Tab State: Inward Form vs Active Putaway Tasks
  const [tab, setTab] = useState<'INWARD' | 'PUTAWAY_TASKS'>('INWARD');

  // Inward Consignment State
  const [supplier, setSupplier] = useState('FCI Base Depot Gondia');
  const [vehicleNo, setVehicleNo] = useState('MH-31-AP-9901');
  const [ewayBill, setEwayBill] = useState('EWB-2026-99210-A');
  const [commodityId, setCommodityId] = useState('c1');
  const [grossWeightKg, setGrossWeightKg] = useState<number>(25400);
  const [tareWeightKg, setTareWeightKg] = useState<number>(5400);
  const [moisturePercent, setMoisturePercent] = useState<number>(10.8);

  // Result state
  const [generatedBatchNo, setGeneratedBatchNo] = useState<string | null>(null);
  const [suggestedBin, setSuggestedBin] = useState<string>('BLK-A-02-1');
  const [showQrLabels, setShowQrLabels] = useState(false);

  // Active Putaway tasks
  const [tasks, setTasks] = useState<PutawayTask[]>(MOCK_PUTAWAY_TASKS);

  const netWeightKg = Math.max(0, (grossWeightKg || 0) - (tareWeightKg || 0));
  const netWeightGrams = netWeightKg * 1000;

  // Handle Form Submit
  const handleRegisterConsignment = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(100 + Math.random() * 900);
    const comm = MOCK_COMMODITIES.find(c => c.id === commodityId) || MOCK_COMMODITIES[0];
    const prefix = comm.code.slice(0, 3);
    const newBatchNo = `BATCH-${prefix}-${dateStr}-${randSeq}`;

    setGeneratedBatchNo(newBatchNo);

    // Auto-create putaway task
    const newTask: PutawayTask = {
      id: `pt-${Date.now()}`,
      task_no: `PT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      batch_no: newBatchNo,
      commodity_name: comm.name,
      qty_g: netWeightGrams,
      suggested_bin_code: suggestedBin,
      status: 'OPEN',
      sla_due_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
    };

    setTasks(prev => [newTask, ...prev]);

    // Record ledger receipt
    addLedgerMovement({
      movement_id: Math.floor(6000 + Math.random() * 4000),
      created_at: new Date().toISOString(),
      movement_type: 'RECEIPT',
      batch_no: newBatchNo,
      bin_code: 'INWARD_BAY_01',
      qty_delta_g: netWeightGrams,
      balance_after_g: netWeightGrams,
      ref_no: ewayBill,
      actor: `${activeRole} (Weighbridge Inward)`,
      row_hash: `0x${Math.random().toString(16).substring(2, 10)}`
    });
  };

  // Confirm Putaway Execution
  const handleConfirmPutaway = (taskId: string, batchNo: string, binCode: string, qtyG: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'DONE' } : t));

    addLedgerMovement({
      movement_id: Math.floor(7000 + Math.random() * 3000),
      created_at: new Date().toISOString(),
      movement_type: 'PUTAWAY',
      batch_no: batchNo,
      bin_code: binCode,
      qty_delta_g: qtyG,
      balance_after_g: qtyG,
      ref_no: taskId,
      actor: `${activeRole} (Forklift Operator)`,
      row_hash: `0x${Math.random().toString(16).substring(2, 10)}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Tab Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.receipts')} & Putaway Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Weighbridge Electronic Inward, Automated Batch Tagging & Smart Bin Allocation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('INWARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'INWARD' ? 'bg-brand text-white shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Inward Intake Form
          </button>
          <button
            onClick={() => setTab('PUTAWAY_TASKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
              tab === 'PUTAWAY_TASKS' ? 'bg-brand text-white shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Active Putaway Tasks ({tasks.filter(t => t.status !== 'DONE').length})
          </button>
        </div>
      </div>

      {tab === 'INWARD' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Intake Registration Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-xl bg-surface border border-border shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-brand" />
                  Electronic Inward Consignment (Goods Receipt Note)
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Format: ISO/DIS-PDS-2026
                </span>
              </div>

              <form onSubmit={handleRegisterConsignment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Supplier / Depot Agency *
                    </label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-border bg-background text-foreground uppercase"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      e-Way Bill / Dispatch Challan No *
                    </label>
                    <input
                      type="text"
                      value={ewayBill}
                      onChange={(e) => setEwayBill(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Commodity *
                    </label>
                    <select
                      value={commodityId}
                      onChange={(e) => setCommodityId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium"
                    >
                      {MOCK_COMMODITIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.policy})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weighbridge Dual-Scale Integration */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Electronic Weighbridge Gross / Tare Weights</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Calibrated Scale #WB-01
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Gross Wt (kg)</label>
                      <input
                        type="number"
                        value={grossWeightKg}
                        onChange={(e) => setGrossWeightKg(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-border bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Tare Wt (kg)</label>
                      <input
                        type="number"
                        value={tareWeightKg}
                        onChange={(e) => setTareWeightKg(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-border bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Net Inward (kg)</label>
                      <div className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-brand/30 bg-brand/5 text-brand">
                        {netWeightKg.toLocaleString('en-IN')} kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-1/2">
                      <label className="text-[11px] text-muted-foreground block mb-1">Grain Moisture (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={moisturePercent}
                        onChange={(e) => setMoisturePercent(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border ${
                          moisturePercent > 12 ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-border bg-background text-foreground'
                        }`}
                      />
                    </div>
                    <div className="w-1/2 pt-4">
                      {moisturePercent > 12 ? (
                        <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> High Moisture (&gt;12%). Needs Quality Check!
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Moisture within FCI tolerance (&lt;12%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand/90 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Register Consignment & Generate Smart Batch
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Smart Putaway Suggestions & Printable Labels */}
          <div className="lg:col-span-5 space-y-4">
            {generatedBatchNo ? (
              <div className="p-5 rounded-xl bg-surface border border-emerald-500/30 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Consignment Accepted & Batch Minted
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Minted Batch ID</span>
                    <BatchChip batchNo={generatedBatchNo} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Inward Net Qty</span>
                    <strong className="font-mono text-foreground">{netWeightKg.toLocaleString('en-IN')} kg</strong>
                  </div>
                </div>

                {/* Smart Putaway Scoring Engine */}
                <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                    <Sparkles className="w-4 h-4" />
                    AI Putaway Scoring Recommendation
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Bin <strong>{suggestedBin}</strong> scored #1 (94/100) based on commodity affinity, fast-moving pick proximity, and non-blocking FIFO depth.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-bold text-foreground">Target Bin: {suggestedBin}</span>
                    <button
                      onClick={() => setShowQrLabels(true)}
                      className="px-3 py-1 rounded bg-brand text-white text-[11px] font-semibold hover:bg-brand/90 flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Preview Stack QR Labels
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface border border-dashed border-border text-center space-y-3">
                <Box className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <h3 className="text-xs font-bold text-foreground">Awaiting Inward Submission</h3>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Once the weighbridge readings are submitted, the automated Putaway Engine will calculate the optimal rack location and generate serialized stack labels.
                </p>
              </div>
            )}

            {/* QR Label Sheet Modal / Inline Preview */}
            {showQrLabels && generatedBatchNo && (
              <div className="p-5 rounded-xl bg-surface border border-border shadow-md space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-brand" />
                    Printable Pallet Stack Labels (2x2 Grid)
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-[11px] font-semibold text-foreground hover:bg-muted"
                  >
                    <Printer className="w-3 h-3" /> Print
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="p-3 border-2 border-dashed border-border rounded-lg bg-background text-center space-y-1">
                      <div className="w-16 h-16 bg-zinc-900 rounded mx-auto p-1 flex items-center justify-center">
                        <QrCode className="w-14 h-14 text-white" />
                      </div>
                      <div className="font-mono text-[10px] font-bold text-foreground truncate">{generatedBatchNo}</div>
                      <div className="text-[9px] text-muted-foreground">Pallet #{idx} · {suggestedBin}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ACTIVE PUTAWAY TASKS TAB */
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-foreground">Open Putaway & Stacking Tasks</h3>
              <p className="text-[11px] text-muted-foreground">Forklift operators must scan bin QR to confirm putaway</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground font-semibold">
              {tasks.length} Total Tasks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/10">
                  <th className="py-2.5 px-4">Task ID</th>
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-4">Commodity</th>
                  <th className="py-2.5 px-4 text-right">Quantity</th>
                  <th className="py-2.5 px-4">Recommended Bin</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{task.task_no}</td>
                    <td className="py-3 px-4">
                      <BatchChip batchNo={task.batch_no} />
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{task.commodity_name}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-foreground">
                      <QuantityText grams={task.qty_g} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {task.suggested_bin_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.status === 'DONE' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {task.status !== 'DONE' ? (
                        <button
                          onClick={() => handleConfirmPutaway(task.id, task.batch_no, task.suggested_bin_code, task.qty_g)}
                          className="px-3 py-1 rounded bg-brand text-white font-semibold text-xs hover:bg-brand/90 transition-all cursor-pointer"
                        >
                          Confirm Bin Scan
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

