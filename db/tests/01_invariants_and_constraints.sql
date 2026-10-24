-- ============================================================================
-- Test Suite 01: Core Invariants, Constraints & Ledger Immutability
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M1 Test Verification
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Test 1: batches.current_qty_g cannot be negative (chk_current_qty_non_negative)
DO $$
BEGIN
    INSERT INTO batches (
        batch_no, receipt_id, commodity_id, warehouse_id, received_date,
        received_qty_g, current_qty_g
    ) VALUES (
        'TEST-NEG-01', 
        (SELECT id FROM goods_receipts LIMIT 1),
        (SELECT id FROM commodities LIMIT 1),
        (SELECT id FROM warehouses LIMIT 1),
        CURRENT_DATE, 100000, -500
    );
    RAISE EXCEPTION 'TEST 1 FAILED: Negative balance was accepted!';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 1 PASSED: Negative current_qty_g correctly rejected by CHECK constraint.';
END $$;

-- Test 2: batches.current_qty_g cannot exceed received_qty_g
DO $$
BEGIN
    INSERT INTO batches (
        batch_no, receipt_id, commodity_id, warehouse_id, received_date,
        received_qty_g, current_qty_g
    ) VALUES (
        'TEST-EXCEED-01', 
        (SELECT id FROM goods_receipts LIMIT 1),
        (SELECT id FROM commodities LIMIT 1),
        (SELECT id FROM warehouses LIMIT 1),
        CURRENT_DATE, 100000, 150000
    );
    RAISE EXCEPTION 'TEST 2 FAILED: Current quantity exceeding received quantity was accepted!';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 2 PASSED: Current quantity exceeding received quantity correctly rejected.';
END $$;

-- Test 3: batches.held_qty_g cannot exceed current_qty_g
DO $$
BEGIN
    INSERT INTO batches (
        batch_no, receipt_id, commodity_id, warehouse_id, received_date,
        received_qty_g, current_qty_g, held_qty_g
    ) VALUES (
        'TEST-HELD-EXCEED-01', 
        (SELECT id FROM goods_receipts LIMIT 1),
        (SELECT id FROM commodities LIMIT 1),
        (SELECT id FROM warehouses LIMIT 1),
        CURRENT_DATE, 100000, 50000, 75000
    );
    RAISE EXCEPTION 'TEST 3 FAILED: Held quantity exceeding current quantity was accepted!';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 3 PASSED: Held quantity exceeding current quantity correctly rejected.';
END $$;

-- Test 4: Direct UPDATE to batches.current_qty_g is blocked by trigger
DO $$
DECLARE
    v_b_id UUID;
BEGIN
    SELECT id INTO v_b_id FROM batches LIMIT 1;
    UPDATE batches SET current_qty_g = current_qty_g + 1000 WHERE id = v_b_id;
    RAISE EXCEPTION 'TEST 4 FAILED: Direct UPDATE to batches.current_qty_g was permitted!';
EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'TEST 4 PASSED: Direct UPDATE to batches.current_qty_g correctly blocked by trigger.';
END $$;

-- Test 5: UPDATE on stock_movements is blocked (Immutable Ledger)
DO $$
DECLARE
    v_m_id BIGINT;
    v_m_created TIMESTAMPTZ;
BEGIN
    SELECT movement_id, created_at INTO v_m_id, v_m_created FROM stock_movements LIMIT 1;
    UPDATE stock_movements SET qty_delta_g = 99999 WHERE movement_id = v_m_id AND created_at = v_m_created;
    RAISE EXCEPTION 'TEST 5 FAILED: UPDATE on stock_movements was permitted!';
EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'TEST 5 PASSED: UPDATE on stock_movements correctly blocked by immutability trigger.';
END $$;

-- Test 6: DELETE on stock_movements is blocked (Immutable Ledger)
DO $$
DECLARE
    v_m_id BIGINT;
    v_m_created TIMESTAMPTZ;
BEGIN
    SELECT movement_id, created_at INTO v_m_id, v_m_created FROM stock_movements LIMIT 1;
    DELETE FROM stock_movements WHERE movement_id = v_m_id AND created_at = v_m_created;
    RAISE EXCEPTION 'TEST 6 FAILED: DELETE on stock_movements was permitted!';
EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'TEST 6 PASSED: DELETE on stock_movements correctly blocked by immutability trigger.';
END $$;

-- Test 7: Self-delegation rejected by constraint
DO $$
DECLARE
    v_u_id UUID;
BEGIN
    SELECT id INTO v_u_id FROM users LIMIT 1;
    INSERT INTO delegations (approver_id, delegate_id, valid_from, valid_to, reason)
    VALUES (v_u_id, v_u_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', 'Self delegation test');
    RAISE EXCEPTION 'TEST 7 FAILED: Self-delegation was allowed!';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 7 PASSED: Self-delegation correctly blocked by chk_delegation_diff_user.';
END $$;

-- Test 8: Zero discrepancy invariant (v_balance_mismatch must return 0 rows)
DO $$
DECLARE
    v_mismatch_count INT;
BEGIN
    SELECT COUNT(*) INTO v_mismatch_count FROM v_balance_mismatch;
    IF v_mismatch_count > 0 THEN
        RAISE EXCEPTION 'TEST 8 FAILED: Found % balance mismatches between batches and stock_movements!', v_mismatch_count;
    ELSE
        RAISE NOTICE 'TEST 8 PASSED: Invariant verified. 0 mismatches in v_balance_mismatch.';
    END IF;
END $$;

ROLLBACK;
