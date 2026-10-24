# Full workflow logic and updated renderAllocationView for index.html

workflow_js = '''
    // =========================================================================
    // MULTI-STEP WAREHOUSE, BATCH & STORAGE ALLOCATION WORKFLOW ENGINE
    // =========================================================================

    function initReceiveWorkflow() {
      const user = appState.currentUser;
      const isManager = !user || user.role === 'MANAGER';
      const userWh = user ? user.warehouseId : null;
      const targetWh = (!isManager && userWh) ? userWh : (appState.selectedWarehouseScope !== 'ALL' ? appState.selectedWarehouseScope : 'GDN-NGP-01');

      const numericIds = appState.batches.map(b => parseInt(b.id.replace(/[^\\d]/g, ''), 10)).filter(n => !isNaN(n));
      const nextBatchId = `B${String((numericIds.length > 0 ? Math.max(...numericIds) : 10) + 1).padStart(3, '0')}`;

      appState.receiveWorkflow = {
        currentStep: 1,
        consignmentId: generateUniqueConsignmentId(),
        supplierName: 'FCI Depot Karnal (Central Pool)',
        challanNumber: 'CHL-INW-' + String(Math.floor(1000 + Math.random() * 9000)),
        arrivalDate: new Date().toISOString().substring(0, 10),
        arrivalTime: '10:30',
        commodity: 'Wheat',
        totalQuantity: 200,
        unit: 'Bags (50kg)',
        vehicleNumber: 'UP-16-BT-4412',
        remarks: 'Moisture 10.4%, standard sound seals verified at gate.',
        documentName: 'Challan_Weight_Slip.pdf',
        documentUploaded: true,
        destinationWarehouseId: targetWh,
        allocationMode: 'MANUAL',
        allocations: [
          {
            batchId: nextBatchId,
            commodity: 'Wheat',
            quantity: 200,
            warehouseId: targetWh,
            zoneCode: 'ZONE-B',
            rack: '02',
            binCode: 'BAY-A-RACK-02-BIN-02',
            receiptDate: new Date().toISOString().substring(0, 10),
            qualityStatus: 'Pending Inspection'
          }
        ],
        isSubmitting: false,
        lastSubmittedConsignmentId: null
      };
    }

    function generateUniqueConsignmentId() {
      const existing = (appState.consignments || []).map(c => c.consignmentId);
      let rand = Math.floor(1000 + Math.random() * 9000);
      let id = `CSG-2025-${rand}`;
      while (existing.includes(id)) {
        rand = Math.floor(1000 + Math.random() * 9000);
        id = `CSG-2025-${rand}`;
      }
      return id;
    }

    function setReceiveStep(step) {
      const wf = appState.receiveWorkflow;
      if (!wf) initReceiveWorkflow();

      // Validate Step 1 before leaving
      if (step > 1 && wf.currentStep === 1) {
        const csgId = document.getElementById('wfConsignmentId')?.value.trim();
        const supp = document.getElementById('wfSupplierName')?.value.trim();
        const chl = document.getElementById('wfChallanNumber')?.value.trim();
        const arrDate = document.getElementById('wfArrivalDate')?.value;
        const comm = document.getElementById('wfCommodity')?.value;
        const qty = parseInt(document.getElementById('wfTotalQuantity')?.value, 10);
        const unit = document.getElementById('wfUnit')?.value || 'Bags (50kg)';
        const veh = document.getElementById('wfVehicleNumber')?.value.trim();
        const remarks = document.getElementById('wfRemarks')?.value.trim();

        if (!csgId) { alert('Consignment ID is required.'); return; }
        if (!supp) { alert('Supplier/Source name is required.'); return; }
        if (!chl) { alert('Challan or delivery document number is required.'); return; }
        if (!arrDate) { alert('Arrival date is required.'); return; }
        if (isNaN(qty) || qty <= 0) { alert('Total received quantity must be a positive integer.'); return; }

        wf.consignmentId = csgId;
        wf.supplierName = supp;
        wf.challanNumber = chl;
        wf.arrivalDate = arrDate;
        wf.commodity = comm;
        wf.totalQuantity = qty;
        wf.unit = unit;
        wf.vehicleNumber = veh;
        wf.remarks = remarks;

        // Sync commodity and receipt date to allocations
        wf.allocations.forEach(a => {
          a.commodity = comm;
          a.receiptDate = arrDate;
        });
      }

      // Validate Step 2 before leaving
      if (step > 2 && wf.currentStep <= 2) {
        const whId = document.getElementById('wfDestinationWarehouse')?.value || wf.destinationWarehouseId;
        const user = appState.currentUser;
        const isManager = !user || user.role === 'MANAGER';
        if (!isManager && user && user.warehouseId && whId !== user.warehouseId) {
          alert(`Permission Denied: Your Operator account is restricted to ${user.warehouseId}.`);
          return;
        }

        const wh = (appState.warehouses || []).find(w => w.id === whId);
        if (!wh) { alert('Please select a valid destination warehouse.'); return; }
        if (!wh.isActive) { alert('Selected warehouse is currently marked inactive.'); return; }

        wf.destinationWarehouseId = whId;
        wf.allocations.forEach(a => { a.warehouseId = whId; });
      }

      // Validate Step 3 before moving to Review & Confirm
      if (step === 4) {
        const totalAllocated = wf.allocations.reduce((s, a) => s + (parseInt(a.quantity, 10) || 0), 0);
        const unallocated = wf.totalQuantity - totalAllocated;

        if (unallocated !== 0) {
          alert(`Allocation balance error: Total received is ${wf.totalQuantity} Bags, but allocated sum is ${totalAllocated} Bags. Remaining unallocated: ${unallocated} Bags. The unallocated quantity must equal exactly 0.`);
          return;
        }

        // Check duplicate batch IDs
        const seenBatches = new Set();
        for (const a of wf.allocations) {
          if (!a.batchId || !a.batchId.trim()) {
            alert('Every allocation row must have a valid Batch ID.');
            return;
          }
          if (seenBatches.has(a.batchId.toUpperCase())) {
            alert(`Duplicate Batch ID detected in allocations: '${a.batchId}'. Please ensure all batch IDs are unique.`);
            return;
          }
          seenBatches.add(a.batchId.toUpperCase());

          if (appState.batches.some(b => b.id.toUpperCase() === a.batchId.toUpperCase())) {
            alert(`Batch ID '${a.batchId}' already exists in warehouse records. Please assign a unique Batch ID.`);
            return;
          }

          if (isNaN(a.quantity) || a.quantity <= 0) {
            alert(`Batch ${a.batchId} has an invalid quantity of ${a.quantity} bags.`);
            return;
          }

          if (!a.binCode) {
            alert(`Batch ${a.batchId} must be assigned to a specific storage bin.`);
            return;
          }

          // Check bin capacity
          const bin = (appState.bins || []).find(b => b.code === a.binCode);
          if (bin) {
            const avail = Math.max(0, bin.capacity - bin.occupied);
            if (a.quantity > avail) {
              alert(`Storage capacity overflow: Bin ${bin.code} only has ${avail} bags free (Capacity ${bin.capacity}, Occupied ${bin.occupied}), but you attempted to allocate ${a.quantity} bags.`);
              return;
            }
          }
        }
      }

      wf.currentStep = step;
      renderCurrentRoute();
    }

    function updateConsignmentWeightDisplay() {
      const qtyInput = document.getElementById('wfTotalQuantity');
      const weightDisplay = document.getElementById('wfWeightSummary');
      if (!qtyInput || !weightDisplay) return;

      const qty = parseInt(qtyInput.value, 10) || 0;
      const kg = qty * 50;
      const qtl = (kg / 100).toFixed(1);
      const mt = (kg / 1000).toFixed(2);
      weightDisplay.textContent = `${kg.toLocaleString('en-IN')} Kg · ${qtl} Qtl · ${mt} MT Net`;
    }

    function handleSelectDestinationWarehouse(whId) {
      const wf = appState.receiveWorkflow;
      if (!wf) return;
      wf.destinationWarehouseId = whId;
      wf.allocations.forEach(a => {
        a.warehouseId = whId;
      });
      renderCurrentRoute();
    }

    function setAllocationMode(mode) {
      const wf = appState.receiveWorkflow;
      if (!wf) return;
      wf.allocationMode = mode;
      if (mode === 'AUTO_SLOT') {
        runAutoSlotAllocation();
      } else {
        renderCurrentRoute();
      }
    }

    function handleAddAllocationRow() {
      const wf = appState.receiveWorkflow;
      if (!wf) return;

      const totalAlloc = wf.allocations.reduce((s, a) => s + (parseInt(a.quantity, 10) || 0), 0);
      const remaining = Math.max(0, wf.totalQuantity - totalAlloc);

      const numericIds = appState.batches.map(b => parseInt(b.id.replace(/[^\\d]/g, ''), 10)).filter(n => !isNaN(n));
      const currentWfIds = wf.allocations.map(a => parseInt(a.batchId.replace(/[^\\d]/g, ''), 10)).filter(n => !isNaN(n));
      const allNums = [...numericIds, ...currentWfIds];
      const nextId = `B${String((allNums.length > 0 ? Math.max(...allNums) : 10) + 1).padStart(3, '0')}`;

      // Pick available bin in destination warehouse
      const destWh = wf.destinationWarehouseId;
      const availBin = (appState.bins || []).find(b => 
        (b.warehouseId === destWh || (!b.warehouseId && destWh === 'GDN-NGP-01')) && 
        (b.capacity - b.occupied > 0) &&
        (!b.commodity || b.commodity === wf.commodity || b.occupied === 0)
      );

      wf.allocations.push({
        batchId: nextId,
        commodity: wf.commodity,
        quantity: remaining > 0 ? remaining : 50,
        warehouseId: destWh,
        zoneCode: availBin ? availBin.zone : 'ZONE-B',
        rack: availBin ? availBin.rack : '01',
        binCode: availBin ? availBin.code : 'BAY-A-RACK-02-BIN-02',
        receiptDate: wf.arrivalDate,
        qualityStatus: 'Pending Inspection'
      });

      renderCurrentRoute();
    }

    function handleRemoveAllocationRow(idx) {
      const wf = appState.receiveWorkflow;
      if (!wf || wf.allocations.length <= 1) {
        alert('Consignment must have at least one batch allocation row.');
        return;
      }
      wf.allocations.splice(idx, 1);
      renderCurrentRoute();
    }

    function handleAllocationRowChange(idx, field, value) {
      const wf = appState.receiveWorkflow;
      if (!wf || !wf.allocations[idx]) return;

      if (field === 'quantity') {
        wf.allocations[idx].quantity = parseInt(value, 10) || 0;
      } else if (field === 'binCode') {
        wf.allocations[idx].binCode = value;
        const bin = (appState.bins || []).find(b => b.code === value);
        if (bin) {
          wf.allocations[idx].zoneCode = bin.zone;
          wf.allocations[idx].rack = bin.rack;
        }
      } else {
        wf.allocations[idx][field] = value;
      }

      updateBalanceMeter();
    }

    function handleSplitBatch(idx) {
      const wf = appState.receiveWorkflow;
      if (!wf || !wf.allocations[idx]) return;

      const orig = wf.allocations[idx];
      const curQty = orig.quantity;
      if (curQty < 2) {
        alert('Quantity too small to split.');
        return;
      }

      const half1 = Math.ceil(curQty / 2);
      const half2 = curQty - half1;
      orig.quantity = half1;

      // Find another bin
      const destWh = wf.destinationWarehouseId;
      const secondBin = (appState.bins || []).find(b => 
        b.code !== orig.binCode &&
        (b.warehouseId === destWh || (!b.warehouseId && destWh === 'GDN-NGP-01')) && 
        (b.capacity - b.occupied > 0) &&
        (!b.commodity || b.commodity === wf.commodity || b.occupied === 0)
      );

      const splitRow = {
        batchId: orig.batchId + '-B2',
        commodity: orig.commodity,
        quantity: half2,
        warehouseId: orig.warehouseId,
        zoneCode: secondBin ? secondBin.zone : orig.zoneCode,
        rack: secondBin ? secondBin.rack : orig.rack,
        binCode: secondBin ? secondBin.code : orig.binCode,
        receiptDate: orig.receiptDate,
        qualityStatus: 'Pending Inspection'
      };

      wf.allocations.splice(idx + 1, 0, splitRow);
      renderCurrentRoute();
    }

    function updateBalanceMeter() {
      const wf = appState.receiveWorkflow;
      if (!wf) return;

      const totalAlloc = wf.allocations.reduce((s, a) => s + (parseInt(a.quantity, 10) || 0), 0);
      const unallocated = wf.totalQuantity - totalAlloc;

      const meterAlloc = document.getElementById('meterAllocated');
      const meterUnalloc = document.getElementById('meterUnallocated');
      const meterStatusPill = document.getElementById('meterStatusPill');

      if (meterAlloc) meterAlloc.textContent = `${totalAlloc.toLocaleString('en-IN')} Bags`;
      if (meterUnalloc) meterUnalloc.textContent = `${unallocated.toLocaleString('en-IN')} Bags`;

      if (meterStatusPill) {
        if (unallocated === 0) {
          meterStatusPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5';
          meterStatusPill.innerHTML = '<span>✓ Fully Balanced</span>';
        } else if (unallocated > 0) {
          meterStatusPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5';
          meterStatusPill.innerHTML = `<span>⚠ ${unallocated} Bags Remaining to Assign</span>`;
        } else {
          meterStatusPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5';
          meterStatusPill.innerHTML = `<span>✕ Over-allocated by ${Math.abs(unallocated)} Bags</span>`;
        }
      }
    }

    function runAutoSlotAllocation() {
      const wf = appState.receiveWorkflow;
      if (!wf) return;

      const destWh = wf.destinationWarehouseId;
      const wh = (appState.warehouses || []).find(w => w.id === destWh);
      if (!wh) { alert('Please select a valid destination warehouse.'); return; }

      // Filter compatible bins with available space in priority order: PICK_FACE (1), BULK (2), BUFFER (3)
      const candidateBins = (appState.bins || []).filter(b => {
        const matchesWh = b.warehouseId === destWh || (!b.warehouseId && destWh === 'GDN-NGP-01');
        if (!matchesWh) return false;
        if (b.isActive === false) return false;
        if (b.commodity && b.commodity !== wf.commodity && b.occupied > 0) return false; // segregation
        const avail = Math.max(0, b.capacity - b.occupied);
        return avail > 0;
      });

      const zonePriority = { 'PICK_FACE': 1, 'BULK': 2, 'BUFFER': 3, 'QUARANTINE': 99 };
      candidateBins.sort((a, b) => {
        const pA = zonePriority[a.zone] || 5;
        const pB = zonePriority[b.zone] || 5;
        if (pA !== pB) return pA - pB;
        return (b.capacity - b.occupied) - (a.capacity - a.occupied); // larger space first
      });

      const totalAvail = candidateBins.reduce((s, b) => s + Math.max(0, b.capacity - b.occupied), 0);
      if (totalAvail < wf.totalQuantity) {
        alert(`Insufficient Compatible Capacity at ${wh.name}.\\n\\nConsignment Request: ${wf.totalQuantity} Bags\\nAvailable Compatible Space: ${totalAvail} Bags across ${candidateBins.length} bins.\\nShortage: ${wf.totalQuantity - totalAvail} Bags.\\n\\nPlease reduce consignment quantity or configure additional bins in Warehouse Management.`);
        return;
      }

      // Greedily allocate across bins
      let remaining = wf.totalQuantity;
      const newAllocations = [];
      const numericIds = appState.batches.map(b => parseInt(b.id.replace(/[^\\d]/g, ''), 10)).filter(n => !isNaN(n));
      let nextNum = (numericIds.length > 0 ? Math.max(...numericIds) : 10) + 1;

      for (const cb of candidateBins) {
        if (remaining <= 0) break;
        const freeSpace = Math.max(0, cb.capacity - cb.occupied);
        const take = Math.min(remaining, freeSpace);
        const bId = `B${String(nextNum).padStart(3, '0')}`;

        newAllocations.push({
          batchId: bId,
          commodity: wf.commodity,
          quantity: take,
          warehouseId: destWh,
          zoneCode: cb.zone,
          rack: cb.rack,
          binCode: cb.code,
          receiptDate: wf.arrivalDate,
          qualityStatus: 'Pending Inspection'
        });

        remaining -= take;
        nextNum++;
      }

      wf.allocations = newAllocations;
      wf.allocationMode = 'AUTO_SLOT';
      showToast(`⚡ Auto-Slot Engine: Recommended ${newAllocations.length} storage bin allocations based on velocity and capacity!`);
      renderCurrentRoute();
    }

    function handleConfirmConsignmentSubmission() {
      const wf = appState.receiveWorkflow;
      if (!wf) return;
      if (wf.isSubmitting) return;

      const user = appState.currentUser;
      const isManager = !user || user.role === 'MANAGER';
      if (!isManager && user && user.warehouseId && wf.destinationWarehouseId !== user.warehouseId) {
        alert('Permission Denied: You cannot allocate consignments to another warehouse.');
        return;
      }

      // Final validation
      const totalAlloc = wf.allocations.reduce((s, a) => s + (parseInt(a.quantity, 10) || 0), 0);
      if (totalAlloc !== wf.totalQuantity) {
        alert(`Allocation mismatch: Total is ${wf.totalQuantity}, but allocations sum to ${totalAlloc}.`);
        return;
      }

      // Prevent duplicate submission
      wf.isSubmitting = true;
      const submitBtn = document.getElementById('btnConfirmIntake');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ Committing Intake Transaction...</span>';
      }

      const receiptVoucherId = `RCV-${new Date().toISOString().substring(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const wh = (appState.warehouses || []).find(w => w.id === wf.destinationWarehouseId) || { name: 'Central Food Godown, Nagpur' };

      // 1. Create Batches (Strictly Pending Inspection - NOT FIFO eligible yet)
      const createdBatches = [];
      wf.allocations.forEach(alloc => {
        const newBatch = {
          id: alloc.batchId,
          consignmentId: wf.consignmentId,
          receiptVoucherId: receiptVoucherId,
          commodity: alloc.commodity,
          arrivalDate: wf.arrivalDate,
          totalQuantity: alloc.quantity,
          availableQuantity: alloc.quantity,
          qualityStatus: 'Pending Inspection', // Strict requirement: Not approved automatically
          supplier: wf.supplierName,
          receiptNo: wf.challanNumber,
          warehouseId: wf.destinationWarehouseId,
          warehouse: wh.name,
          storageSection: `${alloc.zoneCode} · ${alloc.rack}`,
          binCode: alloc.binCode,
          vehicleNo: wf.vehicleNumber,
          qrToken: `BHANDARSETU:BATCH:${alloc.batchId}:BIN:${alloc.binCode}:QTY:${alloc.quantity}`,
          notes: `Consignment ${wf.consignmentId} receipt via ${wf.vehicleNumber || 'truck'}. Awaiting quality assaying.`
        };
        appState.batches.unshift(newBatch);
        createdBatches.push(newBatch);

        // Update Bin Occupancy
        const bin = (appState.bins || []).find(b => b.code === alloc.binCode);
        if (bin) {
          bin.occupied = (bin.occupied || 0) + alloc.quantity;
          if (!bin.commodity) bin.commodity = alloc.commodity;
          if (!bin.batches) bin.batches = [];
          if (!bin.batches.includes(alloc.batchId)) bin.batches.push(alloc.batchId);
        }

        // Ledger Movement
        if (!appState.stockMovements) appState.stockMovements = [];
        const smId = `SM-${String(appState.stockMovements.length + 1).padStart(3, '0')}`;
        appState.stockMovements.unshift({
          id: smId,
          timestamp: nowStr,
          movementType: 'RECEIPT',
          batchId: alloc.batchId,
          commodity: alloc.commodity,
          quantity: alloc.quantity,
          fromBin: 'GATE-01',
          toBin: alloc.binCode,
          referenceId: wf.challanNumber,
          performedBy: `${user ? user.fullName : 'Operator'} (${user ? user.roleTitle : 'Godown Operator'})`,
          reason: `Consignment ${wf.consignmentId} arrival intake into ${alloc.binCode}`
        });

        // Audit Trail
        if (!appState.auditLogs) appState.auditLogs = [];
        appState.auditLogs.unshift({
          id: `AUD-INW-${Date.now()}-${alloc.batchId}`,
          action: 'STOCK_CONSIGNMENT_RECEIVED',
          actorId: user ? user.id : 'u-operator-01',
          actorName: user ? user.fullName : 'Operator',
          actorRole: user ? user.role : 'WAREHOUSE_ADMIN',
          warehouseId: wf.destinationWarehouseId,
          warehouseName: wh.name,
          targetRef: alloc.batchId,
          details: `Consignment ${wf.consignmentId}: Received ${alloc.quantity} Bags ${alloc.commodity} into Bin ${alloc.binCode} (Challan: ${wf.challanNumber}). Status: Pending Inspection.`,
          timestamp: nowStr,
          status: 'SUCCESS'
        });
      });

      // 2. Persist Consignment Record
      if (!appState.consignments) appState.consignments = [];
      const consignmentRecord = {
        consignmentId: wf.consignmentId,
        receiptVoucherId: receiptVoucherId,
        supplierName: wf.supplierName,
        challanNumber: wf.challanNumber,
        arrivalDate: wf.arrivalDate,
        arrivalTime: wf.arrivalTime,
        commodity: wf.commodity,
        totalQuantity: wf.totalQuantity,
        unit: wf.unit,
        vehicleNumber: wf.vehicleNumber,
        remarks: wf.remarks,
        destinationWarehouseId: wf.destinationWarehouseId,
        destinationWarehouseName: wh.name,
        allocationMode: wf.allocationMode,
        receivedById: user ? user.id : 'u-operator-01',
        receivedByName: user ? user.fullName : 'Operator',
        receivedAt: nowStr,
        batches: wf.allocations.map(a => ({ ...a })),
        status: 'STORED_AWAITING_INSPECTION'
      };
      appState.consignments.unshift(consignmentRecord);

      // 3. Alert Dispatch for Quality Officer
      if (!appState.alerts) appState.alerts = [];
      appState.alerts.unshift({
        id: `alt-${Date.now()}`,
        type: 'blue',
        title: `Consignment ${wf.consignmentId} received: ${wf.totalQuantity} Bags ${wf.commodity} awaiting Quality Assaying`,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        batchId: createdBatches[0].id,
        isRead: false
      });

      wf.lastSubmittedConsignmentId = wf.consignmentId;
      wf.isSubmitting = false;

      saveState();
      showToast(`✓ Consignment ${wf.consignmentId} received and allocated successfully across ${createdBatches.length} bins!`);

      // Open voucher modal
      openConsignmentVoucherModal(wf.consignmentId);
      renderCurrentRoute();
    }

    function openConsignmentVoucherModal(csgId) {
      const modal = document.getElementById('consignmentVoucherModal');
      const content = document.getElementById('consignmentVoucherContent');
      if (!modal || !content) return;

      const csg = (appState.consignments || []).find(c => c.consignmentId === csgId) || appState.consignments[0];
      if (!csg) return;

      content.innerHTML = `
        <!-- Printable Voucher Card -->
        <div class="p-6 rounded-2xl bg-white border border-slate-300 shadow-xs space-y-5" id="printableVoucherSlip">
          <!-- Header -->
          <div class="flex items-start justify-between border-b pb-4 border-slate-200">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-[#0B4DA8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Form PDS-01</span>
                <span class="text-xs text-slate-400 font-mono">iPDS Electronic Gate Receipt</span>
              </div>
              <h2 class="text-lg font-black text-slate-900 mt-1">Consignment Intake &amp; Storage Voucher</h2>
              <p class="text-xs text-slate-500">${csg.destinationWarehouseName} (${csg.destinationWarehouseId})</p>
            </div>
            <div class="text-right font-mono">
              <span class="text-xs font-bold text-slate-400 block">Voucher Reference:</span>
              <strong class="text-sm font-black text-slate-900 text-[#0B4DA8]">${csg.receiptVoucherId}</strong>
              <span class="text-[10px] text-slate-400 block mt-0.5">${csg.receivedAt}</span>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase block">Consignment ID</span>
              <strong class="font-mono text-slate-900 font-bold">${csg.consignmentId}</strong>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase block">Supplier / Pool</span>
              <span class="text-slate-800 font-medium truncate block">${csg.supplierName}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase block">Challan / Bill No</span>
              <span class="font-mono text-slate-800 font-bold block">${csg.challanNumber}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 font-semibold uppercase block">Transport Vehicle</span>
              <span class="font-mono text-slate-800 font-bold block">${csg.vehicleNumber || 'Gate Verified'}</span>
            </div>
          </div>

          <!-- Commodity & Net Weight -->
          <div class="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">🌾</span>
              <div>
                <strong class="text-slate-900 block font-bold text-sm">${csg.commodity}</strong>
                <span class="text-[11px] text-slate-500">${csg.totalQuantity} Bags · Net ${(csg.totalQuantity * 0.05).toFixed(2)} MT (Standard 50kg)</span>
              </div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                ⏳ Awaiting Quality Assaying
              </span>
            </div>
          </div>

          <!-- Allocated Storage Batches Table -->
          <div>
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Allocated Batch Storage Breakdown:</h4>
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th class="p-2.5 font-bold">Batch ID</th>
                    <th class="p-2.5 font-bold">Allocated Bags</th>
                    <th class="p-2.5 font-bold">Zone / Rack</th>
                    <th class="p-2.5 font-bold">Storage Bin Code</th>
                    <th class="p-2.5 font-bold">Quality State</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${csg.batches.map(b => `
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-2.5 font-mono font-bold text-slate-900">${b.batchId}</td>
                      <td class="p-2.5 font-mono font-bold text-blue-700">${b.quantity} Bags</td>
                      <td class="p-2.5 text-slate-600">${b.zoneCode} · ${b.rack}</td>
                      <td class="p-2.5 font-mono font-bold text-slate-800">${b.binCode}</td>
                      <td class="p-2.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Pending Inspection
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Electronic QR & Signatures -->
          <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white font-mono text-[9px] p-1 text-center shadow-xs">
                [QR TOKEN]
              </div>
              <div class="text-[11px] text-slate-500">
                <span class="font-bold text-slate-700 block">Digitally Signed &amp; Timestamped</span>
                <span class="font-mono text-[10px]">Received by: ${csg.receivedByName}</span>
                <span class="block text-[10px] text-slate-400 font-mono">Consignment Ref: ${csg.consignmentId}</span>
              </div>
            </div>
            <div class="text-right text-[11px] text-slate-400 font-mono">
              <p>BhandarSetu iPDS Allocation System</p>
              <p>Depot Code: ${csg.destinationWarehouseId}</p>
            </div>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeConsignmentVoucherModal() {
      const modal = document.getElementById('consignmentVoucherModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function printCurrentConsignmentVoucher() {
      const el = document.getElementById('printableVoucherSlip');
      if (!el) return;
      const win = window.open('', '_blank', 'width=800,height=700');
      win.document.write(`
        <html>
          <head>
            <title>Consignment Intake Voucher</title>
            <script src="https://cdn.tailwindcss.com"><\/script>
          </head>
          <body class="p-8 bg-white font-sans text-slate-900" onload="window.print()">
            ${el.outerHTML}
          </body>
        </html>
      `);
      win.document.close();
    }

    function exportConsignmentsCsv() {
      const consignments = appState.consignments || [];
      if (consignments.length === 0) {
        alert('No consignments available for export.');
        return;
      }

      let csv = 'Consignment ID,Voucher Ref,Supplier,Challan No,Arrival Date,Commodity,Total Quantity Bags,Warehouse ID,Warehouse Name,Received By,Timestamp,Batches\\n';
      consignments.forEach(c => {
        const batchStr = (c.batches || []).map(b => `${b.batchId}:${b.quantity}b@${b.binCode}`).join(';');
        csv += `"${c.consignmentId}","${c.receiptVoucherId}","${c.supplierName}","${c.challanNumber}","${c.arrivalDate}","${c.commodity}",${c.totalQuantity},"${c.destinationWarehouseId}","${c.destinationWarehouseName}","${c.receivedByName}","${c.receivedAt}","${batchStr}"\\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `bhandarsetu_consignments_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Consignments ledger exported as CSV successfully.');
    }

    // =========================================================================
    // WAREHOUSE & STORAGE CONFIGURATION MANAGEMENT (MANAGER-ONLY)
    // =========================================================================

    function openWarehouseConfigModal() {
      const user = appState.currentUser;
      if (user && user.role !== 'MANAGER') {
        alert('Access Denied: Warehouse & Storage Configuration is restricted to Managers.');
        return;
      }

      const modal = document.getElementById('warehouseConfigModal');
      if (!modal) return;
      renderWarehouseConfigModal();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeWarehouseConfigModal() {
      const modal = document.getElementById('warehouseConfigModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function renderWarehouseConfigModal() {
      const content = document.getElementById('warehouseConfigModalContent');
      if (!content) return;

      const warehouses = appState.warehouses || [];

      content.innerHTML = `
        <div class="space-y-6">
          <!-- Top Description & Add Warehouse Button -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h4 class="text-sm font-bold text-slate-900">Configured Warehouses &amp; Physical Godowns</h4>
              <p class="text-xs text-slate-500">Configure depot nodes, zones, storage bins, capacities, and commodity storage rules.</p>
            </div>
            <button onclick="document.getElementById('addWarehouseFormContainer').classList.toggle('hidden')" class="px-3.5 py-1.5 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span>+ Add New Godown Node</span>
            </button>
          </div>

          <!-- Add Warehouse Form (Collapsible) -->
          <div id="addWarehouseFormContainer" class="hidden p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <h5 class="text-xs font-bold text-slate-800 uppercase">New Warehouse Node Details</h5>
            <form onsubmit="handleSaveNewWarehouse(event)" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">Godown Code *</label>
                  <input type="text" id="newWhCode" placeholder="e.g. GDN-KRN-03" class="w-full p-2 border rounded-lg bg-white font-mono font-bold uppercase" required />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">Godown Name *</label>
                  <input type="text" id="newWhName" placeholder="e.g. Karnal Central Buffer Godown" class="w-full p-2 border rounded-lg bg-white" required />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">District *</label>
                  <input type="text" id="newWhDistrict" placeholder="e.g. Karnal" class="w-full p-2 border rounded-lg bg-white" required />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">State *</label>
                  <input type="text" id="newWhState" placeholder="e.g. Haryana" class="w-full p-2 border rounded-lg bg-white" required />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">Capacity (MT) *</label>
                  <input type="number" id="newWhCapacity" value="5000" min="100" class="w-full p-2 border rounded-lg bg-white font-mono font-bold" required />
                </div>
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="document.getElementById('addWarehouseFormContainer').classList.add('hidden')" class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">Cancel</button>
                <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold shadow-xs">Save Warehouse Node</button>
              </div>
            </form>
          </div>

          <!-- Warehouses List Accordion -->
          <div class="space-y-4">
            ${warehouses.map(wh => {
              const whBins = (appState.bins || []).filter(b => b.warehouseId === wh.id || (!b.warehouseId && wh.id === 'GDN-NGP-01'));
              const totalCap = whBins.reduce((s, b) => s + (b.capacity || 0), 0);
              const totalOcc = whBins.reduce((s, b) => s + (b.occupied || 0), 0);
              const pct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

              return `
                <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div class="flex items-center gap-2.5">
                      <span class="w-7 h-7 rounded-lg bg-blue-100 text-[#0B4DA8] font-black text-xs flex items-center justify-center font-mono">${wh.code.slice(-2)}</span>
                      <div>
                        <h4 class="text-sm font-bold text-slate-900">${wh.name}</h4>
                        <p class="text-[11px] text-slate-500">${wh.district}, ${wh.state} · Code: <span class="font-mono font-bold text-[#0B4DA8]">${wh.code}</span> · Stated Limit: ${wh.capacityMT} MT</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${wh.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${wh.isActive ? 'Active Node' : 'Inactive'}
                      </span>
                      <button onclick="document.getElementById('addBinContainer_${wh.id}').classList.toggle('hidden')" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer">
                        + Add Bin
                      </button>
                    </div>
                  </div>

                  <!-- Warehouse Occupancy Bar -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span class="text-slate-400 block text-[10px]">Total Bins:</span>
                      <strong class="font-mono text-slate-900">${whBins.length} Bins</strong>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Configured Capacity:</span>
                      <strong class="font-mono text-slate-900">${totalCap.toLocaleString('en-IN')} Bags (${(totalCap * 0.05).toFixed(1)} MT)</strong>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Current Occupancy:</span>
                      <strong class="font-mono text-blue-700">${totalOcc.toLocaleString('en-IN')} Bags (${pct}%)</strong>
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px]">Available Space:</span>
                      <strong class="font-mono text-emerald-700">${Math.max(0, totalCap - totalOcc).toLocaleString('en-IN')} Bags</strong>
                    </div>
                  </div>

                  <!-- Add Bin Form (Collapsible) -->
                  <div id="addBinContainer_${wh.id}" class="hidden p-3 rounded-lg bg-amber-50/50 border border-amber-200 space-y-2">
                    <h6 class="text-[11px] font-bold text-amber-900 uppercase">Add Physical Storage Bin to ${wh.code}</h6>
                    <form onsubmit="handleSaveNewBin(event, '${wh.id}')" class="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                      <div>
                        <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Bin Code *</label>
                        <input type="text" id="binCode_${wh.id}" placeholder="e.g. BAY-D-BIN-01" class="w-full p-1.5 border rounded bg-white font-mono uppercase font-bold text-xs" required />
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Bay *</label>
                        <input type="text" id="binBay_${wh.id}" placeholder="A" class="w-full p-1.5 border rounded bg-white text-xs" required />
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Rack *</label>
                        <input type="text" id="binRack_${wh.id}" placeholder="01" class="w-full p-1.5 border rounded bg-white text-xs" required />
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Zone Type *</label>
                        <select id="binZone_${wh.id}" class="w-full p-1.5 border rounded bg-white text-xs">
                          <option value="PICK_FACE">PICK_FACE</option>
                          <option value="BULK" selected>BULK</option>
                          <option value="BUFFER">BUFFER</option>
                          <option value="QUARANTINE">QUARANTINE</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Capacity (Bags) *</label>
                        <input type="number" id="binCap_${wh.id}" value="400" min="50" class="w-full p-1.5 border rounded bg-white font-mono font-bold text-xs" required />
                      </div>
                      <div class="flex items-end">
                        <button type="submit" class="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs">Add Bin</button>
                      </div>
                    </form>
                  </div>

                  <!-- Bins Table -->
                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                        <tr>
                          <th class="p-2 font-bold">Bin Code</th>
                          <th class="p-2 font-bold">Zone</th>
                          <th class="p-2 font-bold">Bay / Rack</th>
                          <th class="p-2 font-bold">Capacity</th>
                          <th class="p-2 font-bold">Occupied</th>
                          <th class="p-2 font-bold">Free</th>
                          <th class="p-2 font-bold">Status</th>
                          <th class="p-2 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        ${whBins.map(b => {
                          const free = Math.max(0, b.capacity - (b.occupied || 0));
                          return `
                            <tr class="hover:bg-slate-50/50">
                              <td class="p-2 font-mono font-bold text-slate-900">${b.code}</td>
                              <td class="p-2 font-mono text-[10px]">${b.zone}</td>
                              <td class="p-2 text-slate-600">${b.bay || 'A'} / ${b.rack || '01'}</td>
                              <td class="p-2 font-mono">${b.capacity}b</td>
                              <td class="p-2 font-mono font-bold text-blue-700">${b.occupied || 0}b</td>
                              <td class="p-2 font-mono font-bold ${free > 0 ? 'text-emerald-700' : 'text-slate-400'}">${free}b</td>
                              <td class="p-2">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${b.isActive !== false ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                                  ${b.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td class="p-2 text-right">
                                <button onclick="handleToggleBinActive('${wh.id}', '${b.code}')" class="text-[10px] text-slate-600 hover:text-[#0B4DA8] font-bold underline cursor-pointer">
                                  ${b.isActive !== false ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    function handleSaveNewWarehouse(e) {
      e.preventDefault();
      const code = document.getElementById('newWhCode').value.trim().toUpperCase();
      const name = document.getElementById('newWhName').value.trim();
      const dist = document.getElementById('newWhDistrict').value.trim();
      const st = document.getElementById('newWhState').value.trim();
      const cap = parseFloat(document.getElementById('newWhCapacity').value) || 5000;

      if (!code || !name) { alert('Code and Name are required.'); return; }
      if ((appState.warehouses || []).some(w => w.code === code)) {
        alert(`Warehouse code ${code} already exists.`);
        return;
      }

      if (!appState.warehouses) appState.warehouses = [];
      const newWh = {
        id: code,
        code: code,
        name: name,
        district: dist,
        state: st,
        capacityMT: cap,
        isActive: true,
        compatibleCommodities: ['Wheat', 'Rice', 'Sugar', 'Pulses'],
        zones: [
          { code: 'ZONE-A', name: 'Main Intake Bay', type: 'BULK' },
          { code: 'ZONE-Q', name: 'Quarantine Holding', type: 'QUARANTINE' }
        ]
      };
      appState.warehouses.push(newWh);

      // Add default bin
      if (!appState.bins) appState.bins = [];
      appState.bins.push({
        code: `${code}-BAY-01-BIN-01`,
        bay: '01',
        rack: '01',
        bin: '01',
        zone: 'BULK',
        commodity: 'Wheat',
        capacity: 400,
        occupied: 0,
        batches: [],
        pickSequence: 10,
        warehouseId: code,
        isActive: true
      });

      saveState();
      showToast(`Warehouse node ${name} (${code}) configured successfully!`);
      renderWarehouseConfigModal();
      renderCurrentRoute();
    }

    function handleSaveNewBin(e, whId) {
      e.preventDefault();
      const code = document.getElementById(`binCode_${whId}`).value.trim().toUpperCase();
      const bay = document.getElementById(`binBay_${whId}`).value.trim().toUpperCase();
      const rack = document.getElementById(`binRack_${whId}`).value.trim();
      const zone = document.getElementById(`binZone_${whId}`).value;
      const cap = parseInt(document.getElementById(`binCap_${whId}`).value, 10) || 400;

      if (!code) { alert('Bin code is required.'); return; }
      if ((appState.bins || []).some(b => b.code === code)) {
        alert(`Bin code ${code} already exists.`);
        return;
      }

      appState.bins.push({
        code: code,
        bay: bay || 'A',
        rack: rack || '01',
        bin: '01',
        zone: zone || 'BULK',
        commodity: null,
        capacity: cap,
        occupied: 0,
        batches: [],
        pickSequence: 50,
        warehouseId: whId,
        isActive: true
      });

      saveState();
      showToast(`Storage Bin ${code} added to ${whId}!`);
      renderWarehouseConfigModal();
      renderCurrentRoute();
    }

    function handleToggleBinActive(whId, binCode) {
      const bin = (appState.bins || []).find(b => b.code === binCode);
      if (!bin) return;
      bin.isActive = bin.isActive === false ? true : false;
      saveState();
      renderWarehouseConfigModal();
      renderCurrentRoute();
    }
'''

with open('/tmp/workflow_js.js', 'w', encoding='utf-8') as f:
    f.write(workflow_js)

print("Workflow JS written to /tmp/workflow_js.js")
