import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, AlertOctagon, PackagePlus } from 'lucide-react';

export default function ReceiptScreen({ apiBase, selectedWarehouse, onReceiptSuccess }) {
  const [commodities, setCommodities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Form State
  const [commodityId, setCommodityId] = useState('');
  const [supplierSource, setSupplierSource] = useState('FCI Base Depot Nagpur');
  const [vehicleNo, setVehicleNo] = useState('MH-31-AP-9900');
  const [docRef, setDocRef] = useState('DC/FCI/2026/1042');
  const [qtyKg, setQtyKg] = useState('5000');
  const [expiryDays, setExpiryDays] = useState('365');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, uRes] = await Promise.all([
          fetch(`${apiBase}/commodities`),
          fetch(`${apiBase}/users`)
        ]);
        const cJson = await cRes.json();
        const uJson = await uRes.json();
        setCommodities(cJson);
        setUsers(uJson);
        if (cJson.length > 0) setCommodityId(cJson[0].id);
        const emp = uJson.find(u => u.role === 'STORE_EMPLOYEE');
        if (emp) setEmployeeId(emp.id);
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMeta();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessData(null);

    try {
      const today = new Date();
      const expDate = new Date();
      expDate.setDate(today.getDate() + parseInt(expiryDays));

      const res = await fetch(`${apiBase}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: selectedWarehouse || '11111111-1111-1111-1111-111111111111',
          commodity_id: commodityId,
          supplier_source: supplierSource,
          vehicle_no: vehicleNo,
          document_ref: docRef,
          received_qty_kg: parseFloat(qtyKg),
          received_date: today.toISOString().split('T')[0],
          expiry_date: expDate.toISOString().split('T')[0],
          received_by: employeeId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to record consignment");
      }

      setSuccessData(data);
      if (onReceiptSuccess) onReceiptSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-600" />
          Inward Consignment & Batch Registration
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Record arrival of grain consignments from FCI base depots, state logistics, or millers.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commodity Type
              </label>
              <select
                value={commodityId}
                onChange={e => setCommodityId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {commodities.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consignment Quantity (in Kilograms)
              </label>
              <input
                type="number"
                step="0.001"
                min="1"
                required
                value={qtyKg}
                onChange={e => setQtyKg(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier / Origin Depot
              </label>
              <input
                type="text"
                required
                value={supplierSource}
                onChange={e => setSupplierSource(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                required
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Challan / DC Ref
              </label>
              <input
                type="text"
                required
                value={docRef}
                onChange={e => setDocRef(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shelf Life (Days)
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receiving Store Officer
              </label>
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              {loading ? 'Creating Batch & Ledger Entry...' : 'Record Goods Receipt'}
            </button>
          </div>
        </form>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successData && (
        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Consignment Successfully Accepted & Initialized in Ledger
          </div>
          <p>
            Receipt Number: <span className="font-mono font-bold">{successData.receipt_no}</span>
          </p>
          <p>
            Generated Batch ID: <span className="font-mono font-bold">{successData.batch_no}</span>
          </p>
          <p>
            Quantity Accepted: <strong>{successData.received_qty_kg} kg ({successData.received_qty_g?.toLocaleString()} grams)</strong>
          </p>
          <p className="text-[11px] text-emerald-700 font-medium">
            PostgreSQL trigger automatically appended RECEIPT movement to ledger and initialized batch balance.
          </p>
        </div>
      )}
    </div>
  );
}
