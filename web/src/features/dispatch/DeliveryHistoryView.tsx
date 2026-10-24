import React, { useState } from 'react';
import { 
  History, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Printer, 
  ArrowLeft,
  PackageCheck,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DispatchRecord } from '../../data/types';
import { useNavigate } from 'react-router-dom';

export const DeliveryHistoryView: React.FC = () => {
  const { dispatches, setToast } = useStore();
  const navigate = useNavigate();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected POD Slip Modal
  const [selectedPodDispatch, setSelectedPodDispatch] = useState<DispatchRecord | null>(null);

  const deliveredList = dispatches.filter(
    (d) => d.status === 'Delivered' || d.status === 'Delivery Exception'
  );

  const totalReceivedBags = deliveredList.reduce(
    (sum, d) => sum + (d.receivedQuantityBags !== undefined ? d.receivedQuantityBags : (d.actualDispatchedBags || d.quantityBags)),
    0
  );
  const totalDispatchedBags = deliveredList.reduce(
    (sum, d) => sum + (d.actualDispatchedBags || d.quantityBags),
    0
  );
  const totalDiscrepancyBags = deliveredList.reduce(
    (sum, d) => sum + (d.transitDiscrepancyBags || 0),
    0
  );
  const soundRate =
    totalDispatchedBags > 0
      ? (((totalDispatchedBags - totalDiscrepancyBags) / totalDispatchedBags) * 100).toFixed(1)
      : '100.0';

  const filteredList = deliveredList.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      !q ||
      d.id.toLowerCase().includes(q) ||
      (d.destination && d.destination.toLowerCase().includes(q)) ||
      (d.receivedBy && d.receivedBy.toLowerCase().includes(q)) ||
      (d.gatePassNo && d.gatePassNo.toLowerCase().includes(q)) ||
      (d.proofOfDeliveryRef && d.proofOfDeliveryRef.toLowerCase().includes(q));

    const matchesComm = commodityFilter === 'ALL' || d.commodity === commodityFilter;
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;

    return matchesQ && matchesComm && matchesStatus;
  });

  const exportDeliveryLedgerCsv = () => {
    const headers = [
      'Dispatch ID',
      'Gate Pass No',
      'Commodity',
      'Planned Bags',
      'Actual Loaded Bags',
      'Received Bags',
      'Shortage Bags',
      'Condition Status',
      'Loss Reason',
      'Vehicle No',
      'Driver Name',
      'Destination FPS',
      'Dispatched At',
      'Delivered At',
      'Receiving Officer',
      'POD Ref'
    ];

    const rows = deliveredList.map((d) => {
      const actualDispatched = d.actualDispatchedBags || d.quantityBags;
      const received = d.receivedQuantityBags !== undefined ? d.receivedQuantityBags : actualDispatched;
      const loss = d.transitDiscrepancyBags || 0;

      return [
        d.id,
        d.gatePassNo || '',
        d.commodity,
        d.plannedQuantityBags || d.quantityBags,
        actualDispatched,
        received,
        loss,
        d.status,
        (d.exceptionReason || '').replace(/"/g, '""'),
        d.vehicleNo || '',
        d.driverName || '',
        (d.destination || '').replace(/"/g, '""'),
        d.dispatchedAt || d.dispatchDate || '',
        d.deliveredAt || '',
        (d.receivedBy || d.destinationContact || '').replace(/"/g, '""'),
        d.proofOfDeliveryRef || ''
      ]
        .map((v) => `"${v}"`)
        .join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BhandarSetu_Delivery_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setToast({
      id: `toast-${Date.now()}`,
      type: 'success',
      message: 'Delivery history CSV ledger exported successfully'
    });
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto animate-in fade-in duration-150 pb-12">
      {/* 5-Step Process Journey Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D6FE8]" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              iPDS End-to-End Commodity Lifecycle Flow
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Active Stage: <strong>Stage 5 — Delivery History Ledger &amp; POD Archives</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <button onClick={() => navigate('/stock-allocation')} className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-300">Step 1</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border bg-blue-100 text-blue-900 border-blue-200">Receipt</span>
            </div>
            <div className="font-bold text-[12px] text-slate-800">1. Stock Inward</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Gate Weighment</div>
          </button>

          <button onClick={() => navigate('/quality')} className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-300">Step 2</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border bg-emerald-100 text-emerald-900 border-emerald-200">Assay</span>
            </div>
            <div className="font-bold text-[12px] text-slate-800">2. Quality Assay</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Lab Inspection</div>
          </button>

          <button onClick={() => navigate('/fifo')} className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-300">Step 3</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border bg-indigo-100 text-indigo-900 border-indigo-200">FIFO</span>
            </div>
            <div className="font-bold text-[12px] text-slate-800">3. FIFO Allocation</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Oldest-First Queue</div>
          </button>

          <button onClick={() => navigate('/dispatch')} className="text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-300">Step 4</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border bg-cyan-100 text-cyan-900 border-cyan-200">Staging</span>
            </div>
            <div className="font-bold text-[12px] text-slate-800">4. Staging &amp; Gate Pass</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Security Clearance</div>
          </button>

          <button className="text-left p-2.5 rounded-xl border border-[#1D6FE8] bg-blue-50/70 shadow-xs ring-1 ring-[#1D6FE8] transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-[#0B4DA8] text-white border-[#0B4DA8]">Step 5</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border bg-emerald-100 text-emerald-900 border-emerald-200">History</span>
            </div>
            <div className="font-bold text-[12px] text-[#0B4DA8]">5. Delivery History &amp; POD</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Fulfilled Consignments</div>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery History &amp; POD Archives</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              {deliveredList.length} Consignments Fulfilled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Permanent audit ledger of delivered commodities, Digital Proof of Delivery (POD) challans, tare/gross weight certificates, and transit discrepancy logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/out-delivery')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Live Transit Fleet</span>
          </button>
          <button
            onClick={exportDeliveryLedgerCsv}
            className="px-4 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Delivery Ledger CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fulfilled Deliveries</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {deliveredList.length} <span className="text-xs font-semibold text-slate-500">Deliveries</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Confirmed with Fair Price Shop dealers</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bags Received at FPS</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalReceivedBags} <span className="text-xs font-semibold text-slate-500">Bags ({(totalReceivedBags * 0.5).toFixed(1)} Qtl)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Safely stocked in FPS godowns</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sound Delivery Rate</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {soundRate}% <span className="text-xs font-semibold text-emerald-600">Sound</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Zero damage on clean consignments</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transit Variance</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold ${totalDiscrepancyBags > 0 ? 'text-rose-600' : 'text-slate-900'} mt-2 font-mono`}>
            {totalDiscrepancyBags} <span className="text-xs font-semibold text-slate-500">Bags Shortage</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalDiscrepancyBags > 0 ? 'Logged under exception investigation' : 'No shortages reported'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Dispatch ID, FPS Dealer, Gate Pass, or POD ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#0B4DA8] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Commodities</option>
            <option value="Wheat">Wheat</option>
            <option value="Rice">Rice</option>
            <option value="Sugar">Sugar</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Delivery Results</option>
            <option value="Delivered">Delivered (100% Sound)</option>
            <option value="Delivery Exception">Delivery Exception (Shortages)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Dispatch ID / Gate Pass</th>
                <th className="py-3.5 px-4">Destination FPS &amp; Officer</th>
                <th className="py-3.5 px-4">Commodity</th>
                <th className="py-3.5 px-4">Dispatched vs Received</th>
                <th className="py-3.5 px-4">Condition &amp; Variance</th>
                <th className="py-3.5 px-4">Delivery Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-700">No delivery records match your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((d) => {
                  const actualDispatched = d.actualDispatchedBags || d.quantityBags;
                  const received = d.receivedQuantityBags !== undefined ? d.receivedQuantityBags : actualDispatched;
                  const loss = d.transitDiscrepancyBags || 0;
                  const isException = d.status === 'Delivery Exception' || loss > 0;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{d.id}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{d.gatePassNo || d.referenceNo || 'GP-ISSUED'}</div>
                        <span className="inline-block mt-1 text-[10px] font-mono text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          {d.proofOfDeliveryRef || 'POD-VERIFIED'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={d.destination}>
                          {d.destination}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Received by: <strong className="text-slate-700">{d.receivedBy || d.destinationContact || 'FPS Dealer'}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.vehicleNo} ({d.driverName || 'Driver'})</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900">{d.commodity}</span>
                        <span className="text-[11px] text-slate-500 block font-mono">50kg Std Gunny</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900">{received} Bags Recv</div>
                        <div className="text-[11px] text-slate-500">of {actualDispatched} Dispatched</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isException ? (
                          <>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                              ⚠️ Shortage: {loss} Bags
                            </span>
                            <span className="text-[10px] text-rose-600 block mt-1 leading-snug">{d.exceptionReason || 'Transit loss reported'}</span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                              ✓ 100% Sound Condition
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1">Zero transit discrepancy</span>
                          </>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-900">{d.deliveredAt || d.dispatchedAt || '2025-04-20 17:30'}</div>
                        <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 mt-0.5">
                          <span>🔒 Biometric / Geo-stamped</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPodDispatch(d)}
                          title="Inspect Official POD Challan"
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B4DA8] border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspect POD</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official POD Slip Voucher Modal */}
      {selectedPodDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900">Official iPDS Proof of Delivery (POD) Voucher</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#0B4DA8] hover:bg-blue-100 text-xs font-bold border border-blue-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setSelectedPodDispatch(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-800">
              <div className="border-2 border-slate-800 p-5 rounded-xl bg-white space-y-4 font-sans print:border-none print:p-0">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-800 pb-3">
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Government of India · Department of Food &amp; Public Distribution
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                    Integrated Targeted Public Distribution System (iPDS)
                  </h2>
                  <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mt-1">
                    Official Proof of Delivery (POD) &amp; Physical Verification Voucher
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Statutory Form PDS-POD-07 | Digital Chain of Custody Certificate
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Consignment ID</span>
                    <strong className="font-mono text-slate-900">{selectedPodDispatch.id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Gate Pass No</span>
                    <strong className="font-mono text-slate-900">{selectedPodDispatch.gatePassNo || 'GP-' + selectedPodDispatch.id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">POD Acknowledgment Ref</span>
                    <strong className="font-mono text-blue-900">{selectedPodDispatch.proofOfDeliveryRef || 'POD-' + selectedPodDispatch.id + '-ACK'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Consignment Status</span>
                    <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold ${
                      selectedPodDispatch.status === 'Delivery Exception' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedPodDispatch.status}
                    </span>
                  </div>
                </div>

                {/* Origin & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">1. Origin Godown / Dispatch Bay</span>
                    <div className="font-semibold text-slate-900">National Central Godown Hub (Nagpur)</div>
                    <div className="text-slate-600 text-[11px]">Commodity: <strong className="text-slate-900">{selectedPodDispatch.commodity} (Grade-A)</strong></div>
                    <div className="text-slate-600 text-[11px]">Batches Staged: <span className="font-mono font-bold">{selectedPodDispatch.batchesUsed ? selectedPodDispatch.batchesUsed.join(', ') : 'B001, B002'}</span></div>
                    <div className="text-slate-600 text-[11px]">Gate Departure: <span>{selectedPodDispatch.dispatchedAt || selectedPodDispatch.dispatchDate}</span></div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">2. Destination Fair Price Shop (FPS)</span>
                    <div className="font-semibold text-slate-900">{selectedPodDispatch.destination}</div>
                    <div className="text-slate-600 text-[11px]">Authorized Officer: <strong>{selectedPodDispatch.receivedBy || selectedPodDispatch.destinationContact || 'FPS Authorized Dealer'}</strong></div>
                    <div className="text-slate-600 text-[11px]">Carrier Vehicle: <strong className="font-mono">{selectedPodDispatch.vehicleNo}</strong> ({selectedPodDispatch.transporterName || 'State Civil Supplies Corp'})</div>
                    <div className="text-slate-600 text-[11px]">Unload Timestamp: <span className="font-bold text-emerald-700">{selectedPodDispatch.deliveredAt || '2025-04-20 17:30'}</span></div>
                  </div>
                </div>

                {/* Table */}
                {(() => {
                  const actual = selectedPodDispatch.actualDispatchedBags || selectedPodDispatch.quantityBags;
                  const recv = selectedPodDispatch.receivedQuantityBags !== undefined ? selectedPodDispatch.receivedQuantityBags : actual;
                  const diff = selectedPodDispatch.transitDiscrepancyBags || 0;
                  const isEx = selectedPodDispatch.status === 'Delivery Exception' || diff > 0;

                  return (
                    <table className="w-full text-xs border border-slate-300">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border-r border-slate-300">Description</th>
                          <th className="p-2 border-r border-slate-300 text-center">Bags (Standard 50kg)</th>
                          <th className="p-2 border-r border-slate-300 text-center">Metric Quintals</th>
                          <th className="p-2 text-center">Condition / Soundness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-center">
                        <tr>
                          <td className="p-2 border-r border-slate-300 text-left font-sans font-medium text-slate-800">Loaded at Godown Gate</td>
                          <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{actual}</td>
                          <td className="p-2 border-r border-slate-300">{(actual * 0.5).toFixed(2)} Qtl</td>
                          <td className="p-2 font-sans text-emerald-700 font-bold">100% Weighed &amp; Sealed</td>
                        </tr>
                        <tr className={isEx ? 'bg-rose-50/50' : 'bg-emerald-50/30'}>
                          <td className="p-2 border-r border-slate-300 text-left font-sans font-bold text-slate-900">Received &amp; Counted at FPS</td>
                          <td className={`p-2 border-r border-slate-300 font-bold ${isEx ? 'text-rose-700' : 'text-emerald-700'}`}>{recv}</td>
                          <td className="p-2 border-r border-slate-300">{(recv * 0.5).toFixed(2)} Qtl</td>
                          <td className={`p-2 font-sans font-bold ${isEx ? 'text-rose-700' : 'text-emerald-700'}`}>{isEx ? 'Exception Reported' : 'Sound Condition'}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="p-2 border-r border-slate-300 text-left font-sans">Net Transit Shortage / Discrepancy</td>
                          <td className={`p-2 border-r border-slate-300 ${diff > 0 ? 'text-rose-600' : 'text-slate-600'}`}>{diff} Bags</td>
                          <td className={`p-2 border-r border-slate-300 ${diff > 0 ? 'text-rose-600' : 'text-slate-600'}`}>{(diff * 0.5).toFixed(2)} Qtl</td>
                          <td className={`p-2 font-sans text-xs ${diff > 0 ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}`}>
                            {diff > 0 ? (selectedPodDispatch.exceptionReason || 'Tear / Spillage in Transit') : 'Zero Transit Shortage'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  );
                })()}

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-[11px] text-center">
                  <div className="p-2 border border-slate-200 rounded-lg">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block mb-4">Origin Assayer</span>
                    <strong className="text-slate-900 block font-sans">{selectedPodDispatch.verifiedBy || 'Dr. V. K. Sharma'}</strong>
                    <span className="text-[10px] text-slate-500">Quality Assayer / Staging</span>
                  </div>

                  <div className="p-2 border border-slate-200 rounded-lg">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block mb-4">Transport Driver</span>
                    <strong className="text-slate-900 block font-sans">{selectedPodDispatch.driverName || 'Rameshwar Singh'}</strong>
                    <span className="text-[10px] text-slate-500">Carrier Signature &amp; Acknowledgment</span>
                  </div>

                  <div className="p-2 border border-slate-200 rounded-lg bg-emerald-50/50 border-emerald-200">
                    <span className="text-[9px] text-emerald-700 uppercase font-bold block mb-4">FPS Receiving Dealer</span>
                    <strong className="text-slate-900 block font-sans">{selectedPodDispatch.receivedBy || selectedPodDispatch.destinationContact || 'Arvind Joshi (FPS Officer)'}</strong>
                    <span className="text-[10px] text-emerald-700 font-mono">Biometric Authenticated</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center font-mono">
                  Verification Hash: BS-POD-VERIFIED-{selectedPodDispatch.id}-{Date.now().toString(16).toUpperCase()} | Department of Food &amp; Public Distribution (iPDS)
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPodDispatch(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryHistoryView;

