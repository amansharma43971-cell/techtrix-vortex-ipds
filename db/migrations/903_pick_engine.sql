-- ============================================================================
-- BhandarSetu Migration 903: Outbound Pick Engine & Wave Picking (Milestone M9.3)
-- ============================================================================

-- 1. Wave & Pick Task Status ENUMs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pick_wave_status') THEN
        CREATE TYPE pick_wave_status AS ENUM ('OPEN', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pick_task_status') THEN
        CREATE TYPE pick_task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'PICKED', 'SHORT_PICKED', 'STAGED');
    END IF;
END $$;

-- 2. Pick Waves Table
CREATE TABLE IF NOT EXISTS pick_waves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_no VARCHAR(50) UNIQUE NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    status pick_wave_status NOT NULL DEFAULT 'OPEN',
    total_requested_qty_g BIGINT NOT NULL CHECK (total_requested_qty_g > 0),
    total_picked_qty_g BIGINT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pick_waves_wh_status ON pick_waves(warehouse_id, status);

-- 3. Pick Tasks Table
CREATE TABLE IF NOT EXISTS pick_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(50) UNIQUE NOT NULL,
    wave_id UUID REFERENCES pick_waves(id) ON DELETE RESTRICT,
    request_id UUID NOT NULL REFERENCES dispatch_requests(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
    qty_g BIGINT NOT NULL CHECK (qty_g > 0),
    picked_qty_g BIGINT NOT NULL DEFAULT 0,
    pick_sequence INT NOT NULL, -- Walking-path sequence (batch FIFO tier first, bin path second)
    status pick_task_status NOT NULL DEFAULT 'PENDING',
    assigned_to UUID REFERENCES users(id) ON DELETE RESTRICT,
    sla_due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    shortfall_qty_g BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pick_tasks_lookup ON pick_tasks(request_id, status);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_wave ON pick_tasks(wave_id, pick_sequence);

-- 4. Create Wave Picking Plan Function
CREATE OR REPLACE FUNCTION create_pick_wave(
    p_warehouse_id UUID,
    p_commodity_id UUID,
    p_request_ids UUID[],
    p_creator_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_wave_id UUID := gen_random_uuid();
    v_wave_no VARCHAR(50);
    v_req_id UUID;
    v_alloc_res JSONB;
    v_total_req_g BIGINT := 0;
    v_task_count INT := 0;
    v_alloc RECORD;
    v_bin_rec RECORD;
    v_needed_g BIGINT;
    v_bin_take_g BIGINT;
    v_task_no VARCHAR(50);
BEGIN
    v_wave_no := 'WAVE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(md5(v_wave_id::text), 1, 6);

    -- 1. Validate & calculate total quantity across requests
    SELECT COALESCE(SUM(requested_qty_g), 0) INTO v_total_req_g
    FROM dispatch_requests
    WHERE id = ANY(p_request_ids) AND warehouse_id = p_warehouse_id AND commodity_id = p_commodity_id;

    IF v_total_req_g <= 0 THEN
        RAISE EXCEPTION 'INVALID_REQUESTS: No matching dispatch requests found for wave creation';
    END IF;

    -- 2. Insert pick wave
    INSERT INTO pick_waves (id, wave_no, warehouse_id, commodity_id, status, total_requested_qty_g, created_by)
    VALUES (v_wave_id, v_wave_no, p_warehouse_id, p_commodity_id, 'RELEASED', v_total_req_g, p_creator_id);

    -- 3. Process each request: allocate stock & generate bin-level pick tasks
    FOREACH v_req_id IN ARRAY p_request_ids LOOP
        -- Run existing FIFO/FEFO allocation engine
        v_alloc_res := allocate(v_req_id, false, false);
        IF (v_alloc_res->>'success')::boolean IS NOT TRUE THEN
            RAISE EXCEPTION 'ALLOCATION_FAILED: Request % failed: %', v_req_id, v_alloc_res->>'message';
        END IF;

        -- For each allocated batch, locate bins containing this batch in pick_sequence order
        FOR v_alloc IN 
            SELECT da.batch_id, da.allocated_qty_g, da.fifo_rank, b.batch_no
            FROM dispatch_allocations da
            JOIN batches b ON da.batch_id = b.id
            WHERE da.request_id = v_req_id
            ORDER BY da.fifo_rank ASC
        LOOP
            v_needed_g := v_alloc.allocated_qty_g;

            FOR v_bin_rec IN
                SELECT bi.bin_id, b.bin_code, b.pick_sequence, bi.qty_g
                FROM bin_inventory bi
                JOIN bins b ON bi.bin_id = b.id
                JOIN storage_zones sz ON b.zone_id = sz.id
                WHERE bi.batch_id = v_alloc.batch_id
                  AND bi.qty_g > 0
                  AND sz.zone_type <> 'QUARANTINE' -- Hard safety: never route pick to quarantine
                ORDER BY b.pick_sequence ASC
            LOOP
                EXIT WHEN v_needed_g <= 0;

                v_bin_take_g := LEAST(v_needed_g, v_bin_rec.qty_g);
                v_task_count := v_task_count + 1;
                v_task_no := 'PTK-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_task_count::text, 4, '0');

                -- Composite pick sequence: (fifo_rank * 10000) + bin pick_sequence ensures FIFO first, walking path second!
                INSERT INTO pick_tasks (
                    task_no, wave_id, request_id, batch_id, bin_id, qty_g, pick_sequence,
                    status, sla_due_at
                ) VALUES (
                    v_task_no, v_wave_id, v_req_id, v_alloc.batch_id, v_bin_rec.bin_id, v_bin_take_g,
                    (v_alloc.fifo_rank * 10000) + v_bin_rec.pick_sequence,
                    'PENDING', CURRENT_TIMESTAMP + INTERVAL '3 hours'
                );

                v_needed_g := v_needed_g - v_bin_take_g;
            END LOOP;

            -- If needed_g still > 0, batch exists in ledger but not slotted in bins (staging / pending putaway)
            IF v_needed_g > 0 THEN
                -- Locate default bin or flag shortfall
                RAISE NOTICE 'Batch % has % g unslotted in physical bins.', v_alloc.batch_no, v_needed_g;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'wave_id', v_wave_id,
        'wave_no', v_wave_no,
        'total_qty_kg', round(v_total_req_g / 1000.0, 3),
        'tasks_created', v_task_count
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Confirm Pick Task Function (Scan Verification & Short-Pick Handling)
CREATE OR REPLACE FUNCTION confirm_pick_task(
    p_task_id UUID,
    p_scanned_bin_code VARCHAR,
    p_scanned_batch_no VARCHAR,
    p_picked_qty_g BIGINT,
    p_picker_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_batch RECORD;
    v_bin RECORD;
    v_short_g BIGINT := 0;
BEGIN
    -- 1. Fetch task
    SELECT pt.*, b.warehouse_id INTO v_task 
    FROM pick_tasks pt
    JOIN bins b ON pt.bin_id = b.id
    WHERE pt.id = p_task_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND: Pick task % does not exist', p_task_id;
    END IF;

    IF v_task.status IN ('PICKED', 'STAGED') THEN
        RETURN jsonb_build_object('success', true, 'message', 'Task already completed previously.');
    END IF;

    -- 2. Verify scanned batch
    SELECT * INTO v_batch FROM batches WHERE id = v_task.batch_id;
    IF UPPER(TRIM(p_scanned_batch_no)) <> UPPER(TRIM(v_batch.batch_no)) THEN
        RAISE EXCEPTION 'BS008: Scanned batch QR (%) does not match required FIFO batch (%)',
            p_scanned_batch_no, v_batch.batch_no
            USING ERRCODE = 'BS008';
    END IF;

    -- 3. Verify scanned bin
    SELECT * INTO v_bin FROM bins WHERE id = v_task.bin_id;
    IF UPPER(TRIM(p_scanned_bin_code)) <> UPPER(TRIM(v_bin.bin_code)) THEN
        RAISE EXCEPTION 'BS009: Scanned bin code (%) does not match assigned bin (%)',
            p_scanned_bin_code, v_bin.bin_code
            USING ERRCODE = 'BS009';
    END IF;

    -- 4. Check for short-pick
    IF p_picked_qty_g < v_task.qty_g THEN
        v_short_g := v_task.qty_g - p_picked_qty_g;
    END IF;

    -- 5. Record Physical Bin Movement (PICK)
    IF p_picked_qty_g > 0 THEN
        INSERT INTO bin_movements (
            warehouse_id, bin_id, batch_id, qty_delta_g, move_type, task_id, removal_reason, created_by
        ) VALUES (
            v_task.warehouse_id, v_task.bin_id, v_task.batch_id, -p_picked_qty_g, 'PICK', v_task.id, 'DISPATCH', p_picker_id
        );
    END IF;

    -- 6. Update task status
    UPDATE pick_tasks
    SET status = CASE WHEN v_short_g > 0 THEN 'SHORT_PICKED' ELSE 'PICKED' END,
        picked_qty_g = p_picked_qty_g,
        shortfall_qty_g = v_short_g,
        assigned_to = COALESCE(assigned_to, p_picker_id),
        completed_at = CURRENT_TIMESTAMP
    WHERE id = p_task_id;

    -- Update wave progress if part of a wave
    IF v_task.wave_id IS NOT NULL THEN
        UPDATE pick_waves
        SET total_picked_qty_g = total_picked_qty_g + p_picked_qty_g,
            status = CASE 
                WHEN (total_picked_qty_g + p_picked_qty_g) >= total_requested_qty_g THEN 'COMPLETED'
                ELSE 'IN_PROGRESS'
            END
        WHERE id = v_task.wave_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task.id,
        'batch_no', v_batch.batch_no,
        'bin_code', v_bin.bin_code,
        'picked_kg', round(p_picked_qty_g / 1000.0, 3),
        'is_short_pick', (v_short_g > 0),
        'shortfall_kg', round(v_short_g / 1000.0, 3),
        'status', CASE WHEN v_short_g > 0 THEN 'SHORT_PICKED' ELSE 'PICKED' END
    );
END;
$$ LANGUAGE plpgsql;

