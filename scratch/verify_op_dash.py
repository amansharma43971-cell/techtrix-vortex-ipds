import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'function renderOperatorDashboardView\(\)\s*\{(.*?)\n    function renderAllocationView', text, re.DOTALL)
if not m:
    # find next function
    m = re.search(r'function renderOperatorDashboardView\(\)\s*\{(.*?)\n    function ', text, re.DOTALL)
assert m, "renderOperatorDashboardView not found"
body = m.group(1)

interpolations = re.findall(r'\$\{([^}]+)\}', body)
print(f"Total interpolations in renderOperatorDashboardView: {len(interpolations)}")
for interp in interpolations:
    if 'isManager' in interp:
        print("Found isManager in op dash:", interp.strip()[:60])
print("renderOperatorDashboardView checked!")

