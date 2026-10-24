import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Package, Clock, Warehouse, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Dashboard({ apiBase, selectedWarehouse, onSelectWarehouse, onOpenHoldModal }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ kpis: {}, age_buckets: [] });
  const [batches, setBatches] = useState([]);
  const [expiryRisks, setExpiryRisks] = useState([]);
  const [filterCommodity, setFilterCommodity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const whParam = selectedWarehouse ? `?warehouse_id=${selectedWarehouse}` : '';
      const [dashRes, batchRes, expRes] = await Promise.all([
        fetch(`${apiBase}/dashboard/ageing${whParam}`),
        fetch(`${apiBase}/batches${whParam}`),
        fetch(`${apiBase}/dashboard/expiry-risk${whParam}`).catch(() => ({ json: () => [] }))
      ]);
      const dashJson = await dashRes.json();
      const batchJson = await batchRes.json();
      const expJson = await expRes.json().catch(() => []);
      setData(dashJson);
      setBatches(batchJson);
      setExpiryRisks(Array.isArray(expJson) ? expJson : []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouse]);

  const filteredBatches = batches.filter(b => {
    if (filterCommodity && b.commodity_id !== filterCommodity) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-600" />
            Godown Inventory & Ageing Control
          </h2>
          <p className="text-xs text-slate-500">Live FIFO ledger balances tracked in integer grams</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Available Stock</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {data.kpis?.total_stock_kg ? `${(data.kpis.total_stock_kg / 1000).toFixed(2)} MT` : '0 MT'}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {data.kpis?.total_stock_kg?.toLocaleString()} kg
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Batches</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {data.kpis?.total_active_batches || 0}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Tracked in FIFO stack</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quality Held Stock</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">
              {data.kpis?.held_batches || 0} Batches
            </h3>
            <p className="text-xs text-red-500 font-medium mt-0.5">Hard locked from dispatch</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Near Expiry Risk</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {data.kpis?.near_expiry_batches || 0} Batches
            </h3>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Expiring ≤ 15 days</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Predictive Expiry Risk Banner */}
      {expiryRisks.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>PREDICTIVE EXPIRY ADVISORY: {expiryRisks.length} batch(es) nearing expiration threshold</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {expiryRisks.map(r => (
              <span key={r.batch_id} className="bg-white border border-amber-300 px-2.5 py-1 rounded text-[11px] font-mono text-amber-900">
                <strong>{r.batch_no}</strong> ({r.commodity_name}): {(r.current_qty_g / 1000).toLocaleString()} kg | Expires: {r.expiry_date} ({r.urgency_level})
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-700">Recommendation: Prioritize lifting under FEFO policy to prevent deterioration.</p>
        </div>
      )}

      {/* Ageing Buckets Visualizer */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Grain Ageing Buckets (Oldest Stock Priority)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(data.age_buckets || []).map((bucket) => {
            const isOldest = bucket.age_bucket === '90+ Days';
            return (
              <div 
                key={bucket.age_bucket} 
                className={`p-3.5 rounded-lg border ${isOldest ? 'bg-orange-50/50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-semibold ${isOldest ? 'text-orange-800' : 'text-slate-600'}`}>
                    {bucket.age_bucket}
                  </span>
                  <span className="text-slate-500">{bucket.batch_count} batches</span>
                </div>
                <div className="mt-2 text-lg font-bold text-slate-800">
                  {bucket.total_qty_kg?.toLocaleString()} kg
                </div>
                {isOldest && (
                  <p className="text-[11px] text-orange-700 font-medium mt-1">
                    Priority for next dispatch (Oldest eligible)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800">Batch Inventory Ledger ({filteredBatches.length})</h3>
          <div className="flex gap-2 text-xs">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="QUALITY_HOLD">QUALITY HOLD</option>
              <option value="EXHAUSTED">EXHAUSTED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Godown</th>
                <th className="py-3 px-4">Received Date (Age)</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBatches.map((batch) => {
                const isHeld = batch.status === 'QUALITY_HOLD';
                const isExpired = batch.status === 'EXPIRED';
                const isNearExp = batch.expiry_urgency === 'CRITICAL_NEAR_EXPIRY';

                return (
                  <tr key={batch.id} className={`hover:bg-slate-50/80 transition ${isHeld ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {batch.batch_no}
                    </td>
                    <td className="py-3 px-4">{batch.commodity_name}</td>
                    <td className="py-3 px-4 text-slate-500">{batch.warehouse_name}</td>
                    <td className="py-3 px-4">
                      <div>{batch.received_date}</div>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        batch.age_days > 90 ? 'bg-orange-100 text-orange-800' :
                        batch.age_days > 60 ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {batch.age_days} days old ({batch.age_bucket})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{batch.expiry_date || 'N/A'}</div>
                      {isNearExp && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Expires in ≤15 days
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {batch.current_qty_kg?.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isHeld ? 'bg-red-100 text-red-800 border border-red-200' :
                        isExpired ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        batch.status === 'EXHAUSTED' ? 'bg-slate-100 text-slate-500' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {batch.status === 'AVAILABLE' && (
                        <button
                          onClick={() => onOpenHoldModal(batch)}
                          className="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                        >
                          Quarantine
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
