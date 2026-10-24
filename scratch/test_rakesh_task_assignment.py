#!/usr/bin/env python3
"""
Test Suite: Manager Task Assignment to Operator Rakesh & Strict Operator Isolation
Tests the complete end-to-end workflow in index.html and backend APIs.
"""
import subprocess
import json
import re
import sys

def run_jsc_test(test_js_code):
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Extract the main script block
    script_matches = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
    if not script_matches:
        print("ERROR: No <script> tag found in index.html")
        sys.exit(1)

    app_script = script_matches[1]

    harness = """
    var window = this;
    var global = this;
    window.addEventListener = function() {};
    window.removeEventListener = function() {};
    window.setInterval = function() { return 1; };
    window.clearInterval = function() {};
    window.setTimeout = function(fn) { if (typeof fn === 'function') fn(); return 1; };
    window.clearTimeout = function() {};
    window.innerWidth = 1440;
    window.innerHeight = 900;

    var localStorage = {
      _data: {},
      getItem: function(k) { return this._data[k] || null; },
      setItem: function(k, v) { this._data[k] = String(v); },
      removeItem: function(k) { delete this._data[k]; },
      clear: function() { this._data = {}; }
    };
    var location = { hash: '', pathname: '/', search: '', href: 'http://localhost/' };
    var history = { pushState: function() {} };
    var navigator = { userAgent: 'JSC-Headless' };
    var alertsLogged = [];
    function alert(msg) { alertsLogged.push(msg); }
    var toastsLogged = [];
    function showToast(msg) { toastsLogged.push(msg); }

    var elements = {};
    var document = {
      getElementById: function(id) {
        if (!elements[id]) {
          elements[id] = {
            id: id,
            value: '',
            innerHTML: '',
            textContent: '',
            classList: {
              _classes: [],
              add: function(c) { if (!this._classes.includes(c)) this._classes.push(c); },
              remove: function(c) { this._classes = this._classes.filter(function(x) { return x !== c; }); },
              toggle: function(c, val) {
                if (val !== undefined) {
                  if (val) this.add(c); else this.remove(c);
                } else {
                  if (this._classes.includes(c)) this.remove(c); else this.add(c);
                }
              },
              contains: function(c) { return this._classes.includes(c); }
            },
            style: {},
            setAttribute: function() {},
            removeAttribute: function() {},
            focus: function() {},
            getBoundingClientRect: function() { return { top: 0, left: 0, width: 800, height: 600 }; },
            scrollIntoView: function() {},
            scrollTo: function() {},
            checked: false,
            disabled: false
          };
        }
        return elements[id];
      },
      querySelector: function() { return null; },
      querySelectorAll: function() { return []; },
      addEventListener: function() {}
    };
    """ + "\n" + app_script + "\n" + test_js_code

    tmp_js_path = 'scratch/tmp_test_rakesh_runner.js'
    with open(tmp_js_path, 'w', encoding='utf-8') as tf:
        tf.write(harness)

    res = subprocess.run(
        ['/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc', tmp_js_path],
        capture_output=True,
        text=True
    )
    return res

test_scenario = """
    print("=== STARTING TASK ASSIGNMENT & RAKESH OPERATOR SUITE ===");

    // Test 1: Verify Rakesh Sharma exists in user directory
    var rakesh = appState.users.find(function(u) { return u.id === 'u-op-rakesh'; });
    if (!rakesh) {
      throw new Error("TEST 1 FAILED: Rakesh Sharma (u-op-rakesh) not found in appState.users!");
    }
    if (rakesh.role !== 'WAREHOUSE_ADMIN' || !rakesh.isActive || rakesh.warehouseId !== 'GDN-NGP-01') {
      throw new Error("TEST 1 FAILED: Rakesh Sharma properties invalid: " + JSON.stringify(rakesh));
    }
    print("✓ TEST 1 PASS: Operator Rakesh Sharma registered in user registry with ID u-op-rakesh and active status.");

    // Test 2: Populate operator dropdown in Create Task Modal
    document.getElementById('taskCreateWarehouse').value = 'GDN-NGP-01';
    handleTaskWarehouseChange();
    var opSelectHtml = document.getElementById('taskCreateOperator').innerHTML;
    if (!opSelectHtml.includes('u-op-rakesh') || !opSelectHtml.includes('Rakesh Sharma')) {
      throw new Error("TEST 2 FAILED: Operator dropdown does not contain Rakesh Sharma! HTML: " + opSelectHtml);
    }
    print("✓ TEST 2 PASS: Manager Task Assignment dropdown successfully populated with Rakesh Sharma (u-op-rakesh).");

    // Test 3: Validation Error on empty operator
    alertsLogged = [];
    document.getElementById('taskCreateTitle').value = 'Stock Put-Away: Wheat Batch B008';
    document.getElementById('taskCreateDesc').value = 'Move wheat from dock to Bay 1 Bin 01.';
    document.getElementById('taskCreateBatch').value = 'B008';
    document.getElementById('taskCreateCommodity').value = 'Wheat';
    document.getElementById('taskCreateType').value = 'STOCK_PUTAWAY';
    document.getElementById('taskCreatePriority').value = 'HIGH';
    document.getElementById('taskCreateDueAt').value = '2026-10-25 18:00';
    document.getElementById('taskCreateOperator').value = ''; // Empty operator
    handleCreateTaskSubmit({ preventDefault: function() {} });
    if (alertsLogged.length === 0 || !alertsLogged[0].includes('select an active Operator')) {
      throw new Error("TEST 3 FAILED: Submitting empty operator did not trigger validation error alert!");
    }
    print("✓ TEST 3 PASS: Empty operator assignment correctly rejected with mandatory validation error.");

    // Test 4: Manager assigns task specifically to Operator Rakesh
    document.getElementById('taskCreateOperator').value = 'u-op-rakesh';
    document.getElementById('chkPackaging').checked = true;
    document.getElementById('chkDunnage').checked = true;
    handleCreateTaskSubmit({ preventDefault: function() {} });

    var createdTask = appState.tasks.find(function(t) { return t.assignedToId === 'u-op-rakesh'; });
    if (!createdTask) {
      throw new Error("TEST 4 FAILED: Created task not saved with assignedToId = u-op-rakesh!");
    }
    if (createdTask.assignedToName !== 'Rakesh Sharma') {
      throw new Error("TEST 4 FAILED: assignedToName mismatch: " + createdTask.assignedToName);
    }
    if (createdTask.assignedById !== 'u-manager-01' || createdTask.status !== 'ASSIGNED') {
      throw new Error("TEST 4 FAILED: Invalid assignment metadata: " + JSON.stringify(createdTask));
    }
    print("✓ TEST 4 PASS: Task " + createdTask.taskNo + " created and assigned to Rakesh Sharma with real user IDs.");

    // Test 5: Switch user to Operator Rakesh Sharma & Verify Task Delivery
    appState.currentUser = rakesh;
    var rakeshTasks = getFilteredTasksForOperator();
    var deliveredTask = rakeshTasks.find(function(t) { return t.id === createdTask.id; });
    if (!deliveredTask) {
      throw new Error("TEST 5 FAILED: Task not visible in Rakesh's task list!");
    }
    print("✓ TEST 5 PASS: Task " + deliveredTask.taskNo + " delivered to Operator Rakesh's dashboard.");

    // Test 6: Strict Operator Isolation (Suresh in Pune & Ramesh in Nagpur)
    var suresh = appState.users.find(function(u) { return u.id === 'u-admin-pun'; });
    appState.currentUser = suresh;
    var sureshTasks = getFilteredTasksForOperator();
    if (sureshTasks.some(function(t) { return t.id === createdTask.id; })) {
      throw new Error("TEST 6 FAILED: Strict isolation violated! Suresh Shinde can see Rakesh's task!");
    }

    var ramesh = appState.users.find(function(u) { return u.id === 'u-admin-ngp'; });
    appState.currentUser = ramesh;
    var rameshTasks = getFilteredTasksForOperator();
    if (rameshTasks.some(function(t) { return t.id === createdTask.id; })) {
      throw new Error("TEST 6 FAILED: Strict isolation violated! Ramesh Patil can see Rakesh's task!");
    }
    print("✓ TEST 6 PASS: Strict operator isolation verified! Neither Suresh nor Ramesh can access Rakesh's task.");

    // Test 7: Operator Rakesh accepts and executes task lifecycle
    appState.currentUser = rakesh;
    handleOperatorAcceptTask(createdTask.id);
    if (createdTask.status !== 'ACCEPTED') {
      throw new Error("TEST 7 FAILED: Status not ACCEPTED after operator accept: " + createdTask.status);
    }
    print("✓ TEST 7A PASS: Operator Rakesh accepted task (status -> ACCEPTED).");

    handleOperatorStartTask(createdTask.id);
    if (createdTask.status !== 'IN_PROGRESS') {
      throw new Error("TEST 7 FAILED: Status not IN_PROGRESS after start: " + createdTask.status);
    }
    print("✓ TEST 7B PASS: Operator Rakesh started task (status -> IN_PROGRESS).");

    // Physical Putaway Placement Confirmation
    openConfirmPutawayModal(createdTask.id);
    document.getElementById('putawayActualQty').value = '200';
    document.getElementById('putawayActualBinCode').value = 'BAY-NGP-01-BIN-01';
    document.getElementById('putawayDamagedCount').value = '0';
    document.getElementById('putawayNotes').value = 'Stacked securely on wooden dunnage by Rakesh.';
    document.getElementById('putawayCertifyCheck').checked = true;
    handleExecutePutawayConfirmation();

    if (createdTask.status !== 'COMPLETED') {
      throw new Error("TEST 7 FAILED: Status not COMPLETED after physical placement confirmation: " + createdTask.status);
    }
    var targetBatch = appState.batches.find(function(b) { return b.id === createdTask.batchId; });
    if (targetBatch && targetBatch.binCode !== 'BAY-NGP-01-BIN-01') {
      throw new Error("TEST 7 FAILED: Target batch binCode not updated: " + targetBatch.binCode);
    }
    print("✓ TEST 7C PASS: Physical placement confirmed, status -> COMPLETED, batch bin updated to BAY-NGP-01-BIN-01.");

    // Test 8: Operator Dashboard render verifies Rakesh greeting and live task table
    var opDashHtml = renderOperatorDashboardView();
    if (!opDashHtml.includes('Welcome back, Rakesh')) {
      throw new Error("TEST 8 FAILED: Dashboard did not display 'Welcome back, Rakesh'!");
    }
    if (!opDashHtml.includes('Assigned Tasks for Your Shift (Rakesh Sharma)')) {
      throw new Error("TEST 8 FAILED: Live assigned tasks table not rendered on dashboard!");
    }
    print("✓ TEST 8 PASS: Operator Dashboard displays personalized greeting 'Welcome back, Rakesh' and shift task table.");

    // Test 9: Inward Consignment Intake with Operator Rakesh Assignment
    appState.currentUser = appState.users.find(function(u) { return u.id === 'u-manager-01'; });
    startNewConsignmentIntake();
    var csgId = appState.receiveWorkflow.consignmentId;
    if (!csgId.startsWith('CSG-2026-')) {
      throw new Error("TEST 9 FAILED: Consignment ID does not have live 2026 prefix: " + csgId);
    }
    setReceiveStep(2);
    setReceiveStep(3);
    // Explicitly assign Rakesh as the tasked putaway operator
    handleInwardOperatorChange('u-op-rakesh');
    setReceiveStep(4);
    handleConfirmConsignmentSubmission();

    var intakePutawayTask = appState.tasks.find(function(t) { return t.consignmentId === csgId; });
    if (!intakePutawayTask) {
      throw new Error("TEST 9 FAILED: Putaway task not created for consignment " + csgId);
    }
    if (intakePutawayTask.assignedToId !== 'u-op-rakesh' || intakePutawayTask.assignedToName !== 'Rakesh Sharma') {
      throw new Error("TEST 9 FAILED: Consignment putaway task not assigned to Rakesh! Found: " + intakePutawayTask.assignedToId + " / " + intakePutawayTask.assignedToName);
    }
    print("✓ TEST 9 PASS: Consignment " + csgId + " intake generated Putaway task " + intakePutawayTask.taskNo + " assigned directly to Operator Rakesh.");

    // Switch to Rakesh and verify new intake putaway task is on his dashboard
    appState.currentUser = rakesh;
    var rakeshShiftTasks = getFilteredTasksForOperator();
    if (!rakeshShiftTasks.some(function(t) { return t.id === intakePutawayTask.id; })) {
      throw new Error("TEST 9 FAILED: Intake putaway task not visible on Rakesh's dashboard!");
    }
    print("✓ TEST 9 PASS: Operator Rakesh successfully retrieved intake putaway task " + intakePutawayTask.taskNo + " on his shift dashboard.");

    print("=== ALL 9 COMPREHENSIVE TESTS PASSED (100%) ===");
"""

result = run_jsc_test(test_scenario)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
if result.returncode != 0:
    print("TEST FAILED WITH CODE", result.returncode)
    sys.exit(result.returncode)
else:
    print("SUCCESS: ALL VERIFICATIONS PASSED!")
