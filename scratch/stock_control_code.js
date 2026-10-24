    // =========================================================================
    // STOCK CONTROL & CLEARANCE MODULE: VIEWS, MODALS & HANDLERS
    // =========================================================================

    // 1. Damaged & Held Stock View
    function renderDamagedStockView() {
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const list = (appState.damagedStock || []).filter(d => {
        if (appState.selectedWarehouseScope !== 'ALL' && d.warehouseId !== appState.selectedWarehouseScope) return false;
        if (appState.damagedFilterStatus !== 'ALL' && d.status !== appState.damagedFilterStatus) return false;
        if (appState.damagedSearchQuery) {
          const q = appState.damagedSearchQuery.toLowerCase();
          return d.id.toLowerCase().includes(q) || d.batchId.toLowerCase().includes(q) || d.commodity.toLowerCase().includes(q) || (d.binCode || '').toLowerCase().includes(q);
        }
        return true;
      });

      const allRecords = (appState.damagedStock || []).filter(d => appState.selectedWarehouseScope === 'ALL' || d.warehouseId === appState.selectedWarehouseScope);
      const totalAffectedBags = allRecords.reduce((sum, d) => sum + (d.affectedQuantity || 0), 0);
      const onHoldCount = allRecords.filter(d => d.status === 'ON_HOLD' || d.status === 'REPORTED').length;
      const disposalReqCount = allRecords.filter(d => d.status === 'DISPOSAL_REQUESTED').length;
      const recheckCount = allRecords.filter(d => d.status === 'RECHECK_REQUIRED').length;

      return `
        <div data-page="damaged-stock" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          ${renderPageHeader({
            breadcrumbGroup: 'Stock Control',
            title: 'Damaged & Held Stock',
            subtitle: 'Isolate, record, and monitor spoiled or questionable commodity stock. Held stock is strictly quarantined from FIFO allocation until authorized lab clearance.',
            badge: 'Stock Isolation Guard',
            badgeColor: 'rose',
            actions: `
              <button onclick="openReportDamageModal()" class="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Report Damaged Stock</span>
              </button>
              <button onclick="exportDamagedStockCsv()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export CSV</span>
              </button>
            `
          })}

          <!-- Summary KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Affected Stock</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-2xl font-black text-rose-700 font-mono tracking-tight">${totalAffectedBags} <span class="text-xs text-slate-500 font-sans font-medium">Bags</span></h3>
                  <span class="text-xs font-mono text-slate-400">(${(totalAffectedBags * 0.05).toFixed(1)} MT)</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Quarantined from FIFO dispatch</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quarantine Hold</p>
                <h3 class="text-2xl font-black text-amber-700 font-mono tracking-tight mt-1">${onHoldCount} <span class="text-xs text-slate-500 font-sans font-medium">Active</span></h3>
                <p class="text-[11px] text-amber-600 mt-1 font-medium">Awaiting lab / recheck action</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Disposal Requested</p>
                <h3 class="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">${disposalReqCount} <span class="text-xs text-slate-500 font-sans font-medium">Consignments</span></h3>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Pending Manager sign-off</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recheck Required</p>
                <h3 class="text-2xl font-black text-blue-700 font-mono tracking-tight mt-1">${recheckCount} <span class="text-xs text-slate-500 font-sans font-medium">Pending</span></h3>
                <p class="text-[11px] text-blue-600 mt-1 font-medium">Re-assay or bag restitching</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B4DA8]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </div>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="relative w-full sm:w-80">
              <svg class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                type="text"
                placeholder="Search by Batch, Bay, or Commodity..."
                value="${appState.damagedSearchQuery}"
                oninput="appState.damagedSearchQuery = this.value; renderCurrentRoute();"
                class="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B4DA8]/20 transition-all font-medium"
              />
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span class="text-xs font-semibold text-slate-500 shrink-0">Filter Status:</span>
              <select
                onchange="appState.damagedFilterStatus = this.value; renderCurrentRoute();"
                class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:bg-white"
              >
                <option value="ALL" ${appState.damagedFilterStatus === 'ALL' ? 'selected' : ''}>All Statuses (${allRecords.length})</option>
                <option value="ON_HOLD" ${appState.damagedFilterStatus === 'ON_HOLD' ? 'selected' : ''}>Quarantine Hold</option>
                <option value="DISPOSAL_REQUESTED" ${appState.damagedFilterStatus === 'DISPOSAL_REQUESTED' ? 'selected' : ''}>Disposal Requested</option>
                <option value="RECHECK_REQUIRED" ${appState.damagedFilterStatus === 'RECHECK_REQUIRED' ? 'selected' : ''}>Recheck Required</option>
                <option value="REPORTED" ${appState.damagedFilterStatus === 'REPORTED' ? 'selected' : ''}>Reported</option>
                <option value="APPROVED_FOR_RELEASE" ${appState.damagedFilterStatus === 'APPROVED_FOR_RELEASE' ? 'selected' : ''}>Approved for Release</option>
              </select>
            </div>
          </div>

          <!-- Damaged Stock Records Table -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th class="py-3 px-4">Record ID</th>
                    <th class="py-3 px-4">Target Batch</th>
                    <th class="py-3 px-4">Godown &amp; Bay</th>
                    <th class="py-3 px-4 text-right">Affected Qty</th>
                    <th class="py-3 px-4">Damage Reason</th>
                    <th class="py-3 px-4">Reported By</th>
                    <th class="py-3 px-4 text-center">Status</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${list.length === 0 ? `
                    <tr>
                      <td colspan="8" class="text-center py-12 text-slate-400">
                        <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p class="font-semibold text-slate-600">No damaged stock records found</p>
                        <p class="text-[11px] mt-0.5">All godown commodity batches are sound and eligible.</p>
                      </td>
                    </tr>
                  ` : list.map(d => {
                    const statusBadge = d.status === 'ON_HOLD'
                      ? '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200">Quarantine Hold</span>'
                      : d.status === 'DISPOSAL_REQUESTED'
                      ? '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800 border border-purple-200">Disposal Req</span>'
                      : d.status === 'RECHECK_REQUIRED'
                      ? '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800 border border-blue-200">Recheck Due</span>'
                      : '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">Released</span>';

                    return `
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">${d.id}</td>
                        <td class="py-3 px-4">
                          <button onclick="openBatchDrawer('${d.batchId}')" class="font-bold text-[#0B4DA8] hover:underline font-mono text-left">
                            ${d.batchId}
                          </button>
                          <span class="block text-[11px] text-slate-500 font-medium">${d.commodity}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-semibold text-slate-800 block">${d.godownName.split('(')[0]}</span>
                          <span class="font-mono text-[10px] text-slate-400">${d.binCode || 'Unassigned Bay'}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="font-black text-rose-700 font-mono text-sm">${d.affectedQuantity}</span>
                          <span class="text-[10px] text-slate-400 block">${(d.affectedQuantity * 0.05).toFixed(1)} MT</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-semibold text-slate-800 block">${d.damageReasonLabel}</span>
                          <span class="text-[10px] text-slate-500 line-clamp-1 truncate max-w-[200px]">${d.evidenceNotes}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-medium text-slate-800 block">${d.reportedByName}</span>
                          <span class="text-[10px] text-slate-400 font-mono">${d.dateReported}</span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          ${statusBadge}
                        </td>
                        <td class="py-3 px-4 text-right">
                          <button
                            onclick="openStockControlDrawer('DAMAGED', '${d.id}')"
                            class="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
                          >
                            View Dossier →
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // 2. Godown Clearance Orders View
    function renderClearanceOrdersView() {
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const orders = (appState.clearanceOrders || []).filter(c => {
        if (appState.selectedWarehouseScope !== 'ALL' && c.warehouseId !== appState.selectedWarehouseScope) return false;
        if (appState.clearanceFilterStatus !== 'ALL' && c.status !== appState.clearanceFilterStatus) return false;
        if (appState.clearanceSearchQuery) {
          const q = appState.clearanceSearchQuery.toLowerCase();
          return c.id.toLowerCase().includes(q) || c.godownBay.toLowerCase().includes(q) || c.assignedToName.toLowerCase().includes(q);
        }
        return true;
      });

      const allOrders = (appState.clearanceOrders || []).filter(c => appState.selectedWarehouseScope === 'ALL' || c.warehouseId === appState.selectedWarehouseScope);
      const activeOrdersCount = allOrders.filter(c => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
      const totalBagsToMove = allOrders.reduce((sum, c) => sum + (c.totalQuantity || 0), 0);
      const totalBagsMoved = allOrders.reduce((sum, c) => sum + (c.movedQuantity || 0), 0);
      const completedOrdersCount = allOrders.filter(c => c.status === 'COMPLETED').length;

      return `
        <div data-page="clearance-orders" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          ${renderPageHeader({
            breadcrumbGroup: 'Stock Control',
            title: 'Godown Clearance Orders',
            subtitle: 'Issue and supervise complete godown bay clearances for routine reorganization, new harvest intake space, or damaged stock segregation.',
            badge: 'Bay Clearance Protocol',
            badgeColor: 'amber',
            actions: isManager ? `
              <button onclick="openClearanceOrderModal()" class="px-4 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Issue Clearance Order</span>
              </button>
              <button onclick="exportClearanceLedgerCsv()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export Ledger</span>
              </button>
            ` : `
              <button onclick="exportClearanceLedgerCsv()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export Ledger</span>
              </button>
            `
          })}

          <!-- Summary KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Clearance Orders</p>
                <h3 class="text-2xl font-black text-amber-700 font-mono tracking-tight mt-1">${activeOrdersCount} <span class="text-xs text-slate-500 font-sans font-medium">In Flight</span></h3>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Bays currently undergoing movement</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scheduled Relocation</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-2xl font-black text-slate-900 font-mono tracking-tight">${totalBagsToMove} <span class="text-xs text-slate-500 font-sans font-medium">Bags</span></h3>
                  <span class="text-xs font-mono text-slate-400">(${(totalBagsToMove * 0.05).toFixed(1)} MT)</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Total authorized movement volume</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B4DA8]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Successfully Relocated</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-2xl font-black text-emerald-700 font-mono tracking-tight">${totalBagsMoved} <span class="text-xs text-slate-500 font-sans font-medium">Bags</span></h3>
                  <span class="text-xs font-bold text-emerald-600">(${totalBagsToMove > 0 ? Math.round((totalBagsMoved/totalBagsToMove)*100) : 0}%)</span>
                </div>
                <p class="text-[11px] text-emerald-600 mt-1 font-medium">Verified in target destinations</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bays Cleared &amp; Closed</p>
                <h3 class="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">${completedOrdersCount} <span class="text-xs text-slate-500 font-sans font-medium">Bays Ready</span></h3>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Cleaned and available for restock</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
              </div>
            </div>
          </div>

          <!-- Clearance Orders Grid -->
          <div class="space-y-4">
            ${orders.length === 0 ? `
              <div class="bg-white p-12 text-center rounded-2xl border border-slate-200/80">
                <p class="font-bold text-slate-700">No clearance orders match the criteria</p>
              </div>
            ` : orders.map(c => {
              const progressPct = c.totalQuantity > 0 ? Math.round((c.movedQuantity / c.totalQuantity) * 100) : 0;
              const isDone = c.status === 'COMPLETED';

              return `
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-sm text-slate-900">${c.id}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                        }">${c.status.replace('_', ' ')}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">${c.godownBay}</span>
                      </div>
                      <h4 class="font-bold text-slate-900 text-sm mt-1">${c.reasonLabel}</h4>
                      <p class="text-xs text-slate-500 mt-0.5">${c.instructions}</p>
                    </div>

                    <div class="text-right shrink-0">
                      <span class="text-xs text-slate-400 block">Lead Operator:</span>
                      <strong class="text-xs text-slate-800">${c.assignedToName}</strong>
                      <span class="text-[10px] text-rose-600 font-mono block mt-0.5">SLA: ${c.deadline}</span>
                    </div>
                  </div>

                  <!-- Live Movement Progress Bar -->
                  <div class="py-4 space-y-1.5">
                    <div class="flex justify-between items-center text-xs">
                      <span class="font-semibold text-slate-700">Clearance Checklist Progress:</span>
                      <span class="font-mono font-bold text-slate-900">${c.movedQuantity} / ${c.totalQuantity} Bags (${progressPct}%)</span>
                    </div>
                    <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-600' : 'bg-[#0B4DA8]'}" style="width: ${progressPct}%"></div>
                    </div>
                  </div>

                  <!-- Batch-by-Batch Manifest Table -->
                  <div class="border border-slate-100 rounded-xl overflow-hidden text-xs bg-slate-50/50">
                    <table class="w-full text-left">
                      <thead class="bg-slate-100/70 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th class="py-2 px-3">Batch</th>
                          <th class="py-2 px-3">Target Qty</th>
                          <th class="py-2 px-3">Resolution Action</th>
                          <th class="py-2 px-3">Designated Bay</th>
                          <th class="py-2 px-3 text-right">Status</th>
                          <th class="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        ${c.batches.map(b => `
                          <tr>
                            <td class="py-2 px-3 font-mono font-bold text-slate-900">${b.batchId} (${b.commodity})</td>
                            <td class="py-2 px-3 font-mono font-semibold">${b.quantity} Bags</td>
                            <td class="py-2 px-3 font-medium text-slate-700">${b.resolution.replace(/_/g, ' ')}</td>
                            <td class="py-2 px-3 font-mono text-[11px] text-slate-600">${b.destinationBay}</td>
                            <td class="py-2 px-3 text-right">
                              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }">${b.status}</span>
                            </td>
                            <td class="py-2 px-3 text-right">
                              ${b.status !== 'COMPLETED' ? `
                                <button
                                  onclick="recordClearanceBatchMove('${c.id}', '${b.batchId}')"
                                  class="px-2.5 py-1 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-lg font-bold text-[11px] cursor-pointer shadow-2xs"
                                >
                                  Confirm Move
                                </button>
                              ` : '<span class="text-emerald-700 font-bold text-xs">✓ Shifted</span>'}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>

                  <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Issued by ${c.createdBy} on ${c.createdAt}</span>
                    <button onclick="openStockControlDrawer('CLEARANCE', '${c.id}')" class="text-[#0B4DA8] hover:underline font-bold">
                      View Full Clearance Audit Log →
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // 3. Stock Transfer View
    function renderStockTransfersView() {
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const list = (appState.stockTransfers || []).filter(t => {
        if (appState.transferFilterStatus !== 'ALL' && t.status !== appState.transferFilterStatus) return false;
        if (appState.transferSearchQuery) {
          const q = appState.transferSearchQuery.toLowerCase();
          return t.id.toLowerCase().includes(q) || t.batchId.toLowerCase().includes(q) || (t.vehicleNo || '').toLowerCase().includes(q) || t.sourceWarehouseName.toLowerCase().includes(q);
        }
        return true;
      });

      const inTransitCount = (appState.stockTransfers || []).filter(t => t.status === 'IN_TRANSIT').length;
      const deliveredCount = (appState.stockTransfers || []).filter(t => t.status === 'DELIVERED').length;
      const totalVolume = (appState.stockTransfers || []).reduce((s, t) => s + (t.quantity || 0), 0);

      return `
        <div data-page="stock-transfers" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          ${renderPageHeader({
            breadcrumbGroup: 'Stock Control',
            title: 'Stock Transfer & Relocation',
            subtitle: 'Execute controlled inter-depot movements and bay transfers. System preserves original batch arrival timestamps and quality assay records.',
            badge: 'Inter-Depot Transit Ledger',
            badgeColor: 'blue',
            actions: `
              <button onclick="openStockTransferModal()" class="px-4 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>New Transfer Request</span>
              </button>
              <button onclick="exportStockTransfersCsv()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export CSV</span>
              </button>
            `
          })}

          <!-- Summary KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active In-Transit</p>
                <h3 class="text-2xl font-black text-sky-700 font-mono tracking-tight mt-1">${inTransitCount} <span class="text-xs text-slate-500 font-sans font-medium">Vehicles</span></h3>
                <p class="text-[11px] text-sky-600 mt-1 font-medium">Under GPS e-Lock tracking</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Transferred Volume</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-2xl font-black text-slate-900 font-mono tracking-tight">${totalVolume} <span class="text-xs text-slate-500 font-sans font-medium">Bags</span></h3>
                  <span class="text-xs font-mono text-slate-400">(${(totalVolume * 0.05).toFixed(1)} MT)</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Balanced across Godown network</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B4DA8]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivered &amp; Restocked</p>
                <h3 class="text-2xl font-black text-emerald-700 font-mono tracking-tight mt-1">${deliveredCount} <span class="text-xs text-slate-500 font-sans font-medium">Consignments</span></h3>
                <p class="text-[11px] text-emerald-600 mt-1 font-medium">Reconciled at destination</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>
          </div>

          <!-- Transfers Table -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th class="py-3 px-4">Transfer ID</th>
                    <th class="py-3 px-4">Batch &amp; Commodity</th>
                    <th class="py-3 px-4">Source Godown / Bay</th>
                    <th class="py-3 px-4">Destination Depot / Bay</th>
                    <th class="py-3 px-4 text-right">Quantity</th>
                    <th class="py-3 px-4">Vehicle &amp; Driver</th>
                    <th class="py-3 px-4 text-center">Status</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${list.map(t => {
                    const statusBadge = t.status === 'IN_TRANSIT'
                      ? '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">In Transit 🚚</span>'
                      : t.status === 'APPROVED'
                      ? '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">Approved</span>'
                      : t.status === 'DELIVERED'
                      ? '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">Delivered &amp; Restocked</span>'
                      : '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">Requested</span>';

                    return `
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">${t.id}</td>
                        <td class="py-3 px-4 font-bold text-slate-800">
                          ${t.batchId}
                          <span class="block text-[11px] text-slate-500 font-medium">${t.commodity}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-medium text-slate-800 block">${t.sourceWarehouseName.split('(')[0]}</span>
                          <span class="font-mono text-[10px] text-slate-400">${t.sourceBay}</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-medium text-slate-800 block">${t.destWarehouseName.split('(')[0]}</span>
                          <span class="font-mono text-[10px] text-slate-400">${t.destBay}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="font-mono font-black text-slate-900 text-sm">${t.quantity}</span>
                          <span class="text-[10px] text-slate-400 block">${(t.quantity * 0.05).toFixed(1)} MT</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-mono font-bold text-slate-800 block">${t.vehicleNo || 'Unassigned'}</span>
                          <span class="text-[10px] text-slate-500">${t.driverName || 'Depot Shuttle'}</span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          ${statusBadge}
                        </td>
                        <td class="py-3 px-4 text-right">
                          ${t.status === 'IN_TRANSIT' ? `
                            <button
                              onclick="confirmTransferReceive('${t.id}')"
                              class="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Confirm Receipt
                            </button>
                          ` : t.status === 'APPROVED' ? `
                            <button
                              onclick="confirmTransferDispatch('${t.id}')"
                              class="px-3 py-1 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Dispatch Vehicle
                            </button>
                          ` : `
                            <button
                              onclick="openStockControlDrawer('TRANSFER', '${t.id}')"
                              class="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
                            >
                              Track →
                            </button>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // 4. Physical Stock Verification View
    function renderStockVerificationView() {
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const sessions = appState.stockVerifications || [];

      const discrepanciesCount = sessions.filter(s => s.status === 'DISCREPANCY_DETECTED').length;
      const resolvedCount = sessions.filter(s => s.status === 'RESOLVED' || s.status === 'ADJUSTED').length;

      return `
        <div data-page="stock-verification" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          ${renderPageHeader({
            breadcrumbGroup: 'Stock Control',
            title: 'Physical Stock Verification',
            subtitle: 'Cycle count audits comparing system snapshot ledger records with physical godown stack counts. Discrepancies require formal Manager reconciliation.',
            badge: 'Audit & Reconciliation',
            badgeColor: 'emerald',
            actions: `
              <button onclick="openStockVerifyModal()" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Initiate Count Audit</span>
              </button>
              <button onclick="exportVerificationAuditCsv()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export CSV</span>
              </button>
            `
          })}

          <!-- Summary KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discrepancies Flagged</p>
                <h3 class="text-2xl font-black text-rose-700 font-mono tracking-tight mt-1">${discrepanciesCount} <span class="text-xs text-slate-500 font-sans font-medium">Variance Detected</span></h3>
                <p class="text-[11px] text-rose-600 mt-1 font-medium">Requires Manager Investigation</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Audit Reconciliation Rate</p>
                <h3 class="text-2xl font-black text-emerald-700 font-mono tracking-tight mt-1">98.3% <span class="text-xs text-slate-500 font-sans font-medium">Accuracy</span></h3>
                <p class="text-[11px] text-emerald-600 mt-1 font-medium">Tolerance within &plusmn;0.5% standard</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resolved Audits</p>
                <h3 class="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">${resolvedCount} <span class="text-xs text-slate-500 font-sans font-medium">Sessions Closed</span></h3>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Reconciled and signed-off</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B4DA8]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
          </div>

          <!-- Sessions Table -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th class="py-3 px-4">Audit ID</th>
                    <th class="py-3 px-4">Godown &amp; Bay</th>
                    <th class="py-3 px-4">Commodity</th>
                    <th class="py-3 px-4 text-center">System Snapshot</th>
                    <th class="py-3 px-4 text-center">Physical Count</th>
                    <th class="py-3 px-4 text-center">Variance (Bags / %)</th>
                    <th class="py-3 px-4">Auditor / Manager</th>
                    <th class="py-3 px-4 text-center">Status</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${sessions.map(s => {
                    const firstItem = s.items[0] || {};
                    const hasDiff = firstItem.differenceBags !== 0;

                    return `
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">${s.id}</td>
                        <td class="py-3 px-4">
                          <span class="font-bold text-slate-800 block">${s.warehouseName.split('(')[0]}</span>
                          <span class="font-mono text-[10px] text-slate-400">${s.godownBay}</span>
                        </td>
                        <td class="py-3 px-4 font-semibold text-slate-700">${s.commodity}</td>
                        <td class="py-3 px-4 text-center font-mono font-bold text-slate-900">${firstItem.systemSnapshotBags || '-'} Bags</td>
                        <td class="py-3 px-4 text-center font-mono font-bold text-slate-900">${firstItem.physicallyCountedBags || '-'} Bags</td>
                        <td class="py-3 px-4 text-center font-mono font-black ${
                          hasDiff ? 'text-rose-600' : 'text-emerald-700'
                        }">
                          ${hasDiff ? `${firstItem.differenceBags} (${firstItem.variancePct}%)` : '0 (0.0%)'}
                        </td>
                        <td class="py-3 px-4">
                          <span class="text-slate-800 font-medium block">Audited: ${s.countedByName || 'Pending'}</span>
                          <span class="text-[10px] text-slate-400">Verified: ${s.verifiedByName}</span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            hasDiff ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800'
                          }">${s.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          ${hasDiff && isManager && s.status !== 'ADJUSTED' ? `
                            <button
                              onclick="approveStockAdjustment('${s.id}')"
                              class="px-3 py-1 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Authorize Adjustment
                            </button>
                          ` : `
                            <button
                              onclick="openStockControlDrawer('VERIFICATION', '${s.id}')"
                              class="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
                            >
                              View Audit Sheet →
                            </button>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // 5. Disposal & Write-off Approvals View
    function renderDisposalApprovalsView() {
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const requests = (appState.disposalRequests || []).filter(d => {
        if (appState.disposalFilterStatus !== 'ALL' && d.status !== appState.disposalFilterStatus) return false;
        return true;
      });

      const pendingReviewCount = (appState.disposalRequests || []).filter(d => d.status === 'REQUESTED').length;
      const approvedCount = (appState.disposalRequests || []).filter(d => d.status === 'APPROVED').length;
      const totalWrittenOff = (appState.disposalRequests || []).filter(d => d.status === 'COMPLETED').reduce((s, d) => s + (d.quantity || 0), 0);

      return `
        <div data-page="disposal-approvals" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          ${renderPageHeader({
            breadcrumbGroup: 'Stock Control',
            title: 'Disposal & Write-off Approval',
            subtitle: 'Formal condemnation workflow for certified unrecoverable stock. Ledger deduction occurs exclusively upon recording certified completion.',
            badge: 'Condemnation & Write-off',
            badgeColor: 'rose',
            actions: `
              <button onclick="openDisposalRequestModal()" class="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Submit Disposal Request</span>
              </button>
              <button onclick="exportDisposalRegisterCsv()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>Export Register</span>
              </button>
            `
          })}

          <!-- Summary KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Manager Review</p>
                <h3 class="text-2xl font-black text-rose-700 font-mono tracking-tight mt-1">${pendingReviewCount} <span class="text-xs text-slate-500 font-sans font-medium">Requests</span></h3>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Awaiting decision dossier</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Write-offs</p>
                <h3 class="text-2xl font-black text-amber-700 font-mono tracking-tight mt-1">${approvedCount} <span class="text-xs text-slate-500 font-sans font-medium">Approved</span></h3>
                <p class="text-[11px] text-amber-600 mt-1 font-medium">Awaiting physical execution</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Executed &amp; Deducted</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-2xl font-black text-slate-900 font-mono tracking-tight">${totalWrittenOff} <span class="text-xs text-slate-500 font-sans font-medium">Bags</span></h3>
                  <span class="text-xs font-mono text-slate-400">(${(totalWrittenOff * 0.05).toFixed(1)} MT)</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">Written off from stock registers</p>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
            </div>
          </div>

          <!-- Disposal Requests Table -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th class="py-3 px-4">Dossier ID</th>
                    <th class="py-3 px-4">Batch &amp; Commodity</th>
                    <th class="py-3 px-4">Godown Bay</th>
                    <th class="py-3 px-4 text-right">Condemned Qty</th>
                    <th class="py-3 px-4">Inspection Ref &amp; Reason</th>
                    <th class="py-3 px-4">Approved Method</th>
                    <th class="py-3 px-4 text-center">Status</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${requests.map(d => {
                    const statusBadge = d.status === 'APPROVED'
                      ? '<span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200">Approved for Execution</span>'
                      : d.status === 'COMPLETED'
                      ? '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800">Executed &amp; Deducted</span>'
                      : '<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">Pending Review</span>';

                    return `
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">${d.id}</td>
                        <td class="py-3 px-4">
                          <span class="font-bold text-slate-800 block">${d.batchId}</span>
                          <span class="text-[11px] text-slate-500 font-medium">${d.commodity}</span>
                        </td>
                        <td class="py-3 px-4 font-mono text-slate-600">${d.godownBay}</td>
                        <td class="py-3 px-4 text-right">
                          <span class="font-mono font-black text-rose-700 text-sm">${d.quantity}</span>
                          <span class="text-[10px] text-slate-400 block">${(d.quantity * 0.05).toFixed(1)} MT</span>
                        </td>
                        <td class="py-3 px-4">
                          <span class="font-mono text-[10px] font-bold text-slate-700 block">${d.inspectionRef || 'Ref: Standard QA'}</span>
                          <span class="text-slate-600 line-clamp-1 max-w-[200px]">${d.reason}</span>
                        </td>
                        <td class="py-3 px-4 font-medium text-slate-700">${d.disposalMethod}</td>
                        <td class="py-3 px-4 text-center">
                          ${statusBadge}
                        </td>
                        <td class="py-3 px-4 text-right">
                          ${d.status === 'APPROVED' ? `
                            <button
                              onclick="completeDisposalExecution('${d.id}')"
                              class="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Record Disposal Execution
                            </button>
                          ` : d.status === 'REQUESTED' && isManager ? `
                            <button
                              onclick="reviewDisposalDecision('${d.id}', 'APPROVE')"
                              class="px-3 py-1 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Approve Write-off
                            </button>
                          ` : `
                            <button
                              onclick="openStockControlDrawer('DISPOSAL', '${d.id}')"
                              class="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs"
                            >
                              View Dossier →
                            </button>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // MODAL OPEN / CLOSE & INTERACTIVE HANDLERS
    // =========================================================================

    // Report Damaged Stock
    function openReportDamageModal() {
      const modal = document.getElementById('reportDamageModal');
      const batchSel = document.getElementById('dmgBatchId');
      if (!modal || !batchSel) return;

      const batches = getAuthorizedBatches().filter(b => b.availableQuantity > 0);
      batchSel.innerHTML = batches.map(b => `
        <option value="${b.id}">${b.id} — ${b.commodity} (${b.availableQuantity} Bags available in ${b.binCode || 'Unassigned Bay'})</option>
      `).join('');

      handleDamageBatchChange();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeReportDamageModal() {
      const modal = document.getElementById('reportDamageModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleDamageBatchChange() {
      const batchSel = document.getElementById('dmgBatchId');
      const snap = document.getElementById('dmgBatchSnapshot');
      if (!batchSel || !snap) return;

      const batch = (appState.batches || []).find(b => b.id === batchSel.value);
      if (!batch) return;

      snap.innerHTML = `
        <div class="flex justify-between items-center text-xs">
          <span class="font-bold text-slate-800">${batch.id} — ${batch.commodity} (${batch.supplier || 'FCI Depot'})</span>
          <span class="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">${batch.binCode || 'Bay Unassigned'}</span>
        </div>
        <div class="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
          <span>Total: <strong>${batch.totalQuantity}</strong> Bags</span>
          <span>Sound Available: <strong class="text-emerald-700">${Math.max(0, (batch.availableQuantity || 0) - (batch.damagedQuantity || 0))}</strong> Bags</span>
          <span>Already Damaged: <strong class="text-rose-600">${batch.damagedQuantity || 0}</strong> Bags</span>
        </div>
      `;
    }

    function handleReportDamageSubmit(e) {
      e.preventDefault();
      const user = appState.currentUser;
      const batchId = document.getElementById('dmgBatchId').value;
      const qty = parseInt(document.getElementById('dmgQuantity').value, 10);
      const reason = document.getElementById('dmgReason').value;
      const notes = document.getElementById('dmgNotes').value;

      const batch = (appState.batches || []).find(b => b.id === batchId);
      if (!batch) return;

      const soundAvail = Math.max(0, (batch.availableQuantity || 0) - (batch.damagedQuantity || 0));
      if (qty > soundAvail) {
        alert('Reported damaged quantity cannot exceed current sound available bags (' + soundAvail + ').');
        return;
      }

      // Track partial damaged quantity
      batch.damagedQuantity = (batch.damagedQuantity || 0) + qty;

      const recordId = 'DMG-2025-00' + ((appState.damagedStock || []).length + 1);
      const record = {
        id: recordId,
        batchId: batch.id,
        commodity: batch.commodity,
        warehouseId: batch.warehouseId || (user ? user.warehouseId : 'GDN-NGP-01'),
        godownName: batch.warehouseId === 'GDN-PUN-02' ? 'Pune Buffer Depot' : 'Central Food Godown, Nagpur',
        binCode: batch.binCode || 'BAY-NGP-01-BIN-01',
        affectedQuantity: qty,
        unit: 'Bags',
        damageReason: reason,
        damageReasonLabel: reason.replace(/_/g, ' ').title || reason,
        dateReported: new Date().toISOString().slice(0, 16).replace('T', ' '),
        reportedById: user ? user.id : 'u-admin-ngp',
        reportedByName: user ? user.fullName : 'Ramesh Patil',
        evidenceNotes: notes,
        inspectionFindings: null,
        status: 'ON_HOLD',
        assignedTaskId: null,
        resolutionHistory: [
          { status: 'REPORTED', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '), user: user ? user.fullName : 'Operator', notes: 'Damage report logged: ' + notes },
          { status: 'ON_HOLD', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '), user: 'System Auto-Lock', notes: 'Affected stock quarantined from FIFO allocation.' }
        ]
      };

      if (!appState.damagedStock) appState.damagedStock = [];
      appState.damagedStock.unshift(record);

      // Audit Log
      if (!appState.auditLogs) appState.auditLogs = [];
      appState.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        user: user ? user.fullName : 'Operator',
        action: 'REPORT_DAMAGED_STOCK',
        resource: 'Batch ' + batch.id + ' (' + qty + ' Bags)',
        status: 'SUCCESS'
      });

      // Notify Manager
      if (!appState.notifications) appState.notifications = [];
      appState.notifications.unshift({
        id: 'notif-' + Date.now(),
        title: '⚠️ Damaged Stock Logged: Batch ' + batch.id,
        message: (user ? user.fullName : 'Operator') + ' reported ' + qty + ' bags of ' + batch.commodity + ' under quarantine hold in ' + (batch.binCode || 'Bay') + '.',
        timestamp: 'Just now',
        type: 'WARNING',
        isRead: false,
        targetRole: 'MANAGER',
        batchId: batch.id
      });

      saveState();
      closeReportDamageModal();
      renderSidebar();
      renderCurrentRoute();
      showToast('Quarantine hold recorded for Batch ' + batch.id + ' (' + qty + ' bags)');
    }

    // Clearance Order Modal
    function openClearanceOrderModal() {
      const modal = document.getElementById('clearanceOrderModal');
      const whSel = document.getElementById('clrWarehouse');
      const opSel = document.getElementById('clrOperator');
      if (!modal || !whSel) return;

      whSel.innerHTML = `
        <option value="GDN-NGP-01">Central Food Godown, Nagpur (Surajpur Depot)</option>
        <option value="GDN-PUN-02">Pune Buffer Depot (Hadapsar Central)</option>
      `;

      if (opSel) {
        const users = (appState.users || []).filter(u => u.role === 'WAREHOUSE_ADMIN');
        opSel.innerHTML = users.map(u => `
          <option value="${u.id}">${u.fullName} (${u.warehouseName ? u.warehouseName.split('(')[0] : 'Operator'})</option>
        `).join('');
      }

      handleClearanceDepotChange();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeClearanceOrderModal() {
      const modal = document.getElementById('clearanceOrderModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleClearanceDepotChange() {
      const whSel = document.getElementById('clrWarehouse');
      const baySel = document.getElementById('clrBay');
      if (!whSel || !baySel) return;

      const wh = whSel.value;
      const bays = (appState.bins || []).filter(b => (b.warehouseId || (b.code.includes('PUN') ? 'GDN-PUN-02' : 'GDN-NGP-01')) === wh);
      baySel.innerHTML = bays.map(b => `<option value="${b.code}">${b.code} (${b.name || b.code})</option>`).join('');

      handleClearanceBayChange();
    }

    function handleClearanceBayChange() {
      const baySel = document.getElementById('clrBay');
      const listEl = document.getElementById('clrBayBatchesList');
      const badge = document.getElementById('clrBaySummaryBadge');
      if (!baySel || !listEl) return;

      const bayCode = baySel.value;
      const batchesInBay = (appState.batches || []).filter(b => b.binCode === bayCode);

      if (batchesInBay.length === 0) {
        badge.textContent = '0 Batches (Bay Sound)';
        listEl.innerHTML = '<p class="text-xs text-slate-400 italic">No batches currently registered in this storage bay.</p>';
      } else {
        const totalBags = batchesInBay.reduce((s, b) => s + (b.availableQuantity || 0), 0);
        badge.textContent = batchesInBay.length + ' Batches (' + totalBags + ' Bags)';
        listEl.innerHTML = batchesInBay.map(b => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
            <div>
              <span class="font-mono font-bold text-slate-900">${b.id}</span>
              <span class="text-slate-600 font-medium ml-1.5">${b.commodity}</span>
              <span class="text-[10px] text-slate-400 ml-2 font-mono">Status: ${b.qualityStatus}</span>
            </div>
            <div class="font-mono font-bold text-slate-800">
              ${b.availableQuantity} Bags
            </div>
          </div>
        `).join('');
      }
    }

    function handleClearanceOrderSubmit(e) {
      e.preventDefault();
      const user = appState.currentUser;
      const whId = document.getElementById('clrWarehouse').value;
      const bayCode = document.getElementById('clrBay').value;
      const reason = document.getElementById('clrReason').value;
      const priority = document.getElementById('clrPriority').value;
      const deadline = document.getElementById('clrDeadline').value;
      const operatorSel = document.getElementById('clrOperator');
      const destBay = document.getElementById('clrDestBay').value;
      const instructions = document.getElementById('clrInstructions').value;

      const batchesInBay = (appState.batches || []).filter(b => b.binCode === bayCode);
      const totalQty = batchesInBay.reduce((s, b) => s + (b.availableQuantity || 0), 0);

      const orderId = 'CLR-2025-00' + ((appState.clearanceOrders || []).length + 1);
      const newOrder = {
        id: orderId,
        warehouseId: whId,
        warehouseName: whId === 'GDN-PUN-02' ? 'Pune Buffer Depot' : 'Central Food Godown, Nagpur',
        godownBay: bayCode,
        reason: reason,
        reasonLabel: reason.replace(/_/g, ' ').title || reason,
        priority: priority,
        deadline: deadline.replace('T', ' '),
        assignedToId: operatorSel.value,
        assignedToName: operatorSel.options[operatorSel.selectedIndex].text.split('(')[0].trim(),
        instructions: instructions || 'Clear all registered stock to designated destination zone.',
        totalBatches: batchesInBay.length,
        totalQuantity: totalQty > 0 ? totalQty : 25,
        movedQuantity: 0,
        status: 'ASSIGNED',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        createdBy: user ? user.fullName : 'Aayush Tripathi',
        batches: batchesInBay.map(b => ({
          batchId: b.id,
          commodity: b.commodity,
          quantity: b.availableQuantity,
          resolution: 'MOVE_TO_BAY',
          destinationBay: destBay,
          movedQuantity: 0,
          status: 'PENDING'
        }))
      };

      if (!appState.clearanceOrders) appState.clearanceOrders = [];
      appState.clearanceOrders.unshift(newOrder);

      // In-app Notification to Operator
      if (!appState.notifications) appState.notifications = [];
      appState.notifications.unshift({
        id: 'notif-' + Date.now(),
        title: '📦 Clearance Order ' + orderId + ' Assigned',
        message: 'Clearance order issued for Bay ' + bayCode + ' (' + newOrder.totalQuantity + ' bags). Deadline: ' + newOrder.deadline,
        timestamp: 'Just now',
        type: 'INFO',
        isRead: false,
        targetRole: 'OPERATOR',
        userId: operatorSel.value
      });

      saveState();
      closeClearanceOrderModal();
      renderSidebar();
      renderCurrentRoute();
      showToast('Clearance order ' + orderId + ' issued successfully');
    }

    function recordClearanceBatchMove(clrId, batchId) {
      const order = (appState.clearanceOrders || []).find(c => c.id === clrId);
      if (!order) return;

      const batchItem = order.batches.find(b => b.batchId === batchId);
      if (!batchItem) return;

      batchItem.movedQuantity = batchItem.quantity;
      batchItem.status = 'COMPLETED';

      // Update actual batch binCode in inventory
      const realBatch = (appState.batches || []).find(b => b.id === batchId);
      if (realBatch && batchItem.destinationBay) {
        realBatch.binCode = batchItem.destinationBay;
      }

      order.movedQuantity = order.batches.reduce((s, b) => s + (b.movedQuantity || 0), 0);
      if (order.movedQuantity >= order.totalQuantity) {
        order.status = 'COMPLETED';
      } else {
        order.status = 'PARTIALLY_COMPLETED';
      }

      saveState();
      renderCurrentRoute();
      showToast('Batch ' + batchId + ' shifted to ' + batchItem.destinationBay);
    }

    // Stock Transfer Modal
    function openStockTransferModal() {
      const modal = document.getElementById('stockTransferModal');
      const srcWh = document.getElementById('trfSourceWh');
      const destWh = document.getElementById('trfDestWh');
      const batchSel = document.getElementById('trfBatchId');
      if (!modal || !srcWh) return;

      srcWh.innerHTML = `
        <option value="GDN-NGP-01">Central Food Godown, Nagpur (Surajpur Depot)</option>
        <option value="GDN-PUN-02">Pune Buffer Depot (Hadapsar Central)</option>
      `;

      destWh.innerHTML = `
        <option value="GDN-PUN-02">Pune Buffer Depot (Hadapsar Central)</option>
        <option value="GDN-NGP-01">Central Food Godown, Nagpur (Surajpur Depot)</option>
      `;

      handleTransferSourceChange();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeStockTransferModal() {
      const modal = document.getElementById('stockTransferModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleTransferSourceChange() {
      const srcWh = document.getElementById('trfSourceWh');
      const batchSel = document.getElementById('trfBatchId');
      if (!srcWh || !batchSel) return;

      const wh = srcWh.value;
      const batches = (appState.batches || []).filter(b => 
        (b.warehouseId || (b.id === 'B009' || b.id === 'B010' ? 'GDN-PUN-02' : 'GDN-NGP-01')) === wh &&
        (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') &&
        b.availableQuantity > 0
      );

      batchSel.innerHTML = batches.map(b => `
        <option value="${b.id}">${b.id} — ${b.commodity} (${b.availableQuantity} sound bags in ${b.binCode || 'Bay'})</option>
      `).join('');

      handleTransferBatchChange();
    }

    function handleTransferBatchChange() {
      const batchSel = document.getElementById('trfBatchId');
      const notice = document.getElementById('trfBatchNotice');
      if (!batchSel || !notice) return;

      const batch = (appState.batches || []).find(b => b.id === batchSel.value);
      if (!batch) return;

      const soundAvail = Math.max(0, (batch.availableQuantity || 0) - (batch.damagedQuantity || 0));
      notice.innerHTML = `
        <strong>Sound Dispatch-Eligible Stock:</strong> ${soundAvail} Bags available for inter-depot relocation from <strong>${batch.binCode || 'Bay'}</strong>.
      `;
    }

    function handleStockTransferSubmit(e) {
      e.preventDefault();
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const srcWh = document.getElementById('trfSourceWh').value;
      const destWh = document.getElementById('trfDestWh').value;
      const destBay = document.getElementById('trfDestBay').value;
      const batchId = document.getElementById('trfBatchId').value;
      const qty = parseInt(document.getElementById('trfQuantity').value, 10);
      const vehicle = document.getElementById('trfVehicle').value;
      const driver = document.getElementById('trfDriver').value;
      const reason = document.getElementById('trfReason').value;

      if (srcWh === destWh) {
        alert('Source and destination warehouse must be different for inter-depot stock transfer.');
        return;
      }

      const batch = (appState.batches || []).find(b => b.id === batchId);
      if (!batch) return;

      const soundAvail = Math.max(0, (batch.availableQuantity || 0) - (batch.damagedQuantity || 0));
      if (qty > soundAvail) {
        alert('Transfer quantity exceeds sound available stock (' + soundAvail + ' bags).');
        return;
      }

      // Mark in-transit quantity on batch
      batch.availableQuantity = Math.max(0, batch.availableQuantity - qty);
      batch.inTransitQuantity = (batch.inTransitQuantity || 0) + qty;

      const trfId = 'TRF-2025-00' + ((appState.stockTransfers || []).length + 1);
      const transfer = {
        id: trfId,
        sourceWarehouseId: srcWh,
        sourceWarehouseName: srcWh === 'GDN-PUN-02' ? 'Pune Buffer Depot' : 'Central Food Godown, Nagpur',
        sourceBay: batch.binCode || 'BAY-NGP-01-BIN-01',
        destWarehouseId: destWh,
        destWarehouseName: destWh === 'GDN-PUN-02' ? 'Pune Buffer Depot' : 'Central Food Godown, Nagpur',
        destBay: destBay,
        batchId: batch.id,
        commodity: batch.commodity,
        quantity: qty,
        unit: 'Bags',
        reason: reason,
        requestedById: user ? user.id : 'u-manager-01',
        requestedByName: user ? user.fullName : 'Aayush Tripathi',
        assignedOperatorId: 'u-admin-ngp',
        assignedOperatorName: 'Ramesh Patil',
        approvalStatus: isManager ? 'APPROVED' : 'REQUESTED',
        approvedById: isManager ? user.id : null,
        approvedAt: isManager ? new Date().toISOString().slice(0, 16).replace('T', ' ') : null,
        dispatchedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        dispatchConfirmedBy: user ? user.fullName : 'Ramesh Patil',
        vehicleNo: vehicle || 'MH-31-CB-9021',
        driverName: driver || 'Mohan Lal',
        receivedAt: null,
        receivedBy: null,
        status: 'IN_TRANSIT',
        remarks: reason
      };

      if (!appState.stockTransfers) appState.stockTransfers = [];
      appState.stockTransfers.unshift(transfer);

      saveState();
      closeStockTransferModal();
      renderSidebar();
      renderCurrentRoute();
      showToast('Stock Transfer ' + trfId + ' initiated. Stock marked In-Transit.');
    }

    function confirmTransferDispatch(trfId) {
      const user = appState.currentUser;
      const transfer = (appState.stockTransfers || []).find(t => t.id === trfId);
      if (!transfer) return;

      transfer.status = 'IN_TRANSIT';
      transfer.dispatchedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      transfer.dispatchConfirmedBy = user ? user.fullName : 'Operator';

      saveState();
      renderCurrentRoute();
      showToast('Transfer ' + trfId + ' dispatched under vehicle ' + transfer.vehicleNo);
    }

    function confirmTransferReceive(trfId) {
      const user = appState.currentUser;
      const transfer = (appState.stockTransfers || []).find(t => t.id === trfId);
      if (!transfer) return;

      transfer.status = 'DELIVERED';
      transfer.receivedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      transfer.receivedBy = user ? user.fullName : 'Receiving Operator';

      // Update source batch
      const sourceBatch = (appState.batches || []).find(b => b.id === transfer.batchId);
      if (sourceBatch) {
        sourceBatch.inTransitQuantity = Math.max(0, (sourceBatch.inTransitQuantity || 0) - transfer.quantity);
        sourceBatch.totalQuantity = Math.max(0, sourceBatch.totalQuantity - transfer.quantity);
      }

      // Create or increment destination batch while preserving original batch identity & receipt date
      const destBatchId = transfer.batchId;
      let destBatch = (appState.batches || []).find(b => b.id === destBatchId && b.warehouseId === transfer.destWarehouseId);
      if (destBatch) {
        destBatch.availableQuantity = (destBatch.availableQuantity || 0) + transfer.quantity;
        destBatch.totalQuantity = (destBatch.totalQuantity || 0) + transfer.quantity;
      } else {
        appState.batches.push({
          id: destBatchId,
          commodity: transfer.commodity,
          arrivalDate: sourceBatch ? sourceBatch.arrivalDate : '10-01-2025',
          totalQuantity: transfer.quantity,
          availableQuantity: transfer.quantity,
          damagedQuantity: 0,
          inTransitQuantity: 0,
          qualityStatus: sourceBatch ? sourceBatch.qualityStatus : 'Eligible',
          supplier: sourceBatch ? sourceBatch.supplier : 'Inter-depot Transfer',
          binCode: transfer.destBay,
          warehouseId: transfer.destWarehouseId,
          notes: 'Received via Transfer ' + transfer.id + ' from ' + transfer.sourceWarehouseName
        });
      }

      saveState();
      renderCurrentRoute();
      showToast('Consignment ' + trfId + ' received & restocked in ' + transfer.destWarehouseName);
    }

    // Physical Verification Modal
    function openStockVerifyModal() {
      const modal = document.getElementById('stockVerifyModal');
      const whSel = document.getElementById('verWarehouse');
      if (!modal || !whSel) return;

      whSel.innerHTML = `
        <option value="GDN-NGP-01">Central Food Godown, Nagpur (Surajpur Depot)</option>
        <option value="GDN-PUN-02">Pune Buffer Depot (Hadapsar Central)</option>
      `;

      handleVerifyDepotChange();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeStockVerifyModal() {
      const modal = document.getElementById('stockVerifyModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleVerifyDepotChange() {
      const whSel = document.getElementById('verWarehouse');
      const baySel = document.getElementById('verBay');
      if (!whSel || !baySel) return;

      const wh = whSel.value;
      const bays = (appState.bins || []).filter(b => (b.warehouseId || (b.code.includes('PUN') ? 'GDN-PUN-02' : 'GDN-NGP-01')) === wh);
      baySel.innerHTML = bays.map(b => `<option value="${b.code}">${b.code} (${b.name || b.code})</option>`).join('');

      handleVerifyBayChange();
    }

    function handleVerifyBayChange() {
      const baySel = document.getElementById('verBay');
      const tableEl = document.getElementById('verBatchesTable');
      if (!baySel || !tableEl) return;

      const bayCode = baySel.value;
      const batchesInBay = (appState.batches || []).filter(b => b.binCode === bayCode);

      if (batchesInBay.length === 0) {
        tableEl.innerHTML = '<p class="p-4 text-xs text-slate-400 italic">No batches stored in this bay.</p>';
      } else {
        tableEl.innerHTML = `
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase">
              <tr>
                <th class="py-2 px-3">Batch</th>
                <th class="py-2 px-3 text-center">System Snapshot</th>
                <th class="py-2 px-3 text-center">Physical Count (Bags)</th>
                <th class="py-2 px-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${batchesInBay.map(b => `
                <tr>
                  <td class="py-2 px-3 font-mono font-bold text-slate-800">${b.id} (${b.commodity})</td>
                  <td class="py-2 px-3 text-center font-mono font-bold">${b.availableQuantity} Bags</td>
                  <td class="py-2 px-3 text-center">
                    <input
                      type="number"
                      id="cnt_${b.id}"
                      data-snapshot="${b.availableQuantity}"
                      oninput="updateVerifyRowDiff('${b.id}')"
                      placeholder="${b.availableQuantity}"
                      class="w-24 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-center text-slate-900"
                    />
                  </td>
                  <td class="py-2 px-3 text-right font-mono font-black" id="diff_${b.id}">0 Bags</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    function updateVerifyRowDiff(batchId) {
      const input = document.getElementById('cnt_' + batchId);
      const diffEl = document.getElementById('diff_' + batchId);
      if (!input || !diffEl) return;

      const snap = parseInt(input.getAttribute('data-snapshot'), 10) || 0;
      const counted = input.value === '' ? snap : parseInt(input.value, 10);
      const diff = counted - snap;

      if (diff === 0) {
        diffEl.textContent = '0 Bags';
        diffEl.className = 'py-2 px-3 text-right font-mono font-black text-emerald-600';
      } else if (diff < 0) {
        diffEl.textContent = diff + ' Bags (Shortage)';
        diffEl.className = 'py-2 px-3 text-right font-mono font-black text-rose-600';
      } else {
        diffEl.textContent = '+' + diff + ' Bags (Excess)';
        diffEl.className = 'py-2 px-3 text-right font-mono font-black text-blue-600';
      }
    }

    function handleStockVerifySubmit(e) {
      e.preventDefault();
      const user = appState.currentUser;
      const whId = document.getElementById('verWarehouse').value;
      const bayCode = document.getElementById('verBay').value;
      const notes = document.getElementById('verDiscrepancyNotes').value;

      const batchesInBay = (appState.batches || []).filter(b => b.binCode === bayCode);
      let hasDiscrepancy = false;
      const items = batchesInBay.map(b => {
        const input = document.getElementById('cnt_' + b.id);
        const counted = input && input.value !== '' ? parseInt(input.value, 10) : b.availableQuantity;
        const diff = counted - b.availableQuantity;
        if (diff !== 0) hasDiscrepancy = true;

        return {
          batchId: b.id,
          commodity: b.commodity,
          systemSnapshotBags: b.availableQuantity,
          physicallyCountedBags: counted,
          differenceBags: diff,
          variancePct: b.availableQuantity > 0 ? parseFloat(((diff / b.availableQuantity) * 100).toFixed(2)) : 0,
          discrepancyReason: diff !== 0 ? notes : null,
          status: diff !== 0 ? 'PENDING_MANAGER_APPROVAL' : 'MATCHED',
          notes: notes
        };
      });

      const verId = 'VER-2025-00' + ((appState.stockVerifications || []).length + 1);
      const session = {
        id: verId,
        warehouseId: whId,
        warehouseName: whId === 'GDN-PUN-02' ? 'Pune Buffer Depot' : 'Central Food Godown, Nagpur',
        godownBay: bayCode,
        commodity: batchesInBay[0] ? batchesInBay[0].commodity : 'Grain',
        scheduledDate: new Date().toISOString().slice(0, 10),
        countedById: user ? user.id : 'u-admin-ngp',
        countedByName: user ? user.fullName : 'Ramesh Patil',
        verifiedById: user && user.role === 'MANAGER' ? user.id : 'u-manager-01',
        verifiedByName: user && user.role === 'MANAGER' ? user.fullName : 'Aayush Tripathi',
        status: hasDiscrepancy ? 'DISCREPANCY_DETECTED' : 'RESOLVED',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        items: items,
        managerDecision: null
      };

      if (!appState.stockVerifications) appState.stockVerifications = [];
      appState.stockVerifications.unshift(session);

      if (hasDiscrepancy) {
        if (!appState.notifications) appState.notifications = [];
        appState.notifications.unshift({
          id: 'notif-' + Date.now(),
          title: '⚠️ Stock Discrepancy Flagged in ' + bayCode,
          message: 'Physical stock count in ' + bayCode + ' showed variance. Manager reconciliation review required.',
          timestamp: 'Just now',
          type: 'WARNING',
          isRead: false,
          targetRole: 'MANAGER'
        });
      }

      saveState();
      closeStockVerifyModal();
      renderSidebar();
      renderCurrentRoute();
      showToast('Stock verification audit submitted' + (hasDiscrepancy ? ' (Discrepancy Flagged)' : ' (All Balanced)'));
    }

    function approveStockAdjustment(verId) {
      const user = appState.currentUser;
      if (!user || user.role !== 'MANAGER') {
        alert('Only Managers can authorize stock balance adjustments.');
        return;
      }

      const session = (appState.stockVerifications || []).find(s => s.id === verId);
      if (!session) return;

      session.items.forEach(item => {
        const batch = (appState.batches || []).find(b => b.id === item.batchId);
        if (batch && item.differenceBags !== 0) {
          batch.availableQuantity = Math.max(0, batch.availableQuantity + item.differenceBags);
          batch.totalQuantity = Math.max(0, batch.totalQuantity + item.differenceBags);
        }
        item.status = 'ADJUSTED';
      });

      session.managerDecision = 'ADJUST_APPROVED';
      session.status = 'ADJUSTED';

      saveState();
      renderCurrentRoute();
      showToast('Stock balance adjustment approved by Manager');
    }

    // Disposal Requests
    function openDisposalRequestModal() {
      const modal = document.getElementById('disposalRequestModal');
      const batchSel = document.getElementById('dspBatchId');
      if (!modal || !batchSel) return;

      const batches = (appState.batches || []).filter(b => (b.damagedQuantity || 0) > 0 || b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected');
      batchSel.innerHTML = batches.map(b => `
        <option value="${b.id}">${b.id} — ${b.commodity} (${b.damagedQuantity || b.availableQuantity} bags condemned/quarantined in ${b.binCode || 'Bay'})</option>
      `).join('');

      handleDisposalBatchChange();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeDisposalRequestModal() {
      const modal = document.getElementById('disposalRequestModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleDisposalBatchChange() {
      const batchSel = document.getElementById('dspBatchId');
      const notice = document.getElementById('dspBatchNotice');
      if (!batchSel || !notice) return;

      const batch = (appState.batches || []).find(b => b.id === batchSel.value);
      if (!batch) return;

      notice.innerHTML = `
        <strong>Condemned Candidate:</strong> ${batch.id} has ${batch.damagedQuantity || batch.availableQuantity} bags under quarantine hold in <strong>${batch.binCode || 'Bay'}</strong>. Status: ${batch.qualityStatus}.
      `;
    }

    function handleDisposalRequestSubmit(e) {
      e.preventDefault();
      const user = appState.currentUser;
      const batchId = document.getElementById('dspBatchId').value;
      const qty = parseInt(document.getElementById('dspQuantity').value, 10);
      const ref = document.getElementById('dspInspectionRef').value;
      const method = document.getElementById('dspMethod').value;
      const reason = document.getElementById('dspReason').value;

      const batch = (appState.batches || []).find(b => b.id === batchId);
      if (!batch) return;

      const dspId = 'DSP-2025-00' + ((appState.disposalRequests || []).length + 1);
      const request = {
        id: dspId,
        batchId: batch.id,
        commodity: batch.commodity,
        warehouseId: batch.warehouseId || 'GDN-NGP-01',
        warehouseName: batch.warehouseId === 'GDN-PUN-02' ? 'Pune Buffer Depot' : 'Central Food Godown, Nagpur',
        godownBay: batch.binCode || 'BAY-NGP-01-BIN-07',
        quantity: qty,
        unit: 'Bags',
        inspectionRef: ref,
        reason: reason,
        evidenceNotes: reason,
        requestedById: user ? user.id : 'u-quality-01',
        requestedByName: user ? user.fullName : 'Vikram Joshi',
        approvedById: null,
        approvedByName: null,
        approvedAt: null,
        status: 'REQUESTED',
        disposalMethod: method.replace(/_/g, ' ').title || method,
        disposalCertificateRef: null,
        executedAt: null,
        executedBy: null,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        remarks: reason
      };

      if (!appState.disposalRequests) appState.disposalRequests = [];
      appState.disposalRequests.unshift(request);

      saveState();
      closeDisposalRequestModal();
      renderSidebar();
      renderCurrentRoute();
      showToast('Disposal dossier ' + dspId + ' submitted for Manager approval');
    }

    function reviewDisposalDecision(dspId, decision) {
      const user = appState.currentUser;
      if (!user || user.role !== 'MANAGER') {
        alert('Only Godown Managers can approve disposal write-offs.');
        return;
      }

      const request = (appState.disposalRequests || []).find(d => d.id === dspId);
      if (!request) return;

      // Separation of duties enforcement
      if (request.requestedById === user.id) {
        alert('Separation of Duties Policy: You cannot approve a disposal request that you originated.');
        return;
      }

      request.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      request.approvedById = user.id;
      request.approvedByName = user.fullName;
      request.approvedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

      saveState();
      renderCurrentRoute();
      showToast('Disposal request ' + dspId + ' ' + request.status.toLowerCase());
    }

    function completeDisposalExecution(dspId) {
      const user = appState.currentUser;
      const cert = prompt('Enter Certified Disposal / Destruction Certificate Reference Number (e.g. CERT-BIO-9912):');
      if (!cert) return;

      const request = (appState.disposalRequests || []).find(d => d.id === dspId);
      if (!request) return;

      request.status = 'COMPLETED';
      request.executedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      request.executedBy = user ? user.fullName : 'Authorized Execution Officer';
      request.disposalCertificateRef = cert;

      // Deduct stock from batch
      const batch = (appState.batches || []).find(b => b.id === request.batchId);
      if (batch) {
        batch.totalQuantity = Math.max(0, batch.totalQuantity - request.quantity);
        batch.availableQuantity = Math.max(0, batch.availableQuantity - request.quantity);
        batch.damagedQuantity = Math.max(0, (batch.damagedQuantity || 0) - request.quantity);
      }

      // Record in immutable audit log
      if (!appState.auditLogs) appState.auditLogs = [];
      appState.auditLogs.unshift({
        id: 'aud-' + Date.now(),
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        user: user ? user.fullName : 'Manager',
        action: 'EXECUTE_STOCK_DISPOSAL',
        resource: 'Batch ' + request.batchId + ' (' + request.quantity + ' Bags Written Off)',
        status: 'SUCCESS'
      });

      saveState();
      renderSidebar();
      renderCurrentRoute();
      showToast('Disposal ' + dspId + ' completed. ' + request.quantity + ' bags permanently written off from stock ledger.');
    }

    // Unified Stock Control Detail Drawer
    function openStockControlDrawer(type, id) {
      const drawer = document.getElementById('stockControlDrawer');
      const content = document.getElementById('stockControlDrawerContent');
      if (!drawer || !content) return;

      if (type === 'DAMAGED') {
        const item = (appState.damagedStock || []).find(d => d.id === id);
        if (!item) return;

        content.innerHTML = `
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Damaged Stock Quarantine Dossier</span>
              <h3 class="text-base font-bold text-slate-900 mt-1">${item.id} — Batch ${item.batchId}</h3>
            </div>
            <button onclick="closeStockControlDrawer()" class="p-1 rounded-lg text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div class="py-5 space-y-5 text-xs">
            <div class="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div><span class="text-slate-400 block">Commodity:</span><strong>${item.commodity}</strong></div>
              <div><span class="text-slate-400 block">Affected Quantity:</span><strong class="text-rose-700 text-sm">${item.affectedQuantity} Bags (${(item.affectedQuantity*0.05).toFixed(1)} MT)</strong></div>
              <div><span class="text-slate-400 block">Storage Bay:</span><strong>${item.binCode}</strong></div>
              <div><span class="text-slate-400 block">Current Status:</span><strong class="text-amber-700">${item.status.replace(/_/g, ' ')}</strong></div>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 mb-1">Damage Reason &amp; Findings</h4>
              <p class="text-slate-700 p-3 bg-white border border-slate-200 rounded-xl font-medium">${item.evidenceNotes}</p>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 mb-2">Resolution Audit Timeline</h4>
              <div class="space-y-2 border-l-2 border-slate-200 pl-4">
                ${(item.resolutionHistory || []).map(h => `
                  <div class="relative">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#0B4DA8] absolute -left-[21px] top-1"></span>
                    <strong class="text-slate-900 block">${h.status}</strong>
                    <span class="text-[10px] text-slate-400 font-mono">${h.timestamp} by ${h.user}</span>
                    <p class="text-slate-600 mt-0.5">${h.notes}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      } else if (type === 'CLEARANCE') {
        const item = (appState.clearanceOrders || []).find(c => c.id === id);
        if (!item) return;

        content.innerHTML = `
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Clearance Order Audit</span>
              <h3 class="text-base font-bold text-slate-900 mt-1">${item.id} — Bay ${item.godownBay}</h3>
            </div>
            <button onclick="closeStockControlDrawer()" class="p-1 rounded-lg text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div class="py-5 space-y-4 text-xs">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div class="flex justify-between"><span>Reason:</span><strong>${item.reasonLabel}</strong></div>
              <div class="flex justify-between"><span>Lead Operator:</span><strong>${item.assignedToName}</strong></div>
              <div class="flex justify-between"><span>SLA Deadline:</span><strong class="text-rose-600">${item.deadline}</strong></div>
              <div class="flex justify-between"><span>Progress:</span><strong class="font-mono text-emerald-700">${item.movedQuantity} / ${item.totalQuantity} Bags</strong></div>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 mb-1">Supervisor Handling Directives</h4>
              <p class="text-slate-700 p-3 bg-white border border-slate-200 rounded-xl">${item.instructions}</p>
            </div>
          </div>
        `;
      } else if (type === 'TRANSFER') {
        const item = (appState.stockTransfers || []).find(t => t.id === id);
        if (!item) return;

        content.innerHTML = `
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Transit Consignment Dossier</span>
              <h3 class="text-base font-bold text-slate-900 mt-1">${item.id} — Batch ${item.batchId}</h3>
            </div>
            <button onclick="closeStockControlDrawer()" class="p-1 rounded-lg text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div class="py-5 space-y-4 text-xs">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div class="flex justify-between"><span>From Depot:</span><strong>${item.sourceWarehouseName} (${item.sourceBay})</strong></div>
              <div class="flex justify-between"><span>To Depot:</span><strong>${item.destWarehouseName} (${item.destBay})</strong></div>
              <div class="flex justify-between"><span>Vehicle No:</span><strong class="font-mono text-slate-900">${item.vehicleNo}</strong></div>
              <div class="flex justify-between"><span>Driver:</span><strong>${item.driverName}</strong></div>
              <div class="flex justify-between"><span>Dispatched At:</span><strong class="font-mono">${item.dispatchedAt || 'Awaiting'}</strong></div>
              <div class="flex justify-between"><span>Status:</span><strong class="text-sky-700 font-bold">${item.status}</strong></div>
            </div>
          </div>
        `;
      } else if (type === 'VERIFICATION') {
        const item = (appState.stockVerifications || []).find(v => v.id === id);
        if (!item) return;

        content.innerHTML = `
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Physical Stock Count Audit Sheet</span>
              <h3 class="text-base font-bold text-slate-900 mt-1">${item.id} — ${item.godownBay}</h3>
            </div>
            <button onclick="closeStockControlDrawer()" class="p-1 rounded-lg text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div class="py-5 space-y-4 text-xs">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div class="flex justify-between"><span>Depot &amp; Bay:</span><strong>${item.warehouseName} (${item.godownBay})</strong></div>
              <div class="flex justify-between"><span>Commodity:</span><strong>${item.commodity}</strong></div>
              <div class="flex justify-between"><span>Audited Date:</span><strong class="font-mono">${item.scheduledDate}</strong></div>
              <div class="flex justify-between"><span>Counted By:</span><strong>${item.countedByName}</strong></div>
              <div class="flex justify-between"><span>Verified By:</span><strong>${item.verifiedByName}</strong></div>
              <div class="flex justify-between"><span>Status:</span><strong>${item.status}</strong></div>
            </div>
          </div>
        `;
      } else if (type === 'DISPOSAL') {
        const item = (appState.disposalRequests || []).find(d => d.id === id);
        if (!item) return;

        content.innerHTML = `
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Condemnation &amp; Write-off Dossier</span>
              <h3 class="text-base font-bold text-slate-900 mt-1">${item.id} — Batch ${item.batchId}</h3>
            </div>
            <button onclick="closeStockControlDrawer()" class="p-1 rounded-lg text-slate-400 hover:text-slate-700">✕</button>
          </div>

          <div class="py-5 space-y-4 text-xs">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div class="flex justify-between"><span>Quantity to Condemn:</span><strong class="text-rose-700">${item.quantity} Bags (${(item.quantity*0.05).toFixed(1)} MT)</strong></div>
              <div class="flex justify-between"><span>Lab Certificate:</span><strong class="font-mono">${item.inspectionRef}</strong></div>
              <div class="flex justify-between"><span>Method:</span><strong>${item.disposalMethod}</strong></div>
              <div class="flex justify-between"><span>Requested By:</span><strong>${item.requestedByName}</strong></div>
              <div class="flex justify-between"><span>Status:</span><strong class="text-amber-700">${item.status}</strong></div>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 mb-1">Reason for Condemnation</h4>
              <p class="text-slate-700 p-3 bg-white border border-slate-200 rounded-xl">${item.reason}</p>
            </div>
          </div>
        `;
      }

      drawer.classList.remove('hidden');
      drawer.classList.add('flex');
    }

    function closeStockControlDrawer() {
      const drawer = document.getElementById('stockControlDrawer');
      if (drawer) {
        drawer.classList.add('hidden');
        drawer.classList.remove('flex');
      }
    }

    // CSV Exporters
    function exportDamagedStockCsv() {
      const list = appState.damagedStock || [];
      const headers = ['Record ID', 'Batch ID', 'Commodity', 'Warehouse', 'Bay', 'Affected Bags', 'Damage Reason', 'Date Reported', 'Reported By', 'Status'];
      const rows = list.map(d => [
        d.id, d.batchId, d.commodity, d.godownName.replace(/,/g, ' '), d.binCode, d.affectedQuantity, d.damageReason, d.dateReported, d.reportedByName, d.status
      ].map(v => `"${v}"`).join(','));
      downloadCsvBlob('BhandarSetu_Damaged_Stock_Register.csv', [headers.join(','), ...rows].join('\n'));
      showToast('Damaged stock register CSV downloaded');
    }

    function exportClearanceLedgerCsv() {
      const list = appState.clearanceOrders || [];
      const headers = ['Order ID', 'Warehouse', 'Bay', 'Reason', 'Priority', 'Assigned To', 'Total Bags', 'Moved Bags', 'Status', 'Deadline'];
      const rows = list.map(c => [
        c.id, c.warehouseName.replace(/,/g, ' '), c.godownBay, c.reason, c.priority, c.assignedToName, c.totalQuantity, c.movedQuantity, c.status, c.deadline
      ].map(v => `"${v}"`).join(','));
      downloadCsvBlob('BhandarSetu_Clearance_Orders_Ledger.csv', [headers.join(','), ...rows].join('\n'));
      showToast('Clearance ledger CSV downloaded');
    }

    function exportStockTransfersCsv() {
      const list = appState.stockTransfers || [];
      const headers = ['Transfer ID', 'Batch ID', 'Commodity', 'Source Depot', 'Source Bay', 'Dest Depot', 'Dest Bay', 'Bags', 'Vehicle', 'Driver', 'Status'];
      const rows = list.map(t => [
        t.id, t.batchId, t.commodity, t.sourceWarehouseName.replace(/,/g, ' '), t.sourceBay, t.destWarehouseName.replace(/,/g, ' '), t.destBay, t.quantity, t.vehicleNo, t.driverName, t.status
      ].map(v => `"${v}"`).join(','));
      downloadCsvBlob('BhandarSetu_Stock_Transfers_Ledger.csv', [headers.join(','), ...rows].join('\n'));
      showToast('Stock transfers CSV downloaded');
    }

    function exportVerificationAuditCsv() {
      const list = appState.stockVerifications || [];
      const headers = ['Audit ID', 'Warehouse', 'Bay', 'Date', 'Counted By', 'Verified By', 'Status'];
      const rows = list.map(s => [
        s.id, s.warehouseName.replace(/,/g, ' '), s.godownBay, s.scheduledDate, s.countedByName, s.verifiedByName, s.status
      ].map(v => `"${v}"`).join(','));
      downloadCsvBlob('BhandarSetu_Stock_Verification_Audits.csv', [headers.join(','), ...rows].join('\n'));
      showToast('Verification audits CSV downloaded');
    }

    function exportDisposalRegisterCsv() {
      const list = appState.disposalRequests || [];
      const headers = ['Dossier ID', 'Batch ID', 'Commodity', 'Godown Bay', 'Bags', 'Inspection Ref', 'Method', 'Requested By', 'Status'];
      const rows = list.map(d => [
        d.id, d.batchId, d.commodity, d.godownBay, d.quantity, d.inspectionRef, d.disposalMethod, d.requestedByName, d.status
      ].map(v => `"${v}"`).join(','));
      downloadCsvBlob('BhandarSetu_Disposal_Register.csv', [headers.join(','), ...rows].join('\n'));
      showToast('Disposal register CSV downloaded');
    }

    function downloadCsvBlob(filename, text) {
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

