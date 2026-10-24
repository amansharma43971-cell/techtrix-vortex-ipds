import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

render_funcs = [
    'renderDashboardView',
    'renderOperatorDashboardView',
    'renderAllocationView',
    'renderInventoryView',
    'renderQualityView',
    'renderFifoView',
    'renderDispatchView',
    'renderOutDeliveryView',
    'renderDeliveryHistoryView',
    'renderAlertsView',
    'renderReportsView',
    'renderUserManagementView',
    'renderAuditLogsView',
    'renderSettingsView',
    'renderLoginView',
    'renderUnauthorizedView'
]

for func in render_funcs:
    m = re.search(r'function\s+' + func + r'\s*\([^)]*\)\s*\{', text)
    if not m:
        print(f'WARNING: {func} not found!')
    else:
        # Check start
        start = m.start()
        print(f'Found {func} at character {start}')

