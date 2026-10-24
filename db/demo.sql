-- ============================================================================
-- BhandarSetu: End-to-End PDS Godown Demonstration Script
-- Scenarios:
-- 1. Inward Logistics: Receive new grain consignment (Goods Receipt + Batch Creation)
-- 2. Multi-Batch FIFO Dispatch: Request spanning multiple batches (integer gram precision)
-- 3. Stock Shortfall Handling: Request exceeding available inventory (blocked, exact deficit reported)
-- 4. Quality Hold Lockout: DB-level hard block preventing allocation/movement of quarantined grain
-- 5. FIFO Skip & Maker-Checker Exception Workflow:
--    - Violation detected -> Exception logged -> Maker-Checker approval -> Dispatch authorized
-- 6. Forensic Audit & Cryptographic Ledger Verification:
--    - Complete provenance trace (Receipt -> Batch -> Allocation -> Movement)
--    - SHA-256 hash-chain verification routine execution
-- 7. Emergency Quality Recall & Downstream Ration Shop Forward Trace:
--    - Quarantines batch, traces all affected ration shops that received stock
-- 8. Predictive Expiry Risk & Transit Loss Reconciliation:
--    - Proactive expiry warnings, shrinkage vs moisture tolerance analysis
-- ============================================================================

\echo '========================================================================'
\echo 'BHANDARSETU: PDS FIFO ALLOCATION & TRACEABLE DISPATCH DEMONSTRATION'
\echo '========================================================================'

-- ----------------------------------------------------------------------------
-- STEP 1: Inward Logistics - Receive New Stock Consignment
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 1: Recording Goods Receipt & Creating New Grain Batch...'

DO $$
DECLARE
    v_gr_id UUID := gen_random_uuid();
    v_batch_id UUID := gen_random_uuid();
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111'; -- Nagpur Godown
    v_comm_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- Wheat Grade A
    v_emp_id UUID := 'u0000001-0000-0000-0000-000000000001'; -- emp_ramesh
    v_qty_g BIGINT := 2000000; -- 2,000 kg (20 Quintals)
BEGIN
    -- 1. Inward Goods Receipt record
    INSERT INTO goods_receipts (
        id, receipt_no, warehouse_id, supplier_source, vehicle_no, 
        document_ref, received_by, received_at
    ) VALUES (
        v_gr_id, 'GR-2026-DEMO-01', v_wh_id, 'Punjab State Grains Pool', 'PB-10-CZ-4040',
        'CHALLAN/FCI/2026/778', v_emp_id, CURRENT_TIMESTAMP
    );

    -- 2. Batch Creation (initial balance 0)
    INSERT INTO batches (
        id, batch_no, receipt_id, commodity_id, warehouse_id,
        received_date, expiry_date, received_qty_g, current_qty_g,
        status
    ) VALUES (
        v_batch_id, 'BATCH-DEMO-WHT-01', v_gr_id, v_comm_id, v_wh_id,
        CURRENT_DATE, (CURRENT_DATE + INTERVAL '365 days')::DATE, v_qty_g, 0,
        'AVAILABLE'
    );

    -- 3. Inward Stock Movement (single source of truth: ledger drives batch balance)
    INSERT INTO stock_movements (
        movement_type, batch_id, qty_delta_g, ref_type, ref_id, created_by
    ) VALUES (
        'RECEIPT', v_batch_id, v_qty_g, 'GOODS_RECEIPT', v_gr_id, v_emp_id
    );

    RAISE NOTICE 'SUCCESS: Consignment received. Batch BATCH-DEMO-WHT-01 created with 2,000 kg.';
END $$;

-- Verify Batch was updated by trigger
SELECT batch_no, received_date, round(received_qty_g / 1000.0, 2) AS received_kg, 
       round(current_qty_g / 1000.0, 2) AS current_balance_kg, status
FROM batches 
WHERE batch_no = 'BATCH-DEMO-WHT-01';


-- ----------------------------------------------------------------------------
-- STEP 2: Dispatch to Ration Shop (Multi-Batch FIFO Split)
-- Ration Shop FPS-NGP-101 requests 1,200 kg of Wheat Grade A.
-- Expected FIFO behavior:
-- 1. Batch 1 (BATCH-WHT-2026-001, oldest): has 400 kg -> 400 kg allocated (batch becomes EXHAUSTED)
-- 2. Batch 2 (BATCH-WHT-2026-002, next): has 600 kg -> 600 kg allocated (batch becomes EXHAUSTED)
-- 3. Batch 3 (BATCH-WHT-2026-003, next): has 1,200 kg -> 200 kg allocated (1,000 kg balance remains)
-- Total = 400 + 600 + 200 = 1,200 kg. Zero rounding error!
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 2: Dispatching 1,200 kg Wheat across Oldest Eligible Batches (FIFO Split)...'

DO $$
DECLARE
    v_req_id UUID := 'd0000001-0000-0000-0000-000000000001';
    v_preview_res JSONB;
    v_confirm_res JSONB;
BEGIN
    -- 1. Create Dispatch Request
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id, 
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'DSP-DEMO-2026-001', 'IDEMP-DSP-DEMO-001',
        's0000001-0000-0000-0000-000000000001', -- FPS-NGP-101
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Wheat Grade A
        '11111111-1111-1111-1111-111111111111', -- Nagpur Godown
        1200000, -- 1,200 kg
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001'
    );

    -- 2. Dry run preview
    v_preview_res := allocate_fifo(v_req_id, true, false);
    RAISE NOTICE 'FIFO Allocation Plan Preview: %', jsonb_pretty(v_preview_res->'allocations');

    -- 3. Confirm execution
    v_confirm_res := allocate_fifo(v_req_id, false, false);
    RAISE NOTICE 'Dispatch Execution Result: %', v_confirm_res->>'message';
END $$;

-- Verify Allocations and Batch Balances
SELECT 
    da.fifo_rank,
    b.batch_no,
    b.received_date,
    round(da.allocated_qty_g / 1000.0, 2) AS allocated_kg,
    round(b.current_qty_g / 1000.0, 2) AS balance_remaining_kg,
    b.status AS batch_status
FROM dispatch_allocations da
JOIN batches b ON da.batch_id = b.id
WHERE da.request_id = 'd0000001-0000-0000-0000-000000000001'
ORDER BY da.fifo_rank ASC;


-- ----------------------------------------------------------------------------
-- STEP 3: Request Exceeding Available Stock (Shortfall Protection)
-- Ration Shop FPS-NGP-102 requests 50,000 kg Wheat (exceeds total godown stock)
-- Expected behavior: Request flagged as SHORTFALL, zero stock movements written.
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 3: Submitting Request Exceeding Available Godown Stock...'

DO $$
DECLARE
    v_req_id UUID := 'd0000002-0000-0000-0000-000000000002';
    v_res JSONB;
BEGIN
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id, 
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'DSP-DEMO-2026-002', 'IDEMP-DSP-DEMO-002',
        's0000002-0000-0000-0000-000000000002', -- FPS-NGP-102
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Wheat Grade A
        '11111111-1111-1111-1111-111111111111',
        50000000, -- 50,000 kg (50 MT)
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001'
    );

    v_res := allocate_fifo(v_req_id, false, false);
    RAISE NOTICE 'Shortfall Response: %', jsonb_pretty(v_res);
END $$;

-- Check shortfall view
SELECT request_no, requested_qty_kg, current_available_qty_kg, shortfall_qty_kg
FROM v_shortfall_requests
WHERE request_no = 'DSP-DEMO-2026-002';


-- ----------------------------------------------------------------------------
-- STEP 4: Quality Hold Lockout Enforcement (Hard DB-Level Barrier)
-- Attempting to dispatch from BATCH-WHT-2026-004-HOLD directly via SQL insert
-- Expected behavior: trg_enforce_batch_available_for_allocation blocks with error.
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 4: Testing DB-Level Block on Quality-Held Stock...'

DO $$
BEGIN
    -- Attempting an illegal direct allocation from a quarantined batch
    INSERT INTO dispatch_allocations (
        request_id, batch_id, allocated_qty_g, fifo_rank
    ) VALUES (
        'd0000001-0000-0000-0000-000000000001',
        'b0000004-0000-0000-0000-000000000004', -- BATCH-WHT-2026-004-HOLD
        50000,
        99
    );
    RAISE EXCEPTION 'CRITICAL FAILURE: Quarantined batch was allocated! Trigger failed.';
EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'SUCCESS: Hard DB-level trigger blocked allocation from QUALITY_HOLD batch!';
END $$;


-- ----------------------------------------------------------------------------
-- STEP 5: FIFO Deviation & Maker-Checker Exception Workflow
-- Employee attempts to manually select BATCH-WHT-2026-005 (newer), skipping
-- BATCH-WHT-2026-003 (older).
-- 1. System detects deviation and demands maker-checker exception.
-- 2. Store employee requests exception with reason.
-- 3. Attempting self-approval is rejected by CHECK constraint.
-- 4. Authorized Officer (appr_deshmukh) approves exception.
-- 5. Dispatch proceeds with authorized override.
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 5: FIFO Deviation & Maker-Checker Exception Workflow...'

DO $$
DECLARE
    v_req_id UUID := 'd0000003-0000-0000-0000-000000000003';
    v_older_batch_id UUID := 'b0000003-0000-0000-0000-000000000003'; -- BATCH-WHT-2026-003
    v_chosen_batch_id UUID := 'b0000005-0000-0000-0000-000000000005'; -- BATCH-WHT-2026-005 (newer)
    v_exc_id UUID := gen_random_uuid();
    v_val_res JSONB;
BEGIN
    -- Create request
    INSERT INTO dispatch_requests (
        id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id, 
        requested_qty_g, status, created_by
    ) VALUES (
        v_req_id, 'DSP-DEMO-2026-003', 'IDEMP-DSP-DEMO-003',
        's0000003-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        500000, -- 500 kg
        'DRAFT',
        'u0000001-0000-0000-0000-000000000001' -- emp_ramesh
    );

    -- 1. Check override validity: older batch exists!
    v_val_res := validate_manual_override(v_req_id, v_chosen_batch_id);
    RAISE NOTICE 'Manual Override Check (Before Exception): %', v_val_res->>'message';

    -- 2. Employee logs FIFO exception request
    INSERT INTO fifo_exceptions (
        id, request_id, skipped_batch_id, chosen_batch_id, reason_code, 
        reason_text, requested_by, status
    ) VALUES (
        v_exc_id, v_req_id, v_older_batch_id, v_chosen_batch_id,
        'PHYSICAL_ACCESS_BLOCKED',
        'Old batch stack temporarily blocked by unloading forklift crane in Godown Bay 2.',
        'u0000001-0000-0000-0000-000000000001', -- emp_ramesh
        'PENDING'
    );

    -- 3. Verify maker-checker rule: requester cannot self-approve!
    BEGIN
        UPDATE fifo_exceptions
        SET status = 'APPROVED', approved_by = 'u0000001-0000-0000-0000-000000000001'
        WHERE id = v_exc_id;
        RAISE EXCEPTION 'Maker-checker failed: Requester self-approved exception!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'SUCCESS: CHECK constraint chk_exception_maker_checker prevented self-approval!';
    END;

    -- 4. Authorized Officer (appr_deshmukh) approves exception
    UPDATE fifo_exceptions
    SET status = 'APPROVED', 
        approved_by = 'u0000004-0000-0000-0000-000000000004',
        decided_at = CURRENT_TIMESTAMP
    WHERE id = v_exc_id;

    -- 5. Re-check override validity: now authorized!
    v_val_res := validate_manual_override(v_req_id, v_chosen_batch_id);
    RAISE NOTICE 'Manual Override Check (After Approval): %', v_val_res->>'message';
END $$;

-- View exception audit trail
SELECT request_no, skipped_batch_no, chosen_batch_no, reason_code, 
       requester_name, approver_name, authorization_state
FROM v_fifo_violations
WHERE request_no = 'DSP-DEMO-2026-003';


-- ----------------------------------------------------------------------------
-- STEP 6: Full Audit Trace & Cryptographic Ledger Verification
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 6: End-to-End Traceability & Cryptographic Ledger Verification...'

-- 1. Full JSON Trace of Dispatch 1
SELECT jsonb_pretty(trace_dispatch('DSP-DEMO-2026-001'));

-- 2. Verify Balance Mismatch (Must return 0 rows)
\echo '\nChecking Zero-Discrepancy Invariant (v_balance_mismatch):'
SELECT * FROM v_balance_mismatch;

-- 3. Cryptographic Hash-Chain Verification
\echo '\nRunning verify_ledger_chain():'
SELECT * FROM verify_ledger_chain();


-- ----------------------------------------------------------------------------
-- STEP 7: Emergency Quality Recall & Downstream Ration Shop Forward Trace
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 7: Simulating Emergency Batch Recall & Downstream Shop Trace...'

DO $$
DECLARE
    v_recall_batch_id UUID := 'b0000001-0000-0000-0000-000000000001'; -- BATCH-WHT-2026-001
    v_officer_id UUID := 'u0000003-0000-0000-0000-000000000003'; -- qo_priya
    v_recall_res JSONB;
BEGIN
    v_recall_res := initiate_recall(
        v_recall_batch_id,
        'Severe aflatoxin contamination reported from regional laboratory testing.',
        v_officer_id
    );
    RAISE NOTICE 'Recall Result: %', jsonb_pretty(v_recall_res);
END $$;


-- ----------------------------------------------------------------------------
-- STEP 8: Predictive Expiry Risk & Transit Loss Reconciliation
-- ----------------------------------------------------------------------------
\echo '\n>>> STEP 8: Predictive Expiry Risk Analysis & Transit Loss Reconciliation...'

-- 1. Predictive Expiry Risk Report
\echo '\nPredictive Expiry Risk Analysis (Next 60 Days):'
SELECT * FROM predict_expiry_risk('11111111-1111-1111-1111-111111111111');

-- 2. Transit Loss Reconciliation vs Commodity Tolerance
\echo '\nTransit Loss & Variance Audit vs Tolerance Thresholds:'
SELECT request_no, fps_code, commodity_name, dispatched_kg, received_kg, transit_loss_kg, loss_pct, default_tolerance_pct, audit_flag
FROM v_transit_loss;

\echo '\n========================================================================'
\echo 'DEMONSTRATION COMPLETED SUCCESSFULLY'
\echo '========================================================================'
