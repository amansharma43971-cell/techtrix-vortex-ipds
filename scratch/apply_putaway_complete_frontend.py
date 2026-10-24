import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert ${renderInwardAnalysisCard()} into Step 3 of renderAllocationView
step3_target = """            <!-- STEP 3: BATCH CREATION & STORAGE ALLOCATION -->
            ${wf.currentStep === 3 ? `
              <div class="space-y-5 animate-in fade-in duration-150">"""

step3_replacement = """            <!-- STEP 3: BATCH CREATION & STORAGE ALLOCATION -->
            ${wf.currentStep === 3 ? `
              <div class="space-y-5 animate-in fade-in duration-150">
                <!-- AUTOMATED INWARD ANALYSIS & RECOMMENDATION ENGINE -->
                ${renderInwardAnalysisCard()}"""

if step3_target in content:
    content = content.replace(step3_target, step3_replacement)
    print("Injected renderInwardAnalysisCard into Step 3 of renderAllocationView")
else:
    print("Could not find step3_target")

# 2. Update handleConfirmConsignmentSubmission so batches are STAGED, bin is NOT occupied, and task is created
old_confirm_submit_target = """        // Update Bin Occupancy
        const bin = (appState.bins || []).find(b => b.code === alloc.binCode);
        if (bin) {
          bin.occupied = (bin.occupied || 0) + alloc.quantity;
          if (!bin.commodity) bin.commodity = alloc.commodity;
          if (!bin.batches) bin.batches = [];
          if (!bin.batches.includes(alloc.batchId)) bin.batches.push(alloc.batchId);
        }"""

new_confirm_submit_replacement = """        // Strict Invariant: Bin occupancy is NOT updated until operator physically confirms placement (Zero Double-Counting)
        newBatch.storageStatus = 'AWAITING_PUTAWAY';
        newBatch.plannedBinCode = alloc.binCode;
        newBatch.binCode = null; // Staged at Receiving Dock until physically stored
        newBatch.availableQuantity = 0; // Not dispatch-eligible while in staged put-away

        // Look up authorized operator for this godown
        const assignedOp = (appState.users || []).find(u => 
          u.role === 'WAREHOUSE_ADMIN' && u.isActive && 
          (u.warehouseId === wf.destinationWarehouseId || (!u.warehouseId && wf.destinationWarehouseId === 'GDN-NGP-01'))
        );

        // Auto-Generate Persistent STOCK_PUTAWAY Task
        const putawayTaskId = `TSK-PUTAWAY-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        const putawayTask = {
          id: putawayTaskId,
          taskNo: putawayTaskId,
          consignmentId: wf.consignmentId,
          title: `Stock Put-Away: ${alloc.commodity} (Batch ${alloc.batchId})`,
          description: `Physically move ${alloc.quantity} Bags of ${alloc.commodity} from Receiving Dock to Bin ${alloc.binCode}. Stack safely and verify bag labels.`,
          taskType: 'STOCK_PUTAWAY',
          taskTypeTitle: 'Stock Put-Away & Storage Confirmation',
          batchId: alloc.batchId,
          commodity: alloc.commodity,
          warehouseId: wf.destinationWarehouseId,
          warehouseName: wh.name,
          assignedToId: assignedOp ? assignedOp.id : 'UNASSIGNED',
          assignedToName: assignedOp ? assignedOp.fullName : 'Awaiting Manager Assignment',
          assignedToRole: assignedOp ? (assignedOp.roleTitle || 'Godown Operator') : 'Godown Operator',
          assignedById: user ? user.id : 'u-manager-01',
          assignedByName: user ? user.fullName : 'Supervisor',
          assignedAt: nowStr,
          priority: 'HIGH',
          dueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
          isOverdue: false,
          status: assignedOp ? 'ASSIGNED' : 'PENDING_ASSIGNMENT',
          plannedBatchId: alloc.batchId,
          plannedBinCode: alloc.binCode,
          plannedQuantity: alloc.quantity,
          recommendationReason: alloc.recommendationReason || `Zone ${alloc.zoneCode} Intake Buffer (Bin ${alloc.binCode}) recommended for FIFO stack continuity.`,
          checklist: [
            { id: 'c1', label: 'Inspect bag fabric & tamper-evident seals', required: true, type: 'boolean' },
            { id: 'c2', label: 'Verify batch tag details match delivery challan', required: true, type: 'boolean' },
            { id: 'c3', label: 'Scan/Verify physical destination bin code', required: true, type: 'boolean' },
            { id: 'c4', label: 'Confirm sound stack geometry & aeration gap', required: true, type: 'boolean' }
          ],
          timeline: [
            {
              id: `tm-${Date.now()}`,
              status: assignedOp ? 'ASSIGNED' : 'PENDING_ASSIGNMENT',
              timestamp: nowStr,
              actorId: user ? user.id : 'u-manager-01',
              actorName: user ? user.fullName : 'Supervisor',
              actorRole: user ? user.role : 'MANAGER',
              comment: `Consignment ${wf.consignmentId} intake recorded. Automated put-away task created.`
            }
          ]
        };

        if (!appState.tasks) appState.tasks = [];
        appState.tasks.unshift(putawayTask);

        // Dispatch real-time in-app notification
        if (!appState.notifications) appState.notifications = [];
        if (assignedOp) {
          appState.notifications.unshift({
            id: `notif-putaway-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            recipientId: assignedOp.id,
            recipientRole: 'WAREHOUSE_ADMIN',
            type: 'TASK_ASSIGNED',
            title: `New Put-Away Task: ${alloc.commodity} (${alloc.quantity} Bags)`,
            message: `Please physically store Batch ${alloc.batchId} into Bin ${alloc.binCode}. Consignment: ${wf.consignmentId}.`,
            refId: putawayTaskId,
            timestamp: nowStr,
            isRead: false
          });
        } else {
          appState.notifications.unshift({
            id: `notif-unassigned-${Date.now()}`,
            recipientId: 'u-manager-01',
            recipientRole: 'MANAGER',
            type: 'TASK_UNASSIGNED',
            title: `Put-Away Task Requires Assignment`,
            message: `Consignment ${wf.consignmentId} received at ${wh.name}, but no active operator was found. Please assign an operator.`,
            refId: putawayTaskId,
            timestamp: nowStr,
            isRead: false
          });
        }"""

if old_confirm_submit_target in content:
    content = content.replace(old_confirm_submit_target, new_confirm_submit_replacement)
    print("Updated handleConfirmConsignmentSubmission to stage stock and auto-assign putaway task")
else:
    print("Could not find old_confirm_submit_target")

# 3. Add Operator Put-Away Confirmation handlers
putaway_modal_handlers = '''
    // =========================================================================
    // OPERATOR PHYSICAL PUT-AWAY CONFIRMATION HANDLERS
    // =========================================================================
    let activePutawayTaskId = null;

    function openConfirmPutawayModal(taskId) {
      activePutawayTaskId = taskId;
      const modal = document.getElementById('confirmPutawayModal');
      const container = document.getElementById('confirmPutawayModalContent');
      if (!modal || !container) return;

      const task = (appState.tasks || []).find(t => t.id === taskId);
      if (!task) {
        alert('Put-away task not found.');
        return;
      }

      const wh = (appState.warehouses || []).find(w => w.id === task.warehouseId) || { name: task.warehouseName };
      const whBins = (appState.bins || []).filter(b => b.warehouseId === task.warehouseId || (!b.warehouseId && task.warehouseId === 'GDN-NGP-01'));

      container.innerHTML = `
        <div class="space-y-4">
          <!-- Planned Stock Overview Card -->
          <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-[#0B4DA8] uppercase tracking-wider">Planned Staging Specification</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-[#0B4DA8]">Task #${task.taskNo}</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div>
                <span class="text-slate-400 text-[10px] block font-sans">Batch ID</span>
                <strong class="text-slate-900">${task.batchId || task.plannedBatchId}</strong>
              </div>
              <div>
                <span class="text-slate-400 text-[10px] block font-sans">Commodity</span>
                <strong class="text-slate-900 font-sans">${task.commodity}</strong>
              </div>
              <div>
                <span class="text-slate-400 text-[10px] block font-sans">Planned Quantity</span>
                <strong class="text-slate-900">${task.plannedQuantity || 0} Bags</strong>
              </div>
              <div>
                <span class="text-slate-400 text-[10px] block font-sans">Recommended Bin</span>
                <strong class="text-[#0B4DA8]">${task.plannedBinCode || 'BAY-NGP-01-BIN-01'}</strong>
              </div>
            </div>
            ${task.recommendationReason ? `
              <p class="text-[11px] text-slate-600 pt-1 border-t border-blue-100 font-sans italic">
                💡 <strong>System Reason:</strong> ${task.recommendationReason}
              </p>
            ` : ''}
          </div>

          <!-- Physical Confirmation Inputs Form -->
          <div class="space-y-4 pt-1">
            <h5 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Actual Physical Placement Verification:</h5>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Actual Quantity Stored -->
              <div>
                <label class="font-bold text-slate-700 block mb-1">
                  Actual Total Quantity Placed (Bags) *
                </label>
                <input
                  type="number"
                  id="putawayActualQty"
                  value="${task.plannedQuantity || 100}"
                  min="1"
                  max="${(task.plannedQuantity || 100) * 2}"
                  oninput="updatePutawayLiveDiff(${task.plannedQuantity || 100})"
                  class="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden text-sm"
                  required
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Physically verified bag count offloaded into storage rack.</span>
              </div>

              <!-- Actual Storage Bin -->
              <div>
                <label class="font-bold text-slate-700 block mb-1">
                  Actual Destination Bin Code *
                </label>
                <select
                  id="putawayActualBinCode"
                  onchange="updatePutawayLiveDiff(${task.plannedQuantity || 100})"
                  class="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#0B4DA8] text-sm"
                  required
                >
                  ${whBins.map(b => `
                    <option value="${b.code}" ${b.code === task.plannedBinCode ? 'selected' : ''}>
                      ${b.code} (${b.zone} · ${b.rack}) - Available: ${Math.max(0, b.capacity - b.occupied)}b
                    </option>
                  `).join('')}
                </select>
                <span class="text-[10px] text-slate-400 mt-1 block">Defaults to recommended bin. Select alternative if bay obstructed.</span>
              </div>

              <!-- Damaged Bags Discovered -->
              <div>
                <label class="font-bold text-slate-700 block mb-1">
                  Damaged / Torn Bags Discovered (Bags)
                </label>
                <input
                  type="number"
                  id="putawayDamagedCount"
                  value="0"
                  min="0"
                  max="${task.plannedQuantity || 100}"
                  oninput="updatePutawayLiveDiff(${task.plannedQuantity || 100})"
                  class="w-full p-2.5 border rounded-xl font-mono font-bold text-rose-700 bg-rose-50/30 focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-sm"
                />
                <span class="text-[10px] text-slate-400 mt-1 block">Damaged bags will be segregated automatically to the Damaged Stock register on hold.</span>
              </div>

              <!-- Discrepancy Reason -->
              <div>
                <label class="font-bold text-slate-700 block mb-1">
                  Discrepancy / Variance Classification
                </label>
                <select id="putawayDiscrepancyReason" class="w-full p-2.5 border rounded-xl text-slate-800 bg-white focus:ring-2 focus:ring-[#0B4DA8] text-xs font-semibold">
                  <option value="No Discrepancy (Exact Physical Match)" selected>No Discrepancy (Exact Physical Match)</option>
                  <option value="Physical Bay / Bin Obstructed or Damaged">Physical Bay / Bin Obstructed or Damaged</option>
                  <option value="Torn / Damaged Bags Segregated on Dock">Torn / Damaged Bags Segregated on Dock</option>
                  <option value="Shortage on Consignment Delivery Truck">Shortage on Consignment Delivery Truck</option>
                  <option value="Excess Bags on Consignment Delivery Truck">Excess Bags on Consignment Delivery Truck</option>
                  <option value="Directed to Alternative Bay by Supervisor">Directed to Alternative Bay by Supervisor</option>
                  <option value="Other Physical Constraint">Other Physical Constraint</option>
                </select>
                <span class="text-[10px] text-slate-400 mt-1 block">Required if actual quantity, location, or condition differs from plan.</span>
              </div>
            </div>

            <!-- Live Calculation & Balance Preview Banner -->
            <div id="putawayLiveBanner" class="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium space-y-1">
              <div class="flex items-center justify-between font-mono">
                <span>Sound Bags into Destination Bin:</span>
                <strong id="liveSoundBags" class="text-emerald-700 font-bold">${task.plannedQuantity || 100} Bags</strong>
              </div>
              <div class="flex items-center justify-between font-mono text-[11px] text-slate-500">
                <span>Damaged Bags Segregated (On Hold):</span>
                <strong id="liveDamagedBags" class="text-rose-600">0 Bags</strong>
              </div>
              <div class="flex items-center justify-between font-mono text-[11px] text-slate-500">
                <span>Unplaced Shortage:</span>
                <strong id="liveShortageBags" class="text-slate-700">0 Bags</strong>
              </div>
            </div>

            <!-- Operator Physical Notes -->
            <div>
              <label class="font-bold text-slate-700 block mb-1">On-Site Placement Observations &amp; Stacking Notes</label>
              <textarea
                id="putawayNotes"
                rows="2"
                placeholder="Enter physical stacking notes, bag cleanliness, dunnage placement, or bay condition..."
                class="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden"
              ></textarea>
            </div>

            <!-- Mandatory Certification Checkbox -->
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <input
                type="checkbox"
                id="putawayCertifyCheck"
                class="mt-0.5 w-4 h-4 text-[#0B4DA8] rounded border-slate-300 focus:ring-[#0B4DA8] cursor-pointer"
                required
              />
              <label for="putawayCertifyCheck" class="text-xs text-slate-700 leading-snug cursor-pointer">
                <strong>Physical Verification Certification:</strong> I hereby certify that I have physically counted, transported, and stacked this commodity batch into the specified godown bin. I confirm the actual quantities, bag condition, and location recorded above are true and complete.
              </label>
            </div>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeConfirmPutawayModal() {
      const modal = document.getElementById('confirmPutawayModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      activePutawayTaskId = null;
    }

    function updatePutawayLiveDiff(plannedQty) {
      const actualInput = document.getElementById('putawayActualQty');
      const damagedInput = document.getElementById('putawayDamagedCount');
      const soundEl = document.getElementById('liveSoundBags');
      const dmgEl = document.getElementById('liveDamagedBags');
      const shortEl = document.getElementById('liveShortageBags');
      const banner = document.getElementById('putawayLiveBanner');

      const actual = parseInt(actualInput?.value, 10) || 0;
      const damaged = parseInt(damagedInput?.value, 10) || 0;
      const sound = Math.max(0, actual - damaged);
      const shortage = Math.max(0, plannedQty - actual);

      if (soundEl) soundEl.textContent = `${sound.toLocaleString('en-IN')} Bags`;
      if (dmgEl) dmgEl.textContent = `${damaged.toLocaleString('en-IN')} Bags`;
      if (shortEl) shortEl.textContent = `${shortage.toLocaleString('en-IN')} Bags`;

      if (banner) {
        if (shortage > 0 || damaged > 0) {
          banner.className = 'p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium space-y-1 text-amber-900 animate-in fade-in';
        } else {
          banner.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium space-y-1 text-emerald-900 animate-in fade-in';
        }
      }
    }

    function handleExecutePutawayConfirmation() {
      if (!activePutawayTaskId) return;
      const task = (appState.tasks || []).find(t => t.id === activePutawayTaskId);
      if (!task) {
        alert('Put-away task not found.');
        return;
      }

      const checkEl = document.getElementById('putawayCertifyCheck');
      if (!checkEl || !checkEl.checked) {
        alert('Please review and check the Physical Verification Certification box before proceeding.');
        return;
      }

      const actualQty = parseInt(document.getElementById('putawayActualQty')?.value, 10);
      const actualBinCode = document.getElementById('putawayActualBinCode')?.value;
      const damagedCount = parseInt(document.getElementById('putawayDamagedCount')?.value, 10) || 0;
      const discrepancyReason = document.getElementById('putawayDiscrepancyReason')?.value;
      const notes = document.getElementById('putawayNotes')?.value.trim();

      if (isNaN(actualQty) || actualQty <= 0) {
        alert('Actual placed quantity must be a positive number.');
        return;
      }
      if (!actualBinCode) {
        alert('Actual destination bin code is required.');
        return;
      }
      if (damagedCount > actualQty) {
        alert('Damaged bags cannot exceed the total actual quantity.');
        return;
      }

      const btn = document.getElementById('btnExecutePutaway');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Writing Inventory &amp; Ledger...</span>';
      }

      const user = appState.currentUser || { fullName: 'Operator', roleTitle: 'Godown Operator' };
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const soundPlacedQty = actualQty - damagedCount;
      const plannedQty = task.plannedQuantity || actualQty;
      const isPartial = actualQty < plannedQty;
      const isDiscrepancy = isPartial || (actualQty > plannedQty) || (actualBinCode !== task.plannedBinCode) || (damagedCount > 0);

      // 1. Transaction-safe update: Update destination bin occupancy (sound stock only)
      const targetBin = (appState.bins || []).find(b => b.code === actualBinCode);
      if (targetBin) {
        targetBin.occupied = (targetBin.occupied || 0) + soundPlacedQty;
        targetBin.commodity = task.commodity;
        if (!targetBin.batches) targetBin.batches = [];
        if (!targetBin.batches.includes(task.batchId)) targetBin.batches.push(task.batchId);
      }

      // 2. Update Batch in inventory
      const batch = (appState.batches || []).find(b => b.id === task.batchId);
      if (batch) {
        batch.storageStatus = 'STORED';
        batch.binCode = actualBinCode;
        batch.totalQuantity = actualQty;
        batch.availableQuantity = soundPlacedQty;
        batch.damagedQuantity = damagedCount;
        batch.putawayConfirmedAt = nowStr;
        batch.putawayConfirmedBy = user.fullName;
        batch.notes = (batch.notes || '') + ` | Put-away confirmed into ${actualBinCode} by ${user.fullName}.`;
      }

      // 3. Segregate Damaged Stock if any discovered
      if (damagedCount > 0) {
        if (!appState.damagedStock) appState.damagedStock = [];
        const dmgId = `DAM-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        appState.damagedStock.unshift({
          id: dmgId,
          batchId: task.batchId,
          commodity: task.commodity,
          damagedQuantity: damagedCount,
          status: 'ON_HOLD',
          category: 'TRANSIT_DAMAGE',
          reportedBy: user.fullName,
          reportedAt: nowStr,
          reason: discrepancyReason || 'Torn / damaged bags discovered during physical intake offloading',
          warehouseId: task.warehouseId,
          warehouseName: task.warehouseName,
          binCode: actualBinCode
        });

        // Notify Manager and Quality Officer
        if (!appState.notifications) appState.notifications = [];
        appState.notifications.unshift({
          id: `notif-dmg-${Date.now()}`,
          recipientId: 'u-manager-01',
          recipientRole: 'MANAGER',
          type: 'QUALITY_HOLD',
          title: `Damaged Stock Segregated (${damagedCount} Bags)`,
          message: `Operator discovered ${damagedCount} damaged bags during put-away of Batch ${task.batchId} in ${actualBinCode}. Stock locked on hold.`,
          refId: task.batchId,
          timestamp: nowStr,
          isRead: false
        });
      }

      // 4. Update Task Status & Timeline
      task.status = isPartial ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
      task.actualQuantity = actualQty;
      task.actualBinCode = actualBinCode;
      task.damagedBagsCount = damagedCount;
      task.soundPlacedQuantity = soundPlacedQty;
      task.unplacedQuantity = Math.max(0, plannedQty - actualQty);
      task.discrepancyReason = discrepancyReason;
      task.confirmationNotes = notes;
      task.completedAt = nowStr;
      task.completedBy = user.fullName;

      if (!task.timeline) task.timeline = [];
      task.timeline.push({
        id: `tm-${Date.now()}`,
        status: task.status,
        timestamp: nowStr,
        actorId: user.id || 'u-operator-01',
        actorName: user.fullName || 'Operator',
        actorRole: user.role || 'WAREHOUSE_ADMIN',
        comment: `Physical placement certified: Stored ${soundPlacedQty} sound bags into ${actualBinCode}.` + (damagedCount > 0 ? ` (${damagedCount} damaged bags segregated on hold)` : '')
      });

      // 5. Append Stock Movement Ledger
      if (!appState.stockMovements) appState.stockMovements = [];
      const smId = `SM-${String(appState.stockMovements.length + 1).padStart(3, '0')}`;
      appState.stockMovements.unshift({
        id: smId,
        timestamp: nowStr,
        movementType: 'PUTAWAY',
        batchId: task.batchId,
        commodity: task.commodity,
        quantity: soundPlacedQty,
        fromBin: 'RECEIVING_DOCK',
        toBin: actualBinCode,
        referenceId: task.taskNo,
        performedBy: `${user.fullName} (${user.roleTitle || 'Godown Operator'})`,
        reason: `Certified physical put-away of Batch ${task.batchId} into ${actualBinCode}`
      });

      // 6. Append Audit Log
      if (!appState.auditLogs) appState.auditLogs = [];
      appState.auditLogs.unshift({
        id: `AUD-PUTAWAY-${Date.now()}`,
        action: 'STOCK_PUTAWAY_CONFIRMED',
        actorId: user.id || 'u-operator-01',
        actorName: user.fullName || 'Operator',
        actorRole: user.role || 'WAREHOUSE_ADMIN',
        warehouseId: task.warehouseId,
        warehouseName: task.warehouseName,
        targetRef: task.batchId,
        details: `Put-Away Confirmed: ${soundPlacedQty} sound Bags ${task.commodity} stored into Bin ${actualBinCode}. Damaged: ${damagedCount} Bags. Task: ${task.status}.`,
        timestamp: nowStr,
        status: 'SUCCESS'
      });

      // 7. Dispatch Manager Notification
      let notifTitle = isDiscrepancy ? 'Put-Away Discrepancy Alert' : 'Stock Put-Away Completed';
      let notifMsg = `Operator ${user.fullName} completed put-away for Batch ${task.batchId}: ${soundPlacedQty} Bags stored in ${actualBinCode}.`;
      if (isDiscrepancy) {
        notifMsg += ` (Discrepancy: ${discrepancyReason || 'Quantity/location variance'})`;
      }
      appState.notifications.unshift({
        id: `notif-mgr-putaway-${Date.now()}`,
        recipientId: 'u-manager-01',
        recipientRole: 'MANAGER',
        type: isDiscrepancy ? 'PUTAWAY_DISCREPANCY' : 'TASK_COMPLETED',
        title: notifTitle,
        message: notifMsg,
        refId: task.id,
        timestamp: nowStr,
        isRead: false
      });

      // 8. Persist & Render
      saveState();
      closeConfirmPutawayModal();
      renderCurrentRoute();
      alert(`Success! Physical stock placement for Batch ${task.batchId} certified.\n\n• Sound Bags Stored: ${soundPlacedQty} Bags in ${actualBinCode}\n• Damaged Bags Segregated: ${damagedCount} Bags\n• Task Status: ${task.status}\n\nInventory balances and stock movement ledger updated.`);
    }
'''

# Insert putaway_modal_handlers before renderOperatorTaskCenterView
insert_handlers_pos = content.find("function renderOperatorTaskCenterView()")
if insert_handlers_pos != -1:
    content = content[:insert_handlers_pos] + putaway_modal_handlers + "\n\n    " + content[insert_handlers_pos:]
    print("Inserted putaway confirmation handlers")
else:
    print("Could not find function renderOperatorTaskCenterView")

# 4. In renderOperatorTaskCenterView, add contextual buttons for STOCK_PUTAWAY
old_in_progress_actions = """                        ` : t.status === 'IN_PROGRESS' ? `
                          <div class="flex items-center gap-1.5">
                            <button
                              onclick="openReportBlockerModal('${t.id}')"
                              class="px-2.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl cursor-pointer"
                              title="Report Operational Blocker"
                            >
                              Blocker ⚠️
                            </button>
                            <button
                              onclick="openSubmitEvidenceModal('${t.id}')"
                              class="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              Submit Review →
                            </button>
                          </div>"""

new_in_progress_actions = """                        ` : t.status === 'IN_PROGRESS' ? `
                          <div class="flex items-center gap-1.5">
                            <button
                              onclick="openReportBlockerModal('${t.id}')"
                              class="px-2.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl cursor-pointer"
                              title="Report Operational Blocker"
                            >
                              Blocker ⚠️
                            </button>
                            ${t.taskType === 'STOCK_PUTAWAY' ? `
                              <button
                                onclick="openConfirmPutawayModal('${t.id}')"
                                class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                                title="Verify physical bags count and storage bin"
                              >
                                <span>Confirm Placement 📦</span>
                              </button>
                            ` : `
                              <button
                                onclick="openSubmitEvidenceModal('${t.id}')"
                                class="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                Submit Review →
                              </button>
                            `}
                          </div>
                        ` : t.status === 'PARTIALLY_COMPLETED' ? `
                          <button
                            onclick="openConfirmPutawayModal('${t.id}')"
                            class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Resume Put-away 📦</span>
                          </button>"""

if old_in_progress_actions in content:
    content = content.replace(old_in_progress_actions, new_in_progress_actions)
    print("Updated renderOperatorTaskCenterView with Confirm Placement button")
else:
    print("Could not find old_in_progress_actions")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved index.html putaway updates")

