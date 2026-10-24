import subprocess
import json

# Comprehensive automated test for Inward Analysis, Smart Recommendation, and Operator Put-Away Workflow
test_script = '''
// Load application state and handlers from /tmp/raw_js.js
var dom = {};
var alertsLogged = [];
var console = {
  log: function(...a) { print('[LOG]', ...a); },
  warn: function(...a) { print('[WARN]', ...a); },
  info: function(...a) { print('[INFO]', ...a); },
  error: function(...a) { print('[ERR]', ...a); }
};
var window = {
  console: console,
  addEventListener: function() {},
  scrollTo: function() {},
  history: { pushState: function() {}, replaceState: function() {} },
  location: { pathname: '/stock-allocation', hash: '', search: '', reload: function() {} },
  alert: function(msg) { alertsLogged.push(msg); }
};
var alert = function(msg) { alertsLogged.push(msg); };

function makeElement(id) {
  return {
    _id: id,
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    classList: { add: function() {}, remove: function() {}, toggle: function() {}, contains: function() { return false; } },
    style: {},
    offsetWidth: 100,
    value: '',
    textContent: '',
    setAttribute: function() {},
    getAttribute: function() {},
    addEventListener: function() {}
  };
}
var document = {
  readyState: 'complete',
  addEventListener: function() {},
  getElementById: function(id) {
    if (!dom[id]) dom[id] = makeElement(id);
    return dom[id];
  },
  querySelectorAll: function() { return []; },
  querySelector: function() { return null; }
};
var localStorage = {
  getItem: function() { return null; },
  setItem: function() {},
  removeItem: function() {}
};
var location = window.location;
var navigator = { userAgent: 'test' };
'''

with open('scratch/test_putaway_runner.js', 'w', encoding='utf-8') as f:
    f.write(test_script + '\n\n')
    
    # Read the main JS from index.html
    import re
    with open('index.html', 'r', encoding='utf-8') as src:
        content = src.read()
    m = list(re.finditer(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', content, re.DOTALL))[1]
    f.write(m.group(1) + '\n\n')

    # Append test scenarios
    f.write('''
    print("======================================================================");
    print("TESTING INWARD ANALYSIS, SMART RECOMMENDATION & PUT-AWAY WORKFLOW");
    print("======================================================================");

    initApplication();

    // 1. Test Inward Analysis
    print("\\n[Test 1] Testing runAutomatedInwardAnalysis()...");
    initReceiveWorkflow();
    appState.receiveWorkflow.consignmentId = 'CSG-TEST-INW-01';
    appState.receiveWorkflow.commodity = 'Wheat';
    appState.receiveWorkflow.totalQuantity = 150;
    appState.receiveWorkflow.arrivalDate = '2025-10-24';
    appState.receiveWorkflow.destinationWarehouseId = 'GDN-NGP-01';
    appState.receiveWorkflow.supplierName = 'Punjab Grains Mandi';
    appState.receiveWorkflow.challanNumber = 'CH-INW-5500';

    var analysis = runAutomatedInwardAnalysis();
    if (!analysis) throw new Error("Inward analysis returned null!");
    if (!analysis.canFulfill) throw new Error("Expected godown to have capacity for 150 bags!");
    if (analysis.recommendations.length === 0) throw new Error("Expected at least 1 recommended allocation!");
    var totalRecQty = analysis.recommendations.reduce(function(s, r) { return s + r.quantity; }, 0);
    if (totalRecQty !== 150) throw new Error("Allocated quantity sum " + totalRecQty + " != 150!");
    print("  ✓ Inward analysis succeeded. Recommended " + analysis.recommendations.length + " allocations.");
    print("  ✓ Reasoning: " + analysis.recommendations[0].recommendationReason);
    print("  ✓ Auto-assigned operator preview: " + (analysis.assignedOperator ? analysis.assignedOperator.name : "None"));

    // 2. Test Consignment Intake & Staged Status (Zero double counting)
    print("\\n[Test 2] Testing Staged Intake & Operator Task Creation...");
    var nagpurBin = appState.bins.find(function(b) { return b.code === analysis.recommendations[0].binCode; });
    var initBinOccupied = nagpurBin.occupied;

    handleConfirmConsignmentSubmission();

    // Verify bin occupied was NOT incremented (zero double counting)
    if (nagpurBin.occupied !== initBinOccupied) {
      throw new Error("Zero double-counting invariant violated! Bin occupied changed from " + initBinOccupied + " to " + nagpurBin.occupied + " before operator confirmed placement!");
    }
    print("  ✓ Invariant verified: Destination bin capacity is NOT occupied while stock is staged at dock.");

    // Verify task created in appState.tasks
    var putawayTask = appState.tasks.find(function(t) { return t.consignmentId === 'CSG-TEST-INW-01'; });
    if (!putawayTask) throw new Error("Put-away task was not created in appState.tasks!");
    if (putawayTask.taskType !== 'STOCK_PUTAWAY') throw new Error("Expected taskType STOCK_PUTAWAY, got " + putawayTask.taskType);
    if (putawayTask.status !== 'ASSIGNED') throw new Error("Expected task status ASSIGNED, got " + putawayTask.status);
    if (putawayTask.assignedToName !== 'Ramesh Patil') throw new Error("Expected assigned operator Ramesh Patil, got " + putawayTask.assignedToName);
    print("  ✓ Put-away task created: " + putawayTask.id + " assigned to " + putawayTask.assignedToName);

    // Verify in-app notification sent to operator
    var opNotif = appState.notifications.find(function(n) { return n.refId === putawayTask.id; });
    if (!opNotif) throw new Error("Operator in-app notification not found for task " + putawayTask.id);
    print("  ✓ In-app notification dispatched: '" + opNotif.title + "'");

    // 3. Test Operator Physical Placement Confirmation (Full placement)
    print("\\n[Test 3] Testing Operator Physical Put-Away Confirmation...");
    activePutawayTaskId = putawayTask.id;
    // Set mock inputs
    dom['putawayCertifyCheck'] = { checked: true };
    dom['putawayActualQty'] = { value: '150' };
    dom['putawayActualBinCode'] = { value: analysis.recommendations[0].binCode };
    dom['putawayDamagedCount'] = { value: '0' };
    dom['putawayDiscrepancyReason'] = { value: 'No Discrepancy (Exact Physical Match)' };
    dom['putawayNotes'] = { value: 'Physically stacked 150 bags in designated bay. Bag tags match.' };

    handleExecutePutawayConfirmation();

    // Verify bin occupied is now increased by exactly 150
    if (nagpurBin.occupied !== initBinOccupied + 150) {
      throw new Error("Bin occupied expected " + (initBinOccupied + 150) + ", got " + nagpurBin.occupied);
    }
    print("  ✓ Bin occupied updated to " + nagpurBin.occupied + " only AFTER physical confirmation.");

    // Verify task status is COMPLETED
    if (putawayTask.status !== 'COMPLETED') {
      throw new Error("Expected put-away task status COMPLETED, got " + putawayTask.status);
    }
    print("  ✓ Put-away task marked COMPLETED.");

    // Verify batch storageStatus is STORED
    var storedBatch = appState.batches.find(function(b) { return b.id === putawayTask.batchId; });
    if (!storedBatch) throw new Error("Batch not found in appState.batches!");
    if (storedBatch.storageStatus !== 'STORED') throw new Error("Expected batch storageStatus STORED, got " + storedBatch.storageStatus);
    if (storedBatch.binCode !== analysis.recommendations[0].binCode) throw new Error("Expected batch binCode set to " + analysis.recommendations[0].binCode);
    print("  ✓ Batch " + storedBatch.id + " updated with storageStatus: STORED and binCode: " + storedBatch.binCode);

    // Verify stock movement ledger entry
    var lastMovement = appState.stockMovements[0];
    if (lastMovement.movementType !== 'PUTAWAY') throw new Error("Expected stock movement PUTAWAY, got " + lastMovement.movementType);
    if (lastMovement.fromBin !== 'RECEIVING_DOCK') throw new Error("Expected fromBin RECEIVING_DOCK, got " + lastMovement.fromBin);
    print("  ✓ Stock Movement Ledger entry recorded: " + lastMovement.id + " (RECEIVING_DOCK -> " + lastMovement.toBin + ")");

    // 4. Test Exception: Partial Placement with Transit Damaged Bags
    print("\\n[Test 4] Testing Exception: Partial Placement with Transit Damage...");
    initReceiveWorkflow();
    appState.receiveWorkflow.consignmentId = 'CSG-TEST-EXCEPTION-02';
    appState.receiveWorkflow.commodity = 'Rice';
    appState.receiveWorkflow.totalQuantity = 100;
    appState.receiveWorkflow.arrivalDate = '2025-10-24';
    appState.receiveWorkflow.destinationWarehouseId = 'GDN-NGP-01';
    appState.receiveWorkflow.supplierName = 'Solapur Rice Mills';
    appState.receiveWorkflow.challanNumber = 'CH-RICE-9911';

    runAutomatedInwardAnalysis();
    handleConfirmConsignmentSubmission();

    var excTask = appState.tasks.find(function(t) { return t.consignmentId === 'CSG-TEST-EXCEPTION-02'; });
    var excBin = appState.bins.find(function(b) { return b.code === excTask.plannedBinCode; });
    var excBinOccupiedBefore = excBin.occupied;

    // Operator places 90 bags (85 sound, 5 damaged), 10 bags truck shortage
    activePutawayTaskId = excTask.id;
    dom['putawayCertifyCheck'] = { checked: true };
    dom['putawayActualQty'] = { value: '90' };
    dom['putawayActualBinCode'] = { value: excTask.plannedBinCode };
    dom['putawayDamagedCount'] = { value: '5' };
    dom['putawayDiscrepancyReason'] = { value: 'Torn / Damaged Bags Segregated on Dock' };
    dom['putawayNotes'] = { value: '5 bags torn during unloading, 10 bags short on truck.' };

    handleExecutePutawayConfirmation();

    // Verify sound bags (85) added to bin, not 90 or 100!
    if (excBin.occupied !== excBinOccupiedBefore + 85) {
      throw new Error("Expected bin occupancy to increase by 85 sound bags, got " + (excBin.occupied - excBinOccupiedBefore));
    }
    print("  ✓ Exact sound count placed: Only 85 sound bags added to bin occupancy.");

    // Verify 5 damaged bags added to damagedStock on hold
    var dmgRecord = appState.damagedStock.find(function(d) { return d.batchId === excTask.batchId; });
    if (!dmgRecord) throw new Error("Damaged stock record not created in appState.damagedStock!");
    if (dmgRecord.damagedQuantity !== 5) throw new Error("Expected 5 damaged bags, got " + dmgRecord.damagedQuantity);
    if (dmgRecord.status !== 'ON_HOLD') throw new Error("Expected damaged stock status ON_HOLD, got " + dmgRecord.status);
    print("  ✓ 5 Damaged bags segregated into Damaged Stock register on hold.");

    // Verify task status is PARTIALLY_COMPLETED
    if (excTask.status !== 'PARTIALLY_COMPLETED') {
      throw new Error("Expected task status PARTIALLY_COMPLETED, got " + excTask.status);
    }
    if (excTask.unplacedQuantity !== 10) {
      throw new Error("Expected unplacedQuantity 10, got " + excTask.unplacedQuantity);
    }
    print("  ✓ Task marked PARTIALLY_COMPLETED with unplacedQuantity: " + excTask.unplacedQuantity);

    // Verify Manager discrepancy notification
    var mgrNotif = appState.notifications.find(function(n) { return n.refId === excTask.id && n.type === 'PUTAWAY_DISCREPANCY'; });
    if (!mgrNotif) throw new Error("Manager discrepancy notification not found!");
    print("  ✓ Manager discrepancy alert dispatched: '" + mgrNotif.title + "'");

    print("\\n======================================================================");
    print("ALL INWARD ANALYSIS, RECOMMENDATION & PUT-AWAY TESTS PASSED (100%)!");
    print("======================================================================");
    ''')

res = subprocess.run([
    '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc',
    'scratch/test_putaway_runner.js'
], capture_output=True, text=True)

print(res.stdout)
if res.stderr:
    print('STDERR:', res.stderr)
if res.returncode != 0:
    print('EXIT CODE:', res.returncode)
    exit(1)

