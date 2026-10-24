-- ============================================================================
-- Migration 001: Core Schema, Master Entities, Partitions & Batch Tracking
-- BhandarSetu - iPDS Warehouse Batch-wise FIFO/FEFO Allocation Engine
-- Milestone M1 Deliverable
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ----------------------------------------------------------------------------
-- Custom ENUM Types
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'STORE_EMPLOYEE',
        'SUPERVISOR',
        'QUALITY_OFFICER',
        'APPROVER',
        'AUDITOR',
        'ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE allocation_mode AS ENUM (
        'FIFO',
        'FEFO'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM (
        'AVAILABLE',
        'QUALITY_HOLD',
        'PARTIAL_HOLD',
        'EXHAUSTED',
        'EXPIRED',
        'QUARANTINED_RECALL'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE dispatch_status AS ENUM (
        'DRAFT',
        'ALLOCATED',
        'EXCEPTION_PENDING',
        'APPROVED',
        'DISPATCHED',
        'SHORTFALL',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM (
        'RECEIPT',
        'DISPATCH',
        'HOLD',
        'RELEASE',
        'PARTIAL_HOLD',
        'ADJUSTMENT',
        'WRITE_OFF',
        'RETURN',
        'REVERSAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE quality_hold_status AS ENUM (
        'ACTIVE',
        'RELEASE_PENDING',
        'RELEASED',
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE exception_status AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'EXPIRED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE inspection_result AS ENUM (
        'PASS',
        'FAIL',
        'CONDITIONAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE variance_reason AS ENUM (
        'SHRINKAGE',
        'MOISTURE_LOSS',
        'SPILLAGE',
        'PEST_DAMAGE',
        'THEFT',
        'COUNT_ERROR'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE outbox_status AS ENUM (
        'PENDING',
        'DELIVERED',
        'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- Module A: Master Data & Access
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    capacity_mt NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_warehouse_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE TABLE IF NOT EXISTS godown_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    bay VARCHAR(50) NOT NULL,
    stack_number VARCHAR(50) NOT NULL,
    max_capacity_bags INT NOT NULL DEFAULT 500,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_bay_stack UNIQUE (warehouse_id, bay, stack_number),
    CONSTRAINT chk_capacity_positive CHECK (max_capacity_bags > 0)
);

CREATE TABLE IF NOT EXISTS commodities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    allocation_policy allocation_mode NOT NULL DEFAULT 'FIFO',
    standard_pack_size_g BIGINT NOT NULL DEFAULT 50000, -- 50 kg gunny bag in grams
    min_shelf_life_days INT NOT NULL DEFAULT 90,
    default_tolerance_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pack_size_positive CHECK (standard_pack_size_g > 0),
    CONSTRAINT chk_shelf_life_positive CHECK (min_shelf_life_days > 0),
    CONSTRAINT chk_tolerance_non_neg CHECK (default_tolerance_pct >= 0)
);

CREATE TABLE IF NOT EXISTS ration_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fps_code VARCHAR(50) NOT NULL UNIQUE,
    owner_name VARCHAR(255) NOT NULL,
    village_ward VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    distance_km NUMERIC(8, 2) NOT NULL DEFAULT 10.00,
    transit_days INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fps_code_not_empty CHECK (length(trim(fps_code)) > 0),
    CONSTRAINT chk_distance_positive CHECK (distance_km >= 0),
    CONSTRAINT chk_transit_days_positive CHECK (transit_days >= 0)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_no VARCHAR(50) NOT NULL UNIQUE,
    carrier_name VARCHAR(255),
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_username_not_empty CHECK (length(trim(username)) > 0)
);

CREATE TABLE IF NOT EXISTS user_warehouse_access (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    can_write BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    delegate_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_delegation_diff_user CHECK (approver_id <> delegate_id),
    CONSTRAINT chk_delegation_valid_window CHECK (valid_to > valid_from)
);

-- ----------------------------------------------------------------------------
-- Module B: Receipts & Batches
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no VARCHAR(100) NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_source VARCHAR(255) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
    vehicle_no VARCHAR(50) NOT NULL,
    document_ref VARCHAR(100) NOT NULL,
    received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_receipt_no_not_empty CHECK (length(trim(receipt_no)) > 0)
);

CREATE TABLE IF NOT EXISTS receipt_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    declared_qty_g BIGINT NOT NULL,
    received_qty_g BIGINT NOT NULL,
    bag_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_receipt_line_qty CHECK (received_qty_g > 0)
);

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_no VARCHAR(100) NOT NULL,
    receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE RESTRICT,
    receipt_line_id UUID REFERENCES receipt_lines(id) ON DELETE RESTRICT,
    commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES godown_locations(id) ON DELETE RESTRICT,
    received_date DATE NOT NULL,
    mfg_date DATE,
    expiry_date DATE,
    received_qty_g BIGINT NOT NULL,
    current_qty_g BIGINT NOT NULL,
    held_qty_g BIGINT NOT NULL DEFAULT 0,
    status batch_status NOT NULL DEFAULT 'AVAILABLE',
    qr_code_payload TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_batch_warehouse_commodity UNIQUE (warehouse_id, commodity_id, batch_no),
    CONSTRAINT chk_received_qty_positive CHECK (received_qty_g > 0),
    CONSTRAINT chk_current_qty_non_negative CHECK (current_qty_g >= 0),
    CONSTRAINT chk_current_qty_le_received CHECK (current_qty_g <= received_qty_g),
    CONSTRAINT chk_held_qty_non_negative CHECK (held_qty_g >= 0),
    CONSTRAINT chk_held_qty_le_current CHECK (held_qty_g <= current_qty_g),
    CONSTRAINT chk_expiry_after_received CHECK (expiry_date IS NULL OR expiry_date >= received_date)
) WITH (fillfactor = 75);

-- ----------------------------------------------------------------------------
-- Module C: Append-Only Partitioned Stock Movements Ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id BIGINT GENERATED ALWAYS AS IDENTITY,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    movement_type movement_type NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    qty_delta_g BIGINT NOT NULL, -- Positive for RECEIPT/RETURN, Negative for DISPATCH, 0 for status transitions
    balance_after_g BIGINT NOT NULL,
    ref_type VARCHAR(50) NOT NULL,
    ref_id UUID NOT NULL,
    reason_code VARCHAR(50),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prev_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    row_hash TEXT NOT NULL,
    PRIMARY KEY (movement_id, created_at)
) PARTITION BY RANGE (created_at);

-- Audit Log (Partitioned monthly)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    actor_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    client_ip VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prev_hash TEXT,
    row_hash TEXT,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ----------------------------------------------------------------------------
-- Partition Generation Helper & Monthly Partitions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ensure_monthly_partitions(p_months_ahead INT DEFAULT 6)
RETURNS VOID AS $$
DECLARE
    v_start DATE := date_trunc('month', CURRENT_DATE);
    v_cur DATE;
    v_next DATE;
    v_part_name TEXT;
    v_sql TEXT;
BEGIN
    FOR i IN -1..p_months_ahead LOOP
        v_cur := v_start + (i || ' month')::interval;
        v_next := v_cur + '1 month'::interval;
        
        -- stock_movements partition
        v_part_name := 'stock_movements_y' || to_char(v_cur, 'YYYY') || 'm' || to_char(v_cur, 'MM');
        v_sql := format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF stock_movements FOR VALUES FROM (%L) TO (%L);',
            v_part_name, v_cur, v_next
        );
        EXECUTE v_sql;

        -- audit_log partition
        v_part_name := 'audit_log_y' || to_char(v_cur, 'YYYY') || 'm' || to_char(v_cur, 'MM');
        v_sql := format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L);',
            v_part_name, v_cur, v_next
        );
        EXECUTE v_sql;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Pre-generate partitions for active window
SELECT ensure_monthly_partitions(12);

-- ----------------------------------------------------------------------------
-- Performance Indexes for M1
-- ----------------------------------------------------------------------------

-- Covering index for FIFO hot path (sub-5ms)
CREATE INDEX IF NOT EXISTS idx_batches_fifo ON batches (
    warehouse_id, 
    commodity_id, 
    received_date ASC, 
    id ASC
) INCLUDE (current_qty_g, held_qty_g, batch_no)
WHERE status IN ('AVAILABLE', 'PARTIAL_HOLD') AND current_qty_g > 0;

-- Covering index for FEFO hot path (sub-5ms)
CREATE INDEX IF NOT EXISTS idx_batches_fefo ON batches (
    warehouse_id, 
    commodity_id, 
    expiry_date ASC, 
    received_date ASC, 
    id ASC
) INCLUDE (current_qty_g, held_qty_g, batch_no)
WHERE status IN ('AVAILABLE', 'PARTIAL_HOLD') AND current_qty_g > 0;

-- FK and ledger lookup indexes
CREATE INDEX IF NOT EXISTS idx_batches_warehouse ON batches (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_batches_commodity ON batches (commodity_id);
CREATE INDEX IF NOT EXISTS idx_batches_receipt ON batches (receipt_id);
CREATE INDEX IF NOT EXISTS idx_batches_location ON batches (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements (batch_id, movement_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements (ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_brin_created ON stock_movements USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_brin_created ON audit_log USING BRIN (created_at);
