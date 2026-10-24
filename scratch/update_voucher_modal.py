with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            <div class="text-right">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                ⏳ Awaiting Quality Assaying
              </span>
            </div>"""

replacement = """            <div class="text-right">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
                csg.status === 'STAGED_AWAITING_PUTAWAY' ? 'bg-blue-100 text-[#0B4DA8] border border-blue-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }">
                ${csg.status === 'STAGED_AWAITING_PUTAWAY' ? '📦 Staged · Awaiting Operator Put-Away' : '⏳ Awaiting Quality Assaying'}
              </span>
            </div>"""

if target in content:
    content = content.replace(target, replacement)
    print("Updated voucher modal status pill")
else:
    print("Could not find voucher target")

# Also update the bin cell in the voucher table:
table_target = """                      <td class="p-2.5 font-mono font-bold text-slate-800">${b.binCode}</td>"""
table_replacement = """                      <td class="p-2.5 font-mono font-bold text-slate-800">
                        ${b.binCode ? b.binCode : `<span class="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">Staged at Dock (Planned: ${b.plannedBinCode || 'Bin'})</span>`}
                      </td>"""

if table_target in content:
    content = content.replace(table_target, table_replacement)
    print("Updated voucher table bin column to reflect Staged status")
else:
    print("Could not find table_target")

# Also update the voucher modal footer buttons:
footer_target = """          <button onclick="setRoute('quality');closeConsignmentVoucherModal();" class="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
            <span>🔬 Proceed to Quality Inspection</span>
          </button>"""

footer_replacement = """          <button onclick="setRoute('operator-tasks');closeConsignmentVoucherModal();" class="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
            <span>📦 Open Put-Away Tasks</span>
          </button>
          <button onclick="setRoute('quality');closeConsignmentVoucherModal();" class="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5">
            <span>🔬 Quality Inspection</span>
          </button>"""

if footer_target in content:
    content = content.replace(footer_target, footer_replacement)
    print("Updated voucher footer with Put-Away task button")
else:
    print("Could not find footer_target")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved voucher modal updates")

