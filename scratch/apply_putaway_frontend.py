with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

putaway_logic_code = '''
    // =========================================================================
    // AUTOMATED INWARD ANALYSIS & SMART BATCH RECOMMENDATION ENGINE
    // =========================================================================
    function runAutomatedInwardAnalysis() {
      const wf = appState.receiveWorkflow;
      if (!wf) return;

      const destWhId = wf.destinationWarehouseId || 'GDN-NGP-01';
      const wh = (appState.warehouses || []).find(w => w.id === destWhId) || {
        id: 'GDN-NGP-01', code: 'GDN-NGP-01', name: 'Central Food Godown, Nagpur (Surajpur Depot)', capacityMT: 5000, isActive: true
      };

      // 1. Inspect existing batches of the same commodity in this godown (FIFO tracking)
      const existingBatches = (appState.batches || []).filter(b => 
        (b.warehouseId === destWhId || (!b.warehouseId && destWhId === 'GDN-NGP-01')) &&
        b.commodity === wf.commodity && b.availableQuantity > 0
      ).sort((a, b) => parseDateDMY(a.arrivalDate) - parseDateDMY(b.arrivalDate));

      const oldestBatch = existingBatches.length > 0 ? existingBatches[0] : null;
      const totalExistingCommStock = existingBatches.reduce((s, b) => s + b.availableQuantity, 0);

      // 2. Filter & sort compatible storage bins deterministically
      const candidateBins = (appState.bins || []).filter(b => {
        const matchesWh = b.warehouseId === destWhId || (!b.warehouseId && destWhId === 'GDN-NGP-01');
        if (!matchesWh) return false;
        if (b.isActive === false) return false;
        if (b.commodity && b.commodity !== wf.commodity && b.occupied > 0) return false; // Strict commodity segregation
        const avail = Math.max(0, b.capacity - b.occupied);
        return avail > 0;
      });

      const zonePriority = { 'ZONE-A': 1, 'PICK_FACE': 1, 'ZONE-B': 2, 'BULK': 2, 'ZONE-C': 3, 'BUFFER': 3, 'ZONE-PUN-01': 1, 'ZONE-NOIDA-01': 1 };
      candidateBins.sort((a, b) => {
        const pA = zonePriority[a.zone] || 5;
        const pB = zonePriority[b.zone] || 5;
        if (pA !== pB) return pA - pB;
        // Prefer bins already holding this commodity (co-location for FIFO rotation)
        const isSameA = a.commodity === wf.commodity ? 1 : 0;
        const isSameB = b.commodity === wf.commodity ? 1 : 0;
        if (isSameA !== isSameB) return isSameB - isSameA;
        // Prefer larger capacity to avoid splintering
        const availA = a.capacity - a.occupied;
        const availB = b.capacity - b.occupied;
        if (availA !== availB) return availB - availA;
        return a.code.localeCompare(b.code);
      });

      const totalAvailSpace = candidateBins.reduce((s, b) => s + Math.max(0, b.capacity - b.occupied), 0);
      const canFulfill = totalAvailSpace >= wf.totalQuantity;

      // 3. Build recommended plan
      let remaining = wf.totalQuantity;
      const recommendations = [];
      const numericIds = appState.batches.map(b => parseInt(b.id.replace(/[^\\d]/g, ''), 10)).filter(n => !isNaN(n));
      let nextNum = (numericIds.length > 0 ? Math.max(...numericIds) : 10) + 1;

      for (const cb of candidateBins) {
        if (remaining <= 0) break;
        const freeSpace = Math.max(0, cb.capacity - cb.occupied);
        const take = Math.min(remaining, freeSpace);
        const bId = `B${String(nextNum).padStart(3, '0')}`;

        const reasonParts = [
          `Zone ${cb.zone} Priority Intake Buffer (Bin ${cb.code})`,
          `Capacity available: ${freeSpace} Bags (Occupancy will become ${cb.occupied + take}/${cb.capacity})`
        ];
        if (cb.commodity === wf.commodity) {
          reasonParts.push(`Co-located with existing sound ${wf.commodity} stack for FIFO access continuity`);
        }
        if (oldestBatch) {
          reasonParts.push(`Positioned to protect FIFO queue (oldest stack Batch ${oldestBatch.id} arrived ${oldestBatch.arrivalDate})`);
        }

        recommendations.push({
          batchId: bId,
          commodity: wf.commodity,
          quantity: take,
          warehouseId: destWhId,
          zoneCode: cb.zone,
          rack: cb.rack,
          binCode: cb.code,
          receiptDate: wf.arrivalDate,
          qualityStatus: 'Pending Inspection',
          storageStatus: 'AWAITING_PUTAWAY',
          recommendationReason: reasonParts.join('. ') + '.'
        });

        remaining -= take;
        nextNum++;
      }

      // 4. Look up authorized active operator for this godown
      const assignedOp = (appState.users || []).find(u => 
        u.role === 'WAREHOUSE_ADMIN' && u.isActive &&
        (u.warehouseId === destWhId || (!u.warehouseId && destWhId === 'GDN-NGP-01'))
      );

      wf.inwardAnalysis = {
        warehouseId: destWhId,
        warehouseName: wh.name,
        commodity: wf.commodity,
        totalQuantity: wf.totalQuantity,
        totalAvailSpace: totalAvailSpace,
        canFulfill: canFulfill,
        shortage: Math.max(0, wf.totalQuantity - totalAvailSpace),
        existingCommStock: totalExistingCommStock,
        oldestBatchId: oldestBatch ? oldestBatch.id : null,
        oldestBatchDate: oldestBatch ? oldestBatch.arrivalDate : null,
        recommendations: recommendations,
        assignedOperator: assignedOp ? { id: assignedOp.id, name: assignedOp.fullName, role: assignedOp.roleTitle || 'Godown Operator' } : null,
        analyzedAt: new Date().toISOString()
      };

      // Automatically sync recommendations into allocations if in auto mode or empty
      if (canFulfill && (!wf.allocations || wf.allocations.length === 0 || wf.allocationMode === 'AUTO_SLOT')) {
        wf.allocations = recommendations.map(r => ({
          batchId: r.batchId,
          commodity: r.commodity,
          quantity: r.quantity,
          warehouseId: r.warehouseId,
          zoneCode: r.zoneCode,
          rack: r.rack,
          binCode: r.binCode,
          receiptDate: r.receiptDate,
          qualityStatus: r.qualityStatus,
          recommendationReason: r.recommendationReason
        }));
      }

      return wf.inwardAnalysis;
    }

    function renderInwardAnalysisCard() {
      const wf = appState.receiveWorkflow;
      if (!wf) return '';

      if (!wf.inwardAnalysis) {
        runAutomatedInwardAnalysis();
      }
      const an = wf.inwardAnalysis;
      if (!an) return '';

      return `
        <div class="rounded-2xl border ${an.canFulfill ? 'border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40' : 'border-rose-200 bg-rose-50/40'} p-5 space-y-4 shadow-xs animate-in fade-in duration-200">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-[#0B4DA8] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                ⚡
              </span>
              <div>
                <h4 class="font-bold text-slate-900 text-sm">Automated Inward Analysis &amp; Put-Away Recommendation</h4>
                <p class="text-[11px] text-slate-600">Deterministic storage optimization adhering to PDS Commodity Segregation &amp; FIFO Storage Placement</p>
              </div>
            </div>
            <button onclick="runAutomatedInwardAnalysis(); renderCurrentRoute();" class="px-3 py-1.5 rounded-xl border border-blue-300 hover:bg-white/80 text-[#0B4DA8] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
              <span>↻ Refresh Analysis</span>
            </button>
          </div>

          <!-- 4 Core Analysis Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <!-- 1. Godown Capacity -->
            <div class="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Available Godown Space</span>
              <div class="mt-1 flex items-baseline gap-1.5">
                <span class="text-lg font-black font-mono ${an.canFulfill ? 'text-emerald-700' : 'text-rose-700'}">${an.totalAvailSpace.toLocaleString('en-IN')}</span>
                <span class="text-[11px] text-slate-500">Bags free</span>
              </div>
              <span class="text-[10px] text-slate-500 block mt-0.5">${an.canFulfill ? '✓ Sufficient capacity' : '⚠️ Storage Overflow'}</span>
            </div>

            <!-- 2. Existing Stock & FIFO Queue -->
            <div class="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Existing ${an.commodity} Stock</span>
              <div class="mt-1 flex items-baseline gap-1.5">
                <span class="text-lg font-black font-mono text-slate-900">${an.existingCommStock.toLocaleString('en-IN')}</span>
                <span class="text-[11px] text-slate-500">Bags on hand</span>
              </div>
              <span class="text-[10px] text-blue-700 font-bold block mt-0.5 truncate" title="Oldest batch: ${an.oldestBatchId || 'None'}">
                ${an.oldestBatchDate ? `Oldest: ${an.oldestBatchId} (${an.oldestBatchDate})` : 'First intake of commodity'}
              </span>
            </div>

            <!-- 3. Compatibility & Segregation -->
            <div class="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Segregation Policy</span>
              <div class="mt-1 flex items-center gap-1.5 text-emerald-700 font-bold">
                <span>✓ Dedicated Bays</span>
              </div>
              <span class="text-[10px] text-slate-500 block mt-0.5">Strict zero cross-commodity mixing</span>
            </div>

            <!-- 4. Auto-Assigned Operator -->
            <div class="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tasked Operator</span>
              <div class="mt-1 font-bold text-slate-900 truncate">
                ${an.assignedOperator ? an.assignedOperator.name : 'Awaiting Assignment'}
              </div>
              <span class="text-[10px] text-slate-500 block mt-0.5">
                ${an.assignedOperator ? 'High Priority SLA (4h)' : 'Manager will assign'}
              </span>
            </div>
          </div>

          <!-- Recommendation Breakdown Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="px-3.5 py-2.5">Recommended Batch</th>
                  <th class="px-3.5 py-2.5">Target Bay / Bin</th>
                  <th class="px-3.5 py-2.5">Planned Quantity</th>
                  <th class="px-3.5 py-2.5">Storage Tier &amp; Recommendation Reasoning</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                ${(an.recommendations || []).map(r => `
                  <tr class="hover:bg-blue-50/40 transition-colors">
                    <td class="px-3.5 py-2.5 font-mono font-bold text-[#0B4DA8]">
                      ${r.batchId}
                    </td>
                    <td class="px-3.5 py-2.5">
                      <span class="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        ${r.binCode}
                      </span>
                      <span class="text-[11px] text-slate-400 ml-1">(${r.zoneCode} · ${r.rack})</span>
                    </td>
                    <td class="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      ${r.quantity.toLocaleString('en-IN')} Bags
                    </td>
                    <td class="px-3.5 py-2.5 text-slate-600 text-[11px] leading-relaxed">
                      ${r.recommendationReason}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Staged Notice Banner -->
          <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
            <span class="text-base shrink-0">📌</span>
            <div class="leading-relaxed">
              <strong>Planned Allocation Protocol:</strong> This plan is recorded as a staged recommendation. Destination bin capacity will not be occupied and stock will not enter the FIFO dispatch pool until the physical put-away is executed and certified by the assigned operator.
            </div>
          </div>
        </div>
      `;
    }
'''

# Find position to insert putaway logic
insert_pos = content.find("function handleConfirmConsignmentSubmission()")
if insert_pos != -1:
    content = content[:insert_pos] + putaway_logic_code + "\n\n    " + content[insert_pos:]
    print("Inserted runAutomatedInwardAnalysis and renderInwardAnalysisCard")
else:
    print("Could not find function handleConfirmConsignmentSubmission")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

