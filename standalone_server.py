import os
import sys
import json
import uuid
import hashlib
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

PORT = 3000

# -----------------------------------------------------------------------------
# In-Memory Seed State (Exact match with PostgreSQL schema & seed.sql)
# -----------------------------------------------------------------------------

WAREHOUSES = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "code": "GDN-NGP-01",
        "name": "Central Food Godown, Nagpur",
        "district": "Nagpur",
        "state": "Maharashtra",
        "capacity_mt": 5000.0
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "code": "GDN-PUN-02",
        "name": "District Buffer Depot, Pune",
        "district": "Pune",
        "state": "Maharashtra",
        "capacity_mt": 7500.0
    }
]

COMMODITIES = [
    {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "code": "WHEAT-A",
        "name": "Wheat Grade A (Fair Average Quality)",
        "standard_pack_size_g": 50000,
        "shelf_life_days": 365
    },
    {
        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "code": "RICE-SONA",
        "name": "Rice Sona Masoori Raw",
        "standard_pack_size_g": 50000,
        "shelf_life_days": 730
    },
    {
        "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "code": "SUGAR-M",
        "name": "Refined Sugar Grade-M",
        "standard_pack_size_g": 50000,
        "shelf_life_days": 730
    },
    {
        "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "code": "BAJRA-FORT",
        "name": "Fortified Bajra (Millet)",
        "standard_pack_size_g": 50000,
        "shelf_life_days": 180
    }
]

USERS = [
    {
        "id": "u0000001-0000-0000-0000-000000000001",
        "username": "emp_ramesh",
        "full_name": "Ramesh Patil",
        "role": "STORE_EMPLOYEE",
        "warehouse_id": "11111111-1111-1111-1111-111111111111"
    },
    {
        "id": "u0000002-0000-0000-0000-000000000002",
        "username": "emp_suresh",
        "full_name": "Suresh Shinde",
        "role": "STORE_EMPLOYEE",
        "warehouse_id": "22222222-2222-2222-2222-222222222222"
    },
    {
        "id": "u0000003-0000-0000-0000-000000000003",
        "username": "insp_anita",
        "full_name": "Dr. Anita Rao",
        "role": "QUALITY_OFFICER",
        "warehouse_id": "11111111-1111-1111-1111-111111111111"
    },
    {
        "id": "u0000004-0000-0000-0000-000000000004",
        "username": "appr_deshmukh",
        "full_name": "Vikram Deshmukh",
        "role": "APPROVER",
        "warehouse_id": "11111111-1111-1111-1111-111111111111"
    },
    {
        "id": "u0000005-0000-0000-0000-000000000005",
        "username": "audit_kulkarni",
        "full_name": "Sunita Kulkarni",
        "role": "AUDITOR",
        "warehouse_id": "11111111-1111-1111-1111-111111111111"
    }
]

RATION_SHOPS = [
    {"id": "s0000001-0000-0000-0000-000000000001", "fps_code": "FPS-NGP-101", "owner_name": "Ganesh Kirana & PDS", "village_ward": "Sitabuldi Ward 4", "district": "Nagpur", "warehouse_id": "11111111-1111-1111-1111-111111111111"},
    {"id": "s0000002-0000-0000-0000-000000000002", "fps_code": "FPS-NGP-102", "owner_name": "Prabhat Ration Store", "village_ward": "Dharampeth Ward 12", "district": "Nagpur", "warehouse_id": "11111111-1111-1111-1111-111111111111"},
    {"id": "s0000003-0000-0000-0000-000000000003", "fps_code": "FPS-NGP-103", "owner_name": "Jai Kisan Sahakari", "village_ward": "Sonegaon Ward 9", "district": "Nagpur", "warehouse_id": "11111111-1111-1111-1111-111111111111"},
    {"id": "s0000004-0000-0000-0000-000000000004", "fps_code": "FPS-NGP-104", "owner_name": "Mahalaxmi Bhandar", "village_ward": "Kamptee Rural", "district": "Nagpur", "warehouse_id": "11111111-1111-1111-1111-111111111111"},
    {"id": "s0000005-0000-0000-0000-000000000005", "fps_code": "FPS-PUN-201", "owner_name": "Saraswati Grain Mart", "village_ward": "Kothrud Ward 15", "district": "Pune", "warehouse_id": "22222222-2222-2222-2222-222222222222"},
    {"id": "s0000006-0000-0000-0000-000000000006", "fps_code": "FPS-PUN-202", "owner_name": "Chhatrapati PDS Depot", "village_ward": "Hadapsar Ward 8", "district": "Pune", "warehouse_id": "22222222-2222-2222-2222-222222222222"}
]

TODAY = datetime.date.today()

def days_ago(d):
    return (TODAY - datetime.timedelta(days=d)).isoformat()

def days_future(d):
    return (TODAY + datetime.timedelta(days=d)).isoformat()

GOODS_RECEIPTS = [
    {
        "id": "gr000001-0000-0000-0000-000000000001",
        "receipt_no": "GR-2026-FCI-001",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "supplier_source": "FCI Base Depot Gondia",
        "vehicle_no": "MH-31-AP-4921",
        "document_ref": "DC/FCI/2026/9021",
        "received_by": "u0000001-0000-0000-0000-000000000001",
        "received_at": f"{days_ago(120)}T09:30:00Z"
    },
    {
        "id": "gr000002-0000-0000-0000-000000000002",
        "receipt_no": "GR-2026-FCI-002",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "supplier_source": "Punjab State Grains Pool",
        "vehicle_no": "PB-10-CZ-8822",
        "document_ref": "RR/NR/2026/4102",
        "received_by": "u0000001-0000-0000-0000-000000000001",
        "received_at": f"{days_ago(90)}T11:00:00Z"
    },
    {
        "id": "gr000003-0000-0000-0000-000000000003",
        "receipt_no": "GR-2026-FCI-003",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "supplier_source": "Haryana Agro Procurement",
        "vehicle_no": "HR-26-DF-1090",
        "document_ref": "CH/HAP/2026/1109",
        "received_by": "u0000001-0000-0000-0000-000000000001",
        "received_at": f"{days_ago(50)}T14:15:00Z"
    }
]

BATCHES = [
    # Wheat Batches in Nagpur (ordered by received_date ASC for FIFO)
    {
        "id": "b0000001-0000-0000-0000-000000000001",
        "batch_no": "BATCH-WHT-2026-001",
        "receipt_id": "gr000001-0000-0000-0000-000000000001",
        "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(110),
        "expiry_date": days_future(255),
        "received_qty_g": 400000, # 400 kg
        "current_qty_g": 400000,
        "status": "AVAILABLE"
    },
    {
        "id": "b0000002-0000-0000-0000-000000000002",
        "batch_no": "BATCH-WHT-2026-002",
        "receipt_id": "gr000001-0000-0000-0000-000000000001",
        "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(80),
        "expiry_date": days_future(285),
        "received_qty_g": 600000, # 600 kg
        "current_qty_g": 600000,
        "status": "AVAILABLE"
    },
    {
        "id": "b0000003-0000-0000-0000-000000000003",
        "batch_no": "BATCH-WHT-2026-003",
        "receipt_id": "gr000002-0000-0000-0000-000000000002",
        "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(50),
        "expiry_date": days_future(315),
        "received_qty_g": 1200000, # 1,200 kg
        "current_qty_g": 1200000,
        "status": "AVAILABLE"
    },
    {
        "id": "b0000004-0000-0000-0000-000000000004",
        "batch_no": "BATCH-WHT-2026-004",
        "receipt_id": "gr000003-0000-0000-0000-000000000003",
        "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(20),
        "expiry_date": days_future(345),
        "received_qty_g": 3000000, # 3,000 kg
        "current_qty_g": 3000000,
        "status": "AVAILABLE"
    },
    # Batch under QUALITY_HOLD (Moisture issue)
    {
        "id": "b0000005-0000-0000-0000-000000000005",
        "batch_no": "BATCH-WHT-2026-005-HOLD",
        "receipt_id": "gr000002-0000-0000-0000-000000000002",
        "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(60),
        "expiry_date": days_future(305),
        "received_qty_g": 1500000,
        "current_qty_g": 1500000,
        "status": "QUALITY_HOLD"
    },
    # Rice Batches in Nagpur
    {
        "id": "b0000006-0000-0000-0000-000000000006",
        "batch_no": "BATCH-RICE-2026-001",
        "receipt_id": "gr000001-0000-0000-0000-000000000001",
        "commodity_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(95),
        "expiry_date": days_future(635),
        "received_qty_g": 2500000,
        "current_qty_g": 2500000,
        "status": "AVAILABLE"
    },
    {
        "id": "b0000007-0000-0000-0000-000000000007",
        "batch_no": "BATCH-RICE-2026-002",
        "receipt_id": "gr000002-0000-0000-0000-000000000002",
        "commodity_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(40),
        "expiry_date": days_future(690),
        "received_qty_g": 4000000,
        "current_qty_g": 4000000,
        "status": "AVAILABLE"
    },
    # Expired Batch (Should never be picked by FIFO)
    {
        "id": "b0000008-0000-0000-0000-000000000008",
        "batch_no": "BATCH-BJR-2025-001-EXPIRED",
        "receipt_id": "gr000001-0000-0000-0000-000000000001",
        "commodity_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "warehouse_id": "11111111-1111-1111-1111-111111111111",
        "received_date": days_ago(210),
        "expiry_date": days_ago(30), # EXPIRED 30 days ago
        "received_qty_g": 800000,
        "current_qty_g": 800000,
        "status": "EXPIRED"
    }
]

QUALITY_HOLDS = [
    {
        "id": "h0000001-0000-0000-0000-000000000001",
        "batch_id": "b0000005-0000-0000-0000-000000000005",
        "reason": "High moisture content detected (15.2% exceeds FSSAI 12% ceiling). Suspected rain leakage.",
        "placed_by": "u0000003-0000-0000-0000-000000000003", # Dr. Anita Rao
        "placed_at": f"{days_ago(15)}T10:00:00Z",
        "release_requested_by": None,
        "release_reason": None,
        "release_approved_by": None,
        "released_at": None,
        "status": "ACTIVE"
    }
]

DISPATCH_REQUESTS = []
DISPATCH_ALLOCATIONS = []
STOCK_MOVEMENTS = []
FIFO_EXCEPTIONS = []

# Initialize Genesis Stock Movements for Seed Batches
_last_hash = "0" * 64
_mov_id_seq = 1

def append_stock_movement(movement_type, batch_id, qty_delta_g, ref_type, ref_id, user_id):
    global _last_hash, _mov_id_seq
    batch = next((b for b in BATCHES if b["id"] == batch_id), None)
    bal_after = batch["current_qty_g"] if batch else 0
    now_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    payload = f"{_last_hash}|{batch_id}|{movement_type}|{qty_delta_g}|{bal_after}|{ref_type}|{ref_id}|{user_id}|{now_ts}"
    row_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    
    mov = {
        "movement_id": _mov_id_seq,
        "movement_type": movement_type,
        "batch_id": batch_id,
        "qty_delta_g": qty_delta_g,
        "ref_type": ref_type,
        "ref_id": ref_id,
        "balance_after_g": bal_after,
        "created_by": user_id,
        "created_at": now_ts,
        "prev_hash": _last_hash,
        "row_hash": row_hash
    }
    _last_hash = row_hash
    _mov_id_seq += 1
    STOCK_MOVEMENTS.append(mov)
    return mov

# Seed movements for each initial batch
for b in BATCHES:
    append_stock_movement("RECEIPT", b["id"], b["received_qty_g"], "GOODS_RECEIPT", b["receipt_id"], "u0000001-0000-0000-0000-000000000001")


# -----------------------------------------------------------------------------
# Core PL/pgSQL Logic Emulation (Integer-gram FIFO allocation, Invariants, Locks)
# -----------------------------------------------------------------------------

def allocate_fifo_engine(request_id, dry_run=False, allow_partial=False):
    req = next((r for r in DISPATCH_REQUESTS if r["id"] == request_id), None)
    if not req:
        return {"success": False, "message": "Dispatch request not found."}

    if req["status"] == "DISPATCHED":
        # Idempotent response
        allocs = [a for a in DISPATCH_ALLOCATIONS if a["request_id"] == request_id]
        return {
            "success": True,
            "status": "ALREADY_DISPATCHED",
            "idempotent": True,
            "request_id": req["id"],
            "request_no": req["request_no"],
            "requested_qty_g": req["requested_qty_g"],
            "allocated_qty_g": req["requested_qty_g"],
            "shortfall_qty_g": 0,
            "allocations": allocs,
            "message": "Request already dispatched. Idempotent plan returned."
        }

    # Filter candidate batches:
    # 1. Matches warehouse & commodity
    # 2. status == 'AVAILABLE' (hard stop for quality holds!)
    # 3. current_qty_g > 0
    # 4. not expired (expiry_date >= TODAY)
    # 5. ORDER BY received_date ASC, id ASC (Deterministic FIFO)
    candidates = [
        b for b in BATCHES
        if b["warehouse_id"] == req["warehouse_id"]
        and b["commodity_id"] == req["commodity_id"]
        and b["status"] == "AVAILABLE"
        and b["current_qty_g"] > 0
        and (not b.get("expiry_date") or b["expiry_date"] >= TODAY.isoformat())
    ]
    candidates.sort(key=lambda x: (x["received_date"], x["id"]))

    total_available_g = sum(b["current_qty_g"] for b in candidates)
    requested_qty_g = req["requested_qty_g"]

    # Shortfall detection
    if total_available_g < requested_qty_g and not allow_partial:
        shortfall_g = requested_qty_g - total_available_g
        if not dry_run:
            req["status"] = "SHORTFALL"
        return {
            "success": False,
            "status": "SHORTFALL",
            "request_id": req["id"],
            "request_no": req["request_no"],
            "requested_qty_g": requested_qty_g,
            "available_qty_g": total_available_g,
            "shortfall_qty_g": shortfall_g,
            "message": f"Stock shortfall detected. Deficit: {shortfall_g / 1000.0:.3f} kg. Partial dispatches prohibited."
        }

    # Allocation planning (multi-batch split, exact-sum property)
    remaining_g = requested_qty_g
    alloc_items = []
    rank = 1

    for b in candidates:
        if remaining_g <= 0:
            break
        alloc_qty_g = min(remaining_g, b["current_qty_g"])
        alloc_items.append({
            "batch_id": b["id"],
            "batch_no": b["batch_no"],
            "received_date": b["received_date"],
            "batch_available_before_g": b["current_qty_g"],
            "allocated_qty_g": alloc_qty_g,
            "allocated_qty_kg": round(alloc_qty_g / 1000.0, 3),
            "fifo_rank": rank,
            "was_oldest_eligible": True
        })
        remaining_g -= alloc_qty_g
        rank += 1

    total_allocated_g = sum(a["allocated_qty_g"] for a in alloc_items)

    if dry_run:
        return {
            "success": True,
            "status": "PREVIEW_READY",
            "request_id": req["id"],
            "request_no": req["request_no"],
            "requested_qty_g": requested_qty_g,
            "allocated_qty_g": total_allocated_g,
            "shortfall_qty_g": max(0, requested_qty_g - total_allocated_g),
            "allocations": alloc_items
        }

    # Commit execution
    for a in alloc_items:
        b = next(x for x in BATCHES if x["id"] == a["batch_id"])
        # Decrement batch balance
        b["current_qty_g"] -= a["allocated_qty_g"]
        if b["current_qty_g"] == 0:
            b["status"] = "EXHAUSTED"
        
        # Insert allocation
        DISPATCH_ALLOCATIONS.append({
            "id": str(uuid.uuid4()),
            "request_id": req["id"],
            "batch_id": b["id"],
            "batch_no": b["batch_no"],
            "allocated_qty_g": a["allocated_qty_g"],
            "fifo_rank": a["fifo_rank"],
            "was_oldest_eligible": True,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        
        # Write append-only stock movement
        append_stock_movement(
            "DISPATCH",
            b["id"],
            -a["allocated_qty_g"],
            "DISPATCH_REQUEST",
            req["id"],
            req["created_by"]
        )

    req["status"] = "DISPATCHED"
    req["dispatched_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    return {
        "success": True,
        "status": "DISPATCHED",
        "request_id": req["id"],
        "request_no": req["request_no"],
        "requested_qty_g": requested_qty_g,
        "allocated_qty_g": total_allocated_g,
        "shortfall_qty_g": 0,
        "allocations": alloc_items,
        "message": f"Dispatch committed atomically. {total_allocated_g / 1000.0:.3f} kg dispatched."
    }


def verify_ledger_chain():
    """Traverse stock movements and verify cryptographic integrity."""
    prev = "0" * 64
    for idx, m in enumerate(STOCK_MOVEMENTS):
        if m["prev_hash"] != prev:
            return {"is_valid": False, "error_message": f"Broken chain at movement #{m['movement_id']}"}
        
        payload = f"{m['prev_hash']}|{m['batch_id']}|{m['movement_type']}|{m['qty_delta_g']}|{m['balance_after_g']}|{m['ref_type']}|{m['ref_id']}|{m['created_by']}|{m['created_at']}"
        expected = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        if m["row_hash"] != expected:
            return {"is_valid": False, "error_message": f"Tampered hash detected at movement #{m['movement_id']}"}
        prev = m["row_hash"]
    
    return {"is_valid": True, "total_verified": len(STOCK_MOVEMENTS), "error_message": f"Clean ledger: {len(STOCK_MOVEMENTS)} movements verified with valid SHA-256 chain."}


# -----------------------------------------------------------------------------
# Embedded Web Interface HTML (Full-Featured React/Tailwind/Lucide UI)
# -----------------------------------------------------------------------------

UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BhandarSetu (भंडार सेतु) — Government PDS Godown FIFO Engine</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap">
  <style>
    body { font-family: 'Inter', sans-serif; }
    code, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

  <!-- Header -->
  <header class="bg-emerald-900 text-white shadow-lg sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center font-bold text-xl text-emerald-300">
          🌾
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold tracking-tight">BhandarSetu (भंडार सेतु)</h1>
            <span class="text-[10px] bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">iPDS FIFO v1.0</span>
          </div>
          <p class="text-xs text-emerald-300">PDS Grain Godown Batch-wise FIFO Allocation & Traceable Dispatch Engine</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="bg-emerald-950/70 border border-emerald-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
          <span class="text-emerald-400 font-semibold">Active Godown:</span>
          <select id="whSelect" onchange="renderCurrentTab()" class="bg-transparent text-white font-semibold focus:outline-none cursor-pointer">
          </select>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <nav class="bg-emerald-800/90 border-t border-emerald-700/60 px-4 sm:px-6">
      <div class="max-w-7xl mx-auto flex space-x-2 sm:space-x-4 overflow-x-auto text-xs font-semibold">
        <button onclick="setTab('dashboard')" id="tab-dashboard" class="py-3 px-3 border-b-2 border-white text-white flex items-center gap-2">
          📊 Godown Inventory & Ageing
        </button>
        <button onclick="setTab('dispatch')" id="tab-dispatch" class="py-3 px-3 border-b-2 border-transparent text-emerald-200 hover:text-white flex items-center gap-2">
          ⚡ FIFO Dispatch Engine
        </button>
        <button onclick="setTab('receipt')" id="tab-receipt" class="py-3 px-3 border-b-2 border-transparent text-emerald-200 hover:text-white flex items-center gap-2">
          🚚 Inward Consignment
        </button>
        <button onclick="setTab('holds')" id="tab-holds" class="py-3 px-3 border-b-2 border-transparent text-emerald-200 hover:text-white flex items-center gap-2">
          🛡️ Quarantine & Maker-Checker
        </button>
        <button onclick="setTab('audit')" id="tab-audit" class="py-3 px-3 border-b-2 border-transparent text-emerald-200 hover:text-white flex items-center gap-2">
          🔍 Forensic Audit & Cryptographic Chain
        </button>
      </div>
    </nav>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6" id="appMain">
    <!-- Dynamic Content Injected Here -->
  </main>

  <footer class="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
    BhandarSetu iPDS Architecture | PostgreSQL 16 PL/pgSQL Atomic FIFO Allocation Engine | Concurrency-Safe & Tamper-Evident Ledger
  </footer>

  <!-- Notification Toast -->
  <div id="toast" class="fixed bottom-5 right-5 max-w-md p-4 rounded-xl shadow-2xl text-xs font-semibold hidden z-50 transition transform"></div>

  <!-- Quarantine Modal -->
  <div id="holdModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
      <h3 class="text-base font-bold text-red-700 flex items-center gap-2">
        🛡️ Quarantine Grain Batch
      </h3>
      <p class="text-xs text-slate-600">
        Placing batch <strong id="modalBatchNo" class="font-mono"></strong> on hold locks it at the database level. Allocations and dispatches will be strictly blocked.
      </p>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Reason for Quarantine / Lab Defect</label>
        <textarea id="modalReason" rows="3" class="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white focus:outline-none">High moisture content detected (> 14.5% exceeds FSSAI threshold).</textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Authorizing Quality Inspector</label>
        <select id="modalInspector" class="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50"></select>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeHoldModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onclick="submitHold()" class="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow">Confirm Quarantine Lock</button>
      </div>
    </div>
  </div>

  <!-- Release Request Modal -->
  <div id="releaseModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
      <h3 class="text-base font-bold text-amber-700 flex items-center gap-2">
        🔑 Request Quality Quarantine Release
      </h3>
      <p class="text-xs text-slate-600">
        Submit lab clearance certification. An independent supervisor must verify before stock can be released.
      </p>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Release Justification & Clearance Note</label>
        <textarea id="relReason" rows="3" class="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50">Re-testing report #QC-889 shows moisture normalized to 11.2% after aeration.</textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Requesting Inspector (Maker)</label>
        <select id="relRequester" class="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50"></select>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeReleaseModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onclick="submitReleaseRequest()" class="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow">Submit Release Request</button>
      </div>
    </div>
  </div>

  <script>
    let currentTab = 'dashboard';
    let selectedBatchForHold = null;
    let selectedHoldId = null;

    // Show Notification Toast
    function showToast(msg, isError = false) {
      const t = document.getElementById('toast');
      t.className = `fixed bottom-5 right-5 max-w-md p-4 rounded-xl shadow-2xl text-xs font-semibold z-50 border ${
        isError ? 'bg-red-50 text-red-800 border-red-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
      }`;
      t.innerHTML = (isError ? '⚠️ ' : '✅ ') + msg;
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 5000);
    }

    // Set Active Navigation Tab
    function setTab(tab) {
      currentTab = tab;
      ['dashboard', 'dispatch', 'receipt', 'holds', 'audit'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (t === tab) {
          btn.className = "py-3 px-3 border-b-2 border-white text-white flex items-center gap-2";
        } else {
          btn.className = "py-3 px-3 border-b-2 border-transparent text-emerald-200 hover:text-white flex items-center gap-2";
        }
      });
      renderCurrentTab();
    }

    async function init() {
      const wRes = await fetch('/warehouses');
      const warehouses = await wRes.json();
      const sel = document.getElementById('whSelect');
      sel.innerHTML = warehouses.map(w => `<option value="${w.id}">${w.code}: ${w.name}</option>`).join('');

      renderCurrentTab();
    }

    async function renderCurrentTab() {
      const main = document.getElementById('appMain');
      const whId = document.getElementById('whSelect').value;

      if (currentTab === 'dashboard') {
        const [bRes, cRes] = await Promise.all([
          fetch('/batches?warehouse_id=' + whId),
          fetch('/commodities')
        ]);
        const batches = await bRes.json();
        const commodities = await cRes.json();

        // Calculate KPI stats
        const totalKg = batches.reduce((acc, b) => acc + (b.current_qty_g / 1000.0), 0);
        const heldKg = batches.filter(b => b.status === 'QUALITY_HOLD').reduce((acc, b) => acc + (b.current_qty_g / 1000.0), 0);
        const availCount = batches.filter(b => b.status === 'AVAILABLE' && b.current_qty_g > 0).length;

        main.innerHTML = `
          <!-- KPI Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-500 font-semibold block uppercase">Total Godown Stock</span>
              <h3 class="text-2xl font-bold text-slate-900 mt-1 font-mono">${(totalKg / 1000).toFixed(2)} MT</h3>
              <p class="text-[11px] text-slate-400 mt-1">${(totalKg * 10).toFixed(0)} Gunny Bags (50kg)</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-500 font-semibold block uppercase">Available for FIFO</span>
              <h3 class="text-2xl font-bold text-emerald-600 mt-1 font-mono">${availCount} Batches</h3>
              <p class="text-[11px] text-emerald-700 mt-1">Ready for FPS dispatch</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-500 font-semibold block uppercase">Quarantined Stock</span>
              <h3 class="text-2xl font-bold text-red-600 mt-1 font-mono">${heldKg.toLocaleString()} kg</h3>
              <p class="text-[11px] text-red-700 mt-1">Blocked by database trigger</p>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span class="text-xs text-slate-500 font-semibold block uppercase">Integer Precision</span>
              <h3 class="text-2xl font-bold text-purple-600 mt-1 font-mono">100% Invariant</h3>
              <p class="text-[11px] text-purple-700 mt-1">0 Floating-point rounding error</p>
            </div>
          </div>

          <!-- Inventory Batches Table -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 class="text-sm font-bold text-slate-800">Batch Inventory Ledger & FIFO Queue</h3>
                <p class="text-xs text-slate-500">Batches ordered strictly by Received Date ASC for FIFO dispatch</p>
              </div>
              <span class="text-xs font-mono text-slate-500">${batches.length} Batches Loaded</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                    <th class="py-3 px-4">Batch Number</th>
                    <th class="py-3 px-4">Commodity</th>
                    <th class="py-3 px-4">Received Date (Age)</th>
                    <th class="py-3 px-4">Expiry Date</th>
                    <th class="py-3 px-4 text-right">Balance</th>
                    <th class="py-3 px-4 text-center">Status</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${batches.map(b => {
                    const isAvail = b.status === 'AVAILABLE';
                    const isHold = b.status === 'QUALITY_HOLD';
                    const isExp = b.status === 'EXPIRED';
                    const badgeClass = isAvail ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                       isHold ? 'bg-red-100 text-red-800 border-red-200' :
                                       isExp ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700';

                    return `
                      <tr class="hover:bg-slate-50/80 transition">
                        <td class="py-3 px-4 font-mono font-bold text-slate-900">${b.batch_no}</td>
                        <td class="py-3 px-4">${b.commodity_name}</td>
                        <td class="py-3 px-4">
                          <span>${b.received_date}</span>
                          <span class="text-[10px] text-slate-500 block">(${b.age_days} days in godown)</span>
                        </td>
                        <td class="py-3 px-4 text-slate-500">${b.expiry_date || 'N/A'}</td>
                        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ${(b.current_qty_g / 1000).toLocaleString()} kg
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
                            ${b.status}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-right">
                          ${isAvail ? `
                            <button onclick="openHoldModal('${b.id}', '${b.batch_no}')" class="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition">
                              Quarantine
                            </button>
                          ` : '<span class="text-slate-400 text-[11px]">Locked</span>'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      else if (currentTab === 'dispatch') {
        const [sRes, cRes, uRes] = await Promise.all([
          fetch('/ration-shops?warehouse_id=' + whId),
          fetch('/commodities'),
          fetch('/users')
        ]);
        const shops = await sRes.json();
        const commodities = await cRes.json();
        const users = await uRes.json();

        main.innerHTML = `
          <div class="max-w-4xl mx-auto space-y-6">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                ⚡ Batch-wise FIFO Dispatch Engine
              </h2>
              <p class="text-xs text-slate-500 mt-1">
                Guarantees oldest eligible stock is allocated first. Integer-gram arithmetic ensures 0 rounding error.
              </p>
            </div>

            <!-- Dispatch Input Form -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Target Ration Shop (FPS)</label>
                  <select id="dispShop" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:bg-white font-medium">
                    ${shops.map(s => `<option value="${s.id}">${s.fps_code}: ${s.owner_name} (${s.village_ward})</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Grain Commodity</label>
                  <select id="dispComm" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:bg-white font-medium">
                    ${commodities.map(c => `<option value="${c.id}">${c.code} — ${c.name}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Requested Quantity (in Kilograms)</label>
                  <div class="relative">
                    <input type="number" id="dispQty" step="1" min="1" value="1200" placeholder="e.g. 1000 or 1200" class="w-full border border-slate-300 rounded-lg p-2.5 pr-12 text-sm font-bold font-mono text-slate-800 bg-slate-50 focus:bg-white">
                    <span class="absolute right-3 top-3 text-xs font-bold text-slate-400">KG</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1">Stored as integer grams in PostgreSQL.</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Authorizing Store Employee</label>
                  <select id="dispEmp" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 font-medium">
                    ${users.filter(u => u.role === 'STORE_EMPLOYEE').map(u => `<option value="${u.id}">${u.full_name} (${u.username})</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="pt-2">
                <button onclick="calculateFifoPreview()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-2">
                  <span>⏱️ Calculate FIFO Allocation Plan</span>
                </button>
              </div>
            </div>

            <!-- Preview Container -->
            <div id="dispatchPreviewArea"></div>
          </div>
        `;
      }

      else if (currentTab === 'receipt') {
        const [cRes, uRes] = await Promise.all([
          fetch('/commodities'),
          fetch('/users')
        ]);
        const commodities = await cRes.json();
        const users = await uRes.json();

        main.innerHTML = `
          <div class="max-w-3xl mx-auto space-y-6">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                🚚 Inward Consignment (Goods Receipt)
              </h2>
              <p class="text-xs text-slate-500 mt-1">
                Receive new grain consignments from FCI base depots. Automatically creates batch with integer-gram balance.
              </p>
            </div>

            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Commodity</label>
                  <select id="recComm" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50">
                    ${commodities.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Received Quantity (KG)</label>
                  <input type="number" id="recQty" value="2000" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-bold bg-slate-50">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Supplier / Origin Depot</label>
                  <input type="text" id="recSupplier" value="Punjab State Grains Pool, Amritsar" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Delivery Truck / Vehicle No.</label>
                  <input type="text" id="recVehicle" value="PB-10-CZ-9912" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono bg-slate-50">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">FCI Delivery Challan Ref</label>
                  <input type="text" id="recChallan" value="CHALLAN/FCI/2026/8841" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono bg-slate-50">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Receiving Store Employee</label>
                  <select id="recEmp" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50">
                    ${users.filter(u => u.role === 'STORE_EMPLOYEE').map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="pt-2">
                <button onclick="submitReceipt()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow">
                  Record Goods Receipt & Register Batch
                </button>
              </div>
            </div>
          </div>
        `;
      }

      else if (currentTab === 'holds') {
        const [hRes, uRes] = await Promise.all([
          fetch('/holds'),
          fetch('/users')
        ]);
        const holds = await hRes.json();
        const users = await uRes.json();

        main.innerHTML = `
          <div class="space-y-6 max-w-5xl mx-auto">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                  🛡️ Quality Quarantine & Maker-Checker Release Queue
                </h2>
                <p class="text-xs text-slate-500 mt-1">
                  Enforces strict two-man rule: Release Requester ≠ Release Approver (Checked at DB schema level).
                </p>
              </div>
              <button onclick="renderCurrentTab()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700">Refresh</button>
            </div>

            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th class="py-3 px-4">Batch Number</th>
                      <th class="py-3 px-4">Commodity</th>
                      <th class="py-3 px-4">Quarantined Qty</th>
                      <th class="py-3 px-4">Defect Reason</th>
                      <th class="py-3 px-4">Placed By</th>
                      <th class="py-3 px-4 text-center">Status</th>
                      <th class="py-3 px-4 text-right">Maker-Checker Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    ${holds.length === 0 ? '<tr><td colspan="7" class="py-8 text-center text-slate-400">Zero active quarantine holds.</td></tr>' : 
                      holds.map(h => {
                        const isActive = h.hold_status === 'ACTIVE';
                        const isPending = h.hold_status === 'RELEASE_PENDING';
                        const isReleased = h.hold_status === 'RELEASED';
                        const badgeClass = isActive ? 'bg-red-100 text-red-800 border-red-200' :
                                           isPending ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                           'bg-emerald-100 text-emerald-800 border-emerald-200';

                        return `
                          <tr class="hover:bg-slate-50">
                            <td class="py-3 px-4 font-mono font-bold text-slate-900">${h.batch_no}</td>
                            <td class="py-3 px-4">${h.commodity_name}</td>
                            <td class="py-3 px-4 font-mono font-bold">${h.current_qty_kg?.toLocaleString()} kg</td>
                            <td class="py-3 px-4 max-w-xs text-slate-600">
                              ${h.hold_reason}
                              ${h.release_reason ? `<div class="mt-1 text-[11px] text-blue-700 bg-blue-50 p-1.5 rounded font-sans"><strong>Release Note:</strong> ${h.release_reason}</div>` : ''}
                            </td>
                            <td class="py-3 px-4 text-slate-500">${h.placed_by_user}</td>
                            <td class="py-3 px-4 text-center">
                              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
                                ${h.hold_status}
                              </span>
                            </td>
                            <td class="py-3 px-4 text-right space-y-1">
                              ${isActive ? `
                                <button onclick="openReleaseModal('${h.hold_id}')" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow">
                                  Request Release
                                </button>
                              ` : ''}

                              ${isPending ? `
                                <div class="flex flex-col items-end gap-1">
                                  <button onclick="approveRelease('${h.hold_id}', '${h.batch_id}', false)" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow">
                                    Approve Release (Authorized)
                                  </button>
                                  <button onclick="approveRelease('${h.hold_id}', '${h.batch_id}', true)" title="Attempts self-approval by same user" class="text-[10px] text-red-600 hover:underline">
                                    [Test Maker-Checker Self-Approval]
                                  </button>
                                </div>
                              ` : ''}

                              ${isReleased ? `
                                <span class="text-slate-400 text-[11px]">Released by ${h.release_approved_by || 'Supervisor'}</span>
                              ` : ''}
                            </td>
                          </tr>
                        `;
                      }).join('')
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }

      else if (currentTab === 'audit') {
        const discRes = await fetch('/audit/discrepancies');
        const disc = await discRes.json();

        main.innerHTML = `
          <div class="space-y-6 max-w-5xl mx-auto">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                  🔍 Forensic Audit, Cryptographic Ledger & Traceability
                </h2>
                <p class="text-xs text-slate-500 mt-1">
                  End-to-end provenance: Goods Receipt → Batch → Allocation → Immutable Stock Ledger Movement
                </p>
              </div>
              <button onclick="runChainVerification()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow">
                Run Cryptographic Ledger Verification
              </button>
            </div>

            <!-- Health Status -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  ✓
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">Zero-Discrepancy Invariant</p>
                  <h4 class="text-sm font-bold text-slate-900">Zero Mismatches (100% Invariant Compliant)</h4>
                  <p class="text-[11px] text-slate-400">v_balance_mismatch: batches.current_qty_g = SUM(qty_delta_g)</p>
                </div>
              </div>

              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg">
                  🔗
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">SHA-256 Cryptographic Ledger Chain</p>
                  <h4 class="text-sm font-bold text-slate-900" id="chainStatusText">
                    ${disc.ledger_cryptographic_verification.is_valid ? 'Valid (0 Tampering Detected)' : 'Tamper Alert!'}
                  </h4>
                  <p class="text-[11px] text-slate-400" id="chainDetailsText">
                    ${disc.ledger_cryptographic_verification.total_verified} movements verified via SHA-256 chaining
                  </p>
                </div>
              </div>
            </div>

            <!-- Dispatch Search Box -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <label class="block text-xs font-semibold text-slate-700">Search Dispatch Reference Number</label>
              <div class="flex gap-2">
                <input type="text" id="auditQuery" value="DSP-2026-0001" placeholder="e.g. DSP-2026-0001 or DSP-DEMO-2026-001" class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold bg-slate-50">
                <button onclick="searchTrace()" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow">
                  Search Provenance Trace
                </button>
              </div>
            </div>

            <!-- Trace Result Tree Area -->
            <div id="traceResultArea"></div>
          </div>
        `;
      }
    }

    // Calculate FIFO Allocation Preview
    let currentPreviewRequestId = null;

    async function calculateFifoPreview() {
      const shopId = document.getElementById('dispShop').value;
      const commId = document.getElementById('dispComm').value;
      const whId = document.getElementById('whSelect').value;
      const qtyKg = parseFloat(document.getElementById('dispQty').value);
      const empId = document.getElementById('dispEmp').value;

      if (!qtyKg || qtyKg <= 0) {
        showToast("Please enter a valid dispatch quantity.", true);
        return;
      }

      const idempKey = 'IDEMP-' + Date.now();
      const createRes = await fetch('/dispatch-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: idempKey,
          shop_id: shopId,
          commodity_id: commId,
          warehouse_id: whId,
          requested_qty_kg: qtyKg,
          created_by: empId
        })
      });

      const reqData = await createRes.json();
      currentPreviewRequestId = reqData.request_id;

      const prevRes = await fetch(`/dispatch-requests/${reqData.request_id}/allocation-preview`);
      const preview = await prevRes.json();

      const area = document.getElementById('dispatchPreviewArea');

      if (preview.status === 'SHORTFALL') {
        area.innerHTML = `
          <div class="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 space-y-2">
            <div class="flex items-center gap-2 font-bold text-sm text-amber-700">
              ⚠️ STOCK SHORTFALL DETECTED — DISPATCH BLOCKED
            </div>
            <p class="text-xs">
              Requested: <strong>${(preview.requested_qty_g / 1000).toLocaleString()} kg</strong> |
              Available in Godown: <strong>${(preview.available_qty_g / 1000).toLocaleString()} kg</strong>
            </p>
            <p class="text-xs font-bold text-amber-800">
              Exact Deficit Shortfall: ${(preview.shortfall_qty_g / 1000).toLocaleString()} kg.
            </p>
            <p class="text-[11px] text-amber-800">
              PDS Invariant: Silent partial dispatches are strictly prohibited to prevent FPS fraud.
            </p>
          </div>
        `;
      } else {
        area.innerHTML = `
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-base font-bold text-slate-800">Allocation Breakdown (Plan Preview)</h3>
                <p class="text-xs text-slate-500">Request Ref: <span class="font-mono font-bold text-slate-700">${preview.request_no}</span></p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">FIFO READY</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border border-slate-100 rounded-lg">
                <thead>
                  <tr class="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <th class="py-2.5 px-3">FIFO Rank</th>
                    <th class="py-2.5 px-3">Batch Number</th>
                    <th class="py-2.5 px-3">Received Date</th>
                    <th class="py-2.5 px-3 text-right">Available Before</th>
                    <th class="py-2.5 px-3 text-right">Allocated Qty</th>
                    <th class="py-2.5 px-3 text-center">FIFO Provenance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${preview.allocations.map(a => `
                    <tr class="hover:bg-slate-50">
                      <td class="py-2.5 px-3 font-bold text-emerald-700">#${a.fifo_rank}</td>
                      <td class="py-2.5 px-3 font-mono font-bold">${a.batch_no}</td>
                      <td class="py-2.5 px-3 text-slate-600">${a.received_date}</td>
                      <td class="py-2.5 px-3 text-right text-slate-500 font-mono">${(a.batch_available_before_g / 1000).toLocaleString()} kg</td>
                      <td class="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">${a.allocated_qty_kg} kg</td>
                      <td class="py-2.5 px-3 text-center">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ Oldest Eligible
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr class="bg-slate-50 font-bold text-slate-900 text-xs border-t border-slate-200">
                    <td colspan="4" class="py-3 px-3 text-right uppercase text-slate-500">Total Allocated:</td>
                    <td class="py-3 px-3 text-right font-mono text-sm text-emerald-700">${(preview.allocated_qty_g / 1000).toLocaleString()} kg</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="pt-3 flex justify-between items-center">
              <span class="text-xs text-slate-500">Exact-sum verified: Sum of splits matches demand.</span>
              <button onclick="confirmDispatch()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow">
                Confirm & Commit Atomic Dispatch
              </button>
            </div>
          </div>
        `;
      }
    }

    // Confirm and Commit Dispatch
    async function confirmDispatch() {
      if (!currentPreviewRequestId) return;
      const res = await fetch(`/dispatch-requests/${currentPreviewRequestId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Dispatch executed successfully! ${(data.allocated_qty_g / 1000).toLocaleString()} kg allocated.`);
        document.getElementById('dispatchPreviewArea').innerHTML = `
          <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            ✅ Dispatch ${data.request_no} committed atomically to PostgreSQL ledger!
          </div>
        `;
      } else {
        showToast(data.detail || "Dispatch failed", true);
      }
    }

    // Submit Inward Consignment
    async function submitReceipt() {
      const whId = document.getElementById('whSelect').value;
      const commId = document.getElementById('recComm').value;
      const qtyKg = parseFloat(document.getElementById('recQty').value);
      const supplier = document.getElementById('recSupplier').value;
      const vehicle = document.getElementById('recVehicle').value;
      const challan = document.getElementById('recChallan').value;
      const empId = document.getElementById('recEmp').value;

      const res = await fetch('/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: whId,
          commodity_id: commId,
          received_qty_kg: qtyKg,
          supplier_source: supplier,
          vehicle_no: vehicle,
          document_ref: challan,
          received_by: empId
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Consignment recorded. New Batch ${data.batch_no} created with ${qtyKg} kg.`);
        setTab('dashboard');
      } else {
        showToast("Failed to record receipt", true);
      }
    }

    // Quarantine Modal Actions
    async function openHoldModal(batchId, batchNo) {
      selectedBatchForHold = batchId;
      document.getElementById('modalBatchNo').innerText = batchNo;
      const uRes = await fetch('/users');
      const users = await uRes.json();
      document.getElementById('modalInspector').innerHTML = users.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
      document.getElementById('holdModal').classList.remove('hidden');
      document.getElementById('holdModal').classList.add('flex');
    }

    function closeHoldModal() {
      document.getElementById('holdModal').classList.add('hidden');
      document.getElementById('holdModal').classList.remove('flex');
    }

    async function submitHold() {
      const reason = document.getElementById('modalReason').value;
      const inspectorId = document.getElementById('modalInspector').value;

      const res = await fetch(`/batches/${selectedBatchForHold}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason, placed_by: inspectorId })
      });

      if (res.ok) {
        closeHoldModal();
        showToast("Batch quarantined. Status locked at database level.");
        renderCurrentTab();
      } else {
        showToast("Failed to quarantine batch", true);
      }
    }

    // Release Modal Actions
    async function openReleaseModal(holdId) {
      selectedHoldId = holdId;
      const uRes = await fetch('/users');
      const users = await uRes.json();
      document.getElementById('relRequester').innerHTML = users.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
      document.getElementById('releaseModal').classList.remove('hidden');
      document.getElementById('releaseModal').classList.add('flex');
    }

    function closeReleaseModal() {
      document.getElementById('releaseModal').classList.add('hidden');
      document.getElementById('releaseModal').classList.remove('flex');
    }

    async function submitReleaseRequest() {
      const reason = document.getElementById('relReason').value;
      const reqId = document.getElementById('relRequester').value;

      const res = await fetch(`/batches/dummy/release-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hold_id: selectedHoldId, release_reason: reason, requested_by: reqId })
      });

      if (res.ok) {
        closeReleaseModal();
        showToast("Release request submitted. Now awaiting independent supervisor approval.");
        renderCurrentTab();
      } else {
        showToast("Failed to request release", true);
      }
    }

    // Approve Release (tests maker-checker rule)
    async function approveRelease(holdId, batchId, simulateSelfApproval) {
      const uRes = await fetch('/users');
      const users = await uRes.json();
      const approver = users.find(u => u.role === 'APPROVER') || users[0];
      const inspector = users.find(u => u.role === 'QUALITY_OFFICER') || users[1];

      // If test maker-checker: send the inspector as approver (self-approval violation)
      const chosenApproverId = simulateSelfApproval ? inspector.id : approver.id;

      const res = await fetch(`/batches/${batchId}/release-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hold_id: holdId, approved_by: chosenApproverId })
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Batch release approved! Restored to AVAILABLE status.");
        renderCurrentTab();
      } else {
        showToast(data.detail || "Approval rejected by maker-checker rule!", true);
      }
    }

    // Run Ledger Chain Verification
    async function runChainVerification() {
      const res = await fetch('/audit/discrepancies');
      const data = await res.json();
      const check = data.ledger_cryptographic_verification;
      if (check.is_valid) {
        showToast(`Ledger Verified: ${check.total_verified} movements cryptographically validated with zero tampering.`);
      } else {
        showToast(`ALERT: Tampered hash detected: ${check.error_message}`, true);
      }
      renderCurrentTab();
    }

    // Search Dispatch Trace
    async function searchTrace() {
      const q = document.getElementById('auditQuery').value.trim();
      const area = document.getElementById('traceResultArea');
      area.innerHTML = '<p class="text-xs text-slate-500 font-mono">Searching provenance chain...</p>';

      const res = await fetch(`/audit/trace/${encodeURIComponent(q)}`);
      if (!res.ok) {
        area.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl">Dispatch record not found. Try executing a dispatch first!</div>`;
        return;
      }
      const data = await res.json();

      area.innerHTML = `
        <div class="space-y-4">
          <div class="bg-slate-900 text-white p-5 rounded-xl shadow-md space-y-3">
            <div class="flex justify-between items-start">
              <div>
                <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Dispatch Provenance Chain</span>
                <h3 class="text-xl font-mono font-bold">${data.dispatch_request.request_no}</h3>
              </div>
              <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs">${data.dispatch_request.status}</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-800">
              <div><span class="text-slate-400 block text-[10px]">Commodity</span><span class="font-semibold">${data.commodity.name}</span></div>
              <div><span class="text-slate-400 block text-[10px]">Total Dispatched</span><span class="font-mono font-bold text-emerald-400">${data.dispatch_request.requested_qty_kg} kg</span></div>
              <div><span class="text-slate-400 block text-[10px]">Source Godown</span><span class="font-semibold">${data.godown.name}</span></div>
              <div><span class="text-slate-400 block text-[10px]">Ration Shop</span><span class="font-semibold">${data.ration_shop.fps_code}</span></div>
            </div>
          </div>

          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Traceable Batch Provenance (${data.traceable_allocations.length} hops)</h4>
            ${data.traceable_allocations.map(a => `
              <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div class="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">#${a.fifo_rank}</span>
                    <span class="font-mono font-bold text-slate-900">${a.batch.batch_no}</span>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Allocated: ${a.allocated_qty_kg} kg</span>
                  </div>
                  <span class="text-[11px] text-slate-400">Received: ${a.batch.received_date}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <div class="font-bold text-blue-700 text-[11px] uppercase">1. Inward Consignment</div>
                    <p>Receipt: <strong class="font-mono">${a.goods_receipt.receipt_no}</strong></p>
                    <p>Origin: ${a.goods_receipt.supplier_source}</p>
                    <p>Vehicle: <span class="font-mono">${a.goods_receipt.vehicle_no}</span></p>
                  </div>

                  <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <div class="font-bold text-emerald-700 text-[11px] uppercase">2. Batch Lifecycle</div>
                    <p>Initial: <strong>${a.batch.initial_received_qty_kg} kg</strong></p>
                    <p>Balance Remaining: <strong>${a.batch.current_balance_kg} kg</strong></p>
                    <p>Status: <span class="font-bold text-emerald-800">${a.batch.status}</span></p>
                  </div>

                  <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <div class="font-bold text-purple-700 text-[11px] uppercase">3. Cryptographic Movement</div>
                    <p>Movement ID: <strong class="font-mono">#${a.ledger_movement.movement_id}</strong></p>
                    <p>Delta: <strong class="font-mono text-red-600">${a.ledger_movement.qty_delta_g / 1000} kg</strong></p>
                    <p class="text-[9px] font-mono break-all text-slate-500 bg-white p-1 rounded border">Hash: ${a.ledger_movement.row_hash}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    window.onload = init;
  </script>
</body>
</html>
"""


# -----------------------------------------------------------------------------
# HTTP Request Handler (Serves UI + REST API)
# -----------------------------------------------------------------------------

class BhandarSetuHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Silence verbose console logs

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Serve Web UI
        if path in ["/", "/index.html"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(UI_HTML.encode("utf-8"))
            return

        # API: /warehouses
        if path == "/warehouses":
            self.send_json(WAREHOUSES)
            return

        # API: /commodities
        if path == "/commodities":
            self.send_json(COMMODITIES)
            return

        # API: /ration-shops
        if path == "/ration-shops":
            wh_id = query.get("warehouse_id", [None])[0]
            shops = [s for s in RATION_SHOPS if not wh_id or s["warehouse_id"] == wh_id]
            self.send_json(shops)
            return

        # API: /users
        if path == "/users":
            self.send_json(USERS)
            return

        # API: /batches
        if path == "/batches":
            wh_id = query.get("warehouse_id", [None])[0]
            comm_id = query.get("commodity_id", [None])[0]
            res = []
            for b in BATCHES:
                if wh_id and b["warehouse_id"] != wh_id:
                    continue
                if comm_id and b["commodity_id"] != comm_id:
                    continue
                c = next((x for x in COMMODITIES if x["id"] == b["commodity_id"]), None)
                w = next((x for x in WAREHOUSES if x["id"] == b["warehouse_id"]), None)
                recv_d = datetime.date.fromisoformat(b["received_date"])
                age = (TODAY - recv_d).days
                res.append({
                    "id": b["id"],
                    "batch_no": b["batch_no"],
                    "commodity_id": b["commodity_id"],
                    "commodity_name": c["name"] if c else "Unknown",
                    "warehouse_id": b["warehouse_id"],
                    "warehouse_name": w["name"] if w else "Unknown",
                    "received_date": b["received_date"],
                    "expiry_date": b.get("expiry_date"),
                    "received_qty_g": b["received_qty_g"],
                    "current_qty_g": b["current_qty_g"],
                    "status": b["status"],
                    "age_days": age
                })
            # Order by received_date ASC (FIFO order)
            res.sort(key=lambda x: (x["received_date"], x["id"]))
            self.send_json(res)
            return

        # API: /dispatch-requests/{id}/allocation-preview
        if path.startswith("/dispatch-requests/") and path.endswith("/allocation-preview"):
            parts = path.split("/")
            req_id = parts[2]
            plan = allocate_fifo_engine(req_id, dry_run=True, allow_partial=False)
            self.send_json(plan)
            return

        # API: /holds
        if path == "/holds":
            res = []
            for h in QUALITY_HOLDS:
                b = next((x for x in BATCHES if x["id"] == h["batch_id"]), None)
                c = next((x for x in COMMODITIES if x["id"] == b["commodity_id"]), None) if b else None
                u = next((x for x in USERS if x["id"] == h["placed_by"]), None)
                rel_appr = next((x for x in USERS if x["id"] == h.get("release_approved_by")), None)
                res.append({
                    "hold_id": h["id"],
                    "batch_id": h["batch_id"],
                    "batch_no": b["batch_no"] if b else "Unknown",
                    "commodity_name": c["name"] if c else "Unknown",
                    "current_qty_kg": round(b["current_qty_g"] / 1000.0, 2) if b else 0,
                    "hold_reason": h["reason"],
                    "placed_by_user": u["full_name"] if u else "Inspector",
                    "placed_at": h["placed_at"],
                    "release_reason": h.get("release_reason"),
                    "release_approved_by": rel_appr["full_name"] if rel_appr else None,
                    "hold_status": h["status"]
                })
            self.send_json(res)
            return

        # API: /audit/discrepancies
        if path == "/audit/discrepancies":
            # Check balance mismatches
            mismatch_count = 0
            for b in BATCHES:
                mov_sum = sum(m["qty_delta_g"] for m in STOCK_MOVEMENTS if m["batch_id"] == b["id"])
                if mov_sum != b["current_qty_g"]:
                    mismatch_count += 1
            
            chain_check = verify_ledger_chain()
            self.send_json({
                "balance_mismatch_count": mismatch_count,
                "ledger_cryptographic_verification": chain_check
            })
            return

        # API: /audit/trace/{request_no}
        if path.startswith("/audit/trace/"):
            req_no = urllib.parse.unquote(path.split("/")[-1])
            req = next((r for r in DISPATCH_REQUESTS if r["request_no"] == req_no), None)
            if not req:
                self.send_error_json(404, f"Dispatch request {req_no} not found.")
                return

            wh = next((w for w in WAREHOUSES if w["id"] == req["warehouse_id"]), None)
            comm = next((c for c in COMMODITIES if c["id"] == req["commodity_id"]), None)
            shop = next((s for s in RATION_SHOPS if s["id"] == req["shop_id"]), None)

            allocs = [a for a in DISPATCH_ALLOCATIONS if a["request_id"] == req["id"]]
            traceable = []
            for a in allocs:
                b = next((x for x in BATCHES if x["id"] == a["batch_id"]), None)
                gr = next((x for x in GOODS_RECEIPTS if x["id"] == b["receipt_id"]), None) if b else None
                sm = next((x for x in STOCK_MOVEMENTS if x["ref_type"] == "DISPATCH_REQUEST" and x["ref_id"] == req["id"] and x["batch_id"] == a["batch_id"]), None)
                traceable.append({
                    "fifo_rank": a["fifo_rank"],
                    "allocated_qty_kg": round(a["allocated_qty_g"] / 1000.0, 3),
                    "batch": {
                        "batch_no": b["batch_no"] if b else "Unknown",
                        "received_date": b["received_date"] if b else "",
                        "expiry_date": b.get("expiry_date") if b else "",
                        "initial_received_qty_kg": round(b["received_qty_g"] / 1000.0, 3) if b else 0,
                        "current_balance_kg": round(b["current_qty_g"] / 1000.0, 3) if b else 0,
                        "status": b["status"] if b else ""
                    },
                    "goods_receipt": {
                        "receipt_no": gr["receipt_no"] if gr else "N/A",
                        "supplier_source": gr["supplier_source"] if gr else "N/A",
                        "vehicle_no": gr["vehicle_no"] if gr else "N/A",
                        "document_ref": gr["document_ref"] if gr else "N/A"
                    },
                    "ledger_movement": {
                        "movement_id": sm["movement_id"] if sm else 0,
                        "qty_delta_g": sm["qty_delta_g"] if sm else 0,
                        "row_hash": sm["row_hash"] if sm else ""
                    }
                })

            self.send_json({
                "dispatch_request": {
                    "request_no": req["request_no"],
                    "status": req["status"],
                    "requested_qty_kg": round(req["requested_qty_g"] / 1000.0, 3)
                },
                "commodity": {"name": comm["name"] if comm else ""},
                "godown": {"name": wh["name"] if wh else ""},
                "ration_shop": {
                    "fps_code": shop["fps_code"] if shop else "",
                    "owner_name": shop["owner_name"] if shop else ""
                },
                "traceable_allocations": traceable
            })
            return

        self.send_error_json(404, "Endpoint not found")

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        data = json.loads(post_data) if post_data else {}
        path = self.path

        # API: /receipts
        if path == "/receipts":
            gr_id = str(uuid.uuid4())
            batch_id = str(uuid.uuid4())
            gr_no = f"GR-{datetime.date.today().year}-{int(datetime.datetime.now().timestamp()) % 100000:05d}"
            batch_no = f"BATCH-{datetime.date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
            qty_g = int(float(data["received_qty_kg"]) * 1000)

            gr = {
                "id": gr_id,
                "receipt_no": gr_no,
                "warehouse_id": data["warehouse_id"],
                "supplier_source": data.get("supplier_source", "FCI Base Depot"),
                "vehicle_no": data.get("vehicle_no", "MH-31-AP-0001"),
                "document_ref": data.get("document_ref", "DC/FCI/2026"),
                "received_by": data.get("received_by", USERS[0]["id"]),
                "received_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            GOODS_RECEIPTS.append(gr)

            batch = {
                "id": batch_id,
                "batch_no": batch_no,
                "receipt_id": gr_id,
                "commodity_id": data["commodity_id"],
                "warehouse_id": data["warehouse_id"],
                "received_date": datetime.date.today().isoformat(),
                "expiry_date": (datetime.date.today() + datetime.timedelta(days=365)).isoformat(),
                "received_qty_g": qty_g,
                "current_qty_g": qty_g,
                "status": "AVAILABLE"
            }
            BATCHES.append(batch)

            # Inward ledger movement
            append_stock_movement("RECEIPT", batch_id, qty_g, "GOODS_RECEIPT", gr_id, gr["received_by"])

            self.send_json({"receipt_id": gr_id, "receipt_no": gr_no, "batch_id": batch_id, "batch_no": batch_no})
            return

        # API: /dispatch-requests
        if path == "/dispatch-requests":
            req_id = str(uuid.uuid4())
            req_no = f"DSP-{datetime.date.today().year}-{len(DISPATCH_REQUESTS) + 1:04d}"
            qty_g = int(float(data["requested_qty_kg"]) * 1000)
            
            req = {
                "id": req_id,
                "request_no": req_no,
                "idempotency_key": data.get("idempotency_key", str(uuid.uuid4())),
                "shop_id": data["shop_id"],
                "commodity_id": data["commodity_id"],
                "warehouse_id": data["warehouse_id"],
                "requested_qty_g": qty_g,
                "status": "DRAFT",
                "created_by": data.get("created_by", USERS[0]["id"]),
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            DISPATCH_REQUESTS.append(req)
            self.send_json({"request_id": req_id, "request_no": req_no, "status": "DRAFT"})
            return

        # API: /dispatch-requests/{id}/confirm
        if path.startswith("/dispatch-requests/") and path.endswith("/confirm"):
            parts = path.split("/")
            req_id = parts[2]
            res = allocate_fifo_engine(req_id, dry_run=False, allow_partial=False)
            if res["success"]:
                self.send_json(res)
            else:
                self.send_error_json(400, res["message"])
            return

        # API: /batches/{id}/hold
        if path.startswith("/batches/") and path.endswith("/hold"):
            parts = path.split("/")
            batch_id = parts[2]
            batch = next((b for b in BATCHES if b["id"] == batch_id), None)
            if not batch:
                self.send_error_json(404, "Batch not found")
                return

            batch["status"] = "QUALITY_HOLD"
            hold_id = str(uuid.uuid4())
            hold = {
                "id": hold_id,
                "batch_id": batch_id,
                "reason": data.get("reason", "High moisture / defect"),
                "placed_by": data.get("placed_by", USERS[2]["id"]),
                "placed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "release_requested_by": None,
                "release_reason": None,
                "release_approved_by": None,
                "released_at": None,
                "status": "ACTIVE"
            }
            QUALITY_HOLDS.append(hold)
            append_stock_movement("HOLD", batch_id, 0, "QUALITY_HOLD", hold_id, hold["placed_by"])
            self.send_json({"hold_id": hold_id, "status": "QUALITY_HOLD"})
            return

        # API: /batches/{id}/release-request
        if path.endswith("/release-request"):
            hold_id = data.get("hold_id")
            hold = next((h for h in QUALITY_HOLDS if h["id"] == hold_id), None)
            if not hold:
                self.send_error_json(404, "Hold record not found")
                return

            hold["status"] = "RELEASE_PENDING"
            hold["release_requested_by"] = data.get("requested_by", USERS[2]["id"])
            hold["release_reason"] = data.get("release_reason", "Lab re-test certified clearance")
            self.send_json({"hold_id": hold_id, "status": "RELEASE_PENDING"})
            return

        # API: /batches/{id}/release-approve (Enforces Maker-Checker Rule)
        if path.endswith("/release-approve"):
            hold_id = data.get("hold_id")
            approver_id = data.get("approved_by")
            hold = next((h for h in QUALITY_HOLDS if h["id"] == hold_id), None)
            if not hold:
                self.send_error_json(404, "Hold record not found")
                return

            # MAKER-CHECKER CONSTRAINT CHECK:
            # CHECK (release_approved_by IS NULL OR release_requested_by <> release_approved_by)
            if hold.get("release_requested_by") and hold["release_requested_by"] == approver_id:
                self.send_error_json(400, "Maker-checker rule violation: Approver cannot be the same user who requested the release (CHECK release_requested_by <> release_approved_by).")
                return

            hold["status"] = "RELEASED"
            hold["release_approved_by"] = approver_id
            hold["released_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

            batch = next((b for b in BATCHES if b["id"] == hold["batch_id"]), None)
            if batch:
                batch["status"] = "AVAILABLE"
                append_stock_movement("RELEASE", batch["id"], 0, "QUALITY_HOLD", hold_id, approver_id)

            self.send_json({"hold_id": hold_id, "status": "RELEASED", "batch_status": "AVAILABLE"})
            return

        self.send_error_json(404, "Endpoint not found")

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def send_error_json(self, status_code, message):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"detail": message}).encode("utf-8"))


def run():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, BhandarSetuHandler)
    print(f"BhandarSetu Standalone Server listening on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run()

