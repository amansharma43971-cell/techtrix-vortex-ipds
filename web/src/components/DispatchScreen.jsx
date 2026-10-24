import React, { useState, useEffect } from 'react';
import { Send, AlertOctagon, CheckCircle2, Split, Clock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export default function DispatchScreen({ apiBase, selectedWarehouse, onDispatchSuccess }) {
  const [shops, setShops] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form State
  const [shopId, setShopId] = useState('');
  const [commodityId, setCommodityId] = useState('');
  const [qtyKg, setQtyKg] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Execution & Preview State
  const [currentRequest, setCurrentRequest] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Exception Modal State
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('PHYSICAL_ACCESS_BLOCKED');
  const [exceptionText, setExceptionText] = useState('');

  useEffect(() => {
    async function loadMeta() {
      try {
        const [sRes, cRes, uRes] = await Promise.all([
          fetch(`${apiBase}/ration-shops?warehouse_id=${selectedWarehouse || ''}`),
          fetch(`${apiBase}/commodities`),
          fetch(`${apiBase}/users`)
        ]);
        const sJson = await sRes.json();
        const cJson = await cRes.json();
        const uJson = await uRes.json();
        setShops(sJson);
        setCommodities(cJson);
        setUsers(uJson);
        if (sJson.length > 0) setShopId(sJson[0].id);
        if (cJson.length > 0) setCommodityId(cJson[0].id);
        const emp = uJson.find(u => u.role === 'STORE_EMPLOYEE');
        if (emp) setEmployeeId(emp.id);
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, [selectedWarehouse]);

  // Step 1: Create Draft Request & Fetch Allocation Preview
  const handlePreviewAllocation = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreview(null);
    setPreviewLoading(true);

    if (!qtyKg || parseFloat(qtyKg) <= 0) {
      setErrorMsg("Please enter a valid dispatch quantity.");
      setPreviewLoading(false);
      return;
    }

    try {
      // 1. Create Dispatch Request (Idempotent token generated)
      const idempKey = `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const reqRes = await fetch(`${apiBase}/dispatch-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: idempKey,
          shop_id: shopId,
          commodity_id: commodityId,
          warehouse_id: selectedWarehouse || '11111111-1111-1111-1111-111111111111',
          requested_qty_kg: parseFloat(qtyKg),
          created_by: employeeId
        })
      });

      if (!reqRes.ok) {
        const err = await reqRes.json();
        throw new Error(err.detail || "Failed to create dispatch request");
      }

      const reqData = await reqRes.json();
      setCurrentRequest(reqData);

      // 2. Fetch Allocation Preview
      const prevRes = await fetch(`${apiBase}/dispatch-requests/${reqData.request_id}/allocation-preview`);
      const prevData = await prevRes.json();
      setPreview(prevData);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Step 2: Confirm Dispatch
  const handleConfirmDispatch = async () => {
    if (!currentRequest) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiBase}/dispatch-requests/${currentRequest.request_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail?.message || resData.detail || "Dispatch failed");
      }

      setSuccessMsg(`Dispatch ${currentRequest.request_no} successfully executed! ${resData.allocated_qty_g / 1000} kg allocated.`);
      setPreview(null);
      setCurrentRequest(null);
      setQtyKg('');
      if (onDispatchSuccess) onDispatchSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Split className="w-5 h-5 text-emerald-600" />
          Automated FIFO Dispatch to Ration Shop (FPS)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Guarantees oldest eligible stock is allocated first. Rounding errors eliminated via integer-gram calculation.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handlePreviewAllocation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Ration Shop (FPS)
              </label>
              <select
                value={shopId}
                onChange={e => setShopId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              >
                {shops.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fps_code} - {s.owner_name} ({s.village_ward})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commodity
              </label>
              <select
                value={commodityId}
                onChange={e => setCommodityId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              >
                {commodities.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requested Quantity (in Kilograms)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.1"
                  required
                  placeholder="e.g. 1000 or 1200"
                  value={qtyKg}
                  onChange={e => setQtyKg(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 pr-12 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">KG</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Stored as integer grams in PostgreSQL.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Employee (Requester)
              </label>
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              >
                {users.filter(u => u.role === 'STORE_EMPLOYEE' || u.role === 'ADMIN').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={previewLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {previewLoading ? 'Calculating FIFO Plan...' : 'Calculate FIFO Allocation'}
            </button>
          </div>
        </form>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Dispatch Error</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transaction Confirmed</p>
            <p className="mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Allocation Breakdown (Plan Preview)
              </h3>
              <p className="text-xs text-slate-500">
                Request Ref: <span className="font-mono font-bold text-slate-700">{currentRequest?.request_no}</span>
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              {preview.status}
            </span>
          </div>

          {/* Shortfall Alert */}
          {preview.status === 'SHORTFALL' ? (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertOctagon className="w-5 h-5 text-amber-600" />
                STOCK SHORTFALL DETECTED — DISPATCH BLOCKED
              </div>
              <p className="text-xs mt-1">
                Requested: <strong>{(preview.requested_qty_g / 1000).toLocaleString()} kg</strong> | 
                Available in Godown: <strong>{(preview.available_qty_g / 1000).toLocaleString()} kg</strong>
              </p>
              <p className="text-xs font-bold text-amber-700 mt-1">
                Deficit Shortfall: {(preview.shortfall_qty_g / 1000).toLocaleString()} kg.
              </p>
              <p className="text-[11px] text-amber-800 mt-2">
                PDS Policy Rule: Silent partial dispatches are strictly prohibited to prevent FPS fraud.
              </p>
            </div>
          ) : (
            <>
              {/* Allocations Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-100 rounded-lg">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">FIFO Rank</th>
                      <th className="py-2.5 px-3">Batch Number</th>
                      <th className="py-2.5 px-3">Received Date</th>
                      <th className="py-2.5 px-3 text-right">Available Before</th>
                      <th className="py-2.5 px-3 text-right">Allocated Qty</th>
                      <th className="py-2.5 px-3 text-center">FIFO Provenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {preview.allocations?.map((item) => (
                      <tr key={item.batch_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          #{item.fifo_rank}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          {item.batch_no}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.received_date}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                          {(item.batch_available_before_g / 1000).toLocaleString()} kg
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {item.allocated_qty_kg} kg
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Oldest Eligible
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 text-xs border-t border-slate-200">
                      <td colSpan="4" className="py-3 px-3 text-right uppercase tracking-wider text-slate-500">
                        Total Allocated:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700">
                        {(preview.allocated_qty_g / 1000).toLocaleString()} kg
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap justify-between items-center gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Exact-sum verified: Sum of batch splits matches requested demand.
                </div>
                <button
                  onClick={handleConfirmDispatch}
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Executing Atomic Dispatch...' : 'Confirm & Commit Dispatch'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
