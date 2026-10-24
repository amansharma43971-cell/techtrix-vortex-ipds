-- ============================================================================
-- Migration 003: Policy-Driven Allocation Engine (FIFO & FEFO) & Governance
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M2 Deliverable
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Allocation Policies & Reservations Schema
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS allocation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id UUID REFERENCES commodities(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    mode allocation_mode NOT NULL DEFAULT 'FIFO',
    max_batches_per_dispatch INT NOT NULL DEFAULT 4,
    allow_partial BOOLEAN NOT NULL DEFAULT false,
    min_split_g BIGINT NOT NULL DEFAULT 50000, -- Minimum 50 kg gunny bag split
    min_remaining_shelf_life_days INT NOT NULL DEFAULT 30,
    prefer_consolidation BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_policy_comm_wh UNIQUE (commodity_id, warehouse_id),
    CONSTRAINT chk_max_batches_pos CHECK (max_batches_per_dispatch > 0),
    CONSTRAINT chk_min_split_pos CHECK (min_split_g > 0)
);

CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES dispatch_requests(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    reserved_qty_g BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reserved_qty_pos CHECK (reserved_qty_g > 0)
);

CREATE TABLE IF NOT EXISTS fifo_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES dispatch_requests(id) ON DELETE RESTRICT,
    skipped_batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    chosen_batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    reason_code VARCHAR(100) NOT NULL,
    reason_text TEXT NOT NULL,
    status exception_status NOT NULL DEFAULT 'PENDING',
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    CONSTRAINT chk_fifo_exception_maker_checker CHECK (
        approved_by IS NULL OR (requested_by <> approved_by)
    )
);

-- ----------------------------------------------------------------------------
-- 2. Advisory Lock Hash Routine
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_warehouse_commodity_lock_key(
    p_warehouse_id UUID, 
    p_commodity_id UUID
) RETURNS BIGINT AS $$
BEGIN
    RETURN ('x' || substr(md5(p_warehouse_id::text || ':' || p_commodity_id::text), 1, 16))::bit(64)::bigint;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- 3. Core Policy Allocation Procedure: allocate()
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION allocate(
    p_request_id UUID,
    p_dry_run BOOLEAN DEFAULT false,
    p_allow_partial BOOLEAN DEFAULT NULL -- Overrides policy if passed
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_shop RECORD;
    v_policy RECORD;
    v_batch RECORD;
    v_lock_key BIGINT;
    v_effective_allow_partial BOOLEAN;
    v_min_shelf_life INT;
    v_remaining_qty_g BIGINT;
    v_total_allocated_g BIGINT := 0;
    v_batch_allocated_g BIGINT;
    v_shortfall_qty_g BIGINT := 0;
    v_rank INT := 1;
    v_allocations JSONB := '[]'::jsonb;
    v_alloc_item JSONB;
    v_total_eligible_stock_g BIGINT := 0;
    v_batch_effective_avail_g BIGINT;
BEGIN
    -- 1. Fetch dispatch request details
    SELECT dr.id, dr.request_no, dr.shop_id, dr.commodity_id, dr.warehouse_id, 
           dr.requested_qty_g, dr.status, dr.created_by, dr.idempotency_key,
           c.name AS commodity_name, w.name AS warehouse_name
    INTO v_req
    FROM dispatch_requests dr
    JOIN commodities c ON dr.commodity_id = c.id
    JOIN warehouses w ON dr.warehouse_id = w.id
    WHERE dr.id = p_request_id;

    IF v_req.id IS NULL THEN
        RAISE EXCEPTION 'Dispatch request % not found.', p_request_id
            USING ERRCODE = 'data_exception';
    END IF;

    -- 2. Idempotency Check: If already dispatched, return existing plan safely
    IF v_req.status = 'DISPATCHED' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'batch_id', da.batch_id,
                'batch_no', b.batch_no,
                'received_date', b.received_date,
                'expiry_date', b.expiry_date,
                'allocated_qty_g', da.allocated_qty_g,
                'allocated_qty_kg', round((da.allocated_qty_g::numeric / 1000.0), 3),
                'fifo_rank', da.fifo_rank,
                'was_oldest_eligible', da.was_oldest_eligible
            ) ORDER BY da.fifo_rank
        ) INTO v_allocations
        FROM dispatch_allocations da
        JOIN batches b ON da.batch_id = b.id
        WHERE da.request_id = p_request_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'ALREADY_DISPATCHED',
            'idempotent', true,
            'request_id', v_req.id,
            'request_no', v_req.request_no,
            'requested_qty_g', v_req.requested_qty_g,
            'allocated_qty_g', v_req.requested_qty_g,
            'shortfall_qty_g', 0,
            'allocations', COALESCE(v_allocations, '[]'::jsonb),
            'message', 'Request has already been dispatched. Idempotent plan returned.'
        );
    END IF;

    -- 3. Fetch Ration Shop transit profile
    SELECT distance_km, transit_days 
    INTO v_shop 
    FROM ration_shops 
    WHERE id = v_req.shop_id;

    -- 4. Fetch Policy Scope (Warehouse + Commodity or fallback)
    SELECT * INTO v_policy
    FROM allocation_policies
    WHERE warehouse_id = v_req.warehouse_id AND commodity_id = v_req.commodity_id;

    IF v_policy.id IS NULL THEN
        -- Fallback to commodity default policy
        SELECT 
            gen_random_uuid() AS id,
            v_req.commodity_id AS commodity_id,
            v_req.warehouse_id AS warehouse_id,
            c.allocation_policy AS mode,
            4 AS max_batches_per_dispatch,
            false AS allow_partial,
            50000 AS min_split_g,
            c.min_shelf_life_days AS min_remaining_shelf_life_days,
            true AS prefer_consolidation
        INTO v_policy
        FROM commodities c
        WHERE c.id = v_req.commodity_id;
    END IF;

    v_effective_allow_partial := COALESCE(p_allow_partial, v_policy.allow_partial);
    v_min_shelf_life := GREATEST(v_policy.min_remaining_shelf_life_days, COALESCE(v_shop.transit_days, 1) + 7);

    -- 5. Acquire Scoped Advisory Transaction Lock (warehouse_id, commodity_id)
    v_lock_key := get_warehouse_commodity_lock_key(v_req.warehouse_id, v_req.commodity_id);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 6. Calculate total eligible stock
    SELECT COALESCE(SUM(current_qty_g - held_qty_g), 0)
    INTO v_total_eligible_stock_g
    FROM batches
    WHERE warehouse_id = v_req.warehouse_id
      AND commodity_id = v_req.commodity_id
      AND status IN ('AVAILABLE', 'PARTIAL_HOLD')
      AND (current_qty_g - held_qty_g) > 0
      AND (expiry_date IS NULL OR expiry_date >= (CURRENT_DATE + (v_min_shelf_life || ' days')::interval));

    -- 7. Shortfall Detection
    IF v_total_eligible_stock_g < v_req.requested_qty_g AND NOT v_effective_allow_partial THEN
        v_shortfall_qty_g := v_req.requested_qty_g - v_total_eligible_stock_g;

        IF NOT p_dry_run THEN
            UPDATE dispatch_requests 
            SET status = 'SHORTFALL' 
            WHERE id = p_request_id;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'status', 'SHORTFALL',
            'error_code', 'BS003',
            'request_id', v_req.id,
            'request_no', v_req.request_no,
            'requested_qty_g', v_req.requested_qty_g,
            'available_qty_g', v_total_eligible_stock_g,
            'shortfall_qty_g', v_shortfall_qty_g,
            'message', format('Insufficient stock. Shortfall of %s kg. Partial dispatches prohibited by policy.', round(v_shortfall_qty_g / 1000.0, 3))
        );
    END IF;

    -- 8. Walk candidate batches with SELECT ... FOR UPDATE
    v_remaining_qty_g := v_req.requested_qty_g;

    FOR v_batch IN
        SELECT b.id, b.batch_no, b.received_date, b.expiry_date, b.current_qty_g, b.held_qty_g,
               (b.current_qty_g - b.held_qty_g) AS effective_avail_g
        FROM batches b
        WHERE b.warehouse_id = v_req.warehouse_id
          AND b.commodity_id = v_req.commodity_id
          AND b.status IN ('AVAILABLE', 'PARTIAL_HOLD')
          AND (b.current_qty_g - b.held_qty_g) > 0
          AND (b.expiry_date IS NULL OR b.expiry_date >= (CURRENT_DATE + (v_min_shelf_life || ' days')::interval))
        ORDER BY 
            CASE WHEN v_policy.mode = 'FEFO' THEN b.expiry_date ELSE b.received_date END ASC,
            b.received_date ASC,
            b.id ASC
        FOR UPDATE OF b
    LOOP
        EXIT WHEN v_remaining_qty_g <= 0;
        EXIT WHEN v_rank > v_policy.max_batches_per_dispatch;

        v_batch_effective_avail_g := v_batch.effective_avail_g;
        v_batch_allocated_g := LEAST(v_remaining_qty_g, v_batch_effective_avail_g);

        IF v_batch_allocated_g > 0 THEN
            v_alloc_item := jsonb_build_object(
                'batch_id', v_batch.id,
                'batch_no', v_batch.batch_no,
                'received_date', v_batch.received_date,
                'expiry_date', v_batch.expiry_date,
                'batch_available_before_g', v_batch.current_qty_g,
                'allocated_qty_g', v_batch_allocated_g,
                'allocated_qty_kg', round((v_batch_allocated_g::numeric / 1000.0), 3),
                'fifo_rank', v_rank,
                'was_oldest_eligible', true
            );
            v_allocations := v_allocations || jsonb_build_array(v_alloc_item);

            v_total_allocated_g := v_total_allocated_g + v_batch_allocated_g;
            v_remaining_qty_g := v_remaining_qty_g - v_batch_allocated_g;
            v_rank := v_rank + 1;
        END IF;
    END LOOP;

    -- 9. Dry Run Plan Return
    IF p_dry_run THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'PREVIEW_READY',
            'policy_mode', v_policy.mode,
            'request_id', v_req.id,
            'request_no', v_req.request_no,
            'requested_qty_g', v_req.requested_qty_g,
            'allocated_qty_g', v_total_allocated_g,
            'shortfall_qty_g', GREATEST(0, v_req.requested_qty_g - v_total_allocated_g),
            'allocations', v_allocations,
            'message', 'FIFO allocation plan calculated successfully.'
        );
    END IF;

    -- 10. Confirmation Execution: Atomic Write of Allocations + DISPATCH Movements
    DELETE FROM dispatch_allocations WHERE request_id = p_request_id;

    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(v_allocations)
    LOOP
        -- Insert into dispatch_allocations
        INSERT INTO dispatch_allocations (
            request_id, batch_id, allocated_qty_g, fifo_rank, was_oldest_eligible
        ) VALUES (
            p_request_id,
            (v_alloc_item->>'batch_id')::uuid,
            (v_alloc_item->>'allocated_qty_g')::bigint,
            (v_alloc_item->>'fifo_rank')::int,
            (v_alloc_item->>'was_oldest_eligible')::boolean
        );

        -- Insert negative DISPATCH movement into append-only ledger
        INSERT INTO stock_movements (
            movement_type, batch_id, qty_delta_g, balance_after_g,
            ref_type, ref_id, reason_code, created_by
        ) VALUES (
            'DISPATCH',
            (v_alloc_item->>'batch_id')::uuid,
            -(v_alloc_item->>'allocated_qty_g')::bigint,
            0, -- Computed in trigger
            'DISPATCH_REQUEST',
            p_request_id,
            'NORMAL_PDS_LIFTING',
            v_req.created_by
        );
    END LOOP;

    -- Mark dispatch request as DISPATCHED
    UPDATE dispatch_requests 
    SET status = 'DISPATCHED',
        dispatched_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'DISPATCHED',
        'policy_mode', v_policy.mode,
        'request_id', v_req.id,
        'request_no', v_req.request_no,
        'requested_qty_g', v_req.requested_qty_g,
        'allocated_qty_g', v_total_allocated_g,
        'shortfall_qty_g', 0,
        'allocations', v_allocations,
        'message', format('Dispatch committed atomically. %s kg allocated across %s batches.', round(v_total_allocated_g / 1000.0, 3), jsonb_array_length(v_allocations))
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. Manual Override & Exception Validation Routine
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_manual_override(
    p_request_id UUID,
    p_chosen_batch_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_chosen_batch RECORD;
    v_skipped_batches JSONB := '[]'::jsonb;
    v_active_exc_count INT;
BEGIN
    SELECT dr.id, dr.commodity_id, dr.warehouse_id, dr.requested_qty_g
    INTO v_req
    FROM dispatch_requests dr
    WHERE dr.id = p_request_id;

    SELECT id, batch_no, received_date, current_qty_g
    INTO v_chosen_batch
    FROM batches
    WHERE id = p_chosen_batch_id;

    -- Collect all older eligible batches that would be skipped
    SELECT jsonb_agg(
        jsonb_build_object(
            'batch_id', b.id,
            'batch_no', b.batch_no,
            'received_date', b.received_date,
            'current_qty_g', b.current_qty_g
        )
    ) INTO v_skipped_batches
    FROM batches b
    WHERE b.warehouse_id = v_req.warehouse_id
      AND b.commodity_id = v_req.commodity_id
      AND b.status = 'AVAILABLE'
      AND b.current_qty_g > 0
      AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
      AND (b.received_date < v_chosen_batch.received_date 
           OR (b.received_date = v_chosen_batch.received_date AND b.id < v_chosen_batch.id));

    IF v_skipped_batches IS NOT NULL AND jsonb_array_length(v_skipped_batches) > 0 THEN
        -- Check if an APPROVED, unexpired fifo_exception exists
        SELECT COUNT(*) INTO v_active_exc_count
        FROM fifo_exceptions
        WHERE request_id = p_request_id
          AND chosen_batch_id = p_chosen_batch_id
          AND status = 'APPROVED'
          AND expires_at >= CURRENT_TIMESTAMP;

        IF v_active_exc_count = 0 THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'error_code', 'BS002',
                'skipped_count', jsonb_array_length(v_skipped_batches),
                'skipped_batches', v_skipped_batches,
                'message', 'FIFO deviation detected. Older eligible batches exist. An approved supervisor exception is required before dispatch.'
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'message', 'Batch selection complies with FIFO order or has an approved exception.'
    );
END;
$$ LANGUAGE plpgsql;

-- Backward compatibility alias
CREATE OR REPLACE FUNCTION allocate_fifo(
    p_request_id UUID,
    p_dry_run BOOLEAN DEFAULT false,
    p_allow_partial BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
BEGIN
    RETURN allocate(p_request_id, p_dry_run, p_allow_partial);
END;
$$ LANGUAGE plpgsql;
