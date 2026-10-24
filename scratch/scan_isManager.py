import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

scripts = list(re.finditer(r'<script(?:\s+[^>]*)?>(.*?)</script>', text, re.DOTALL))
js_code = scripts[2].group(1)

# Find all functions in js_code
funcs = re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{', js_code)
print(f'Total functions: {len(funcs)}')

# Let's inspect all occurrences of isManager across the entire file
lines = text.splitlines()
for i, line in enumerate(lines):
    if 'isManager' in line:
        print(f'Line {i+1}: {line.strip()[:100]}')

