-- =============================================================================
-- BhandarSetu Database Schema (SQLite 3 WAL Mode / Portable to PostgreSQL 16)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. Godowns (Warehouses)
CREATE TABLE IF NOT EXISTS godowns (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    capacity_bags INTEGER NOT NULL CHECK (capacity_bags > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Godown Operator', 'Quality Inspector', 'Officer')),
    godown_id TEXT NOT NULL REFERENCES godowns(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Commodities (Grain Master)
CREATE TABLE IF NOT EXISTS commodities (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    standard_bag_weight_kg INTEGER NOT NULL DEFAULT 50,
    low_stock_threshold_bags INTEGER NOT NULL DEFAULT 200,
    shelf_life_days INTEGER NOT NULL DEFAULT 365,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Batches (Physical Grain Lots)
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY, -- e.g. B001
    godown_id TEXT NOT NULL REFERENCES godowns(id),
    commodity_id TEXT NOT NULL REFERENCES commodities(id),
    arrival_date TEXT NOT NULL, -- YYYY-MM-DD
    total_qty INTEGER NOT NULL CHECK (total_qty >= 0),
    available_qty INTEGER NOT NULL CHECK (available_qty >= 0 AND available_qty <= total_qty),
    quality_status TEXT NOT NULL CHECK (quality_status IN ('Pending Inspection', 'Eligible', 'Hold', 'Rejected', 'Exhausted')),
    supplier TEXT,
    qr_token TEXT NOT NULL UNIQUE,
    notes TEXT,
    hold_reason TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Stock Inward (Receipts Ledger)
CREATE TABLE IF NOT EXISTS stock_inward (
    id TEXT PRIMARY KEY, -- e.g. INW-2025-001
    batch_id TEXT NOT NULL REFERENCES batches(id),
    godown_id TEXT NOT NULL REFERENCES godowns(id),
    commodity_id TEXT NOT NULL REFERENCES commodities(id),
    qty_bags INTEGER NOT NULL CHECK (qty_bags > 0),
    arrival_date TEXT NOT NULL,
    supplier TEXT NOT NULL,
    vehicle_no TEXT,
    document_ref TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Quality Inspections History
CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    prev_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    inspector_id TEXT NOT NULL REFERENCES users(id),
    inspected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Dispatch Orders
CREATE TABLE IF NOT EXISTS dispatch_orders (
    id TEXT PRIMARY KEY, -- e.g. D0056
    dispatch_no TEXT NOT NULL UNIQUE,
    godown_id TEXT NOT NULL REFERENCES godowns(id),
    commodity_id TEXT NOT NULL REFERENCES commodities(id),
    destination_shop TEXT NOT NULL,
    requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
    allocated_qty INTEGER NOT NULL CHECK (allocated_qty >= 0),
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Confirmed', 'Completed', 'Cancelled')),
    vehicle_no TEXT,
    remarks TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    pdf_receipt_path TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Dispatch Allocations (FIFO Breakdown)
CREATE TABLE IF NOT EXISTS dispatch_allocations (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    allocated_qty INTEGER NOT NULL CHECK (allocated_qty > 0),
    fifo_rank INTEGER NOT NULL CHECK (fifo_rank >= 1)
);

-- 9. Stock Movements (Append-Only Money-Grade Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('RECEIPT', 'DISPATCH', 'ADJUSTMENT', 'REVERSAL')),
    batch_id TEXT NOT NULL REFERENCES batches(id),
    qty_delta INTEGER NOT NULL, -- Negative for dispatch/reduction, positive for receipt/reversal
    ref_type TEXT NOT NULL CHECK (ref_type IN ('STOCK_INWARD', 'DISPATCH_ORDER', 'ADJUSTMENT', 'REVERSAL')),
    ref_id TEXT NOT NULL,
    performed_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Maker-Checker Approvals
CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    approval_type TEXT NOT NULL CHECK (approval_type IN ('FIFO_OVERRIDE', 'HOLD_RELEASE', 'DISPATCH_CANCEL', 'STOCK_ADJUSTMENT')),
    ref_id TEXT NOT NULL,
    requested_by TEXT NOT NULL REFERENCES users(id),
    decided_by TEXT REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    request_reason TEXT NOT NULL,
    decision_reason TEXT,
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    decided_at TEXT,
    CONSTRAINT chk_maker_checker CHECK (decided_by IS NULL OR decided_by <> requested_by)
);

-- 11. Alerts & Notifications
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    godown_id TEXT NOT NULL REFERENCES godowns(id),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('AGED_STOCK', 'LOW_STOCK', 'PENDING_INSPECTION', 'HOLD_AGED', 'UNUSUAL_ACTIVITY')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    batch_id TEXT REFERENCES batches(id),
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Audit Log (Cryptographically Hash-Chained with SHA-256)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT REFERENCES users(id),
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_state TEXT, -- JSON
    after_state TEXT,  -- JSON
    ip_address TEXT DEFAULT '127.0.0.1',
    prev_hash TEXT NOT NULL,
    row_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. System Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by TEXT REFERENCES users(id),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. PWA Offline Sync Queue Log
CREATE TABLE IF NOT EXISTS sync_queue_log (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    client_timestamp TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    sync_status TEXT NOT NULL CHECK (sync_status IN ('APPLIED', 'CONFLICT', 'REJECTED')),
    resolution_notes TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Triggers: Business Invariants & Immutability
-- =============================================================================

-- Immutability on Stock Movements (No UPDATE or DELETE allowed)
CREATE TRIGGER IF NOT EXISTS trg_stock_movements_no_update
BEFORE UPDATE ON stock_movements
BEGIN
    SELECT RAISE(ABORT, 'BS002: LEDGER_IMMUTABLE: Stock movements cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_stock_movements_no_delete
BEFORE DELETE ON stock_movements
BEGIN
    SELECT RAISE(ABORT, 'BS002: LEDGER_IMMUTABLE: Stock movements cannot be deleted');
END;

-- Immutability on Audit Log (No UPDATE or DELETE allowed)
CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'BS002: AUDIT_IMMUTABLE: Audit logs cannot be modified');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_log_no_delete
BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'BS002: AUDIT_IMMUTABLE: Audit logs cannot be deleted');
END;

-- Invariant: Zero Dispatch from Hold / Rejected / Exhausted Batches
CREATE TRIGGER IF NOT EXISTS trg_guard_dispatch_allocation_quality
BEFORE INSERT ON dispatch_allocations
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT quality_status FROM batches WHERE id = NEW.batch_id) <> 'Eligible'
        THEN RAISE(ABORT, 'BS001: QUALITY_HOLD_VIOLATION: Cannot allocate non-eligible batch')
    END;
END;

-- Verification View: Live Balance vs Ledger Check (Must return 0 rows)
CREATE VIEW IF NOT EXISTS v_balance_mismatch AS
SELECT
    b.id AS batch_id,
    b.commodity_id,
    b.available_qty AS reported_qty,
    COALESCE(SUM(sm.qty_delta), 0) AS ledger_qty,
    (b.available_qty - COALESCE(SUM(sm.qty_delta), 0)) AS drift
FROM batches b
LEFT JOIN stock_movements sm ON b.id = sm.batch_id
GROUP BY b.id, b.commodity_id, b.available_qty
HAVING b.available_qty <> COALESCE(SUM(sm.qty_delta), 0);

