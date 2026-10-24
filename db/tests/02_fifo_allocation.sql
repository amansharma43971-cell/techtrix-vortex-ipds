-- ============================================================================
-- Test Suite 02: Policy Allocation Engine (FIFO & FEFO), Splits & Shortfall
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M2 Test Verification
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Test 1: Multi-batch split and Exact-sum Property
DO $$
DECLARE
    v_req_id UUID := gen_random_uuid();
    v_res JSONB;
    v_sum_allocated BIGINT;
    v_requested_qty BIGINT := 1000000; -- 1,000 kg
BEGIN
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'TEST-FIFO-001', 'IDEMP-TEST-001',
        (SELECT id FROM ration_shops WHERE warehouse_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Wheat Grade A (FIFO)
        '11111111-1111-1111-1111-111111111111',
        v_requested_qty,
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001'
    );

    v_res := allocate(v_req_id, false, false);

    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 1 FAILED: allocate returned unsuccessful: %', v_res->>'message';
    END IF;

    SELECT SUM(allocated_qty_g) INTO v_sum_allocated
    FROM dispatch_allocations
    WHERE request_id = v_req_id;

    IF v_sum_allocated <> v_requested_qty THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Exact-sum property violated! Requested: %, Allocated sum: %',
            v_requested_qty, v_sum_allocated;
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Multi-batch split executed with exact-sum verified (% g = % g).',
        v_requested_qty, v_sum_allocated;
END $$;

-- Test 2: Idempotent Retry (Calling allocate again does not duplicate movements)
DO $$
DECLARE
    v_req_id UUID;
    v_res JSONB;
    v_mov_count_before INT;
    v_mov_count_after INT;
BEGIN
    SELECT id INTO v_req_id FROM dispatch_requests WHERE request_no = 'TEST-FIFO-001';

    SELECT COUNT(*) INTO v_mov_count_before FROM stock_movements WHERE ref_id = v_req_id;

    -- Call allocate again
    v_res := allocate(v_req_id, false, false);

    SELECT COUNT(*) INTO v_mov_count_after FROM stock_movements WHERE ref_id = v_req_id;

    IF (v_res->>'idempotent')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Response was not flagged as idempotent.';
    END IF;

    IF v_mov_count_before <> v_mov_count_after THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Idempotency failed! Stock movements count changed from % to %',
            v_mov_count_before, v_mov_count_after;
    END IF;

    RAISE NOTICE 'TEST 2 PASSED: Idempotent retry succeeded with zero duplicate movements written.';
END $$;

-- Test 3: Expired Batches Are Completely Skipped
DO $$
DECLARE
    v_req_id UUID := gen_random_uuid();
    v_res JSONB;
    v_expired_batch_id UUID;
    v_was_allocated BOOLEAN;
BEGIN
    SELECT id INTO v_expired_batch_id 
    FROM batches 
    WHERE batch_no = 'BATCH-BJR-2025-001-EXPIRED';

    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'TEST-FIFO-EXPIRED-01', 'IDEMP-TEST-EXP-01',
        (SELECT id FROM ration_shops WHERE warehouse_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
        'dddddddd-dddd-dddd-dddd-dddddddddddd', -- Bajra
        '11111111-1111-1111-1111-111111111111',
        600000,
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001'
    );

    v_res := allocate(v_req_id, false, false);

    SELECT EXISTS(
        SELECT 1 FROM dispatch_allocations WHERE request_id = v_req_id AND batch_id = v_expired_batch_id
    ) INTO v_was_allocated;

    IF v_was_allocated THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Expired batch was allocated!';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: Expired batch correctly skipped by candidate filter.';
END $$;

-- Test 4: Stock Shortfall Protection (Silent partial dispatch prohibited)
DO $$
DECLARE
    v_req_id UUID := gen_random_uuid();
    v_res JSONB;
BEGIN
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'TEST-SHORTFALL-01', 'IDEMP-TEST-SHT-01',
        (SELECT id FROM ration_shops WHERE warehouse_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        999999000, -- 999 tonnes (exceeds inventory)
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001'
    );

    v_res := allocate(v_req_id, false, false);

    IF v_res->>'status' <> 'SHORTFALL' THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Shortfall was not returned! Status: %', v_res->>'status';
    END IF;

    IF (v_res->>'shortfall_qty_g')::bigint <= 0 THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Deficit shortfall quantity was not reported!';
    END IF;

    RAISE NOTICE 'TEST 4 PASSED: Stock shortfall correctly detected and reported (deficit: % g).',
        v_res->>'shortfall_qty_g';
END $$;

ROLLBACK;
