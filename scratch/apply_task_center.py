# Script to apply Task Assignment, Quality Follow-up & Real-Time Notification Center to index.html
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print(f"Initial index.html size: {len(html)} chars")

# =============================================================================
# PART 1: Seed Data in appState (tasks, notifications, filters)
# =============================================================================

old_alerts_block = """      alerts: [
        { id: 'alt-1', type: 'amber', title: 'Batch B004 is on Hold (Quality Inspection Pending)', date: '05 Feb 2025', isRead: false },
        { id: 'alt-2', type: 'red',   title: 'Batch B007 has been Rejected', date: '10 Mar 2025', isRead: false },
        { id: 'alt-3', type: 'blue',  title: 'Batch B002 is 80% aged (Consider dispatch soon)', date: '10 Jan 2025', isRead: false }
      ]"""

new_tasks_and_notifications_block = """      alerts: [
        { id: 'alt-1', type: 'amber', title: 'Batch B004 is on Hold (Quality Inspection Pending)', date: '05 Feb 2025', isRead: false },
        { id: 'alt-2', type: 'red',   title: 'Batch B007 has been Rejected', date: '10 Mar 2025', isRead: false },
        { id: 'alt-3', type: 'blue',  title: 'Batch B002 is 80% aged (Consider dispatch soon)', date: '10 Jan 2025', isRead: false }
      ],

      // Task Management & Quality Follow-up State
      managerTaskSearchQuery: '',
      managerTaskTypeFilter: 'ALL',
      managerTaskStatusFilter: 'ALL',
      managerTaskPriorityFilter: 'ALL',
      managerTaskWarehouseFilter: 'ALL',

      operatorTaskTab: 'ALL',
      operatorTaskSearchQuery: '',
      operatorTaskPriorityFilter: 'ALL',

      selectedTaskId: null,
      activeTaskFilterNotification: 'ALL',

      tasks: [
        {
          id: 'TSK-2025-001',
          taskNo: 'TSK-2025-001',
          title: 'Aerate & Re-assay Held Rice Consignment',
          description: 'Batch B004 was quarantined on quality hold due to 14.8% moisture (ceiling 14.0%). Verify mechanical aeration run in Bay B and conduct moisture meter assay.',
          taskType: 'QUALITY_INSPECTION',
          taskTypeTitle: 'Quality Inspection & Re-assay',
          batchId: 'B004',
          commodity: 'Rice',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          assignedToId: 'u-admin-ngp',
          assignedToName: 'Ramesh Patil',
          assignedToRole: 'WAREHOUSE_ADMIN',
          assignedById: 'u-manager-01',
          assignedByName: 'Aayush Tripathi',
          assignedAt: '2025-10-23 09:00',
          priority: 'HIGH',
          dueAt: '2025-10-24 16:00',
          isOverdue: false,
          status: 'IN_PROGRESS',
          checklist: [
            { id: 'c1', label: 'Verify mechanical aeration run duration >= 48 hours', required: true, type: 'boolean', value: true },
            { id: 'c2', label: 'Moisture % Meter Measurement (Must be <= 14.0%)', required: true, type: 'number', unit: '%', value: 13.8 },
            { id: 'c3', label: 'Check for moisture condensation inside inner liner', required: true, type: 'boolean', value: false },
            { id: 'c4', label: 'Absence of damp or moldy smell', required: true, type: 'boolean', value: true }
          ],
          submission: null,
          blockerReason: null,
          recheckReason: null,
          timeline: [
            { id: 'tm-1', status: 'ASSIGNED', timestamp: '2025-10-23 09:00', actorId: 'u-manager-01', actorName: 'Aayush Tripathi', actorRole: 'MANAGER', comment: 'Task assigned following laboratory hold notice.' },
            { id: 'tm-2', status: 'ACCEPTED', timestamp: '2025-10-23 09:30', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Accepted task. Scheduled aeration fans check.' },
            { id: 'tm-3', status: 'IN_PROGRESS', timestamp: '2025-10-24 08:15', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Began sampling top, middle and bottom bags across 120 bags stack.' }
          ]
        },
        {
          id: 'TSK-2025-002',
          taskNo: 'TSK-2025-002',
          title: 'Pre-Dispatch Physical Bag Count Verification',
          description: 'Audit physical stack counts and bag seals for Batch B006 prior to outward lifting for Fair Price Shop FPS-104 (Sadar Bazar).',
          taskType: 'DISPATCH_PREPARATION',
          taskTypeTitle: 'Dispatch Preparation & Bag Count',
          batchId: 'B006',
          commodity: 'Wheat',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          assignedToId: 'u-admin-ngp',
          assignedToName: 'Ramesh Patil',
          assignedToRole: 'WAREHOUSE_ADMIN',
          assignedById: 'u-manager-01',
          assignedByName: 'Aayush Tripathi',
          assignedAt: '2025-10-23 14:00',
          priority: 'NORMAL',
          dueAt: '2025-10-24 17:30',
          isOverdue: false,
          status: 'ACCEPTED',
          checklist: [
            { id: 'c1', label: 'Physical bag count matches allocated 50 bags exactly', required: true, type: 'boolean' },
            { id: 'c2', label: 'No burst or torn jute bags detected in pick face', required: true, type: 'boolean' },
            { id: 'c3', label: 'Official stencil markings legible (B006 / MP Supplies)', required: true, type: 'boolean' }
          ],
          submission: null,
          timeline: [
            { id: 'tm-4', status: 'ASSIGNED', timestamp: '2025-10-23 14:00', actorId: 'u-manager-01', actorName: 'Aayush Tripathi', actorRole: 'MANAGER', comment: 'Order D0059 allocated. Verify stock staging.' },
            { id: 'tm-5', status: 'ACCEPTED', timestamp: '2025-10-23 15:10', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Order staging accepted for afternoon loading bay.' }
          ]
        },
        {
          id: 'TSK-2025-003',
          taskNo: 'TSK-2025-003',
          title: 'Post-Fumigation Quarantine Clearance Assaying',
          description: 'Quarantined Batch B007 completed aluminium phosphide fumigation. Sample 10% bags to confirm 0 live weevils before considering release.',
          taskType: 'RECHECK',
          taskTypeTitle: 'Post-Treatment Quality Recheck',
          batchId: 'B007',
          commodity: 'Wheat',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          assignedToId: 'u-admin-ngp',
          assignedToName: 'Ramesh Patil',
          assignedToRole: 'WAREHOUSE_ADMIN',
          assignedById: 'u-manager-01',
          assignedByName: 'Aayush Tripathi',
          assignedAt: '2025-10-22 10:00',
          priority: 'URGENT',
          dueAt: '2025-10-23 12:00',
          isOverdue: true,
          status: 'ASSIGNED',
          checklist: [
            { id: 'c1', label: 'Gas degasification certificate CERT-FUM-8812 verified', required: true, type: 'boolean' },
            { id: 'c2', label: 'Live Weevil Count per 1000g sample (Must be 0)', required: true, type: 'number', unit: 'insects' },
            { id: 'c3', label: 'Grain temperature within ambient tolerance (< 32°C)', required: true, type: 'boolean' }
          ],
          submission: null,
          timeline: [
            { id: 'tm-6', status: 'ASSIGNED', timestamp: '2025-10-22 10:00', actorId: 'u-manager-01', actorName: 'Aayush Tripathi', actorRole: 'MANAGER', comment: 'Urgent quarantine recheck assigned.' }
          ]
        },
        {
          id: 'TSK-2025-004',
          taskNo: 'TSK-2025-004',
          title: 'Intake Consignment Bin Stacking & Quality Sampling',
          description: 'Consignment B008 (200 Bags Wheat) received at Gate 1. Stack in bulk bay and perform laboratory sampling.',
          taskType: 'STOCK_VERIFICATION',
          taskTypeTitle: 'Stock Verification & Intake Sampling',
          batchId: 'B008',
          commodity: 'Wheat',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          assignedToId: 'u-admin-ngp',
          assignedToName: 'Ramesh Patil',
          assignedToRole: 'WAREHOUSE_ADMIN',
          assignedById: 'u-manager-01',
          assignedByName: 'Aayush Tripathi',
          assignedAt: '2025-10-24 07:00',
          priority: 'HIGH',
          dueAt: '2025-10-24 14:00',
          isOverdue: false,
          status: 'SUBMITTED_FOR_REVIEW',
          checklist: [
            { id: 'c1', label: 'Stack stability & dunnage placement verified', required: true, type: 'boolean', value: true },
            { id: 'c2', label: 'Moisture % Meter Reading (Tolerance <= 12.0%)', required: true, type: 'number', unit: '%', value: 11.0 },
            { id: 'c3', label: 'Foreign matter percentage (Tolerance <= 0.75%)', required: true, type: 'number', unit: '%', value: 0.40 },
            { id: 'c4', label: 'Weevil Count (Tolerance <= 1)', required: true, type: 'number', unit: 'count', value: 0 }
          ],
          submission: {
            submittedAt: '2025-10-24 10:15',
            submittedBy: 'Ramesh Patil',
            measurements: {
              moisturePct: 11.0,
              foreignMatterPct: 0.40,
              weevilCount: 0,
              damagedBagsCount: 0
            },
            checklistResponses: { c1: true, c2: 11.0, c3: 0.40, c4: 0 },
            remarks: 'Sound quality fresh harvest intake. Moisture 11.0% well below 12.0% ceiling. Stacking completed on wooden dunnage crates in Bay A.',
            evidenceNotes: 'Sample composite sealed in moisture canister #MC-1049.'
          },
          timeline: [
            { id: 'tm-7', status: 'ASSIGNED', timestamp: '2025-10-24 07:00', actorId: 'u-manager-01', actorName: 'Aayush Tripathi', actorRole: 'MANAGER', comment: 'Assigned upon Gate 1 arrival.' },
            { id: 'tm-8', status: 'ACCEPTED', timestamp: '2025-10-24 07:30', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Operator accepted.' },
            { id: 'tm-9', status: 'IN_PROGRESS', timestamp: '2025-10-24 08:00', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Unloading and stacking underway.' },
            { id: 'tm-10', status: 'SUBMITTED_FOR_REVIEW', timestamp: '2025-10-24 10:15', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Submitted for laboratory quality review & clearance.' }
          ]
        },
        {
          id: 'TSK-2025-005',
          taskNo: 'TSK-2025-005',
          title: 'Initial Intake Assay Verification (Pune Depot)',
          description: 'Routine intake assay verification for 180 bags wheat at District Buffer Depot, Pune.',
          taskType: 'QUALITY_INSPECTION',
          taskTypeTitle: 'Quality Inspection & Assay',
          batchId: 'B009',
          commodity: 'Wheat',
          warehouseId: 'GDN-PUN-02',
          warehouseName: 'District Buffer Depot, Pune',
          assignedToId: 'u-admin-pun',
          assignedToName: 'Suresh Shinde',
          assignedToRole: 'WAREHOUSE_ADMIN',
          assignedById: 'u-manager-01',
          assignedByName: 'Aayush Tripathi',
          assignedAt: '2025-03-15 09:00',
          priority: 'NORMAL',
          dueAt: '2025-03-15 18:00',
          isOverdue: false,
          status: 'COMPLETED',
          checklist: [
            { id: 'c1', label: 'Moisture % Meter Measurement', required: true, type: 'number', unit: '%', value: 10.9 },
            { id: 'c2', label: 'Stacking integrity confirmed', required: true, type: 'boolean', value: true }
          ],
          submission: {
            submittedAt: '2025-03-15 14:00',
            submittedBy: 'Suresh Shinde',
            measurements: { moisturePct: 10.9, foreignMatterPct: 0.3, weevilCount: 0 },
            remarks: 'Passed all parameters cleanly. Stock sound.'
          },
          review: {
            reviewedAt: '2025-03-15 15:30',
            reviewedBy: 'Aayush Tripathi',
            reviewerRole: 'MANAGER',
            decision: 'APPROVED',
            remarks: 'Intake approved and admitted into FIFO rotation queue.'
          },
          timeline: [
            { id: 'tm-11', status: 'ASSIGNED', timestamp: '2025-03-15 09:00', actorId: 'u-manager-01', actorName: 'Aayush Tripathi', actorRole: 'MANAGER', comment: 'Assigned to Pune operator.' },
            { id: 'tm-12', status: 'COMPLETED', timestamp: '2025-03-15 15:30', actorId: 'u-manager-01', actorName: 'Aayush Tripathi', actorRole: 'MANAGER', comment: 'Approved following physical assay.' }
          ]
        }
      ],

      notifications: [
        {
          id: 'NOTIF-001',
          userId: 'u-admin-ngp',
          targetRole: 'WAREHOUSE_ADMIN',
          warehouseId: 'GDN-NGP-01',
          taskId: 'TSK-2025-001',
          batchId: 'B004',
          type: 'TASK_ASSIGNED',
          severity: 'urgent',
          title: 'High-Priority Task Assigned',
          message: 'Manager Aayush Tripathi assigned task: Aerate & Re-assay Held Rice Consignment (Batch B004).',
          timestamp: '2025-10-23 09:00',
          isRead: false
        },
        {
          id: 'NOTIF-002',
          userId: 'u-manager-01',
          targetRole: 'MANAGER',
          warehouseId: 'GDN-NGP-01',
          taskId: 'TSK-2025-004',
          batchId: 'B008',
          type: 'TASK_SUBMITTED',
          severity: 'info',
          title: 'Task Awaiting Quality Review',
          message: 'Operator Ramesh Patil submitted Task TSK-2025-004 (Batch B008 Intake Sampling) for review.',
          timestamp: '2025-10-24 10:15',
          isRead: false
        },
        {
          id: 'NOTIF-003',
          userId: 'u-manager-01',
          targetRole: 'MANAGER',
          warehouseId: 'GDN-NGP-01',
          taskId: 'TSK-2025-003',
          batchId: 'B007',
          type: 'TASK_OVERDUE',
          severity: 'urgent',
          title: 'Overdue Task Alert',
          message: 'Urgent task TSK-2025-003 (Quarantine Clearance for Batch B007) is overdue by 16 hours.',
          timestamp: '2025-10-23 12:01',
          isRead: false
        },
        {
          id: 'NOTIF-004',
          userId: 'u-admin-ngp',
          targetRole: 'WAREHOUSE_ADMIN',
          warehouseId: 'GDN-NGP-01',
          taskId: 'TSK-2025-002',
          batchId: 'B006',
          type: 'TASK_ASSIGNED',
          severity: 'info',
          title: 'Dispatch Preparation Assigned',
          message: 'Dispatch Preparation assigned for Order D0059 / Batch B006.',
          timestamp: '2025-10-23 14:00',
          isRead: true
        }
      ]"""

assert old_alerts_block in html, "old_alerts_block not found in index.html"
html = html.replace(old_alerts_block, new_tasks_and_notifications_block, 1)
print("Part 1: Seed tasks and notifications added.")

# =============================================================================
# PART 2: saveState & loadState Update
# =============================================================================

old_save_state = """        localStorage.setItem('bhandarsetu_html_state', JSON.stringify({
          batches: appState.batches,
          dispatches: appState.dispatches,
          alerts: appState.alerts,"""

new_save_state = """        localStorage.setItem('bhandarsetu_html_state', JSON.stringify({
          batches: appState.batches,
          dispatches: appState.dispatches,
          alerts: appState.alerts,
          tasks: appState.tasks,
          notifications: appState.notifications,"""

assert old_save_state in html, "old_save_state not found"
html = html.replace(old_save_state, new_save_state, 1)

old_load_state = """        if (parsed.auditLogs && parsed.auditLogs.length > 0) appState.auditLogs = parsed.auditLogs;"""

new_load_state = """        if (parsed.auditLogs && parsed.auditLogs.length > 0) appState.auditLogs = parsed.auditLogs;
        if (parsed.tasks && parsed.tasks.length > 0) appState.tasks = parsed.tasks;
        if (parsed.notifications && parsed.notifications.length > 0) appState.notifications = parsed.notifications;"""

assert old_load_state in html, "old_load_state not found"
html = html.replace(old_load_state, new_load_state, 1)
print("Part 2: saveState & loadState updated.")

# =============================================================================
# PART 3: Navigation & Routing Mappings
# =============================================================================

old_route_meta = """    const routeMetaMap = {
      'dashboard': { group: 'Overview', title: 'Dashboard', short: 'Dashboard' },"""

new_route_meta = """    const routeMetaMap = {
      'dashboard': { group: 'Overview', title: 'Dashboard', short: 'Dashboard' },
      'manager-tasks': { group: 'Operations', title: 'Task & Quality Follow-up', short: 'Task Follow-up' },
      'operator-tasks': { group: 'Godown Operations', title: 'My Tasks', short: 'My Tasks' },"""

assert old_route_meta in html, "old_route_meta not found"
html = html.replace(old_route_meta, new_route_meta, 1)

old_path_to_route = """      '/settings': 'settings'
    };"""

new_path_to_route = """      '/settings': 'settings',
      '/manager-tasks': 'manager-tasks',
      '/task-followup': 'manager-tasks',
      '/my-tasks': 'operator-tasks',
      '/operator-tasks': 'operator-tasks'
    };"""

assert old_path_to_route in html, "old_path_to_route not found"
html = html.replace(old_path_to_route, new_path_to_route, 1)

old_route_to_path = """      'settings': '/settings'
    };"""

new_route_to_path = """      'settings': '/settings',
      'manager-tasks': '/manager-tasks',
      'operator-tasks': '/my-tasks'
    };"""

assert old_route_to_path in html, "old_route_to_path not found"
html = html.replace(old_route_to_path, new_route_to_path, 1)

# RBAC Route Protection in setRoute()
old_set_route_rbac = """      if ((r === 'reports' || r === 'approvals' || r === 'audit') && role !== 'MANAGER') {
        r = 'unauthorized';
      }"""

new_set_route_rbac = """      if ((r === 'reports' || r === 'approvals' || r === 'audit' || r === 'manager-tasks') && role !== 'MANAGER') {
        r = 'unauthorized';
      }"""

assert old_set_route_rbac in html, "old_set_route_rbac not found"
html = html.replace(old_set_route_rbac, new_set_route_rbac, 1)
print("Part 3: Navigation and routing mappings registered.")

# =============================================================================
# PART 4: Sidebar Navigation Groups (getRoleNavGroups)
# =============================================================================

old_operations_group = """        {
          title: 'Operations',
          items: [
            {
              id: 'fifo',
              label: 'FIFO Allocation',"""

new_operations_group = """        {
          title: 'Operations',
          items: isManager ? [
            {
              id: 'manager-tasks',
              label: 'Task Follow-up',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>',
              badge: (appState.tasks || []).filter(t => t.status === 'SUBMITTED_FOR_REVIEW' || t.isOverdue || t.status === 'BLOCKED').length
            },
            {
              id: 'fifo',
              label: 'FIFO Allocation',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>'
            },
            {
              id: 'ready-dispatch',
              label: 'Ready to Dispatch',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>'
            },
            {
              id: 'out-delivery',
              label: 'Out for Delivery',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
            },
            {
              id: 'delivery-history',
              label: 'Delivery History',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            }
          ] : [
            {
              id: 'operator-tasks',
              label: 'My Tasks',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>',
              badge: (appState.tasks || []).filter(t => (t.assignedToId === (user ? user.id : '') || t.assignedToName === (user ? user.fullName : '')) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length
            },
            {
              id: 'fifo',
              label: 'FIFO Allocation',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>'
            },
            {
              id: 'ready-dispatch',
              label: 'Ready to Dispatch',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>'
            },
            {
              id: 'out-delivery',
              label: 'Out for Delivery',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
            },
            {
              id: 'delivery-history',
              label: 'Delivery History',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            }
          ]"""

assert old_operations_group in html, "old_operations_group not found"
html = html.replace(old_operations_group, new_operations_group, 1)
print("Part 4: Sidebar nav updated with role-specific task links and badges.")

# =============================================================================
# PART 5: renderCurrentRoute Hook
# =============================================================================

old_render_route = """      } else if (appState.activeRoute === 'settings') {
        container.innerHTML = renderSettingsView();
      }"""

new_render_route = """      } else if (appState.activeRoute === 'manager-tasks') {
        container.innerHTML = renderManagerTaskCenterView();
      } else if (appState.activeRoute === 'operator-tasks') {
        container.innerHTML = renderOperatorTaskCenterView();
      } else if (appState.activeRoute === 'settings') {
        container.innerHTML = renderSettingsView();
      }"""

assert old_render_route in html, "old_render_route not found"
html = html.replace(old_render_route, new_render_route, 1)
print("Part 5: renderCurrentRoute updated.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved intermediate updates to index.html.")
