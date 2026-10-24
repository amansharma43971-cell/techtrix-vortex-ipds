    // =========================================================================
    // TASK ASSIGNMENT, QUALITY FOLLOW-UP & NOTIFICATION CENTER LOGIC
    // =========================================================================

    function getTaskKPIs(tasks) {
      const now = new Date();
      let pending = 0;
      let overdue = 0;
      let qualityDue = 0;
      let inProgress = 0;
      let completed = 0;

      tasks.forEach(t => {
        const isComp = t.status === 'COMPLETED';
        const isCanc = t.status === 'CANCELLED';
        if (isComp) {
          completed++;
        } else if (!isCanc) {
          if (t.status === 'ASSIGNED' || t.status === 'ACCEPTED') pending++;
          if (t.status === 'IN_PROGRESS' || t.status === 'SUBMITTED_FOR_REVIEW') inProgress++;
          if (t.isOverdue || (t.dueAt && new Date(t.dueAt) < now)) overdue++;
          if (t.taskType === 'QUALITY_INSPECTION' || t.taskType === 'RECHECK') qualityDue++;
        }
      });

      return { pending, overdue, qualityDue, inProgress, completed };
    }

    function getFilteredTasksForManager() {
      let list = appState.tasks || [];
      const search = (appState.managerTaskSearchQuery || '').toLowerCase();
      const typeFilter = appState.managerTaskTypeFilter || 'ALL';
      const statusFilter = appState.managerTaskStatusFilter || 'ALL';
      const prioFilter = appState.managerTaskPriorityFilter || 'ALL';
      const whFilter = appState.managerTaskWarehouseFilter || 'ALL';
      const scope = appState.selectedWarehouseScope || 'ALL';
      const now = new Date();

      return list.filter(t => {
        // Warehouse Scope
        if (scope !== 'ALL' && t.warehouseId !== scope) return false;
        if (whFilter !== 'ALL' && t.warehouseId !== whFilter) return false;

        // Search
        if (search) {
          const match = 
            (t.taskNo || '').toLowerCase().includes(search) ||
            (t.title || '').toLowerCase().includes(search) ||
            (t.batchId || '').toLowerCase().includes(search) ||
            (t.commodity || '').toLowerCase().includes(search) ||
            (t.assignedToName || '').toLowerCase().includes(search);
          if (!match) return false;
        }

        // Type
        if (typeFilter !== 'ALL' && t.taskType !== typeFilter) return false;

        // Status
        if (statusFilter === 'OVERDUE') {
          const isOver = t.isOverdue || (t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
          if (!isOver) return false;
        } else if (statusFilter !== 'ALL' && t.status !== statusFilter) {
          return false;
        }

        // Priority
        if (prioFilter !== 'ALL' && t.priority !== prioFilter) return false;

        return true;
      });
    }

    function getFilteredTasksForOperator() {
      const user = appState.currentUser;
      if (!user) return [];
      let list = appState.tasks || [];
      const tab = appState.operatorTaskTab || 'ALL';
      const search = (appState.operatorTaskSearchQuery || '').toLowerCase();
      const prioFilter = appState.operatorTaskPriorityFilter || 'ALL';
      const now = new Date();

      // Filter by Operator identity / depot
      list = list.filter(t => 
        t.assignedToId === user.id || 
        t.assignedToName === user.fullName || 
        (user.warehouseId && t.warehouseId === user.warehouseId)
      );

      return list.filter(t => {
        // Tab Filter
        if (tab === 'NEW' && t.status !== 'ASSIGNED') return false;
        if (tab === 'ACCEPTED' && t.status !== 'ACCEPTED') return false;
        if (tab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
        if (tab === 'REVIEW' && t.status !== 'SUBMITTED_FOR_REVIEW') return false;
        if (tab === 'COMPLETED' && t.status !== 'COMPLETED') return false;
        if (tab === 'OVERDUE') {
          const isOver = t.isOverdue || (t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
          if (!isOver) return false;
        }

        // Priority
        if (prioFilter !== 'ALL' && t.priority !== prioFilter) return false;

        // Search
        if (search) {
          const match = 
            (t.taskNo || '').toLowerCase().includes(search) ||
            (t.title || '').toLowerCase().includes(search) ||
            (t.batchId || '').toLowerCase().includes(search) ||
            (t.commodity || '').toLowerCase().includes(search);
          if (!match) return false;
        }

        return true;
      });
    }

    // =========================================================================
    // MANAGER TASK CENTER VIEW
    // =========================================================================
    function renderManagerTaskCenterView() {
      if (!appState.currentUser || appState.currentUser.role !== 'MANAGER') {
        return renderUnauthorizedView('MANAGE_TASKS', 'Task & Quality Follow-up Console');
      }

      const allTasks = (appState.tasks || []).filter(t => 
        appState.selectedWarehouseScope === 'ALL' || t.warehouseId === appState.selectedWarehouseScope
      );
      const kpis = getTaskKPIs(allTasks);
      const filteredTasks = getFilteredTasksForManager();
      const now = new Date();

      return `
        <div data-page="manager-tasks" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          <!-- Page Header -->
          ${renderPageHeader({
            breadcrumbGroup: 'Operations',
            title: 'Task & Quality Follow-up',
            subtitle: 'Supervise operational task assignments, monitor overdue SLAs, and review laboratory quality follow-ups across depots.',
            badge: 'Supervisor Task Control',
            badgeColor: 'blue',
            actions: `
              <button
                onclick="openCreateTaskModal()"
                class="px-4 py-2.5 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                <span>Assign New Task</span>
              </button>
            `
          })}

          <!-- 5 KPI Summary Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <!-- Pending -->
            <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-colors" onclick="appState.managerTaskStatusFilter='ASSIGNED';renderCurrentRoute()">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Pending Tasks</span>
                <span class="p-1.5 rounded-lg bg-amber-50 text-amber-600">⏳</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-bold text-slate-900">${kpis.pending}</span>
                <span class="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Awaiting Action</span>
              </div>
            </div>

            <!-- Overdue -->
            <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-rose-400 transition-colors" onclick="appState.managerTaskStatusFilter='OVERDUE';renderCurrentRoute()">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Overdue Tasks</span>
                <span class="p-1.5 rounded-lg bg-rose-50 text-rose-600">🚨</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-bold text-rose-600">${kpis.overdue}</span>
                <span class="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">SLA Breached</span>
              </div>
            </div>

            <!-- Quality Due -->
            <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-purple-400 transition-colors" onclick="appState.managerTaskTypeFilter='QUALITY_INSPECTION';renderCurrentRoute()">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Quality Due</span>
                <span class="p-1.5 rounded-lg bg-purple-50 text-purple-600">🔬</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-bold text-slate-900">${kpis.qualityDue}</span>
                <span class="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">Assaying Recheck</span>
              </div>
            </div>

            <!-- In Progress -->
            <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-colors" onclick="appState.managerTaskStatusFilter='IN_PROGRESS';renderCurrentRoute()">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">In Progress</span>
                <span class="p-1.5 rounded-lg bg-blue-50 text-blue-600">⚙️</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-bold text-blue-900">${kpis.inProgress}</span>
                <span class="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">Active Ops</span>
              </div>
            </div>

            <!-- Completed -->
            <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors" onclick="appState.managerTaskStatusFilter='COMPLETED';renderCurrentRoute()">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500">Completed</span>
                <span class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">✅</span>
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-bold text-emerald-700">${kpis.completed}</span>
                <span class="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Closed Tasks</span>
              </div>
            </div>
          </div>

          <!-- Search & Compact Filters Bar -->
          <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
            <div class="w-full lg:w-72">
              <input
                type="text"
                value="${appState.managerTaskSearchQuery || ''}"
                oninput="appState.managerTaskSearchQuery = this.value; renderCurrentRoute()"
                placeholder="Search task, batch ID, title, or operator..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-medium"
              />
            </div>

            <div class="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
              <!-- Type Filter -->
              <select
                onchange="appState.managerTaskTypeFilter = this.value; renderCurrentRoute()"
                class="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL" ${appState.managerTaskTypeFilter === 'ALL' ? 'selected' : ''}>All Task Types</option>
                <option value="QUALITY_INSPECTION" ${appState.managerTaskTypeFilter === 'QUALITY_INSPECTION' ? 'selected' : ''}>Quality Inspection</option>
                <option value="RECHECK" ${appState.managerTaskTypeFilter === 'RECHECK' ? 'selected' : ''}>Recheck &amp; Re-assay</option>
                <option value="STOCK_VERIFICATION" ${appState.managerTaskTypeFilter === 'STOCK_VERIFICATION' ? 'selected' : ''}>Stock Verification</option>
                <option value="DISPATCH_PREPARATION" ${appState.managerTaskTypeFilter === 'DISPATCH_PREPARATION' ? 'selected' : ''}>Dispatch Prep</option>
                <option value="GENERAL" ${appState.managerTaskTypeFilter === 'GENERAL' ? 'selected' : ''}>General Task</option>
              </select>

              <!-- Status Filter -->
              <select
                onchange="appState.managerTaskStatusFilter = this.value; renderCurrentRoute()"
                class="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL" ${appState.managerTaskStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
                <option value="ASSIGNED" ${appState.managerTaskStatusFilter === 'ASSIGNED' ? 'selected' : ''}>Assigned (New)</option>
                <option value="ACCEPTED" ${appState.managerTaskStatusFilter === 'ACCEPTED' ? 'selected' : ''}>Accepted</option>
                <option value="IN_PROGRESS" ${appState.managerTaskStatusFilter === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                <option value="SUBMITTED_FOR_REVIEW" ${appState.managerTaskStatusFilter === 'SUBMITTED_FOR_REVIEW' ? 'selected' : ''}>Awaiting Review ⚠️</option>
                <option value="BLOCKED" ${appState.managerTaskStatusFilter === 'BLOCKED' ? 'selected' : ''}>Blocked ⛔</option>
                <option value="RECHECK_REQUIRED" ${appState.managerTaskStatusFilter === 'RECHECK_REQUIRED' ? 'selected' : ''}>Recheck Mandated</option>
                <option value="OVERDUE" ${appState.managerTaskStatusFilter === 'OVERDUE' ? 'selected' : ''}>Overdue SLAs</option>
                <option value="COMPLETED" ${appState.managerTaskStatusFilter === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                <option value="CANCELLED" ${appState.managerTaskStatusFilter === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
              </select>

              <!-- Priority Filter -->
              <select
                onchange="appState.managerTaskPriorityFilter = this.value; renderCurrentRoute()"
                class="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL" ${appState.managerTaskPriorityFilter === 'ALL' ? 'selected' : ''}>All Priorities</option>
                <option value="URGENT" ${appState.managerTaskPriorityFilter === 'URGENT' ? 'selected' : ''}>Urgent</option>
                <option value="HIGH" ${appState.managerTaskPriorityFilter === 'HIGH' ? 'selected' : ''}>High</option>
                <option value="NORMAL" ${appState.managerTaskPriorityFilter === 'NORMAL' ? 'selected' : ''}>Normal</option>
              </select>

              <!-- Depot Scope Filter -->
              <select
                onchange="appState.managerTaskWarehouseFilter = this.value; renderCurrentRoute()"
                class="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL" ${appState.managerTaskWarehouseFilter === 'ALL' ? 'selected' : ''}>All Depots</option>
                <option value="GDN-NGP-01" ${appState.managerTaskWarehouseFilter === 'GDN-NGP-01' ? 'selected' : ''}>Nagpur (GDN-NGP-01)</option>
                <option value="GDN-PUN-02" ${appState.managerTaskWarehouseFilter === 'GDN-PUN-02' ? 'selected' : ''}>Pune (GDN-PUN-02)</option>
              </select>
            </div>
          </div>

          <!-- Task Table -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th class="py-3 px-4">Task Ref &amp; Priority</th>
                    <th class="py-3 px-4">Task Title &amp; Type</th>
                    <th class="py-3 px-4">Target Batch &amp; Commodity</th>
                    <th class="py-3 px-4">Assigned Operator</th>
                    <th class="py-3 px-4">Due SLA</th>
                    <th class="py-3 px-4">Status</th>
                    <th class="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${filteredTasks.length === 0 ? `
                    <tr>
                      <td colspan="7" class="py-12 text-center text-slate-400">
                        <svg class="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                        <p class="font-medium text-slate-600 text-sm">No warehouse tasks found</p>
                        <p class="text-xs text-slate-400 mt-0.5">Try adjusting your filters or assign a new task.</p>
                      </td>
                    </tr>
                  ` : filteredTasks.map(t => {
                    const isOver = t.isOverdue || (t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
                    const targetBatch = appState.batches.find(b => b.id === t.batchId);
                    
                    return `
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3.5 px-4 font-medium">
                          <div class="font-mono font-bold text-slate-900">${t.taskNo}</div>
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 ${
                            t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                            t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }">
                            ${t.priority}
                          </span>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="font-bold text-slate-900 max-w-[220px] truncate" title="${t.title}">${t.title}</div>
                          <div class="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>${t.taskTypeTitle || t.taskType}</span>
                          </div>
                        </td>
                        <td class="py-3.5 px-4">
                          <button onclick="openBatchDrawer('${t.batchId}')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B4DA8] font-bold text-xs transition-colors cursor-pointer" title="View Batch Dossier">
                            <span>${t.batchId}</span>
                            <span class="text-slate-400">·</span>
                            <span>${t.commodity}</span>
                          </button>
                          ${targetBatch ? `
                            <span class="block text-[10px] text-slate-400 mt-1">Batch Status: <strong>${targetBatch.qualityStatus}</strong></span>
                          ` : ''}
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="font-semibold text-slate-800">${t.assignedToName}</div>
                          <div class="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">${t.warehouseName}</div>
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="text-slate-800 font-medium">${t.dueAt.replace('T', ' ')}</div>
                          ${isOver ? `
                            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mt-0.5">
                              ⚠️ SLA Overdue
                            </span>
                          ` : `
                            <span class="text-[10px] text-slate-400 mt-0.5 block">Within SLA</span>
                          `}
                        </td>
                        <td class="py-3.5 px-4">
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'SUBMITTED_FOR_REVIEW' ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse' :
                            t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            t.status === 'BLOCKED' ? 'bg-rose-100 text-rose-800' :
                            t.status === 'RECHECK_REQUIRED' ? 'bg-purple-100 text-purple-800' :
                            t.status === 'ACCEPTED' ? 'bg-sky-100 text-sky-800' :
                            t.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500 line-through' :
                            'bg-slate-100 text-slate-700'
                          }">
                            ${t.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td class="py-3.5 px-4 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            ${t.status === 'SUBMITTED_FOR_REVIEW' ? `
                              <button
                                onclick="openTaskReviewModal('${t.id}')"
                                class="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <span>Review &amp; Approve</span>
                              </button>
                            ` : ''}

                            <button
                              onclick="openTaskDetailDrawer('${t.id}')"
                              class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Details
                            </button>

                            ${t.status !== 'COMPLETED' && t.status !== 'CANCELLED' ? `
                              <button
                                onclick="openReassignTaskModal('${t.id}')"
                                class="p-1.5 text-slate-400 hover:text-[#0B4DA8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Reassign Task"
                              >
                                🔄
                              </button>
                              <button
                                onclick="handleCancelTask('${t.id}')"
                                class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancel Task"
                              >
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
        </div>
      `;
    }

    // =========================================================================
    // OPERATOR TASK CENTER VIEW ("My Tasks")
    // =========================================================================
    function renderOperatorTaskCenterView() {
      const user = appState.currentUser || {};
      const depotName = user.warehouseName || 'Central Food Godown, Nagpur (GDN-NGP-01)';
      const activeTab = appState.operatorTaskTab || 'ALL';
      const myTasks = getFilteredTasksForOperator();
      const allOperatorTasks = (appState.tasks || []).filter(t => 
        t.assignedToId === user.id || t.assignedToName === user.fullName || (user.warehouseId && t.warehouseId === user.warehouseId)
      );
      const now = new Date();

      const counts = {
        ALL: allOperatorTasks.length,
        NEW: allOperatorTasks.filter(t => t.status === 'ASSIGNED').length,
        ACCEPTED: allOperatorTasks.filter(t => t.status === 'ACCEPTED').length,
        IN_PROGRESS: allOperatorTasks.filter(t => t.status === 'IN_PROGRESS').length,
        REVIEW: allOperatorTasks.filter(t => t.status === 'SUBMITTED_FOR_REVIEW').length,
        COMPLETED: allOperatorTasks.filter(t => t.status === 'COMPLETED').length,
        OVERDUE: allOperatorTasks.filter(t => t.isOverdue || (t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')).length
      };

      return `
        <div data-page="operator-tasks" class="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-200">
          <!-- Page Header -->
          ${renderPageHeader({
            breadcrumbGroup: 'Godown Operations',
            title: 'My Tasks &amp; Assaying Duties',
            subtitle: `Assigned warehouse tasks, quality sampling parameters, and verification checklists for ${depotName}.`,
            badge: 'Operator Execution Scope',
            badgeColor: 'blue'
          })}

          <!-- Tab Navigation Bar -->
          <div class="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs pb-1">
            <button
              onclick="appState.operatorTaskTab='ALL'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ALL' ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>All Tasks</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${counts.ALL}</span>
            </button>

            <button
              onclick="appState.operatorTaskTab='NEW'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'NEW' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>New Assignments</span>
              ${counts.NEW > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">${counts.NEW}</span>` : ''}
            </button>

            <button
              onclick="appState.operatorTaskTab='ACCEPTED'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ACCEPTED' ? 'bg-sky-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>Accepted</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'ACCEPTED' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${counts.ACCEPTED}</span>
            </button>

            <button
              onclick="appState.operatorTaskTab='IN_PROGRESS'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'IN_PROGRESS' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>In Progress</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'IN_PROGRESS' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${counts.IN_PROGRESS}</span>
            </button>

            <button
              onclick="appState.operatorTaskTab='REVIEW'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'REVIEW' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>Awaiting Review</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'REVIEW' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${counts.REVIEW}</span>
            </button>

            <button
              onclick="appState.operatorTaskTab='OVERDUE'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'OVERDUE' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>Overdue</span>
              ${counts.OVERDUE > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-bold">${counts.OVERDUE}</span>` : ''}
            </button>

            <button
              onclick="appState.operatorTaskTab='COMPLETED'; renderCurrentRoute()"
              class="px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'COMPLETED' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }"
            >
              <span>Completed</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${counts.COMPLETED}</span>
            </button>
          </div>

          <!-- Filters Bar -->
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div class="w-full sm:w-80">
              <input
                type="text"
                value="${appState.operatorTaskSearchQuery || ''}"
                oninput="appState.operatorTaskSearchQuery = this.value; renderCurrentRoute()"
                placeholder="Search by task title, batch ID, or commodity..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] font-medium"
              />
            </div>

            <div class="flex items-center gap-2">
              <span class="text-slate-500 font-medium hidden sm:inline">Priority:</span>
              <select
                onchange="appState.operatorTaskPriorityFilter = this.value; renderCurrentRoute()"
                class="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
              >
                <option value="ALL" ${appState.operatorTaskPriorityFilter === 'ALL' ? 'selected' : ''}>All Priorities</option>
                <option value="URGENT" ${appState.operatorTaskPriorityFilter === 'URGENT' ? 'selected' : ''}>Urgent</option>
                <option value="HIGH" ${appState.operatorTaskPriorityFilter === 'HIGH' ? 'selected' : ''}>High</option>
                <option value="NORMAL" ${appState.operatorTaskPriorityFilter === 'NORMAL' ? 'selected' : ''}>Normal</option>
              </select>
            </div>
          </div>

          <!-- Task Cards Grid -->
          ${myTasks.length === 0 ? `
            <div class="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h3 class="text-base font-bold text-slate-800">No tasks in this category</h3>
              <p class="text-xs text-slate-400 mt-1">All duties in this section are clear. Great job!</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${myTasks.map(t => {
                const isOver = t.isOverdue || (t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
                const targetBatch = appState.batches.find(b => b.id === t.batchId);

                return `
                  <div class="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group">
                    <!-- Top Priority Header Strip -->
                    <div class="px-4 py-2 text-[10px] font-bold flex items-center justify-between border-b ${
                      t.priority === 'URGENT' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      t.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-blue-50 text-[#0B4DA8] border-blue-100'
                    }">
                      <div class="flex items-center gap-1.5 font-mono">
                        <span>${t.taskNo}</span>
                        <span>·</span>
                        <span>${t.taskTypeTitle || t.taskType}</span>
                      </div>
                      <span class="px-2 py-0.2 rounded-full uppercase ${
                        t.priority === 'URGENT' ? 'bg-rose-200 text-rose-900 animate-pulse' :
                        t.priority === 'HIGH' ? 'bg-amber-200 text-amber-900' :
                        'bg-blue-200 text-blue-900'
                      }">
                        ${t.priority}
                      </span>
                    </div>

                    <!-- Card Body -->
                    <div class="p-4 space-y-3 flex-1">
                      <div>
                        <h4 class="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#0B4DA8] transition-colors">${t.title}</h4>
                        <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">${t.description}</p>
                      </div>

                      <!-- Batch & Commodity Banner -->
                      <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span class="text-slate-400 text-[10px] block">Target Commodity:</span>
                          <strong class="text-slate-800 font-bold">${t.commodity}</strong>
                        </div>
                        <button onclick="openBatchDrawer('${t.batchId}')" class="px-2.5 py-1 rounded-lg bg-blue-100/70 hover:bg-blue-200 text-[#0B4DA8] font-mono font-bold text-xs cursor-pointer" title="Open Batch Dossier">
                          Batch ${t.batchId} →
                        </button>
                      </div>

                      <!-- Due Date / Overdue Warning -->
                      <div class="flex items-center justify-between text-[11px] pt-1">
                        <span class="text-slate-400 font-medium">SLA Due Date:</span>
                        <div class="text-right">
                          <span class="font-semibold text-slate-800">${t.dueAt.replace('T', ' ')}</span>
                          ${isOver ? `
                            <span class="block text-[10px] text-rose-600 font-bold">⚠️ Overdue SLA</span>
                          ` : ''}
                        </div>
                      </div>

                      <!-- Checklist Count -->
                      <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>Required Parameters:</span>
                        <span class="font-semibold text-slate-700">${t.checklist ? t.checklist.length : 2} Items</span>
                      </div>
                    </div>

                    <!-- Card Actions Footer -->
                    <div class="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onclick="openTaskDetailDrawer('${t.id}')"
                        class="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        View Details
                      </button>

                      <!-- Primary Contextual Action Button -->
                      <div>
                        ${t.status === 'ASSIGNED' ? `
                          <button
                            onclick="handleOperatorAcceptTask('${t.id}')"
                            class="px-3.5 py-1.5 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Accept Task</span>
                            <span>✓</span>
                          </button>
                        ` : t.status === 'ACCEPTED' ? `
                          <button
                            onclick="handleOperatorStartTask('${t.id}')"
                            class="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Start Task</span>
                            <span>▶</span>
                          </button>
                        ` : t.status === 'IN_PROGRESS' ? `
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
                          </div>
                        ` : t.status === 'SUBMITTED_FOR_REVIEW' ? `
                          <span class="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1">
                            <span>⏳ Under Review</span>
                          </span>
                        ` : t.status === 'BLOCKED' ? `
                          <button
                            onclick="openReportBlockerModal('${t.id}')"
                            class="px-3 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-200 text-xs font-bold cursor-pointer"
                          >
                            Update Blocker
                          </button>
                        ` : t.status === 'RECHECK_REQUIRED' ? `
                          <button
                            onclick="openSubmitEvidenceModal('${t.id}')"
                            class="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Resample &amp; Recheck
                          </button>
                        ` : `
                          <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold">
                            ✓ Completed
                          </span>
                        `}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    }

    // =========================================================================
    // TASK DETAIL DRAWER (Full Status Timeline & Evidence Dossier)
    // =========================================================================
    function openTaskDetailDrawer(taskId) {
      const task = (appState.tasks || []).find(t => t.id === taskId || t.taskNo === taskId);
      if (!task) return;

      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const targetBatch = appState.batches.find(b => b.id === task.batchId);

      const drawer = document.getElementById('taskDrawer');
      const content = document.getElementById('taskDrawerContent');

      content.innerHTML = `
        <div class="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-xs text-slate-500">${task.taskNo}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                task.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }">${task.priority}</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mt-1">${task.title}</h3>
          </div>
          <button onclick="closeTaskDetailDrawer()" class="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
        </div>

        <div class="py-5 space-y-5 text-xs">
          <!-- Metadata Summary -->
          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span class="text-slate-400 text-[10px] block">Target Batch:</span>
              <button onclick="openBatchDrawer('${task.batchId}')" class="font-bold text-[#0B4DA8] hover:underline flex items-center gap-1 cursor-pointer">
                <span>Batch ${task.batchId} (${task.commodity})</span>
              </button>
              ${targetBatch ? `<span class="text-[10px] text-slate-500 block mt-0.5">Quality Status: <strong>${targetBatch.qualityStatus}</strong></span>` : ''}
            </div>

            <div>
              <span class="text-slate-400 text-[10px] block">Assigned Depot:</span>
              <strong class="text-slate-800 block">${task.warehouseName}</strong>
            </div>

            <div>
              <span class="text-slate-400 text-[10px] block">Assigned Operator:</span>
              <strong class="text-slate-800 block">${task.assignedToName}</strong>
            </div>

            <div>
              <span class="text-slate-400 text-[10px] block">SLA Due Date:</span>
              <strong class="text-slate-800 block">${task.dueAt.replace('T', ' ')}</strong>
            </div>
          </div>

          <!-- Instructions -->
          <div>
            <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1.5">Operational Directives:</h4>
            <p class="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 leading-relaxed font-medium">
              ${task.description}
            </p>
          </div>

          <!-- Required Checklist Parameters -->
          <div>
            <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Required Checklist &amp; Measurements:</h4>
            <div class="space-y-1.5">
              ${(task.checklist || []).map(c => `
                <div class="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <span class="text-slate-700 font-medium">${c.label}</span>
                  ${c.value !== undefined ? `
                    <span class="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">${c.value} ${c.unit || ''}</span>
                  ` : `
                    <span class="text-slate-400 italic">Pending inspection</span>
                  `}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Submission Evidence (if submitted) -->
          ${task.submission ? `
            <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-blue-950 uppercase tracking-wider text-[11px]">Operator Laboratory Submission:</h4>
                <span class="text-[10px] text-blue-700 font-mono">${task.submission.submittedAt}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div><span class="text-blue-600">Moisture Measured:</span> <strong class="text-blue-950">${task.submission.measurements?.moisturePct ?? 'N/A'}%</strong></div>
                <div><span class="text-blue-600">Foreign Matter:</span> <strong class="text-blue-950">${task.submission.measurements?.foreignMatterPct ?? 'N/A'}%</strong></div>
                <div><span class="text-blue-600">Live Weevils:</span> <strong class="text-blue-950">${task.submission.measurements?.weevilCount ?? 0}</strong></div>
                <div><span class="text-blue-600">Damaged Bags:</span> <strong class="text-blue-950">${task.submission.measurements?.damagedBagsCount ?? 0}</strong></div>
              </div>
              <div class="pt-2 border-t border-blue-200 text-blue-900 font-medium">
                <strong>Remarks:</strong> ${task.submission.remarks}
              </div>
            </div>
          ` : ''}

          <!-- Supervisor Review Decision (if reviewed) -->
          ${task.review ? `
            <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">Supervisor Quality Sign-off:</h4>
                <span class="text-[10px] text-emerald-700 font-mono">${task.review.reviewedAt}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded font-bold text-xs ${
                  task.review.decision === 'APPROVED' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }">${task.review.decision}</span>
                <span class="text-emerald-800">by ${task.review.reviewedBy} (${task.review.reviewerRole})</span>
              </div>
              <p class="text-emerald-900 font-medium">Remarks: ${task.review.remarks}</p>
            </div>
          ` : ''}

          <!-- Status History Timeline -->
          <div>
            <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">Audit Timeline &amp; Accountability:</h4>
            <div class="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              ${(task.timeline || []).map(tm => `
                <div class="relative">
                  <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white bg-[#0B4DA8]"></span>
                  <div class="flex items-center justify-between">
                    <strong class="font-bold text-slate-900 text-xs">${tm.status.replace(/_/g, ' ')}</strong>
                    <span class="text-[10px] text-slate-400 font-mono">${tm.timestamp}</span>
                  </div>
                  <p class="text-slate-600 text-[11px] mt-0.5">${tm.comment}</p>
                  <span class="text-[10px] text-slate-400 block mt-0.5">By: ${tm.actorName} (${tm.actorRole})</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
          <button onclick="closeTaskDetailDrawer()" class="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer">Close Drawer</button>
          
          <div>
            ${isManager && task.status === 'SUBMITTED_FOR_REVIEW' ? `
              <button
                onclick="closeTaskDetailDrawer(); openTaskReviewModal('${task.id}')"
                class="px-4 py-2 bg-gradient-to-r from-amber-600 to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Review &amp; Approve Quality →
              </button>
            ` : !isManager && task.status === 'IN_PROGRESS' ? `
              <button
                onclick="closeTaskDetailDrawer(); openSubmitEvidenceModal('${task.id}')"
                class="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Submit Evidence →
              </button>
            ` : ''}
          </div>
        </div>
      `;

      drawer.classList.remove('hidden');
      drawer.classList.add('flex');
    }

    function closeTaskDetailDrawer() {
      const drawer = document.getElementById('taskDrawer');
      if (drawer) {
        drawer.classList.add('hidden');
        drawer.classList.remove('flex');
      }
    }

    // =========================================================================
    // MODAL HANDLERS
    // =========================================================================

    function openCreateTaskModal() {
      const modal = document.getElementById('createTaskModal');
      const whSelect = document.getElementById('taskCreateWarehouse');
      const batchSelect = document.getElementById('taskCreateBatch');
      const opSelect = document.getElementById('taskCreateOperator');
      const dueInput = document.getElementById('taskCreateDueAt');

      // Populate Warehouses
      const user = appState.currentUser;
      const isManager = user && user.role === 'MANAGER';
      const scope = appState.selectedWarehouseScope || 'ALL';

      whSelect.innerHTML = `
        ${isManager && scope === 'ALL' ? '<option value="GDN-NGP-01">Central Food Godown, Nagpur (GDN-NGP-01)</option><option value="GDN-PUN-02">District Buffer Depot, Pune (GDN-PUN-02)</option>' : ''}
        ${scope === 'GDN-NGP-01' ? '<option value="GDN-NGP-01">Central Food Godown, Nagpur (GDN-NGP-01)</option>' : ''}
        ${scope === 'GDN-PUN-02' ? '<option value="GDN-PUN-02">District Buffer Depot, Pune (GDN-PUN-02)</option>' : ''}
      `;

      handleTaskWarehouseChange();

      // Default SLA due date to +24 hours
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      dueInput.value = tomorrow.toISOString().slice(0, 16);

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeCreateTaskModal() {
      const modal = document.getElementById('createTaskModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleTaskWarehouseChange() {
      const whId = document.getElementById('taskCreateWarehouse').value;
      const batchSelect = document.getElementById('taskCreateBatch');
      const opSelect = document.getElementById('taskCreateOperator');

      // Filter Batches by selected Warehouse
      const batches = appState.batches.filter(b => b.warehouseId === whId);
      batchSelect.innerHTML = batches.map(b => `
        <option value="${b.id}">${b.id} - ${b.commodity} (${b.availableQuantity} Bags · ${b.qualityStatus})</option>
      `).join('');

      // Filter Operators by Warehouse
      const operators = appState.users.filter(u => u.role === 'WAREHOUSE_ADMIN' && u.isActive && u.warehouseId === whId);
      opSelect.innerHTML = operators.map(u => `
        <option value="${u.id}">${u.fullName} (${u.roleTitle || 'Operator'})</option>
      `).join('');

      handleTaskBatchChange();
    }

    function handleTaskBatchChange() {
      const bId = document.getElementById('taskCreateBatch').value;
      const commInput = document.getElementById('taskCreateCommodity');
      const batch = appState.batches.find(b => b.id === bId);
      if (batch) {
        commInput.value = batch.commodity;
      }
    }

    function handleCreateTaskSubmit(e) {
      e.preventDefault();
      const user = appState.currentUser;
      if (!user || user.role !== 'MANAGER') {
        alert('Unauthorized: Only Managers can assign tasks.');
        return;
      }

      const title = document.getElementById('taskCreateTitle').value;
      const desc = document.getElementById('taskCreateDesc').value;
      const whId = document.getElementById('taskCreateWarehouse').value;
      const bId = document.getElementById('taskCreateBatch').value;
      const comm = document.getElementById('taskCreateCommodity').value;
      const taskType = document.getElementById('taskCreateType').value;
      const priority = document.getElementById('taskCreatePriority').value;
      const opId = document.getElementById('taskCreateOperator').value;
      const dueAt = document.getElementById('taskCreateDueAt').value;
      const notes = document.getElementById('taskCreateNotes').value;

      const operator = appState.users.find(u => u.id === opId);
      const opName = operator ? operator.fullName : 'Assigned Operator';

      const taskNo = 'TSK-2025-' + String(Math.floor(100 + Math.random() * 900));

      const checklist = [];
      if (document.getElementById('chkMoisture').checked) {
        checklist.push({ id: 'c_moist', label: 'Moisture % Content Assay', required: true, type: 'number', unit: '%' });
      }
      if (document.getElementById('chkForeignMatter').checked) {
        checklist.push({ id: 'c_fm', label: 'Foreign Matter & Impurity Check', required: true, type: 'number', unit: '%' });
      }
      if (document.getElementById('chkWeevil').checked) {
        checklist.push({ id: 'c_weevil', label: 'Weevil Infestation Pest Count', required: true, type: 'number', unit: 'insects' });
      }
      if (document.getElementById('chkPackaging').checked) {
        checklist.push({ id: 'c_pkg', label: 'Packaging & Jute Stitching Soundness', required: true, type: 'boolean' });
      }
      if (document.getElementById('chkDunnage').checked) {
        checklist.push({ id: 'c_dun', label: 'Stack Alignment & Dunnage Crates', required: true, type: 'boolean' });
      }
      if (document.getElementById('chkDamagedBags').checked) {
        checklist.push({ id: 'c_dmg', label: 'Damaged / Torn Bag Physical Count', required: true, type: 'number', unit: 'bags' });
      }

      const newTask = {
        id: taskNo,
        taskNo,
        title,
        description: desc,
        taskType,
        taskTypeTitle: taskType.replace(/_/g, ' ').title || taskType,
        batchId: bId,
        commodity: comm,
        warehouseId: whId,
        warehouseName: whId === 'GDN-NGP-01' ? 'Central Food Godown, Nagpur (Surajpur Depot)' : 'District Buffer Depot, Pune',
        assignedToId: opId,
        assignedToName: opName,
        assignedToRole: 'WAREHOUSE_ADMIN',
        assignedById: user.id,
        assignedByName: user.fullName,
        assignedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        priority,
        dueAt,
        isOverdue: false,
        status: 'ASSIGNED',
        checklist,
        notes,
        submission: null,
        timeline: [
          {
            id: 'tm-' + Date.now(),
            status: 'ASSIGNED',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            actorId: user.id,
            actorName: user.fullName,
            actorRole: user.role,
            comment: `Task created and assigned by ${user.fullName}.`
          }
        ]
      };

      appState.tasks.unshift(newTask);

      // Create In-App Notification for Operator
      createInAppNotification({
        userId: opId,
        targetRole: 'WAREHOUSE_ADMIN',
        warehouseId: whId,
        taskId: taskNo,
        batchId: bId,
        type: 'TASK_ASSIGNED',
        severity: priority === 'URGENT' ? 'urgent' : 'info',
        title: `New Task Assigned: ${title}`,
        message: `Manager ${user.fullName} assigned task for Batch ${bId}. Due by ${dueAt.replace('T', ' ')}.`
      });

      // Audit Log
      appState.auditLogs.unshift({
        id: 'AUD-' + Date.now(),
        action: 'TASK_CREATED',
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        warehouseId: whId,
        warehouseName: newTask.warehouseName,
        targetRef: taskNo,
        details: `Assigned task ${taskNo} (${title}) for Batch ${bId} to Operator ${opName}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'SUCCESS'
      });

      saveState();
      closeCreateTaskModal();
      showToast(`Task ${taskNo} assigned to ${opName}`);
      renderCurrentRoute();
    }

    function handleOperatorAcceptTask(taskId) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      task.status = 'ACCEPTED';
      task.timeline.push({
        id: 'tm-' + Date.now(),
        status: 'ACCEPTED',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        comment: 'Task accepted by operator.'
      });

      createInAppNotification({
        userId: 'u-manager-01',
        targetRole: 'MANAGER',
        warehouseId: task.warehouseId,
        taskId: task.id,
        batchId: task.batchId,
        type: 'TASK_ACCEPTED',
        severity: 'info',
        title: `Task Accepted: ${task.taskNo}`,
        message: `Operator ${user.fullName} accepted task '${task.title}' for Batch ${task.batchId}.`
      });

      saveState();
      showToast(`Accepted task ${task.taskNo}`);
      renderCurrentRoute();
    }

    function handleOperatorStartTask(taskId) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      task.status = 'IN_PROGRESS';
      task.timeline.push({
        id: 'tm-' + Date.now(),
        status: 'IN_PROGRESS',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        comment: 'Operator commenced active task execution.'
      });

      createInAppNotification({
        userId: 'u-manager-01',
        targetRole: 'MANAGER',
        warehouseId: task.warehouseId,
        taskId: task.id,
        batchId: task.batchId,
        type: 'TASK_STARTED',
        severity: 'info',
        title: `Task Started: ${task.taskNo}`,
        message: `Operator ${user.fullName} started working on task '${task.title}'.`
      });

      saveState();
      showToast(`Task ${task.taskNo} is now In Progress`);
      renderCurrentRoute();
    }

    // Submit Evidence Modal
    function openSubmitEvidenceModal(taskId) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      document.getElementById('taskSubmitId').value = task.id;
      document.getElementById('taskSubmitTitle').textContent = task.title;
      document.getElementById('taskSubmitBadge').textContent = task.taskNo;
      document.getElementById('taskSubmitTarget').textContent = `Target Batch ${task.batchId} · ${task.commodity} (${task.warehouseName})`;
      
      const std = appState.commodityStandards[task.commodity] || { maxMoisture: 12.0 };
      document.getElementById('subMoistureTolerance').textContent = `BIS / FCI standard max moisture tolerance: ${std.maxMoisture}%`;

      const modal = document.getElementById('taskSubmitModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeSubmitEvidenceModal() {
      const modal = document.getElementById('taskSubmitModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleSubmitEvidence(e) {
      e.preventDefault();
      const taskId = document.getElementById('taskSubmitId').value;
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      const moisture = parseFloat(document.getElementById('subMoisture').value);
      const foreignMatter = parseFloat(document.getElementById('subForeignMatter').value);
      const weevils = parseInt(document.getElementById('subWeevils').value, 10);
      const damagedBags = parseInt(document.getElementById('subDamagedBags').value, 10) || 0;
      const remarks = document.getElementById('subRemarks').value;

      task.submission = {
        submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        submittedBy: user.fullName,
        measurements: {
          moisturePct: moisture,
          foreignMatterPct: foreignMatter,
          weevilCount: weevils,
          damagedBagsCount: damagedBags
        },
        checklistResponses: {
          packetsIntact: document.getElementById('subCheckPackets').checked,
          smellNormal: document.getElementById('subCheckSmell').checked
        },
        remarks
      };

      task.status = 'SUBMITTED_FOR_REVIEW';
      task.timeline.push({
        id: 'tm-' + Date.now(),
        status: 'SUBMITTED_FOR_REVIEW',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        comment: `Submitted measurements: Moisture ${moisture}%, Weevils ${weevils}. Notes: ${remarks}`
      });

      // Notify Manager
      createInAppNotification({
        userId: 'u-manager-01',
        targetRole: 'MANAGER',
        warehouseId: task.warehouseId,
        taskId: task.id,
        batchId: task.batchId,
        type: 'TASK_SUBMITTED',
        severity: 'info',
        title: `Task Awaiting Quality Review: ${task.taskNo}`,
        message: `Operator ${user.fullName} submitted laboratory assaying for Batch ${task.batchId}.`
      });

      saveState();
      closeSubmitEvidenceModal();
      showToast(`Submitted ${task.taskNo} for Supervisor Review`);
      renderCurrentRoute();
    }

    // Report Blocker Modal
    function openReportBlockerModal(taskId) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      document.getElementById('taskBlockerId').value = task.id;
      const modal = document.getElementById('taskBlockerModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeReportBlockerModal() {
      const modal = document.getElementById('taskBlockerModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleReportBlocker(e) {
      e.preventDefault();
      const taskId = document.getElementById('taskBlockerId').value;
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      const category = document.getElementById('blockerCategory').value;
      const details = document.getElementById('blockerDetails').value;

      task.status = 'BLOCKED';
      task.blockerReason = `${category}: ${details}`;
      task.timeline.push({
        id: 'tm-' + Date.now(),
        status: 'BLOCKED',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        comment: `Operational Blocker: ${task.blockerReason}`
      });

      createInAppNotification({
        userId: 'u-manager-01',
        targetRole: 'MANAGER',
        warehouseId: task.warehouseId,
        taskId: task.id,
        batchId: task.batchId,
        type: 'TASK_BLOCKED',
        severity: 'urgent',
        title: `⚠️ Task Blocker: ${task.taskNo}`,
        message: `Operator ${user.fullName} reported blocker on Batch ${task.batchId}: ${details}.`
      });

      saveState();
      closeReportBlockerModal();
      showToast(`Blocker logged on ${task.taskNo}`);
      renderCurrentRoute();
    }

    // Manager Quality Review Modal
    function openTaskReviewModal(taskId) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      if (!user || (user.role !== 'MANAGER' && !user.permissions?.includes('APPROVE_QUALITY'))) {
        alert('Unauthorized: Only Manager or authorized Quality Assayers can approve quality decisions.');
        return;
      }

      const std = appState.commodityStandards[task.commodity] || { maxMoisture: 12.0, maxForeignMatter: 0.75, maxWeevilCount: 1 };
      const m = task.submission?.measurements || {};
      const moistPassed = m.moisturePct !== undefined ? m.moisturePct <= std.maxMoisture : true;
      const weevilPassed = m.weevilCount !== undefined ? m.weevilCount <= std.maxWeevilCount : true;

      const content = document.getElementById('taskReviewModalContent');
      content.innerHTML = `
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-mono text-[10px] text-slate-400 block">${task.taskNo}</span>
              <strong class="text-sm font-bold text-slate-900">${task.title}</strong>
            </div>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Awaiting Quality Sign-off
            </span>
          </div>
          <p class="text-xs text-slate-600 mt-1">${task.description}</p>
        </div>

        <!-- Submitted vs Standard Tolerance Comparison -->
        <div>
          <h4 class="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">Assay Verification vs Official Standards:</h4>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="p-3 rounded-xl border ${moistPassed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-rose-50/70 border-rose-200 text-rose-950'}">
              <span class="text-[10px] text-slate-500 block">Moisture Content</span>
              <strong class="text-base font-bold">${m.moisturePct ?? 'N/A'}%</strong>
              <span class="text-[9px] block mt-0.5 text-slate-400">Ceiling: ${std.maxMoisture}%</span>
            </div>

            <div class="p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-800">
              <span class="text-[10px] text-slate-500 block">Foreign Matter</span>
              <strong class="text-base font-bold">${m.foreignMatterPct ?? 'N/A'}%</strong>
              <span class="text-[9px] block mt-0.5 text-slate-400">Ceiling: ${std.maxForeignMatter}%</span>
            </div>

            <div class="p-3 rounded-xl border ${weevilPassed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-rose-50/70 border-rose-200 text-rose-950'}">
              <span class="text-[10px] text-slate-500 block">Live Weevils</span>
              <strong class="text-base font-bold">${m.weevilCount ?? 0}</strong>
              <span class="text-[9px] block mt-0.5 text-slate-400">Ceiling: ${std.maxWeevilCount}</span>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span class="text-[10px] font-bold text-slate-400 block uppercase">Operator Remarks:</span>
          <p class="text-slate-800 text-xs mt-0.5 font-medium">${task.submission?.remarks || 'No remarks provided.'}</p>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Supervisor Decision Remarks *</label>
          <textarea id="taskReviewRemarks" rows="2.5" class="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium resize-none" placeholder="Provide quality approval remarks, quarantine directives, or recheck guidelines..."></textarea>
        </div>

        <!-- Decision Buttons -->
        <div class="pt-3 border-t border-slate-200 space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick="handleTaskReviewDecision('${task.id}', 'APPROVED')"
              class="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✓ Approve Quality (FIFO Eligible)</span>
            </button>

            <button
              type="button"
              onclick="handleTaskReviewDecision('${task.id}', 'RECHECK_REQUIRED')"
              class="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Mandate Recheck 🔄</span>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick="handleTaskReviewDecision('${task.id}', 'HOLD')"
              class="w-full py-2 px-3 rounded-xl border border-amber-300 text-amber-900 hover:bg-amber-50 font-bold text-xs cursor-pointer"
            >
              Place Batch on Hold (Skip FIFO)
            </button>

            <button
              type="button"
              onclick="handleTaskReviewDecision('${task.id}', 'REJECTED')"
              class="w-full py-2 px-3 rounded-xl border border-rose-300 text-rose-900 hover:bg-rose-50 font-bold text-xs cursor-pointer"
            >
              Reject Consignment (Quarantine)
            </button>
          </div>
        </div>
      `;

      const modal = document.getElementById('taskReviewModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeTaskReviewModal() {
      const modal = document.getElementById('taskReviewModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleTaskReviewDecision(taskId, decision) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      const remarks = document.getElementById('taskReviewRemarks')?.value || `Decision: ${decision} recorded.`;
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      task.review = {
        reviewedAt: nowStr,
        reviewedBy: user.fullName,
        reviewerRole: user.role,
        decision,
        remarks
      };

      const targetBatch = appState.batches.find(b => b.id === task.batchId);

      if (decision === 'APPROVED') {
        task.status = 'COMPLETED';
        task.timeline.push({
          id: 'tm-' + Date.now(),
          status: 'COMPLETED',
          timestamp: nowStr,
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          comment: `Quality Approved: ${remarks}. Batch ${task.batchId} certified for FIFO rotation.`
        });

        if (targetBatch) {
          targetBatch.qualityStatus = 'Eligible';
          targetBatch.allocatedBy = user.fullName;
          targetBatch.allocatedAt = nowStr;
        }

        // Traceable Inspection Record
        const m = task.submission?.measurements || {};
        appState.inspections.unshift({
          id: 'INSP-' + Date.now(),
          batchId: task.batchId,
          commodity: task.commodity,
          sampleQtyKg: 1.0,
          moisturePct: m.moisturePct ?? 11.2,
          foreignMatterPct: m.foreignMatterPct ?? 0.35,
          weevilCount: m.weevilCount ?? 0,
          smellDamageCheck: 'PASS',
          packagingCondition: 'PASS',
          testedBy: `${user.fullName} (${user.roleTitle || 'Supervisor'})`,
          timestamp: nowStr,
          decision: 'Approved',
          notes: `Formal verification for Task ${task.taskNo}: ${remarks}`,
          evidencePhoto: null
        });

        // Notify Operator
        createInAppNotification({
          userId: task.assignedToId,
          targetRole: 'WAREHOUSE_ADMIN',
          warehouseId: task.warehouseId,
          taskId: task.id,
          batchId: task.batchId,
          type: 'QUALITY_APPROVED',
          severity: 'success',
          title: `✅ Quality Approved: Batch ${task.batchId}`,
          message: `Manager ${user.fullName} approved task ${task.taskNo}. Stock is now admissible for FIFO allocation.`
        });

      } else if (decision === 'HOLD') {
        task.status = 'COMPLETED';
        task.timeline.push({
          id: 'tm-' + Date.now(),
          status: 'COMPLETED',
          timestamp: nowStr,
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          comment: `Decision: Quality Hold. ${remarks}`
        });

        if (targetBatch) {
          targetBatch.qualityStatus = 'Hold';
          targetBatch.holdReason = remarks;
        }

        createInAppNotification({
          userId: task.assignedToId,
          targetRole: 'WAREHOUSE_ADMIN',
          warehouseId: task.warehouseId,
          taskId: task.id,
          batchId: task.batchId,
          type: 'QUALITY_HOLD',
          severity: 'warning',
          title: `Batch ${task.batchId} Placed on Hold`,
          message: `Supervisor decision: ${remarks}. Stock excluded from FIFO allocation.`
        });

      } else if (decision === 'REJECTED') {
        task.status = 'COMPLETED';
        task.timeline.push({
          id: 'tm-' + Date.now(),
          status: 'COMPLETED',
          timestamp: nowStr,
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          comment: `Decision: Rejected. Consignment moved to quarantine. ${remarks}`
        });

        if (targetBatch) {
          targetBatch.qualityStatus = 'Rejected';
          targetBatch.holdReason = remarks;
        }

      } else if (decision === 'RECHECK_REQUIRED') {
        task.status = 'RECHECK_REQUIRED';
        task.timeline.push({
          id: 'tm-' + Date.now(),
          status: 'RECHECK_REQUIRED',
          timestamp: nowStr,
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          comment: `Recheck mandated: ${remarks}`
        });

        createInAppNotification({
          userId: task.assignedToId,
          targetRole: 'WAREHOUSE_ADMIN',
          warehouseId: task.warehouseId,
          taskId: task.id,
          batchId: task.batchId,
          type: 'TASK_RECHECK',
          severity: 'warning',
          title: `Recheck Required: ${task.taskNo}`,
          message: `Supervisor requested re-assaying on Batch ${task.batchId}: ${remarks}`
        });
      }

      // Audit Log
      appState.auditLogs.unshift({
        id: 'AUD-' + Date.now(),
        action: 'QUALITY_DECISION',
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        warehouseId: task.warehouseId,
        warehouseName: task.warehouseName,
        targetRef: task.batchId,
        details: `Quality decision on Task ${task.taskNo} (Batch ${task.batchId}): ${decision}. ${remarks}`,
        timestamp: nowStr,
        status: 'SUCCESS'
      });

      saveState();
      closeTaskReviewModal();
      showToast(`Decision recorded: ${decision}`);
      renderCurrentRoute();
    }

    // Reassign Task
    function openReassignTaskModal(taskId) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      document.getElementById('reassignTaskId').value = task.id;
      const opSelect = document.getElementById('reassignOperator');
      const operators = appState.users.filter(u => u.role === 'WAREHOUSE_ADMIN' && u.isActive && u.warehouseId === task.warehouseId);
      opSelect.innerHTML = operators.map(u => `
        <option value="${u.id}" ${u.id === task.assignedToId ? 'selected' : ''}>${u.fullName} (${u.roleTitle || 'Operator'})</option>
      `).join('');

      document.getElementById('reassignPriority').value = task.priority;
      document.getElementById('reassignDueAt').value = task.dueAt;

      const modal = document.getElementById('taskReassignModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeReassignTaskModal() {
      const modal = document.getElementById('taskReassignModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function handleReassignTaskSubmit(e) {
      e.preventDefault();
      const taskId = document.getElementById('reassignTaskId').value;
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      const opId = document.getElementById('reassignOperator').value;
      const priority = document.getElementById('reassignPriority').value;
      const dueAt = document.getElementById('reassignDueAt').value;

      const operator = appState.users.find(u => u.id === opId);
      const opName = operator ? operator.fullName : task.assignedToName;

      task.assignedToId = opId;
      task.assignedToName = opName;
      task.priority = priority;
      task.dueAt = dueAt;
      task.timeline.push({
        id: 'tm-' + Date.now(),
        status: task.status,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        comment: `Reassigned to ${opName}. Priority: ${priority}. Updated SLA: ${dueAt}`
      });

      createInAppNotification({
        userId: opId,
        targetRole: 'WAREHOUSE_ADMIN',
        warehouseId: task.warehouseId,
        taskId: task.id,
        batchId: task.batchId,
        type: 'TASK_UPDATED',
        severity: priority === 'URGENT' ? 'urgent' : 'info',
        title: `Task Reassigned to You: ${task.taskNo}`,
        message: `Manager ${user.fullName} reassigned task '${task.title}' to you. Due by ${dueAt}.`
      });

      saveState();
      closeReassignTaskModal();
      showToast(`Reassigned ${task.taskNo} to ${opName}`);
      renderCurrentRoute();
    }

    function handleCancelTask(taskId) {
      if (!confirm('Are you sure you want to cancel this warehouse task?')) return;
      const task = appState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const user = appState.currentUser;
      task.status = 'CANCELLED';
      task.timeline.push({
        id: 'tm-' + Date.now(),
        status: 'CANCELLED',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        comment: `Task cancelled by ${user.fullName}.`
      });

      createInAppNotification({
        userId: task.assignedToId,
        targetRole: 'WAREHOUSE_ADMIN',
        warehouseId: task.warehouseId,
        taskId: task.id,
        batchId: task.batchId,
        type: 'TASK_CANCELLED',
        severity: 'info',
        title: `Task Cancelled: ${task.taskNo}`,
        message: `Task '${task.title}' was cancelled by Manager ${user.fullName}.`
      });

      saveState();
      showToast(`Cancelled task ${task.taskNo}`);
      renderCurrentRoute();
    }

    // =========================================================================
    // IN-APP NOTIFICATION CENTER & BELL DROPDOWN
    // =========================================================================

    function createInAppNotification({ userId, targetRole, warehouseId, taskId, batchId, type, severity, title, message }) {
      if (!appState.notifications) appState.notifications = [];
      const notif = {
        id: 'NOTIF-' + Date.now(),
        userId,
        targetRole: targetRole || 'ALL',
        warehouseId: warehouseId || 'GLOBAL',
        taskId,
        batchId,
        type,
        severity: severity || 'info',
        title,
        message,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        isRead: false
      };
      appState.notifications.unshift(notif);
      updateNotificationBadge();
      return notif;
    }

    function updateNotificationBadge() {
      const user = appState.currentUser;
      if (!user) return;
      const isManager = user.role === 'MANAGER';
      const notifs = (appState.notifications || []).filter(n => {
        if (isManager) return n.targetRole === 'MANAGER' || n.targetRole === 'ALL' || n.userId === user.id;
        return n.userId === user.id || (n.targetRole === 'WAREHOUSE_ADMIN' && (!n.userId || n.userId === user.id));
      });
      const unreadCount = notifs.filter(n => !n.isRead).length;

      const badge = document.getElementById('bellBadge');
      if (badge) {
        badge.textContent = unreadCount;
        badge.classList.toggle('hidden', unreadCount === 0);
      }

      const countBadge = document.getElementById('notifUnreadCountBadge');
      if (countBadge) {
        countBadge.textContent = `${unreadCount} Unread`;
      }
    }

    function setNotificationTab(tab) {
      appState.activeTaskFilterNotification = tab;
      const tabs = ['ALL', 'TASKS', 'QUALITY'];
      tabs.forEach(t => {
        const btn = document.getElementById(`notifTab-${t}`);
        if (btn) {
          if (t === tab) {
            btn.className = 'px-2.5 py-1 rounded-md font-semibold cursor-pointer bg-slate-200 text-slate-900 transition-colors';
          } else {
            btn.className = 'px-2.5 py-1 rounded-md font-semibold cursor-pointer text-slate-500 hover:bg-slate-100 transition-colors';
          }
        }
      });
      renderNotificationCenter();
    }

    function renderNotificationCenter() {
      const list = document.getElementById('alertsDropdownList');
      if (!list) return;

      const user = appState.currentUser;
      if (!user) return;
      const isManager = user.role === 'MANAGER';
      const tab = appState.activeTaskFilterNotification || 'ALL';

      let notifs = (appState.notifications || []).filter(n => {
        if (isManager) return n.targetRole === 'MANAGER' || n.targetRole === 'ALL' || n.userId === user.id;
        return n.userId === user.id || (n.targetRole === 'WAREHOUSE_ADMIN' && (!n.userId || n.userId === user.id));
      });

      if (tab === 'TASKS') {
        notifs = notifs.filter(n => n.type?.startsWith('TASK_'));
      } else if (tab === 'QUALITY') {
        notifs = notifs.filter(n => n.type?.includes('QUALITY') || n.type === 'ALERT' || n.type === 'TASK_OVERDUE');
      }

      updateNotificationBadge();

      if (notifs.length === 0) {
        list.innerHTML = `
          <div class="p-8 text-center text-slate-400">
            <span class="text-2xl block mb-1">🔔</span>
            <p class="font-medium text-xs text-slate-600">No notifications in this tab</p>
            <p class="text-[10px] text-slate-400 mt-0.5">All updates have been reviewed.</p>
          </div>
        `;
        return;
      }

      list.innerHTML = notifs.map(n => `
        <div class="p-3.5 hover:bg-slate-50/80 transition-colors flex items-start gap-3 relative ${n.isRead ? 'opacity-70' : 'bg-blue-50/20'}">
          <!-- Severity Icon -->
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            n.severity === 'urgent' ? 'bg-rose-100 text-rose-700' :
            n.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
            n.severity === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#0B4DA8]'
          }">
            ${n.severity === 'urgent' ? '🚨' : n.severity === 'warning' ? '⚠️' : n.severity === 'success' ? '✅' : '📋'}
          </div>

          <!-- Body -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <strong class="font-bold text-slate-900 text-xs truncate leading-snug">${n.title}</strong>
              ${!n.isRead ? '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>' : ''}
            </div>
            <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">${n.message}</p>
            <div class="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/60">
              <span class="text-[10px] text-slate-400 font-mono">${n.timestamp}</span>

              <div class="flex items-center gap-2">
                ${n.taskId ? `
                  <button
                    onclick="toggleAlertsDropdown(); markNotificationRead('${n.id}'); openTaskDetailDrawer('${n.taskId}')"
                    class="text-[10px] font-bold text-[#0B4DA8] hover:underline cursor-pointer"
                  >
                    Open Task →
                  </button>
                ` : n.batchId ? `
                  <button
                    onclick="toggleAlertsDropdown(); markNotificationRead('${n.id}'); openBatchDrawer('${n.batchId}')"
                    class="text-[10px] font-bold text-[#0B4DA8] hover:underline cursor-pointer"
                  >
                    View Batch →
                  </button>
                ` : ''}

                ${!n.isRead ? `
                  <button
                    onclick="markNotificationRead('${n.id}')"
                    class="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Mark read"
                  >
                    ✓ Read
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    function markNotificationRead(id) {
      const notif = (appState.notifications || []).find(n => n.id === id);
      if (notif) {
        notif.isRead = true;
        saveState();
        renderNotificationCenter();
      }
    }

    function markAllNotificationsRead() {
      const user = appState.currentUser;
      if (!user) return;
      const isManager = user.role === 'MANAGER';
      (appState.notifications || []).forEach(n => {
        if (isManager && (n.targetRole === 'MANAGER' || n.targetRole === 'ALL' || n.userId === user.id)) {
          n.isRead = true;
        } else if (!isManager && (n.userId === user.id || n.targetRole === 'WAREHOUSE_ADMIN')) {
          n.isRead = true;
        }
      });
      saveState();
      renderNotificationCenter();
      showToast('All notifications marked as read');
    }
