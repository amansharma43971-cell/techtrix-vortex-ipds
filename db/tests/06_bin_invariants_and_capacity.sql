-- ============================================================================
-- BhandarSetu Test Suite 06: Bin Layer Invariants, Capacity & Quarantine Guard
-- Milestone M9.1 Verification
-- ============================================================================

\echo '========================================================================'
\echo 'TEST SUITE 06: LOCATION & BIN LAYER INVARIANTS'
\echo '========================================================================'

BEGIN;

-- 1. Setup Test Storage Zones & Bins
DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_zone_bulk UUID := gen_random_uuid();
    v_zone_quar UUID := gen_random_uuid();
    v_bin_bulk UUID := gen_random_uuid();
    v_bin_quar UUID := gen_random_uuid();
    v_batch_id UUID := 'b0000001-0000-0000-0000-000000000001';
    v_user_id UUID := 'u0000001-0000-0000-0000-000000000001';
BEGIN
    -- Create zones
    INSERT INTO storage_zones (id, warehouse_id, zone_code, zone_name, zone_type)
    VALUES 
        (v_zone_bulk, v_wh_id, 'TEST-BULK', 'Test Bulk Zone', 'BULK'),
        (v_zone_quar, v_wh_id, 'TEST-QUAR', 'Test Quarantine Zone', 'QUARANTINE');

    -- Create bins
    INSERT INTO bins (id, warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence)
    VALUES
        (v_bin_bulk, v_wh_id, v_zone_bulk, 'TBIN-B01', 'A', '1', '1', 5000000, 100), -- 5,000 kg capacity
        (v_bin_quar, v_wh_id, v_zone_quar, 'TBIN-Q01', 'Q', '1', '1', 5000000, 999); -- Quarantine bin

    -- A. Test Legitimate Putaway into Bulk Bin
    INSERT INTO bin_movements (warehouse_id, bin_id, batch_id, qty_delta_g, move_type, created_by)
    VALUES (v_wh_id, v_bin_bulk, v_batch_id, 2000000, 'PUTAWAY', v_user_id); -- 2,000 kg

    -- Verify bin_inventory was populated automatically by trigger
    IF NOT EXISTS (SELECT 1 FROM bin_inventory WHERE bin_id = v_bin_bulk AND batch_id = v_batch_id AND qty_g = 2000000) THEN
        RAISE EXCEPTION 'TEST FAILED: bin_inventory was not updated by bin_movements trigger!';
    END IF;
    RAISE NOTICE 'PASSED: Putaway movement successfully updated bin_inventory (2,000 kg).';

    -- B. Test Capacity Guard: Attempt to putaway 4,000 kg more (2,000 + 4,000 = 6,000 kg > 5,000 kg capacity)
    BEGIN
        INSERT INTO bin_movements (warehouse_id, bin_id, batch_id, qty_delta_g, move_type, created_by)
        VALUES (v_wh_id, v_bin_bulk, v_batch_id, 4000000, 'PUTAWAY', v_user_id);
        RAISE EXCEPTION 'TEST FAILED: Capacity guard failed to block overflow!';
    EXCEPTION WHEN SQLSTATE 'BS006' THEN
        RAISE NOTICE 'PASSED: Capacity guard successfully blocked overflow (BS006).';
    END;

    -- C. Test Quarantine Pick Block: Stock in quarantine cannot be picked!
    -- First, transfer into quarantine bin
    INSERT INTO bin_movements (warehouse_id, bin_id, batch_id, qty_delta_g, move_type, created_by)
    VALUES (v_wh_id, v_bin_quar, v_batch_id, 1000000, 'QUARANTINE_MOVE', v_user_id);

    -- Attempt to execute a PICK from quarantine bin
    BEGIN
        INSERT INTO bin_movements (warehouse_id, bin_id, batch_id, qty_delta_g, move_type, created_by)
        VALUES (v_wh_id, v_bin_quar, v_batch_id, -500000, 'PICK', v_user_id);
        RAISE EXCEPTION 'TEST FAILED: Quarantine pick guard failed to block pick from quarantine zone!';
    EXCEPTION WHEN SQLSTATE 'BS001' THEN
        RAISE NOTICE 'PASSED: Quarantine pick guard successfully blocked pick from quarantine zone (BS001).';
    END;

    -- D. Test Direct Mutation Block on bin_inventory
    BEGIN
        UPDATE bin_inventory SET qty_g = 9999999 WHERE bin_id = v_bin_bulk;
        RAISE EXCEPTION 'TEST FAILED: Direct update to bin_inventory was permitted!';
    EXCEPTION WHEN SQLSTATE '55000' THEN
        RAISE NOTICE 'PASSED: Direct mutation on bin_inventory successfully blocked.';
    END;

END $$;

ROLLBACK;

\echo '\n========================================================================'
\echo 'TEST SUITE 06 PASSED SUCCESSFULLY'
\echo '========================================================================'

