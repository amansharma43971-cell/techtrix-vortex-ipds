import React from 'react';
import { X, Play, ShieldAlert, AlertOctagon, WifiOff, RefreshCw, Box, Truck } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { MOCK_BATCHES, MOCK_LEDGER_FEED, MOCK_PUTAWAY_TASKS, MOCK_PICK_TASKS } from '../../mocks/mockData';

export const DemoControlsDrawer: React.FC = () => {
  const { isDemoDrawerOpen, setDemoDrawerOpen, isOffline, toggleOffline } = useUIStore();

  if (!isDemoDrawerOpen) return null;

  const simulateReceipt = () => {
    const newBatchNo = `BATCH-DEMO-${Date.now().toString().slice(-4)}`;
    MOCK_BATCHES.unshift({
      id: `b_demo_${Date.now()}`,
      batch_no: newBatchNo,
      receipt_no: `GR-2026-DEMO-${Date.now().toString().slice(-3)}`,
      commodity_id: "c1",
      warehouse_id: "11111111-1111-1111-1111-111111111111",
      received_date: new Date().toISOString().split('T')[0],
      expiry_date: "2027-10-23",
      received_qty_g: 20000000,
      current_qty_g: 20000000,
      held_qty_g: 0,
      status: "AVAILABLE",
      bin_code: "BLK-A-02-1",
      supplier: "Punjab State Grains Pool",
      vehicle_no: "PB-10-CZ-4040"
    });

    MOCK_PUTAWAY_TASKS.unshift({
      id: `pt_${Date.now()}`,
      task_no: `PT-2026-${Date.now().toString().slice(-4)}`,
      batch_no: newBatchNo,
      commodity_name: "Wheat Grade A",
      qty_g: 20000000,
      suggested_bin_code: "BLK-A-02-1",
      status: "OPEN",
      sla_due_at: new Date(Date.now() + 3600000).toISOString()
    });

    MOCK_LEDGER_FEED.unshift({
      movement_id: MOCK_LEDGER_FEED.length + 4815,
      created_at: new Date().toISOString(),
      movement_type: "RECEIPT",
      batch_no: newBatchNo,
      bin_code: "BLK-A-02-1",
      qty_delta_g: 20000000,
      balance_after_g: 20000000,
      ref_no: `GR-2026-DEMO`,
      actor: "Simulated FCI Depot",
      row_hash: "8f2a9910cde451..."
    });

    alert(`Simulated Inward Consignment: Batch ${newBatchNo} (20,000 kg Wheat) registered and putaway task opened!`);
  };

  const simulateDispatch = () => {
    const oldestBatch = MOCK_BATCHES.find(b => b.status === 'AVAILABLE' && b.current_qty_g > 0);
    if (!oldestBatch) {
      alert("No available batch for dispatch simulation.");
      return;
    }

    const dispatchQty = Math.min(oldestBatch.current_qty_g, 1000000); // 1,000 kg
    oldestBatch.current_qty_g -= dispatchQty;
    if (oldestBatch.current_qty_g === 0) oldestBatch.status = 'EXHAUSTED';

    MOCK_PICK_TASKS.unshift({
      id: `pk_${Date.now()}`,
      task_no: `PTK-2026-${Date.now().toString().slice(-4)}`,
      batch_no: oldestBatch.batch_no,
      bin_code: oldestBatch.bin_code,
      fps_code: "FPS-NGP-101",
      qty_g: dispatchQty,
      pick_sequence: 101,
      status: "PENDING",
      sla_due_at: new Date(Date.now() + 3600000).toISOString()
    });

    MOCK_LEDGER_FEED.unshift({
      movement_id: MOCK_LEDGER_FEED.length + 4815,
      created_at: new Date().toISOString(),
      movement_type: "DISPATCH",
      batch_no: oldestBatch.batch_no,
      bin_code: oldestBatch.bin_code,
      qty_delta_g: -dispatchQty,
      balance_after_g: oldestBatch.current_qty_g,
      ref_no: "DSP-DEMO-SIM",
      actor: "Simulated Dispatch Engine",
      row_hash: "a4c89201bd77..."
    });

    alert(`Simulated FIFO Dispatch: ${dispatchQty / 1000} kg allocated from oldest batch ${oldestBatch.batch_no}.`);
  };

  const simulateQualityHold = () => {
    const avail = MOCK_BATCHES.find(b => b.status === 'AVAILABLE');
    if (!avail) return;

    avail.status = 'QUALITY_HOLD';
    avail.held_qty_g = avail.current_qty_g;
    avail.bin_code = 'QUAR-01';

    MOCK_LEDGER_FEED.unshift({
      movement_id: MOCK_LEDGER_FEED.length + 4815,
      created_at: new Date().toISOString(),
      movement_type: "HOLD",
      batch_no: avail.batch_no,
      bin_code: "QUAR-01",
      qty_delta_g: 0,
      balance_after_g: avail.current_qty_g,
      ref_no: "HLD-SIM-001",
      actor: "Dr. Anita Rao (Inspector)",
      row_hash: "ee9911ab3024..."
    });

    alert(`Simulated Quality Hold: Batch ${avail.batch_no} quarantined and locked at trigger level.`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 p-6 space-y-6 h-full overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Developer & Demo Controls</span>
            <h3 className="text-base font-bold text-white">Scenario Injection Drawer</h3>
          </div>
          <button onClick={() => setDemoDrawerOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Inject real-time operational events to demonstrate how the UI reacts live across all screens without reloading.
        </p>

        <div className="space-y-3">
          <button
            onClick={simulateReceipt}
            className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition text-xs"
          >
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <Box className="w-4 h-4" />
              <span>Simulate Inward Consignment (Receipt)</span>
            </div>
            <p className="text-[11px] text-slate-400">Registers new grain batch and generates putaway task.</p>
          </button>

          <button
            onClick={simulateDispatch}
            className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition text-xs"
          >
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Truck className="w-4 h-4" />
              <span>Simulate FIFO Dispatch</span>
            </div>
            <p className="text-[11px] text-slate-400">Allocates 1,000 kg from oldest batch and creates pick line.</p>
          </button>

          <button
            onClick={simulateQualityHold}
            className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition text-xs"
          >
            <div className="flex items-center gap-2 font-bold text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Place Batch on Quality Hold</span>
            </div>
            <p className="text-[11px] text-slate-400">Locks batch immediately and turns bin red on heatmap.</p>
          </button>

          <button
            onClick={toggleOffline}
            className={`w-full p-3 rounded-xl border text-left space-y-1 transition text-xs ${
              isOffline ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              <WifiOff className="w-4 h-4" />
              <span>Toggle Offline Queue Mode: {isOffline ? 'OFFLINE' : 'ONLINE'}</span>
            </div>
            <p className="text-[11px] text-slate-400">Simulates godown internet drop and queues dispatches.</p>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          Tip: You can press <strong>⌘K</strong> at any time to open the global command palette.
        </div>
      </div>
    </div>
  );
};

