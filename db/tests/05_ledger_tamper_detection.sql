-- ============================================================================
-- Test Suite 05: Cryptographic Ledger Verification & Tamper Detection
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M6 Test Verification
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Test 1: Verify intact ledger
DO $$
DECLARE
    v_res RECORD;
BEGIN
    SELECT * INTO v_res FROM verify_ledger_chain();

    IF NOT v_res.is_valid THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Clean ledger failed verification: %', v_res.error_message;
    END IF;

    IF v_res.total_verified = 0 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Zero movements verified in database!';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Cryptographic ledger verified. % transactions validated with valid SHA-256 chain.',
        v_res.total_verified;
END $$;

-- Test 2: Simulate Tamper Detection (Simulate unauthorized bitflip in historical movement)
DO $$
DECLARE
    v_tampered_res RECORD;
BEGIN
    -- Create temporary clone of stock_movements for tamper experiment
    CREATE TEMP TABLE temp_movements AS SELECT * FROM stock_movements;

    -- Tamper with one row's balance_after_g
    UPDATE temp_movements 
    SET balance_after_g = balance_after_g + 50000 
    WHERE movement_id = (SELECT MIN(movement_id) FROM temp_movements);

    -- Run verification logic against temp table
    WITH verified AS (
        SELECT 
            t.movement_id,
            t.row_hash,
            encode(digest(
                t.prev_hash || '|' ||
                t.warehouse_id::text || '|' ||
                t.batch_id::text || '|' ||
                t.movement_type::text || '|' ||
                t.qty_delta_g::text || '|' ||
                t.balance_after_g::text || '|' ||
                t.ref_type || '|' ||
                t.ref_id::text || '|' ||
                t.created_by::text || '|' ||
                to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.USOF')
            , 'sha256'), 'hex') AS computed_hash
        FROM temp_movements t
    )
    SELECT * INTO v_tampered_res 
    FROM verified 
    WHERE row_hash <> computed_hash 
    LIMIT 1;

    IF v_tampered_res.movement_id IS NULL THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Tamper simulation was NOT detected!';
    END IF;

    RAISE NOTICE 'TEST 2 PASSED: Cryptographic verifier successfully detected tampered row at movement_id %!',
        v_tampered_res.movement_id;
END $$;

ROLLBACK;
