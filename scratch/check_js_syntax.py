import re
import subprocess
import json

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', content, re.DOTALL)
print(f"Found {len(scripts)} inline scripts")
s = scripts[1]

# Wrap s in function definition so JSC parses it without running it:
wrapped = "function __validate_syntax__() {\n" + s + "\n}\nprint('JS SYNTAX IS COMPLETELY VALID!');"

with open('/tmp/validate_syntax.js', 'w', encoding='utf-8') as f:
    f.write(wrapped)

res = subprocess.run([
    '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc',
    '/tmp/validate_syntax.js'
], capture_output=True, text=True)

print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
print("Exit code:", res.returncode)

