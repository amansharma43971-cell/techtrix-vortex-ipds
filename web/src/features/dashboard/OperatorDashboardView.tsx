import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PackagePlus, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Truck, 
  Navigation, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  Building2,
  FileCheck2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatBags, formatMT } from '../../lib/formatters';

export const OperatorDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    batches, 
    allocationRequests, 
    dispatches, 
    setActiveRoute 
  } = useStore();

  const userWarehouseId = currentUser?.warehouseId || 'GDN-NGP-01';

  // Filter persisted records to operator's assigned warehouse
  const depotBatches = batches.filter(b => !userWarehouseId || b.warehouse === 'Central Godown' || (b.binCode && b.binCode.startsWith('BAY')));
  const depotAllocations = allocationRequests;
  const depotDispatches = dispatches;

  // 1. Stock Received Today
  const todayStr = '2025-10-24';
  const receivedTodayBags = depotBatches
    .filter(b => b.arrivalDate === todayStr || b.arrivalDate === '24-10-2025' || b.id === 'B008')
    .reduce((sum, b) => sum + (b.totalQuantity || b.availableQuantity), 0);

  // 2. Batches Awaiting Inspection
  const awaitingInspectionBatches = depotBatches.filter(
    b => b.qualityStatus === 'Quarantine' || b.qualityStatus === 'Pending' || b.qualityStatus === 'Under Inspection'
  );
  const awaitingInspectionBags = awaitingInspectionBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

  // 3. Eligible Stock Available for Allocation
  const eligibleBatches = depotBatches.filter(b => b.qualityStatus === 'Eligible' && b.availableQuantity > 0);
  const eligibleBags = eligibleBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

  // 4. Allocation Requests Pending
  const pendingRequests = depotAllocations.filter(r => r.status === 'Created' || r.status === 'Pending' || r.status === 'Partially Allocated');

  // 5. Ready-to-Dispatch Orders
  const readyDispatches = depotDispatches.filter(d => d.status === 'Ready to Dispatch' || d.status === 'Verified');

  // 6. Out-for-Delivery Orders
  const inTransitDispatches = depotDispatches.filter(d => d.status === 'In Transit');

  // 7. Delivery Exceptions Requiring Action
  const exceptionDispatches = depotDispatches.filter(d => d.status === 'Delivery Exception' || (d.events && d.events.some(e => e.eventType === 'EXCEPTION')));

  const displayName = currentUser?.fullName || 'Ramesh Patil';
  const userInitials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12">
      {/* Operator Welcome & Depot Identification Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome, {displayName.split(' ')[0]}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-blue-50 text-[#0B4DA8] border-blue-300 shrink-0">
                🚚 Warehouse Operator
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-[#0B4DA8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                {currentUser?.warehouseId || 'GDN-NGP-01'}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700">
                {currentUser?.warehouseName || 'Central Food Godown, Nagpur (Surajpur Depot)'}
              </span>
              <span>•</span>
              <span className="text-slate-500">Shift: Day Regular</span>
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => navigate('/stock-allocation')}
            className="px-3.5 py-2 bg-[#0B4DA8] hover:bg-[#093d85] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>1. Inward Stock</span>
          </button>

          <button
            onClick={() => navigate('/fifo')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. FIFO Allocation</span>
          </button>

          <button
            onClick={() => navigate('/dispatch')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>3. Dispatch Gate</span>
          </button>

          <button
            onClick={() => navigate('/out-delivery')}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>4. Delivery</span>
          </button>
        </div>
      </div>
      </div>

      {/* 4 Task-Focused Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Stock Received */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all card-elevated">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Stock Received</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PackagePlus className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatBags(receivedTodayBags)}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>{formatMT(receivedTodayBags)} Total Gate Inward</span>
              <span className="text-emerald-700 font-bold">Today</span>
            </div>
          </div>
          <button onClick={() => navigate('/stock-allocation')} className="text-xs text-[#0B4DA8] hover:underline font-semibold flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 cursor-pointer">
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Available for Allocation */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all card-elevated">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Available for Allocation</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {formatBags(eligibleBags)}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>{formatMT(eligibleBags)} Sound Stock</span>
              <span className="text-emerald-700 font-bold">FIFO Sound</span>
            </div>
          </div>
          <button onClick={() => navigate('/fifo')} className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 cursor-pointer">
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Ready to Dispatch */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all card-elevated">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Ready to Dispatch</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-700 font-mono">
              {readyDispatches.length} <span className="text-xs text-slate-500 font-normal">Vehicles</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Staged at Bay</span>
              <span className="text-indigo-700 font-bold">Gate Ready</span>
            </div>
          </div>
          <button onClick={() => navigate('/dispatch')} className="text-xs text-indigo-700 hover:underline font-semibold flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 cursor-pointer">
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: Pending Delivery Actions */}
        <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all card-elevated">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Pending Delivery Actions</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-sky-700 font-mono">
              {inTransitDispatches.length} <span className="text-xs text-slate-500 font-normal">Vehicles</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>En Route to FPS / Depots</span>
              <span className="text-sky-700 font-bold">POD Required</span>
            </div>
          </div>
          <button onClick={() => navigate('/out-delivery')} className="text-xs text-sky-700 hover:underline font-semibold flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 cursor-pointer">
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Operator Quick Action Ribbon */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily Operations Workflow</span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Guided Steps</span>
          </div>
          <span className="text-xs text-slate-500">Click any action to begin</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/stock-allocation')}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-300 transition-all text-left flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B4DA8] group-hover:scale-110 transition-transform flex items-center justify-center shrink-0">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#0B4DA8]">1. Receive Stock</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Inward arrival &amp; gate weighment</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/fifo')}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all text-left flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">2. FIFO Allocation</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Auto-pick oldest sound batches</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dispatch')}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all text-left flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 group-hover:scale-110 transition-transform flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">3. Prepare Dispatch</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Bay loading &amp; gate pass release</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/out-delivery')}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-300 transition-all text-left flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 group-hover:scale-110 transition-transform flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700">4. Confirm Delivery</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Record digital POD &amp; recipient sign</p>
            </div>
          </button>
        </div>
      </div>

      {/* Operational Task Management Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Outbound Deliveries & Loading Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0B4DA8]" />
                  <span>Dispatch &amp; Delivery Pipeline</span>
                </h3>
                <p className="text-xs text-slate-500">Active consignments from {currentUser?.warehouseName || 'Nagpur Godown'}</p>
              </div>
              <button
                onClick={() => navigate('/dispatch')}
                className="text-xs font-semibold text-[#0B4DA8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Dispatch Manager</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
              {dispatches.map((d) => (
                <div key={d.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0B4DA8]">{d.id}</span>
                      <span className="font-semibold text-slate-800">{d.destination}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === 'Delivered' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : (d.status === 'In Transit' ? 'bg-sky-100 text-sky-800' : 'bg-indigo-100 text-indigo-800')
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Vehicle: <strong>{d.vehicleNo || 'UP-16-AX-4411'}</strong> · Driver: {d.driverName || 'Mohd. Salim'} · Bags: <strong>{d.quantityBags}</strong> ({d.commodity})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {d.status === 'In Transit' && (
                      <button
                        onClick={() => navigate('/dispatch')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Record POD Delivery
                      </button>
                    )}
                    {d.status === 'Ready to Dispatch' && (
                      <button
                        onClick={() => navigate('/dispatch')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Gate Pass &amp; Release
                      </button>
                    )}
                    {d.status === 'Delivered' && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>POD Acknowledged</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Intake Consignments Table */}
          <div className="p-5 rounded-2xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-emerald-600" />
                  <span>Recent Intake Batches &amp; Sound Storage</span>
                </h3>
                <p className="text-xs text-slate-500">Batches stored in Godown Bins</p>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-[#0B4DA8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Godown Inventory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Batch ID</th>
                    <th className="p-3">Commodity</th>
                    <th className="p-3">Arrival Date</th>
                    <th className="p-3">Available Bags</th>
                    <th className="p-3">Bin Code</th>
                    <th className="p-3">Assay Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depotBatches.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-[#0B4DA8]">{b.id}</td>
                      <td className="p-3 font-medium text-slate-900">{b.commodity}</td>
                      <td className="p-3 font-mono text-slate-600">{b.arrivalDate}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{formatBags(b.availableQuantity)}</td>
                      <td className="p-3 font-mono text-slate-700">{b.binCode || 'BAY-A-01'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.qualityStatus === 'Eligible' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : (b.qualityStatus === 'Quarantine' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                        }`}>
                          {b.qualityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Operator Daily Checklist & Action Quicklinks */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#0B4DA8]" />
              <span>Shift Operations Checklist</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-[#0B4DA8]" />
                <div>
                  <strong className="block text-slate-800">Physical Stock Count</strong>
                  <span className="text-slate-500 text-[11px]">Reconcile Bay A &amp; Bay B bag tallies</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-[#0B4DA8]" />
                <div>
                  <strong className="block text-slate-800">Assay Sample Handover</strong>
                  <span className="text-slate-500 text-[11px]">Batch B006 sample delivered to Lab Assayer</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-[#0B4DA8]" />
                <div>
                  <strong className="block text-slate-800">Lorry Weighbridge Slip</strong>
                  <span className="text-slate-500 text-[11px]">Upload gross weighment slip for D0058</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-[#0B4DA8]" />
                <div>
                  <strong className="block text-slate-800">Fumigation Maintenance</strong>
                  <span className="text-slate-500 text-[11px]">Check prophylactic chemical spray in Bay C</span>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Links for Warehouse Admin */}
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Operator Quick Reference
            </h4>
            <ul className="text-xs space-y-2 text-blue-800 font-medium">
              <li className="flex items-center gap-2">
                <span>• Strict FIFO priority mandatory for all food grain dispatches.</span>
              </li>
              <li className="flex items-center gap-2">
                <span>• No uninspected or on-hold stock may be released under any circumstance.</span>
              </li>
              <li className="flex items-center gap-2">
                <span>• Overrides require authorized Manager/Supervisor digital approval.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboardView;

