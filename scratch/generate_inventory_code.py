# Generator script for the complete Warehouse-Wise Stock Visibility & Dispatch Readiness Dashboard for index.html

inventory_js = '''
    // =========================================================================
    // WAREHOUSE-WISE STOCK VISIBILITY & DISPATCH READINESS ENGINE
    // =========================================================================

    function initInventoryState() {
      if (!appState.inventoryActiveSubTab) appState.inventoryActiveSubTab = 'OVERVIEW';
      if (!appState.inventoryOverviewSearch) appState.inventoryOverviewSearch = '';
      if (!appState.inventoryOverviewViewMode) appState.inventoryOverviewViewMode = 'CARDS';
      if (!appState.inventoryCommodityFilter) appState.commodityFilter = 'ALL';
      if (!appState.inventoryStatusFilter) appState.statusFilter = 'ALL';
      if (!appState.inventoryAgeFilter) appState.inventoryAgeFilter = 'ALL';
      if (!appState.inventorySortField) appState.inventorySortField = 'fifo';
      if (!appState.inventorySortOrder) appState.inventorySortOrder = 'asc';
      if (!appState.inventoryPage) appState.inventoryPage = 1;
      if (!appState.inventoryPageSize) appState.inventoryPageSize = 10;
      if (!appState.inventoryMovementSearch) appState.inventoryMovementSearch = '';
      if (!appState.inventoryMovementTypeFilter) appState.inventoryMovementTypeFilter = 'ALL';
    }

    function getAuthorizedWarehousesList() {
      const user = appState.currentUser;
      const isManager = !user || user.role === 'MANAGER';
      const whList = appState.warehouses && appState.warehouses.length > 0 ? appState.warehouses : [
        { id: 'GDN-NGP-01', code: 'GDN-NGP-01', name: 'Central Food Godown, Nagpur (Surajpur Depot)', district: 'Nagpur', state: 'Maharashtra', capacityMT: 5000, compatibleCommodities: ['Wheat', 'Rice'], isActive: true },
        { id: 'GDN-PUN-02', code: 'GDN-PUN-02', name: 'Regional Buffer Godown, Pune Central', district: 'Pune', state: 'Maharashtra', capacityMT: 4500, compatibleCommodities: ['Wheat', 'Rice'], isActive: true },
        { id: 'GDN-NOIDA-01', code: 'GDN-NOIDA-01', name: 'Surajpur Central Depot, Greater Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', capacityMT: 6000, compatibleCommodities: ['Wheat', 'Rice', 'Pulses'], isActive: true }
      ];

      if (!isManager && user && user.warehouseId) {
        return whList.filter(w => w.id === user.warehouseId);
      }
      return whList;
    }

    // Mathematical inventory computation with ZERO double-counting
    function calculateInventoryMetrics(whIdFilter = null) {
      const user = appState.currentUser;
      const isManager = !user || user.role === 'MANAGER';
      const effectiveWhScope = (!isManager && user && user.warehouseId) ? user.warehouseId : whIdFilter;

      let batches = (appState.batches || []).map(b => ({
        ...b,
        warehouseId: b.warehouseId || (b.id === 'B009' || b.id === 'B010' ? 'GDN-PUN-02' : 'GDN-NGP-01')
      }));

      if (effectiveWhScope && effectiveWhScope !== 'ALL') {
        batches = batches.filter(b => b.warehouseId === effectiveWhScope);
      }

      // 1. Total Physical Stock = sum of available on-hand + segregated damaged portion
      const totalPhysicalBags = batches.reduce((sum, b) => sum + (b.availableQuantity || 0) + (b.damagedQuantity || 0), 0);
      const totalPhysicalMT = (totalPhysicalBags * 0.05).toFixed(1);

      // 2. Available Ready for Dispatch = Quality Approved (Eligible/Approved) AND Sound AND Unreserved
      const readyForDispatchBags = batches
        .filter(b => b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved')
        .reduce((sum, b) => sum + Math.max(0, (b.availableQuantity || 0) - (b.reservedQuantity || 0)), 0);
      const readyForDispatchMT = (readyForDispatchBags * 0.05).toFixed(1);

      // 3. Pending Quality Inspection (Quarantined awaiting assay & supervisory release)
      const pendingInspectionBatches = batches.filter(b => 
        b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation' || b.qualityStatus === 'Reinspection Required'
      );
      const pendingInspectionBags = pendingInspectionBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
      const pendingInspectionMT = (pendingInspectionBags * 0.05).toFixed(1);

      // 4. Reserved Stock Awaiting Dispatch (Committed to active orders)
      const reservedStockBags = batches.reduce((sum, b) => sum + (b.reservedQuantity || 0), 0);
      const reservedStockMT = (reservedStockBags * 0.05).toFixed(1);

      // 5. In-Transit Stock (Transfers + Active Fleet Dispatches) - Displayed Separately
      const inTransitTransfers = (appState.stockTransfers || []).filter(t => 
        t.status === 'IN_TRANSIT' && (!effectiveWhScope || effectiveWhScope === 'ALL' || t.sourceWarehouseId === effectiveWhScope || t.destWarehouseId === effectiveWhScope)
      );
      const inTransitTransferBags = inTransitTransfers.reduce((sum, t) => sum + (t.quantity || 0), 0);

      const inTransitFleet = (appState.dispatches || []).filter(d => 
        (d.status === 'In Transit' || d.status === 'Out for Delivery') &&
        (!effectiveWhScope || effectiveWhScope === 'ALL' || d.warehouseId === effectiveWhScope || d.sourceWarehouseId === effectiveWhScope)
      );
      const inTransitFleetBags = inTransitFleet.reduce((sum, d) => sum + (d.actualLoadedBags || d.quantity || 0), 0);
      const totalInTransitBags = inTransitTransferBags + inTransitFleetBags;
      const totalInTransitMT = (totalInTransitBags * 0.05).toFixed(1);

      // 6. Damaged, Held or Rejected Stock (Segregated non-issuable inventory)
      const damagedHeldBatches = batches.filter(b => b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected');
      const damagedHeldBatchesBags = damagedHeldBatches.reduce((sum, b) => sum + (b.availableQuantity || 0) + (b.damagedQuantity || 0), 0);
      const soundBatchesDamagedBags = batches
        .filter(b => b.qualityStatus !== 'Hold' && b.qualityStatus !== 'Rejected')
        .reduce((sum, b) => sum + (b.damagedQuantity || 0), 0);
      const totalDamagedHeldBags = damagedHeldBatchesBags + soundBatchesDamagedBags;
      const totalDamagedHeldMT = (totalDamagedHeldBags * 0.05).toFixed(1);

      // 7. Active Warehouses & Batches Counts
      const allAuthorizedWhs = getAuthorizedWarehousesList();
      const activeWarehousesCount = effectiveWhScope && effectiveWhScope !== 'ALL' ? 1 : allAuthorizedWhs.length;
      const activeBatchesCount = batches.filter(b => ((b.availableQuantity || 0) + (b.damagedQuantity || 0)) > 0).length;

      // Commodity Breakdown
      const commodities = ['Wheat', 'Rice', 'Pulses', 'Sugar'];
      const commodityBreakdown = commodities.map(c => {
        const cBatches = batches.filter(b => b.commodity === c);
        const phys = cBatches.reduce((s, b) => s + (b.availableQuantity || 0) + (b.damagedQuantity || 0), 0);
        const ready = cBatches
          .filter(b => b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved')
          .reduce((s, b) => s + Math.max(0, (b.availableQuantity || 0) - (b.reservedQuantity || 0)), 0);
        const res = cBatches.reduce((s, b) => s + (b.reservedQuantity || 0), 0);
        const pending = cBatches
          .filter(b => b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation' || b.qualityStatus === 'Reinspection Required')
          .reduce((s, b) => s + (b.availableQuantity || 0), 0);
        const dmg = cBatches.reduce((s, b) => s + (b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected' ? (b.availableQuantity || 0) + (b.damagedQuantity || 0) : (b.damagedQuantity || 0)), 0);

        return {
          commodity: c,
          physicalBags: phys,
          physicalMT: (phys * 0.05).toFixed(1),
          readyDispatchBags: ready,
          readyDispatchMT: (ready * 0.05).toFixed(1),
          reservedBags: res,
          pendingBags: pending,
          damagedBags: dmg,
          batchesCount: cBatches.length
        };
      }).filter(c => c.physicalBags > 0);

      return {
        totalPhysicalBags, totalPhysicalMT,
        readyForDispatchBags, readyForDispatchMT,
        pendingInspectionBags, pendingInspectionMT,
        reservedStockBags, reservedStockMT,
        totalInTransitBags, totalInTransitMT,
        totalDamagedHeldBags, totalDamagedHeldMT,
        activeWarehousesCount,
        activeBatchesCount,
        commodityBreakdown
      };
    }

    // Warehouse-specific roll-up stats for cards and comparison tables
    function getWarehouseStats(wh) {
      const whId = wh.id;
      const batches = (appState.batches || []).filter(b => (b.warehouseId || (b.id === 'B009' || b.id === 'B010' ? 'GDN-PUN-02' : 'GDN-NGP-01')) === whId);

      const physBags = batches.reduce((s, b) => s + (b.availableQuantity || 0) + (b.damagedQuantity || 0), 0);
      const readyBags = batches
        .filter(b => b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved')
        .reduce((s, b) => s + Math.max(0, (b.availableQuantity || 0) - (b.reservedQuantity || 0)), 0);
      const fifoEligibleBags = readyBags;
      const pendingInspBags = batches
        .filter(b => b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation' || b.qualityStatus === 'Reinspection Required')
        .reduce((s, b) => s + (b.availableQuantity || 0), 0);
      const resBags = batches.reduce((s, b) => s + (b.reservedQuantity || 0), 0);
      const dmgBags = batches.reduce((s, b) => s + (b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected' ? (b.availableQuantity || 0) + (b.damagedQuantity || 0) : (b.damagedQuantity || 0)), 0);

      const inTransit = (appState.stockTransfers || []).filter(t => t.status === 'IN_TRANSIT' && (t.sourceWarehouseId === whId || t.destWarehouseId === whId))
        .reduce((s, t) => s + (t.quantity || 0), 0);

      // Bin capacity calculation
      const whBins = (appState.bins || []).filter(b => (b.warehouseId || 'GDN-NGP-01') === whId);
      const capacityBags = whBins.reduce((s, b) => s + (b.capacity || 400), 0) || (wh.capacityMT * 20);
      const occupiedBags = whBins.reduce((s, b) => s + (b.occupied || 0), 0) || physBags;
      const remainingBags = Math.max(0, capacityBags - occupiedBags);
      const occupancyPct = capacityBags > 0 ? Math.round((occupiedBags / capacityBags) * 100) : 0;

      return {
        wh,
        physBags, physMT: (physBags * 0.05).toFixed(1),
        readyBags, readyMT: (readyBags * 0.05).toFixed(1),
        fifoEligibleBags,
        pendingInspBags,
        resBags,
        inTransit,
        dmgBags,
        capacityBags,
        occupiedBags,
        remainingBags,
        occupancyPct,
        activeBatchesCount: batches.filter(b => ((b.availableQuantity || 0) + (b.damagedQuantity || 0)) > 0).length,
        totalBatchesCount: batches.length
      };
    }

    // Navigation and Drill-Down Handlers
    function openWarehouseDrilldown(whId) {
      appState.inventorySelectedWarehouseDrilldown = whId;
      appState.inventoryActiveSubTab = 'DRILLDOWN';
      appState.inventoryPage = 1;
      renderCurrentRoute();
    }

    function clearWarehouseDrilldown() {
      appState.inventorySelectedWarehouseDrilldown = null;
      appState.inventoryActiveSubTab = 'OVERVIEW';
      appState.inventoryPage = 1;
      renderCurrentRoute();
    }

    function setInventorySubTab(tab) {
      appState.inventoryActiveSubTab = tab;
      appState.inventoryPage = 1;
      renderCurrentRoute();
    }

    function setInventoryOverviewViewMode(mode) {
      appState.inventoryOverviewViewMode = mode;
      renderCurrentRoute();
    }

    function openWarehouseSpecsModal(whId) {
      const wh = (appState.warehouses || []).find(w => w.id === whId) || {
        id: whId, code: whId, name: 'Central Food Godown', district: 'Nagpur', state: 'Maharashtra', capacityMT: 5000, compatibleCommodities: ['Wheat', 'Rice']
      };
      const stats = getWarehouseStats(wh);
      const whBins = (appState.bins || []).filter(b => (b.warehouseId || 'GDN-NGP-01') === whId);

      const modal = document.getElementById('warehouseSpecsModal');
      const content = document.getElementById('warehouseSpecsModalContent');
      if (!modal || !content) return;

      content.innerHTML = `
        <div class="space-y-5">
          <!-- Godown Header Card -->
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-slate-500">${wh.code}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">OPERATIONAL DEPOT</span>
              </div>
              <h3 class="text-base font-black text-slate-900 mt-1">${wh.name}</h3>
              <p class="text-xs text-slate-500">${wh.district}, ${wh.state} · Registered Public Distribution Godown</p>
            </div>
            <div class="text-left sm:text-right">
              <span class="text-[10px] text-slate-400 font-semibold uppercase block">Licensed Storage Capacity</span>
              <span class="text-lg font-black text-[#0B4DA8] font-mono">${wh.capacityMT} MT</span>
              <span class="text-[10px] text-slate-500 block">(${wh.capacityMT * 20} Standard Bags)</span>
            </div>
          </div>

          <!-- Capacity Meter & Stats Grid -->
          <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div class="flex justify-between items-center text-xs">
              <span class="font-bold text-slate-700">Storage Occupancy Status</span>
              <span class="font-mono font-bold text-[#0B4DA8]">${stats.occupancyPct}% Utilized</span>
            </div>
            <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div class="bg-gradient-to-r from-[#0B4DA8] to-[#1E63C4] h-full" style="width: ${Math.min(100, stats.occupancyPct)}%"></div>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
              <div>Occupied: <strong class="text-slate-900 font-mono">${stats.occupiedBags}</strong> Bags</div>
              <div>Available: <strong class="text-emerald-700 font-mono">${stats.remainingBags}</strong> Bags</div>
              <div>Total Capacity: <strong class="text-slate-900 font-mono">${stats.capacityBags}</strong> Bags</div>
            </div>
          </div>

          <!-- Commodity & Infrastructure Details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-700 block mb-1">Compatible Commodities</span>
              <div class="flex flex-wrap gap-1.5">
                ${(wh.compatibleCommodities || ['Wheat', 'Rice']).map(c => `
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200">${c}</span>
                `).join('')}
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-700 block mb-1">Environmental &amp; Safety Controls</span>
              <div class="text-[11px] text-slate-600 space-y-0.5">
                <div>• Mechanical Aeration: <strong>Active in Bay A &amp; B</strong></div>
                <div>• Dunnage Stack Elevation: <strong>Standard 15cm Timber</strong></div>
                <div>• Digital Weighbridge: <strong>60 MT Pitless Calibrated</strong></div>
              </div>
            </div>
          </div>

          <!-- Physical Bins Layout Table -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-slate-900 text-xs">Godown Bins &amp; Storage Bays (${whBins.length} Bins Configured)</span>
            </div>
            <div class="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold sticky top-0 border-b">
                  <tr>
                    <th class="p-2.5">Bin Code</th>
                    <th class="p-2.5">Zone Type</th>
                    <th class="p-2.5">Commodity</th>
                    <th class="p-2.5">Capacity</th>
                    <th class="p-2.5">Occupied</th>
                    <th class="p-2.5">Batches Stored</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${whBins.length > 0 ? whBins.map(b => `
                    <tr class="hover:bg-slate-50">
                      <td class="p-2.5 font-mono font-bold text-slate-800">${b.code}</td>
                      <td class="p-2.5"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">${b.zone || 'BULK'}</span></td>
                      <td class="p-2.5 text-slate-700">${b.commodity || 'Flexible'}</td>
                      <td class="p-2.5 font-mono">${b.capacity}</td>
                      <td class="p-2.5 font-mono font-bold ${b.occupied >= b.capacity ? 'text-rose-600' : 'text-slate-900'}">${b.occupied}</td>
                      <td class="p-2.5 font-mono text-[10px] text-[#0B4DA8]">${(b.batches || []).join(', ') || 'Empty'}</td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="6" class="p-4 text-center text-slate-400">No individual bins registered for this godown.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeWarehouseSpecsModal() {
      const modal = document.getElementById('warehouseSpecsModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function openFifoExplanationModal(batchId) {
      const b = (appState.batches || []).find(x => x.id === batchId);
      if (!b) return;

      const modal = document.getElementById('fifoEligibilityModal');
      const content = document.getElementById('fifoEligibilityModalContent');
      if (!modal || !content) return;

      const ageDays = calcAge(b.arrivalDate);
      const isApproved = b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved';
      const unreserved = Math.max(0, (b.availableQuantity || 0) - (b.reservedQuantity || 0));
      const isDispatchable = isApproved && unreserved > 0;

      // Calculate FIFO rank among same commodity
      const eligibleSameComm = (appState.batches || [])
        .filter(x => x.commodity === b.commodity && (x.qualityStatus === 'Eligible' || x.qualityStatus === 'Approved') && ((x.availableQuantity || 0) - (x.reservedQuantity || 0)) > 0)
        .sort((x, y) => {
          const tX = parseDateDMY(x.arrivalDate).getTime();
          const tY = parseDateDMY(y.arrivalDate).getTime();
          return tX !== tY ? tX - tY : x.id.localeCompare(y.id);
        });
      const rankIdx = eligibleSameComm.findIndex(x => x.id === b.id);
      const fifoRank = rankIdx !== -1 ? rankIdx + 1 : 'Excluded';

      content.innerHTML = `
        <div class="space-y-4 text-xs">
          <!-- Batch Summary -->
          <div class="p-4 rounded-xl ${isDispatchable ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'} flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-sm text-slate-900">${b.id}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isDispatchable ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}">
                  ${isDispatchable ? `⭐ FIFO Eligible (Rank #${fifoRank})` : '⛔ Blocked from FIFO'}
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-1">${b.commodity} · Arrived on <strong>${b.arrivalDate}</strong> (${ageDays} Days Old)</p>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 font-semibold uppercase block">Dispatch-Ready Qty</span>
              <span class="text-base font-black text-slate-900 font-mono">${isDispatchable ? unreserved : 0} Bags</span>
            </div>
          </div>

          <!-- FIFO Eligibility Rules Checklist -->
          <div class="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-white">
            <span class="font-bold text-slate-900 block text-xs mb-1">Statutory PDS FIFO Validation Rules</span>
            
            <div class="flex items-center gap-2 text-[11px] ${isApproved ? 'text-emerald-700' : 'text-rose-600 font-semibold'}">
              <span>${isApproved ? '✓' : '✗'}</span>
              <span>Quality Approval: <strong>${b.qualityStatus}</strong> ${isApproved ? '(Quality Assayed & Cleared)' : '(Hold / Inspection Pending Blocks Dispatch)'}</span>
            </div>

            <div class="flex items-center gap-2 text-[11px] ${unreserved > 0 ? 'text-emerald-700' : 'text-rose-600 font-semibold'}">
              <span>${unreserved > 0 ? '✓' : '✗'}</span>
              <span>Unreserved Available Balance: <strong>${unreserved} Bags</strong> ${unreserved > 0 ? 'Free to Allocate' : '(100% Reserved by active dispatch order)'}</span>
            </div>

            <div class="flex items-center gap-2 text-[11px] ${!b.damagedQuantity || b.damagedQuantity === 0 ? 'text-emerald-700' : 'text-amber-700 font-semibold'}">
              <span>${!b.damagedQuantity || b.damagedQuantity === 0 ? '✓' : '⚠️'}</span>
              <span>Physical Integrity: <strong>${b.damagedQuantity ? `${b.damagedQuantity} damaged bags segregated` : '100% Sound Goods'}</strong></span>
            </div>

            <div class="flex items-center gap-2 text-[11px] text-blue-700">
              <span>🕒</span>
              <span>FIFO Sequencing Rule: <strong>Oldest Inward Date First</strong> (Rank #${fifoRank} of ${eligibleSameComm.length} eligible ${b.commodity} lots).</span>
            </div>
          </div>

          <!-- Dispatch Action Button -->
          <div class="flex justify-end gap-2 pt-2 border-t">
            <button onclick="closeFifoExplanationModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
              Close
            </button>
            ${isDispatchable ? `
              <button onclick="closeFifoExplanationModal();setRoute('fifo');" class="px-4 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#093d85] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5">
                <span>⚡ Allocate to Dispatch Order</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeFifoExplanationModal() {
      const modal = document.getElementById('fifoEligibilityModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    // Standardized 19-Column Compliance CSV Exporter
    function exportInventoryLedgerCsv() {
      const user = appState.currentUser;
      const isManager = !user || user.role === 'MANAGER';
      const effectiveWhScope = (!isManager && user && user.warehouseId) ? user.warehouseId : appState.inventorySelectedWarehouseDrilldown;

      let batches = (appState.batches || []).map(b => ({
        ...b,
        warehouseId: b.warehouseId || (b.id === 'B009' || b.id === 'B010' ? 'GDN-PUN-02' : 'GDN-NGP-01')
      }));

      if (effectiveWhScope && effectiveWhScope !== 'ALL') {
        batches = batches.filter(b => b.warehouseId === effectiveWhScope);
      }

      const headers = [
        'Batch ID', 'Commodity', 'Warehouse Code', 'Warehouse Name', 'Zone / Bay', 'Rack', 'Bin Code',
        'Receipt Date', 'Age (Days)', 'Age Tier', 'Original Bags', 'Current Physical Bags', 'Reserved Bags',
        'Dispatch Ready Bags', 'Pending Inspection Bags', 'Damaged / Held Bags', 'Quality Status',
        'FIFO Eligible', 'Eligibility Notes'
      ];

      const whMap = (appState.warehouses || []).reduce((acc, w) => { acc[w.id] = w.name; return acc; }, {});

      const rows = batches.map(b => {
        const age = calcAge(b.arrivalDate);
        const ageTier = age <= 30 ? '<=30d' : age <= 90 ? '31-90d' : age <= 180 ? '91-180d' : '>180d';
        const isApproved = b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved';
        const unreserved = Math.max(0, (b.availableQuantity || 0) - (b.reservedQuantity || 0));
        const dispatchable = isApproved ? unreserved : 0;
        const pending = b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation' || b.qualityStatus === 'Reinspection Required' ? (b.availableQuantity || 0) : 0;
        const heldDmg = b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected' ? (b.availableQuantity || 0) + (b.damagedQuantity || 0) : (b.damagedQuantity || 0);
        const phys = (b.availableQuantity || 0) + (b.damagedQuantity || 0);
        const fifoEligible = dispatchable > 0 ? 'YES' : 'NO';
        const reason = dispatchable > 0 ? 'Sound and Quality Approved' : (!isApproved ? b.qualityStatus : '100% Reserved');

        return [
          b.id,
          b.commodity,
          b.warehouseId,
          `"${(whMap[b.warehouseId] || 'Central Godown').replace(/"/g, '""')}"`,
          `"${(b.storageSection || b.zoneCode || 'Zone A').replace(/"/g, '""')}"`,
          b.rack || '01',
          b.binCode || 'UNASSIGNED',
          b.arrivalDate,
          age,
          ageTier,
          b.totalQuantity || b.availableQuantity,
          phys,
          b.reservedQuantity || 0,
          dispatchable,
          pending,
          heldDmg,
          b.qualityStatus,
          fifoEligible,
          `"${reason.replace(/"/g, '""')}"`
        ].join(',');
      });

      downloadCsvBlob('BhandarSetu_Commodity_Inventory_Ledger.csv', [headers.join(','), ...rows].join('\\n'));
      showToast('Inventory Ledger CSV successfully downloaded');
    }
'''

with open('/tmp/inventory_workflow_js.js', 'w', encoding='utf-8') as f:
    f.write(inventory_js)

print("Wrote inventory_js helper functions.")

