# Script to upgrade the Dashboard Welcome Header & 4 KPI Cards in index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# -----------------------------------------------------------------------------
# 1. Replace renderDashboardView Welcome & KPI Cards
# -----------------------------------------------------------------------------

old_manager_dashboard_block = """          <!-- 1. DASHBOARD HEADING & WELCOME SECTION -->
          <div class="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div class="flex items-start sm:items-center gap-4 min-w-0">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                ${userInitials}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome, ${user.fullName.split(' ')[0]}
                  </h1>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-amber-50 text-amber-800 border-amber-300 shrink-0">
                    👑 Supervisor Oversight
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span class="font-medium text-slate-700">${user.roleTitle}</span>
                  <span>•</span>
                  <span>${user.warehouseName}</span>
                  <span>•</span>
                  <span class="text-emerald-600 font-semibold flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Live Telemetry Active
                  </span>
                </p>
              </div>
            </div>

            <!-- Depot Scope Selector & Primary Action -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              ${isManager ? `
                <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                  <span class="text-slate-500 font-medium whitespace-nowrap">Depot Scope:</span>
                  <select onchange="handleScopeChange(this.value)" class="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs">
                    <option value="ALL" ${appState.selectedWarehouseScope === 'ALL' ? 'selected' : ''}>All Warehouses (National Central Scope)</option>
                    <option value="GDN-NGP-01" ${appState.selectedWarehouseScope === 'GDN-NGP-01' ? 'selected' : ''}>GDN-NGP-01 (Surajpur / Nagpur Depot)</option>
                    <option value="GDN-PUN-02" ${appState.selectedWarehouseScope === 'GDN-PUN-02' ? 'selected' : ''}>GDN-PUN-02 (Pune Buffer Depot)</option>
                  </select>
                </div>
              ` : `
                <div class="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs">
                  <span class="text-blue-600 font-semibold whitespace-nowrap">🔒 Assigned Depot:</span>
                  <span class="font-bold text-[#0B4DA8]">${user.warehouseId} (${(user.warehouseName || '').split('(')[0].trim()})</span>
                </div>
              `}

              <div class="flex items-center gap-2">
                <button onclick="setRoute('manager-tasks')" class="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap">
                  <span>📋 Task Follow-up</span>
                </button>
                <button onclick="setRoute('allocation')" class="px-3.5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#093d85] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap">
                  <span>+ Receive Stock</span>
                </button>
                <button onclick="setRoute('inventory')" class="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap">
                  <span>Batch Ledger</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. FOUR PRIMARY KPI SUMMARY CARDS (Equal Row Heights) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <!-- 1. Total Stock -->
            <div class="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 card-elevated h-full">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Total Stock</span>
                  <div class="w-8 h-8 rounded-lg bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-bold text-slate-900 font-mono tracking-tight leading-none">${totalStock.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-500 font-sans">Bags</span></div>
                  <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>${totalStockMT} MT in godown</span>
                    <span class="text-blue-600 font-semibold">${appState.batches.length} registered batches</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('inventory')" class="text-xs text-[#0B4DA8] hover:text-[#08387D] hover:underline font-semibold flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-100 cursor-pointer">
                <span>View Details</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <!-- 2. Available Stock -->
            <div class="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 card-elevated h-full">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Available Stock</span>
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-bold text-emerald-700 font-mono tracking-tight leading-none">${availableForDispatch.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-500 font-sans">Bags</span></div>
                  <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>${availableForDispatchMT} MT FIFO-ready</span>
                    <span class="text-emerald-600 font-semibold">${eligibleBatchesCount} batches cleared</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('fifo')" class="text-xs text-emerald-700 hover:text-emerald-900 hover:underline font-semibold flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-100 cursor-pointer">
                <span>View Details</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <!-- 3. Pending Inspections -->
            <div class="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-amber-300 card-elevated h-full">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Pending Inspections</span>
                  <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-bold text-amber-600 font-mono tracking-tight leading-none">${needsInspectionCount} <span class="text-xs font-normal text-slate-500 font-sans">Batches</span></div>
                  <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>${(needsInspectionBags * 0.05).toFixed(1)} MT lab assay pending</span>
                    <span class="text-amber-700 font-semibold">${needsInspectionBags.toLocaleString('en-IN')} Bags</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('quality')" class="text-xs text-amber-700 hover:text-amber-900 hover:underline font-semibold flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-100 cursor-pointer">
                <span>View Details</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <!-- 4. Quality Hold & Dispatches -->
            <div class="p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-sky-300 card-elevated h-full">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Dispatches in Progress</span>
                  <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-bold text-sky-700 font-mono tracking-tight leading-none">${inTransitDispatches.length} <span class="text-xs font-normal text-slate-500 font-sans">Vehicles</span></div>
                  <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>${inTransitDispatches.reduce((s,d) => s + (d.actualDispatchedBags || d.quantityBags || 0), 0).toLocaleString('en-IN')} Bags on road</span>
                    <span class="text-sky-600 font-semibold">Active Fleet</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('out-delivery')" class="text-xs text-sky-700 hover:text-sky-900 hover:underline font-semibold flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-100 cursor-pointer">
                <span>View Details</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>"""

new_manager_dashboard_block = """          <!-- 1. CLEAN HORIZONTAL WELCOME / HERO HEADER -->
          <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
            <div class="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5 w-full">
              <!-- Left Side: Avatar + Heading + Compact Inline Meta Labels -->
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-lg shadow-2xs shrink-0 ring-4 ring-blue-50">
                  ${userInitials}
                </div>
                <div class="min-w-0 space-y-1.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                      Welcome back, ${user.fullName.split(' ')[0]}
                    </h1>
                    <span class="text-xs text-slate-500 font-medium hidden sm:inline">— Here's your warehouse overview.</span>
                  </div>
                  <!-- Compact Inline Labels (No bullets, clean pills) -->
                  <div class="flex items-center gap-2 flex-wrap text-xs">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shadow-2xs">
                      👑 ${isManager ? 'Supervisor Oversight' : 'Warehouse Operator'}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                      📍 ${user.warehouseName ? user.warehouseName.split('(')[0].trim() : 'National Scope'}
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Telemetry Active
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Side: Depot Scope Selector & Horizontal Action Group -->
              <div class="flex flex-wrap items-center gap-2.5 shrink-0 self-start 2xl:self-center">
                ${isManager ? `
                  <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                    <span class="text-slate-500 font-medium whitespace-nowrap">Depot Scope:</span>
                    <select onchange="handleScopeChange(this.value)" class="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs">
                      <option value="ALL" ${appState.selectedWarehouseScope === 'ALL' ? 'selected' : ''}>All Depots (State Central Scope)</option>
                      <option value="GDN-NGP-01" ${appState.selectedWarehouseScope === 'GDN-NGP-01' ? 'selected' : ''}>GDN-NGP-01 (Surajpur / Nagpur)</option>
                      <option value="GDN-PUN-02" ${appState.selectedWarehouseScope === 'GDN-PUN-02' ? 'selected' : ''}>GDN-PUN-02 (Pune Buffer Depot)</option>
                    </select>
                  </div>
                ` : `
                  <div class="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs">
                    <span class="text-blue-600 font-semibold whitespace-nowrap">🔒 Depot:</span>
                    <span class="font-bold text-[#0B4DA8]">${user.warehouseId || 'GDN-NGP-01'}</span>
                  </div>
                `}

                <div class="flex items-center gap-2">
                  <button onclick="setRoute('manager-tasks')" class="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs">
                    <svg class="w-3.5 h-3.5 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <span>Task Follow-up</span>
                  </button>
                  <button onclick="setRoute('allocation')" class="px-3.5 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-xs">
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>Receive Stock</span>
                  </button>
                  <button onclick="setRoute('inventory')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs">
                    <span>Batch Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. FOUR PRIMARY KPI SUMMARY CARDS (Equal Row Heights) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch w-full mb-6">
            <!-- 1. Total Stock -->
            <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all h-full">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Stock</span>
                  <div class="w-8 h-8 rounded-lg bg-blue-50 text-[#0B4DA8] flex items-center justify-center font-bold shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none">
                    ${totalStock.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-500 font-sans">Bags</span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-2 flex items-center justify-between gap-1">
                    <span>${totalStockMT} MT in godown</span>
                    <span class="text-blue-600 font-semibold">${appState.batches.length} batches</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('inventory')" class="text-xs text-[#0B4DA8] hover:text-[#0A2F6B] hover:underline font-bold flex items-center justify-between mt-4 pt-3 border-t border-slate-100 cursor-pointer w-full">
                <span>View Details</span>
                <span class="text-slate-400">→</span>
              </button>
            </div>

            <!-- 2. Available Stock -->
            <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all h-full">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Stock</span>
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-black text-emerald-700 font-mono tracking-tight leading-none">
                    ${availableForDispatch.toLocaleString('en-IN')} <span class="text-xs font-normal text-slate-500 font-sans">Bags</span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-2 flex items-center justify-between gap-1">
                    <span>${availableForDispatchMT} MT FIFO-ready</span>
                    <span class="text-emerald-600 font-semibold">${eligibleBatchesCount} batches cleared</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('fifo')" class="text-xs text-emerald-700 hover:text-emerald-900 hover:underline font-bold flex items-center justify-between mt-4 pt-3 border-t border-slate-100 cursor-pointer w-full">
                <span>View Details</span>
                <span class="text-slate-400">→</span>
              </button>
            </div>

            <!-- 3. Pending Inspections -->
            <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all h-full">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Inspections</span>
                  <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-black text-amber-600 font-mono tracking-tight leading-none">
                    ${needsInspectionCount} <span class="text-xs font-normal text-slate-500 font-sans">Batches</span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-2 flex items-center justify-between gap-1">
                    <span>${(needsInspectionBags * 0.05).toFixed(1)} MT lab assay</span>
                    <span class="text-amber-700 font-semibold">${needsInspectionBags.toLocaleString('en-IN')} Bags</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('quality')" class="text-xs text-amber-700 hover:text-amber-900 hover:underline font-bold flex items-center justify-between mt-4 pt-3 border-t border-slate-100 cursor-pointer w-full">
                <span>View Details</span>
                <span class="text-slate-400">→</span>
              </button>
            </div>

            <!-- 4. Dispatches in Progress -->
            <div class="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all h-full">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dispatches in Progress</span>
                  <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-[26px] font-black text-sky-700 font-mono tracking-tight leading-none">
                    ${inTransitDispatches.length} <span class="text-xs font-normal text-slate-500 font-sans">Vehicles</span>
                  </div>
                  <div class="text-[11px] text-slate-500 mt-2 flex items-center justify-between gap-1">
                    <span>${inTransitDispatches.reduce((s,d) => s + (d.actualDispatchedBags || d.quantityBags || 0), 0).toLocaleString('en-IN')} Bags en route</span>
                    <span class="text-sky-600 font-semibold">Active Fleet</span>
                  </div>
                </div>
              </div>
              <button onclick="setRoute('out-delivery')" class="text-xs text-sky-700 hover:text-sky-900 hover:underline font-bold flex items-center justify-between mt-4 pt-3 border-t border-slate-100 cursor-pointer w-full">
                <span>View Details</span>
                <span class="text-slate-400">→</span>
              </button>
            </div>
          </div>"""

assert old_manager_dashboard_block in html, "old_manager_dashboard_block not found in index.html"
html = html.replace(old_manager_dashboard_block, new_manager_dashboard_block, 1)
print("Step 1: Manager Dashboard Welcome Header & 4 KPI cards replaced.")

# -----------------------------------------------------------------------------
# 2. Replace renderOperatorDashboardView Welcome Banner
# -----------------------------------------------------------------------------

old_op_banner = """          <!-- Operator Welcome & Depot Identification Banner -->
          <div class="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div class="flex items-start sm:items-center gap-4 min-w-0">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                ${(user.fullName || 'Ramesh Patil').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome, ${(user.fullName || 'Ramesh Patil').split(' ')[0]}
                  </h1>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-blue-50 text-[#0B4DA8] border-blue-300 shrink-0">
                    🚚 Warehouse Operator
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span class="text-[11px] font-mono font-bold text-[#0B4DA8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">${user.warehouseId || 'GDN-NGP-01'}</span>
                  <span>•</span>
                  <span class="font-medium text-slate-700">${depotName}</span>
                  <span>•</span>
                  <span class="text-slate-500">Shift: Regular Day Duty</span>
                </p>
              </div>
            </div>

            <!-- Operator Quick Action Ribbon -->
            <div class="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onclick="setRoute('operator-tasks')"
                class="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>📋 My Tasks</span>
              </button>

              <button
                onclick="setRoute('allocation')"
                class="px-3.5 py-2 bg-[#0B4DA8] hover:bg-[#093d85] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>📥 1. Receive Stock</span>
              </button>

              <button
                onclick="setRoute('fifo')"
                class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>⚡ 2. Request FIFO</span>
              </button>

              <button
                onclick="setRoute('dispatch')"
                class="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>🚚 3. Dispatch Checklist</span>
              </button>
            </div>
          </div>"""

new_op_banner = """          <!-- Operator Welcome & Depot Identification Banner -->
          <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
            <div class="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5 w-full">
              <!-- Left Side: Avatar + Heading + Compact Inline Meta Labels -->
              <div class="flex items-center gap-4 min-w-0">
                <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-lg shadow-2xs shrink-0 ring-4 ring-blue-50">
                  ${(user.fullName || 'Ramesh Patil').split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div class="min-w-0 space-y-1.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                      Welcome back, ${(user.fullName || 'Ramesh Patil').split(' ')[0]}
                    </h1>
                    <span class="text-xs text-slate-500 font-medium hidden sm:inline">— Here's your warehouse shift overview.</span>
                  </div>
                  <!-- Compact Inline Labels (No bullets, clean pills) -->
                  <div class="flex items-center gap-2 flex-wrap text-xs">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200 whitespace-nowrap shadow-2xs">
                      🚚 Warehouse Operator
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                      📍 ${user.warehouseId || 'GDN-NGP-01'} · ${depotName.split('(')[0].trim()}
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Shift Active
                    </span>
                  </div>
                </div>
              </div>

              <!-- Operator Quick Action Group -->
              <div class="flex flex-wrap items-center gap-2 shrink-0 self-start 2xl:self-center">
                <button
                  onclick="setRoute('operator-tasks')"
                  class="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>📋 My Tasks</span>
                </button>

                <button
                  onclick="setRoute('allocation')"
                  class="px-3.5 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>📥 Receive Stock</span>
                </button>

                <button
                  onclick="setRoute('fifo')"
                  class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>⚡ Request FIFO</span>
                </button>

                <button
                  onclick="setRoute('dispatch')"
                  class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>🚚 Dispatch Checklist</span>
                </button>
              </div>
            </div>
          </div>"""

assert old_op_banner in html, "old_op_banner not found in index.html"
html = html.replace(old_op_banner, new_op_banner, 1)
print("Step 2: Operator Dashboard Welcome Banner replaced.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved updated index.html successfully.")

