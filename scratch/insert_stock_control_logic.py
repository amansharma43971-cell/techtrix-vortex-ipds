# Inject Stock Control views and logic into index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = '    function markNotificationRead(id) {'
assert target in html, "Anchor target not found in index.html"

with open('scratch/stock_control_code.js', 'r', encoding='utf-8') as f_code:
    code = f_code.read()

html = html.replace(target, code + "\n\n" + target, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Stock Control views, modals, and handlers successfully injected into index.html.")

