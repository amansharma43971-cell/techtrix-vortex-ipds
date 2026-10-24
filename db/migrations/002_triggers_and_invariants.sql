-- ============================================================================
-- Migration 002: Triggers, Invariants & Cryptographic SHA-256 Ledger Engine
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M1 Deliverable
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Immutability Enforcement (Rule: Single Source of Truth Ledger)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is strictly append-only. UPDATE, DELETE, and TRUNCATE operations are prohibited by PDS governance rules. Corrections must be recorded via REVERSAL movements.', TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- Apply immutability triggers
DROP TRIGGER IF EXISTS trg_immutable_stock_movements ON stock_movements;
CREATE TRIGGER trg_immutable_stock_movements
BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation();

DROP TRIGGER IF EXISTS trg_immutable_audit_log ON audit_log;
CREATE TRIGGER trg_immutable_audit_log
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation();

-- Revoke mutation privileges from PUBLIC
REVOKE UPDATE, DELETE, TRUNCATE ON stock_movements FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- 2. Guard Against Direct Mutation of batches.current_qty_g
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_guard_batch_balance_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Permit updates only when flag app.allow_batch_balance_update = 'true'
    IF NEW.current_qty_g <> OLD.current_qty_g THEN
        IF current_setting('app.allow_batch_balance_update', true) IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'Direct update to batches.current_qty_g is forbidden. Balances must be driven strictly via stock_movements ledger inserts.'
                USING ERRCODE = 'restrict_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_batch_balance ON batches;
CREATE TRIGGER trg_guard_batch_balance
BEFORE UPDATE ON batches
FOR EACH ROW EXECUTE FUNCTION fn_guard_batch_balance_update();

-- ----------------------------------------------------------------------------
-- 3. Cryptographic SHA-256 Hash Chaining on stock_movements
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_chain_stock_movement_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_last_hash TEXT;
    v_batch_wh UUID;
    v_batch_cur_qty BIGINT;
    v_payload TEXT;
BEGIN
    -- Ensure warehouse_id matches the batch's warehouse
    SELECT warehouse_id, current_qty_g 
    INTO v_batch_wh, v_batch_cur_qty
    FROM batches 
    WHERE id = NEW.batch_id;

    IF v_batch_wh IS NULL THEN
        RAISE EXCEPTION 'Referenced batch % does not exist.', NEW.batch_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    NEW.warehouse_id := v_batch_wh;

    -- Compute balance_after_g before hash computation
    NEW.balance_after_g := v_batch_cur_qty + NEW.qty_delta_g;
    IF NEW.balance_after_g < 0 THEN
        RAISE EXCEPTION 'Movement delta % would cause negative batch balance (%) for batch %.',
            NEW.qty_delta_g, NEW.balance_after_g, NEW.batch_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- Fetch the previous row_hash for this warehouse
    SELECT row_hash INTO v_last_hash
    FROM stock_movements
    WHERE warehouse_id = NEW.warehouse_id
    ORDER BY created_at DESC, movement_id DESC
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        -- Genesis hash for the warehouse
        NEW.prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    ELSE
        NEW.prev_hash := v_last_hash;
    END IF;

    -- Timestamp normalized to UTC ISO format for deterministic hashing
    IF NEW.created_at IS NULL THEN
        NEW.created_at := CURRENT_TIMESTAMP;
    END IF;

    -- Compute SHA-256 across prev_hash and canonical payload
    v_payload := NEW.prev_hash || '|' ||
                 NEW.warehouse_id::text || '|' ||
                 NEW.batch_id::text || '|' ||
                 NEW.movement_type::text || '|' ||
                 NEW.qty_delta_g::text || '|' ||
                 NEW.balance_after_g::text || '|' ||
                 NEW.ref_type || '|' ||
                 NEW.ref_id::text || '|' ||
                 NEW.created_by::text || '|' ||
                 to_char(NEW.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.USOF');

    NEW.row_hash := encode(digest(v_payload, 'sha256'), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chain_stock_movement_hash ON stock_movements;
CREATE TRIGGER trg_chain_stock_movement_hash
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION fn_chain_stock_movement_hash();

-- ----------------------------------------------------------------------------
-- 4. Single Source of Truth: Sync batches.current_qty_g from stock_movements
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_batch_balance_from_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_new_status batch_status;
BEGIN
    -- Authorize internal balance update
    PERFORM set_config('app.allow_batch_balance_update', 'true', true);

    -- Compute new batch status
    IF NEW.balance_after_g = 0 THEN
        v_new_status := 'EXHAUSTED'::batch_status;
    ELSE
        -- Retain current status or keep as AVAILABLE
        SELECT CASE 
            WHEN status IN ('QUALITY_HOLD', 'PARTIAL_HOLD', 'EXPIRED', 'QUARANTINED_RECALL') THEN status 
            ELSE 'AVAILABLE'::batch_status 
        END INTO v_new_status
        FROM batches
        WHERE id = NEW.batch_id;
    END IF;

    -- Atomically update batch balance and status
    UPDATE batches
    SET current_qty_g = NEW.balance_after_g,
        status = v_new_status,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.batch_id;

    -- Reset authorization flag
    PERFORM set_config('app.allow_batch_balance_update', 'false', true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_batch_balance ON stock_movements;
CREATE TRIGGER trg_sync_batch_balance
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION fn_sync_batch_balance_from_movement();

-- ----------------------------------------------------------------------------
-- 5. Verification Function: verify_ledger_chain
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_ledger_chain(
    p_warehouse_id UUID DEFAULT NULL,
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    warehouse_id UUID,
    is_valid BOOLEAN,
    total_verified BIGINT,
    first_broken_movement_id BIGINT,
    error_message TEXT
) AS $$
DECLARE
    v_wh RECORD;
    v_mov RECORD;
    v_expected_prev TEXT;
    v_computed_hash TEXT;
    v_payload TEXT;
    v_verified_count BIGINT;
    v_broken_id BIGINT;
    v_wh_valid BOOLEAN;
    v_err TEXT;
BEGIN
    FOR v_wh IN 
        SELECT id, code, name 
        FROM warehouses 
        WHERE (p_warehouse_id IS NULL OR id = p_warehouse_id)
    LOOP
        v_expected_prev := '0000000000000000000000000000000000000000000000000000000000000000';
        v_verified_count := 0;
        v_broken_id := NULL;
        v_wh_valid := true;
        v_err := 'Ledger hash chain is cryptographically intact and verified.';

        FOR v_mov IN
            SELECT sm.movement_id, sm.warehouse_id, sm.batch_id, sm.movement_type,
                   sm.qty_delta_g, sm.balance_after_g, sm.ref_type, sm.ref_id,
                   sm.created_by, sm.created_at, sm.prev_hash, sm.row_hash
            FROM stock_movements sm
            WHERE sm.warehouse_id = v_wh.id
              AND (p_from IS NULL OR sm.created_at >= p_from)
              AND (p_to IS NULL OR sm.created_at <= p_to)
            ORDER BY sm.created_at ASC, sm.movement_id ASC
        LOOP
            -- Check 1: Previous hash link
            IF v_mov.prev_hash <> v_expected_prev THEN
                v_wh_valid := false;
                v_broken_id := v_mov.movement_id;
                v_err := format('Broken chain link at movement #%s: expected prev_hash %s, got %s',
                                v_mov.movement_id, v_expected_prev, v_mov.prev_hash);
                EXIT;
            END IF;

            -- Check 2: Payload hash recomputation
            v_payload := v_mov.prev_hash || '|' ||
                         v_mov.warehouse_id::text || '|' ||
                         v_mov.batch_id::text || '|' ||
                         v_mov.movement_type::text || '|' ||
                         v_mov.qty_delta_g::text || '|' ||
                         v_mov.balance_after_g::text || '|' ||
                         v_mov.ref_type || '|' ||
                         v_mov.ref_id::text || '|' ||
                         v_mov.created_by::text || '|' ||
                         to_char(v_mov.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.USOF');

            v_computed_hash := encode(digest(v_payload, 'sha256'), 'hex');

            IF v_mov.row_hash <> v_computed_hash THEN
                v_wh_valid := false;
                v_broken_id := v_mov.movement_id;
                v_err := format('Tampered row detected at movement #%s: stored hash %s <> computed %s',
                                v_mov.movement_id, v_mov.row_hash, v_computed_hash);
                EXIT;
            END IF;

            v_expected_prev := v_mov.row_hash;
            v_verified_count := v_verified_count + 1;
        END LOOP;

        warehouse_id := v_wh.id;
        is_valid := v_wh_valid;
        total_verified := v_verified_count;
        first_broken_movement_id := v_broken_id;
        error_message := v_err;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 6. Continuous Invariant View: v_balance_mismatch
-- Invariant: batches.current_qty_g = SUM(stock_movements.qty_delta_g)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_balance_mismatch AS
WITH ledger_sums AS (
    SELECT 
        batch_id,
        COALESCE(SUM(qty_delta_g), 0) AS ledger_calculated_qty_g,
        COUNT(movement_id) AS total_movements
    FROM stock_movements
    GROUP BY batch_id
)
SELECT 
    b.id AS batch_id,
    b.batch_no,
    w.code AS warehouse_code,
    c.code AS commodity_code,
    b.current_qty_g AS batch_recorded_qty_g,
    COALESCE(ls.ledger_calculated_qty_g, 0) AS ledger_calculated_qty_g,
    (b.current_qty_g - COALESCE(ls.ledger_calculated_qty_g, 0)) AS discrepancy_qty_g,
    COALESCE(ls.total_movements, 0) AS total_movements
FROM batches b
JOIN warehouses w ON b.warehouse_id = w.id
JOIN commodities c ON b.commodity_id = c.id
LEFT JOIN ledger_sums ls ON b.id = ls.batch_id
WHERE b.current_qty_g <> COALESCE(ls.ledger_calculated_qty_g, 0);
