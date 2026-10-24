import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'function renderDashboardView\(\)\s*\{(.*?)\n    function\s', text, re.DOTALL)
if m:
    body = m.group(1)
    # Check all identifiers in ${...}
    interpolations = re.findall(r'\$\{([^}]+)\}', body)
    print(f'Total interpolations in renderDashboardView: {len(interpolations)}')
    for interp in interpolations:
        tokens = re.findall(r'[a-zA-Z_$][a-zA-Z0-9_$]*', interp)
        for t in tokens:
            if t in ('isManager', 'isAdmin', 'role'):
                print(f'Found token {t} in: {interp.strip()[:80]}')

# Also check renderOperatorDashboardView
m2 = re.search(r'function renderOperatorDashboardView\(\)\s*\{(.*?)\n    function\s', text, re.DOTALL)
if m2:
    body2 = m2.group(1)
    interpolations2 = re.findall(r'\$\{([^}]+)\}', body2)
    print(f'Total interpolations in renderOperatorDashboardView: {len(interpolations2)}')
    for interp in interpolations2:
        tokens = re.findall(r'[a-zA-Z_$][a-zA-Z0-9_$]*', interp)
        for t in tokens:
            if t in ('isManager', 'isAdmin'):
                print(f'Found token {t} in op dash: {interp.strip()[:80]}')

