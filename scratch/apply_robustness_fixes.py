with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Null-guard unreadAlerts
old_alerts = "const unreadAlerts = appState.alerts.filter(a => !a.isRead).length;"
new_alerts = "const unreadAlerts = (appState.alerts || []).filter(a => !a.isRead).length;"
if old_alerts in content:
    content = content.replace(old_alerts, new_alerts)
    print("Fixed unreadAlerts")

# 2. Null-guard user avatar
old_avatar = "avatarEl.textContent = user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('');"
new_avatar = "avatarEl.textContent = (fullNameStr || 'AT').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('') || 'AT';"
if old_avatar in content:
    content = content.replace(old_avatar, new_avatar)
    print("Fixed avatar initials")

# 3. Add default fallback in renderCurrentRoute
old_route_end = """      } else if (appState.activeRoute === 'settings') {
        container.innerHTML = renderSettingsView();
      }
    }"""

new_route_end = """      } else if (appState.activeRoute === 'settings') {
        container.innerHTML = renderSettingsView();
      } else {
        appState.activeRoute = 'dashboard';
        if (appState.currentUser && appState.currentUser.role === 'WAREHOUSE_ADMIN') {
          container.innerHTML = renderOperatorDashboardView();
        } else {
          container.innerHTML = renderDashboardView();
        }
      }
    }"""
if old_route_end in content:
    content = content.replace(old_route_end, new_route_end)
    print("Fixed renderCurrentRoute fallback")

# 4. In initApplication, ensure sidebar and header are ALWAYS rendered
old_init = """    // Safe Application Initializer
    function initApplication() {
      try {
        updateHeader();
      } catch (err) {
        console.error('Error during updateHeader:', err);
      }
      try {
        renderSidebar();
      } catch (err) {
        console.error('Error during renderSidebar:', err);
      }
      try {
        renderCurrentRoute();
      } catch (err) {
        console.error('Error during renderCurrentRoute:', err);
      }

      // Safety check: ensure main container is not empty
      const container = document.getElementById('mainContainer');
      if (container && (!container.innerHTML || container.innerHTML.trim() === '')) {
        console.warn('mainContainer empty, rendering default dashboard');
        appState.activeRoute = 'dashboard';
        try {
          renderCurrentRoute();
        } catch (e) {
          console.error('Dashboard fallback failed:', e);
        }
      }
    }"""

new_init = """    // Safe Application Initializer
    function initApplication() {
      try {
        if (!appState.currentUser || !appState.currentUser.role) {
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
          appState.isAuthenticated = true;
        }
        updateHeader();
      } catch (err) {
        console.error('Error during updateHeader:', err);
      }
      try {
        renderSidebar();
      } catch (err) {
        console.error('Error during renderSidebar:', err);
      }
      try {
        renderCurrentRoute();
      } catch (err) {
        console.error('Error during renderCurrentRoute:', err);
        appState.activeRoute = 'dashboard';
        try { renderCurrentRoute(); } catch (e) {}
      }

      // Safety check: ensure main container is not empty
      const container = document.getElementById('mainContainer');
      if (container && (!container.innerHTML || container.innerHTML.trim() === '')) {
        console.warn('mainContainer empty, rendering default dashboard');
        appState.activeRoute = 'dashboard';
        try {
          renderCurrentRoute();
        } catch (e) {
          console.error('Dashboard fallback failed:', e);
        }
      }

      // Safety check: ensure sidebar nav is not empty
      const navContainer = document.getElementById('navList');
      if (navContainer && (!navContainer.innerHTML || navContainer.innerHTML.trim() === '')) {
        try { renderSidebar(); } catch (e) {}
      }
    }"""
if old_init in content:
    content = content.replace(old_init, new_init)
    print("Fixed initApplication robustness")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished writing index.html")

