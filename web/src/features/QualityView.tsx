import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, FileText, CheckCircle, 
  Send, Users, Phone, ArrowRight, Ban, Radio, RefreshCw, X
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { MOCK_BATCHES, MOCK_RATION_SHOPS, Batch } from '../mocks/mockData';
import { StatusPill } from '../components/ui/StatusPill';
import { QuantityText } from '../components/ui/QuantityText';
import { BatchChip } from '../components/ui/BatchChip';
import { formatDate } from '../lib/formatters';

interface QualityInspection {
  id: string;
  batch_no: string;
  moisture_pct: number;
  foreign_matter_pct: number;
  weevil_count: number;
  test_cert_no: string;
  status: 'PASSED' | 'FAILED' | 'CONDITIONAL';
  inspected_by: string;
  inspected_at: string;
}

export const QualityView: React.FC = () => {
  const { activeRole, addLedgerMovement, addApprovalRequest } = useUIStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'INSPECTIONS' | 'HOLDS' | 'RECALL_WIZARD'>('INSPECTIONS');

  // Inspections mock list
  const [inspections, setInspections] = useState<QualityInspection[]>([
    {
      id: "qc-01",
      batch_no: "BATCH-WHT-2026-001",
      moisture_pct: 11.2,
      foreign_matter_pct: 0.4,
      weevil_count: 0,
      test_cert_no: "NABL-LAB-2026-9912",
      status: "PASSED",
      inspected_by: "Dr. Anita Rao",
      inspected_at: "2026-10-22T10:30:00Z"
    },
    {
      id: "qc-02",
      batch_no: "BATCH-WHT-2026-005-HOLD",
      moisture_pct: 14.8,
      foreign_matter_pct: 1.8,
      weevil_count: 6,
      test_cert_no: "NABL-LAB-2026-9844",
      status: "FAILED",
      inspected_by: "Dr. Anita Rao",
      inspected_at: "2026-10-23T09:15:00Z"
    }
  ]);

  // Hold dialog state
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdBatchId, setHoldBatchId] = useState(MOCK_BATCHES[0].id);
  const [holdReason, setHoldReason] = useState('MOISTURE_EXCEEDED');
  const [holdQtyKg, setHoldQtyKg] = useState<number>(500);

  // Recall wizard state
  const [recallBatchId, setRecallBatchId] = useState(MOCK_BATCHES[4].id); // default to the hold batch
  const [isRecallBroadcasted, setIsRecallBroadcasted] = useState(false);

  // Handle Place Hold
  const handlePlaceHold = (e: React.FormEvent) => {
    e.preventDefault();
    const batch = MOCK_BATCHES.find(b => b.id === holdBatchId);
    if (!batch) return;

    addLedgerMovement({
      movement_id: Math.floor(8000 + Math.random() * 2000),
      created_at: new Date().toISOString(),
      movement_type: 'HOLD',
      batch_no: batch.batch_no,
      bin_code: 'QUAR-01',
      qty_delta_g: -(holdQtyKg * 1000),
      balance_after_g: Math.max(0, batch.current_qty_g - holdQtyKg * 1000),
      ref_no: `HLD-2026-${Math.floor(100 + Math.random() * 900)}`,
      actor: `${activeRole} (Quality Officer)`,
      row_hash: `0x${Math.random().toString(16).substring(2, 10)}`
    });

    alert(`Quality Hold placed on ${batch.batch_no} for ${holdQtyKg} kg. Moved to Quarantine zone.`);
    setShowHoldModal(false);
  };

  // Affected shops for recall simulation
  const affectedShops = [
    { ...MOCK_RATION_SHOPS[0], bags: 20, dispatchDate: "2026-10-21", contact: "+91 98220 11223" },
    { ...MOCK_RATION_SHOPS[2], bags: 40, dispatchDate: "2026-10-22", contact: "+91 98220 44556" },
  ];

  return (
    <div data-page="quality" className="space-y-6">
      {/* Header and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.quality')} & Recall Quarantine
            </h1>
            <p className="text-xs text-muted-foreground">
              FCI Standards Verification, 2-Man Hold/Release, and Emergency Shop-Level Recall Trace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('INSPECTIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'INSPECTIONS' ? 'bg-brand text-white shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            QC Inspections Log
          </button>
          <button
            onClick={() => setActiveTab('HOLDS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'HOLDS' ? 'bg-brand text-white shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Quarantine Holds & Releases
          </button>
          <button
            onClick={() => setActiveTab('RECALL_WIZARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'RECALL_WIZARD' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Emergency Recall Wizard
          </button>
        </div>
      </div>

      {/* TAB 1: INSPECTIONS */}
      {activeTab === 'INSPECTIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Recent Laboratory Assay Results</span>
            <button
              onClick={() => alert('New inspection dialog...')}
              className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand/90"
            >
              + Record Lab Inspection
            </button>
          </div>

          <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-4">Inspection ID</th>
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-4 text-center">Moisture (%)</th>
                  <th className="py-2.5 px-4 text-center">Foreign Matter (%)</th>
                  <th className="py-2.5 px-4 text-center">Weevils (count/kg)</th>
                  <th className="py-2.5 px-4">NABL Certificate</th>
                  <th className="py-2.5 px-4 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {inspections.map(insp => (
                  <tr key={insp.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{insp.id}</td>
                    <td className="py-3 px-4">
                      <BatchChip batchNo={insp.batch_no} />
                    </td>
                    <td className={`py-3 px-4 text-center font-mono font-bold ${insp.moisture_pct > 12 ? 'text-red-500' : 'text-foreground'}`}>
                      {insp.moisture_pct}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-foreground">
                      {insp.foreign_matter_pct}%
                    </td>
                    <td className={`py-3 px-4 text-center font-mono font-bold ${insp.weevil_count > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {insp.weevil_count}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {insp.test_cert_no}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        insp.status === 'PASSED' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUARANTINE HOLDS */}
      {activeTab === 'HOLDS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Active Quality Holds (Maker-Checker 2-Man Release Guard)</span>
            <button
              onClick={() => setShowHoldModal(true)}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
            >
              + Place New Quality Hold
            </button>
          </div>

          <div className="rounded-xl bg-surface border border-border p-5 space-y-4">
            <div className="flex items-start justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-red-700 dark:text-red-400">
                    BATCH-WHT-2026-005-HOLD · 1,500 kg Quarantined
                  </h3>
                  <p className="text-xs text-red-600/90 dark:text-red-300 mt-0.5">
                    Reason: High grain moisture (14.8%) detected on inward intake. Moved to Barricaded Quarantine Zone (QUAR-01).
                  </p>
                  <div className="text-[11px] text-muted-foreground mt-2 font-mono">
                    Placed by Dr. Anita Rao (QC Officer) on 2026-10-23
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  addApprovalRequest({
                    id: `appr-rel-${Date.now()}`,
                    request_type: 'HOLD_RELEASE',
                    reference_no: `REL-2026-042`,
                    title: `Release Request for Quarantined Batch BATCH-WHT-2026-005-HOLD`,
                    requested_by_id: 'u-qc',
                    requested_by_name: 'Dr. Anita Rao',
                    details: 'Aeration and drying cycle completed. Moisture down to 11.2%. Requesting supervisor dual-approval.',
                    reason_code: 'LAB_TEST_PASS',
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                    sla_due_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString()
                  });
                  alert('Release request submitted to Approvals Inbox. Dual sign-off required.');
                }}
                className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90"
              >
                Request Release (Maker)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY RECALL WIZARD */}
      {activeTab === 'RECALL_WIZARD' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 space-y-1">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Emergency Contamination Recall & Shop Broadcast
            </h2>
            <p className="text-xs text-red-600/90 dark:text-red-300">
              Trace down-stream ration shops that received stock from this batch and trigger an automated SMS/IVR freeze alert.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-5 rounded-xl bg-surface border border-border space-y-4">
              <h3 className="text-xs font-bold text-foreground">Select Flagged Batch for Recall</h3>
              <div>
                <select
                  value={recallBatchId}
                  onChange={(e) => setRecallBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-border bg-background text-foreground"
                >
                  {MOCK_BATCHES.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_no} (In Godown: {(b.current_qty_g / 1000).toLocaleString('en-IN')} kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-2">
                <div className="text-muted-foreground">Action Summary:</div>
                <ul className="list-disc pl-4 space-y-1 text-foreground/90">
                  <li>Lock remaining in-godown stock into <strong>QUARANTINE</strong> zone</li>
                  <li>Disable batch from all automated dispatch algorithms</li>
                  <li>Notify all affected Fair Price Shops via emergency SMS API</li>
                </ul>
              </div>

              <button
                onClick={() => setIsRecallBroadcasted(true)}
                disabled={isRecallBroadcasted}
                className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                {isRecallBroadcasted ? 'Recall Broadcast Emitted' : 'Broadcast Recall & Lock Remaining Stock'}
              </button>
            </div>

            {/* Downstream Shop Impact Table */}
            <div className="lg:col-span-7 rounded-xl bg-surface border border-border overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Affected Downstream Fair Price Shops ({affectedShops.length})
                </span>
                <span className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold">
                  Total Dispatched: 60 bags (3,000 kg)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/10">
                      <th className="py-2.5 px-3">FPS Code</th>
                      <th className="py-2.5 px-3">Owner / Village</th>
                      <th className="py-2.5 px-3 text-right">Bags Sent</th>
                      <th className="py-2.5 px-3">Dispatch Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {affectedShops.map(shop => (
                      <tr key={shop.id} className="hover:bg-muted/30">
                        <td className="py-3 px-3 font-mono font-bold text-foreground">{shop.fps_code}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground">{shop.owner_name}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {shop.contact}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                          {shop.bags} bags
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {shop.dispatchDate}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isRecallBroadcasted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                              STOP_DISP_SENT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              PENDING_ALERT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLACE HOLD MODAL */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Place Quality Hold
              </span>
              <button onClick={() => setShowHoldModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceHold} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Batch</label>
                <select
                  value={holdBatchId}
                  onChange={(e) => setHoldBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded border border-border bg-background text-foreground"
                >
                  {MOCK_BATCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.batch_no} ({b.bin_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Hold Quantity (kg)</label>
                <input
                  type="number"
                  value={holdQtyKg}
                  onChange={(e) => setHoldQtyKg(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded border border-border bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Reason Code</label>
                <select
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-border bg-background text-foreground"
                >
                  <option value="MOISTURE_EXCEEDED">Moisture &gt; 12% (Risk of Fungus)</option>
                  <option value="WEEVIL_INFESTATION">Live Insect / Weevil count high</option>
                  <option value="SPILLAGE_DIRT">Physical spillage / Foreign matter</option>
                  <option value="STATUTORY_HOLD">State Quality Auditor Order</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowHoldModal(false)}
                  className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-xs"
                >
                  Confirm Quarantine Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

