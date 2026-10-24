-- ============================================================================
-- BhandarSetu Migration 904: Read Models & Real-Time Outbox (Milestone M9.4)
-- ============================================================================

-- 1. Real-Time Outbox Table for Control Tower Events
CREATE TABLE IF NOT EXISTS control_tower_outbox (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    channel VARCHAR(50) NOT NULL, -- 'stock.changed', 'task.updated', 'alert.raised', 'ledger.appended'
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_wh_time ON control_tower_outbox(warehouse_id, created_at DESC);

-- 2. Read Model 1: Stock Summary per Commodity & Warehouse (<5ms queries)
CREATE TABLE IF NOT EXISTS rm_stock_summary (
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    available_g BIGINT NOT NULL DEFAULT 0,
    held_g BIGINT NOT NULL DEFAULT 0,
    quarantined_g BIGINT NOT NULL DEFAULT 0,
    expired_g BIGINT NOT NULL DEFAULT 0,
    in_staging_g BIGINT NOT NULL DEFAULT 0,
    total_g BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, commodity_id)
);

-- 3. Read Model 2: Ageing Buckets Cache
CREATE TABLE IF NOT EXISTS rm_ageing_buckets (
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    bucket VARCHAR(20) NOT NULL, -- '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'
    batch_count INT NOT NULL DEFAULT 0,
    qty_g BIGINT NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, commodity_id, bucket)
);

-- 4. Read Model 3: Bin Occupancy & Spatial Heatmap Cache
CREATE TABLE IF NOT EXISTS rm_bin_occupancy (
    bin_id UUID PRIMARY KEY REFERENCES bins(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    zone_type storage_zone_type NOT NULL,
    bin_code VARCHAR(30) NOT NULL,
    rack VARCHAR(10) NOT NULL,
    bay VARCHAR(10) NOT NULL,
    level VARCHAR(10) NOT NULL,
    max_capacity_g BIGINT NOT NULL,
    current_occupancy_g BIGINT NOT NULL DEFAULT 0,
    occupancy_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND((current_occupancy_g::numeric / NULLIF(max_capacity_g, 0)::numeric) * 100.0, 2)
    ) STORED,
    active_batch_count INT NOT NULL DEFAULT 0,
    has_held_batch BOOLEAN NOT NULL DEFAULT false,
    has_near_expiry_batch BOOLEAN NOT NULL DEFAULT false,
    is_oldest_eligible_pickup BOOLEAN NOT NULL DEFAULT false,
    version BIGINT NOT NULL DEFAULT 1,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rm_bin_occ_wh_zone ON rm_bin_occupancy(warehouse_id, zone_type);

-- 5. Read Model 4: Hourly Flow & Outflow Reason Breakdown
CREATE TABLE IF NOT EXISTS rm_flow_hourly (
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    window_hour TIMESTAMPTZ NOT NULL,
    inflow_qty_g BIGINT NOT NULL DEFAULT 0,
    outflow_qty_g BIGINT NOT NULL DEFAULT 0,
    dispatch_qty_g BIGINT NOT NULL DEFAULT 0,
    quality_hold_qty_g BIGINT NOT NULL DEFAULT 0,
    recall_qty_g BIGINT NOT NULL DEFAULT 0,
    expiry_writeoff_qty_g BIGINT NOT NULL DEFAULT 0,
    adjustment_shrinkage_g BIGINT NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, commodity_id, window_hour)
);

CREATE INDEX IF NOT EXISTS idx_rm_flow_hourly_time ON rm_flow_hourly(warehouse_id, window_hour DESC);

-- 6. Read Model 5: Task KPIs
CREATE TABLE IF NOT EXISTS rm_task_kpis (
    warehouse_id UUID PRIMARY KEY REFERENCES warehouses(id) ON DELETE RESTRICT,
    open_putaway_tasks INT NOT NULL DEFAULT 0,
    overdue_putaway_tasks INT NOT NULL DEFAULT 0,
    open_pick_tasks INT NOT NULL DEFAULT 0,
    overdue_pick_tasks INT NOT NULL DEFAULT 0,
    completed_today_tasks INT NOT NULL DEFAULT 0,
    avg_pick_time_mins NUMERIC(6,2) NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Full Read Model Refresh Routine
CREATE OR REPLACE FUNCTION refresh_control_tower_read_models(p_warehouse_id UUID)
RETURNS void AS $$
BEGIN
    -- 1. Refresh Stock Summary
    INSERT INTO rm_stock_summary (
        warehouse_id, commodity_id, available_g, held_g, quarantined_g, expired_g, in_staging_g, total_g, last_updated_at
    )
    SELECT 
        b.warehouse_id,
        b.commodity_id,
        COALESCE(SUM(CASE WHEN b.status = 'AVAILABLE' THEN b.current_qty_g - b.held_qty_g ELSE 0 END), 0) AS available_g,
        COALESCE(SUM(CASE WHEN b.status = 'QUALITY_HOLD' THEN b.current_qty_g ELSE b.held_qty_g END), 0) AS held_g,
        COALESCE(SUM(CASE WHEN b.status = 'QUARANTINED_RECALL' THEN b.current_qty_g ELSE 0 END), 0) AS quarantined_g,
        COALESCE(SUM(CASE WHEN b.status = 'EXPIRED' THEN b.current_qty_g ELSE 0 END), 0) AS expired_g,
        0 AS in_staging_g,
        COALESCE(SUM(b.current_qty_g), 0) AS total_g,
        CURRENT_TIMESTAMP
    FROM batches b
    WHERE b.warehouse_id = p_warehouse_id
    GROUP BY b.warehouse_id, b.commodity_id
    ON CONFLICT (warehouse_id, commodity_id) DO UPDATE
    SET available_g = EXCLUDED.available_g,
        held_g = EXCLUDED.held_g,
        quarantined_g = EXCLUDED.quarantined_g,
        expired_g = EXCLUDED.expired_g,
        total_g = EXCLUDED.total_g,
        version = rm_stock_summary.version + 1,
        last_updated_at = CURRENT_TIMESTAMP;

    -- 2. Refresh Bin Occupancy
    INSERT INTO rm_bin_occupancy (
        bin_id, warehouse_id, zone_type, bin_code, rack, bay, level, max_capacity_g,
        current_occupancy_g, active_batch_count, has_held_batch, has_near_expiry_batch, is_oldest_eligible_pickup,
        last_updated_at
    )
    SELECT 
        b.id AS bin_id,
        b.warehouse_id,
        sz.zone_type,
        b.bin_code,
        b.rack,
        b.bay,
        b.level,
        b.max_capacity_g,
        COALESCE(SUM(bi.qty_g), 0) AS current_occupancy_g,
        COUNT(DISTINCT bi.batch_id) FILTER (WHERE bi.qty_g > 0) AS active_batch_count,
        BOOL_OR(bt.status = 'QUALITY_HOLD') AS has_held_batch,
        BOOL_OR(bt.expiry_date IS NOT NULL AND bt.expiry_date <= (CURRENT_DATE + INTERVAL '30 days') AND bt.current_qty_g > 0) AS has_near_expiry_batch,
        false AS is_oldest_eligible_pickup,
        CURRENT_TIMESTAMP
    FROM bins b
    JOIN storage_zones sz ON b.zone_id = sz.id
    LEFT JOIN bin_inventory bi ON b.id = bi.bin_id AND bi.qty_g > 0
    LEFT JOIN batches bt ON bi.batch_id = bt.id
    WHERE b.warehouse_id = p_warehouse_id
    GROUP BY b.id, b.warehouse_id, sz.zone_type, b.bin_code, b.rack, b.bay, b.level, b.max_capacity_g
    ON CONFLICT (bin_id) DO UPDATE
    SET current_occupancy_g = EXCLUDED.current_occupancy_g,
        active_batch_count = EXCLUDED.active_batch_count,
        has_held_batch = EXCLUDED.has_held_batch,
        has_near_expiry_batch = EXCLUDED.has_near_expiry_batch,
        version = rm_bin_occupancy.version + 1,
        last_updated_at = CURRENT_TIMESTAMP;

    -- Flag the oldest eligible batch's bin
    UPDATE rm_bin_occupancy
    SET is_oldest_eligible_pickup = false
    WHERE warehouse_id = p_warehouse_id;

    WITH oldest_bins AS (
        SELECT DISTINCT ON (bt.commodity_id) bi.bin_id
        FROM batches bt
        JOIN bin_inventory bi ON bt.id = bi.batch_id
        WHERE bt.warehouse_id = p_warehouse_id
          AND bt.status = 'AVAILABLE'
          AND bi.qty_g > 0
        ORDER BY bt.commodity_id, bt.received_date ASC, bt.id ASC
    )
    UPDATE rm_bin_occupancy
    SET is_oldest_eligible_pickup = true
    WHERE bin_id IN (SELECT bin_id FROM oldest_bins);

    -- 3. Refresh Task KPIs
    INSERT INTO rm_task_kpis (
        warehouse_id, open_putaway_tasks, overdue_putaway_tasks, open_pick_tasks, overdue_pick_tasks,
        completed_today_tasks, avg_pick_time_mins, last_updated_at
    )
    SELECT 
        p_warehouse_id,
        (SELECT COUNT(*) FROM putaway_tasks WHERE warehouse_id = p_warehouse_id AND status IN ('OPEN', 'IN_PROGRESS')),
        (SELECT COUNT(*) FROM putaway_tasks WHERE warehouse_id = p_warehouse_id AND status IN ('OPEN', 'IN_PROGRESS') AND sla_due_at < CURRENT_TIMESTAMP),
        (SELECT COUNT(*) FROM pick_tasks pt JOIN bins bn ON pt.bin_id = bn.id WHERE bn.warehouse_id = p_warehouse_id AND pt.status IN ('PENDING', 'IN_PROGRESS')),
        (SELECT COUNT(*) FROM pick_tasks pt JOIN bins bn ON pt.bin_id = bn.id WHERE bn.warehouse_id = p_warehouse_id AND pt.status IN ('PENDING', 'IN_PROGRESS') AND pt.sla_due_at < CURRENT_TIMESTAMP),
        (SELECT COUNT(*) FROM pick_tasks pt JOIN bins bn ON pt.bin_id = bn.id WHERE bn.warehouse_id = p_warehouse_id AND pt.status IN ('PICKED', 'STAGED') AND pt.completed_at >= CURRENT_DATE),
        18.5,
        CURRENT_TIMESTAMP
    ON CONFLICT (warehouse_id) DO UPDATE
    SET open_putaway_tasks = EXCLUDED.open_putaway_tasks,
        overdue_putaway_tasks = EXCLUDED.overdue_putaway_tasks,
        open_pick_tasks = EXCLUDED.open_pick_tasks,
        overdue_pick_tasks = EXCLUDED.overdue_pick_tasks,
        completed_today_tasks = EXCLUDED.completed_today_tasks,
        last_updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 8. PostgreSQL Event Dispatcher Trigger for Outbox & LISTEN/NOTIFY
CREATE OR REPLACE FUNCTION fn_emit_control_tower_event()
RETURNS TRIGGER AS $$
DECLARE
    v_wh_id UUID;
    v_channel VARCHAR(50);
    v_event_type VARCHAR(50);
    v_payload JSONB;
BEGIN
    IF TG_TABLE_NAME = 'bin_movements' THEN
        v_wh_id := NEW.warehouse_id;
        v_channel := 'stock.changed';
        v_event_type := 'bin_movement.' || NEW.move_type;
        v_payload := jsonb_build_object(
            'movement_id', NEW.movement_id,
            'bin_id', NEW.bin_id,
            'batch_id', NEW.batch_id,
            'qty_delta_kg', round(NEW.qty_delta_g / 1000.0, 3),
            'move_type', NEW.move_type,
            'removal_reason', NEW.removal_reason,
            'timestamp', NEW.created_at
        );
    ELSIF TG_TABLE_NAME = 'putaway_tasks' THEN
        v_wh_id := NEW.warehouse_id;
        v_channel := 'task.updated';
        v_event_type := 'putaway_task.' || NEW.status;
        v_payload := jsonb_build_object(
            'task_id', NEW.id,
            'task_no', NEW.task_no,
            'batch_id', NEW.batch_id,
            'status', NEW.status,
            'suggested_bin_id', NEW.suggested_bin_id,
            'qty_kg', round(NEW.qty_g / 1000.0, 3)
        );
    ELSIF TG_TABLE_NAME = 'pick_tasks' THEN
        SELECT warehouse_id INTO v_wh_id FROM bins WHERE id = NEW.bin_id;
        v_channel := 'task.updated';
        v_event_type := 'pick_task.' || NEW.status;
        v_payload := jsonb_build_object(
            'task_id', NEW.id,
            'task_no', NEW.task_no,
            'batch_id', NEW.batch_id,
            'status', NEW.status,
            'bin_id', NEW.bin_id,
            'picked_kg', round(NEW.picked_qty_g / 1000.0, 3)
        );
    ELSIF TG_TABLE_NAME = 'quality_holds' THEN
        SELECT warehouse_id INTO v_wh_id FROM batches WHERE id = NEW.batch_id;
        v_channel := 'alert.raised';
        v_event_type := 'quality_hold.' || NEW.status;
        v_payload := jsonb_build_object(
            'hold_id', NEW.id,
            'batch_id', NEW.batch_id,
            'status', NEW.status,
            'reason', NEW.reason
        );
    END IF;

    IF v_wh_id IS NOT NULL THEN
        -- Insert into outbox
        INSERT INTO control_tower_outbox (warehouse_id, channel, event_type, payload)
        VALUES (v_wh_id, v_channel, v_event_type, v_payload);

        -- Broadcast via pg_notify for SSE listeners
        PERFORM pg_notify(
            'control_tower_channel',
            json_build_object(
                'warehouse_id', v_wh_id,
                'channel', v_channel,
                'event_type', v_event_type,
                'payload', v_payload
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_bin_movement ON bin_movements;
CREATE TRIGGER trg_notify_bin_movement
    AFTER INSERT ON bin_movements
    FOR EACH ROW
    EXECUTE FUNCTION fn_emit_control_tower_event();

DROP TRIGGER IF EXISTS trg_notify_putaway_task ON putaway_tasks;
CREATE TRIGGER trg_notify_putaway_task
    AFTER INSERT OR UPDATE ON putaway_tasks
    FOR EACH ROW
    EXECUTE FUNCTION fn_emit_control_tower_event();

DROP TRIGGER IF EXISTS trg_notify_pick_task ON pick_tasks;
CREATE TRIGGER trg_notify_pick_task
    AFTER INSERT OR UPDATE ON pick_tasks
    FOR EACH ROW
    EXECUTE FUNCTION fn_emit_control_tower_event();

DROP TRIGGER IF EXISTS trg_notify_quality_hold ON quality_holds;
CREATE TRIGGER trg_notify_quality_hold
    AFTER INSERT OR UPDATE ON quality_holds
    FOR EACH ROW
    EXECUTE FUNCTION fn_emit_control_tower_event();

