# BhandarSetu (भंडार सेतु)

> **Batch-wise FIFO Stock Allocation & Traceable Dispatch Engine for Government PDS Godowns**  
> *Context: Targeted Public Distribution System (iPDS) Warehousing & Fair Price Shop (FPS) Supply Chain*

---

## 1. System Overview

**BhandarSetu** addresses three chronic vulnerabilities in government grain warehousing:
1. **FIFO Inversion / Grain Rot:** Storekeepers dispatching newer, easily accessible stacks while older grain rots at the bottom.
2. **Rounding & Calculation Drift:** Fractional weight discrepancies across gunny bags and dispatches causing digital vs. physical inventory mismatch.
3. **Quarantine Breaches:** Grain batches flagged for high moisture, pest infestation, or poor milling quality inadvertently dispatched due to weak app-level checks.

### Core Architectural Pillars
- **Strict Integer-Gram Arithmetic:** All quantities are stored as `BIGINT` integer grams (`qty_g`). $1\text{ kg} = 1{,}000\text{ g}$. Absolute protection against floating-point drift.
- **Database-Enforced Business Invariants:** Quality holds, maker-checker authorization (`requested_by <> approved_by`), and immutable ledger protections are enforced directly in **PostgreSQL 16** via triggers and constraints. The backend API is purely a thin caller.
- **Atomic Concurrency Engine:** `pg_advisory_xact_lock` scoped to `(warehouse_id, commodity_id)` combined with `SELECT ... FOR UPDATE` eliminates race conditions and negative balances during peak parallel lifting surges.
- **Tamper-Evident Cryptographic Ledger:** SHA-256 hash-chained `stock_movements` table with a stored verification function `verify_ledger_chain()`.

---

## 2. Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│             Web UI (React 18 + Tailwind CSS)           │
│    Dashboard • Dispatcher • Allocation • Holds • Audit  │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON
┌───────────────────────────▼────────────────────────────┐
│            Thin Backend API (FastAPI + asyncpg)        │
│          Stateless proxy calling PL/pgSQL routines     │
└───────────────────────────┬────────────────────────────┘
                            │ Connection Pool (asyncpg)
┌───────────────────────────▼────────────────────────────┐
│               PostgreSQL 16 Database                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ PL/pgSQL Engine: allocate_fifo, validate_override│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Triggers: Immutability, Balance Guard, Hold Stop │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Append-Only Ledger: stock_movements (SHA-256)    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Partial Covering Index: idx_batches_fifo (<5ms)  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Database:** PostgreSQL 16 (PL/pgSQL stored procedures, declarative monthly partitioning, BRIN indexes, HOT fillfactor = 85).
- **Backend API:** Python 3.11 FastAPI with asyncpg high-performance async driver.
- **Frontend UI:** React 18, Vite, Tailwind CSS, Lucide icons.
- **Deployment:** Docker Compose (single command startup).

---

## 3. Quick Start (One Command Setup)

### Prerequisites
- Docker & Docker Compose installed.

### Launch BhandarSetu Stack
```bash
docker compose up -d --build
```

This automatically:
1. Provisions PostgreSQL 16 on port `5432`.
2. Applies all 4 schema migrations (`001_initial_schema.sql` through `004_views_and_audit.sql`).
3. Seeds 2 godowns, 4 commodities, 20 ration shops, and 30 realistic grain batches.
4. Starts the FastAPI backend on port `8000` (docs at `http://localhost:8000/docs`).
5. Serves the web dashboard on port `3000` (`http://localhost:3000`).

### Zero-Setup Instant Browser Demo (No Docker or Installation Required)
If running on a machine without Docker Desktop or local PostgreSQL:
1. Simply double-click or open **[`index.html`](file:///Users/aayushtripathi/Downloads/vortex/index.html)** directly in Google Chrome or any browser.
2. It runs completely offline with an embedded client-side database, deterministic FIFO/FEFO allocation engine, SHA-256 hash chaining, quality hold triggers, and maker-checker approval workflows.

---

## 4. Running Automated Tests

### 1. SQL Invariant & Engine Test Suite
Executes all database integrity tests inside PostgreSQL:
```bash
docker compose exec postgres bash /db/tests/run_tests.sh
```
**Tests Covered:**
- `01_invariants_and_constraints.sql`: Non-negative balances, direct balance update blocked, ledger immutability (`UPDATE`/`DELETE` prohibited), `v_balance_mismatch` returns 0.
- `02_fifo_allocation.sql`: Multi-batch split correctness, exact-sum property, expired batch skipped, shortfall protection, idempotent retry.
- `03_hold_and_release.sql`: Quality hold hard stop trigger, release workflow, maker-checker rule.
- `04_fifo_exception_maker_checker.sql`: Older batch deviation warning, `CHECK (requested_by <> approved_by)` enforcement.
- `05_ledger_tamper_detection.sql`: SHA-256 hash chaining verification and tamper detection.

### 2. Concurrency Stress Test (50 Parallel Dispatches)
Verifies zero negative balances, zero double allocations, and strict stock conservation under simultaneous load:
```bash
docker compose exec api python /app/../db/tests/concurrency_test.py
```

### 3. Query Plan & 1M Batches Benchmark
Benchmarks the FIFO hot-path index scan on 100,000+ batches:
```bash
docker compose exec postgres psql -U pds_admin -d bhandarsetu -f /db/tests/benchmark_1m.sql
```
*(Demonstrates index scan execution time < 5ms with zero heap-fetch bloat).*

---

## 5. Scripted Demonstration Walkthrough

You can execute the automated demo script directly via psql:
```bash
docker compose exec postgres psql -U pds_admin -d bhandarsetu -f /db/demo.sql
```

Alternatively, follow the interactive UI walkthrough at `http://localhost:3000`:

### Scenario 1: Stock Allocation & Consignment Intake
1. Open the **Stock Allocation** tab.
2. Select commodity **Wheat Grade A**, quantity **2,000 kg**, vehicle `MH-31-AP-9900`.
3. Click **Record Goods Receipt**.
4. *Observed Result:* A new batch `BATCH-YYYYMMDD-XXXX` is registered. A `RECEIPT` movement is written to the ledger, and the batch balance is initialized via trigger.

### Scenario 2: Multi-Batch FIFO Dispatch
1. Open the **FIFO Dispatch Engine** tab.
2. Select Ration Shop **FPS-NGP-101 (Ganesh Kirana Bhandar)**.
3. Select Commodity **Wheat Grade A** and enter quantity **1,200 kg**.
4. Click **Calculate FIFO Allocation**.
5. *Observed Result:* The system automatically plans a multi-batch split:
   - `BATCH-WHT-2026-001` (110 days old): **400 kg** (Batch becomes EXHAUSTED).
   - `BATCH-WHT-2026-002` (80 days old): **600 kg** (Batch becomes EXHAUSTED).
   - `BATCH-WHT-2026-003` (50 days old): **200 kg** (Balance remaining: 1,000 kg).
   - Total Allocated: **1,200 kg**. Zero rounding drift.
6. Click **Confirm & Commit Dispatch** to execute atomically.

### Scenario 3: Exceeding Stock & Shortfall Alert
1. On the **FIFO Dispatch Engine** tab, enter **50,000 kg** for Wheat.
2. Click **Calculate FIFO Allocation**.
3. *Observed Result:* A prominent amber **Stock Shortfall Detected** banner appears showing the exact deficit. Zero partial allocations are committed.

### Scenario 4: Quality Quarantine Hard Lock
1. Open the **Godown Inventory & Ageing** tab.
2. Find any active batch and click **Quarantine**.
3. Enter reason: `"Moisture content 14.8% exceeds FSSAI limits"`.
4. *Observed Result:* Batch status switches to `QUALITY_HOLD`. Any attempt to allocate or dispatch this batch raises a PostgreSQL `restrict_violation` exception.

### Scenario 5: FIFO Deviation & Maker-Checker Exception
1. An employee attempts to bypass an older batch to dispatch newer stock.
2. The system flags `FIFO_VIOLATION_WITHOUT_EXCEPTION`.
3. An exception request is logged.
4. If the requesting employee attempts to approve their own request, PostgreSQL rejects it with a `check_violation` (`requested_by <> approved_by`).
5. An authorized supervisor approves the exception, unblocking the dispatch.

### Scenario 6: Forensic Audit & Cryptographic Ledger Verification
1. Open the **Forensic Audit Trace** tab.
2. Enter dispatch reference (e.g. `DSP-DEMO-2026-001`) and click **Search Trace**.
3. *Observed Result:* Full visual tree displays:
   - Inward Goods Receipt (Supplier origin, vehicle, delivery challan).
   - Batch Provenance (Date received, shelf-life, balance).
   - Cryptographic Stock Movement (Movement ID, delta, and SHA-256 `row_hash`).
4. Click **Run Cryptographic Ledger Verification**:
   - The database traverses all movements and confirms: `Ledger verified intact: XX transactions cryptographically validated with zero tampering.`

### Scenario 7: Emergency Quality Recall & Downstream Ration Shop Forward Trace
1. Open the **Quality Quarantine** or **Forensic Audit** tab.
2. Under **Emergency Batch Recall**, select suspect batch `BATCH-WHT-2026-001`.
3. Click **Initiate Recall**.
4. *Observed Result:* Remaining godown balance is immediately locked as `QUARANTINED_RECALL`. System automatically generates a downstream forward distribution trace listing all FPS ration shops that received dispatches from this tainted batch.

### Scenario 8: Predictive Expiry Risk & Transit Loss Reconciliation
1. Open the **Godown Inventory & Ageing** tab.
2. *Observed Result:* Predictive Expiry Banner alerts storekeepers of batches nearing expiration within 45 days, prioritizing them for FEFO dispatch.
3. On the **Audit** screen, inspect **Transit Loss Reconciliation**: automatically compares dispatch weight against ration shop received weight with statutory moisture/shrinkage tolerances.

### Scenario 9: Real-Time Stock Allocation Control Tower (Milestone M9)
1. Open the **Control Tower (M9)** tab.
2. Inspect the **Live Telemetry Strip**: live available stock, held/quarantine count, near-expiry count, and continuous ledger integrity badge (`0 MISMATCH`).
3. On the **Inbound Putaway Kanban**, click **Scan Putaway**: validates bin QR + batch QR; confirming putaway creates a `bin_movements` record and updates the physical stack in real time.
4. On the **2D Godown Physical Heatmap Matrix**, click on any bin (e.g. `BLK-A-01-1`): inspects active batch stacks, FIFO sequence, and recent movements in the side drawer. Note the ⭐ icon on the oldest FIFO candidate.
5. In the **Outbound Wave Pick Pipeline**, review pick lines sequenced by walking route (`(FIFO Rank * 10000) + Bin Path`). Click **Scan Pick** to verify scan enforcement.
6. Inspect the **Outflow Classification by Reason**: clearly categorizes what was removed and why (`DISPATCH`, `QUALITY_HOLD`, `RECALL_QUARANTINE`, `ADJUSTMENT`).

---

## 6. Key Deliverables & Directory Structure

```
.
├── docker-compose.yml              # One-command orchestration (postgres, api, web)
├── ERD.md                          # Mermaid Entity Relationship Diagram
├── PERFORMANCE.md                  # EXPLAIN ANALYZE index benchmarks & tuning
├── DESIGN_DECISIONS.md             # In-depth architectural trade-off analysis
├── README.md                       # Comprehensive guide and demo script
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Tables, ENUMs, partitioned ledgers, indexes
│   │   ├── 002_triggers_and_invariants.sql # Balance guard, hold block, SHA-256 triggers
│   │   ├── 003_fifo_engine.sql     # PL/pgSQL allocate_fifo & validate_override
│   │   ├── 004_views_and_audit.sql # Trace views, verify_ledger_chain function
│   │   ├── 901_location_and_bin_layer.sql # Storage zones, bins, bin_inventory, bin_movements
│   │   ├── 902_putaway_engine.sql  # Putaway rules, suggest_putaway, ABC classification
│   │   ├── 903_pick_engine.sql     # Wave picking, pick_tasks, walking path sequence
│   │   └── 904_read_models_and_outbox.sql # Real-time read models, outbox & LISTEN/NOTIFY
│   ├── seed.sql                    # 2 godowns, 4 commodities, 20 shops, 30 batches, 200+ bins
│   ├── demo.sql                    # Executable 8-scenario demonstration script
│   └── tests/
│       ├── run_tests.sh            # Automated SQL test runner
│       ├── 01_invariants_and_constraints.sql
│       ├── 02_fifo_allocation.sql
│       ├── 03_hold_and_release.sql
│       ├── 04_fifo_exception_maker_checker.sql
│       ├── 05_ledger_tamper_detection.sql
│       ├── 06_bin_invariants_and_capacity.sql
│       ├── 07_putaway_lane_rules.sql
│       ├── 08_wave_picking_and_quarantine_block.sql
│       ├── 09_control_tower_read_models.sql
│       ├── concurrency_test.py     # 50-client parallel dispatch stress test
│       └── benchmark_1m.sql        # High-scale query plan analysis
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── database.py                 # asyncpg pool connection management
│   └── main.py                     # Control Tower SSE stream, bin telemetry & thin API
└── web/
    ├── Dockerfile                  # Multi-stage production build (nginx)
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                 # Top bar, navigation, godown selector
        └── components/
            ├── ControlTower.jsx    # Real-time dark-store control room dashboard
            ├── Dashboard.jsx       # Ageing buckets, KPIs, batch table
            ├── DispatchScreen.jsx  # FIFO allocation preview, split, shortfall
            ├── ReceiptScreen.jsx   # Inward consignment registration
            ├── HoldReleaseScreen.jsx # Quarantine & maker-checker queue
            └── AuditScreen.jsx     # End-to-end trace tree & hash verifier
```

---

## 8. BhandarSetu Smart Inventory Dashboard (Front-End)

The user interface matches the reference specification at `1536×1024` with full interactive state, strict FIFO allocation, batch management, alert generation, and undoable dispatches.

### How to Run

#### Option 1: Instant Standalone Demo (Zero Dependencies)
Double-click or open the standalone `index.html` file in any modern web browser:
```bash
# On macOS:
open index.html
# Or open file:///Users/aayushtripathi/Downloads/vortex/index.html in Chrome / Safari
```
*No Node.js, npm, or build step required. Contains the complete React + Tailwind + Lucide + FIFO engine implementation in a single, portable file.*

#### Option 2: Full React 18 + TypeScript + Vite App
In your local terminal (outside the sandbox):
```bash
cd web
npm install
npm run dev
```
Then navigate to `http://localhost:5173`.

### Interactive Highlights
1. **FIFO Stock Allocation Card**:
   - Selecting **Wheat** and **120 Bags** deterministically allocates:
     - `B001` (Arrived 01-01-2025): **100 Bags** allocated, **0 Remaining**
     - `B002` (Arrived 10-01-2025): **20 Bags** allocated, **130 Remaining**
     - `B003` (Arrived 20-01-2025): **0 Bags** allocated, **200 Remaining** (Next in FIFO Queue)
   - Real-time shortfall detection when requested quantity exceeds eligible stock.
   - Hold (`B004`) and Rejected (`B007`) batches are **strictly excluded**.
2. **New Dispatch Creation**:
   - Deducts stock immediately, writes a new dispatch record to history, and presents a 6-second bottom toast with **"Undo"** support.
3. **Batch Drawer & Status Management**:
   - Clicking **View** on any batch opens a right-side drawer with consignment timeline, moisture/grade specifications, and actions to Place on Hold or Reject with mandatory reason logging.
   - Status changes automatically trigger high-priority alerts with colored badges.
4. **Settings & FIFO Unit Tests**:
   - Navigate to **Settings** to run the embedded pure FIFO test suite directly in the browser or reset all data back to clean factory seed state.

---

## 9. Seeded Demo Users & Credentials

| Role | Username | Password | Full Name | Permissions |
|---|---|---|---|---|
| **Godown Operator** | `operator` | `operator123` | Aayush Tripathi | Inward receipts, dispatch execution, FIFO preview, QR scanner |
| **Quality Inspector** | `inspector` | `inspector123` | Dr. Anita Rao | Inspection registry, Hold & Reject status transitions, re-assay logging |
| **Officer** | `officer` | `officer123` | Vikram Deshmukh | Maker-Checker approvals (Overrides, Holds, Reversals), cryptographic audit |
| **Admin** | `admin` | `admin123` | System Administrator | System settings, user registry, factory seed data reset |

*Tip: A one-click **Demo Role Switcher** is embedded in the top-right user menu of the interface for instantaneous switching between personas.*

---

## 10. End-to-End 5-Minute Demo Script

Follow these steps to demonstrate the complete **Quality-Aware FIFO + Automatic Allocation + Dispatch Validation + Audit Trail** workflow:

1. **Dashboard Overview (Operator View):**
   - Note the 4 tinted KPI cards: Total Stock (1,250 Bags), Eligible Batches (5), Hold/Rejected Batches (2), Dispatches this month (320 Bags).
   - Observe the Batch Inventory table with the golden star icon on **B001** (Wheat, arrived 01-01-2025) and **B005** (Rice, arrived 15-02-2025) marking them as "Next to dispatch".
2. **Stock Allocation:**
   - Navigate to **Stock Allocation** from the sidebar.
   - Enter a new consignment: Wheat, 150 Bags, Supplier "Punjab Agro Pool", Vehicle "UP-16-BT-4412".
   - Click **"Receive Consignment"**. Note immediate creation of Pending Allocation batch, storage slotting recommendation, and append-only receipt movement in the ledger.
3. **Deterministic FIFO Allocation:**
   - Navigate to **FIFO Allocation** (or view the card on Dashboard).
   - Select **Wheat** and enter **120 Bags**.
   - Observe deterministic plan: `B001` (100 bags allocated, 0 remaining) and `B002` (20 bags allocated, 130 remaining). `B003` is queued as next.
4. **Dispatch Execution & Receipt PDF:**
   - Click **"Confirm & Create Dispatch"** (or use New Dispatch card on Dashboard).
   - Notice immediate atomic stock deduction: Total stock decreases, a 6-second persistent toast appears with an **"Undo"** option.
   - Click **"Download Signed Receipt PDF"** to view the generated voucher with verified QR code and cryptographic ledger hash.
5. **Shortfall Detection:**
   - Enter **650 Bags** for Wheat (greater than total eligible stock of 610 bags).
   - Observe the amber **"Stock Shortfall"** alert banner displaying the exact 40-bag deficiency and disabling dispatch confirmation.
6. **Quarantine Block (Quality Inspector):**
   - Use the top-right menu to switch role to **Quality Inspector**.
   - Navigate to **Quality Inspection**. Click **"Flag / Hold"** on Batch `B002` with reason: *"Excess moisture detected in stack 4"*.
   - Return to FIFO Allocation and request 120 Wheat: Observe that `B002` is **strictly excluded**; the engine skips to `B003` automatically.
7. **Maker-Checker FIFO Override:**
   - Attempt to manually select `B006` before `B003`.
   - The system triggers a **FIFO Deviation Warning** requiring Officer approval.
   - Switch role to **Officer**, navigate to **Users & Approvals**, and review the requisition.
   - Click **"Approve"** (the system enforces that the requester cannot be the approver).
8. **Offline Resilience (PWA Mode):**
   - Toggle network to Offline (or click the offline simulator pill).
   - Create an inward or dispatch draft: It is committed to IndexedDB with a unique UUIDv7 idempotency key and tagged with a "Pending Sync" chip.
   - Reconnect: Observe automatic replay and deduplication without balance drift.
9. **Cryptographic Audit Verification (Officer):**
   - Navigate to **Reports & Analytics** / Audit.
   - Click **"Verify Audit Chain"**: A green verification status confirms all SHA-256 links (`row_hash = sha256(prev_hash + payload)`) are intact.
   - View the **Dispatch Trace Tree** for `D0056` showing the unbroken lineage from goods receipt through batch to dispatch.
10. **Multi-Format Export:**
    - In **Reports**, click **"Export Inventory CSV"** and **"Download Batch Ageing Excel"** (`.xlsx`).
    - Verify that exported quantities and age calculations match the dashboard numbers to the bag.

---

## 7. License & Compliance
Designed for government civil supplies and public distribution system transparency standards.
- Units: Integer grams (`qty_g`).
- Timezone: `Asia/Kolkata` (`TIMESTAMPTZ`).
- Non-repudiation: Hash-chained immutable audit and stock ledger.
