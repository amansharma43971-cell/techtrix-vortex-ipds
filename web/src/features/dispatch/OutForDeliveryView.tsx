import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DispatchRecord } from '../../data/types';
import { useNavigate } from 'react-router-dom';

export const OutForDeliveryView: React.FC = () => {
  const { dispatches, recordTransitUpdate, recordDeliveryConfirmation, setToast } = useStore();
  const navigate = useNavigate();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Checkpoint Modal
  const [checkpointDispatchId, setCheckpointDispatchId] = useState<string | null>(null);
  const [checkpointLocation, setCheckpointLocation] = useState('Kalindi Kunj Toll Plaza KM-28');
  const [checkpointNotes, setCheckpointNotes] = useState('Truck proceeding smoothly under seal. ETA 40 minutes.');

  // Delivery Confirm Modal
  const [podDispatchId, setPodDispatchId] = useState<string | null>(null);
  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [bagCondition, setBagCondition] = useState('Sound Condition');
  const [receiverName, setReceiverName] = useState('');
  const [podRef, setPodRef] = useState('');
  const [podNotes, setPodNotes] = useState('All bags unloaded and physically counted in sound condition.');

  const activeConsignments = dispatches.filter(
    (d) => d.status === 'In Transit' || d.status === 'Dispatched'
  );
  const totalBagsInTransit = activeConsignments.reduce(
    (sum, d) => sum + (d.actualDispatchedBags || d.quantityBags),
    0
  );
  const deliveredConsignments = dispatches.filter(
    (d) => d.status === 'Delivered' || d.status === 'Delivery Exception'
  );

  const filteredList = activeConsignments.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      !q ||
      d.id.toLowerCase().includes(q) ||
      (d.vehicleNo && d.vehicleNo.toLowerCase().includes(q)) ||
      (d.driverName && d.driverName.toLowerCase().includes(q)) ||
      (d.destination && d.destination.toLowerCase().includes(q)) ||
      (d.gatePassNo && d.gatePassNo.toLowerCase().includes(q));

    const matchesComm = commodityFilter === 'ALL' || d.commodity === commodityFilter;
    const matchesStage = stageFilter === 'ALL' || d.status === stageFilter;

    return matchesQ && matchesComm && matchesStage;
  });

  const openCheckpointModal = (d: DispatchRecord) => {
    setCheckpointDispatchId(d.id);
    setCheckpointLocation('Kalindi Kunj Toll Plaza KM-28');
    setCheckpointNotes('Truck proceeding smoothly under seal. ETA 40 minutes.');
  };

  const handleCheckpointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointDispatchId) return;
    recordTransitUpdate(checkpointDispatchId, `${checkpointLocation}. ${checkpointNotes}`);
    setToast({
      id: `toast-${Date.now()}`,
      type: 'success',
      message: `Transit checkpoint logged for ${checkpointDispatchId}`
    });
    setCheckpointDispatchId(null);
  };

  const openPodModal = (d: DispatchRecord) => {
    const actual = d.actualDispatchedBags || d.quantityBags;
    setPodDispatchId(d.id);
    setReceivedQty(actual);
    setBagCondition('Sound Condition');
    setReceiverName(d.destinationContact ? d.destinationContact.split('(')[0].trim() : 'Fair Price Shop Officer');
    setPodRef(`POD-${d.id}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPodNotes('All bags unloaded and physically counted in sound condition.');
  };

  const handlePodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podDispatchId) return;
    const res = recordDeliveryConfirmation(podDispatchId, receivedQty, receiverName, podRef, podNotes);
    setToast({
      id: `toast-${Date.now()}`,
      type: res.isException ? 'error' : 'success',
      message: res.isException
        ? `Consignment ${podDispatchId} recorded with Delivery Exception (Shortage reported)`
        : `Consignment ${podDispatchId} successfully confirmed delivered!`
    });
    setPodDispatchId(null);
  };

  const selectedPodDispatch = dispatches.find((d) => d.id === podDispatchId);
  const selectedCheckpointDispatch = dispatches.find((d) => d.id === checkpointDispatchId);

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto animate-in fade-in duration-150 pb-12">
      {/* 5-Step Process Journey Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D6FE8] animate-pulse" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              iPDS End-to-End Commodity Lifecycle Flow
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Active Stage: <strong>Stage 5 — Out for Delivery &amp; Fair Price Shop POD</strong>
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
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border bg-emerald-100 text-emerald-900 border-emerald-200 animate-pulse">Live</span>
            </div>
            <div className="font-bold text-[12px] text-[#0B4DA8]">5. Out for Delivery &amp; POD</div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Active Fleet Tracking</div>
          </button>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Out for Delivery &amp; Live Transit Fleet</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-600 animate-ping" />
              {activeConsignments.length} Active Vehicles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time fleet monitoring, GPS waypoint logs, driver communications, and Fair Price Shop (FPS) digital Proof of Delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/dispatch')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            View Staging Clearance
          </button>
          <button
            onClick={() => navigate('/delivery-history')}
            className="px-4 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Delivery History Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Fleet</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {activeConsignments.length} <span className="text-xs font-semibold text-slate-500">Trucks</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">En route to authorized Fair Price Shops</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grain in Transit</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalBagsInTransit} <span className="text-xs font-semibold text-slate-500">Bags ({(totalBagsInTransit * 0.5).toFixed(1)} Qtl)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Under electronic tamper-evident seal</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Time Transit Rate</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            100% <span className="text-xs font-semibold text-emerald-600">On-Time SLA</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Avg 2.4 hrs from godown gate release</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fulfilled Deliveries</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {deliveredConsignments.length} <span className="text-xs font-semibold text-slate-500">Completed</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Verified with biometric POD acknowledgment</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by vehicle, driver, FPS, or dispatch ID..."
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
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Active Stages</option>
            <option value="In Transit">In Transit</option>
            <option value="Dispatched">Dispatched / En Route</option>
          </select>
        </div>
      </div>

      {/* Active Trucks Grid */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Vehicles Currently in Transit</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All outward commodity dispatches have arrived and recorded Proof of Delivery (POD), or are awaiting gate pass release in staging.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => navigate('/dispatch')}
              className="px-4 py-2 rounded-xl bg-[#0B4DA8] text-white text-xs font-bold hover:bg-[#0A2F6B]"
            >
              Go to Staging Area
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredList.map((d) => {
            const actualBags = d.actualDispatchedBags || d.quantityBags;
            const isInTransit = d.status === 'In Transit';

            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-4"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#0B4DA8]">{d.id}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {d.gatePassNo || 'Gate Pass Issued'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Dispatched: <strong className="text-slate-700">{d.dispatchDate} {d.dispatchTime}</strong>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      isInTransit
                        ? 'bg-cyan-50 text-cyan-800 border border-cyan-300'
                        : 'bg-blue-50 text-blue-800 border border-blue-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isInTransit ? 'bg-cyan-500 animate-pulse' : 'bg-blue-500'
                      }`}
                    />
                    {d.status}
                  </span>
                </div>

                {/* Info Blocks */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Commodity &amp; Volume</span>
                    <div className="font-bold text-slate-900 mt-0.5 text-sm flex items-center gap-1.5">
                      <span>{d.commodity}</span>
                      <span className="text-xs text-blue-900 font-mono">({actualBags} Bags)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{(actualBags * 0.5).toFixed(1)} Quintals</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Vehicle &amp; Carrier</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5 text-sm truncate" title={d.vehicleNo}>
                      {d.vehicleNo}
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">{d.transporterName || 'State Civil Supplies'}</span>
                  </div>
                </div>

                {/* Destination */}
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">Destination Fair Price Shop (FPS)</span>
                    <span className="text-[10px] text-slate-500 font-medium">ETA: ~45 mins</span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate">
                    {d.destination}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-between">
                    <span>Recipient: <strong>{d.destinationContact || 'FPS Authorized Dealer'}</strong></span>
                  </div>
                </div>

                {/* Driver */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0B4DA8] text-white flex items-center justify-center font-bold text-xs">
                      {(d.driverName || 'D')[0]}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block leading-tight">{d.driverName || 'Driver Assigned'}</span>
                      <span className="text-[10px] font-mono text-slate-500">{d.driverPhone || '+91 98112 34567'}</span>
                    </div>
                  </div>

                  <a
                    href={`tel:${d.driverPhone || '+919811234567'}`}
                    className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>Call Driver</span>
                  </a>
                </div>

                {/* 4-Stage Stepper */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                    <span className="text-[#0B4DA8] font-bold">1. Staged &amp; Weighed (✓)</span>
                    <span className="text-[#0B4DA8] font-bold">2. Gate Pass (✓)</span>
                    <span className={isInTransit ? 'text-cyan-700 font-bold animate-pulse' : 'text-[#0B4DA8] font-bold'}>3. Highway Transit (⚡)</span>
                    <span className="text-slate-400">4. POD Receipt</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#0B4DA8] w-1/4" />
                    <div className="h-full bg-[#0B4DA8] w-1/4" />
                    <div className={`h-full ${isInTransit ? 'bg-cyan-500' : 'bg-[#0B4DA8]'} w-1/4`} />
                    <div className="h-full bg-slate-200 w-1/4" />
                  </div>
                </div>

                {/* Latest Event */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Latest Waypoint Log</span>
                  <p className="text-slate-700 font-medium">
                    {d.events && d.events.length > 0
                      ? d.events[d.events.length - 1].description
                      : 'Vehicle departed central godown gate under electronic seal.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openCheckpointModal(d)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Update Checkpoint</span>
                  </button>

                  <button
                    onClick={() => openPodModal(d)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Record POD Delivery</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transit Checkpoint Modal */}
      {checkpointDispatchId && selectedCheckpointDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Record Transit Checkpoint</h3>
              <button onClick={() => setCheckpointDispatchId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCheckpointSubmit}>
              <div className="p-5 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Dispatch ID:</span> <strong className="font-mono">{selectedCheckpointDispatch.id}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Vehicle:</span> <strong className="font-mono">{selectedCheckpointDispatch.vehicleNo}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Destination:</span> <strong className="truncate max-w-[200px]">{selectedCheckpointDispatch.destination}</strong></div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Waypoint / Checkpoint Location *</label>
                  <input
                    type="text"
                    required
                    value={checkpointLocation}
                    onChange={(e) => setCheckpointLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status Notes / ETA</label>
                  <textarea
                    rows={2}
                    value={checkpointNotes}
                    onChange={(e) => setCheckpointNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 resize-none"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckpointDispatchId(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Waypoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POD Modal */}
      {podDispatchId && selectedPodDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Fair Price Shop Delivery Confirmation (POD)</h3>
              <button onClick={() => setPodDispatchId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handlePodSubmit}>
              <div className="p-5 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Dispatch ID:</span> <strong className="font-mono">{selectedPodDispatch.id}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Vehicle:</span> <strong className="font-mono">{selectedPodDispatch.vehicleNo}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Destination:</span> <strong className="truncate max-w-[220px]">{selectedPodDispatch.destination}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Dispatched Quantity:</span> <strong className="font-mono text-blue-900">{selectedPodDispatch.actualDispatchedBags || selectedPodDispatch.quantityBags} Bags</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Received Quantity (Bags) *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bag Condition</label>
                    <select
                      value={bagCondition}
                      onChange={(e) => setBagCondition(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-medium"
                    >
                      <option value="Sound Condition">Sound Condition (100% Intact)</option>
                      <option value="Minor Sack Tearing">Minor Sack Tearing</option>
                      <option value="Rain / Tarpaulin Leak">Rain / Moisture Leak</option>
                      <option value="Spillage Reported">Spillage Reported</option>
                    </select>
                  </div>
                </div>

                {receivedQty < (selectedPodDispatch.actualDispatchedBags || selectedPodDispatch.quantityBags) && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    ⚠️ Shortage: {(selectedPodDispatch.actualDispatchedBags || selectedPodDispatch.quantityBags) - receivedQty} Bags missing/damaged! Status will be marked as "Delivery Exception".
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Receiving Officer / FPS Dealer Name *</label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Proof of Delivery Ref Number</label>
                  <input
                    type="text"
                    value={podRef}
                    onChange={(e) => setPodRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Remarks &amp; Receiving Notes</label>
                  <textarea
                    rows={2}
                    value={podNotes}
                    onChange={(e) => setPodNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 resize-none"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPodDispatchId(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirm Delivery Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutForDeliveryView;

