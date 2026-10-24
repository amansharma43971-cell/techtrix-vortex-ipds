# Script to inject HTML Modals, Task Views, and Handlers into index.html
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# -----------------------------------------------------------------------------
# 1. Inject Modals and Drawers after #batchDrawer
# -----------------------------------------------------------------------------

modals_and_drawers_html = """
  <!-- ========================================================================= -->
  <!-- DRAWER: TASK DETAILS & FULL STATUS TIMELINE                                -->
  <!-- ========================================================================= -->
  <div id="taskDrawer" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs hidden justify-end">
    <div class="w-full max-w-2xl bg-white border-l border-[#E3E8F0] h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-slideInRight" id="taskDrawerContent">
      <!-- Injected via JS -->
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: ASSIGN NEW TASK (Manager Only)                                      -->
  <!-- ========================================================================= -->
  <div id="createTaskModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          <h3 class="text-sm font-bold tracking-tight">Assign Warehouse &amp; Quality Task</h3>
        </div>
        <button onclick="closeCreateTaskModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleCreateTaskSubmit(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Task Title *</label>
          <input type="text" id="taskCreateTitle" required placeholder="e.g. Aerate &amp; Re-assay Held Rice Consignment" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-medium" />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Task Description / Instructions *</label>
          <textarea id="taskCreateDesc" rows="2.5" required placeholder="Provide clear instructions for sampling, aeration, stack verification, or dispatch preparation..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0B4DA8] outline-hidden resize-none font-medium"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Depot / Warehouse *</label>
            <select id="taskCreateWarehouse" onchange="handleTaskWarehouseChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:bg-white">
              <!-- Dynamically populated -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Target Batch ID *</label>
            <select id="taskCreateBatch" onchange="handleTaskBatchChange()" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:bg-white">
              <!-- Dynamically populated from real batches -->
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Commodity</label>
            <input type="text" id="taskCreateCommodity" readonly class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold" />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Task Type *</label>
            <select id="taskCreateType" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:bg-white">
              <option value="QUALITY_INSPECTION">Quality Inspection</option>
              <option value="RECHECK">Recheck &amp; Re-assay</option>
              <option value="STOCK_VERIFICATION">Stock Verification</option>
              <option value="DISPATCH_PREPARATION">Dispatch Preparation</option>
              <option value="GENERAL">General Warehouse Task</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Priority *</label>
            <select id="taskCreatePriority" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800 focus:bg-white">
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent (SLA Alert)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Assigned Operator *</label>
            <select id="taskCreateOperator" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800 focus:bg-white">
              <!-- Dynamically populated from real operators in depot -->
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Due Date &amp; Time (SLA) *</label>
            <input type="datetime-local" id="taskCreateDueAt" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0B4DA8] font-medium" />
          </div>
        </div>

        <!-- Checklist Parameters -->
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span class="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">Required Checklist &amp; Assaying Parameters:</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="chkMoisture" checked class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
              <span>Moisture % Content Assay</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="chkForeignMatter" checked class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
              <span>Foreign Matter &amp; Impurity Check</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="chkWeevil" checked class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
              <span>Weevil Infestation Pest Count</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="chkPackaging" checked class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
              <span>Packaging &amp; Jute Stitching Soundness</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="chkDunnage" checked class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
              <span>Stack Alignment &amp; Dunnage Crates</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="chkDamagedBags" checked class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
              <span>Damaged / Torn Bag Physical Count</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Optional Supporting Notes / Specifications</label>
          <input type="text" id="taskCreateNotes" placeholder="e.g. Reference Lab SOP-QA-2025 or Circular #88" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900" />
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeCreateTaskModal()" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5">
            <span>Assign Task &amp; Notify Operator</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: OPERATOR SUBMIT EVIDENCE & MEASUREMENTS                              -->
  <!-- ========================================================================= -->
  <div id="taskSubmitModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <h3 class="text-sm font-bold tracking-tight">Submit Task Completion &amp; Assaying Evidence</h3>
        <button onclick="closeSubmitEvidenceModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleSubmitEvidence(event)" class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
        <input type="hidden" id="taskSubmitId" />

        <div class="p-3 rounded-xl bg-blue-50 border border-blue-200">
          <div class="flex justify-between items-center"><strong id="taskSubmitTitle" class="text-blue-950 font-bold"></strong> <span id="taskSubmitBadge" class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-900"></span></div>
          <p id="taskSubmitTarget" class="text-blue-800 text-[11px] mt-1"></p>
        </div>

        <div class="space-y-3">
          <span class="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">Physical Measurements &amp; Laboratory Findings:</span>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Moisture Content (% wt) *</label>
              <input type="number" step="0.1" id="subMoisture" required placeholder="e.g. 11.2" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-[#0B4DA8]" />
              <span id="subMoistureTolerance" class="text-[10px] text-slate-400 block mt-0.5">Tolerance limit varies by commodity</span>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Foreign Matter (% wt) *</label>
              <input type="number" step="0.05" id="subForeignMatter" required placeholder="e.g. 0.35" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-[#0B4DA8]" />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Live Weevil Count (per 1kg) *</label>
              <input type="number" id="subWeevils" required value="0" min="0" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-[#0B4DA8]" />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Damaged / Torn Bags Count</label>
              <input type="number" id="subDamagedBags" value="0" min="0" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold" />
            </div>
          </div>
        </div>

        <!-- Checklist Verification -->
        <div class="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span class="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">Operator Confirmation:</span>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="subCheckPackets" required class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
            <span>Bag packaging, seals, and batch stencils are completely intact.</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="subCheckSmell" required class="rounded text-[#0B4DA8] focus:ring-[#0B4DA8]" />
            <span>Grain smell is sound and natural (no dampness, fermentation, or chemical odor).</span>
          </label>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Operator Completion Remarks &amp; Assaying Notes *</label>
          <textarea id="subRemarks" rows="2.5" required placeholder="Describe test methodology, sample bags drawn, and observation notes..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 resize-none font-medium"></textarea>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
          <strong>⚠️ Official Policy Notice:</strong> Submitting measurements records an immutable verification step. A held or quarantined batch remains ineligible for FIFO dispatch until the District Manager completes formal quality sign-off.
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button type="button" onclick="closeSubmitEvidenceModal()" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5">
            <span>Submit for Supervisor Review</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: REPORT BLOCKER                                                      -->
  <!-- ========================================================================= -->
  <div id="taskBlockerModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-rose-100 bg-rose-700 text-white flex items-center justify-between">
        <h3 class="text-sm font-bold tracking-tight">Report Operational Blocker</h3>
        <button onclick="closeReportBlockerModal()" class="text-rose-200 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleReportBlocker(event)" class="p-5 space-y-4 text-xs">
        <input type="hidden" id="taskBlockerId" />

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Blocker Category *</label>
          <select id="blockerCategory" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800">
            <option value="EQUIPMENT_FAILURE">Moisture Meter / Laboratory Equipment Down</option>
            <option value="SEVERE_INFESTATION">Live Pest / Weevil Infestation Outbreak Detected</option>
            <option value="STACK_SAFETY">Stack Instability / Dunnage Crate Collapse Risk</option>
            <option value="GODOWN_LEAKAGE">Water Leakage / High Humidity in Bay</option>
            <option value="ACCESS_BLOCKED">Aisle Blocked by Consignment Intake</option>
            <option value="OTHER">Other Operational Impairment</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Details &amp; Escalation Explanation *</label>
          <textarea id="blockerDetails" rows="3" required placeholder="Specify why the task cannot proceed and what immediate intervention is required..." class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium resize-none"></textarea>
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onclick="closeReportBlockerModal()" class="px-4 py-2 border rounded-xl font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-md cursor-pointer">Log Blocker &amp; Alert Manager</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: MANAGER QUALITY REVIEW & APPROVAL                                    -->
  <!-- ========================================================================= -->
  <div id="taskReviewModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <h3 class="text-sm font-bold tracking-tight">Supervisor Quality Review &amp; Decision</h3>
        <button onclick="closeTaskReviewModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <div class="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto" id="taskReviewModalContent">
        <!-- Dynamically rendered via JS -->
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- MODAL: REASSIGN TASK                                                       -->
  <!-- ========================================================================= -->
  <div id="taskReassignModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-4 border-b border-slate-100 bg-[#0A2F6B] text-white flex items-center justify-between">
        <h3 class="text-sm font-bold tracking-tight">Reassign Task / Modify SLA</h3>
        <button onclick="closeReassignTaskModal()" class="text-slate-300 hover:text-white p-1 cursor-pointer">✕</button>
      </div>

      <form onsubmit="handleReassignTaskSubmit(event)" class="p-5 space-y-4 text-xs">
        <input type="hidden" id="reassignTaskId" />

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Reassign To Operator *</label>
          <select id="reassignOperator" required class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-800">
            <!-- Populated dynamically -->
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Priority</label>
          <select id="reassignPriority" class="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-bold text-slate-800">
            <option value="NORMAL">Normal Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">Urgent (SLA Alert)</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Updated Due Date &amp; Time *</label>
          <input type="datetime-local" id="reassignDueAt" required class="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium" />
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onclick="closeReassignTaskModal()" class="px-4 py-2 border rounded-xl font-semibold cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white font-bold rounded-xl shadow-md cursor-pointer">Confirm Reassignment</button>
        </div>
      </form>
    </div>
  </div>
"""

batch_drawer_target = """  <div id="batchDrawer" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs hidden justify-end">
    <div class="w-full max-w-2xl bg-white border-l border-[#E3E8F0] h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-slideInRight" id="batchDrawerContent">
      <!-- Injected via JS -->
    </div>
  </div>"""

assert batch_drawer_target in html, "batchDrawer not found in index.html"
html = html.replace(batch_drawer_target, batch_drawer_target + modals_and_drawers_html, 1)
print("Step 1: Modals and drawers injected into HTML.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved HTML modals.")
