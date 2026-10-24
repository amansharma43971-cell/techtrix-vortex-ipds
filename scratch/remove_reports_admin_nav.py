with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target_marker = "title: 'Reports & Administration'"
if target_marker not in content:
    print("Marker not found, already removed?")
    exit(0)

# Locate the exact block
start_idx = content.find("        {\n          title: 'Reports & Administration'")
if start_idx == -1:
    start_idx = content.find("{\n          title: 'Reports & Administration'")

# The block ends before the closing of the groups array
end_marker = "      ];\n\n      return groups;"
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    # Also remove the preceding comma and newline if any
    prefix = content[:start_idx].rstrip()
    if prefix.endswith(','):
        prefix = prefix[:-1]
    suffix = content[end_idx:]
    content = prefix + "\n" + suffix
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Removed 'Reports & Administration' section from index.html sidebar configuration")
else:
    print(f"FAILED: start_idx={start_idx}, end_idx={end_idx}")

