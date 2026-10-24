-- ============================================================================
-- Migration 004: Quality Assurance, Recalls, Reconciliation & Traceability
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestones M3-M6 Deliverable
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Quality Inspections & Quarantine Holds (Full & Partial)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    sample_ref VARCHAR(100) NOT NULL,
    tested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    result inspection_result NOT NULL,
    lab_report_ref VARCHAR(255),
    notes TEXT,
    tested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quality_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    held_qty_g BIGINT NOT NULL, -- Supports partial quantity holds
    reason TEXT NOT NULL,
    placed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    release_requested_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    release_reason TEXT,
    release_approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    released_at TIMESTAMPTZ,
    status quality_hold_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_hold_qty_pos CHECK (held_qty_g > 0),
    CONSTRAINT chk_hold_maker_checker CHECK (
        release_approved_by IS NULL OR 
        (release_requested_by IS NOT NULL AND release_requested_by <> release_approved_by)
    )
);

-- Trigger: FAIL inspection automatically places batch on hold
CREATE OR REPLACE FUNCTION fn_auto_hold_on_failed_inspection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.result = 'FAIL' THEN
        INSERT INTO quality_holds (batch_id, held_qty_g, reason, placed_by)
        SELECT NEW.batch_id, current_qty_g, 'AUTOMATIC HOLD: Quality Inspection Failed (' || COALESCE(NEW.notes, 'Below FAQ standards') || ')', NEW.tested_by
        FROM batches
        WHERE id = NEW.batch_id;

        UPDATE batches 
        SET status = 'QUALITY_HOLD',
            held_qty_g = current_qty_g
        WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_hold_on_inspection ON quality_inspections;
CREATE TRIGGER trg_auto_hold_on_inspection
AFTER INSERT ON quality_inspections
FOR EACH ROW EXECUTE FUNCTION fn_auto_hold_on_failed_inspection();

-- Trigger: Hard Stop: Prohibit dispatch of held stock (SQLSTATE BS001)
CREATE OR REPLACE FUNCTION fn_enforce_hold_quarantine()
RETURNS TRIGGER AS $$
DECLARE
    v_b RECORD;
BEGIN
    SELECT status, current_qty_g, held_qty_g, batch_no 
    INTO v_b
    FROM batches
    WHERE id = NEW.batch_id;

    IF v_b.status IN ('QUALITY_HOLD', 'QUARANTINED_RECALL', 'EXPIRED') THEN
        RAISE EXCEPTION 'BS001: Batch % is in % status. Dispatch is strictly blocked by database integrity trigger.',
            v_b.batch_no, v_b.status
            USING ERRCODE = 'restrict_violation';
    END IF;

    IF NEW.allocated_qty_g > (v_b.current_qty_g - v_b.held_qty_g) THEN
        RAISE EXCEPTION 'BS001: Allocated quantity (% g) exceeds unheld available stock (% g) for batch %.',
            NEW.allocated_qty_g, (v_b.current_qty_g - v_b.held_qty_g), v_b.batch_no
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_hold_quarantine ON dispatch_allocations;
CREATE TRIGGER trg_enforce_hold_quarantine
BEFORE INSERT ON dispatch_allocations
FOR EACH ROW EXECUTE FUNCTION fn_enforce_hold_quarantine();

-- ----------------------------------------------------------------------------
-- 2. Quality Hold Helper Procedures
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION place_quality_hold(
    p_batch_id UUID,
    p_reason TEXT,
    p_placed_by UUID,
    p_held_qty_g BIGINT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_hold_id UUID := gen_random_uuid();
    v_cur_qty BIGINT;
    v_effective_held BIGINT;
    v_new_status batch_status;
BEGIN
    SELECT current_qty_g INTO v_cur_qty FROM batches WHERE id = p_batch_id;
    v_effective_held := COALESCE(p_held_qty_g, v_cur_qty);

    IF v_effective_held >= v_cur_qty THEN
        v_new_status := 'QUALITY_HOLD'::batch_status;
    ELSE
        v_new_status := 'PARTIAL_HOLD'::batch_status;
    END IF;

    INSERT INTO quality_holds (id, batch_id, held_qty_g, reason, placed_by)
    VALUES (v_hold_id, p_batch_id, v_effective_held, p_reason, p_placed_by);

    UPDATE batches 
    SET status = v_new_status,
        held_qty_g = v_effective_held,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_batch_id;

    INSERT INTO stock_movements (
        movement_type, batch_id, qty_delta_g, balance_after_g,
        ref_type, ref_id, reason_code, created_by
    ) VALUES (
        'HOLD', p_batch_id, 0, v_cur_qty,
        'QUALITY_HOLD', v_hold_id, 'LAB_QUARANTINE', p_placed_by
    );

    RETURN v_hold_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION request_quality_release(
    p_hold_id UUID,
    p_reason TEXT,
    p_requested_by UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE quality_holds
    SET status = 'RELEASE_PENDING',
        release_requested_by = p_requested_by,
        release_reason = p_reason
    WHERE id = p_hold_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active quality hold % not found.', p_hold_id
            USING ERRCODE = 'data_exception';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION approve_quality_release(
    p_hold_id UUID,
    p_approved_by UUID
) RETURNS VOID AS $$
DECLARE
    v_hold RECORD;
BEGIN
    SELECT * INTO v_hold FROM quality_holds WHERE id = p_hold_id;

    IF v_hold.id IS NULL THEN
        RAISE EXCEPTION 'Hold % not found.', p_hold_id USING ERRCODE = 'data_exception';
    END IF;

    IF v_hold.release_requested_by = p_approved_by THEN
        RAISE EXCEPTION 'BS004: Maker-checker violation. Release approver cannot be the same user who requested the release.'
            USING ERRCODE = 'check_violation';
    END IF;

    UPDATE quality_holds
    SET status = 'RELEASED',
        release_approved_by = p_approved_by,
        released_at = CURRENT_TIMESTAMP
    WHERE id = p_hold_id;

    UPDATE batches
    SET status = 'AVAILABLE',
        held_qty_g = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_hold.batch_id;

    INSERT INTO stock_movements (
        movement_type, batch_id, qty_delta_g, balance_after_g,
        ref_type, ref_id, reason_code, created_by
    ) SELECT 
        'RELEASE', v_hold.batch_id, 0, current_qty_g,
        'QUALITY_HOLD', p_hold_id, 'INSPECTION_CLEARED', p_approved_by
    FROM batches WHERE id = v_hold.batch_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Recall & Forward Trace Engine
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recalls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    recall_ref VARCHAR(100) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

CREATE OR REPLACE FUNCTION initiate_recall(
    p_batch_id UUID,
    p_reason TEXT,
    p_initiated_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_recall_id UUID := gen_random_uuid();
    v_recall_ref VARCHAR(100);
    v_b RECORD;
    v_affected_shops JSONB;
BEGIN
    SELECT batch_no, current_qty_g INTO v_b FROM batches WHERE id = p_batch_id;
    v_recall_ref := 'RCL-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(md5(v_recall_id::text), 1, 6);

    -- 1. Quarantine remaining stock in warehouse
    UPDATE batches 
    SET status = 'QUARANTINED_RECALL',
        held_qty_g = current_qty_g,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_batch_id;

    INSERT INTO recalls (id, batch_id, recall_ref, reason, initiated_by)
    VALUES (v_recall_id, p_batch_id, v_recall_ref, p_reason, p_initiated_by);

    -- 2. Trace all shops that received stock from this batch (Forward Trace)
    SELECT jsonb_agg(
        jsonb_build_object(
            'dispatch_no', dr.request_no,
            'dispatched_at', dr.dispatched_at,
            'shop_fps_code', rs.fps_code,
            'shop_name', rs.owner_name,
            'district', rs.district,
            'allocated_qty_kg', round(da.allocated_qty_g / 1000.0, 3),
            'vehicle_no', dr.vehicle_no,
            'gate_pass_no', dr.gate_pass_no
        )
    ) INTO v_affected_shops
    FROM dispatch_allocations da
    JOIN dispatch_requests dr ON da.request_id = dr.id
    JOIN ration_shops rs ON dr.shop_id = rs.id
    WHERE da.batch_id = p_batch_id;

    RETURN jsonb_build_object(
        'recall_id', v_recall_id,
        'recall_ref', v_recall_ref,
        'batch_id', p_batch_id,
        'batch_no', v_b.batch_no,
        'remaining_stock_quarantined_kg', round(v_b.current_qty_g / 1000.0, 3),
        'total_dispatches_affected', COALESCE(jsonb_array_length(v_affected_shops), 0),
        'affected_shops', COALESCE(v_affected_shops, '[]'::jsonb),
        'initiated_at', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. Reconciliation, Physical Verifications & Transit Loss
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS physical_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    session_no VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    verified_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS verification_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES physical_verifications(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    system_qty_g BIGINT NOT NULL,
    counted_qty_g BIGINT NOT NULL,
    variance_g BIGINT NOT NULL, -- counted - system
    variance_reason_code variance_reason NOT NULL DEFAULT 'MOISTURE_LOSS',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS dispatch_receipts_at_shop (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES dispatch_requests(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES ration_shops(id) ON DELETE RESTRICT,
    dispatched_qty_g BIGINT NOT NULL,
    received_qty_g BIGINT NOT NULL,
    transit_loss_g BIGINT NOT NULL, -- dispatched - received
    confirmed_by VARCHAR(150) NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW v_transit_loss AS
SELECT 
    drs.id AS receipt_id,
    dr.request_no,
    w.name AS godown_name,
    rs.fps_code,
    rs.owner_name AS shop_name,
    c.name AS commodity_name,
    round(drs.dispatched_qty_g / 1000.0, 3) AS dispatched_kg,
    round(drs.received_qty_g / 1000.0, 3) AS received_kg,
    round(drs.transit_loss_g / 1000.0, 3) AS transit_loss_kg,
    round((drs.transit_loss_g::numeric / drs.dispatched_qty_g::numeric) * 100.0, 2) AS loss_pct,
    c.default_tolerance_pct,
    CASE 
        WHEN (drs.transit_loss_g::numeric / drs.dispatched_qty_g::numeric) * 100.0 > c.default_tolerance_pct 
        THEN 'EXCEEDS_TOLERANCE_INVESTIGATE'
        ELSE 'WITHIN_NORMAL_TOLERANCE'
    END AS audit_flag,
    drs.confirmed_at
FROM dispatch_receipts_at_shop drs
JOIN dispatch_requests dr ON drs.request_id = dr.id
JOIN warehouses w ON dr.warehouse_id = w.id
JOIN ration_shops rs ON drs.shop_id = rs.id
JOIN commodities c ON dr.commodity_id = c.id;

-- ----------------------------------------------------------------------------
-- 5. Governance: Generic Approval Matrix & SLA
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(100) NOT NULL,
    commodity_id UUID REFERENCES commodities(id) ON DELETE RESTRICT,
    min_qty_g BIGINT NOT NULL DEFAULT 0,
    required_role user_role NOT NULL DEFAULT 'SUPERVISOR',
    sla_hours INT NOT NULL DEFAULT 24,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(100) NOT NULL,
    ref_table VARCHAR(100) NOT NULL,
    ref_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    required_role user_role NOT NULL DEFAULT 'SUPERVISOR',
    status exception_status NOT NULL DEFAULT 'PENDING',
    decided_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    decided_at TIMESTAMPTZ,
    sla_due_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_approval_maker_checker CHECK (decided_by IS NULL OR requested_by <> decided_by)
);

-- ----------------------------------------------------------------------------
-- 6. Comprehensive Traceability Views & Functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_dispatch_trace AS
SELECT 
    dr.request_no,
    dr.id AS request_id,
    dr.status AS dispatch_status,
    dr.requested_qty_g,
    round(dr.requested_qty_g / 1000.0, 3) AS requested_qty_kg,
    dr.dispatched_at,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    c.code AS commodity_code,
    c.name AS commodity_name,
    rs.fps_code,
    rs.owner_name AS shop_owner,
    da.fifo_rank,
    da.allocated_qty_g,
    round(da.allocated_qty_g / 1000.0, 3) AS allocated_qty_kg,
    da.was_oldest_eligible,
    b.batch_no,
    b.received_date AS batch_received_date,
    b.expiry_date AS batch_expiry_date,
    b.current_qty_g AS batch_remaining_qty_g,
    gr.receipt_no,
    gr.supplier_source,
    gr.vehicle_no,
    gr.document_ref,
    gr.received_at AS goods_received_at,
    sm.movement_id,
    sm.qty_delta_g,
    sm.balance_after_g,
    sm.row_hash AS movement_row_hash,
    sm.prev_hash AS movement_prev_hash
FROM dispatch_requests dr
JOIN warehouses w ON dr.warehouse_id = w.id
JOIN commodities c ON dr.commodity_id = c.id
JOIN ration_shops rs ON dr.shop_id = rs.id
JOIN dispatch_allocations da ON dr.id = da.request_id
JOIN batches b ON da.batch_id = b.id
JOIN goods_receipts gr ON b.receipt_id = gr.id
LEFT JOIN stock_movements sm ON sm.ref_type = 'DISPATCH_REQUEST' 
                             AND sm.ref_id = dr.id 
                             AND sm.batch_id = b.id;

CREATE OR REPLACE VIEW v_fifo_violations AS
SELECT 
    fe.id AS exception_id,
    fe.request_id,
    dr.request_no,
    dr.status AS dispatch_status,
    sb.batch_no AS skipped_batch_no,
    sb.received_date AS skipped_received_date,
    sb.current_qty_g AS skipped_current_qty_g,
    cb.batch_no AS chosen_batch_no,
    cb.received_date AS chosen_received_date,
    fe.reason_code,
    fe.reason_text,
    fe.status AS exception_status,
    req_u.username AS requester,
    appr_u.username AS approver,
    fe.requested_at,
    fe.decided_at
FROM fifo_exceptions fe
JOIN dispatch_requests dr ON fe.request_id = dr.id
JOIN batches sb ON fe.skipped_batch_id = sb.id
JOIN batches cb ON fe.chosen_batch_id = cb.id
JOIN users req_u ON fe.requested_by = req_u.id
LEFT JOIN users appr_u ON fe.approved_by = appr_u.id;

CREATE OR REPLACE VIEW v_ageing_stock AS
SELECT 
    w.id AS warehouse_id,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    c.id AS commodity_id,
    c.code AS commodity_code,
    c.name AS commodity_name,
    round(SUM(b.current_qty_g) / 1000.0, 3) AS total_stock_kg,
    round(SUM(CASE WHEN (CURRENT_DATE - b.received_date) <= 30 THEN b.current_qty_g ELSE 0 END) / 1000.0, 3) AS age_0_30_days_kg,
    round(SUM(CASE WHEN (CURRENT_DATE - b.received_date) BETWEEN 31 AND 60 THEN b.current_qty_g ELSE 0 END) / 1000.0, 3) AS age_31_60_days_kg,
    round(SUM(CASE WHEN (CURRENT_DATE - b.received_date) BETWEEN 61 AND 90 THEN b.current_qty_g ELSE 0 END) / 1000.0, 3) AS age_61_90_days_kg,
    round(SUM(CASE WHEN (CURRENT_DATE - b.received_date) > 90 THEN b.current_qty_g ELSE 0 END) / 1000.0, 3) AS age_90_plus_days_kg
FROM batches b
JOIN warehouses w ON b.warehouse_id = w.id
JOIN commodities c ON b.commodity_id = c.id
WHERE b.status IN ('AVAILABLE', 'PARTIAL_HOLD') AND b.current_qty_g > 0
GROUP BY w.id, w.code, w.name, c.id, c.code, c.name;

-- ----------------------------------------------------------------------------
-- 7. Stored Procedure: trace_dispatch(request_no) (Backward JSON)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trace_dispatch(p_request_no VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_wh RECORD;
    v_comm RECORD;
    v_shop RECORD;
    v_allocations JSONB;
BEGIN
    SELECT * INTO v_req FROM dispatch_requests WHERE request_no = p_request_no;
    IF v_req.id IS NULL THEN
        RETURN jsonb_build_object('found', false, 'error', 'Dispatch request not found');
    END IF;

    SELECT code, name, district, state INTO v_wh FROM warehouses WHERE id = v_req.warehouse_id;
    SELECT code, name INTO v_comm FROM commodities WHERE id = v_req.commodity_id;
    SELECT fps_code, owner_name, village_ward, district INTO v_shop FROM ration_shops WHERE id = v_req.shop_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'fifo_rank', da.fifo_rank,
            'allocated_qty_kg', round(da.allocated_qty_g / 1000.0, 3),
            'allocated_qty_g', da.allocated_qty_g,
            'was_oldest_eligible', da.was_oldest_eligible,
            'batch', jsonb_build_object(
                'batch_id', b.id,
                'batch_no', b.batch_no,
                'received_date', b.received_date,
                'expiry_date', b.expiry_date,
                'initial_received_qty_kg', round(b.received_qty_g / 1000.0, 3),
                'current_balance_kg', round(b.current_qty_g / 1000.0, 3),
                'status', b.status
            ),
            'goods_receipt', jsonb_build_object(
                'receipt_no', gr.receipt_no,
                'supplier_source', gr.supplier_source,
                'vehicle_no', gr.vehicle_no,
                'document_ref', gr.document_ref,
                'received_at', gr.received_at
            ),
            'ledger_movement', jsonb_build_object(
                'movement_id', sm.movement_id,
                'qty_delta_g', sm.qty_delta_g,
                'balance_after_g', sm.balance_after_g,
                'prev_hash', sm.prev_hash,
                'row_hash', sm.row_hash
            )
        ) ORDER BY da.fifo_rank
    ) INTO v_allocations
    FROM dispatch_allocations da
    JOIN batches b ON da.batch_id = b.id
    JOIN goods_receipts gr ON b.receipt_id = gr.id
    LEFT JOIN stock_movements sm ON sm.ref_type = 'DISPATCH_REQUEST' 
                                AND sm.ref_id = v_req.id 
                                AND sm.batch_id = b.id
    WHERE da.request_id = v_req.id;

    RETURN jsonb_build_object(
        'found', true,
        'dispatch_request', jsonb_build_object(
            'id', v_req.id,
            'request_no', v_req.request_no,
            'status', v_req.status,
            'requested_qty_kg', round(v_req.requested_qty_g / 1000.0, 3),
            'dispatched_at', v_req.dispatched_at,
            'vehicle_no', v_req.vehicle_no,
            'gate_pass_no', v_req.gate_pass_no
        ),
        'commodity', row_to_json(v_comm),
        'godown', row_to_json(v_wh),
        'ration_shop', row_to_json(v_shop),
        'traceable_allocations', COALESCE(v_allocations, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 8. Predictive Expiry Risk Routine
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION predict_expiry_risk(p_warehouse_id UUID DEFAULT NULL)
RETURNS TABLE (
    batch_no VARCHAR(100),
    commodity_name VARCHAR(255),
    godown_name VARCHAR(255),
    current_stock_kg NUMERIC,
    days_to_expiry INT,
    avg_daily_dispatch_kg NUMERIC,
    days_to_clear NUMERIC,
    risk_level VARCHAR(20),
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH dispatch_velocity AS (
        SELECT 
            b.commodity_id,
            b.warehouse_id,
            COALESCE(SUM(ABS(sm.qty_delta_g)) / 30.0 / 1000.0, 0.1) AS daily_velocity_kg
        FROM stock_movements sm
        JOIN batches b ON sm.batch_id = b.id
        WHERE sm.movement_type = 'DISPATCH'
          AND sm.created_at >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY b.commodity_id, b.warehouse_id
    )
    SELECT 
        b.batch_no,
        c.name AS commodity_name,
        w.name AS godown_name,
        round(b.current_qty_g / 1000.0, 2) AS current_stock_kg,
        (b.expiry_date - CURRENT_DATE)::int AS days_to_expiry,
        round(COALESCE(dv.daily_velocity_kg, 1.0), 2) AS avg_daily_dispatch_kg,
        round((b.current_qty_g / 1000.0) / GREATEST(0.1, COALESCE(dv.daily_velocity_kg, 1.0)), 1) AS days_to_clear,
        CASE 
            WHEN ((b.current_qty_g / 1000.0) / GREATEST(0.1, COALESCE(dv.daily_velocity_kg, 1.0))) > (b.expiry_date - CURRENT_DATE)
            THEN 'CRITICAL_RISK'
            WHEN (b.expiry_date - CURRENT_DATE) < 60
            THEN 'HIGH_WATCH'
            ELSE 'NORMAL'
        END::varchar(20) AS risk_level,
        CASE 
            WHEN ((b.current_qty_g / 1000.0) / GREATEST(0.1, COALESCE(dv.daily_velocity_kg, 1.0))) > (b.expiry_date - CURRENT_DATE)
            THEN 'Prioritize immediate lifting to high-demand FPS ration shops before expiry date'
            ELSE 'Standard FIFO rotation sufficient'
        END AS recommendation
    FROM batches b
    JOIN commodities c ON b.commodity_id = c.id
    JOIN warehouses w ON b.warehouse_id = w.id
    LEFT JOIN dispatch_velocity dv ON b.commodity_id = dv.commodity_id AND b.warehouse_id = dv.warehouse_id
    WHERE b.status IN ('AVAILABLE', 'PARTIAL_HOLD')
      AND b.current_qty_g > 0
      AND b.expiry_date IS NOT NULL
      AND (p_warehouse_id IS NULL OR b.warehouse_id = p_warehouse_id)
    ORDER BY (b.expiry_date - CURRENT_DATE) ASC;
END;
$$ LANGUAGE plpgsql;
