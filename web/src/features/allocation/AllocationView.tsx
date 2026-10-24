import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Boxes, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  MapPin, 
  QrCode, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Check, 
  X, 
  ArrowDownToLine, 
  Sparkles, 
  TrendingUp, 
  Warehouse, 
  FileText, 
  History,
  Info,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Building2,
  FileCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { 
  CommodityType, 
  QualityStatus, 
  BatchItem, 
  BinLocation, 
  ConsignmentItem, 
  StorageLocationAllocation, 
  WarehouseConfig 
} from '../../data/types';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatNumber, calculateAgeDays } from '../../lib/format';
import { DEMO_TODAY } from '../../data/seedData';

// Configured Warehouses
const CONFIGURED_WAREHOUSES: WarehouseConfig[] = [
  {
    id: 'GDN-NGP-01',
    code: 'GDN-NGP-01',
    name: 'Central Food Godown, Nagpur (Surajpur Depot)',
    district: 'Nagpur',
    state: 'Maharashtra',
    capacityMT: 5000,
    compatibleCommodities: ['Wheat', 'Rice'],
    isActive: true,
    zones: [
      { code: 'ZONE-A', name: 'Zone A - Primary Sound Bay', zoneType: 'PICK_FACE', capacityBags: 1200, compatibleCommodity: 'Wheat' },
      { code: 'ZONE-B', name: 'Zone B - High Capacity Bulk Bay', zoneType: 'BULK', capacityBags: 1800, compatibleCommodity: 'Wheat' },
      { code: 'ZONE-C', name: 'Zone C - Rice Storage Enclosure', zoneType: 'PICK_FACE', capacityBags: 1500, compatibleCommodity: 'Rice' }
    ]
  },
  {
    id: 'GDN-PUN-02',
    code: 'GDN-PUN-02',
    name: 'Regional Buffer Godown, Pune Central',
    district: 'Pune',
    state: 'Maharashtra',
    capacityMT: 4500,
    compatibleCommodities: ['Wheat', 'Rice'],
    isActive: true,
    zones: [
      { code: 'ZONE-P1', name: 'Bay 1 - Fast Pick Face', zoneType: 'PICK_FACE', capacityBags: 1000, compatibleCommodity: 'Wheat' },
      { code: 'ZONE-P2', name: 'Bay 2 - Bulk Staging', zoneType: 'BULK', capacityBags: 2000, compatibleCommodity: 'Rice' }
    ]
  },
  {
    id: 'GDN-NOIDA-01',
    code: 'GDN-NOIDA-01',
    name: 'Surajpur Central Depot, Greater Noida',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh',
    capacityMT: 6000,
    compatibleCommodities: ['Wheat', 'Rice', 'Pulses'],
    isActive: true,
    zones: [
      { code: 'ZONE-N1', name: 'Bay N1 - Wheat Reserve', zoneType: 'BULK', capacityBags: 2500, compatibleCommodity: 'Wheat' }
    ]
  }
];

// Physical Godown Bins
const INITIAL_BINS: BinLocation[] = [
  { binCode: 'BAY-A-RACK-01-BIN-01', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-A', rack: '01', bin: '01', maxCapacityBags: 400, currentBags: 250, commodity: 'Wheat', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-A-RACK-01-BIN-02', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-A', rack: '01', bin: '02', maxCapacityBags: 400, currentBags: 100, commodity: 'Wheat', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-A-RACK-02-BIN-01', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-A', rack: '02', bin: '01', maxCapacityBags: 400, currentBags: 0, commodity: 'Wheat', zoneType: 'BULK' },
  { binCode: 'BAY-A-RACK-02-BIN-02', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-A', rack: '02', bin: '02', maxCapacityBags: 500, currentBags: 200, commodity: 'Wheat', zoneType: 'BULK' },
  { binCode: 'BAY-B-RACK-01-BIN-01', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-B', rack: '01', bin: '01', maxCapacityBags: 400, currentBags: 150, commodity: 'Rice', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-B-RACK-01-BIN-02', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-B', rack: '01', bin: '02', maxCapacityBags: 400, currentBags: 0, commodity: 'Rice', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-B-RACK-02-BIN-01', godown: 'Central Food Godown, Nagpur (Surajpur Depot)', section: 'Bay-B', rack: '02', bin: '01', maxCapacityBags: 500, currentBags: 220, commodity: 'Rice', zoneType: 'BULK' },
  { binCode: 'BAY-PUN-01-BIN-01', godown: 'Regional Buffer Godown, Pune Central', section: 'Bay-P1', rack: '01', bin: '01', maxCapacityBags: 500, currentBags: 180, commodity: 'Wheat', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-PUN-01-BIN-02', godown: 'Regional Buffer Godown, Pune Central', section: 'Bay-P1', rack: '01', bin: '02', maxCapacityBags: 500, currentBags: 220, commodity: 'Rice', zoneType: 'BULK' },
];

export const AllocationView: React.FC = () => {
  const { batches, addBatch, user, setSelectedBatch, setToast } = useStore();
  const isManager = !user || user.role === 'MANAGER';

  // Navigation Sub-tab: 'WORKFLOW' | 'CONSIGNMENTS' | 'MANAGE_WAREHOUSES'
  const [activeSubTab, setActiveSubTab] = useState<'WORKFLOW' | 'CONSIGNMENTS' | 'MANAGE_WAREHOUSES'>('WORKFLOW');

  // Multi-step Receiving Workflow State (Steps 1 to 4)
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Consignment Details
  const [consignmentId, setConsignmentId] = useState(`CSG-2025-${Math.floor(1000 + Math.random() * 9000)}`);
  const [supplierName, setSupplierName] = useState('FCI Depot Karnal (Central Pool)');
  const [challanNumber, setChallanNumber] = useState(`CHL-INW-${Math.floor(1000 + Math.random() * 9000)}`);
  const [arrivalDate, setArrivalDate] = useState('2025-10-24');
  const [arrivalTime, setArrivalTime] = useState('10:30');
  const [commodity, setCommodity] = useState<CommodityType>('Wheat');
  const [totalQuantity, setTotalQuantity] = useState<number>(200);
  const [unit, setUnit] = useState('Bags (50kg)');
  const [vehicleNumber, setVehicleNumber] = useState('UP-16-BT-4412');
  const [remarks, setRemarks] = useState('Fresh sound harvest intake, moisture verified at gate.');
  const [documentName, setDocumentName] = useState('Challan_Weight_Slip.pdf');

  // Step 2: Warehouse Selection
  const defaultWh = (!isManager && user?.warehouseId) ? user.warehouseId : 'GDN-NGP-01';
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(defaultWh);

  // Step 3: Batch Creation & Storage Allocation
  const [allocationMode, setAllocationMode] = useState<'MANUAL' | 'AUTO_SLOT'>('MANUAL');
  const [allocations, setAllocations] = useState<StorageLocationAllocation[]>([
    {
      batchId: `B0${Math.floor(11 + Math.random() * 80)}`,
      commodity: 'Wheat',
      quantity: 200,
      warehouseId: defaultWh,
      zoneCode: 'ZONE-A',
      rack: '02',
      binCode: 'BAY-A-RACK-02-BIN-01',
      receiptDate: '2025-10-24',
      qualityStatus: 'Pending Inspection'
    }
  ]);

  // Consignments Ledger List
  const [consignments, setConsignments] = useState<ConsignmentItem[]>([
    {
      consignmentId: 'CSG-2025-001',
      receiptVoucherId: 'RCV-2025-0012',
      supplierName: 'Punjab State Warehousing Corp (Moga)',
      challanNumber: 'CHL-PB-88201',
      arrivalDate: '2025-01-01',
      arrivalTime: '10:30',
      commodity: 'Wheat',
      totalQuantity: 100,
      unit: 'Bags (50kg)',
      vehicleNumber: 'PB-10-AX-8912',
      remarks: 'Gate moisture 10.4%, standard tags verified',
      destinationWarehouseId: 'GDN-NGP-01',
      destinationWarehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      allocationMode: 'MANUAL',
      receivedById: 'u-admin-ngp',
      receivedByName: 'Ramesh Patil',
      receivedAt: '2025-01-01 10:30',
      status: 'STORED_AWAITING_INSPECTION',
      batches: [
        {
          batchId: 'B001',
          commodity: 'Wheat',
          quantity: 100,
          warehouseId: 'GDN-NGP-01',
          zoneCode: 'ZONE-A',
          rack: '01',
          binCode: 'BAY-A-RACK-01-BIN-01',
          receiptDate: '2025-01-01',
          qualityStatus: 'Eligible'
        }
      ]
    },
    {
      consignmentId: 'CSG-2025-008',
      receiptVoucherId: 'RCV-2025-0088',
      supplierName: 'FCI Depot Karnal (Central Pool)',
      challanNumber: 'CHL-INW-008',
      arrivalDate: '2025-10-24',
      arrivalTime: '08:00',
      commodity: 'Wheat',
      totalQuantity: 200,
      unit: 'Bags (50kg)',
      vehicleNumber: 'UP-16-BT-4412',
      remarks: 'Fresh harvest arrival - awaiting godown bin assignment',
      destinationWarehouseId: 'GDN-NGP-01',
      destinationWarehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      allocationMode: 'MANUAL',
      receivedById: 'u-manager-01',
      receivedByName: 'Aayush Tripathi',
      receivedAt: '2025-10-24 08:00',
      status: 'STORED_AWAITING_INSPECTION',
      batches: [
        {
          batchId: 'B008',
          commodity: 'Wheat',
          quantity: 200,
          warehouseId: 'GDN-NGP-01',
          zoneCode: 'ZONE-B',
          rack: '02',
          binCode: 'BAY-A-RACK-02-BIN-02',
          receiptDate: '2025-10-24',
          qualityStatus: 'Pending Allocation'
        }
      ]
    }
  ]);

  // Selected Voucher Modal
  const [selectedVoucher, setSelectedVoucher] = useState<ConsignmentItem | null>(null);

  // Search & Filter in Consignments Ledger
  const [csgSearch, setCsgSearch] = useState('');
  const [csgCommodityFilter, setCsgCommodityFilter] = useState('ALL');

  // Warehouses list
  const [warehouses, setWarehouses] = useState<WarehouseConfig[]>(CONFIGURED_WAREHOUSES);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [newWhCode, setNewWhCode] = useState('');
  const [newWhName, setNewWhName] = useState('');
  const [newWhDistrict, setNewWhDistrict] = useState('');
  const [newWhCapacity, setNewWhCapacity] = useState(5000);

  // Target Destination Warehouse Details
  const activeWh = useMemo(() => 
    warehouses.find(w => w.id === selectedWarehouseId) || warehouses[0],
    [warehouses, selectedWarehouseId]
  );

  const activeWhBins = useMemo(() => 
    INITIAL_BINS.filter(b => b.godown.includes(activeWh.district) || b.godown === activeWh.name),
    [activeWh]
  );

  const totalWhCap = activeWhBins.reduce((s, b) => s + b.maxCapacityBags, 0) || 2000;
  const occupiedWhCap = activeWhBins.reduce((s, b) => s + b.currentBags, 0) || 550;
  const availableWhCap = Math.max(0, totalWhCap - occupiedWhCap);

  // Live Balance Meter Calculations
  const totalAllocated = useMemo(() => 
    allocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0),
    [allocations]
  );
  const remainingUnallocated = totalQuantity - totalAllocated;
  const isBalanceBalanced = remainingUnallocated === 0;

  // Add allocation row
  const handleAddAllocationRow = () => {
    const nextIdx = allocations.length + 1;
    const nextId = `B0${Math.floor(10 + Math.random() * 89)}`;
    const availBin = activeWhBins.find(b => b.commodity === commodity && (b.maxCapacityBags - b.currentBags) > 0) || activeWhBins[0];

    setAllocations([
      ...allocations,
      {
        batchId: nextId,
        commodity: commodity,
        quantity: Math.max(0, remainingUnallocated),
        warehouseId: selectedWarehouseId,
        zoneCode: availBin?.section || 'ZONE-A',
        rack: availBin?.rack || '01',
        binCode: availBin?.binCode || 'BAY-A-RACK-02-BIN-01',
        receiptDate: arrivalDate,
        qualityStatus: 'Pending Inspection'
      }
    ]);
  };

  // Remove allocation row
  const handleRemoveAllocationRow = (idx: number) => {
    if (allocations.length === 1) {
      setToast({ message: 'At least one batch allocation row is required', type: 'error' });
      return;
    }
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  // Split batch row
  const handleSplitRow = (idx: number) => {
    const row = allocations[idx];
    const half = Math.floor(row.quantity / 2);
    if (half <= 0) {
      setToast({ message: 'Quantity is too small to split', type: 'error' });
      return;
    }
    const rem = row.quantity - half;

    const newRows = [...allocations];
    newRows[idx] = { ...row, quantity: half };
    newRows.splice(idx + 1, 0, {
      ...row,
      batchId: `${row.batchId}-P2`,
      quantity: rem,
      binCode: activeWhBins.find(b => b.binCode !== row.binCode)?.binCode || row.binCode
    });
    setAllocations(newRows);
    setToast({ message: `Batch ${row.batchId} split into 2 locations`, type: 'info' });
  };

  // Auto-slot recommendation
  const handleRunAutoSlot = () => {
    let unassigned = totalQuantity;
    const newAllocations: StorageLocationAllocation[] = [];

    // Prioritize bins matching commodity with lowest occupancy
    const candidates = [...activeWhBins]
      .filter(b => b.commodity === commodity || !b.commodity)
      .sort((a, b) => (a.maxCapacityBags - a.currentBags) - (b.maxCapacityBags - b.currentBags));

    let batchCount = 1;
    for (const bin of candidates) {
      if (unassigned <= 0) break;
      const space = bin.maxCapacityBags - bin.currentBags;
      if (space <= 0) continue;

      const take = Math.min(unassigned, space);
      newAllocations.push({
        batchId: `B0${Math.floor(10 + Math.random() * 89)}-S${batchCount}`,
        commodity: commodity,
        quantity: take,
        warehouseId: selectedWarehouseId,
        zoneCode: bin.section,
        rack: bin.rack,
        binCode: bin.binCode,
        receiptDate: arrivalDate,
        qualityStatus: 'Pending Inspection'
      });
      unassigned -= take;
      batchCount++;
    }

    if (unassigned > 0) {
      setToast({ message: `Insufficient bin capacity: ${unassigned} bags could not be slotted`, type: 'error' });
      return;
    }

    setAllocations(newAllocations);
    setAllocationMode('AUTO_SLOT');
    setToast({ message: `Intelligent auto-slot allocated ${newAllocations.length} storage bins`, type: 'success' });
  };

  // Submit and Confirm Consignment
  const handleConfirmSubmission = () => {
    if (!isBalanceBalanced) {
      setToast({ message: `Cannot submit: ${Math.abs(remainingUnallocated)} bags ${remainingUnallocated > 0 ? 'unallocated' : 'over-allocated'}`, type: 'error' });
      return;
    }

    // Check duplicate batch IDs
    const bIds = allocations.map(a => a.batchId);
    if (new Set(bIds).size !== bIds.length) {
      setToast({ message: 'Duplicate Batch IDs detected. Each batch must have a unique ID.', type: 'error' });
      return;
    }

    const rcvVoucherId = `RCV-2025-${Math.floor(1000 + Math.random() * 9000)}`;

    const newConsignment: ConsignmentItem = {
      consignmentId,
      receiptVoucherId: rcvVoucherId,
      supplierName,
      challanNumber,
      arrivalDate,
      arrivalTime,
      commodity,
      totalQuantity,
      unit,
      vehicleNumber,
      remarks,
      destinationWarehouseId: activeWh.id,
      destinationWarehouseName: activeWh.name,
      allocationMode,
      receivedById: user?.id || 'u-manager-01',
      receivedByName: user?.fullName || 'Aayush Tripathi',
      receivedAt: `${arrivalDate} ${arrivalTime}`,
      status: 'STAGED_AWAITING_PUTAWAY',
      batches: allocations
    };

    // Add to consignments ledger with STAGED status awaiting physical putaway confirmation
    setConsignments([newConsignment, ...consignments]);

    // Create batches in central store (strictly 'Pending Inspection' for FIFO safety)
    allocations.forEach(alloc => {
      addBatch({
        id: alloc.batchId,
        commodity: alloc.commodity as CommodityType,
        totalQuantity: alloc.quantity,
        availableQuantity: alloc.quantity,
        damagedQuantity: 0,
        arrivalDate: alloc.receiptDate,
        expiryDate: '2026-10-24',
        qualityStatus: 'Pending Inspection', // Strictly pending inspection - NOT automatically FIFO eligible
        supplier: supplierName,
        binCode: alloc.binCode,
        notes: `Intake CSG: ${consignmentId} · Challan: ${challanNumber} · Godown: ${activeWh.code}`
      });
    });

    setToast({ message: `Consignment ${consignmentId} received! Voucher ${rcvVoucherId} generated.`, type: 'success' });
    setSelectedVoucher(newConsignment);
    setWorkflowStep(4);
  };

  // Filtered Consignments
  const filteredConsignments = useMemo(() => {
    return consignments.filter(c => {
      const matchQ = !csgSearch || 
        c.consignmentId.toLowerCase().includes(csgSearch.toLowerCase()) ||
        c.supplierName.toLowerCase().includes(csgSearch.toLowerCase()) ||
        c.challanNumber.toLowerCase().includes(csgSearch.toLowerCase()) ||
        c.vehicleNumber.toLowerCase().includes(csgSearch.toLowerCase());
      const matchComm = csgCommodityFilter === 'ALL' || c.commodity === csgCommodityFilter;
      return matchQ && matchComm;
    });
  }, [consignments, csgSearch, csgCommodityFilter]);

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200">
              PDS Intake &amp; Storage Allocation
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Smart Commodity Logistics</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Warehouse, Batch &amp; Storage Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end multi-step consignment receiving, godown selection, multi-bin slotting, and voucher generation.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveSubTab('WORKFLOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'WORKFLOW' ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Receive Consignment</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CONSIGNMENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CONSIGNMENTS' ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Consignments Ledger ({consignments.length})</span>
          </button>

          {isManager && (
            <button
              onClick={() => setActiveSubTab('MANAGE_WAREHOUSES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'MANAGE_WAREHOUSES' ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Configure Warehouses</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: MULTI-STEP WORKFLOW */}
      {activeSubTab === 'WORKFLOW' && (
        <div className="space-y-6">
          {/* Stepper Header (Steps 1, 2, 3, 4) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: 1, title: 'Consignment Details', desc: 'Supplier, Challan, Arrival' },
              { step: 2, title: 'Warehouse Selection', desc: 'Destination depot & capacity' },
              { step: 3, title: 'Batch & Bin Slotting', desc: 'Multi-batch & bin allocation' },
              { step: 4, title: 'Review & Voucher', desc: 'Electronic inward voucher' },
            ].map(s => {
              const isActive = workflowStep === s.step;
              const isDone = workflowStep > s.step;

              return (
                <div
                  key={s.step}
                  onClick={() => setWorkflowStep(s.step as any)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isActive 
                      ? 'bg-blue-50/70 border-[#0B4DA8] shadow-xs' 
                      : isDone
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive 
                      ? 'bg-[#0B4DA8] text-white' 
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isDone ? '✓' : s.step}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-[#0B4DA8]' : 'text-slate-900'}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STEP 1: CONSIGNMENT DETAILS */}
          {workflowStep === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Step 1: Consignment Details &amp; Carrier Verification</h3>
                <p className="text-xs text-slate-500">Record incoming shipment credentials, dispatch challan, and net arrived quantity.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Consignment ID (System-Generated)</label>
                  <input type="text" value={consignmentId} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-[#0B4DA8]" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supplier / Sourcing Agency *</label>
                  <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Delivery Challan No. *</label>
                  <input type="text" value={challanNumber} onChange={e => setChallanNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Arrival Date *</label>
                  <input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Arrival Time *</label>
                  <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Commodity Type *</label>
                  <select value={commodity} onChange={e => setCommodity(e.target.value as CommodityType)} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white">
                    <option value="Wheat">Wheat</option>
                    <option value="Rice">Rice</option>
                    <option value="Pulses">Pulses</option>
                    <option value="Sugar">Sugar</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Arrived Quantity (Bags) *</label>
                  <input type="number" min={1} value={totalQuantity} onChange={e => setTotalQuantity(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-base" />
                  <span className="text-[10px] text-slate-500 mt-1 block">Net Metric Tonnes: {(totalQuantity * 0.05).toFixed(1)} MT</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Carrier Vehicle Number *</label>
                  <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase font-bold" />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supporting Challan / Weighment Doc</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={documentName} onChange={e => setDocumentName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-700" />
                    <span className="px-2.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold border border-emerald-200 shrink-0">Attached</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">Intake Remarks / Physical Seal Observations</label>
                <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs resize-none"></textarea>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setWorkflowStep(2)}
                  className="px-5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#093d85] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue to Warehouse Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: WAREHOUSE SELECTION */}
          {workflowStep === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 2: Authorized Destination Warehouse Selection</h3>
                  <p className="text-xs text-slate-500">Select the destination depot and verify live storage occupancy before batch allocation.</p>
                </div>
                {!isManager && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    Scoped to Assigned Godown
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {warehouses.map(wh => {
                  const isSelected = selectedWarehouseId === wh.id;
                  const isAllowed = isManager || (user?.warehouseId === wh.id);

                  return (
                    <div
                      key={wh.id}
                      onClick={() => isAllowed && setSelectedWarehouseId(wh.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'border-[#0B4DA8] bg-blue-50/40 shadow-xs ring-2 ring-[#0B4DA8]/20' 
                          : isAllowed 
                          ? 'border-slate-200 hover:border-slate-300 bg-white' 
                          : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-slate-500 block">{wh.code}</span>
                          <h4 className="text-xs font-bold text-slate-900 mt-0.5">{wh.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{wh.district}, {wh.state}</p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#0B4DA8] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100/80 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Total Capacity:</span>
                          <span className="font-bold font-mono">{wh.capacityMT} MT</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Compatible:</span>
                          <span className="font-bold text-[#0B4DA8]">{wh.compatibleCommodities.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Godown Occupancy Meter */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800">Storage Capacity Status: {activeWh.name}</span>
                  <span className="text-[#0B4DA8]">{Math.round((occupiedWhCap / totalWhCap) * 100)}% Occupied</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                  <div className="bg-[#0B4DA8] h-full" style={{ width: `${Math.min(100, (occupiedWhCap / totalWhCap) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Occupied: <strong>{occupiedWhCap} Bags</strong></span>
                  <span>Available: <strong>{availableWhCap} Bags</strong></span>
                  <span>Total Capacity: <strong>{totalWhCap} Bags</strong></span>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setWorkflowStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  ← Back to Consignment Details
                </button>
                <button
                  onClick={() => setWorkflowStep(3)}
                  className="px-5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#093d85] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue to Batch &amp; Bin Allocation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BATCH CREATION & STORAGE ALLOCATION */}
          {workflowStep === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 3: Batch Creation &amp; Physical Bin Allocation</h3>
                  <p className="text-xs text-slate-500">Split consignment across batches and godown bins. Verify real-time balance meter.</p>
                </div>

                {/* Auto-Slot Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAutoSlot}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Intelligent Auto-Slot</span>
                  </button>
                  <button
                    onClick={handleAddAllocationRow}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Batch Row</span>
                  </button>
                </div>
              </div>

              {/* Real-time Balance Meter */}
              <div className={`p-4 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-4 ${
                isBalanceBalanced 
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900' 
                  : 'bg-amber-50/60 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isBalanceBalanced ? '✓' : '⚠️'}</span>
                  <div>
                    <p className="font-bold text-xs">
                      {isBalanceBalanced 
                        ? '100% Consignment Quantity Allocated' 
                        : `Allocation Imbalance: ${Math.abs(remainingUnallocated)} bags ${remainingUnallocated > 0 ? 'remaining' : 'over-allocated'}`}
                    </p>
                    <p className="text-[11px] opacity-90">
                      Total Consignment: <strong>{totalQuantity} Bags</strong> · Allocated: <strong>{totalAllocated} Bags</strong> · Unallocated: <strong>{remainingUnallocated} Bags</strong>
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  isBalanceBalanced ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {isBalanceBalanced ? 'Ready for Review' : 'Adjust Quantities'}
                </span>
              </div>

              {/* Dynamic Allocations Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Batch ID *</th>
                      <th className="p-3">Commodity</th>
                      <th className="p-3">Quantity (Bags) *</th>
                      <th className="p-3">Destination Bin *</th>
                      <th className="p-3">Initial Quality Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allocations.map((alloc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={alloc.batchId}
                            onChange={e => {
                              const updated = [...allocations];
                              updated[idx].batchId = e.target.value.toUpperCase();
                              setAllocations(updated);
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono uppercase font-bold text-slate-800 w-28"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{alloc.commodity}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={1}
                            value={alloc.quantity}
                            onChange={e => {
                              const updated = [...allocations];
                              updated[idx].quantity = Number(e.target.value);
                              setAllocations(updated);
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 w-24"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={alloc.binCode}
                            onChange={e => {
                              const updated = [...allocations];
                              updated[idx].binCode = e.target.value;
                              setAllocations(updated);
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-[11px] font-bold text-slate-800"
                          >
                            {activeWhBins.map(b => (
                              <option key={b.binCode} value={b.binCode}>
                                {b.binCode} ({b.maxCapacityBags - b.currentBags} free)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Pending Inspection
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSplitRow(idx)}
                              title="Split across two bins"
                              className="p-1 rounded text-purple-600 hover:bg-purple-50 cursor-pointer font-bold text-xs"
                            >
                              Split
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAllocationRow(idx)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setWorkflowStep(2)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  ← Back to Warehouse Selection
                </button>
                <button
                  disabled={!isBalanceBalanced}
                  onClick={() => setWorkflowStep(4)}
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    isBalanceBalanced 
                      ? 'bg-[#0B4DA8] hover:bg-[#093d85] text-white' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Review &amp; Confirm Consignment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {workflowStep === 4 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 4: Consignment Summary &amp; Electronic Voucher Generation</h3>
                  <p className="text-xs text-slate-500">Review all details before persistent database commit. An electronic inward pass will be generated.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200 font-mono">
                  {consignmentId}
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Supplier</span>
                  <span className="font-bold text-slate-900 block mt-0.5 truncate">{supplierName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Challan: {challanNumber}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Arrived</span>
                  <span className="font-black text-slate-900 block mt-0.5 text-sm">{totalQuantity} Bags</span>
                  <span className="text-[10px] text-slate-400 font-mono">{(totalQuantity * 0.05).toFixed(1)} MT {commodity}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Destination Godown</span>
                  <span className="font-bold text-slate-900 block mt-0.5 truncate">{activeWh.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{activeWh.code}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Allocation Mode</span>
                  <span className="font-bold text-purple-700 block mt-0.5">{allocationMode}</span>
                  <span className="text-[10px] text-slate-400">{allocations.length} storage bin(s)</span>
                </div>
              </div>

              {/* Allocations Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50 p-2.5 border-b border-slate-200 font-bold text-slate-700 text-[11px]">
                  Physical Storage Allocations ({allocations.length} Batches)
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] text-slate-500 uppercase">
                    <tr>
                      <th className="p-2.5">Batch ID</th>
                      <th className="p-2.5">Commodity</th>
                      <th className="p-2.5">Quantity</th>
                      <th className="p-2.5">Assigned Godown Bin</th>
                      <th className="p-2.5">Initial Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((a, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-mono font-bold text-[#0B4DA8]">{a.batchId}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{a.commodity}</td>
                        <td className="p-2.5 font-mono font-bold">{a.quantity} Bags</td>
                        <td className="p-2.5 font-mono text-[11px] font-bold text-slate-700">{a.binCode}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Pending Inspection
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#0B4DA8] shrink-0" />
                <span>
                  <strong>Strict Quality &amp; FIFO Invariant:</strong> Newly created batches are saved in <em>Pending Inspection</em>. They will strictly NOT be eligible for FIFO dispatch allocation until formal Quality Assaying and Approval.
                </span>
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setWorkflowStep(3)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  ← Edit Allocations
                </button>
                <button
                  onClick={handleConfirmSubmission}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Confirm Receipt &amp; Generate Voucher</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CONSIGNMENTS LEDGER */}
      {activeSubTab === 'CONSIGNMENTS' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Consignments &amp; Inward Gate Pass Ledger</h3>
              <p className="text-xs text-slate-500">Historical records of all received consignments, suppliers, and generated vouchers.</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search consignment, supplier, vehicle..."
                value={csgSearch}
                onChange={e => setCsgSearch(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 w-64"
              />
              <select
                value={csgCommodityFilter}
                onChange={e => setCsgCommodityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="ALL">All Commodities</option>
                <option value="Wheat">Wheat</option>
                <option value="Rice">Rice</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Consignment ID</th>
                  <th className="p-3">Arrival Date</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Commodity &amp; Bags</th>
                  <th className="p-3">Carrier Vehicle</th>
                  <th className="p-3">Destination Godown</th>
                  <th className="p-3">Voucher Ref</th>
                  <th className="p-3 text-right">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredConsignments.map(c => (
                  <tr key={c.consignmentId} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-[#0B4DA8]">{c.consignmentId}</td>
                    <td className="p-3 text-slate-600">{c.arrivalDate}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.supplierName}</td>
                    <td className="p-3">
                      <span className="font-bold">{c.totalQuantity} Bags</span>
                      <span className="text-[10px] text-slate-500 block">{c.commodity}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px] uppercase font-bold text-slate-700">{c.vehicleNumber}</td>
                    <td className="p-3 text-slate-700">{c.destinationWarehouseName}</td>
                    <td className="p-3 font-mono text-[10px] font-bold text-emerald-700">{c.receiptVoucherId}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedVoucher(c)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0B4DA8] hover:bg-blue-100 font-bold text-xs cursor-pointer"
                      >
                        View Voucher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MANAGE WAREHOUSES (Manager Only) */}
      {activeSubTab === 'MANAGE_WAREHOUSES' && isManager && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Warehouse &amp; Godown Configuration</h3>
              <p className="text-xs text-slate-500">Configure godowns, physical bays, capacity constraints, and compatible commodities.</p>
            </div>
            <button
              onClick={() => setShowAddWarehouseModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#0B4DA8] text-white hover:bg-[#093d85] font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Warehouse</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map(w => (
              <div key={w.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">{w.code}</span>
                    <h4 className="text-xs font-bold text-slate-900 mt-0.5">{w.name}</h4>
                    <p className="text-[11px] text-slate-500">{w.district}, {w.state}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">ACTIVE</span>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-slate-200/60">
                  <div className="flex justify-between text-slate-600">
                    <span>Capacity:</span>
                    <span className="font-mono font-bold">{w.capacityMT} MT</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Zones configured:</span>
                    <span className="font-bold">{w.zones.length} Zones</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Commodities:</span>
                    <span className="font-bold text-[#0B4DA8]">{w.compatibleCommodities.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: VIEW CONSIGNMENT VOUCHER */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span className="text-xs font-bold uppercase tracking-wider">Electronic Inward Gate Pass (Form PDS-01)</span>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">BhandarSetu iPDS</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Voucher: {selectedVoucher.receiptVoucherId}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-[#0B4DA8]">{selectedVoucher.consignmentId}</span>
                  <p className="text-[10px] text-slate-400">{selectedVoucher.receivedAt}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Supplier:</span>
                  <span className="font-bold text-slate-900">{selectedVoucher.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Delivery Challan:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVoucher.challanNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Quantity:</span>
                  <span className="font-bold text-slate-900">{selectedVoucher.totalQuantity} Bags ({selectedVoucher.commodity})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Carrier Vehicle:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVoucher.vehicleNumber}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Storage Allocations:</span>
                <div className="border rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedVoucher.batches.map((b, i) => (
                    <div key={i} className="p-2.5 flex justify-between text-[11px]">
                      <span className="font-mono font-bold text-[#0B4DA8]">{b.batchId}</span>
                      <span className="font-bold">{b.quantity} Bags</span>
                      <span className="font-mono text-slate-600">{b.binCode}</span>
                      <span className="text-amber-700 font-bold">{b.qualityStatus}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="px-4 py-2 rounded-xl bg-[#0B4DA8] text-white hover:bg-[#093d85] font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
