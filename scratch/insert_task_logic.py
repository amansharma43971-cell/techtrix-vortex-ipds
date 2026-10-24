# Python script to insert task views and logic into index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's find insertion point: right before `// Alerts Bell Dropdown`
target = "    // Alerts Bell Dropdown"
assert target in html, "Target '// Alerts Bell Dropdown' not found"

with open('scratch/task_views_code.js', 'r', encoding='utf-8') as f_code:
    task_code = f_code.read()

html = html.replace(target, task_code + "\n\n" + target, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Task views and logic injected successfully!")
