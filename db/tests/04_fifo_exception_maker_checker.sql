-- ============================================================================
-- Test Suite 04: FIFO Override Exception Workflow & Maker-Checker Rule
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M4/M5 Test Verification
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Test 1: FIFO Violation Warning when older batch is skipped (BS002)
DO $$
DECLARE
    v_req_id UUID := gen_random_uuid();
    v_older_batch_id UUID;
    v_newer_batch_id UUID;
    v_val_res JSONB;
BEGIN
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'TEST-OVERRIDE-01', 'IDEMP-TEST-OVR-01',
        (SELECT id FROM ration_shops WHERE warehouse_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        100000,
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001'
    );

    SELECT id INTO v_older_batch_id 
    FROM batches 
    WHERE warehouse_id = '11111111-1111-1111-1111-111111111111' 
      AND commodity_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND status = 'AVAILABLE'
    ORDER BY received_date ASC, id ASC
    LIMIT 1;

    SELECT id INTO v_newer_batch_id 
    FROM batches 
    WHERE warehouse_id = '11111111-1111-1111-1111-111111111111' 
      AND commodity_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND status = 'AVAILABLE'
      AND id <> v_older_batch_id
    ORDER BY received_date DESC, id DESC
    LIMIT 1;

    -- Validate manual selection of newer batch
    v_val_res := validate_manual_override(v_req_id, v_newer_batch_id);

    IF (v_val_res->>'allowed')::boolean IS TRUE THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Manual override was allowed without an approved exception!';
    END IF;

    IF v_val_res->>'error_code' <> 'BS002' THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Expected error code BS002, got: %', v_val_res->>'error_code';
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: FIFO deviation detected and BS002 warning returned: %', v_val_res->>'message';
END $$;

-- Test 2: Maker-Checker Constraint on fifo_exceptions (CHECK requested_by <> approved_by)
DO $$
DECLARE
    v_exc_id UUID := gen_random_uuid();
    v_req_id UUID;
    v_batch1 UUID;
    v_batch2 UUID;
    v_user_id UUID := 'u0000001-0000-0000-0000-000000000001';
BEGIN
    SELECT id INTO v_req_id FROM dispatch_requests LIMIT 1;
    SELECT id INTO v_batch1 FROM batches LIMIT 1;
    SELECT id INTO v_batch2 FROM batches WHERE id <> v_batch1 LIMIT 1;

    BEGIN
        INSERT INTO fifo_exceptions (
            id, request_id, skipped_batch_id, chosen_batch_id,
            reason_code, reason_text, requested_by, approved_by, status
        ) VALUES (
            v_exc_id, v_req_id, v_batch1, v_batch2,
            'STACK_COLLAPSE_RISK', 'Cannot access bottom stack safely',
            v_user_id, v_user_id, -- SAME USER (Maker == Checker)
            'APPROVED'
        );
        RAISE EXCEPTION 'TEST 2 FAILED: Maker-checker violation allowed on INSERT!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'TEST 2 PASSED: Table CHECK constraint blocked self-approval on fifo_exceptions (BS004).';
    END;
END $$;

ROLLBACK;
