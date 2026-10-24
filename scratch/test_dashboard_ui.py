# Verification script for Dashboard Welcome & 4 KPI Cards UI
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('web/src/features/dashboard/DashboardView.tsx', 'r', encoding='utf-8') as f:
    react_dash = f.read()

with open('web/src/components/ui/KpiCards.tsx', 'r', encoding='utf-8') as f:
    react_kpi = f.read()

print("============================================================")
print("TESTING BHANDARSETU DASHBOARD UI & KPI CARDS REDESIGN")
print("============================================================")

# 1. Manager Welcome Section
assert "Welcome back, ${user.fullName.split(' ')[0]}" in html, "Manager Welcome back text missing in index.html"
assert "👑 Supervisor Oversight" in html, "Supervisor badge missing in index.html"
assert "Live Telemetry Active" in html, "Live telemetry missing in index.html"
assert "Task Follow-up" in html, "Task follow-up button missing in index.html"
assert "Batch Ledger" in html, "Batch ledger button missing in index.html"
print("✅ Manager Dashboard: Horizontal Welcome Header & inline pills verified.")

# 2. Operator Welcome Section
assert "Welcome back, ${(user.fullName || 'Ramesh Patil').split(' ')[0]}" in html, "Operator Welcome back text missing in index.html"
assert "🚚 Warehouse Operator" in html, "Operator badge missing in index.html"
assert "Live Shift Active" in html, "Live Shift pill missing in index.html"
assert "My Tasks" in html, "My Tasks button missing in index.html"
print("✅ Operator Dashboard: Shift Welcome Banner & quick actions verified.")

# 3. 4 KPI Summary Cards Grid in index.html
assert "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch w-full" in html, "4 KPI Grid missing responsive classes in index.html"
assert "View Details" in html and "→" in html, "Aligned View Details links missing in index.html"
print("✅ 4 KPI Summary Cards: Responsive 4-column grid (repeat(4, minmax(0, 1fr))) verified.")

# 4. React Parity
assert "Welcome back, {displayName.split(' ')[0]}" in react_dash, "React DashboardView missing Welcome back"
assert "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch w-full mb-6" in react_kpi, "React KpiCards missing grid layout"
print("✅ React Parity: DashboardView.tsx and KpiCards.tsx verified.")

print("============================================================")
print("ALL DASHBOARD UI & KPI REDESIGN CHECKS PASSED (100%)!")
print("============================================================")

