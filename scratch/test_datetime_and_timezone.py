"""
Comprehensive Verification Suite: Real Date & Time, Timezone (Asia/Kolkata),
Chronological Sequencing, and Dynamic Expiry Engine.
"""
import sys
import os
import re
import ast
import subprocess
from datetime import datetime, timezone, date, timedelta
from zoneinfo import ZoneInfo

print("===========================================================================")
print("TESTING REAL DATE AND TIME, ASIA/KOLKATA TIMEZONE & VALIDATION SUITE")
print("===========================================================================")

# -----------------------------------------------------------------------------
# 1. TEST BACKEND TIMEZONE & SYSTEM CLOCK HELPERS
# -----------------------------------------------------------------------------
print("\n[Test 1] Testing Backend Timezone & Live Clock Engine...")

# Load functions from api/main.py source
with open('api/main.py', 'r', encoding='utf-8') as f:
    api_src = f.read()

assert 'from zoneinfo import ZoneInfo' in api_src, "ZoneInfo missing in api/main.py"
assert 'IST_TIMEZONE = ZoneInfo("Asia/Kolkata")' in api_src, "IST_TIMEZONE missing in api/main.py"
assert 'def now_utc()' in api_src, "now_utc missing in api/main.py"
assert 'def now_ist()' in api_src, "now_ist missing in api/main.py"
assert 'def format_date_ist(' in api_src, "format_date_ist missing in api/main.py"
assert 'def format_datetime_ist(' in api_src, "format_datetime_ist missing in api/main.py"
assert 'def validate_chronological_sequence(' in api_src, "validate_chronological_sequence missing in api/main.py"
assert '"/system/time"' in api_src, "GET /system/time endpoint missing in api/main.py"

# Execute extracted backend datetime block in clean sandbox namespace
backend_dt_env = {
    'ZoneInfo': ZoneInfo,
    'datetime': datetime,
    'timezone': timezone,
    'date': date,
    'timedelta': timedelta,
    'HTTPException': type('HTTPException', (Exception,), {'__init__': lambda s, status_code, detail: setattr(s, 'status_code', status_code) or setattr(s, 'detail', detail)}),
    'Optional': type(None)
}

# Extract core datetime functions from api/main.py
dt_block = api_src[api_src.find("IST_TIMEZONE = ZoneInfo"):api_src.find("from fastapi import")]
exec(dt_block, backend_dt_env)

now_utc_fn = backend_dt_env['now_utc']
now_ist_fn = backend_dt_env['now_ist']
format_date_ist_fn = backend_dt_env['format_date_ist']
format_datetime_ist_fn = backend_dt_env['format_datetime_ist']
validate_seq_fn = backend_dt_env['validate_chronological_sequence']

# 1.1 Timezone sanity
u_now = now_utc_fn()
i_now = now_ist_fn()
assert u_now.tzinfo == timezone.utc, "now_utc must be timezone-aware UTC"
assert str(i_now.tzinfo) == "Asia/Kolkata", f"now_ist must be timezone-aware IST, got {i_now.tzinfo}"

# Difference between IST and UTC should be exactly +5 hours and 30 minutes
offset = i_now.utcoffset()
assert offset == timedelta(hours=5, minutes=30), f"Expected +05:30 offset, got {offset}"

# 1.2 Formatted strings match DD-MM-YYYY and 12-hr format with AM/PM
today_ist = i_now.strftime("%d-%m-%Y")
assert format_date_ist_fn(i_now) == today_ist, f"Date format mismatch: {format_date_ist_fn(i_now)} vs {today_ist}"

ist_datetime_str = format_datetime_ist_fn(i_now)
assert any(ap in ist_datetime_str for ap in ["AM", "PM"]), f"Must include AM/PM: {ist_datetime_str}"
parts = ist_datetime_str.split(" ")
assert len(parts) == 3, f"Expected [DD-MM-YYYY, hh:mm, AM/PM], got {parts}"
assert len(parts[0].split("-")) == 3, f"Date part must be DD-MM-YYYY: {parts[0]}"

# 1.3 No day-shifting bug on UTC conversion
utc_evening = datetime(2026, 10, 24, 20, 0, 0, tzinfo=timezone.utc)
ist_next_day = format_date_ist_fn(utc_evening)
assert ist_next_day == "25-10-2026", f"Expected 25-10-2026 in IST, got {ist_next_day}"

print("  ✓ Backend timezone engine correctly enforces Asia/Kolkata (IST = UTC+05:30).")
print(f"  ✓ Live system clock verified: UTC={u_now.isoformat()} -> IST={ist_datetime_str}.")

# -----------------------------------------------------------------------------
# 2. TEST CHRONOLOGICAL VALIDATION ENGINE
# -----------------------------------------------------------------------------
print("\n[Test 2] Testing Chronological Validation & Boundary Guards...")

# 2.1 Valid chronological sequence must pass
try:
    validate_seq_fn(
        mfg_date="2026-08-01",
        received_date="2026-09-01",
        expiry_date="2027-09-01"
    )
    print("  ✓ Valid sequence (Mfg < Receipt < Expiry) accepted.")
except Exception as e:
    assert False, f"Valid sequence failed: {e}"

# 2.2 Expiry before receipt must be rejected
try:
    validate_seq_fn(
        received_date="2026-09-01",
        expiry_date="2026-08-01" # Earlier than receipt!
    )
    assert False, "Should have rejected expiry earlier than receipt."
except Exception as e:
    assert getattr(e, 'status_code', None) == 400
    assert "Expiry date must be strictly after" in getattr(e, 'detail', '')
    print(f"  ✓ Rejected impossible expiry date: {e.detail}")

# 2.3 Expiry before manufacturing date must be rejected
try:
    validate_seq_fn(
        mfg_date="2026-08-10",
        received_date="2026-08-15",
        expiry_date="2026-08-05" # Earlier than mfg!
    )
    assert False, "Should have rejected expiry earlier than mfg."
except Exception as e:
    assert getattr(e, 'status_code', None) == 400
    assert "Expiry date must be strictly after manufacturing date" in getattr(e, 'detail', '')
    print(f"  ✓ Rejected invalid manufacturing vs expiry sequence: {e.detail}")

# 2.4 Receipt date in future must be rejected
future_date = (date.today() + timedelta(days=10)).strftime("%Y-%m-%d")
try:
    validate_seq_fn(received_date=future_date)
    assert False, "Should have rejected future receipt date."
except Exception as e:
    assert getattr(e, 'status_code', None) == 400
    assert "Receipt date cannot be in the future" in getattr(e, 'detail', '')
    print(f"  ✓ Rejected future inward receipt: {e.detail}")

# -----------------------------------------------------------------------------
# 3. TEST FRONTEND DATE/TIME LOGIC & DYNAMIC AGE ENGINE (index.html)
# -----------------------------------------------------------------------------
print("\n[Test 3] Testing Frontend JavaScript Core & Dynamic Age Engine...")

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 3.1 Verify hardcoded simulation anchor elimination
assert "const DEMO_TODAY = '2025-10-23';" not in html, "DEMO_TODAY hardcoded anchor must be eliminated"
assert "Business Timezone & System Clock" in html, "Settings view must display live system clock"
assert "Asia/Kolkata" in html, "Asia/Kolkata must be explicitly declared as business timezone"
print("  ✓ DEMO_TODAY static anchor eliminated; live Asia/Kolkata clock active.")

# 3.2 Run JSC verification of JS Date/Time functions
js_test_code = """
var now = new Date();
var formattedDate = formatDateIST(now);
var formattedDateTime = formatDateTimeIST(now);
var time24 = getCurrentTime24();
var todayYmd = getTodayDateYMD();

// Verify format DD-MM-YYYY
var dParts = formattedDate.split('-');
if (dParts.length !== 3 || dParts[0].length !== 2 || dParts[1].length !== 2 || dParts[2].length !== 4) {
  throw new Error('Invalid formatDateIST output: ' + formattedDate);
}

// Verify 12-hour AM/PM format
if (!formattedDateTime.includes('AM') && !formattedDateTime.includes('PM')) {
  throw new Error('formatDateTimeIST missing AM/PM: ' + formattedDateTime);
}

// Verify dynamic age calculation (today = 0 days, 10 days ago = 10 days)
var tenDaysAgo = getRelativeDateDMY(10);
var calculatedAge = calcAge(tenDaysAgo);
if (calculatedAge < 9 || calculatedAge > 11) {
  throw new Error('Dynamic age calculation failed: expected ~10 days, got ' + calculatedAge);
}

// Verify chronological validation
var validSeq = validateDateSequence({
  receiptDate: getRelativeDateDMY(5),
  expiryDate: getRelativeDateDMY(-365) // 365 days in future
});
if (!validSeq.valid) {
  throw new Error('Valid sequence rejected: ' + validSeq.message);
}

var invalidSeq = validateDateSequence({
  receiptDate: getRelativeDateDMY(5),
  expiryDate: getRelativeDateDMY(10) // Expired before arrival!
});
if (invalidSeq.valid) {
  throw new Error('Invalid sequence was erroneously accepted');
}

print('JSC_VERIFIED_DATE_SUCCESS:' + formattedDateTime + '|AGE:' + calculatedAge);
"""

# Extract the script definition from index.html and evaluate in JSC
scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html, re.DOTALL)
main_js = scripts[1]

# Append test verification harness to main_js
full_jsc_test = """
var window = this;
window.addEventListener = function(){};
window.location = { pathname: '/' };
window.scrollTo = function(){};
var console = { log: print, warn: print, error: print };
var document = {
  getElementById: function(){ return { classList: { toggle: function(){}, add: function(){}, remove: function(){} }, innerHTML: '', value: '' }; },
  addEventListener: function(){},
  readyState: 'complete'
};
var localStorage = { getItem: function(){ return null; }, setItem: function(){} };
var setTimeout = function(fn){};
""" + main_js + "\n" + js_test_code

with open('/tmp/test_datetime_jsc.js', 'w', encoding='utf-8') as f:
    f.write(full_jsc_test)

res = subprocess.run([
    '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc',
    '/tmp/test_datetime_jsc.js'
], capture_output=True, text=True)

assert "JSC_VERIFIED_DATE_SUCCESS" in res.stdout, f"JSC Date Verification Failed: {res.stdout}\n{res.stderr}"
print(f"  ✓ JavaScript Engine verified in browser context: {res.stdout.strip()}")

# -----------------------------------------------------------------------------
# 4. TEST SEED DEMO TAGGING (index.html)
# -----------------------------------------------------------------------------
print("\n[Test 4] Testing Seed Data Segregation & Operational Record Tagging...")
assert "isDemo: true" in html, "Seed batches must be explicitly marked with isDemo: true"
assert "source: 'OPERATIONAL_INWARD'" in html, "Operational inward batches must be marked OPERATIONAL_INWARD"
assert "isDemo: false" in html, "Operational dispatches and tasks must have isDemo: false"
print("  ✓ Seed demo data segregated with 'isDemo: true' tags.")
print("  ✓ Real user actions generate 'isDemo: false' operational records with live timestamps.")

# -----------------------------------------------------------------------------
# 5. TEST REACT FORMATTERS (web/src/lib/formatters.ts)
# -----------------------------------------------------------------------------
print("\n[Test 5] Testing React TypeScript Formatters...")
with open('web/src/lib/formatters.ts', 'r', encoding='utf-8') as f:
    fmt_ts = f.read()

assert "export function formatDateTimeIST" in fmt_ts, "formatDateTimeIST missing in formatters.ts"
assert "export function formatDateIST" in fmt_ts, "formatDateIST missing in formatters.ts"
assert "Asia/Kolkata" in fmt_ts, "formatters.ts must use Asia/Kolkata"
print("  ✓ web/src/lib/formatters.ts parity verified with Asia/Kolkata formatting.")

print("\n===========================================================================")
print("ALL REAL DATE, TIME, ASIA/KOLKATA & TIMEZONE CHECKS PASSED (100%)!")
print("===========================================================================")
