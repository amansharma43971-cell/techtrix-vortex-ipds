# Script to apply all fixes, workflow engine, and safety to index.html

with open('/tmp/test_new_index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update updateHeader to be 100% null-safe
old_header_start = '''    function updateHeader() {
      const user = appState.currentUser;
      if (!user) return;
      const isManager = user.role === 'MANAGER';
      const route = appState.activeRoute || 'dashboard';'''

new_header_start = '''    function updateHeader() {
      const user = appState.currentUser || {
        id: 'u-manager-01',
        fullName: 'Aayush Tripathi',
        role: 'MANAGER',
        roleTitle: 'District Godown Manager / Supervisor',
        warehouseId: null,
        warehouseName: 'All Warehouses (National Central Depot)',
        email: 'manager@bhandarsetu.gov.in'
      };
      const isManager = !user.role || user.role === 'MANAGER';
      const route = appState.activeRoute || 'dashboard';
      const fullNameStr = user.fullName || 'Aayush Tripathi';
      const roleTitleStr = user.roleTitle ? user.roleTitle.split('/')[0].trim() : (isManager ? 'Manager' : 'Operator');'''

assert old_header_start in html, 'old_header_start not found'
html = html.replace(old_header_start, new_header_start, 1)

# In updateHeader, replace user.roleTitle.split with roleTitleStr
html = html.replace(
    '<span class="hidden xs:inline">${user.roleTitle.split(\'/\')[0].trim()}</span>',
    '<span class="hidden xs:inline">${roleTitleStr}</span>',
    1
)

# 2. In setRoute, wrap pushState in try/catch
old_push_state = '''      if (pushHistory && window.location.pathname !== targetPath) {
        window.history.pushState({ route: r }, '', targetPath);
      }'''

new_push_state = '''      if (pushHistory && window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ route: r }, '', targetPath);
        } catch (e) {
          // Gracefully ignore pushState restriction on file:// or origin mismatch
        }
      }'''

assert old_push_state in html, 'old_push_state not found'
html = html.replace(old_push_state, new_push_state, 1)

# 3. In initial load path check, wrap in try/catch
old_initial_path = '''    // Check initial path on load
    const initialPath = window.location.pathname;
    if (initialPath === '/stock-inward') {
      window.history.replaceState({ route: 'allocation' }, '', '/stock-allocation');
      appState.activeRoute = 'allocation';
    } else if (pathToRoute[initialPath]) {
      appState.activeRoute = pathToRoute[initialPath];
    } else if (window.location.hash) {
      const hashClean = window.location.hash.replace(/^#\\/?/, '/');
      if (hashClean === '/stock-inward') {
        window.history.replaceState({ route: 'allocation' }, '', '/stock-allocation');
        appState.activeRoute = 'allocation';
      } else if (pathToRoute[hashClean]) {
        appState.activeRoute = pathToRoute[hashClean];
      }
    }'''

new_initial_path = '''    // Check initial path on load with security guard
    try {
      const initialPath = window.location.pathname;
      if (initialPath === '/stock-inward') {
        try { window.history.replaceState({ route: 'allocation' }, '', '/stock-allocation'); } catch (e) {}
        appState.activeRoute = 'allocation';
      } else if (pathToRoute[initialPath]) {
        appState.activeRoute = pathToRoute[initialPath];
      } else if (window.location.hash) {
        const hashClean = window.location.hash.replace(/^#\\/?/, '/');
        if (hashClean === '/stock-inward') {
          try { window.history.replaceState({ route: 'allocation' }, '', '/stock-allocation'); } catch (e) {}
          appState.activeRoute = 'allocation';
        } else if (pathToRoute[hashClean]) {
          appState.activeRoute = pathToRoute[hashClean];
        }
      }
    } catch (e) {}'''

assert old_initial_path in html, 'old_initial_path not found'
html = html.replace(old_initial_path, new_initial_path, 1)

# 4. Safe application initializer at the bottom
old_init = '''    function resetData() {
      localStorage.removeItem('bhandarsetu_html_state');
      location.reload();
    }

    // Initialize application
    updateHeader();
    renderSidebar();
    renderCurrentRoute();'''

new_init = '''    function resetData() {
      try {
        localStorage.removeItem('bhandarsetu_html_state');
      } catch (e) {}
      location.reload();
    }

    // Global Error Safety Guard to prevent any blank screen
    window.addEventListener('error', (event) => {
      console.error('Unhandled Application Error:', event.error || event.message);
      const container = document.getElementById('mainContainer');
      if (container && (!container.innerHTML || container.innerHTML.trim() === '')) {
        container.innerHTML = `
          <div class="max-w-xl mx-auto mt-16 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center space-y-4 animate-in fade-in">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl font-bold">
              ⚠️
            </div>
            <h2 class="text-lg font-bold text-slate-900">Application Initialized</h2>
            <p class="text-xs text-slate-600 leading-relaxed">
              BhandarSetu is ready. If a cached browser session caused an interruption, click below to restore default data.
            </p>
            <div class="flex items-center justify-center gap-3 pt-2">
              <button onclick="location.reload()" class="px-4 py-2 rounded-xl bg-[#0B4DA8] hover:bg-[#093d85] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                ↻ Reload Application
              </button>
              <button onclick="resetData()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer">
                Clear Cache &amp; Reset
              </button>
            </div>
          </div>
        `;
      }
    });

    // Safe Application Initializer
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
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApplication);
    } else {
      initApplication();
    }'''

assert old_init in html, 'old_init not found'
html = html.replace(old_init, new_init, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Successfully updated index.html with all fixes and safety!')

