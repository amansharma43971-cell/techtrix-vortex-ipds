-- ============================================================================
-- Test Suite 03: Quality Inspections, Holds, Releases & Recalls
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M3 Test Verification
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Test 1: Place Hold & Block Dispatch Allocation at Database Trigger Level (BS001)
DO $$
DECLARE
    v_batch_id UUID;
    v_hold_id UUID;
    v_req_id UUID := gen_random_uuid();
    v_officer_id UUID := 'u0000003-0000-0000-0000-000000000003'; -- Dr. Anita Rao
BEGIN
    SELECT id INTO v_batch_id FROM batches WHERE status = 'AVAILABLE' LIMIT 1;

    -- Place Hold
    v_hold_id := place_quality_hold(v_batch_id, 'Test insect infestation', v_officer_id);

    IF (SELECT status FROM batches WHERE id = v_batch_id) <> 'QUALITY_HOLD' THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Batch status did not change to QUALITY_HOLD!';
    END IF;

    -- Attempt to insert allocation directly
    BEGIN
        INSERT INTO dispatch_allocations (
            request_id, batch_id, allocated_qty_g, fifo_rank
        ) VALUES (
            v_req_id, v_batch_id, 10000, 1
        );
        RAISE EXCEPTION 'TEST 1 FAILED: DB trigger failed to block held batch allocation!';
    EXCEPTION WHEN restrict_violation THEN
        RAISE NOTICE 'TEST 1 PASSED: Hard stop trigger blocked held batch from dispatch allocation (BS001).';
    END;
END $$;

-- Test 2: Maker-Checker Enforcement on Quality Release
DO $$
DECLARE
    v_batch_id UUID;
    v_hold_id UUID;
    v_officer_id UUID := 'u0000003-0000-0000-0000-000000000003';
    v_approver_id UUID := 'u0000004-0000-0000-0000-000000000004';
BEGIN
    SELECT id INTO v_batch_id FROM batches WHERE status = 'AVAILABLE' LIMIT 1;
    v_hold_id := place_quality_hold(v_batch_id, 'Moisture test hold', v_officer_id);

    -- Request Release
    PERFORM request_quality_release(v_hold_id, 'Re-testing shows moisture at acceptable 10.5%', v_officer_id);

    -- Attempt Self-Approval (Same user who requested release)
    BEGIN
        PERFORM approve_quality_release(v_hold_id, v_officer_id);
        RAISE EXCEPTION 'TEST 2 FAILED: Requester was able to self-approve release!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'TEST 2.1 PASSED: Self-approval correctly rejected by maker-checker rule (BS004).';
    END;

    -- Legitimate Approval by Different Officer
    PERFORM approve_quality_release(v_hold_id, v_approver_id);

    IF (SELECT status FROM quality_holds WHERE id = v_hold_id) <> 'RELEASED' THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Quality hold was not set to RELEASED!';
    END IF;

    IF (SELECT status FROM batches WHERE id = v_batch_id) <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Batch was not restored to AVAILABLE status!';
    END IF;

    RAISE NOTICE 'TEST 2.2 PASSED: Quality release approved by distinct approver; batch restored to AVAILABLE.';
END $$;

-- Test 3: Emergency Recall Initiation and Forward Trace Generation
DO $$
DECLARE
    v_batch_id UUID;
    v_officer_id UUID := 'u0000003-0000-0000-0000-000000000003';
    v_recall_res JSONB;
BEGIN
    SELECT id INTO v_batch_id FROM batches WHERE status = 'AVAILABLE' LIMIT 1;

    v_recall_res := initiate_recall(v_batch_id, 'Chemical residue exceeds MRL limit', v_officer_id);

    IF (SELECT status FROM batches WHERE id = v_batch_id) <> 'QUARANTINED_RECALL' THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Batch status not set to QUARANTINED_RECALL!';
    END IF;

    IF v_recall_res->>'recall_ref' IS NULL THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Recall reference was not generated!';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: Emergency recall generated forward trace profile: %', v_recall_res->>'recall_ref';
END $$;

ROLLBACK;
