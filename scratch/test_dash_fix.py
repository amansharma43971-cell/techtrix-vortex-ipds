with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Verify isManager in renderDashboardView
assert 'const isManager = !user.role || user.role === \'MANAGER\';' in text
print("✅ isManager declaration verified in renderDashboardView")

# Verify getAuthorizedBatches()
assert 'function getAuthorizedBatches()' in text
print("✅ getAuthorizedBatches verified")

# Verify getAuthorizedDispatches()
assert 'function getAuthorizedDispatches()' in text
print("✅ getAuthorizedDispatches verified")

# Verify allocateFifo
assert 'function allocateFifo(commodity, qty)' in text
print("✅ allocateFifo verified")

# Verify renderDashboardView
assert 'function renderDashboardView()' in text
print("✅ renderDashboardView verified")

# Verify renderOperatorDashboardView
assert 'function renderOperatorDashboardView()' in text
print("✅ renderOperatorDashboardView verified")

