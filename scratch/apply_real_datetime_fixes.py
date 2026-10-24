import re

# ==============================================================================
# 1. UPDATE index.html
# ==============================================================================
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Define the new Date/Time Core Module in index.html
old_demo_decl = "const DEMO_TODAY = '2025-10-23';"

new_datetime_core = """// =========================================================================
    // BUSINESS TIMEZONE & REAL-TIME SYSTEM CLOCK (Asia/Kolkata, IST UTC+05:30)
    // =========================================================================
    const APP_TIMEZONE = 'Asia/Kolkata';

    function getNowIST() {
      return new Date();
    }

    // Relative date helper for demo scenarios: dynamically offset from real current date
    function getRelativeDateDMY(daysAgo) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }

    // Date parsing: handles DD-MM-YYYY, YYYY-MM-DD, and ISO strings without day boundary slip
    function parseDateDMY(str) {
      if (!str) return new Date();
      if (str instanceof Date) return str;
      if (typeof str === 'string') {
        if (str.includes('T')) {
          const p = new Date(str);
          if (!isNaN(p.getTime())) return p;
        }
        const clean = str.split(' ')[0];
        const parts = clean.split(/[-\/]/);
        if (parts.length === 3) {
          let y, m, d;
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            d = parseInt(parts[2], 10);
          } else {
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            y = parseInt(parts[2], 10);
          }
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return new Date(y, m, d, 12, 0, 0); // Noon anchor prevents day boundary shifts
          }
        }
        const fallback = new Date(str);
        if (!isNaN(fallback.getTime())) return fallback;
      }
      return new Date();
    }

    // Format Date/ISO to DD-MM-YYYY in Asia/Kolkata
    function formatDateIST(dateInput) {
      if (!dateInput) return '—';
      const d = dateInput instanceof Date ? dateInput : (typeof dateInput === 'string' && dateInput.includes('T') ? new Date(dateInput) : parseDateDMY(dateInput));
      if (isNaN(d.getTime())) return '—';
      const f = new Intl.DateTimeFormat('en-IN', {
        timeZone: APP_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return f.format(d).replace(/\//g, '-');
    }

    // Format Date/ISO to 12-hour format with AM/PM in Asia/Kolkata
    function formatTimeIST(dateInput) {
      if (!dateInput) return '—';
      const d = dateInput instanceof Date ? dateInput : (typeof dateInput === 'string' && dateInput.includes('T') ? new Date(dateInput) : parseDateDMY(dateInput));
      if (isNaN(d.getTime())) return '—';
      const f = new Intl.DateTimeFormat('en-IN', {
        timeZone: APP_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return f.format(d);
    }

    // Format Date/ISO to DD-MM-YYYY hh:mm AM/PM in Asia/Kolkata
    function formatDateTimeIST(dateInput) {
      if (!dateInput) return '—';
      return formatDateIST(dateInput) + ' ' + formatTimeIST(dateInput);
    }

    // Current live IST date in DD-MM-YYYY format
    function getTodayDateDMY() {
      return formatDateIST(new Date());
    }

    // Current live IST date in YYYY-MM-DD format (for HTML date pickers)
    function getTodayDateYMD() {
      const now = new Date();
      return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(now);
    }

    // Current live IST time in HH:mm 24-hr format (for HTML time pickers)
    function getCurrentTime24() {
      const now = new Date();
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: APP_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
    }

    // Generate UTC ISO string for backend / database storage
    function getNowUTCISO() {
      return new Date().toISOString();
    }

    // Calculate shelf life age in days dynamically against the live system clock
    function calcAge(arrivalDateStr) {
      if (!arrivalDateStr) return 0;
      const arr = parseDateDMY(arrivalDateStr);
      const now = new Date();
      const diff = now.getTime() - arr.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    function calculateAgeDaysHtml(dateStr) {
      return calcAge(dateStr);
    }

    // Chronological date validation rule: validates sequence and rejects impossible dates
    function validateDateSequence({ manufacturingDate, receiptDate, expiryDate, dueDate }) {
      const mfg = manufacturingDate ? parseDateDMY(manufacturingDate) : null;
      const rcv = receiptDate ? parseDateDMY(receiptDate) : null;
      const exp = expiryDate ? parseDateDMY(expiryDate) : null;
      const due = dueDate ? parseDateDMY(dueDate) : null;
      const now = new Date();

      if (rcv && rcv.getTime() > now.getTime() + 86400000) {
        return { valid: false, message: 'Receipt date cannot be in the future.' };
      }
      if (mfg && mfg.getTime() > now.getTime() + 86400000) {
        return { valid: false, message: 'Manufacturing/Harvest date cannot be in the future.' };
      }
      if (mfg && rcv && mfg.getTime() > rcv.getTime()) {
        return { valid: false, message: 'Manufacturing date cannot be later than Arrival date.' };
      }
      if (exp && mfg && exp.getTime() <= mfg.getTime()) {
        return { valid: false, message: 'Expiry date must be strictly after Manufacturing date.' };
      }
      if (exp && rcv && exp.getTime() <= rcv.getTime()) {
        return { valid: false, message: 'Expiry date must be strictly after Arrival date.' };
      }
      if (due && due.getTime() < now.getTime() - 3600000) {
        return { valid: false, message: 'Task Due Date cannot be in the past.' };
      }
      return { valid: true };
    }"""

if old_demo_decl in html:
    html = html.replace(old_demo_decl, new_datetime_core)
    print("1. Injected real-time IST clock core module in index.html")

# Replace calcAge implementation in index.html if it still had hardcoded 2025 date
old_calc_age = """    function calcAge(arrivalDateStr) {
      const arr = parseDateDMY(arrivalDateStr);
      const ref = new Date(2025, 9, 23); // 23 Oct 2025
      const diff = ref.getTime() - arr.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }"""

new_calc_age = """    // Live dynamic age computation
    // Handled by core module calcAge(arrivalDateStr) above"""

if old_calc_age in html:
    html = html.replace(old_calc_age, new_calc_age)
    print("2. Replaced static calcAge reference with dynamic system clock")

# Update Settings card showing demo anchor to show live server time in Asia/Kolkata
old_settings_anchor = """              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-slate-400 block font-medium">DEMO_TODAY Simulation Anchor</span>
                <span class="font-bold text-slate-800 font-mono text-sm">2025-10-24</span>
              </div>"""

new_settings_anchor = """              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-slate-400 block font-medium">Business Timezone & System Clock</span>
                <span class="font-bold text-slate-800 font-mono text-xs sm:text-sm text-emerald-700">Asia/Kolkata (IST, UTC+05:30) · Live</span>
              </div>"""

if old_settings_anchor in html:
    html = html.replace(old_settings_anchor, new_settings_anchor)
    print("3. Updated settings view to display Live Business Timezone (Asia/Kolkata)")

# Update initReceiveWorkflow to use live IST date and live IST time
old_recv_init = """        arrivalDate: new Date().toISOString().substring(0, 10),
        arrivalTime: '10:30',"""

new_recv_init = """        arrivalDate: getTodayDateYMD(),
        arrivalTime: getCurrentTime24(),"""

if old_recv_init in html:
    html = html.replace(old_recv_init, new_recv_init)
    print("4. Updated initReceiveWorkflow to use getTodayDateYMD() and getCurrentTime24()")

# Update handleConfirmConsignmentSubmission to use live real timestamps and validate sequence
old_confirm_dates = """      const receiptVoucherId = `RCV-${new Date().toISOString().substring(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);"""

new_confirm_dates = """      // Validate chronological integrity before committing
      const dateValidation = validateDateSequence({
        receiptDate: wf.arrivalDate
      });
      if (!dateValidation.valid) {
        alert('Date Validation Error: ' + dateValidation.message);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Confirm Placement & Update Stock</span>'; }
        wf.isSubmitting = false;
        return;
      }

      const receiptVoucherId = `RCV-${getTodayDateYMD().replace(/-/g, '').substring(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowUtcIso = getNowUTCISO();
      const nowStr = formatDateTimeIST(new Date());"""

if old_confirm_dates in html:
    html = html.replace(old_confirm_dates, new_confirm_dates)
    print("5. Updated handleConfirmConsignmentSubmission to validate dates and use formatDateTimeIST")

# Update batch creation in handleConfirmConsignmentSubmission to mark demo vs operational
old_batch_inward = """          arrivalDate: wf.arrivalDate,
          totalQuantity: alloc.quantity,
          availableQuantity: alloc.quantity,
          qualityStatus: 'Pending Inspection', // Strict requirement: Not approved automatically"""

new_batch_inward = """          arrivalDate: formatDateIST(wf.arrivalDate),
          receivedAt: nowUtcIso,
          receivedAtIST: nowStr,
          isDemo: false,
          source: 'OPERATIONAL_INWARD',
          totalQuantity: alloc.quantity,
          availableQuantity: alloc.quantity,
          qualityStatus: 'Pending Inspection', // Strict requirement: Not approved automatically"""

if old_batch_inward in html:
    html = html.replace(old_batch_inward, new_batch_inward)
    print("6. Marked newly received batches as operational with real receivedAt timestamps")

# Update task creation in handleConfirmConsignmentSubmission
old_task_inward = """            assignedAt: nowStr,
            priority: 'HIGH',
            dueAt: (new Date(Date.now() + 4 * 3600 * 1000)).toISOString().replace('T', ' ').substring(0, 16),"""

new_task_inward = """            assignedAt: nowUtcIso,
            assignedAtIST: nowStr,
            formattedAssignedAt: nowStr,
            isDemo: false,
            priority: 'HIGH',
            dueAt: formatDateTimeIST(new Date(Date.now() + 4 * 3600 * 1000)),"""

if old_task_inward in html:
    html = html.replace(old_task_inward, new_task_inward)
    print("7. Updated inward putaway task to record real UTC and IST timestamps")

# Update task creation modal submit handler (handleCreateTaskSubmit)
target_task_submit = """      const newTask = {
        id: `TSK-MAN-${Math.floor(1000 + Math.random() * 9000)}`,
        title: title,"""

replacement_task_submit = """      // Validate due date is not in the past
      if (dueDateTime) {
        const checkDue = parseDateDMY(dueDateTime);
        if (checkDue.getTime() < Date.now() - 3600000) {
          alert('Validation Error: Task due date cannot be in the past.');
          return;
        }
      }

      const nowTaskUtc = getNowUTCISO();
      const nowTaskIst = formatDateTimeIST(new Date());

      const newTask = {
        id: `TSK-MAN-${Math.floor(1000 + Math.random() * 9000)}`,
        title: title,
        isDemo: false,
        createdAt: nowTaskUtc,
        assignedAt: nowTaskUtc,
        assignedAtIST: nowTaskIst,
        formattedAssignedAt: nowTaskIst,"""

if target_task_submit in html and "isDemo: false" not in html[html.find(target_task_submit):html.find(target_task_submit)+200]:
    html = html.replace(target_task_submit, replacement_task_submit)
    print("8. Updated handleCreateTaskSubmit with due date validation and real timestamps")

# Update handleQualityInspectionSubmit
target_quality_submit = """      const inspectionRecord = {
        id: `INS-${Date.now()}`,
        batchId: b.id,"""

replacement_quality_submit = """      const nowQcUtc = getNowUTCISO();
      const nowQcIst = formatDateTimeIST(new Date());

      const inspectionRecord = {
        id: `INS-${Date.now()}`,
        batchId: b.id,
        isDemo: false,
        inspectedAt: nowQcUtc,
        inspectionDate: formatDateIST(new Date()),
        timestamp: nowQcIst,"""

if target_quality_submit in html and "nowQcUtc" not in html[html.find(target_quality_submit)-100:html.find(target_quality_submit)+200]:
    html = html.replace(target_quality_submit, replacement_quality_submit)
    print("9. Updated handleQualityInspectionSubmit to record real inspection timestamps in IST")

# Update handleConfirmPutawaySubmit
target_putaway_submit = """      // 5. Update Task
      task.status = isDiscrepancy ? 'PARTIALLY_COMPLETED' : 'COMPLETED';"""

replacement_putaway_submit = """      // 5. Update Task with Real Completed Timestamps
      const nowPutawayUtc = getNowUTCISO();
      const nowPutawayIst = formatDateTimeIST(new Date());
      task.completedAt = nowPutawayUtc;
      task.completedDate = nowPutawayIst;
      task.status = isDiscrepancy ? 'PARTIALLY_COMPLETED' : 'COMPLETED';"""

if target_putaway_submit in html and "nowPutawayUtc" not in html[html.find(target_putaway_submit):html.find(target_putaway_submit)+250]:
    html = html.replace(target_putaway_submit, replacement_putaway_submit)
    print("10. Updated handleConfirmPutawaySubmit with completedAt and completedDate in IST")

# Update handleCreateDispatchSubmit
target_dispatch_submit = """      const newDispatch = {
        id: newDispatchId,
        commodity: commodity,
        quantityBags: qty,"""

replacement_dispatch_submit = """      const nowDispUtc = getNowUTCISO();
      const nowDispIst = formatDateTimeIST(new Date());

      const newDispatch = {
        id: newDispatchId,
        isDemo: false,
        dispatchedAt: nowDispUtc,
        dispatchDate: formatDateIST(new Date()),
        dispatchTime: formatTimeIST(new Date()),
        timestamp: nowDispIst,
        commodity: commodity,
        quantityBags: qty,"""

if target_dispatch_submit in html and "nowDispUtc" not in html[html.find(target_dispatch_submit)-100:html.find(target_dispatch_submit)+200]:
    html = html.replace(target_dispatch_submit, replacement_dispatch_submit)
    print("11. Updated handleCreateDispatchSubmit with real dispatchedAt and dispatchDate in IST")

# Mark all initial seed batches with isDemo: true and dynamic relative dates so they are realistic and clearly flagged
seed_pattern_b001 = """id: 'B001',
          commodity: 'Wheat',
          arrivalDate: '01-01-2025',"""

seed_replacement_b001 = """id: 'B001',
          commodity: 'Wheat',
          arrivalDate: getRelativeDateDMY(280),
          isDemo: true,
          demoTag: 'SEEDED_HIGH_AGE_DEMO',"""

if seed_pattern_b001 in html:
    html = html.replace(seed_pattern_b001, seed_replacement_b001)
    print("12. Converted seed batch B001 to dynamic relative date with isDemo: true")

# Convert other seed batches (B002 to B010)
seed_replacements = [
    ("arrivalDate: '10-01-2025'", "arrivalDate: getRelativeDateDMY(150), isDemo: true, demoTag: 'SEEDED_AGEING_DEMO'"),
    ("arrivalDate: '20-01-2025'", "arrivalDate: getRelativeDateDMY(75), isDemo: true, demoTag: 'SEEDED_NORMAL_DEMO'"),
    ("arrivalDate: '12-02-2025'", "arrivalDate: getRelativeDateDMY(60), isDemo: true, demoTag: 'SEEDED_HOLD_DEMO'"),
    ("arrivalDate: '01-03-2025'", "arrivalDate: getRelativeDateDMY(45), isDemo: true, demoTag: 'SEEDED_NORMAL_DEMO'"),
    ("arrivalDate: '15-03-2025'", "arrivalDate: getRelativeDateDMY(20), isDemo: true, demoTag: 'SEEDED_FRESH_DEMO'"),
    ("arrivalDate: '18-03-2025'", "arrivalDate: getRelativeDateDMY(15), isDemo: true, demoTag: 'SEEDED_REJECTED_DEMO'"),
    ("arrivalDate: '24-10-2025'", "arrivalDate: getRelativeDateDMY(1), isDemo: true, demoTag: 'SEEDED_INTAKE_DEMO'"),
    ("arrivalDate: '25-03-2025'", "arrivalDate: getRelativeDateDMY(95), isDemo: true, demoTag: 'SEEDED_BUFFER_DEMO'")
]
for old_s, new_s in seed_replacements:
    if old_s in html:
        html = html.replace(old_s, new_s)

print("13. Converted all remaining seed batches to dynamic relative dates with isDemo: true")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("INDEX.HTML REAL DATE/TIME REFACTORING COMPLETE!")

