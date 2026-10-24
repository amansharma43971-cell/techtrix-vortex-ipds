# Script to generate renderAllocationView and inject into index.html

allocation_view_code = '''
    function renderAllocationView() {
      const user = appState.currentUser;
      const isManager = !user || user.role === 'MANAGER';
      const userWh = user ? user.warehouseId : null;

      if (!appState.receiveWorkflow) {
        initReceiveWorkflow();
      }
      const wf = appState.receiveWorkflow;

      // Telemetry Counts
      const totalConsignments = (appState.consignments || []).length;
      const totalReceivedBags = (appState.consignments || []).reduce((s, c) => s + (c.totalQuantity || 0), 0);

      const pendingAllocList = appState.batches.filter(b => b.qualityStatus === 'Pending Allocation' || (!b.binCode && b.qualityStatus !== 'Exhausted'));
      const countPendingAlloc = pendingAllocList.length;
      const pendingAllocBags = pendingAllocList.reduce((s, b) => s + (b.totalQuantity || b.availableQuantity || 0), 0);

      const pendingInspList = appState.batches.filter(b => b.qualityStatus === 'Pending Inspection');
      const countPendingInsp = pendingInspList.length;
      const pendingInspBags = pendingInspList.reduce((s, b) => s + (b.totalQuantity || b.availableQuantity || 0), 0);

      const eligibleList = appState.batches.filter(b => (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') && b.availableQuantity > 0)
        .sort((a, b) => parseDateDMY(a.arrivalDate) - parseDateDMY(b.arrivalDate));
      const countEligible = eligibleList.length;
      const eligibleBags = eligibleList.reduce((s, b) => s + b.availableQuantity, 0);

      // Selected destination warehouse telemetry
      const destWhId = wf.destinationWarehouseId || 'GDN-NGP-01';
      const destWh = (appState.warehouses || []).find(w => w.id === destWhId) || (appState.warehouses || [])[0] || {
        id: 'GDN-NGP-01', code: 'GDN-NGP-01', name: 'Central Food Godown, Nagpur (Surajpur Depot)', capacityMT: 5000, isActive: true
      };

      const whBins = (appState.bins || []).filter(b => b.warehouseId === destWh.id || (!b.warehouseId && destWh.id === 'GDN-NGP-01'));
      const totalGodownCapacity = whBins.reduce((s, b) => s + (b.capacity || 0), 0);
      const totalGodownOccupied = whBins.reduce((s, b) => s + (b.occupied || 0), 0);
      const godownAvailable = Math.max(0, totalGodownCapacity - totalGodownOccupied);
      const godownOccupancyPct = totalGodownCapacity > 0 ? Math.round((totalGodownOccupied / totalGodownCapacity) * 100) : 0;

      // Balance Meter Calculations
      const totalAllocated = (wf.allocations || []).reduce((s, a) => s + (parseInt(a.quantity, 10) || 0), 0);
      const unallocated = wf.totalQuantity - totalAllocated;

      // Filter settings for bottom tables
      const activeFilter = appState.allocationStepFilter || 'ALL';

      return `
        <div data-page="stock-allocation" class="space-y-6 max-w-[1536px] mx-auto pb-16">
          
          <!-- TOP HERO HEADER -->
          ${renderPageHeader({
            breadcrumbGroup: 'Godown Operations',
            title: 'Stock Inward & Storage Allocation Engine',
            subtitle: 'Higher-level Warehouse, Batch & Storage Allocation workflow with intelligent slotting and multi-batch distribution.',
            badge: 'PDS Allocation Protocol v2.5',
            badgeColor: 'blue',
            actions: `
              <a href="#consignmentWizardAnchor" class="px-3.5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Receive New Consignment</span>
              </a>
              ${isManager ? `
                <button onclick="openWarehouseConfigModal()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer" title="Configure Warehouses, Zones, and Bins">
                  <span>🏢 Warehouse Configuration</span>
                </button>
              ` : ''}
              <button onclick="exportConsignmentsCsv()" class="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export Consignments CSV</span>
              </button>
            `
          })}

          <!-- 5 KEY PERFORMANCE TELEMETRY CARDS -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <!-- 1. Total Consignments -->
            <div class="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-2xs hover:shadow-xs transition-all">
              <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>1. Consignments Intake</span>
                <span class="w-5 h-5 rounded-full bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold text-[10px]">1</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-slate-900 font-mono">${totalConsignments}</span>
                <span class="text-xs text-slate-500">Intakes</span>
              </div>
              <div class="text-[11px] text-slate-500 mt-1 font-mono">${totalReceivedBags.toLocaleString('en-IN')} Bags Received</div>
            </div>

            <!-- 2. Awaiting Bin -->
            <div class="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-2xs hover:shadow-xs transition-all ${countPendingAlloc > 0 ? 'ring-2 ring-amber-200 bg-amber-50/20' : ''}">
              <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>2. Awaiting Location</span>
                <span class="w-5 h-5 rounded-full ${countPendingAlloc > 0 ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-bold text-[10px]">2</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black ${countPendingAlloc > 0 ? 'text-amber-700' : 'text-slate-900'} font-mono">${countPendingAlloc}</span>
                <span class="text-xs text-slate-500">Batches</span>
              </div>
              <div class="text-[11px] ${countPendingAlloc > 0 ? 'text-amber-700 font-bold' : 'text-slate-500'} mt-1 font-mono">${pendingAllocBags.toLocaleString('en-IN')} Bags to Slot</div>
            </div>

            <!-- 3. Quality Lab Assay -->
            <div class="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-2xs hover:shadow-xs transition-all ${countPendingInsp > 0 ? 'ring-2 ring-purple-200 bg-purple-50/20' : ''}">
              <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>3. In Quality Lab</span>
                <span class="w-5 h-5 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-[10px]">3</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-purple-900 font-mono">${countPendingInsp}</span>
                <span class="text-xs text-slate-500">Batches</span>
              </div>
              <div class="text-[11px] text-purple-700 font-bold mt-1 font-mono">${pendingInspBags.toLocaleString('en-IN')} Bags Under Assay</div>
            </div>

            <!-- 4. FIFO Active Cleared -->
            <div class="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-2xs hover:shadow-xs transition-all">
              <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>4. FIFO Released</span>
                <span class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px]">4</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-emerald-800 font-mono">${countEligible}</span>
                <span class="text-xs text-slate-500">Lots</span>
              </div>
              <div class="text-[11px] text-emerald-700 font-semibold mt-1 font-mono">${eligibleBags.toLocaleString('en-IN')} Bags Dispatch-Ready</div>
            </div>

            <!-- 5. Godown Utilization -->
            <div class="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-2xs hover:shadow-xs transition-all col-span-2 sm:col-span-1">
              <div class="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Storage Utilization</span>
                <span class="text-[10px] font-mono text-[#0B4DA8] font-bold">${destWh.code}</span>
              </div>
              <div class="mt-2 flex items-baseline gap-1">
                <span class="text-2xl font-black text-slate-900 font-mono">${godownOccupancyPct}%</span>
                <span class="text-[11px] text-slate-500">utilized</span>
              </div>
              <div class="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div class="h-full rounded-full ${godownOccupancyPct > 85 ? 'bg-amber-500' : 'bg-blue-600'}" style="width: ${godownOccupancyPct}%"></div>
              </div>
            </div>
          </div>

          <!-- ======================================================== -->
          <!-- MULTI-STEP CONSIGNMENT RECEIVING & STORAGE WIZARD        -->
          <!-- ======================================================== -->
          <div id="consignmentWizardAnchor" class="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-md space-y-6">
            
            <!-- Wizard Stepper Progression Bar -->
            <div class="pb-4 border-b border-slate-200">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Warehouse, Batch &amp; Storage Allocation Workflow</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      wf.currentStep === 1 ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                      wf.currentStep === 2 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      wf.currentStep === 3 ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                      'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }">Step ${wf.currentStep} of 4</span>
                  </h3>
                  <p class="text-xs text-slate-500">Assign destination warehouse, partition multi-batch quantities, and specify exact zone, rack, and bin storage locations.</p>
                </div>

                <div class="flex items-center gap-2">
                  <button type="button" onclick="initReceiveWorkflow();renderCurrentRoute();" class="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <span>↺ Reset Form</span>
                  </button>
                  <span class="text-xs text-slate-400 font-mono">Consignment Ref: <strong class="text-slate-800">${wf.consignmentId}</strong></span>
                </div>
              </div>

              <!-- 4-Step Visual Track -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <!-- Step 1 Tab -->
                <button type="button" onclick="setReceiveStep(1)" class="p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wf.currentStep === 1 ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-blue-300 shadow-2xs' : 
                  (wf.currentStep > 1 ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                }">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold flex items-center gap-1.5">
                      <span class="w-5 h-5 rounded-full ${wf.currentStep > 1 ? 'bg-emerald-600 text-white' : (wf.currentStep === 1 ? 'bg-[#0B4DA8] text-white' : 'bg-slate-200 text-slate-700')} flex items-center justify-center font-mono text-[10px]">
                        ${wf.currentStep > 1 ? '✓' : '1'}
                      </span>
                      <span>1. Consignment</span>
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-500 mt-1 block truncate">Supplier, challan &amp; volume</span>
                </button>

                <!-- Step 2 Tab -->
                <button type="button" onclick="setReceiveStep(2)" class="p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wf.currentStep === 2 ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-blue-300 shadow-2xs' : 
                  (wf.currentStep > 2 ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                }">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold flex items-center gap-1.5">
                      <span class="w-5 h-5 rounded-full ${wf.currentStep > 2 ? 'bg-emerald-600 text-white' : (wf.currentStep === 2 ? 'bg-[#0B4DA8] text-white' : 'bg-slate-200 text-slate-700')} flex items-center justify-center font-mono text-[10px]">
                        ${wf.currentStep > 2 ? '✓' : '2'}
                      </span>
                      <span>2. Destination</span>
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-500 mt-1 block truncate">Godown scope &amp; capacity</span>
                </button>

                <!-- Step 3 Tab -->
                <button type="button" onclick="setReceiveStep(3)" class="p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wf.currentStep === 3 ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-blue-300 shadow-2xs' : 
                  (wf.currentStep > 3 ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                }">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold flex items-center gap-1.5">
                      <span class="w-5 h-5 rounded-full ${wf.currentStep > 3 ? 'bg-emerald-600 text-white' : (wf.currentStep === 3 ? 'bg-[#0B4DA8] text-white' : 'bg-slate-200 text-slate-700')} flex items-center justify-center font-mono text-[10px]">
                        ${wf.currentStep > 3 ? '✓' : '3'}
                      </span>
                      <span>3. Batch &amp; Bins</span>
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-500 mt-1 block truncate">Storage allocation table</span>
                </button>

                <!-- Step 4 Tab -->
                <button type="button" onclick="setReceiveStep(4)" class="p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wf.currentStep === 4 ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-blue-300 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold flex items-center gap-1.5">
                      <span class="w-5 h-5 rounded-full ${wf.currentStep === 4 ? 'bg-[#0B4DA8] text-white' : 'bg-slate-200 text-slate-700'} flex items-center justify-center font-mono text-[10px]">
                        4
                      </span>
                      <span>4. Review &amp; Commit</span>
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-500 mt-1 block truncate">Audit summary &amp; gate pass</span>
                </button>
              </div>
            </div>

            <!-- STEP 1: CONSIGNMENT DETAILS -->
            ${wf.currentStep === 1 ? `
              <div class="space-y-5 animate-in fade-in duration-150">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-blue-100 text-[#0B4DA8] font-black text-xs flex items-center justify-center">1</span>
                    <span>Step 1: Inward Consignment Details</span>
                  </h4>
                  <span class="text-xs text-slate-400">All fields marked with * are required for electronic gate entry</span>
                </div>

                <!-- Commodity Quick Selector Pills -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-2">Commodity Type *</label>
                  <div class="flex flex-wrap items-center gap-2">
                    ${['Wheat', 'Rice', 'Sugar', 'Pulses', 'Mustard', 'Maize'].map(c => `
                      <button type="button" onclick="document.getElementById('wfCommodity').value='${c}';appState.receiveWorkflow.commodity='${c}';renderCurrentRoute();" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        wf.commodity === c ? 'border-[#0B4DA8] bg-blue-50 text-[#0B4DA8] shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }">
                        <span>${c === 'Wheat' ? '🌾' : (c === 'Rice' ? '🍚' : (c === 'Sugar' ? '🍬' : (c === 'Pulses' ? '🥣' : (c === 'Mustard' ? '🟡' : '🌽'))))}</span>
                        <span>${c}</span>
                      </button>
                    `).join('')}
                  </div>
                  <input type="hidden" id="wfCommodity" value="${wf.commodity}" />
                </div>

                <!-- Form Inputs Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <!-- Consignment ID -->
                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <label class="font-bold text-slate-700">Consignment ID *</label>
                      <button type="button" onclick="appState.receiveWorkflow.consignmentId=generateUniqueConsignmentId();renderCurrentRoute();" class="text-[11px] text-[#0B4DA8] hover:underline font-bold cursor-pointer">⚡ Regenerate</button>
                    </div>
                    <input type="text" id="wfConsignmentId" value="${wf.consignmentId}" class="w-full p-2.5 border rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden bg-slate-50/50" required />
                  </div>

                  <!-- Supplier / Origin -->
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Supplier / Origin Source *</label>
                    <select id="wfSupplierName" class="w-full p-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden font-medium">
                      <option value="FCI Depot Karnal (Central Pool)" ${wf.supplierName.includes('Karnal') ? 'selected' : ''}>FCI Depot Karnal (Central Pool)</option>
                      <option value="Punjab State Civil Supplies Pool" ${wf.supplierName.includes('Punjab') ? 'selected' : ''}>Punjab State Civil Supplies Pool</option>
                      <option value="Haryana Agro Procurement Mandi" ${wf.supplierName.includes('Haryana') ? 'selected' : ''}>Haryana Agro Procurement Mandi</option>
                      <option value="Madhya Pradesh State Civil Supplies" ${wf.supplierName.includes('Madhya') ? 'selected' : ''}>Madhya Pradesh State Civil Supplies</option>
                      <option value="Solapur Farmers Co-operative Mandi" ${wf.supplierName.includes('Solapur') ? 'selected' : ''}>Solapur Farmers Co-operative Mandi</option>
                    </select>
                  </div>

                  <!-- Challan / Delivery Doc No -->
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Challan / Bill No *</label>
                    <input type="text" id="wfChallanNumber" value="${wf.challanNumber}" class="w-full p-2.5 border rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden" placeholder="e.g. CHL-PB-99120" required />
                  </div>

                  <!-- Arrival Date & Time -->
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Arrival Date &amp; Time *</label>
                    <div class="flex gap-2">
                      <input type="date" id="wfArrivalDate" value="${wf.arrivalDate}" class="w-full p-2.5 border rounded-xl font-mono focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden" required />
                      <input type="text" id="wfArrivalTime" value="${wf.arrivalTime || '10:30'}" class="w-20 p-2.5 border rounded-xl font-mono text-center focus:ring-2 focus:ring-[#0B4DA8]" placeholder="HH:MM" />
                    </div>
                  </div>

                  <!-- Total Received Qty -->
                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <label class="font-bold text-slate-700">Total Received Quantity *</label>
                      <span class="text-[10px] text-slate-400 font-mono">Standard 50kg</span>
                    </div>
                    <input type="number" id="wfTotalQuantity" value="${wf.totalQuantity}" min="1" step="1" oninput="updateConsignmentWeightDisplay()" class="w-full p-2.5 border rounded-xl font-mono font-black text-slate-900 text-sm focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden" required />
                  </div>

                  <!-- Unit of Measure -->
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Unit of Measure *</label>
                    <select id="wfUnit" class="w-full p-2.5 border rounded-xl bg-white font-semibold">
                      <option value="Bags (50kg)" selected>Bags (50kg Standard Jute / HDPE)</option>
                      <option value="Quintals (Qtl)">Quintals (Qtl)</option>
                      <option value="Metric Tonnes (MT)">Metric Tonnes (MT)</option>
                    </select>
                  </div>

                  <!-- Calculated Net Weight Summary -->
                  <div class="sm:col-span-2">
                    <label class="font-bold text-slate-700 block mb-1">Calculated Net Mass</label>
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-[#0B4DA8]">
                      <span id="wfWeightSummary">${(wf.totalQuantity * 50).toLocaleString('en-IN')} Kg · ${(wf.totalQuantity * 0.5).toFixed(1)} Qtl · ${(wf.totalQuantity * 0.05).toFixed(2)} MT Net</span>
                      <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans">✓ Weighbridge Certified</span>
                    </div>
                  </div>

                  <!-- Vehicle Number -->
                  <div>
                    <label class="font-bold text-slate-700 block mb-1">Transport Vehicle No</label>
                    <input type="text" id="wfVehicleNumber" value="${wf.vehicleNumber}" placeholder="e.g. UP-16-BT-4412" class="w-full p-2.5 border rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden" />
                  </div>

                  <!-- Supporting Document Upload Simulator -->
                  <div class="sm:col-span-3">
                    <label class="font-bold text-slate-700 block mb-1">Supporting Inward Documents (Challan / E-way Bill / Assayer Certificate)</label>
                    <div class="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-between">
                      <div class="flex items-center gap-2 text-xs">
                        <span class="w-7 h-7 rounded-lg bg-blue-100 text-[#0B4DA8] flex items-center justify-center font-bold">📄</span>
                        <div>
                          <span class="font-bold text-slate-800 block">${wf.documentName || 'Challan_Weight_Slip.pdf'}</span>
                          <span class="text-[10px] text-slate-400 font-mono">1.8 MB · Uploaded &amp; Digitally Verified</span>
                        </div>
                      </div>
                      <button type="button" onclick="alert('Document attached: Challan_Weight_Slip.pdf (Verified)');" class="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-bold hover:bg-slate-50 cursor-pointer">
                        Re-upload / Change
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Remarks -->
                <div>
                  <label class="font-bold text-slate-700 block mb-1 text-xs">Gate Reception Remarks &amp; Physical Observations</label>
                  <input type="text" id="wfRemarks" value="${wf.remarks}" class="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden" placeholder="Enter condition notes, bag stitching status, moisture meter readings..." />
                </div>

                <!-- Bottom Step 1 Actions -->
                <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                  <span class="text-xs text-slate-400">Step 1 of 4: Consignment data will be stored as an immutable audit parent for all resulting batches.</span>
                  <button type="button" onclick="setReceiveStep(2)" class="px-6 py-2.5 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer">
                    <span>Proceed to Warehouse Selection →</span>
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- STEP 2: WAREHOUSE SELECTION -->
            ${wf.currentStep === 2 ? `
              <div class="space-y-5 animate-in fade-in duration-150">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">2</span>
                    <span>Step 2: Destination Warehouse Selection &amp; Capacity Check</span>
                  </h4>
                  <span class="text-xs text-slate-500">Only authorized destination warehouses matching role permissions are accessible</span>
                </div>

                <!-- Warehouse Selector Card -->
                <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Destination Godown / Warehouse *</label>
                      ${(!isManager && userWh) ? `
                        <div class="p-3 rounded-xl bg-white border border-blue-200 flex items-center justify-between">
                          <div>
                            <span class="text-xs font-bold text-slate-900 block">${destWh.name}</span>
                            <span class="text-[11px] text-slate-500 font-mono">Code: ${destWh.code} · ${destWh.district}, ${destWh.state}</span>
                          </div>
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200">
                            🔒 Assigned Depot
                          </span>
                        </div>
                        <input type="hidden" id="wfDestinationWarehouse" value="${userWh}" />
                      ` : `
                        <select id="wfDestinationWarehouse" onchange="handleSelectDestinationWarehouse(this.value)" class="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-xs focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden">
                          ${(appState.warehouses || []).map(w => `
                            <option value="${w.id}" ${w.id === destWh.id ? 'selected' : ''}>
                              ${w.name} (${w.code}) · ${w.district} [${w.capacityMT} MT Limit]
                            </option>
                          `).join('')}
                        </select>
                      `}
                    </div>

                    <!-- Compatibility Check -->
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Commodity Compatibility Rules</label>
                      <div class="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span class="text-slate-500 block text-[11px]">Authorized Commodities for ${destWh.code}:</span>
                          <span class="font-semibold text-slate-900">${(destWh.compatibleCommodities || ['Wheat', 'Rice']).join(', ')}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (destWh.compatibleCommodities || ['Wheat', 'Rice']).includes(wf.commodity) ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }">
                          ${(destWh.compatibleCommodities || ['Wheat', 'Rice']).includes(wf.commodity) ? '✓ Compatible' : '✕ Incompatible'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Live Capacity Breakdown Box -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span class="text-slate-400 block text-[10px] uppercase font-bold">Total Godown Capacity</span>
                      <strong class="text-base font-black text-slate-900 font-mono">${totalGodownCapacity.toLocaleString('en-IN')} Bags</strong>
                      <span class="text-[10px] text-slate-500 block font-mono">(${(totalGodownCapacity * 0.05).toFixed(1)} MT)</span>
                    </div>

                    <div>
                      <span class="text-slate-400 block text-[10px] uppercase font-bold">Current Occupancy</span>
                      <strong class="text-base font-black text-blue-700 font-mono">${totalGodownOccupied.toLocaleString('en-IN')} Bags</strong>
                      <span class="text-[10px] text-slate-500 block font-mono">(${godownOccupancyPct}% occupied)</span>
                    </div>

                    <div>
                      <span class="text-slate-400 block text-[10px] uppercase font-bold">Free Available Space</span>
                      <strong class="text-base font-black text-emerald-700 font-mono">${godownAvailable.toLocaleString('en-IN')} Bags</strong>
                      <span class="text-[10px] text-slate-500 block font-mono">(${(godownAvailable * 0.05).toFixed(1)} MT)</span>
                    </div>

                    <div>
                      <span class="text-slate-400 block text-[10px] uppercase font-bold">Consignment Fit Check</span>
                      <div class="mt-1">
                        ${godownAvailable >= wf.totalQuantity ? `
                          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                            ✓ Fits (${wf.totalQuantity} Bags needed)
                          </span>
                        ` : `
                          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                            ⚠ Shortage of ${wf.totalQuantity - godownAvailable} Bags
                          </span>
                        `}
                      </div>
                    </div>
                  </div>

                  <!-- Godown Zones and Velocity Overview -->
                  <div>
                    <span class="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Configured Zones &amp; Active Bins in ${destWh.name}:</span>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      ${(destWh.zones || []).map(z => {
                        const zoneBins = whBins.filter(b => b.zone === z.type || b.zone === z.code || (z.type === 'BULK' && b.zone === 'BULK'));
                        const zCap = zoneBins.reduce((s, b) => s + (b.capacity || 0), 0);
                        const zOcc = zoneBins.reduce((s, b) => s + (b.occupied || 0), 0);
                        return `
                          <div class="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                            <div class="flex items-center justify-between">
                              <strong class="font-bold text-slate-800">${z.name || z.code}</strong>
                              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-slate-100 text-slate-600">${z.type}</span>
                            </div>
                            <div class="text-[11px] text-slate-500 font-mono flex justify-between">
                              <span>${zoneBins.length} bins</span>
                              <span>${zOcc}/${zCap} bags</span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>

                <!-- Bottom Step 2 Actions -->
                <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                  <button type="button" onclick="setReceiveStep(1)" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer">
                    ← Back to Consignment Details
                  </button>
                  <button type="button" onclick="setReceiveStep(3)" class="px-6 py-2.5 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer">
                    <span>Proceed to Batch Creation &amp; Storage Allocation →</span>
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- STEP 3: BATCH CREATION & STORAGE ALLOCATION -->
            ${wf.currentStep === 3 ? `
              <div class="space-y-5 animate-in fade-in duration-150">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span class="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">3</span>
                      <span>Step 3: Batch Creation &amp; Physical Storage Allocation</span>
                    </h4>
                    <p class="text-xs text-slate-500">Divide consignment into distinct batches, assign zone/rack/bin slots, or use auto-slotting.</p>
                  </div>

                  <!-- Mode Toggle: Manual vs Auto-Slot -->
                  <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button type="button" onclick="setAllocationMode('MANUAL')" class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      wf.allocationMode === 'MANUAL' ? 'bg-white text-[#0B4DA8] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }">
                      ✏️ Manual Allocation
                    </button>
                    <button type="button" onclick="setAllocationMode('AUTO_SLOT')" class="px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      wf.allocationMode === 'AUTO_SLOT' ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }">
                      ⚡ Intelligent Auto-Slotting
                    </button>
                  </div>
                </div>

                <!-- Sticky Live Balance Meter -->
                <div class="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-slate-50 border border-blue-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="flex items-center gap-6">
                    <div>
                      <span class="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Consignment Total</span>
                      <strong class="text-base font-black text-slate-900 font-mono">${wf.totalQuantity} Bags</strong>
                      <span class="text-[10px] text-slate-500 block font-mono">${(wf.totalQuantity * 0.05).toFixed(2)} MT</span>
                    </div>

                    <div class="border-l border-slate-200 pl-6">
                      <span class="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Allocated to Bins</span>
                      <strong id="meterAllocated" class="text-base font-black text-blue-700 font-mono">${totalAllocated} Bags</strong>
                      <span class="text-[10px] text-slate-500 block font-mono">${(totalAllocated * 0.05).toFixed(2)} MT</span>
                    </div>

                    <div class="border-l border-slate-200 pl-6">
                      <span class="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Unallocated Balance</span>
                      <strong id="meterUnallocated" class="text-base font-black ${unallocated === 0 ? 'text-emerald-700' : 'text-amber-700'} font-mono">${unallocated} Bags</strong>
                      <span class="text-[10px] text-slate-500 block font-mono">${(unallocated * 0.05).toFixed(2)} MT</span>
                    </div>
                  </div>

                  <!-- Status Pill -->
                  <div id="meterStatusPill">
                    ${unallocated === 0 ? `
                      <span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <span>✓ Fully Balanced (0 Remaining)</span>
                      </span>
                    ` : (unallocated > 0 ? `
                      <span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs animate-pulse">
                        <span>⚠ ${unallocated} Bags Remaining to Assign</span>
                      </span>
                    ` : `
                      <span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                        <span>✕ Over-allocated by ${Math.abs(unallocated)} Bags</span>
                      </span>
                    `)}
                  </div>
                </div>

                <!-- Auto-Slot Helper Banner if Auto Mode -->
                ${wf.allocationMode === 'AUTO_SLOT' ? `
                  <div class="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2.5">
                      <span class="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm">⚡</span>
                      <div>
                        <strong class="font-bold text-purple-900 block">Intelligent Auto-Slotting Algorithm Active</strong>
                        <span>Automatically recommended bins using velocity zone priority (PICK_FACE before BULK) and available capacity.</span>
                      </div>
                    </div>
                    <button type="button" onclick="runAutoSlotAllocation()" class="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs cursor-pointer whitespace-nowrap">
                      <span>↺ Re-run Recommendation</span>
                    </button>
                  </div>
                ` : ''}

                <!-- Editable Multi-Batch & Multi-Bin Table -->
                <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div class="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-700 uppercase tracking-wider">Batch Allocation &amp; Storage Matrix (${(wf.allocations || []).length} Rows)</span>
                    <button type="button" onclick="handleAddAllocationRow()" class="px-3 py-1.5 rounded-lg bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs">
                      <span>+ Add Batch Allocation Row</span>
                    </button>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th class="p-3 font-bold">Batch ID *</th>
                          <th class="p-3 font-bold">Commodity</th>
                          <th class="p-3 font-bold w-28">Quantity (Bags) *</th>
                          <th class="p-3 font-bold">Destination Godown</th>
                          <th class="p-3 font-bold">Storage Bin Location *</th>
                          <th class="p-3 font-bold">Quality Status</th>
                          <th class="p-3 font-bold text-right">Row Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 bg-white">
                        ${(wf.allocations || []).map((alloc, idx) => {
                          const availBins = whBins.filter(b => b.isActive !== false && (!b.commodity || b.commodity === wf.commodity || b.occupied === 0));
                          const chosenBin = whBins.find(b => b.code === alloc.binCode);
                          const freeInChosen = chosenBin ? Math.max(0, chosenBin.capacity - chosenBin.occupied) : 0;

                          return `
                            <tr class="hover:bg-slate-50/50">
                              <!-- Batch ID -->
                              <td class="p-3">
                                <input type="text" value="${alloc.batchId}" onchange="handleAllocationRowChange(${idx}, 'batchId', this.value)" class="w-24 p-1.5 border rounded-lg font-mono font-bold uppercase text-xs focus:ring-1 focus:ring-[#0B4DA8]" required />
                              </td>

                              <!-- Commodity -->
                              <td class="p-3 font-semibold text-slate-800">
                                🌾 ${alloc.commodity}
                              </td>

                              <!-- Quantity (Bags) -->
                              <td class="p-3">
                                <input type="number" value="${alloc.quantity}" min="1" oninput="handleAllocationRowChange(${idx}, 'quantity', this.value)" class="w-24 p-1.5 border rounded-lg font-mono font-bold text-xs focus:ring-1 focus:ring-[#0B4DA8]" required />
                              </td>

                              <!-- Destination Warehouse -->
                              <td class="p-3 text-slate-600 font-mono text-[11px]">
                                ${destWh.code}
                              </td>

                              <!-- Bin Selector -->
                              <td class="p-3">
                                <select onchange="handleAllocationRowChange(${idx}, 'binCode', this.value)" class="p-1.5 border rounded-lg bg-white font-mono text-[11px] font-semibold focus:ring-1 focus:ring-[#0B4DA8] max-w-xs">
                                  ${availBins.map(b => {
                                    const freeSpace = Math.max(0, b.capacity - b.occupied);
                                    return `
                                      <option value="${b.code}" ${b.code === alloc.binCode ? 'selected' : ''}>
                                        ${b.code} [${freeSpace}b free · ${b.zone}]
                                      </option>
                                    `;
                                  }).join('')}
                                </select>
                                ${chosenBin ? `
                                  <span class="block text-[10px] text-slate-400 mt-0.5 font-mono">
                                    Current occupancy: ${chosenBin.occupied}/${chosenBin.capacity}b (${freeInChosen}b available)
                                  </span>
                                ` : ''}
                              </td>

                              <!-- Quality Status (Strictly Pending Inspection) -->
                              <td class="p-3">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap" title="Requires lab assay before FIFO eligibility">
                                  Pending Inspection
                                </span>
                              </td>

                              <!-- Row Actions -->
                              <td class="p-3 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                  <button type="button" onclick="handleSplitBatch(${idx})" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer" title="Split batch quantity across another storage bin">
                                    ⑂ Split
                                  </button>
                                  ${(wf.allocations || []).length > 1 ? `
                                    <button type="button" onclick="handleRemoveAllocationRow(${idx})" class="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer" title="Remove row">
                                      ✕
                                    </button>
                                  ` : ''}
                                </div>
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Bottom Step 3 Actions -->
                <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                  <button type="button" onclick="setReceiveStep(2)" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer">
                    ← Back to Warehouse Selection
                  </button>
                  <button type="button" onclick="setReceiveStep(4)" class="px-6 py-2.5 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer">
                    <span>Review &amp; Confirm Allocation →</span>
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- STEP 4: REVIEW & CONFIRM -->
            ${wf.currentStep === 4 ? `
              <div class="space-y-6 animate-in fade-in duration-150">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">4</span>
                      <span>Step 4: Final Review &amp; Electronic Gate Inward Confirmation</span>
                    </h4>
                    <p class="text-xs text-slate-500">Carefully verify all consignment parameters, multi-batch partitions, and bin assignments before committing to immutable ledger.</p>
                  </div>
                  <span class="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300">
                    ✓ Validation Verified
                  </span>
                </div>

                <!-- Summary Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <!-- Consignment Parent Details -->
                  <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Consignment Metadata</span>
                    <div class="space-y-1">
                      <div class="flex justify-between"><span class="text-slate-500">ID:</span> <strong class="font-mono text-slate-900">${wf.consignmentId}</strong></div>
                      <div class="flex justify-between"><span class="text-slate-500">Supplier:</span> <span class="font-medium text-slate-800 truncate">${wf.supplierName}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Challan No:</span> <span class="font-mono text-slate-800">${wf.challanNumber}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Arrival:</span> <span class="font-mono text-slate-800">${wf.arrivalDate} ${wf.arrivalTime || '10:30'}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Vehicle:</span> <span class="font-mono text-slate-800">${wf.vehicleNumber || 'Gate Verified'}</span></div>
                    </div>
                  </div>

                  <!-- Destination Warehouse Scope -->
                  <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Destination Godown</span>
                    <div class="space-y-1">
                      <div class="flex justify-between"><span class="text-slate-500">Godown:</span> <strong class="text-slate-900">${destWh.name}</strong></div>
                      <div class="flex justify-between"><span class="text-slate-500">Node Code:</span> <span class="font-mono font-bold text-[#0B4DA8]">${destWh.code}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">District:</span> <span>${destWh.district}, ${destWh.state}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Total Bins In Scope:</span> <span class="font-mono">${whBins.length} Bins</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Available Space:</span> <span class="font-mono text-emerald-700 font-bold">${godownAvailable.toLocaleString('en-IN')} Bags</span></div>
                    </div>
                  </div>

                  <!-- Allocation Mode & Volumes -->
                  <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Volume &amp; Workflow Mode</span>
                    <div class="space-y-1">
                      <div class="flex justify-between"><span class="text-slate-500">Commodity:</span> <strong class="text-slate-900">🌾 ${wf.commodity}</strong></div>
                      <div class="flex justify-between"><span class="text-slate-500">Total Inward:</span> <strong class="font-mono text-[#0B4DA8] text-sm">${wf.totalQuantity} Bags</strong></div>
                      <div class="flex justify-between"><span class="text-slate-500">Net Metric Tonnes:</span> <span class="font-mono font-bold">${(wf.totalQuantity * 0.05).toFixed(2)} MT</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Allocation Mode:</span> <span class="font-semibold">${wf.allocationMode === 'AUTO_SLOT' ? '⚡ Auto-Slot Engine' : '✏️ Manual Assignment'}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Batches to Create:</span> <span class="font-mono font-bold text-purple-700">${(wf.allocations || []).length} Batches</span></div>
                    </div>
                  </div>
                </div>

                <!-- Review Batches & Bins Table -->
                <div>
                  <h5 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Committed Storage Allocation Plan:</h5>
                  <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th class="p-3 font-bold">Batch ID</th>
                          <th class="p-3 font-bold">Commodity</th>
                          <th class="p-3 font-bold">Quantity</th>
                          <th class="p-3 font-bold">Assigned Storage Bin</th>
                          <th class="p-3 font-bold">Bin Impact (Before → After)</th>
                          <th class="p-3 font-bold">Initial Quality State</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 bg-white">
                        ${(wf.allocations || []).map(alloc => {
                          const bin = whBins.find(b => b.code === alloc.binCode) || { occupied: 0, capacity: 400 };
                          const before = bin.occupied || 0;
                          const after = before + alloc.quantity;
                          return `
                            <tr class="hover:bg-slate-50/50">
                              <td class="p-3 font-mono font-bold text-slate-900">${alloc.batchId}</td>
                              <td class="p-3 font-semibold text-slate-800">🌾 ${alloc.commodity}</td>
                              <td class="p-3 font-mono font-black text-blue-700">${alloc.quantity} Bags</td>
                              <td class="p-3 font-mono font-bold text-slate-800">${alloc.binCode} (${alloc.zoneCode})</td>
                              <td class="p-3 font-mono text-[11px]">
                                <span class="text-slate-500">${before}b</span> → <strong class="text-blue-700">${after}b</strong> / ${bin.capacity}b
                              </td>
                              <td class="p-3">
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                  Pending Inspection
                                </span>
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Accountability & Operator Declaration -->
                <div class="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-xs space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-blue-700 font-bold text-sm">🛡️</span>
                    <strong class="text-blue-950 font-bold">Operator &amp; Supervisor Assurance</strong>
                  </div>
                  <p class="text-slate-600 leading-relaxed text-[11px]">
                    By committing this inward consignment, you certify that truck weighment slips have been verified, bag seal counts match challan documentation, and stack assignments comply with state commodity preservation protocols. Newly received stock will remain locked under <strong>Pending Inspection</strong> until an authorized Quality Assayer certifies conformity.
                  </p>
                </div>

                <!-- Actions: Edit vs Confirm -->
                <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                  <button type="button" onclick="setReceiveStep(3)" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer">
                    ← Edit Allocations
                  </button>

                  <button type="button" id="btnConfirmIntake" onclick="handleConfirmConsignmentSubmission()" class="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition-all">
                    <span>✓ Confirm &amp; Commit Consignment Intake</span>
                  </button>
                </div>
              </div>
            ` : ''}

          </div>

          <!-- ======================================================== -->
          <!-- CONSIGNMENTS INTAKE LEDGER TABLE                         -->
          <!-- ======================================================== -->
          <div class="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Received Consignments Ledger</h3>
                <p class="text-xs text-slate-500">Historical electronic gate passes and multi-batch distribution records.</p>
              </div>

              <div class="flex items-center gap-2">
                <input type="text" id="csgSearchQuery" oninput="renderCurrentRoute()" placeholder="Search consignment, supplier..." class="p-2 border rounded-xl text-xs bg-slate-50 focus:bg-white" />
              </div>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th class="p-3 font-bold">Consignment ID</th>
                    <th class="p-3 font-bold">Supplier / Origin</th>
                    <th class="p-3 font-bold">Arrival Date</th>
                    <th class="p-3 font-bold">Commodity</th>
                    <th class="p-3 font-bold">Total Quantity</th>
                    <th class="p-3 font-bold">Destination Godown</th>
                    <th class="p-3 font-bold">Batches Created</th>
                    <th class="p-3 font-bold text-right">Voucher</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${(appState.consignments || []).map(c => `
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-[#0B4DA8]">${c.consignmentId}</td>
                      <td class="p-3 text-slate-800 font-medium">${c.supplierName}</td>
                      <td class="p-3 font-mono text-slate-600">${c.arrivalDate}</td>
                      <td class="p-3 font-semibold text-slate-900">🌾 ${c.commodity}</td>
                      <td class="p-3 font-mono font-bold text-slate-900">${c.totalQuantity} Bags</td>
                      <td class="p-3 text-slate-700 font-mono text-[11px]">${c.destinationWarehouseId}</td>
                      <td class="p-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          ${(c.batches || []).length} Batches
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <button onclick="openConsignmentVoucherModal('${c.consignmentId}')" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B4DA8] font-bold text-[11px] cursor-pointer">
                          View Voucher →
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- ======================================================== -->
          <!-- STEP 3 & STEP 4 IN THE STOCK INWARD LIFECYCLE PIPELINE   -->
          <!-- ======================================================== -->
          ${(activeFilter === 'ALL' || activeFilter === '3') ? `
          <div id="allocationStep3Anchor" class="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shadow-2xs">3</span>
                <div>
                  <h2 class="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <span>Quality Assaying &amp; Inspection Queue</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Mandatory Assayer Verification</span>
                  </h2>
                  <p class="text-xs text-slate-500">Newly received stock remains quarantined until certified conforming to Food Safety &amp; Moisture norms.</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="setRoute('quality')" class="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>🔬 Open Full Quality Laboratory →</span>
                </button>
              </div>
            </div>

            <!-- Pending Inspection List -->
            <div class="space-y-3">
              ${pendingInspList.length === 0 ? `
                <div class="p-5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2.5">
                  <span class="text-emerald-600 font-bold">✓</span>
                  <span>No batches currently waiting in laboratory queue. All received stock has been assayed.</span>
                </div>
              ` : `
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th class="p-3 font-bold">Batch ID</th>
                        <th class="p-3 font-bold">Consignment Ref</th>
                        <th class="p-3 font-bold">Commodity</th>
                        <th class="p-3 font-bold">Volume</th>
                        <th class="p-3 font-bold">Physical Storage Bin</th>
                        <th class="p-3 font-bold">Arrival Date</th>
                        <th class="p-3 font-bold text-right">Quick Assayer Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      ${pendingInspList.map(b => `
                        <tr class="hover:bg-slate-50/50">
                          <td class="p-3 font-mono font-bold text-slate-900">${b.id}</td>
                          <td class="p-3 font-mono text-slate-600">${b.consignmentId || 'CSG-2025-008'}</td>
                          <td class="p-3 font-semibold text-slate-800">🌾 ${b.commodity}</td>
                          <td class="p-3 font-mono font-bold text-blue-700">${b.totalQuantity || b.availableQuantity} Bags</td>
                          <td class="p-3 font-mono font-bold text-slate-800">${b.binCode || 'BAY-A-RACK-02-BIN-02'}</td>
                          <td class="p-3 font-mono text-slate-500">${b.arrivalDate}</td>
                          <td class="p-3 text-right">
                            <div class="flex items-center justify-end gap-1.5">
                              <button onclick="handleQuickInspect('${b.id}', 'Eligible')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs">
                                ✓ Pass Assay (Release to FIFO)
                              </button>
                              <button onclick="handleQuickInspect('${b.id}', 'Hold')" class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] cursor-pointer shadow-2xs">
                                ⚠ Hold
                              </button>
                            </div>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>
          ` : ''}

          <!-- STEP 4: FIFO RELEASE -->
          ${(activeFilter === 'ALL' || activeFilter === '4') ? `
          <div id="allocationStep4Anchor" class="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shadow-2xs">4</span>
                <div>
                  <h2 class="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <span>FIFO Active Allocation Queue</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Dispatch-Ready Batches</span>
                  </h2>
                  <p class="text-xs text-slate-500">Only quality-approved stock ordered strictly by oldest arrival date (FIFO sequence).</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="setRoute('fifo')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer">
                  <span>⚡ Create FIFO Outbound Plan →</span>
                </button>
              </div>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th class="p-3 font-bold">FIFO Rank</th>
                    <th class="p-3 font-bold">Batch ID</th>
                    <th class="p-3 font-bold">Commodity</th>
                    <th class="p-3 font-bold">Arrival Date</th>
                    <th class="p-3 font-bold">Available Quantity</th>
                    <th class="p-3 font-bold">Storage Bin</th>
                    <th class="p-3 font-bold text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${eligibleList.map((b, idx) => `
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3">
                        <span class="w-6 h-6 rounded-full ${idx === 0 ? 'bg-amber-400 text-slate-900 font-black' : 'bg-slate-100 text-slate-700 font-bold'} flex items-center justify-center text-xs font-mono">
                          #${idx + 1}
                        </span>
                      </td>
                      <td class="p-3 font-mono font-bold text-slate-900">${b.id}</td>
                      <td class="p-3 font-semibold text-slate-800">🌾 ${b.commodity}</td>
                      <td class="p-3 font-mono text-slate-600">${b.arrivalDate}</td>
                      <td class="p-3 font-mono font-bold text-emerald-700">${b.availableQuantity} Bags</td>
                      <td class="p-3 font-mono font-bold text-slate-800">${b.binCode || 'BAY-A-RACK-01-BIN-01'}</td>
                      <td class="p-3 text-right">
                        <button onclick="setRoute('fifo')" class="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-[11px] cursor-pointer">
                          Allocate Outbound →
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}

        </div>
      `;
    }
'''

with open('/tmp/allocation_view_code.js', 'w', encoding='utf-8') as f:
    f.write(allocation_view_code)

print("Allocation view code written to /tmp/allocation_view_code.js")

