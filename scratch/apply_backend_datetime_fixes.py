import re

# ==============================================================================
# 1. UPDATE api/main.py
# ==============================================================================
with open('api/main.py', 'r', encoding='utf-8') as f:
    api_code = f.read()

# 1.1 Add timezone imports at top of api/main.py
target_import = "import datetime"
replacement_import = """import datetime
from zoneinfo import ZoneInfo
from datetime import datetime, timezone, date, timedelta

# Default Business Timezone: Asia/Kolkata (IST = UTC+05:30)
IST_TIMEZONE = ZoneInfo("Asia/Kolkata")
UTC_TIMEZONE = timezone.utc

def now_utc() -> datetime:
    \"\"\"Current timezone-aware timestamp in UTC for database storage.\"\"\"
    return datetime.now(UTC_TIMEZONE)

def now_ist() -> datetime:
    \"\"\"Current timezone-aware timestamp in Asia/Kolkata.\"\"\"
    return datetime.now(IST_TIMEZONE)

def now_utc_iso() -> str:
    \"\"\"ISO 8601 string in UTC.\"\"\"
    return datetime.now(UTC_TIMEZONE).isoformat()

def now_ist_str() -> str:
    \"\"\"Formatted string in Asia/Kolkata: DD-MM-YYYY hh:mm AM/PM.\"\"\"
    return datetime.now(IST_TIMEZONE).strftime("%d-%m-%Y %I:%M %p")

def format_date_ist(d) -> str:
    \"\"\"Converts any date or datetime to DD-MM-YYYY in Asia/Kolkata.\"\"\"
    if not d:
        return ""
    if isinstance(d, str):
        try:
            if "T" in d or "+" in d or d.endswith("Z"):
                d = datetime.fromisoformat(d.replace("Z", "+00:00"))
            elif "-" in d:
                parts = d.split("-")
                if len(parts) == 3 and len(parts[0]) == 4:
                    return f"{parts[2]}-{parts[1]}-{parts[0]}"
                return d
        except Exception:
            return str(d)
    if isinstance(d, datetime):
        if d.tzinfo is None:
            d = d.replace(tzinfo=UTC_TIMEZONE)
        return d.astimezone(IST_TIMEZONE).strftime("%d-%m-%Y")
    if isinstance(d, date):
        return d.strftime("%d-%m-%Y")
    return str(d)

def format_datetime_ist(dt) -> str:
    \"\"\"Converts any datetime to DD-MM-YYYY hh:mm AM/PM in Asia/Kolkata.\"\"\"
    if not dt:
        return ""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return dt
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC_TIMEZONE)
        return dt.astimezone(IST_TIMEZONE).strftime("%d-%m-%Y %I:%M %p")
    return str(dt)

def validate_chronological_sequence(
    mfg_date = None,
    received_date = None,
    expiry_date = None,
    due_date = None
) -> None:
    \"\"\"Validates date sequencing, rejecting impossible dates and future intake.\"\"\"
    today = date.today()
    def to_date(val):
        if not val:
            return None
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, date):
            return val
        if isinstance(val, str):
            clean = val.split("T")[0].split(" ")[0]
            parts = clean.split("-")
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    return date(int(parts[0]), int(parts[1]), int(parts[2]))
                else:
                    return date(int(parts[2]), int(parts[1]), int(parts[0]))
        return None

    m = to_date(mfg_date)
    r = to_date(received_date)
    e = to_date(expiry_date)

    if r and r > today + timedelta(days=1):
        raise HTTPException(status_code=400, detail="Receipt date cannot be in the future.")
    if m and m > today + timedelta(days=1):
        raise HTTPException(status_code=400, detail="Manufacturing/harvest date cannot be in the future.")
    if m and r and m > r:
        raise HTTPException(status_code=400, detail="Manufacturing date cannot be after receipt date.")
    if e and m and e <= m:
        raise HTTPException(status_code=400, detail="Expiry date must be strictly after manufacturing date.")
    if e and r and e <= r:
        raise HTTPException(status_code=400, detail="Expiry date must be strictly after receipt date.")"""

if "IST_TIMEZONE = ZoneInfo" not in api_code:
    api_code = api_code.replace(target_import, replacement_import, 1)
    print("1. Added timezone-aware datetime core to api/main.py")

# 1.2 Add GET /system/time endpoint to api/main.py
time_endpoint = """
@app.get("/system/time")
async def get_system_time():
    \"\"\"Returns server system clock and business timezone telemetry (Asia/Kolkata).\"\"\"
    u_now = now_utc()
    i_now = now_ist()
    return {
        \"server_time_utc\": u_now.isoformat(),
        \"business_timezone\": \"Asia/Kolkata\",
        \"timezone_offset\": \"+05:30\",
        \"server_time_ist\": i_now.isoformat(),
        \"formatted_date_ist\": i_now.strftime(\"%d-%m-%Y\"),
        \"formatted_datetime_ist\": i_now.strftime(\"%d-%m-%Y %I:%M %p\"),
        \"is_live_clock\": True
    }
"""

if "/system/time" not in api_code:
    # Insert right after app = FastAPI(...)
    app_pos = api_code.find("app = FastAPI(")
    if app_pos != -1:
        app_end = api_code.find("\n\n", app_pos)
        api_code = api_code[:app_end] + "\n" + time_endpoint + api_code[app_end:]
        print("2. Added GET /system/time endpoint to api/main.py")

# 1.3 Add validation to create_receipt in api/main.py
target_receipt_val = """            batch_id = str(uuid.uuid4())
            batch_no = receipt_in.batch_no or f"BATCH-{receipt_no[3:]}"
            received_d = datetime.date.fromisoformat(receipt_in.received_date) if receipt_in.received_date else datetime.date.today()
            expiry_d = datetime.date.fromisoformat(receipt_in.expiry_date) if receipt_in.expiry_date else None"""

replacement_receipt_val = """            batch_id = str(uuid.uuid4())
            batch_no = receipt_in.batch_no or f"BATCH-{receipt_no[3:]}"
            received_d = datetime.date.fromisoformat(receipt_in.received_date) if receipt_in.received_date else datetime.date.today()
            expiry_d = datetime.date.fromisoformat(receipt_in.expiry_date) if receipt_in.expiry_date else None

            # Validate chronological sequencing
            validate_chronological_sequence(received_date=received_d, expiry_date=expiry_d)"""

if target_receipt_val in api_code and "validate_chronological_sequence" not in api_code[api_code.find(target_receipt_val):api_code.find(target_receipt_val)+350]:
    api_code = api_code.replace(target_receipt_val, replacement_receipt_val)
    print("3. Injected validate_chronological_sequence into create_receipt")

# 1.4 Update record_consignment_workflow in api/main.py to validate dates and use now_ist_str()
target_workflow_dates = """    receipt_voucher_id = f"RCV-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")"""

replacement_workflow_dates = """    # Validate chronological integrity
    validate_chronological_sequence(received_date=workflow.arrival_date)

    receipt_voucher_id = f"RCV-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    now_str = now_ist_str()
    now_utc_str = now_utc_iso()"""

if target_workflow_dates in api_code:
    api_code = api_code.replace(target_workflow_dates, replacement_workflow_dates)
    print("4. Updated record_consignment_workflow in api/main.py with validation and now_ist_str()")

# 1.5 Replace utcnow() in login attempts and session tokens
api_code = api_code.replace(
    'now = datetime.datetime.utcnow()',
    'now = now_utc()'
)
api_code = api_code.replace(
    '"created_at": datetime.datetime.utcnow().isoformat()',
    '"created_at": now_utc_iso()'
)
api_code = api_code.replace(
    '"received_at": datetime.datetime.utcnow().isoformat() + "Z"',
    '"received_at": now_utc_iso(),\n        "received_at_ist": now_ist_str()'
)

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(api_code)

print("API/MAIN.PY REAL DATE/TIME REFACTORING COMPLETE!")

# ==============================================================================
# 2. UPDATE web/src/lib/formatters.ts
# ==============================================================================
with open('web/src/lib/formatters.ts', 'r', encoding='utf-8') as f:
    fmt_code = f.read()

new_format_ist_func = """/**
 * Formats date and time consistently to DD-MM-YYYY hh:mm AM/PM in Asia/Kolkata (IST).
 */
export function formatDateTimeIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  const f = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return f.format(d).replace(/\\//g, '-');
}

/**
 * Formats date consistently to DD-MM-YYYY in Asia/Kolkata (IST).
 */
export function formatDateIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';
  const f = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return f.format(d).replace(/\\//g, '-');
}
"""

if "formatDateTimeIST" not in fmt_code:
    fmt_code = fmt_code + "\n" + new_format_ist_func
    with open('web/src/lib/formatters.ts', 'w', encoding='utf-8') as f:
        f.write(fmt_code)
    print("5. Added formatDateTimeIST and formatDateIST to web/src/lib/formatters.ts")

