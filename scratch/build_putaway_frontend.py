# Script to inject Inward Analysis, Smart Recommendation, and Operator Put-Away Workflow into index.html

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject confirmPutawayModal right before consignmentVoucherModal
modal_markup = '''  <!-- ========================================================================= -->
  <!-- MODAL: OPERATOR PHYSICAL PUT-AWAY CONFIRMATION                             -->
  <!-- ========================================================================= -->
  <div id="confirmPutawayModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
      <!-- Header -->
      <div class="p-4 border-b border-blue-100 bg-[#0B4DA8] text-white flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold text-sm">
            📦
          </div>
          <div>
            <h3 class="text-sm font-bold tracking-tight">Operator Physical Put-Away Confirmation</h3>
            <p class="text-[11px] text-blue-100/80">On-site stock placement verification, physical count &amp; bin occupancy certification</p>
          </div>
        </div>
        <button onclick="closeConfirmPutawayModal()" class="text-white/80 hover:text-white p-1 text-sm cursor-pointer">✕</button>
      </div>

      <!-- Scrollable Form Body -->
      <div class="p-6 overflow-y-auto space-y-5 text-xs flex-1" id="confirmPutawayModalContent">
        <!-- Injected via renderPutawayModalContent(taskId) -->
      </div>

      <!-- Action Footer -->
      <div class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
        <button onclick="closeConfirmPutawayModal()" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer">
          Cancel
        </button>
        <button id="btnExecutePutaway" onclick="handleExecutePutawayConfirmation()" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all">
          <span>✓ Certify Physical Placement &amp; Update Inventory</span>
        </button>
      </div>
    </div>
  </div>
'''

if 'id="confirmPutawayModal"' not in content:
    target = '<div id="consignmentVoucherModal"'
    pos = content.find(target)
    if pos != -1:
        content = content[:pos] + modal_markup + "\n" + content[pos:]
        print("Inserted confirmPutawayModal HTML")
    else:
        print("Could not find target for modal insertion")
else:
    print("confirmPutawayModal already exists in HTML")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved index.html with modal")

