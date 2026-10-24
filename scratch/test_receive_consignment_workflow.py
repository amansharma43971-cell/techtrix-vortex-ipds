#!/usr/bin/env python3
"""
Test script: Verify "Receive Consignment" workflow, button wiring, and state transitions
"""
import re
import subprocess
import tempfile
import sys

def run_js_test():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Verify button in HTML contains startNewConsignmentIntake
    btn_pattern = r'<button[^>]+onclick=["\']startNewConsignmentIntake\(\)["\'][^>]*>[\s\S]*?Receive New Consignment'
    assert re.search(btn_pattern, html), "ERROR: Button with onclick='startNewConsignmentIntake()' not found in index.html!"
    print("✓ PASS: Button '+ Receive New Consignment' correctly wired to startNewConsignmentIntake()")

    # Verify no dead anchor tag remains
    dead_anchor = r'<a\s+href="#consignmentWizardAnchor"[^>]*>[\s\S]*?Receive New Consignment'
    assert not re.search(dead_anchor, html), "ERROR: Dead anchor tag for Receive New Consignment still found!"
    print("✓ PASS: Dead anchor tag replaced completely")

    # Extract JS
    scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
    app_script = scripts[1]

    # Create harness that executes startNewConsignmentIntake, transitions through steps, and commits
    test_code = """
    // Mock browser environment
    var window = this;
    window.addEventListener = function() {};
    var console = { log: print, error: print, warn: print, info: print };
    var localStorageData = {};
    var localStorage = {
      getItem: function(k) { return localStorageData[k] || null; },
      setItem: function(k, v) { localStorageData[k] = v; },
      removeItem: function(k) { delete localStorageData[k]; }
    };
    var document = {
      elements: {},
      getElementById: function(id) {
        if (!this.elements[id]) {
          this.elements[id] = {
            id: id,
            value: '',
            textContent: '',
            innerHTML: '',
            classList: {
              classes: new Set(),
              add: function(c) { this.classes.add(c); },
              remove: function(c) { this.classes.delete(c); },
              contains: function(c) { return this.classes.has(c); }
            },
            focus: function() { this.focused = true; },
            getBoundingClientRect: function() { return { top: 100, height: 500 }; },
            scrollTo: function() {},
            disabled: false
          };
        }
        return this.elements[id];
      },
      querySelectorAll: function() { return []; },
      addEventListener: function() {},
      title: 'BhandarSetu'
    };
    var location = { pathname: '/stock-allocation', href: '', search: '', hash: '' };
    var history = { pushState: function(){}, replaceState: function(){} };
    var setTimeout = function(fn) { fn(); return 1; };
    var clearTimeout = function() {};
    var setInterval = function(fn) { return 1; };
    var clearInterval = function() {};
    var alert = function(msg) { print("ALERT: " + msg); };

    // Set up elements expected by workflow
    document.getElementById('mainContainer');
    document.getElementById('consignmentWizardAnchor');
    document.getElementById('wfSupplierName');
    document.getElementById('wfConsignmentId');

    """ + app_script + """

    // --- TEST 1: startNewConsignmentIntake initialization ---
    print("Executing startNewConsignmentIntake()...");
    startNewConsignmentIntake();

    if (appState.activeRoute !== 'allocation') {
      throw new Error("Active route should be 'allocation', got: " + appState.activeRoute);
    }
    if (!appState.receiveWorkflow) {
      throw new Error("appState.receiveWorkflow not initialized!");
    }
    if (appState.receiveWorkflow.currentStep !== 1) {
      throw new Error("currentStep should be 1, got: " + appState.receiveWorkflow.currentStep);
    }
    var csgId = appState.receiveWorkflow.consignmentId;
    if (!csgId || !csgId.startsWith('CSG-')) {
      throw new Error("Invalid consignmentId generated: " + csgId);
    }
    print("✓ TEST 1 PASS: startNewConsignmentIntake initialized successfully (ID: " + csgId + ")");

    // --- TEST 2: Step 1 -> Step 2 validation and transition ---
    document.getElementById('wfConsignmentId').value = csgId;
    document.getElementById('wfSupplierName').value = 'Punjab State Civil Supplies Pool';
    document.getElementById('wfChallanNumber').value = 'CHL-TEST-8812';
    document.getElementById('wfArrivalDate').value = getTodayDateYMD();
    document.getElementById('wfCommodity').value = 'Wheat';
    document.getElementById('wfTotalQuantity').value = '150';
    document.getElementById('wfUnit').value = 'Bags (50kg)';
    document.getElementById('wfVehicleNumber').value = 'PB-10-AA-9988';
    document.getElementById('wfRemarks').value = 'Sound seals verified.';

    setReceiveStep(2);
    if (appState.receiveWorkflow.currentStep !== 2) {
      throw new Error("Failed to transition to Step 2, step is: " + appState.receiveWorkflow.currentStep);
    }
    if (appState.receiveWorkflow.totalQuantity !== 150) {
      throw new Error("Expected totalQuantity 150, got: " + appState.receiveWorkflow.totalQuantity);
    }
    print("✓ TEST 2 PASS: Step 1 -> Step 2 validated & transitioned successfully");

    // --- TEST 3: Step 2 -> Step 3 with automated inward analysis ---
    document.getElementById('wfDestinationWarehouse').value = 'GDN-NGP-01';
    setReceiveStep(3);
    if (appState.receiveWorkflow.currentStep !== 3) {
      throw new Error("Failed to transition to Step 3, step is: " + appState.receiveWorkflow.currentStep);
    }
    if (!appState.receiveWorkflow.inwardAnalysis) {
      throw new Error("Inward analysis was not executed on Step 3 transition!");
    }
    print("✓ TEST 3 PASS: Step 2 -> Step 3 automated analysis generated " + 
          appState.receiveWorkflow.allocations.length + " allocation rows");

    // --- TEST 4: Step 3 -> Step 4 review check ---
    setReceiveStep(4);
    if (appState.receiveWorkflow.currentStep !== 4) {
      throw new Error("Failed to transition to Step 4, step is: " + appState.receiveWorkflow.currentStep);
    }
    print("✓ TEST 4 PASS: Step 3 -> Step 4 review verified and ready to commit");

    // --- TEST 5: Step 4 commit transaction ---
    var batchesBefore = appState.batches.length;
    var tasksBefore = appState.tasks.length;
    var consignmentsBefore = appState.consignments.length;

    handleConfirmConsignmentSubmission();

    if (appState.consignments.length !== consignmentsBefore + 1) {
      throw new Error("Consignment record was not created!");
    }
    if (appState.batches.length <= batchesBefore) {
      throw new Error("New batches were not created!");
    }
    if (appState.tasks.length <= tasksBefore) {
      throw new Error("STOCK_PUTAWAY task was not generated!");
    }

    var committedCsg = appState.consignments[0];
    if (committedCsg.consignmentId !== csgId) {
      throw new Error("Committed consignment ID mismatch!");
    }
    var newBatch = appState.batches[0];
    if (newBatch.storageStatus !== 'AWAITING_PUTAWAY') {
      throw new Error("Batch storageStatus must be 'AWAITING_PUTAWAY' until physically put away, got: " + newBatch.storageStatus);
    }
    if (newBatch.qualityStatus !== 'Pending Inspection') {
      throw new Error("Batch qualityStatus must be 'Pending Inspection', got: " + newBatch.qualityStatus);
    }
    if (newBatch.availableQuantity !== 0) {
      throw new Error("Batch availableQuantity must be 0 while in staged putaway, got: " + newBatch.availableQuantity);
    }

    var putawayTask = appState.tasks[0];
    if (putawayTask.taskType !== 'STOCK_PUTAWAY') {
      throw new Error("Putaway task type mismatch: " + putawayTask.taskType);
    }
    if (!putawayTask.checklist || putawayTask.checklist.length !== 4) {
      throw new Error("Putaway checklist should have 4 verification points, got: " + (putawayTask.checklist ? putawayTask.checklist.length : 0));
    }

    print("✓ TEST 5 PASS: handleConfirmConsignmentSubmission committed successfully!");
    print("   Consignment ID: " + committedCsg.consignmentId);
    print("   Batches created: " + (appState.batches.length - batchesBefore));
    print("   Staged Batch: " + newBatch.id + " (Planned Bin: " + newBatch.plannedBinCode + ", Storage: " + newBatch.storageStatus + ")");
    print("   Putaway Task: " + putawayTask.id + " assigned to: " + putawayTask.assignedToName);
    print("ALL TESTS PASSED SUCCESSFULLY 100%!");
    """

    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tf:
        tf.write(test_code)
        tf_path = tf.name

    res = subprocess.run(['/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc', tf_path], capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("ERROR IN JSC EXECUTION:")
        print(res.stderr)
        sys.exit(1)

if __name__ == '__main__':
    run_js_test()
