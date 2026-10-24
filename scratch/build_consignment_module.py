# Comprehensive script to build and inject the Warehouse, Batch and Storage Allocation workflow into index.html

import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# -----------------------------------------------------------------------------
# 1. Inject Modals for Warehouse Config & Consignment Voucher
# -----------------------------------------------------------------------------

modals_code = '''
  <!-- ========================================================================= -->
  <!-- MODAL: WAREHOUSE & STORAGE CONFIGURATION (MANAGER-ONLY)                   -->
  <!-- ========================================================================= -->
  <div id="warehouseConfigModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
      <div class="p-4 border-b border-blue-100 bg-[#0B4DA8] text-white flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="p-1.5 rounded-lg bg-white/10 text-white font-bold text-sm">🏢</span>
          <div>
            <h3 class="text-sm font-bold tracking-tight">Warehouse &amp; Storage Configuration</h3>
            <p class="text-[11px] text-blue-200">Manage godowns, physical zones, racks, bins, capacity limits, and commodity compatibility.</p>
          </div>
        </div>
        <button onclick="closeWarehouseConfigModal()" class="text-blue-200 hover:text-white p-1 text-sm cursor-pointer">✕</button>
      </div>

      <div class="p-5 overflow-y-auto space-y-6 text-xs flex-1" id="warehouseConfigModalContent">
        <!-- Rendered dynamically via renderWarehouseConfigModal() -->
      </div>

      <div class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <span class="text-[11px] text-slate-500 font-mono">Role Required: MANAGER (Executive Storage Scope)</span>
        <button onclick="closeWarehouseConfigModal()" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer">Close</button>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: OFFICIAL CONSIGNMENT INTAKE VOUCHER (FORM PDS-01)                  -->
  <!-- ========================================================================= -->
  <div id="consignmentVoucherModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
      <div class="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="p-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs">✓</span>
          <div>
            <h3 class="text-sm font-bold tracking-tight">Consignment Intake &amp; Storage Voucher</h3>
            <p class="text-[11px] text-slate-400">Official Electronic Inward Gate Pass (Form PDS-01)</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="printCurrentConsignmentVoucher()" class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <span>🖨 Print</span>
          </button>
          <button onclick="closeConsignmentVoucherModal()" class="text-slate-400 hover:text-white p-1 text-sm cursor-pointer">✕</button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto space-y-5 text-xs flex-1" id="consignmentVoucherContent">
        <!-- Rendered dynamically via renderConsignmentVoucherModal(csgId) -->
      </div>

      <div class="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <button onclick="closeConsignmentVoucherModal()" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer">
          Close Window
        </button>
        <div class="flex items-center gap-2">
          <button onclick="setRoute('quality');closeConsignmentVoucherModal();" class="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
            <span>🔬 Proceed to Quality Inspection</span>
          </button>
          <button onclick="setRoute('inventory');closeConsignmentVoucherModal();" class="px-4 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
            <span>📦 View in Batch Ledger</span>
          </button>
        </div>
      </div>
    </div>
  </div>
'''

marker_modal = '  <!-- ========================================================================= -->\n  <!-- DRAWER: STOCK CONTROL UNIFIED RECORD DETAIL'
assert marker_modal in html, "Modal insertion marker not found"
html = html.replace(marker_modal, modals_code + '\n' + marker_modal, 1)
print("Step 1: Injected Warehouse Config & Consignment Voucher Modals.")

# -----------------------------------------------------------------------------
# 2. Update appState with warehouses, consignments, and receiveWorkflow
# -----------------------------------------------------------------------------

old_state_marker = '      selectedBatchForAllocation: null,'
assert old_state_marker in html, "old_state_marker not found"

new_state_additions = '''      selectedBatchForAllocation: null,

      // Multi-Step Warehouse, Batch & Storage Allocation Workflow State
      receiveWorkflow: {
        currentStep: 1, // 1: Consignment, 2: Warehouse, 3: Allocation, 4: Review & Confirm
        consignmentId: 'CSG-2025-0042',
        supplierName: 'FCI Depot Karnal (Central Pool)',
        challanNumber: 'CHL-INW-0042',
        arrivalDate: '2025-10-24',
        arrivalTime: '10:30',
        commodity: 'Wheat',
        totalQuantity: 200,
        unit: 'Bags (50kg)',
        vehicleNumber: 'UP-16-BT-4412',
        remarks: 'Gate weighbridge sound verification, bag seals intact.',
        documentName: 'Challan_Gate_Weighment_Slip.pdf',
        destinationWarehouseId: 'GDN-NGP-01',
        allocationMode: 'MANUAL', // 'MANUAL' or 'AUTO_SLOT'
        allocations: [
          {
            batchId: 'B011',
            commodity: 'Wheat',
            quantity: 200,
            warehouseId: 'GDN-NGP-01',
            zoneCode: 'ZONE-B',
            rack: '02',
            binCode: 'BAY-A-RACK-02-BIN-02',
            receiptDate: '2025-10-24',
            qualityStatus: 'Pending Inspection'
          }
        ],
        isSubmitting: false,
        lastSubmittedConsignmentId: null
      },

      // Configured Warehouses Master List
      warehouses: [
        {
          id: 'GDN-NGP-01',
          code: 'GDN-NGP-01',
          name: 'Central Food Godown, Nagpur (Surajpur Depot)',
          district: 'Nagpur',
          state: 'Maharashtra',
          capacityMT: 5000,
          isActive: true,
          compatibleCommodities: ['Wheat', 'Rice', 'Sugar', 'Pulses', 'Mustard'],
          zones: [
            { code: 'ZONE-A', name: 'Zone A - Primary North', type: 'PICK_FACE' },
            { code: 'ZONE-B', name: 'Zone B - Central Bulk Bay', type: 'BULK' },
            { code: 'ZONE-C', name: 'Zone C - Buffer Overflow', type: 'BUFFER' },
            { code: 'ZONE-Q', name: 'Zone Q - Barricaded Quarantine', type: 'QUARANTINE' }
          ]
        },
        {
          id: 'GDN-PUN-02',
          code: 'GDN-PUN-02',
          name: 'District Buffer Depot, Pune',
          district: 'Pune',
          state: 'Maharashtra',
          capacityMT: 4000,
          isActive: true,
          compatibleCommodities: ['Wheat', 'Rice', 'Sugar'],
          zones: [
            { code: 'ZONE-PUN-01', name: 'Pune Primary Intake Bay', type: 'BULK' },
            { code: 'ZONE-PUN-02', name: 'Pune Strategic Buffer', type: 'BUFFER' },
            { code: 'ZONE-PUN-Q', name: 'Quarantine Holding', type: 'QUARANTINE' }
          ]
        },
        {
          id: 'GDN-NOIDA-01',
          code: 'GDN-NOIDA-01',
          name: 'Surajpur Central Depot (Noida Zone 1)',
          district: 'Gautam Buddha Nagar',
          state: 'Uttar Pradesh',
          capacityMT: 6000,
          isActive: true,
          compatibleCommodities: ['Wheat', 'Rice', 'Sugar', 'Pulses'],
          zones: [
            { code: 'ZONE-NOIDA-01', name: 'North Staging Bay', type: 'BULK' }
          ]
        }
      ],

      // Historical Consignments Ledger
      consignments: [
        {
          consignmentId: 'CSG-2025-001',
          receiptVoucherId: 'RCV-2025-0019',
          supplierName: 'FCI Depot Karnal (Central Pool)',
          challanNumber: 'CHL-PB-99120',
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
          consignmentId: 'CSG-2025-002',
          receiptVoucherId: 'RCV-2025-0024',
          supplierName: 'Punjab Agro Pool Division',
          challanNumber: 'CHL-PB-99144',
          arrivalDate: '2025-01-10',
          arrivalTime: '11:15',
          commodity: 'Wheat',
          totalQuantity: 150,
          unit: 'Bags (50kg)',
          vehicleNumber: 'PB-10-BW-7714',
          remarks: 'Sona Moti Grade A intake certified',
          destinationWarehouseId: 'GDN-NGP-01',
          destinationWarehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          allocationMode: 'MANUAL',
          receivedById: 'u-admin-ngp',
          receivedByName: 'Ramesh Patil',
          receivedAt: '2025-01-10 11:15',
          status: 'STORED_AWAITING_INSPECTION',
          batches: [
            {
              batchId: 'B002',
              commodity: 'Wheat',
              quantity: 150,
              warehouseId: 'GDN-NGP-01',
              zoneCode: 'ZONE-A',
              rack: '01',
              binCode: 'BAY-A-RACK-01-BIN-01',
              receiptDate: '2025-01-10',
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
      ],'''

html = html.replace(old_state_marker, new_state_additions, 1)
print("Step 2: Added receiveWorkflow, warehouses, and consignments to appState.")

# Also update bins array to include warehouseId
html = html.replace(
    "{ code: 'BAY-A-RACK-01-BIN-01', bay: 'A', rack: '01', bin: '01', zone: 'PICK_FACE', commodity: 'Wheat', capacity: 400, occupied: 250, batches: ['B001', 'B002'], pickSequence: 10 },",
    "{ code: 'BAY-A-RACK-01-BIN-01', bay: 'A', rack: '01', bin: '01', zone: 'PICK_FACE', commodity: 'Wheat', capacity: 400, occupied: 250, batches: ['B001', 'B002'], pickSequence: 10, warehouseId: 'GDN-NGP-01', isActive: true },",
    1
)
print("Step 2b: Updated bins.")

# Update localStorage loading & saveState
save_target = "allocationRequests: appState.allocationRequests"
new_save = "allocationRequests: appState.allocationRequests,\n          consignments: appState.consignments,\n          warehouses: appState.warehouses"
html = html.replace(save_target, new_save, 1)

load_target = "if (parsed.notifications && parsed.notifications.length > 0) appState.notifications = parsed.notifications;"
new_load = load_target + "\n        if (parsed.consignments && parsed.consignments.length > 0) appState.consignments = parsed.consignments;\n        if (parsed.warehouses && parsed.warehouses.length > 0) appState.warehouses = parsed.warehouses;"
html = html.replace(load_target, new_load, 1)
print("Step 2c: Updated localStorage save & load.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved stage 1 of index.html")

