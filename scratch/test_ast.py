import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract renderDashboardView
m = re.search(r'function renderDashboardView\(\)\s*\{(.*?)\n    function renderOperatorDashboardView', text, re.DOTALL)
assert m, "renderDashboardView not found"
body = m.group(1)

# Find all local variable declarations (const, let, var)
locals_declared = set(re.findall(r'(?:const|let|var)\s+([a-zA-Z0-9_$]+)\b', body))
# Destructuring
destruct = re.findall(r'(?:const|let|var)\s+\{([^}]+)\}', body)
for d in destruct:
    for item in d.split(','):
        item = item.strip().split('=')[0].split(':')[0].strip()
        if item:
            locals_declared.add(item)

print("Locals declared in renderDashboardView:", sorted(locals_declared))

# Find all expressions inside ${...} in template strings
interpolations = re.findall(r'\$\{([^}]+)\}', body)
print(f"Total interpolations: {len(interpolations)}")

# Builtins and globals
globals_known = {
    'appState', 'allocateFifo', 'parseDateDMY', 'getAuthorizedBatches', 'getAuthorizedDispatches',
    'hasPermission', 'renderPageHeader', 'Math', 'Number', 'String', 'Array', 'Object',
    'true', 'false', 'null', 'undefined', 'setRoute', 'handleScopeChange', 'calcAge',
    'formatMT', 'formatBags', 'showToast'
}

undeclared = set()
for interp in interpolations:
    tokens = re.findall(r'\b[a-zA-Z_$][a-zA-Z0-9_$]*\b', interp)
    for t in tokens:
        if t not in locals_declared and t not in globals_known:
            pattern = r'(\.)?' + re.escape(t)
            matches = list(re.finditer(pattern, interp))
            all_props = True
            for match in matches:
                if not match.group(1):
                    all_props = False
                    break
            if not all_props and t not in ('sum', 'b', 'd', 's', 'a', 'idx', 'p', 'row', 'item', 'm', 'i'):
                undeclared.add(t)

print("POTENTIALLY UNDECLARED IN renderDashboardView:", undeclared)

