import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, CheckCircle2, AlertOctagon, GitCommit, FileText, Package, ArrowDown, RefreshCw } from 'lucide-react';

export default function AuditScreen({ apiBase }) {
  const [requestNo, setRequestNo] = useState('DSP-DEMO-2026-001');
  const [traceData, setTraceData] = useState(null);
  const [discrepancyData, setDiscrepancyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Quick dispatch suggestions
  const [recentDispatches, setRecentDispatches] = useState([]);
  const [transitLosses, setTransitLosses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedRecallBatch, setSelectedRecallBatch] = useState('');
  const [recallResult, setRecallResult] = useState(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [dRes, discRes, tlRes, bRes] = await Promise.all([
          fetch(`${apiBase}/dispatch-requests`),
          fetch(`${apiBase}/audit/discrepancies`),
          fetch(`${apiBase}/reconciliation/transit-loss`).catch(() => ({ json: () => [] })),
          fetch(`${apiBase}/batches`).catch(() => ({ json: () => [] }))
        ]);
        const dJson = await dRes.json();
        const discJson = await discRes.json();
        const tlJson = await tlRes.json().catch(() => []);
        const bJson = await bRes.json().catch(() => []);
        setRecentDispatches(dJson.slice(0, 5));
        setDiscrepancyData(discJson);
        setTransitLosses(Array.isArray(tlJson) ? tlJson : []);
        setBatches(Array.isArray(bJson) ? bJson : []);
        if (Array.isArray(bJson) && bJson.length > 0) {
          setSelectedRecallBatch(bJson[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();
  }, []);

  const handleTriggerRecall = async () => {
    if (!selectedRecallBatch) return;
    try {
      const res = await fetch(`${apiBase}/recalls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedRecallBatch,
          reason: 'Severe contamination or adulteration reported. Downstream recall initiated.',
          officer_id: 'u0000003-0000-0000-0000-000000000003'
        })
      });
      const data = await res.json();
      setRecallResult(data);
    } catch (err) {
      alert("Recall failed: " + err.message);
    }
  };

  const handleSearchTrace = async (queryNo) => {
    const searchTarget = queryNo || requestNo;
    if (!searchTarget) return;

    setLoading(true);
    setErrorMsg(null);
    setTraceData(null);

    try {
      const res = await fetch(`${apiBase}/audit/trace/${encodeURIComponent(searchTarget.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Dispatch trace record not found");
      setTraceData(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunVerification = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`${apiBase}/audit/discrepancies`);
      const data = await res.json();
      setDiscrepancyData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Forensic Audit, Cryptographic Ledger & Traceability
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end provenance: Goods Receipt → Batch → Allocation → Immutable Stock Ledger Movement
          </p>
        </div>
        <button
          onClick={handleRunVerification}
          disabled={verifying}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
          {verifying ? 'Verifying Hashes...' : 'Run Cryptographic Ledger Verification'}
        </button>
      </div>

      {/* Discrepancy & Cryptographic Verification Health Banner */}
      {discrepancyData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Zero-Discrepancy Ledger Invariant</p>
              <h4 className="text-sm font-bold text-slate-800">
                {discrepancyData.balance_mismatch_count === 0 
                  ? "Zero Discrepancies (100% Invariant Compliant)" 
                  : `${discrepancyData.balance_mismatch_count} Mismatches Found`}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                v_balance_mismatch verified: batches.current_qty_g = SUM(qty_delta_g)
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">SHA-256 Ledger Chain Status</p>
              <h4 className="text-sm font-bold text-slate-800">
                {discrepancyData.ledger_cryptographic_verification?.is_valid ? "Cryptographically Valid (0 Tampering)" : "Tamper Alert"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {discrepancyData.ledger_cryptographic_verification?.total_verified} movements verified via verify_ledger_chain()
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Dispatch Box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="block text-xs font-semibold text-slate-700">
          Search Dispatch Record by Number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="e.g. DSP-2026-0001 or DSP-DEMO-2026-001"
              value={requestNo}
              onChange={e => setRequestNo(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => handleSearchTrace()}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
          >
            {loading ? 'Searching...' : 'Search Trace'}
          </button>
        </div>

        {recentDispatches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400">Recent dispatches:</span>
            {recentDispatches.map(d => (
              <button
                key={d.id}
                onClick={() => {
                  setRequestNo(d.request_no);
                  handleSearchTrace(d.request_no);
                }}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition"
              >
                {d.request_no}
              </button>
            ))}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Trace Visual Tree */}
      {traceData && (
        <div className="space-y-6">
          {/* Dispatch Summary Header */}
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md space-y-3">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                  Dispatch Provenance Chain
                </span>
                <h3 className="text-xl font-mono font-bold">
                  {traceData.dispatch_request?.request_no}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                {traceData.dispatch_request?.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Commodity</span>
                <span className="font-semibold">{traceData.commodity?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Dispatched</span>
                <span className="font-mono font-bold text-emerald-400">
                  {traceData.dispatch_request?.requested_qty_kg} kg
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Source Godown</span>
                <span className="font-semibold">{traceData.godown?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ration Shop (FPS)</span>
                <span className="font-semibold">{traceData.ration_shop?.fps_code} ({traceData.ration_shop?.owner_name})</span>
              </div>
            </div>
          </div>

          {/* Allocation Chain Hops */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Allocated Batch Provenance ({traceData.traceable_allocations?.length || 0} batches)
            </h4>

            {traceData.traceable_allocations?.map((alloc, idx) => (
              <div 
                key={alloc.batch?.batch_id || idx}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
              >
                {/* Hop Header */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      #{alloc.fifo_rank}
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-800">
                      {alloc.batch?.batch_no}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Allocated: {alloc.allocated_qty_kg} kg
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Received: {alloc.batch?.received_date}
                  </span>
                </div>

                {/* 3 Step Visual Flow */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Inward Receipt */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      1. Inward Consignment
                    </div>
                    <p className="pt-1">Receipt No: <strong className="font-mono">{alloc.goods_receipt?.receipt_no}</strong></p>
                    <p>Origin: {alloc.goods_receipt?.supplier_source}</p>
                    <p>Vehicle: <span className="font-mono">{alloc.goods_receipt?.vehicle_no}</span></p>
                    <p>Challan Ref: <span className="font-mono">{alloc.goods_receipt?.document_ref}</span></p>
                  </div>

                  {/* 2. Batch Provenance */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      2. Batch Lifecycle
                    </div>
                    <p className="pt-1">Initial Received: <strong>{alloc.batch?.initial_received_qty_kg} kg</strong></p>
                    <p>Remaining Balance: <strong>{alloc.batch?.current_balance_kg} kg</strong></p>
                    <p>Expiry Date: {alloc.batch?.expiry_date || 'N/A'}</p>
                    <p>Status: <span className="font-semibold text-emerald-700">{alloc.batch?.status}</span></p>
                  </div>

                  {/* 3. Cryptographic Ledger Proof */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <GitCommit className="w-3.5 h-3.5 text-purple-600" />
                      3. Cryptographic Movement
                    </div>
                    <p className="pt-1">Movement ID: <strong className="font-mono">{alloc.ledger_movement?.movement_id}</strong></p>
                    <p>Delta: <strong className="font-mono text-red-600">{alloc.ledger_movement?.qty_delta_g / 1000} kg</strong></p>
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 block">SHA-256 Row Hash:</span>
                      <span className="font-mono text-[9px] text-slate-600 break-all bg-white p-1 rounded border border-slate-200 block">
                        {alloc.ledger_movement?.row_hash || 'Verified in Genesis'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transit Loss Reconciliation Section */}
      {transitLosses.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Transit Loss & Physical Delivery Reconciliation
          </h3>
          <p className="text-xs text-slate-500">
            Compares godown dispatch weight against ration shop received weight with statutory moisture/shrinkage tolerances.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-100 rounded-lg">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Dispatch No</th>
                  <th className="py-2.5 px-3">FPS Code</th>
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3 text-right">Dispatched</th>
                  <th className="py-2.5 px-3 text-right">Received</th>
                  <th className="py-2.5 px-3 text-right">Transit Loss</th>
                  <th className="py-2.5 px-3 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transitLosses.map((tl, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{tl.request_no}</td>
                    <td className="py-2.5 px-3">{tl.fps_code} ({tl.shop_name})</td>
                    <td className="py-2.5 px-3">{tl.commodity_name}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{tl.dispatched_kg} kg</td>
                    <td className="py-2.5 px-3 text-right font-mono">{tl.received_kg} kg</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">{tl.transit_loss_kg} kg ({tl.loss_pct}%)</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tl.audit_flag === 'WITHIN_NORMAL_TOLERANCE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tl.audit_flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emergency Batch Recall & Downstream Trace Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 text-red-700">
          <AlertOctagon className="w-4 h-4 text-red-600" />
          Emergency Quality Recall & Downstream Forward Trace
        </h3>
        <p className="text-xs text-slate-500">
          Quarantine any suspect batch at the database level and immediately generate a forward distribution trace identifying all affected ration shops.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={selectedRecallBatch}
            onChange={e => setSelectedRecallBatch(e.target.value)}
            className="border border-slate-300 rounded-lg p-2 text-xs font-mono bg-slate-50"
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batch_no} ({b.commodity_name}) - {(b.current_qty_kg || b.current_qty_g / 1000 || 0).toLocaleString()} kg remaining
              </option>
            ))}
          </select>
          <button
            onClick={handleTriggerRecall}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow"
          >
            Initiate Emergency Recall
          </button>
        </div>

        {recallResult && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-2 mt-3 text-xs">
            <div className="font-bold text-red-900">
              Recall Notice: {recallResult.message}
            </div>
            <p className="text-red-700 font-mono text-[11px]">
              Recall Ref: {recallResult.recall_ref} | Remaining Godown Balance Locked: {recallResult.quarantined_qty_kg} kg
            </p>
            {recallResult.affected_shops && recallResult.affected_shops.length > 0 && (
              <div className="pt-2">
                <span className="font-bold text-red-900 block mb-1">Affected Downstream Ration Shops:</span>
                <ul className="list-disc pl-5 space-y-1 text-red-800 font-mono text-[11px]">
                  {recallResult.affected_shops.map((s, idx) => (
                    <li key={idx}>
                      {s.shop_fps_code} ({s.shop_name}, {s.district}): {s.allocated_qty_kg} kg via Dispatch {s.dispatch_no}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
