-- ============================================================================
-- BhandarSetu Migration 902: Putaway Engine & Slotting Optimization (Milestone M9.2)
-- ============================================================================

-- 1. Putaway Status ENUM & Rules Configuration Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'putaway_status') THEN
        CREATE TYPE putaway_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'SKIPPED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS putaway_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    rule_code VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,
    weight_score INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, rule_code)
);

-- Default system rules
INSERT INTO putaway_rules (rule_code, rule_name, description, weight_score)
VALUES 
    ('SAME_BATCH', 'Consolidate Same Batch', 'Prefer bin already holding parts of the same batch', 500),
    ('SAME_COMMODITY', 'Consolidate Same Commodity', 'Prefer bin holding the identical commodity', 200),
    ('VELOCITY_SLOTTING', 'ABC Fast-Mover Slotting', 'Slot Class A items to PICK_FACE near dispatch staging', 300),
    ('FIFO_LANE_PRESERVATION', 'Preserve FIFO Lane Order', 'Never place newer batch in front of older batch in picking lane', 400),
    ('EMPTY_BIN', 'Clean Bin Preference', 'Prefer clean empty bins when consolidation is not applicable', 100)
ON CONFLICT DO NOTHING;

-- 2. Commodity Velocity Classification (ABC Analysis)
CREATE TABLE IF NOT EXISTS commodity_velocity_class (
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    velocity_class VARCHAR(5) NOT NULL CHECK (velocity_class IN ('A', 'B', 'C')),
    dispatch_velocity_30d_kg NUMERIC(14,3) NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, commodity_id)
);

-- 3. Putaway Tasks Table
CREATE TABLE IF NOT EXISTS putaway_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(50) UNIQUE NOT NULL,
    receipt_line_id UUID REFERENCES receipt_lines(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    qty_g BIGINT NOT NULL CHECK (qty_g > 0),
    suggested_bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
    confirmed_bin_id UUID REFERENCES bins(id) ON DELETE RESTRICT,
    status putaway_status NOT NULL DEFAULT 'OPEN',
    assigned_to UUID REFERENCES users(id) ON DELETE RESTRICT,
    sla_due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    override_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_putaway_tasks_status ON putaway_tasks(warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_putaway_tasks_batch ON putaway_tasks(batch_id);

-- 4. ABC Velocity Evaluation Job Function
CREATE OR REPLACE FUNCTION calculate_abc_velocity(p_warehouse_id UUID)
RETURNS void AS $$
DECLARE
    v_total_dispatched_kg NUMERIC(14,3);
BEGIN
    -- Calculate total 30-day dispatch volume for the warehouse
    SELECT COALESCE(SUM(ABS(qty_delta_g)) / 1000.0, 0)
    INTO v_total_dispatched_kg
    FROM stock_movements sm
    JOIN batches b ON sm.batch_id = b.id
    WHERE b.warehouse_id = p_warehouse_id
      AND sm.movement_type = 'DISPATCH'
      AND sm.created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days');

    -- Upsert ranking: Top 70% volume = A, Next 20% = B, Remaining = C
    WITH comm_volumes AS (
        SELECT 
            b.commodity_id,
            COALESCE(SUM(ABS(sm.qty_delta_g)) / 1000.0, 0) AS vol_30d_kg
        FROM commodities c
        CROSS JOIN (SELECT p_warehouse_id AS wh_id) w
        LEFT JOIN batches b ON b.commodity_id = c.id AND b.warehouse_id = p_warehouse_id
        LEFT JOIN stock_movements sm ON sm.batch_id = b.id 
             AND sm.movement_type = 'DISPATCH' 
             AND sm.created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
        GROUP BY b.commodity_id
    ),
    ranked AS (
        SELECT 
            commodity_id,
            vol_30d_kg,
            SUM(vol_30d_kg) OVER (ORDER BY vol_30d_kg DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_vol
        FROM comm_volumes
        WHERE commodity_id IS NOT NULL
    )
    INSERT INTO commodity_velocity_class (warehouse_id, commodity_id, velocity_class, dispatch_velocity_30d_kg, last_evaluated_at)
    SELECT 
        p_warehouse_id,
        commodity_id,
        CASE 
            WHEN v_total_dispatched_kg = 0 THEN 'B'
            WHEN running_vol <= (v_total_dispatched_kg * 0.70) THEN 'A'
            WHEN running_vol <= (v_total_dispatched_kg * 0.90) THEN 'B'
            ELSE 'C'
        END AS velocity_class,
        vol_30d_kg,
        CURRENT_TIMESTAMP
    FROM ranked
    ON CONFLICT (warehouse_id, commodity_id) DO UPDATE
    SET velocity_class = EXCLUDED.velocity_class,
        dispatch_velocity_30d_kg = EXCLUDED.dispatch_velocity_30d_kg,
        last_evaluated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 5. Putaway Scoring & Suggestion Function
CREATE OR REPLACE FUNCTION suggest_putaway(
    p_batch_id UUID,
    p_qty_g BIGINT
) RETURNS TABLE (
    bin_id UUID,
    bin_code VARCHAR,
    zone_code VARCHAR,
    zone_type storage_zone_type,
    available_capacity_g BIGINT,
    suggested_qty_g BIGINT,
    total_score INT,
    suggestion_reason TEXT
) AS $$
DECLARE
    v_batch RECORD;
    v_velocity_class VARCHAR(5) := 'B';
BEGIN
    -- 1. Retrieve batch metadata
    SELECT b.id, b.batch_no, b.commodity_id, b.warehouse_id, b.received_date
    INTO v_batch
    FROM batches b
    WHERE b.id = p_batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BATCH_NOT_FOUND: Batch % does not exist', p_batch_id;
    END IF;

    -- Retrieve commodity velocity
    SELECT COALESCE(velocity_class, 'B') INTO v_velocity_class
    FROM commodity_velocity_class
    WHERE warehouse_id = v_batch.warehouse_id AND commodity_id = v_batch.commodity_id;

    -- 2. Query Candidate Bins & Evaluate Scoring Rules
    RETURN QUERY
    WITH candidate_bins AS (
        SELECT 
            b.id AS c_bin_id,
            b.bin_code AS c_bin_code,
            sz.zone_code AS c_zone_code,
            sz.zone_type AS c_zone_type,
            b.rack,
            b.bay,
            b.pick_sequence,
            b.max_capacity_g,
            COALESCE(SUM(bi.qty_g), 0) AS current_used_g,
            (b.max_capacity_g - COALESCE(SUM(bi.qty_g), 0)) AS space_left_g,
            BOOL_OR(bi.batch_id = p_batch_id) AS has_same_batch,
            BOOL_OR(bt.commodity_id = v_batch.commodity_id) AS has_same_commodity
        FROM bins b
        JOIN storage_zones sz ON b.zone_id = sz.id
        LEFT JOIN bin_inventory bi ON b.id = bi.bin_id AND bi.qty_g > 0
        LEFT JOIN batches bt ON bi.batch_id = bt.id
        WHERE b.warehouse_id = v_batch.warehouse_id
          AND b.is_active = true
          AND sz.zone_type IN ('BULK', 'PICK_FACE') -- Putaway only to bulk or pick_face
        GROUP BY b.id, b.bin_code, sz.zone_code, sz.zone_type, b.rack, b.bay, b.pick_sequence, b.max_capacity_g
        HAVING (b.max_capacity_g - COALESCE(SUM(bi.qty_g), 0)) >= 100000 -- At least 100 kg space
    ),
    -- FIFO Lane Rule: Check if placing here would block an older batch
    -- In a FIFO lane (same rack & bay), newer batches must have higher pick_sequence (back of lane)
    lane_checked AS (
        SELECT 
            cb.*,
            -- Check if any bin in this bay with HIGHER pick_sequence holds an OLDER batch
            EXISTS (
                SELECT 1
                FROM bins other_b
                JOIN bin_inventory obi ON other_b.id = obi.bin_id AND obi.qty_g > 0
                JOIN batches obt ON obi.batch_id = obt.id
                WHERE other_b.warehouse_id = v_batch.warehouse_id
                  AND other_b.rack = cb.rack
                  AND other_b.bay = cb.bay
                  AND other_b.pick_sequence > cb.pick_sequence
                  AND obt.commodity_id = v_batch.commodity_id
                  AND obt.received_date < v_batch.received_date
            ) AS would_block_older_batch
        FROM candidate_bins cb
    ),
    scored AS (
        SELECT 
            lc.c_bin_id,
            lc.c_bin_code,
            lc.c_zone_code,
            lc.c_zone_type,
            lc.space_left_g,
            LEAST(lc.space_left_g, p_qty_g) AS alloc_qty_g,
            -- Compute composite score
            (
                -- Rule 1: Consolidate same batch (+500)
                CASE WHEN lc.has_same_batch THEN 500 ELSE 0 END +
                -- Rule 2: Consolidate same commodity (+200)
                CASE WHEN lc.has_same_commodity THEN 200 ELSE 0 END +
                -- Rule 3: Velocity matching (Class A -> PICK_FACE +300; Class C -> BULK +200)
                CASE 
                    WHEN v_velocity_class = 'A' AND lc.c_zone_type = 'PICK_FACE' THEN 300
                    WHEN v_velocity_class = 'C' AND lc.c_zone_type = 'BULK' THEN 200
                    WHEN v_velocity_class = 'B' THEN 150
                    ELSE 50
                END +
                -- Rule 4: Clean empty bin (+100)
                CASE WHEN lc.current_used_g = 0 THEN 100 ELSE 0 END -
                -- Penalty for blocking older batch in FIFO lane (-1000)
                CASE WHEN lc.would_block_older_batch THEN 1000 ELSE 0 END
            ) AS calc_score,
            ARRAY_TO_STRING(ARRAY[
                CASE WHEN lc.has_same_batch THEN 'Same Batch Consolidation (+500)' END,
                CASE WHEN lc.has_same_commodity THEN 'Same Commodity Consolidation (+200)' END,
                CASE WHEN v_velocity_class = 'A' AND lc.c_zone_type = 'PICK_FACE' THEN 'Fast-Mover Class A Slotting (+300)' END,
                CASE WHEN v_velocity_class = 'C' AND lc.c_zone_type = 'BULK' THEN 'Slow-Mover Class C Bulk Slotting (+200)' END,
                CASE WHEN lc.current_used_g = 0 THEN 'Clean Empty Bin (+100)' END,
                CASE WHEN lc.would_block_older_batch THEN 'WARNING: FIFO Lane Block Risk (-1000)' END
            ], '; ') AS reasons
        FROM lane_checked lc
    )
    SELECT 
        s.c_bin_id,
        s.c_bin_code,
        s.c_zone_code,
        s.c_zone_type,
        s.space_left_g,
        s.alloc_qty_g,
        s.calc_score,
        s.reasons
    FROM scored s
    ORDER BY s.calc_score DESC, s.space_left_g DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Confirm Putaway Function (Scan Verification & Bin Movement Generation)
CREATE OR REPLACE FUNCTION confirm_putaway(
    p_task_id UUID,
    p_scanned_bin_code VARCHAR,
    p_scanned_batch_no VARCHAR,
    p_worker_id UUID,
    p_override_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_scanned_bin RECORD;
    v_batch RECORD;
BEGIN
    -- 1. Fetch task
    SELECT * INTO v_task FROM putaway_tasks WHERE id = p_task_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND: Putaway task % does not exist', p_task_id;
    END IF;

    IF v_task.status = 'DONE' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Task already completed previously.');
    END IF;

    -- 2. Verify scanned batch
    SELECT * INTO v_batch FROM batches WHERE id = v_task.batch_id;
    IF UPPER(TRIM(p_scanned_batch_no)) <> UPPER(TRIM(v_batch.batch_no)) THEN
        RAISE EXCEPTION 'BS008: Scanned batch QR (%) does not match task batch (%)',
            p_scanned_batch_no, v_batch.batch_no
            USING ERRCODE = 'BS008';
    END IF;

    -- 3. Resolve scanned bin
    SELECT * INTO v_scanned_bin 
    FROM bins 
    WHERE warehouse_id = v_task.warehouse_id AND UPPER(TRIM(bin_code)) = UPPER(TRIM(p_scanned_bin_code));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BIN_NOT_FOUND: Scanned bin code % not recognized', p_scanned_bin_code;
    END IF;

    -- 4. Check for deviation from suggested bin
    IF v_scanned_bin.id <> v_task.suggested_bin_id AND (p_override_reason IS NULL OR TRIM(p_override_reason) = '') THEN
        RAISE EXCEPTION 'BS009: Scanned bin (%) differs from suggested bin. An override reason is required',
            p_scanned_bin_code
            USING ERRCODE = 'BS009';
    END IF;

    -- 5. Record Physical Bin Movement (PUTAWAY)
    INSERT INTO bin_movements (
        warehouse_id, bin_id, batch_id, qty_delta_g, move_type, task_id, created_by
    ) VALUES (
        v_task.warehouse_id, v_scanned_bin.id, v_task.batch_id, v_task.qty_g, 'PUTAWAY', v_task.id, p_worker_id
    );

    -- 6. Mark task as DONE
    UPDATE putaway_tasks
    SET status = 'DONE',
        confirmed_bin_id = v_scanned_bin.id,
        completed_at = CURRENT_TIMESTAMP,
        override_reason = p_override_reason,
        assigned_to = COALESCE(assigned_to, p_worker_id)
    WHERE id = p_task_id;

    RETURN jsonb_build_object(
        'success', true,
        'task_id', v_task.id,
        'batch_no', v_batch.batch_no,
        'bin_code', v_scanned_bin.bin_code,
        'qty_kg', round(v_task.qty_g / 1000.0, 3),
        'status', 'DONE'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Slotting Recommendations View (Move Fast Movers to Pick Face)
CREATE OR REPLACE VIEW v_slotting_recommendations AS
SELECT 
    w.name AS warehouse_name,
    c.name AS commodity_name,
    vc.velocity_class,
    b.bin_code AS current_bin,
    sz.zone_type AS current_zone,
    bt.batch_no,
    round(bi.qty_g / 1000.0, 2) AS current_qty_kg,
    'Relocate Class A high-velocity stock from BULK to PICK_FACE near dispatch staging' AS recommendation
FROM bin_inventory bi
JOIN bins b ON bi.bin_id = b.id
JOIN storage_zones sz ON b.zone_id = sz.id
JOIN batches bt ON bi.batch_id = bt.id
JOIN warehouses w ON bt.warehouse_id = w.id
JOIN commodities c ON bt.commodity_id = c.id
JOIN commodity_velocity_class vc ON vc.warehouse_id = bt.warehouse_id AND vc.commodity_id = bt.commodity_id
WHERE vc.velocity_class = 'A'
  AND sz.zone_type = 'BULK'
  AND bi.qty_g > 0;

