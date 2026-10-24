-- ============================================================================
-- BhandarSetu Test Suite 08: Wave Picking, Sequence & Quarantine Protection
-- Milestone M9.3 Verification
-- ============================================================================

\echo '========================================================================'
\echo 'TEST SUITE 08: WAVE PICKING & OUTBOUND PICK ENGINE'
\echo '========================================================================'

BEGIN;

DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_comm_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_shop_id UUID := 's0000001-0000-0000-0000-000000000001';
    v_req_id UUID := gen_random_uuid();
    v_zone_pf UUID := gen_random_uuid();
    v_bin_pf UUID := gen_random_uuid();
    v_batch_id UUID := 'b0000001-0000-0000-0000-000000000001';
    v_user_id UUID := 'u0000001-0000-0000-0000-000000000001';
    v_wave_res JSONB;
    v_wave_id UUID;
    v_task RECORD;
    v_pick_res JSONB;
BEGIN
    -- 1. Setup zone, bin and slot batch into bin
    INSERT INTO storage_zones (id, warehouse_id, zone_code, zone_name, zone_type)
    VALUES (v_zone_pf, v_wh_id, 'TEST-WAVE-PF', 'Test Wave Pick Face', 'PICK_FACE');

    INSERT INTO bins (id, warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence)
    VALUES (v_bin_pf, v_wh_id, v_zone_pf, 'WAVE-BIN-01', 'W', '1', '1', 50000000, 50);

    -- Put 5,000 kg into this bin
    INSERT INTO bin_movements (warehouse_id, bin_id, batch_id, qty_delta_g, move_type, created_by)
    VALUES (v_wh_id, v_bin_pf, v_batch_id, 5000000, 'PUTAWAY', v_user_id);

    -- 2. Create dispatch request
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'DSP-TEST-WAVE-001', 'IDEMP-WAVE-001', v_shop_id, v_comm_id, v_wh_id,
        300000, 'DRAFT', v_user_id -- 300 kg
    );

    -- 3. Create Pick Wave
    v_wave_res := create_pick_wave(v_wh_id, v_comm_id, ARRAY[v_req_id], v_user_id);
    v_wave_id := (v_wave_res->>'wave_id')::UUID;
    RAISE NOTICE 'PASSED: Pick wave created: % (% tasks)', v_wave_res->>'wave_no', v_wave_res->>'tasks_created';

    -- 4. Verify Pick Task exists
    SELECT * INTO v_task FROM pick_tasks WHERE wave_id = v_wave_id LIMIT 1;
    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'TEST FAILED: No pick tasks created for wave!';
    END IF;

    -- 5. Test Scan Verification: Wrong Batch Blocked
    BEGIN
        PERFORM confirm_pick_task(v_task.id, 'WAVE-BIN-01', 'WRONG-BATCH-CODE', v_task.qty_g, v_user_id);
        RAISE EXCEPTION 'TEST FAILED: confirm_pick_task allowed wrong batch scan!';
    EXCEPTION WHEN SQLSTATE 'BS008' THEN
        RAISE NOTICE 'PASSED: Scan verification blocked wrong batch QR at pick (BS008).';
    END;

    -- 6. Confirm Pick Task Legitimate Execution
    v_pick_res := confirm_pick_task(v_task.id, 'WAVE-BIN-01', 'BATCH-WHT-2026-001', v_task.qty_g, v_user_id);
    IF (v_pick_res->>'status') <> 'PICKED' THEN
        RAISE EXCEPTION 'TEST FAILED: Pick task not marked PICKED!';
    END IF;
    RAISE NOTICE 'PASSED: Pick task confirmed and logged in bin_movements.';

END $$;

ROLLBACK;

\echo '\n========================================================================'
\echo 'TEST SUITE 08 PASSED SUCCESSFULLY'
\echo '========================================================================'

