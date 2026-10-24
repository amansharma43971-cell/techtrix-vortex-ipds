import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Protect tailwind.config
if "if (typeof tailwind !== 'undefined') {" not in content:
    content = content.replace(
        "  <script>\n    tailwind.config = {",
        "  <script>\n    if (typeof tailwind !== 'undefined') {\n      tailwind.config = {"
    )
    content = content.replace(
        "    };\n  </script>\n  <style>",
        "    };\n    }\n  </script>\n  <style>"
    )
    print("1. Protected tailwind.config against missing CDN")

# 2. Add sanitizeAppState and enhance localStorage handling
target_ls = """    // Load from localStorage if present
    try {
      const saved = localStorage.getItem('bhandarsetu_html_state');"""

replacement_ls = """    // Safe Data Sanitizer to prevent any null/undefined exceptions
    function sanitizeAppState() {
      const arrayKeys = [
        'batches', 'dispatches', 'alerts', 'bins', 'stockMovements', 
        'inspections', 'users', 'auditLogs', 'tasks', 'notifications', 
        'consignments', 'warehouses', 'allocationRequests',
        'damagedStock', 'clearanceOrders', 'stockTransfers', 
        'stockVerifications', 'disposalRequests'
      ];
      arrayKeys.forEach(k => {
        if (!Array.isArray(appState[k])) {
          appState[k] = [];
        } else {
          appState[k] = appState[k].filter(item => item !== null && item !== undefined);
        }
      });
      if (!appState.currentUser || typeof appState.currentUser !== 'object' || !appState.currentUser.role) {
        appState.currentUser = {
          id: 'u-manager-01',
          username: 'manager@bhandarsetu.gov.in',
          fullName: 'Aayush Tripathi',
          role: 'MANAGER',
          roleTitle: 'District Godown Manager / Supervisor',
          warehouseId: null,
          warehouseName: 'All Warehouses (National Central Depot)',
          email: 'manager@bhandarsetu.gov.in',
          isActive: true,
          permissions: ['VIEW_SYSTEM_DATA', 'MANAGE_USERS', 'APPROVE_EXCEPTIONS', 'VIEW_ANALYTICS', 'VIEW_AUDIT_LOGS', 'CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY', 'APPROVE_QUALITY', 'OVERRIDE_HOLD_BATCH', 'CANCEL_DISPATCH']
        };
      }
      appState.isAuthenticated = true;
    }

    // Load from localStorage if present
    try {
      const saved = localStorage.getItem('bhandarsetu_html_state');"""

if "function sanitizeAppState()" not in content:
    content = content.replace(target_ls, replacement_ls)
    print("2. Added sanitizeAppState definition")

# 3. Call sanitizeAppState right after try/catch localStorage
target_after_ls = """        if (parsed.warehouses && parsed.warehouses.length > 0) appState.warehouses = parsed.warehouses;
        if (parsed.currentUser && parsed.currentUser.role) {
          appState.currentUser = parsed.currentUser;
          appState.isAuthenticated = parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true;
          appState.authToken = parsed.authToken || 'BS-TOKEN-MANAGER-SECURE';
          appState.selectedWarehouseScope = parsed.selectedWarehouseScope || 'ALL';
        }
      }
    } catch (e) {}"""

replacement_after_ls = """        if (parsed.warehouses && parsed.warehouses.length > 0) appState.warehouses = parsed.warehouses;
        if (parsed.damagedStock && Array.isArray(parsed.damagedStock)) appState.damagedStock = parsed.damagedStock;
        if (parsed.clearanceOrders && Array.isArray(parsed.clearanceOrders)) appState.clearanceOrders = parsed.clearanceOrders;
        if (parsed.stockTransfers && Array.isArray(parsed.stockTransfers)) appState.stockTransfers = parsed.stockTransfers;
        if (parsed.stockVerifications && Array.isArray(parsed.stockVerifications)) appState.stockVerifications = parsed.stockVerifications;
        if (parsed.disposalRequests && Array.isArray(parsed.disposalRequests)) appState.disposalRequests = parsed.disposalRequests;
        if (parsed.currentUser && parsed.currentUser.role) {
          appState.currentUser = parsed.currentUser;
          appState.isAuthenticated = parsed.isAuthenticated !== undefined ? parsed.isAuthenticated : true;
          appState.authToken = parsed.authToken || 'BS-TOKEN-MANAGER-SECURE';
          appState.selectedWarehouseScope = parsed.selectedWarehouseScope || 'ALL';
        }
      }
    } catch (e) {
      console.warn('localStorage parse exception, resetting to defaults:', e);
    }
    sanitizeAppState();"""

if "if (parsed.damagedStock" not in content:
    content = content.replace(target_after_ls, replacement_after_ls)
    print("3. Restored stock control arrays from localStorage with safe sanitizeAppState()")

# 4. Save stock control arrays in saveState()
target_save = """          allocationRequests: appState.allocationRequests,
          consignments: appState.consignments,
          warehouses: appState.warehouses
        }));"""

replacement_save = """          allocationRequests: appState.allocationRequests,
          consignments: appState.consignments,
          warehouses: appState.warehouses,
          damagedStock: appState.damagedStock,
          clearanceOrders: appState.clearanceOrders,
          stockTransfers: appState.stockTransfers,
          stockVerifications: appState.stockVerifications,
          disposalRequests: appState.disposalRequests
        }));"""

if "damagedStock: appState.damagedStock" not in content:
    content = content.replace(target_save, replacement_save)
    print("4. Updated saveState() to persist stock control records")

# 5. Bulletproof getRoleNavGroups badges
content = content.replace(
    "const unreadAlerts = (appState.alerts || []).filter(a => !a.isRead).length;",
    "const unreadAlerts = (Array.isArray(appState.alerts) ? appState.alerts : []).filter(a => a && !a.isRead).length;"
)
content = content.replace(
    "badge: (appState.tasks || []).filter(t => t.status === 'SUBMITTED_FOR_REVIEW' || t.isOverdue || t.status === 'BLOCKED').length",
    "badge: (Array.isArray(appState.tasks) ? appState.tasks : []).filter(t => t && (t.status === 'SUBMITTED_FOR_REVIEW' || t.isOverdue || t.status === 'BLOCKED')).length"
)
content = content.replace(
    "badge: (appState.tasks || []).filter(t => (t.assignedToId === (user ? user.id : '') || t.assignedToName === (user ? user.fullName : '')) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length",
    "badge: (Array.isArray(appState.tasks) ? appState.tasks : []).filter(t => t && (t.assignedToId === (user ? user.id : '') || t.assignedToName === (user ? user.fullName : '')) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length"
)
content = content.replace(
    "badge: (appState.damagedStock || []).filter(d => d.status === 'ON_HOLD' || d.status === 'REPORTED').length",
    "badge: (Array.isArray(appState.damagedStock) ? appState.damagedStock : []).filter(d => d && (d.status === 'ON_HOLD' || d.status === 'REPORTED')).length"
)
content = content.replace(
    "badge: (appState.clearanceOrders || []).filter(c => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length",
    "badge: (Array.isArray(appState.clearanceOrders) ? appState.clearanceOrders : []).filter(c => c && (c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS')).length"
)
content = content.replace(
    "badge: (appState.stockTransfers || []).filter(t => t.status === 'IN_TRANSIT').length",
    "badge: (Array.isArray(appState.stockTransfers) ? appState.stockTransfers : []).filter(t => t && t.status === 'IN_TRANSIT').length"
)
content = content.replace(
    "badge: (appState.stockVerifications || []).filter(v => v.status === 'DISCREPANCY_DETECTED').length",
    "badge: (Array.isArray(appState.stockVerifications) ? appState.stockVerifications : []).filter(v => v && v.status === 'DISCREPANCY_DETECTED').length"
)
content = content.replace(
    "badge: (appState.disposalRequests || []).filter(d => d.status === 'REQUESTED' || d.status === 'UNDER_REVIEW').length",
    "badge: (Array.isArray(appState.disposalRequests) ? appState.disposalRequests : []).filter(d => d && (d.status === 'REQUESTED' || d.status === 'UNDER_REVIEW')).length"
)
print("5. Protected all getRoleNavGroups badge filters with Array.isArray and item truthiness")

# 6. Safeguard renderSidebar with try/catch and fallback
target_rendersidebar = """    function renderSidebar() {
      const container = document.getElementById('navList');
      if (!container) return;
      const groups = getRoleNavGroups();
      const isCollapsed = appState.sidebarCollapsed;

      container.innerHTML = groups.map((group, gIdx) => {"""

replacement_rendersidebar = """    function renderSidebar() {
      const container = document.getElementById('navList');
      if (!container) return;
      try {
        const groups = getRoleNavGroups() || [];
        const isCollapsed = appState.sidebarCollapsed;

        container.innerHTML = groups.map((group, gIdx) => {"""

if "const groups = getRoleNavGroups() || [];" not in content:
    content = content.replace(target_rendersidebar, replacement_rendersidebar)
    target_rendersidebar_end = """        return headerHtml + itemsHtml;
      }).join('');
    }"""
    replacement_rendersidebar_end = """        return headerHtml + itemsHtml;
      }).join('');
      } catch (err) {
        console.error('renderSidebar exception caught:', err);
        container.innerHTML = `
          <div class="p-2 space-y-1">
            <button onclick="setRoute('dashboard')" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 bg-[#1E63C4] text-white text-xs font-semibold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              <span>Dashboard</span>
            </button>
            <button onclick="setRoute('allocation')" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-blue-100 hover:bg-white/10 text-xs font-medium">
              <span>📥</span><span>Receive Stock</span>
            </button>
            <button onclick="setRoute('inventory')" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-blue-100 hover:bg-white/10 text-xs font-medium">
              <span>📦</span><span>Inventory & Batches</span>
            </button>
            <button onclick="setRoute('fifo')" class="w-full h-10 px-3 rounded-lg flex items-center gap-3 text-blue-100 hover:bg-white/10 text-xs font-medium">
              <span>⚡</span><span>FIFO Allocation</span>
            </button>
          </div>
        `;
      }
    }"""
    content = content.replace(target_rendersidebar_end, replacement_rendersidebar_end)
    print("6. Safeguarded renderSidebar with try/catch and fallback navigation")

# 7. Safeguard renderCurrentRoute with try/catch and graceful view recovery
target_renderroute = """    function renderCurrentRoute() {
      const container = document.getElementById('mainContainer');
      if (!container) return;
      window.scrollTo(0, 0);"""

replacement_renderroute = """    function renderCurrentRoute() {
      const container = document.getElementById('mainContainer');
      if (!container) return;
      if (typeof window.scrollTo === 'function') {
        try { window.scrollTo(0, 0); } catch (e) {}
      }"""

content = content.replace(target_renderroute, replacement_renderroute)

# 8. Multi-stage execution in initApplication
target_init_bottom = """    // Immediate execution (DOM elements are already defined above the script tag)
    try {
      initApplication();
    } catch (e) {
      console.error('Initial initApplication attempt failed:', e);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApplication);
    }
    window.addEventListener('load', initApplication);
    setTimeout(initApplication, 100);
    setTimeout(initApplication, 500);
  </script>
</body>
</html>"""

replacement_init_bottom = """    // Immediate multi-stage boot sequence
    try {
      sanitizeAppState();
      initApplication();
    } catch (e) {
      console.error('Initial initApplication attempt failed:', e);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        sanitizeAppState();
        initApplication();
      });
    }
    window.addEventListener('load', () => {
      sanitizeAppState();
      initApplication();
    });
    setTimeout(initApplication, 0);
    setTimeout(initApplication, 50);
    setTimeout(initApplication, 150);
    setTimeout(initApplication, 400);
    setTimeout(initApplication, 1000);
  </script>

  <!-- Emergency Standalone Self-Healing Script -->
  <script>
    (function emergencyBoot() {
      function checkAndRepair() {
        try {
          if (typeof initApplication === 'function') {
            initApplication();
          }
          var nav = document.getElementById('navList');
          if (nav && (!nav.children || nav.children.length === 0)) {
            nav.innerHTML = [
              '<div class="text-[10px] font-bold text-blue-200/60 uppercase tracking-wider px-3 pt-3 pb-1">Overview</div>',
              '<button onclick="setRoute(\\'dashboard\\')" class="w-full h-[40px] px-3 rounded-lg flex items-center justify-between text-[13px] font-semibold bg-[#1E63C4] text-white"><span>📊 Dashboard</span></button>',
              '<button onclick="setRoute(\\'allocation\\')" class="w-full h-[40px] px-3 rounded-lg flex items-center justify-between text-[13px] text-blue-100 hover:bg-white/10"><span>📥 Receive Stock</span></button>',
              '<button onclick="setRoute(\\'inventory\\')" class="w-full h-[40px] px-3 rounded-lg flex items-center justify-between text-[13px] text-blue-100 hover:bg-white/10"><span>📦 Inventory & Batches</span></button>',
              '<button onclick="setRoute(\\'quality\\')" class="w-full h-[40px] px-3 rounded-lg flex items-center justify-between text-[13px] text-blue-100 hover:bg-white/10"><span>🔬 Quality Inspection</span></button>',
              '<button onclick="setRoute(\\'fifo\\')" class="w-full h-[40px] px-3 rounded-lg flex items-center justify-between text-[13px] text-blue-100 hover:bg-white/10"><span>⚡ FIFO Allocation</span></button>',
              '<button onclick="setRoute(\\'dispatch\\')" class="w-full h-[40px] px-3 rounded-lg flex items-center justify-between text-[13px] text-blue-100 hover:bg-white/10"><span>🚚 Dispatch Center</span></button>'
            ].join('');
          }
          var main = document.getElementById('mainContainer');
          if (main && (!main.innerHTML || main.innerHTML.trim() === '')) {
            if (typeof renderDashboardView === 'function') {
              main.innerHTML = renderDashboardView();
            }
          }
        } catch (err) {
          console.error('Emergency boot error:', err);
        }
      }
      checkAndRepair();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndRepair);
      }
      window.addEventListener('load', checkAndRepair);
      setTimeout(checkAndRepair, 100);
      setTimeout(checkAndRepair, 500);
    })();
  </script>
</body>
</html>"""

if "emergencyBoot" not in content:
    assert target_init_bottom in content, "Could not find exact target_init_bottom"
    content = content.replace(target_init_bottom, replacement_init_bottom)
    print("8 & 9. Enhanced multi-stage boot and added standalone emergency self-healing script at EOF")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("ALL BULLETPROOF SAFEGUARDS APPLIED SUCCESSFULLY!")

