with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """      // Automatically sync recommendations into allocations if in auto mode or empty
      if (canFulfill && (!wf.allocations || wf.allocations.length === 0 || wf.allocationMode === 'AUTO_SLOT')) {"""

replacement = """      // Automatically sync recommendations into allocations
      if (canFulfill) {"""

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated runAutomatedInwardAnalysis to always sync recommendations into allocations")
else:
    print("Could not find target in index.html")

