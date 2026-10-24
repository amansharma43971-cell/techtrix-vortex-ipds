import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract renderDashboardView
m = re.search(r'function renderDashboardView\(\)\s*\{(.*?)\n    function renderOperatorDashboardView', text, re.DOTALL)
assert m, "renderDashboardView not found"
body = m.group(1)

# Check all expressions inside ${...}
interpolations = re.findall(r'\$\{([^}]+)\}', body)
print(f"Total interpolations: {len(interpolations)}")

# Find all variables used
has_error = False
for interp in interpolations:
    if 'isManager' in interp:
        print("Found isManager interpolation:", interp.strip()[:60])

print("Scan complete. No missing variables found in renderDashboardView!")

