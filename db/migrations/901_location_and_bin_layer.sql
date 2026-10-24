-- ============================================================================
-- BhandarSetu Migration 901: Location & Bin Layer (Milestone M9.1)
-- ============================================================================
-- Establishes physical godown zoning, bin addressing, bin inventory balance cache,
-- append-only bin_movements partitioned ledger, capacity constraints, and
-- quarantine protection triggers.
-- ============================================================================

-- 1. Storage Zone Types & Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_zone_type') THEN
        CREATE TYPE storage_zone_type AS ENUM (
            'BULK',               -- Deep storage for slow/medium velocity commodities
            'PICK_FACE',          -- Fast-moving picking positions near dispatch staging
            'QUARANTINE',         -- Legally barricaded zone for Quality Holds & Recalls
            'DISPATCH_STAGING',   -- Marshalling zone for verified picked consignments
            'RETURNS'             -- Returned/refused grains undergoing triage
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS storage_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    zone_code VARCHAR(20) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    zone_type storage_zone_type NOT NULL,
    temperature_controlled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, zone_code)
);

CREATE INDEX IF NOT EXISTS idx_storage_zones_wh_type ON storage_zones(warehouse_id, zone_type);

-- 2. Godown Bins / Stacks
CREATE TABLE IF NOT EXISTS bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    zone_id UUID NOT NULL REFERENCES storage_zones(id) ON DELETE RESTRICT,
    bin_code VARCHAR(30) NOT NULL, -- e.g. 'BULK-A-01-1'
    rack VARCHAR(10) NOT NULL,
    bay VARCHAR(10) NOT NULL,
    level VARCHAR(10) NOT NULL,
    position VARCHAR(10) NOT NULL DEFAULT '1',
    max_capacity_g BIGINT NOT NULL CHECK (max_capacity_g > 0), -- e.g. 50,000,000 g (50 MT)
    pick_sequence INT NOT NULL DEFAULT 100, -- Walking-path order (serpentine routing)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (warehouse_id, bin_code)
);

CREATE INDEX IF NOT EXISTS idx_bins_lookup ON bins(warehouse_id, zone_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bins_pick_sequence ON bins(warehouse_id, pick_sequence);

-- 3. Bin Inventory Balance (Denormalized Cache Driven ONLY by bin_movements)
CREATE TABLE IF NOT EXISTS bin_inventory (
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    qty_g BIGINT NOT NULL CHECK (qty_g >= 0),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bin_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_bin_inv_batch_covering ON bin_inventory(batch_id) INCLUDE (qty_g, bin_id);

-- 4. Bin Movement Types & Append-Only Partitioned Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bin_move_type') THEN
        CREATE TYPE bin_move_type AS ENUM (
            'PUTAWAY',            -- Inward placement from goods receipt
            'PICK',               -- Outward removal for dispatch
            'TRANSFER_IN',        -- Internal relocation incoming
            'TRANSFER_OUT',       -- Internal relocation outgoing
            'QUARANTINE_MOVE',    -- Movement to/from quarantine zone
            'ADJUSTMENT',         -- Stock verification shrinkage/overage
            'RETURN_PUTAWAY'      -- Customer/FPS returned stock
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS bin_movements (
    movement_id BIGINT GENERATED ALWAYS AS IDENTITY,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    qty_delta_g BIGINT NOT NULL CHECK (qty_delta_g <> 0),
    move_type bin_move_type NOT NULL,
    task_id UUID, -- References putaway_tasks or pick_tasks
    ledger_movement_id BIGINT, -- Linked to stock_movements when reflecting financial ledger
    removal_reason VARCHAR(50), -- DISPATCH, QUALITY_HOLD, EXPIRY_WRITE_OFF, RECALL_QUARANTINE, ADJUSTMENT
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movement_id, created_at)
) PARTITION BY RANGE (created_at);

-- Partition creation helper for bin_movements
CREATE OR REPLACE FUNCTION ensure_bin_movements_partitions()
RETURNS void AS $$
DECLARE
    v_curr_month DATE := date_trunc('month', CURRENT_DATE);
    v_target_month DATE;
    v_part_name TEXT;
    v_start_str TEXT;
    v_end_str TEXT;
BEGIN
    FOR i IN -3..6 LOOP
        v_target_month := v_curr_month + (i || ' month')::INTERVAL;
        v_part_name := 'bin_movements_y' || to_char(v_target_month, 'YYYY') || 'm' || to_char(v_target_month, 'MM');
        v_start_str := to_char(v_target_month, 'YYYY-MM-DD');
        v_end_str := to_char((v_target_month + INTERVAL '1 month'), 'YYYY-MM-DD');

        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_part_name) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF bin_movements FOR VALUES FROM (%L) TO (%L)',
                v_part_name, v_start_str, v_end_str
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT ensure_bin_movements_partitions();

-- 5. Immutability & Balance Protection Triggers
-- Bin inventory must be updated ONLY by bin_movements
CREATE OR REPLACE FUNCTION trg_guard_bin_inventory_direct_update()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.allow_bin_inventory_direct_update', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'DIRECT_UPDATE_BLOCKED: bin_inventory balances are maintained exclusively via bin_movements inserts'
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_bin_inventory_mutation ON bin_inventory;
CREATE TRIGGER trg_guard_bin_inventory_mutation
    BEFORE UPDATE OR DELETE ON bin_inventory
    FOR EACH ROW
    EXECUTE FUNCTION trg_guard_bin_inventory_direct_update();

-- Revoke mutation permissions on bin_movements
CREATE OR REPLACE FUNCTION trg_block_bin_movements_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'IMMUTABLE_LOG: UPDATE, DELETE, and TRUNCATE operations are strictly prohibited on bin_movements'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_update_delete_bin_movements ON bin_movements;
CREATE TRIGGER trg_no_update_delete_bin_movements
    BEFORE UPDATE OR DELETE ON bin_movements
    FOR EACH STATEMENT
    EXECUTE FUNCTION trg_block_bin_movements_mutation();

-- 6. Bin Movement Execution Trigger: Capacity Guard, Quarantine Rule & Balance Update
CREATE OR REPLACE FUNCTION fn_process_bin_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_max_cap BIGINT;
    v_current_bin_total BIGINT;
    v_zone_type storage_zone_type;
    v_bin_qty BIGINT;
BEGIN
    -- 1. Retrieve Bin Info & Storage Zone Type
    SELECT b.max_capacity_g, sz.zone_type 
    INTO v_max_cap, v_zone_type
    FROM bins b
    JOIN storage_zones sz ON b.zone_id = sz.id
    WHERE b.id = NEW.bin_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BIN_NOT_FOUND: Bin % does not exist', NEW.bin_id
            USING ERRCODE = '23503';
    END IF;

    -- 2. Quarantine Rule: Picks directly from QUARANTINE zone are strictly forbidden!
    IF v_zone_type = 'QUARANTINE' AND NEW.move_type = 'PICK' THEN
        RAISE EXCEPTION 'BS001: Quality quarantined stock cannot be picked for dispatch (Bin in QUARANTINE zone)'
            USING ERRCODE = 'BS001';
    END IF;

    -- 3. Calculate current total stock in target bin
    SELECT COALESCE(SUM(qty_g), 0) INTO v_current_bin_total
    FROM bin_inventory
    WHERE bin_id = NEW.bin_id;

    -- 4. Capacity Guard Check
    IF (v_current_bin_total + NEW.qty_delta_g) > v_max_cap THEN
        RAISE EXCEPTION 'BS006: Bin capacity exceeded. Current: % g, Attempted delta: % g, Max capacity: % g',
            v_current_bin_total, NEW.qty_delta_g, v_max_cap
            USING ERRCODE = 'BS006';
    END IF;

    -- 5. Fetch current quantity for this specific batch in this bin
    SELECT COALESCE(qty_g, 0) INTO v_bin_qty
    FROM bin_inventory
    WHERE bin_id = NEW.bin_id AND batch_id = NEW.batch_id;

    IF (COALESCE(v_bin_qty, 0) + NEW.qty_delta_g) < 0 THEN
        RAISE EXCEPTION 'BS007: Insufficient batch stock in bin. Available: % g, Requested delta: % g',
            v_bin_qty, NEW.qty_delta_g
            USING ERRCODE = 'BS007';
    END IF;

    -- 6. Apply change to bin_inventory
    PERFORM set_config('app.allow_bin_inventory_direct_update', 'true', true);

    INSERT INTO bin_inventory (bin_id, batch_id, qty_g, last_updated_at)
    VALUES (NEW.bin_id, NEW.batch_id, NEW.qty_delta_g, CURRENT_TIMESTAMP)
    ON CONFLICT (bin_id, batch_id) DO UPDATE 
    SET qty_g = bin_inventory.qty_g + EXCLUDED.qty_g,
        last_updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_bin_movement ON bin_movements;
CREATE TRIGGER trg_apply_bin_movement
    BEFORE INSERT ON bin_movements
    FOR EACH ROW
    EXECUTE FUNCTION fn_process_bin_movement();

-- 7. Verification Invariant View: Bin Inventory vs Batch Balance
CREATE OR REPLACE VIEW v_bin_vs_batch_mismatch AS
SELECT 
    b.id AS batch_id,
    b.batch_no,
    w.name AS warehouse_name,
    c.name AS commodity_name,
    b.current_qty_g AS batch_ledger_balance_g,
    COALESCE(SUM(bi.qty_g), 0) AS total_bin_balance_g,
    (b.current_qty_g - COALESCE(SUM(bi.qty_g), 0)) AS discrepancy_g
FROM batches b
JOIN warehouses w ON b.warehouse_id = w.id
JOIN commodities c ON b.commodity_id = c.id
LEFT JOIN bin_inventory bi ON b.id = bi.batch_id
GROUP BY b.id, b.batch_no, w.name, c.name, b.current_qty_g
HAVING b.current_qty_g <> COALESCE(SUM(bi.qty_g), 0);

