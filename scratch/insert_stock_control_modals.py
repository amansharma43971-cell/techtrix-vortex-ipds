# Script to insert Stock Control Modals and Drawer into index.html
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

modals_html = """
  <!-- ========================================================================= -->
  <!-- DRAWER: STOCK CONTROL UNIFIED RECORD DETAIL                               -->
  <!-- ========================================================================= -->
  <div id="stockControlDrawer" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs hidden justify-end">
    <div class="w-full max-w-2xl bg-white border-l border-[#E3E8F0] h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-slideInRight" id="stockControlDrawerContent">
      <!-- Injected via JS -->
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: REPORT DAMAGED STOCK                                               -->
  <!-- ========================================================================= -->
  <div id="reportDamageModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-rose-100 bg-rose-700 text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <h3 class="text-sm font-bold tracking-tight">Report Damaged, Spoiled or Held Stock</h3>
        </div>
        <button onclick="closeReportDamageModal()" class="text-rose-200 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleReportDamageSubmit(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Target Batch ID *</label>
          <select id="dmgBatchId" onchange="handleDamageBatchChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900 focus:bg-white">
            <!-- Dynamically populated -->
          </select>
        </div>

        <div id="dmgBatchSnapshot" class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <!-- Live Batch Details -->
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Affected Quantity (Bags) *</label>
            <input type="number" id="dmgQuantity" min="1" required placeholder="e.g. 25" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-rose-500" />
            <span class="text-[10px] text-slate-400 block mt-0.5">Affects only reported bags; remainder stays sound.</span>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Primary Damage Reason *</label>
            <select id="dmgReason" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <option value="MOISTURE">Moisture / Dampness / Water Seepage</option>
              <option value="FUNGUS">Fungus / Mildew / Discoloration</option>
              <option value="PESTS">Live Weevil / Insect Infestation</option>
              <option value="CONTAMINATION">Chemical / Foreign Contamination</option>
              <option value="PACKAGING_FAILURE">Burst / Torn Jute Bag Handling Loss</option>
              <option value="QUALITY_FAILURE">Laboratory Assay Refusal</option>
              <option value="OTHER">Other Warehouse Hazard</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Evidence Observations &amp; Physical Findings *</label>
          <textarea id="dmgNotes" rows="2.5" required placeholder="Describe stack location, moisture meter reading, smell, insect count, or handling incident..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 resize-none font-medium"></textarea>
        </div>

        <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
          <strong>🔒 Strict FIFO Invariant Notice:</strong> Submitting this report immediately marks the affected quantity as <code>ON_HOLD</code>. The system will lock these bags from FIFO draw and outbound gate passes until an authorized Supervisor or Quality Officer issues clearance.
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeReportDamageModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5">
            <span>Log Quarantine Hold &amp; Notify Manager</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: CREATE CLEARANCE ORDER (Manager Only)                               -->
  <!-- ========================================================================= -->
  <div id="clearanceOrderModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          <h3 class="text-sm font-bold tracking-tight">Issue Godown / Storage Bay Clearance Order</h3>
        </div>
        <button onclick="closeClearanceOrderModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleClearanceOrderSubmit(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Warehouse Depot *</label>
            <select id="clrWarehouse" onchange="handleClearanceDepotChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Source Godown Bay to Clear *</label>
            <select id="clrBay" onchange="handleClearanceBayChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>
        </div>

        <!-- Live Bay Stock Auditor Panel -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Live Bay Inventory Audit &amp; Batches Present:</span>
            <span id="clrBaySummaryBadge" class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-[#0B4DA8]">Auditing...</span>
          </div>
          <div id="clrBayBatchesList" class="space-y-1.5 max-h-36 overflow-y-auto">
            <!-- Dynamically populated -->
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Clearance Reason *</label>
            <select id="clrReason" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <option value="ROUTINE_REORGANIZATION">Routine Godown Reorganization</option>
              <option value="SPACE_INTAKE">Space Required for Intake Harvest</option>
              <option value="TRANSFER_LOCATION">Transfer to Approved Depot/Bay</option>
              <option value="DAMAGED_SEGREGATION">Damaged &amp; Held Stock Segregation</option>
              <option value="DISPATCH_ALLOCATION">Clearance for Outward Dispatch</option>
              <option value="APPROVED_DISPOSAL">Approved Disposal Execution</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Priority *</label>
            <select id="clrPriority" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900">
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent SLA</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Completion Deadline *</label>
            <input type="datetime-local" id="clrDeadline" required class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-medium text-slate-900" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Assigned Lead Operator *</label>
            <select id="clrOperator" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Destination Bay / Relocation Zone *</label>
            <input type="text" id="clrDestBay" required placeholder="e.g. BAY-NGP-QUARANTINE-01 or RACK-3" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Special Handling Instructions &amp; Safety Protocols</label>
          <textarea id="clrInstructions" rows="2" placeholder="e.g. Forklift operator to inspect bottom dunnage crates before shifting..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 resize-none font-medium"></textarea>
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeClearanceOrderModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5">
            <span>Issue Order &amp; Dispatch Checklist</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: STOCK TRANSFER & RELOCATION                                        -->
  <!-- ========================================================================= -->
  <div id="stockTransferModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          <h3 class="text-sm font-bold tracking-tight">Initiate Stock Transfer &amp; Relocation</h3>
        </div>
        <button onclick="closeStockTransferModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleStockTransferSubmit(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Source Warehouse *</label>
            <select id="trfSourceWh" onchange="handleTransferSourceChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Batch to Transfer *</label>
            <select id="trfBatchId" onchange="handleTransferBatchChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>
        </div>

        <div id="trfBatchNotice" class="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px]">
          <!-- Live Available Stock Notice -->
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Destination Warehouse *</label>
            <select id="trfDestWh" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Destination Bay / Bin *</label>
            <input type="text" id="trfDestBay" required placeholder="e.g. BAY-PUN-01-BIN-03" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Transfer Quantity (Bags) *</label>
            <input type="number" id="trfQuantity" min="1" required placeholder="e.g. 50" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900" />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Vehicle Number</label>
            <input type="text" id="trfVehicle" placeholder="MH-31-CB-9021" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium text-slate-900" />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Driver Name</label>
            <input type="text" id="trfDriver" placeholder="Mohan Lal" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Transfer Justification / Official Reference *</label>
          <input type="text" id="trfReason" required placeholder="e.g. Inter-depot buffer replenishment against District Pune allocation" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium" />
        </div>

        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] leading-relaxed">
          <strong>📋 Traceability Invariant:</strong> Transferring stock retains the exact original receipt date, quality certifications, and stack age. Old stock transferred across depots will never appear as freshly received.
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeStockTransferModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white font-bold shadow-md cursor-pointer">Confirm &amp; Issue Transfer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: PHYSICAL STOCK VERIFICATION                                        -->
  <!-- ========================================================================= -->
  <div id="stockVerifyModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3 class="text-sm font-bold tracking-tight">Initiate Physical Stock Verification Audit</h3>
        </div>
        <button onclick="closeStockVerifyModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleStockVerifySubmit(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Target Warehouse *</label>
            <select id="verWarehouse" onchange="handleVerifyDepotChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Godown Bay to Audit *</label>
            <select id="verBay" onchange="handleVerifyBayChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900">
              <!-- Populated dynamically -->
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <span class="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">Live System Snapshot vs. Physical Count Entry:</span>
          <div id="verBatchesTable" class="border border-slate-200 rounded-xl overflow-hidden">
            <!-- Dynamically populated count rows -->
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Discrepancy Justification / Inspector Notes</label>
          <textarea id="verDiscrepancyNotes" rows="2.5" placeholder="Specify if torn bags, spillage salvage, or misstacking was observed during count..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 resize-none font-medium"></textarea>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
          <strong>⚖️ Anti-Tampering Protection:</strong> Entering counts does not silently modify stock registers. If a variance exists, a formal Discrepancy Record is created and locked pending official Manager review.
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeStockVerifyModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md cursor-pointer">Submit Physical Count Audit</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: DISPOSAL & WRITE-OFF REQUEST                                       -->
  <!-- ========================================================================= -->
  <div id="disposalRequestModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-rose-100 bg-rose-700 text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          <h3 class="text-sm font-bold tracking-tight">Submit Stock Disposal &amp; Write-off Dossier</h3>
        </div>
        <button onclick="closeDisposalRequestModal()" class="text-rose-200 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleDisposalRequestSubmit(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Batch with Quarantined / Rejected Stock *</label>
          <select id="dspBatchId" onchange="handleDisposalBatchChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-900">
            <!-- Dynamically populated with batches having damaged/rejected stock -->
          </select>
        </div>

        <div id="dspBatchNotice" class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
          <!-- Live Damaged Stock Details -->
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Condemned Quantity to Write-off (Bags) *</label>
            <input type="number" id="dspQuantity" min="1" required placeholder="e.g. 40" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500" />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Lab / Quality Certificate Reference *</label>
            <input type="text" id="dspInspectionRef" required placeholder="e.g. INS-2025-007 or BIS-QA-882" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-medium text-slate-900" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Authorized Scientific Disposal Method *</label>
          <select id="dspMethod" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900">
            <option value="SCIENTIFIC_COMPOSTING">Certified Scientific Composting &amp; Biogas Facility</option>
            <option value="CERTIFIED_INCINERATION">High-Temperature Hazardous Incineration</option>
            <option value="INDUSTRIAL_REPURPOSING">Non-Food Industrial Processing (Starch/Adhesive)</option>
            <option value="SECURE_LANDFILL">Municipal Authorized Government Landfill</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Reason for Condemnation &amp; Supporting Findings *</label>
          <textarea id="dspReason" rows="2.5" required placeholder="State laboratory findings, pest count, chemical test results, and reason why stock cannot be reconditioned..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 resize-none font-medium"></textarea>
        </div>

        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-relaxed">
          <strong>⚠️ Separation of Duties Policy:</strong> Submitting a disposal request queues it for District Godown Manager review. Approval alone does not deduct stock from registers — stock is written off only upon recording actual certified disposal completion. Requesters cannot approve their own requests.
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeDisposalRequestModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold shadow-md cursor-pointer">Submit for Supervisor Approval</button>
        </div>
      </form>
    </div>
  </div>
"""

# Inject after taskReassignModal
target_reassign = "  <!-- MODAL: REASSIGN TASK"
assert target_reassign in html, "Target taskReassignModal not found"

# Find end of taskReassignModal
idx_start = html.find(target_reassign)
idx_end = html.find("</div>\n  </div>", idx_start) + len("</div>\n  </div>")

html = html[:idx_end] + "\n" + modals_html + html[idx_end:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Stock Control Modals and Drawer injected successfully into HTML.")

