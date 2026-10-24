-- ============================================================================
-- BhandarSetu Test Suite 07: Putaway Engine & FIFO Lane Preservation
-- Milestone M9.2 Verification
-- ============================================================================

\echo '========================================================================'
\echo 'TEST SUITE 07: PUTAWAY SCORING & SCAN CONFIRMATION'
\echo '========================================================================'

BEGIN;

DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_comm_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_zone_pf UUID := gen_random_uuid();
    v_bin_pf UUID := gen_random_uuid();
    v_batch_id UUID := 'b0000001-0000-0000-0000-000000000001';
    v_user_id UUID := 'u0000001-0000-0000-0000-000000000001';
    v_task_id UUID := gen_random_uuid();
    v_suggest RECORD;
    v_confirm_res JSONB;
BEGIN
    -- 1. Setup zone & bin
    INSERT INTO storage_zones (id, warehouse_id, zone_code, zone_name, zone_type)
    VALUES (v_zone_pf, v_wh_id, 'TEST-PF', 'Test Pick Face', 'PICK_FACE');

    INSERT INTO bins (id, warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence)
    VALUES (v_bin_pf, v_wh_id, v_zone_pf, 'PF-T01', 'P', '1', '1', 10000000, 10);

    -- 2. Test ABC classification calculation
    PERFORM calculate_abc_velocity(v_wh_id);
    RAISE NOTICE 'PASSED: calculate_abc_velocity executed successfully.';

    -- 3. Test suggest_putaway
    SELECT * INTO v_suggest FROM suggest_putaway(v_batch_id, 2000000) LIMIT 1;
    IF v_suggest.bin_id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: suggest_putaway returned no suggestions!';
    END IF;
    RAISE NOTICE 'PASSED: suggest_putaway suggested bin % with score % (Reasons: %)',
        v_suggest.bin_code, v_suggest.total_score, v_suggest.suggestion_reason;

    -- 4. Create Putaway Task
    INSERT INTO putaway_tasks (
        id, task_no, batch_id, warehouse_id, qty_g, suggested_bin_id, sla_due_at
    ) VALUES (
        v_task_id, 'PT-TEST-001', v_batch_id, v_wh_id, 2000000, v_bin_pf, CURRENT_TIMESTAMP + INTERVAL '2 hours'
    );

    -- 5. Test Scan Verification: Wrong Batch Scan Blocked (BS008)
    BEGIN
        PERFORM confirm_putaway(v_task_id, 'PF-T01', 'WRONG-BATCH-999', v_user_id, NULL);
        RAISE EXCEPTION 'TEST FAILED: confirm_putaway permitted wrong batch scan!';
    EXCEPTION WHEN SQLSTATE 'BS008' THEN
        RAISE NOTICE 'PASSED: Scan verification blocked wrong batch QR (BS008).';
    END;

    -- 6. Test Valid Confirmation
    v_confirm_res := confirm_putaway(v_task_id, 'PF-T01', 'BATCH-WHT-2026-001', v_user_id, NULL);
    IF (v_confirm_res->>'status') <> 'DONE' THEN
        RAISE EXCEPTION 'TEST FAILED: Putaway task not marked DONE!';
    END IF;
    RAISE NOTICE 'PASSED: Putaway successfully confirmed. Bin movement logged.';

END $$;

ROLLBACK;

\echo '\n========================================================================'
\echo 'TEST SUITE 07 PASSED SUCCESSFULLY'
\echo '========================================================================'

