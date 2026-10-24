# Update web/src/App.tsx with Stock Control routes
with open('web/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target_imports = "const SettingsView = lazy(() => import('./features/settings/SettingsView').then(m => ({ default: m.SettingsView })));"
new_imports = """const DamagedStockView = lazy(() => import('./features/stock-control/DamagedStockView'));
const ClearanceOrdersView = lazy(() => import('./features/stock-control/ClearanceOrdersView'));
const StockTransfersView = lazy(() => import('./features/stock-control/StockTransfersView'));
const StockVerificationView = lazy(() => import('./features/stock-control/StockVerificationView'));
const DisposalApprovalsView = lazy(() => import('./features/stock-control/DisposalApprovalsView'));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then(m => ({ default: m.SettingsView })));"""

assert target_imports in content, "target_imports not found in App.tsx"
content = content.replace(target_imports, new_imports, 1)

target_routes = '<Route path="settings" element={<SettingsView />} />'
new_routes = """{/* Stock Control & Clearance Modules */}
            <Route path="damaged-stock" element={<DamagedStockView />} />
            <Route path="clearance-orders" element={<ClearanceOrdersView />} />
            <Route path="stock-transfers" element={<StockTransfersView />} />
            <Route path="stock-verification" element={<StockVerificationView />} />
            <Route path="disposal-approvals" element={<DisposalApprovalsView />} />
            <Route path="settings" element={<SettingsView />} />"""

assert target_routes in content, "target_routes not found in App.tsx"
content = content.replace(target_routes, new_routes, 1)

with open('web/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx updated with Stock Control routes successfully.")

