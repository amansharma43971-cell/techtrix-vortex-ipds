# BhandarSetu — Architectural Design Decisions

## 1. Why `pg_advisory_xact_lock` (Scoped Advisory Transaction Locking)?

### Problem
When 50 store employees or automated dispatch systems submit dispatch requests simultaneously for the same commodity (e.g. Wheat) in the same godown:
- Using `SERIALIZABLE` isolation causes pervasive serialization failures (`40001: could not serialize access due to read/write dependencies`), forcing unpredictable client-side retries and high tail latency.
- Relying solely on `SELECT ... FOR UPDATE` without higher-level coordination can cause deadlocks if transactions acquire rows in non-identical order, or cause threads to evaluate candidate batches before an in-flight allocation commits.

### Decision
We use a scoped PostgreSQL advisory transaction lock:
```sql
v_lock_key := get_warehouse_commodity_lock_key(warehouse_id, commodity_id);
PERFORM pg_advisory_xact_lock(v_lock_key);
```
1. **Fine-Grained Partitioning of Concurrency:**
   - Dispatches for Wheat in Nagpur do not block dispatches for Rice in Nagpur, nor Wheat in Pune.
   - Serialization is strictly scoped to the exact pool of stock being contested.
2. **Transaction Scoped (`_xact_lock`):**
   - Automatically released upon `COMMIT` or `ROLLBACK`. Zero possibility of orphaned locks in the event of worker crash or client timeout.
3. **Combined with `SELECT ... FOR UPDATE ORDER BY received_date ASC, id ASC`:**
   - Eliminates deadlocks, guarantees zero negative balances, and avoids serialization retry storms.

---

## 2. Why Append-Only Ledger (`stock_movements`) as the Single Source of Truth?

### Problem
Traditional ERP systems update stock balances in-place (`UPDATE stock SET qty = qty - 500`). This results in:
- Inability to prove provenance: when a balance doesn't match physical count, it is impossible to determine which transaction caused the loss.
- High risk of fraudulent silent balance adjustments.
- Destructive history: overwriting previous state deletes forensic proof.

### Decision
`stock_movements` is strictly append-only:
1. Every event (Goods Receipt, Dispatch, Adjustment, Reversal, Return) appends a signed delta (`qty_delta_g`).
2. Permissions for `UPDATE`, `DELETE`, and `TRUNCATE` are revoked from all users. In addition, an immutable database trigger raises an exception if mutation is attempted.
3. Invariant: At all points in time, physical stock balance equals $\sum (\text{qty\_delta\_g})$.
4. Corrections can only be executed via explicit `REVERSAL` movements, maintaining an auditable historical trail.

---

## 3. Why Denormalized Balance (`batches.current_qty_g`) with Trigger-Only Updates?

### Problem
If the balance must be calculated purely from the ledger, every FIFO/FEFO query would have to run:
```sql
SELECT batch_id, SUM(qty_delta_g) FROM stock_movements GROUP BY batch_id HAVING SUM(qty_delta_g) > 0;
```
On a database with 10M+ movements, this aggregation takes several seconds, destroying the $< 5\text{ ms}$ SLA required for live truck dispatch.

### Decision
We maintain a denormalized `current_qty_g` column directly on `batches`, protected by two architectural safeguards:
1. **Partial Covering Index:** Fast lookups directly filter `WHERE status IN ('AVAILABLE', 'PARTIAL_HOLD') AND current_qty_g > 0`.
2. **Strict DB Trigger Monopoly:**
   - Direct manual updates to `batches.current_qty_g` are blocked by `trg_guard_batch_balance`.
   - Only the internal `stock_movements_after_insert` trigger is authorized to mutate `batches.current_qty_g`.
3. **Continuous Invariant Verification:**
   - View `v_balance_mismatch` continuously verifies that `current_qty_g` matches `SUM(qty_delta_g)`.
   - Automated tests assert that this view returns exactly 0 rows.

---

## 4. Why Integer Grams (`BIGINT`) instead of `FLOAT` or `NUMERIC`?

### Problem
- Floating-point representations (`FLOAT`, `DOUBLE PRECISION`) use IEEE 754 binary approximations, leading to rounding drift (e.g., $0.1 + 0.2 = 0.30000000000000004$). Over thousands of dispatches, grain balances drift by fractions of a kilogram, creating unaccounted discrepancies that corrupt audit verification.
- `NUMERIC(14, 3)` prevents rounding drift but introduces decimal storage overhead and slower CPU arithmetic than native 64-bit integer instructions.

### Decision
All quantities are stored as **`BIGINT` integer grams** (`qty_g`):
- $1\text{ Quintal} = 100\text{ kg} = 100{,}000\text{ grams}$.
- $10{,}000\text{ Metric Tonnes} = 10{,}000{,}000{,}000\text{ grams}$ (fits comfortably inside a 64-bit signed integer whose maximum value is $9{,}223{,}372{,}036{,}854{,}775{,}807$).
- Division and multi-batch splits remain exact with zero floating-point drift.
- Conversions to kilograms and quintals are performed exclusively at the presentation/display boundary.

---

## 5. Why Maker-Checker Enforced at Database Table Level?

### Problem
Application-level checks (e.g., in FastAPI/Node.js controllers) can be bypassed via direct database access, batch migration scripts, or software bugs. In government PDS administration, a storekeeper must never be able to approve their own FIFO deviation or quality release.

### Decision
Enforced via declarative PostgreSQL table constraints:
```sql
CONSTRAINT chk_fifo_exception_maker_checker CHECK (
    approved_by IS NULL OR (requested_by <> approved_by)
);

CONSTRAINT chk_hold_maker_checker CHECK (
    release_approved_by IS NULL OR 
    (release_requested_by IS NOT NULL AND release_requested_by <> release_approved_by)
);
```
Even if an employee issues a raw SQL query or an API endpoint omits a check, PostgreSQL rejects the transaction immediately with a `check_violation` (`BS004`) error.

---

## 6. Cryptographic SHA-256 Ledger Hash Chaining

### Problem
How can a vigilance auditor or external oversight agency verify that a corrupt database administrator did not quietly alter historical ledger rows using superuser privileges?

### Decision
Every row in `stock_movements` contains `prev_hash` and `row_hash`:
$$\text{row\_hash} = \text{sha256}(\text{prev\_hash} \,||\, \text{warehouse\_id} \,||\, \text{batch\_id} \,||\, \text{movement\_type} \,||\, \text{qty\_delta\_g} \,||\, \text{balance\_after\_g} \,||\, \text{ref\_type} \,||\, \text{ref\_id} \,||\, \text{created\_by} \,||\, \text{created\_at})$$
- Computed inside `fn_chain_stock_movement_hash()`.
- Function `verify_ledger_chain()` re-computes hashes across the ledger sequentially.
- If even a single byte in any past movement is tampered with, the cryptographic link breaks and the auditor is immediately alerted to the exact corrupted record.

---

## 7. Policy-Driven Configuration Over Hardcoding

### Problem
Hardcoding FIFO rules in application controllers prevents godowns from switching to FEFO (First-Expired, First-Out) for perishable or fortified commodities (e.g. Bajra / Millets) or altering shelf-life buffers for distant rural shops.

### Decision
`allocation_policies` table scopes rotation mode (`FIFO` or `FEFO`), `max_batches_per_dispatch`, `min_split_g`, and `min_remaining_shelf_life_days` per commodity and warehouse. The core PL/pgSQL engine reads policies dynamically at runtime.

---

## 8. Two-Layer Stock Model: Financial Stock Ledger vs Physical Bin Location Layer

### Problem
If physical bins and racks are tightly coupled to the financial stock ledger, internal godown reshuffling (e.g., consolidating partial pallets, moving stock to pick faces, or reorganizing bays) would pollute the financial inventory ledger with non-financial transactions.

### Decision
We architect a decoupled two-layer model:
1. **Financial/Inventory Truth Layer (`batches`, `stock_movements`):** Tracks legal consignment ownership, goods receipts, ration shop dispatches, and quality hold states.
2. **Physical Location Layer (`bins`, `bin_inventory`, `bin_movements`):** Tracks micro-level stack positions, bay addresses, and pick sequences.
3. **Continuous Reconciliation Invariant (`v_bin_vs_batch_mismatch`):**
   $$\sum_{\text{bins}} (\text{bin\_inventory.qty\_g}) = \text{batches.current\_qty\_g}$$
   Enforced via triggers and verification queries that must always return 0 rows.

---

## 9. Read Models + SSE Telemetry vs Polling Heavy Normalized Views

### Problem
In a high-throughput warehouse dashboard with 1M batches and hundreds of concurrent pickers, running aggregate queries (`SUM`, `GROUP BY`, `JOIN` across 5 tables) on every page refresh or 2-second poll degrades database performance and causes lock contention.

### Decision
1. **Pre-Aggregated Read Model Tables (`rm_stock_summary`, `rm_bin_occupancy`, `rm_task_kpis`):** Maintained asynchronously or upon state transition triggers. Widget queries execute in $< 5\text{ ms}$ index lookups.
2. **Server-Sent Events (SSE) Stream (`/control-tower/stream`):** Leverages PostgreSQL `LISTEN/NOTIFY` paired with a transactional outbox (`control_tower_outbox`). Updates push to the frontend within $< 1\text{ s}$ with zero polling overhead.

---

## 10. Lane-Based FIFO Slotting & Pick Walking Paths

### Problem
In government grain warehouses, gunny bags are stacked in multi-deep bays. If new grain is slotted in front of older grain in a single-deep bay, workers naturally pull the newer stock first because moving the heavy gunny bags to reach older stock requires heavy manual effort ("FIFO Inversion").

### Decision
1. **Putaway Lane Preservation Rule:** The `suggest_putaway()` engine evaluates bay depth. If a bay already holds an older batch with a higher `pick_sequence`, placing newer stock at a lower `pick_sequence` is penalized or blocked. Newer stock is strictly directed to the *back* of the lane or dedicated new stacks.
2. **Composite Pick Sequencing:** Pick tasks are sequenced using:
   $$\text{task\_pick\_sequence} = (\text{fifo\_rank} \times 10000) + \text{bin.pick\_sequence}$$
   This guarantees that oldest FIFO batches are always picked first, while optimizing walking paths *within* the eligible batch tier. Walking efficiency never overrides grain rotation integrity.

---

## 11. PWA Offline Conflict Resolution & Replay Strategy

### Problem
In rural or subterranean godowns with intermittent network coverage, operators must continue creating inward receipts, recording inspections, and drafting dispatches offline. When reconnecting:
- Replaying offline requests blindly can result in duplicate dispatches or negative stock.
- If a batch was placed on Quality Hold by an Inspector while an Operator was drafting an offline dispatch, silently committing that dispatch breaches food security.

### Decision
1. **Client-Generated Idempotency Keys:** Every offline transaction generates a unique UUIDv7 key stored in IndexedDB. When replayed, SQLite/PostgreSQL `UNIQUE (idempotency_key)` constraints guarantee that no operation can ever execute twice.
2. **Pre-Commit Server Re-Validation:**
   - During online replay, the server does *not* trust the client's cached stock. It re-runs `allocateFifo()` against the live database state inside a serial transaction.
   - If stock availability or quality holds have changed, the dispatch is routed to a **"Needs Review"** conflict table (`sync_queue_log`) with clear explanatory diagnostics, rather than failing silently or corrupting balances.

---

## 12. Cryptographic SHA-256 Hash Chaining on Audit Logs

### Problem
In government procurement, rogue actors or database administrators with direct DB access might tamper with historical tables to mask grain theft or unauthorized stock adjustments.

### Decision
1. `audit_log` implements a cryptographic blockchain-style hash chain:
   $$\text{row\_hash}_i = \text{SHA-256}(\text{row\_hash}_{i-1} \parallel \text{actor\_id} \parallel \text{action} \parallel \text{entity\_id} \parallel \text{payload} \parallel \text{timestamp})$$
2. Any manual alteration of a historical row invalidates all subsequent hashes in the chain.
3. The `verifyAuditChain()` API and inspection dashboard immediately identify the exact ID where a chain break occurred.
