# Python script to build Stock Control views, modals, navigation, and handlers in index.html
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# -----------------------------------------------------------------------------
# STEP 2: Update Routing Mappings
# -----------------------------------------------------------------------------

old_path_to_route = """      '/task-followup': 'manager-tasks',
      '/my-tasks': 'operator-tasks',
      '/operator-tasks': 'operator-tasks'
    };"""

new_path_to_route = """      '/task-followup': 'manager-tasks',
      '/my-tasks': 'operator-tasks',
      '/operator-tasks': 'operator-tasks',
      '/damaged-stock': 'damaged-stock',
      '/clearance-orders': 'clearance-orders',
      '/stock-transfers': 'stock-transfers',
      '/stock-verification': 'stock-verification',
      '/disposal-approvals': 'disposal-approvals'
    };"""

if old_path_to_route in html:
    html = html.replace(old_path_to_route, new_path_to_route, 1)

old_route_to_path = """      'manager-tasks': '/manager-tasks',
      'operator-tasks': '/my-tasks'
    };"""

new_route_to_path = """      'manager-tasks': '/manager-tasks',
      'operator-tasks': '/my-tasks',
      'damaged-stock': '/damaged-stock',
      'clearance-orders': '/clearance-orders',
      'stock-transfers': '/stock-transfers',
      'stock-verification': '/stock-verification',
      'disposal-approvals': '/disposal-approvals'
    };"""

if old_route_to_path in html:
    html = html.replace(old_route_to_path, new_route_to_path, 1)

old_meta_anchor = "'operator-tasks': { group: 'Godown Operations', title: 'My Tasks', short: 'My Tasks' },"
new_meta = """'operator-tasks': { group: 'Godown Operations', title: 'My Tasks', short: 'My Tasks' },
      'damaged-stock': { group: 'Stock Control', title: 'Damaged & Held Stock', short: 'Damaged Stock' },
      'clearance-orders': { group: 'Stock Control', title: 'Godown Clearance Orders', short: 'Clearance Orders' },
      'stock-transfers': { group: 'Stock Control', title: 'Stock Transfer & Relocation', short: 'Stock Transfer' },
      'stock-verification': { group: 'Stock Control', title: 'Physical Stock Verification', short: 'Verification' },
      'disposal-approvals': { group: 'Stock Control', title: 'Disposal & Write-off Approval', short: 'Disposals' },"""

if old_meta_anchor in html:
    html = html.replace(old_meta_anchor, new_meta, 1)

old_render_route = """      } else if (appState.activeRoute === 'operator-tasks') {
        container.innerHTML = renderOperatorTaskCenterView();"""

new_render_route = """      } else if (appState.activeRoute === 'operator-tasks') {
        container.innerHTML = renderOperatorTaskCenterView();
      } else if (appState.activeRoute === 'damaged-stock') {
        container.innerHTML = renderDamagedStockView();
      } else if (appState.activeRoute === 'clearance-orders') {
        container.innerHTML = renderClearanceOrdersView();
      } else if (appState.activeRoute === 'stock-transfers') {
        container.innerHTML = renderStockTransfersView();
      } else if (appState.activeRoute === 'stock-verification') {
        container.innerHTML = renderStockVerificationView();
      } else if (appState.activeRoute === 'disposal-approvals') {
        container.innerHTML = renderDisposalApprovalsView();"""

if old_render_route in html:
    html = html.replace(old_render_route, new_render_route, 1)

print("Step 2: Routing mappings and renderCurrentRoute updated.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved updates to index.html.")

