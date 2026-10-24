with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        wf.destinationWarehouseId = whId;
        wf.allocations.forEach(a => { a.warehouseId = whId; });
      }"""

replacement = """        wf.destinationWarehouseId = whId;
        wf.allocations.forEach(a => { a.warehouseId = whId; });
      }

      if (step === 3) {
        runAutomatedInwardAnalysis();
      }"""

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added automatic inward analysis trigger when moving to Step 3")
else:
    print("Could not find target in index.html")

