-- ============================================================================
-- Seed Data: BhandarSetu PDS Simulation
-- Godowns: 2 | Commodities: 4 | Shops: 20 | Batches: 30
-- Includes: Active Batches, 1 Quality Held, 1 Expired, 1 Near-Expiry
-- ============================================================================

-- Disable mutation triggers temporarily for initial clean seed reset if needed
TRUNCATE ration_shops, goods_receipts, batches, dispatch_requests, 
         dispatch_allocations, quality_holds, fifo_exceptions, users, 
         commodities, warehouses CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Warehouses (Godowns)
-- ----------------------------------------------------------------------------
INSERT INTO warehouses (id, code, name, district, state, capacity_mt) VALUES
('11111111-1111-1111-1111-111111111111', 'GDN-NGP-01', 'Nagpur Central Food Godown', 'Nagpur', 'Maharashtra', 10000.00),
('22222222-2222-2222-2222-222222222222', 'GDN-PUN-01', 'Pune District Buffer Godown', 'Pune', 'Maharashtra', 8000.00);

-- ----------------------------------------------------------------------------
-- 2. Commodities (Standardized PDS Grains)
-- ----------------------------------------------------------------------------
INSERT INTO commodities (id, code, name, standard_pack_size_g, shelf_life_days) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'WHEAT-A', 'Wheat Grade A (Sona Moti)', 50000, 365),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RICE-PARBOIL', 'Parboiled Rice (Common)', 50000, 365),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'SUGAR-M30', 'Refined Sugar M-30', 50000, 730),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'COARSE-BAJRA', 'Pearl Millet (Bajra)', 50000, 180);

-- ----------------------------------------------------------------------------
-- 3. Users (Separation of Duties / Maker-Checker)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, username, full_name, role, warehouse_id) VALUES
('u0000001-0000-0000-0000-000000000001', 'emp_ramesh', 'Ramesh Patil (Store Keeper)', 'STORE_EMPLOYEE', '11111111-1111-1111-1111-111111111111'),
('u0000002-0000-0000-0000-000000000002', 'emp_suresh', 'Suresh Kadam (Store Keeper)', 'STORE_EMPLOYEE', '22222222-2222-2222-2222-222222222222'),
('u0000003-0000-0000-0000-000000000003', 'qo_anita', 'Dr. Anita Rao (Quality Inspector)', 'QUALITY_OFFICER', '11111111-1111-1111-1111-111111111111'),
('u0000004-0000-0000-0000-000000000004', 'appr_deshmukh', 'V. K. Deshmukh (District Supply Officer)', 'APPROVER', '11111111-1111-1111-1111-111111111111'),
('u0000005-0000-0000-0000-000000000005', 'aud_sharma', 'P. K. Sharma (State PDS Vigilance Auditor)', 'AUDITOR', NULL),
('u0000006-0000-0000-0000-000000000006', 'admin_sys', 'PDS Systems Administrator', 'ADMIN', NULL),
('u0000007-0000-0000-0000-000000000007', 'emp_rakesh', 'Rakesh Sharma (Store Keeper)', 'STORE_EMPLOYEE', '11111111-1111-1111-1111-111111111111');

-- ----------------------------------------------------------------------------
-- 4. Ration Shops (Fair Price Shops - 10 Nagpur, 10 Pune)
-- ----------------------------------------------------------------------------
INSERT INTO ration_shops (id, fps_code, owner_name, village_ward, district, warehouse_id) VALUES
-- Nagpur Godown Shops
('s0000001-0000-0000-0000-000000000001', 'FPS-NGP-101', 'Ganesh Kirana Bhandar', 'Sitabuldi Ward 4', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000002-0000-0000-0000-000000000002', 'FPS-NGP-102', 'Maa Laxmi Sahakari Grahak', 'Dharampeth Ward 9', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000003-0000-0000-0000-000000000003', 'FPS-NGP-103', 'Jai Hind PDS Kendra', 'Itwari Ward 14', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000004-0000-0000-0000-000000000004', 'FPS-NGP-104', 'Pragati Mahila Mandal', 'Sadar Bazar', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000005-0000-0000-0000-000000000005', 'FPS-NGP-105', 'Kisan Kalyan Ration Shop', 'Kamptee Village', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000006-0000-0000-0000-000000000006', 'FPS-NGP-106', 'Samarth Seva Sanstha', 'Hingna Rural Ward 2', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000007-0000-0000-0000-000000000007', 'FPS-NGP-107', 'Ekta Grahak Vitaran', 'Katol Town Ward 1', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000008-0000-0000-0000-000000000008', 'FPS-NGP-108', 'Shri Ram Annachhatra', 'Umred Road Ward 7', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000009-0000-0000-0000-000000000009', 'FPS-NGP-109', 'Janata Dhanya Bhandar', 'Manewada Ward 18', 'Nagpur', '11111111-1111-1111-1111-111111111111'),
('s0000010-0000-0000-0000-000000000010', 'FPS-NGP-110', 'Kranti Jyoti Savitribai FPS', 'Nandanvan Ward 22', 'Nagpur', '11111111-1111-1111-1111-111111111111'),

-- Pune Godown Shops
('s0000011-0000-0000-0000-000000000011', 'FPS-PUN-201', 'Shivaji Maharaj Grahak Vitaran', 'Shivajinagar Ward 3', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000012-0000-0000-0000-000000000012', 'FPS-PUN-202', 'Saraswati PDS Kendra', 'Kothrud Ward 11', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000013-0000-0000-0000-000000000013', 'FPS-PUN-203', 'Sahyadri Sahakari Sanstha', 'Hadapsar Ward 8', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000014-0000-0000-0000-000000000014', 'FPS-PUN-204', 'Sant Tukaram Dhanya Kendra', 'Pimpri Ward 5', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000015-0000-0000-0000-000000000015', 'FPS-PUN-205', 'Chhatrapati Sambhaji FPS', 'Chinchwad Ward 16', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000016-0000-0000-0000-000000000016', 'FPS-PUN-206', 'Dnyaneshwar Vitaran Kendra', 'Alandi Rural', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000017-0000-0000-0000-000000000017', 'FPS-PUN-207', 'Sinhagad Annapurna Bhandar', 'Warje Ward 19', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000018-0000-0000-0000-000000000018', 'FPS-PUN-208', 'Gondhale Ration Mart', 'Baramati Town', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000019-0000-0000-0000-000000000019', 'FPS-PUN-209', 'Indrayani Khadyanna Bhandar', 'Dehu Road', 'Pune', '22222222-2222-2222-2222-222222222222'),
('s0000020-0000-0000-0000-000000000020', 'FPS-PUN-210', 'Bhimashankar PDS Kendra', 'Manchar Rural', 'Pune', '22222222-2222-2222-2222-222222222222');

-- ----------------------------------------------------------------------------
-- 5. Helper Procedure to Seed Goods Receipts, Batches & Initial Movements
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION seed_batch_with_receipt(
    p_batch_id UUID,
    p_batch_no VARCHAR(100),
    p_wh_id UUID,
    p_comm_id UUID,
    p_user_id UUID,
    p_source VARCHAR(255),
    p_vehicle VARCHAR(50),
    p_doc_ref VARCHAR(100),
    p_rec_date DATE,
    p_exp_date DATE,
    p_qty_kg NUMERIC,
    p_initial_status batch_status DEFAULT 'AVAILABLE'
) RETURNS VOID AS $$
DECLARE
    v_receipt_id UUID := gen_random_uuid();
    v_receipt_no VARCHAR(100);
    v_qty_g BIGINT := (p_qty_kg * 1000)::BIGINT;
BEGIN
    v_receipt_no := 'GR-' || to_char(p_rec_date, 'YYYYMMDD') || '-' || substr(p_batch_no, 1, 8);

    -- 1. Insert Goods Receipt
    INSERT INTO goods_receipts (
        id, receipt_no, warehouse_id, supplier_source, 
        vehicle_no, document_ref, received_by, received_at, created_at
    ) VALUES (
        v_receipt_id, v_receipt_no, p_wh_id, p_source, 
        p_vehicle, p_doc_ref, p_user_id, p_rec_date::timestamptz, p_rec_date::timestamptz
    );

    -- 2. Insert Batch (starting at 0 so stock_movement trigger initializes current_qty_g properly)
    INSERT INTO batches (
        id, batch_no, receipt_id, commodity_id, warehouse_id,
        received_date, expiry_date, received_qty_g, current_qty_g,
        status, created_at, updated_at
    ) VALUES (
        p_batch_id, p_batch_no, v_receipt_id, p_comm_id, p_wh_id,
        p_rec_date, p_exp_date, v_qty_g, 0,
        p_initial_status, p_rec_date::timestamptz, p_rec_date::timestamptz
    );

    -- 3. Insert Initial RECEIPT Movement (triggers balance update to v_qty_g and cryptographic hash chain)
    INSERT INTO stock_movements (
        movement_type, batch_id, qty_delta_g, ref_type, ref_id,
        created_by, created_at
    ) VALUES (
        'RECEIPT', p_batch_id, v_qty_g, 'GOODS_RECEIPT', v_receipt_id,
        p_user_id, p_rec_date::timestamptz
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 6. Populate 30 Realistically Varied Batches
-- ----------------------------------------------------------------------------

-- NAGPUR GODOWN: WHEAT-A (6 batches spanning various age groups)
-- Batch 1: Oldest stock (110 days ago -> 90+ days bucket) - 400 kg (400,000 g)
SELECT seed_batch_with_receipt(
    'b0000001-0000-0000-0000-000000000001', 'BATCH-WHT-2026-001',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'FCI Base Depot Gondia', 'MH-31-AP-4921', 'DC/FCI/0942',
    (CURRENT_DATE - INTERVAL '110 days')::DATE, (CURRENT_DATE + INTERVAL '255 days')::DATE, 400.00
);

-- Batch 2: Next oldest stock (80 days ago -> 61-90 days bucket) - 600 kg (600,000 g)
SELECT seed_batch_with_receipt(
    'b0000002-0000-0000-0000-000000000002', 'BATCH-WHT-2026-002',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'FCI Base Depot Wardha', 'MH-31-BQ-7812', 'DC/FCI/1051',
    (CURRENT_DATE - INTERVAL '80 days')::DATE, (CURRENT_DATE + INTERVAL '285 days')::DATE, 600.00
);

-- Batch 3: Next oldest stock (50 days ago -> 31-60 days bucket) - 1,200 kg
SELECT seed_batch_with_receipt(
    'b0000003-0000-0000-0000-000000000003', 'BATCH-WHT-2026-003',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'Punjab Agro Logistics', 'PB-08-AX-9910', 'DC/PAL/4412',
    (CURRENT_DATE - INTERVAL '50 days')::DATE, (CURRENT_DATE + INTERVAL '315 days')::DATE, 1200.00
);

-- Batch 4: QUALITY HOLD Batch (Moisture > 14% quarantined by Dr. Anita Rao) - 800 kg
SELECT seed_batch_with_receipt(
    'b0000004-0000-0000-0000-000000000004', 'BATCH-WHT-2026-004-HOLD',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'Haryana State Warehousing', 'HR-38-Z-1044', 'DC/HSW/8821',
    (CURRENT_DATE - INTERVAL '40 days')::DATE, (CURRENT_DATE + INTERVAL '325 days')::DATE, 800.00
);

-- Place the Quality Hold via stored routine
SELECT place_quality_hold(
    'b0000004-0000-0000-0000-000000000004',
    'Moisture content 14.8% exceeds FSSAI threshold (12%). Batch quarantined for aeration and fumigation.',
    'u0000003-0000-0000-0000-000000000003'
);

-- Batch 5: Fresh Stock (20 days ago -> 0-30 days bucket) - 2,500 kg
SELECT seed_batch_with_receipt(
    'b0000005-0000-0000-0000-000000000005', 'BATCH-WHT-2026-005',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'FCI Base Depot Nagpur Rural', 'MH-40-BL-1123', 'DC/FCI/1299',
    (CURRENT_DATE - INTERVAL '20 days')::DATE, (CURRENT_DATE + INTERVAL '345 days')::DATE, 2500.00
);

-- Batch 6: Brand New Stock (2 days ago) - 5,000 kg
SELECT seed_batch_with_receipt(
    'b0000006-0000-0000-0000-000000000006', 'BATCH-WHT-2026-006',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'Madhya Pradesh Civil Supplies', 'MP-09-GE-5511', 'DC/MPCS/7012',
    (CURRENT_DATE - INTERVAL '2 days')::DATE, (CURRENT_DATE + INTERVAL '363 days')::DATE, 5000.00
);

-- NAGPUR GODOWN: RICE-PARBOIL (6 batches)
SELECT seed_batch_with_receipt(
    'b0000007-0000-0000-0000-000000000007', 'BATCH-RIC-2026-001',
    '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000001-0000-0000-0000-000000000001', 'Andhra Pradesh Rice Millers Pool', 'AP-16-TX-3312', 'DC/APRM/9901',
    (CURRENT_DATE - INTERVAL '95 days')::DATE, (CURRENT_DATE + INTERVAL '270 days')::DATE, 800.00
);

SELECT seed_batch_with_receipt(
    'b0000008-0000-0000-0000-000000000008', 'BATCH-RIC-2026-002',
    '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000001-0000-0000-0000-000000000001', 'Chhattisgarh State Civil Supplies', 'CG-04-E-4491', 'DC/CGCS/2011',
    (CURRENT_DATE - INTERVAL '75 days')::DATE, (CURRENT_DATE + INTERVAL '290 days')::DATE, 1500.00
);

SELECT seed_batch_with_receipt(
    'b0000009-0000-0000-0000-000000000009', 'BATCH-RIC-2026-003',
    '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000001-0000-0000-0000-000000000001', 'Telangana FCI Buffer Stock', 'TS-08-UB-7788', 'DC/TFCI/4188',
    (CURRENT_DATE - INTERVAL '45 days')::DATE, (CURRENT_DATE + INTERVAL '320 days')::DATE, 2000.00
);

SELECT seed_batch_with_receipt(
    'b0000010-0000-0000-0000-000000000010', 'BATCH-RIC-2026-004',
    '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000001-0000-0000-0000-000000000001', 'Gondia Rice Producers Federation', 'MH-35-K-8812', 'DC/GRPF/3002',
    (CURRENT_DATE - INTERVAL '15 days')::DATE, (CURRENT_DATE + INTERVAL '350 days')::DATE, 3000.00
);

-- NAGPUR GODOWN: SUGAR-M30 (4 batches)
SELECT seed_batch_with_receipt(
    'b0000011-0000-0000-0000-000000000011', 'BATCH-SGR-2026-001',
    '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'u0000001-0000-0000-0000-000000000001', 'Kolhapur Sugar Mills Sahakari', 'MH-09-DT-9912', 'DC/KSM/101',
    (CURRENT_DATE - INTERVAL '100 days')::DATE, (CURRENT_DATE + INTERVAL '630 days')::DATE, 1000.00
);

SELECT seed_batch_with_receipt(
    'b0000012-0000-0000-0000-000000000012', 'BATCH-SGR-2026-002',
    '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'u0000001-0000-0000-0000-000000000001', 'Sangli Sahakari Sakhar Karkhana', 'MH-10-Q-4451', 'DC/SSK/212',
    (CURRENT_DATE - INTERVAL '30 days')::DATE, (CURRENT_DATE + INTERVAL '700 days')::DATE, 1500.00
);

-- NAGPUR GODOWN: COARSE-BAJRA (Includes 1 EXPIRED batch and 1 NEAR-EXPIRY batch)
-- Batch 13: EXPIRED BATCH (expired 10 days ago) - Must be skipped by FIFO engine!
SELECT seed_batch_with_receipt(
    'b0000013-0000-0000-0000-000000000013', 'BATCH-BJR-2025-001-EXPIRED',
    '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'u0000001-0000-0000-0000-000000000001', 'Rajasthan Agro Corporation', 'RJ-14-GH-1122', 'DC/RAC/7711',
    (CURRENT_DATE - INTERVAL '190 days')::DATE, (CURRENT_DATE - INTERVAL '10 days')::DATE, 500.00,
    'EXPIRED'
);

-- Batch 14: CRITICAL NEAR-EXPIRY BATCH (expires in 5 days) - flagged in dashboard
SELECT seed_batch_with_receipt(
    'b0000014-0000-0000-0000-000000000014', 'BATCH-BJR-2026-002-NEAREXP',
    '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'u0000001-0000-0000-0000-000000000001', 'Gujarat Agro Industries', 'GJ-01-AX-9933', 'DC/GAI/5512',
    (CURRENT_DATE - INTERVAL '175 days')::DATE, (CURRENT_DATE + INTERVAL '5 days')::DATE, 750.00
);

-- Batch 15: Fresh Bajra (30 days ago)
SELECT seed_batch_with_receipt(
    'b0000015-0000-0000-0000-000000000015', 'BATCH-BJR-2026-003',
    '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'u0000001-0000-0000-0000-000000000001', 'Maharashtra Beej Nigam', 'MH-31-CB-9022', 'DC/MBN/8811',
    (CURRENT_DATE - INTERVAL '30 days')::DATE, (CURRENT_DATE + INTERVAL '150 days')::DATE, 2000.00
);

-- PUNE GODOWN: Batches 16 to 30 (Wheat, Rice, Sugar, Bajra)
SELECT seed_batch_with_receipt(
    'b0000016-0000-0000-0000-000000000016', 'BATCH-PUN-WHT-001',
    '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000002-0000-0000-0000-000000000002', 'FCI Base Depot Daund', 'MH-12-FG-4411', 'DC/PUN/101',
    (CURRENT_DATE - INTERVAL '92 days')::DATE, (CURRENT_DATE + INTERVAL '273 days')::DATE, 700.00
);

SELECT seed_batch_with_receipt(
    'b0000017-0000-0000-0000-000000000017', 'BATCH-PUN-WHT-002',
    '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000002-0000-0000-0000-000000000002', 'FCI Base Depot Manmad', 'MH-15-AB-1922', 'DC/PUN/102',
    (CURRENT_DATE - INTERVAL '62 days')::DATE, (CURRENT_DATE + INTERVAL '303 days')::DATE, 1100.00
);

SELECT seed_batch_with_receipt(
    'b0000018-0000-0000-0000-000000000018', 'BATCH-PUN-WHT-003',
    '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000002-0000-0000-0000-000000000002', 'Nashik Agro Supply Hub', 'MH-15-GH-8877', 'DC/PUN/103',
    (CURRENT_DATE - INTERVAL '25 days')::DATE, (CURRENT_DATE + INTERVAL '340 days')::DATE, 2500.00
);

SELECT seed_batch_with_receipt(
    'b0000019-0000-0000-0000-000000000019', 'BATCH-PUN-WHT-004',
    '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000002-0000-0000-0000-000000000002', 'FCI Base Depot Daund', 'MH-12-FG-9900', 'DC/PUN/104',
    (CURRENT_DATE - INTERVAL '5 days')::DATE, (CURRENT_DATE + INTERVAL '360 days')::DATE, 4000.00
);

SELECT seed_batch_with_receipt(
    'b0000020-0000-0000-0000-000000000020', 'BATCH-PUN-RIC-001',
    '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000002-0000-0000-0000-000000000002', 'Raigad Rice Processing Unit', 'MH-06-K-3312', 'DC/PUN/201',
    (CURRENT_DATE - INTERVAL '88 days')::DATE, (CURRENT_DATE + INTERVAL '277 days')::DATE, 900.00
);

SELECT seed_batch_with_receipt(
    'b0000021-0000-0000-0000-000000000021', 'BATCH-PUN-RIC-002',
    '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000002-0000-0000-0000-000000000002', 'Bhandara Paddy Millers Association', 'MH-36-P-8811', 'DC/PUN/202',
    (CURRENT_DATE - INTERVAL '55 days')::DATE, (CURRENT_DATE + INTERVAL '310 days')::DATE, 1800.00
);

SELECT seed_batch_with_receipt(
    'b0000022-0000-0000-0000-000000000022', 'BATCH-PUN-RIC-003',
    '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000002-0000-0000-0000-000000000002', 'Andhra Rice Syndicate', 'AP-07-TY-4411', 'DC/PUN/203',
    (CURRENT_DATE - INTERVAL '18 days')::DATE, (CURRENT_DATE + INTERVAL '347 days')::DATE, 3500.00
);

SELECT seed_batch_with_receipt(
    'b0000023-0000-0000-0000-000000000023', 'BATCH-PUN-SGR-001',
    '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'u0000002-0000-0000-0000-000000000002', 'Baramati Agro Sugar Division', 'MH-12-BA-5511', 'DC/PUN/301',
    (CURRENT_DATE - INTERVAL '105 days')::DATE, (CURRENT_DATE + INTERVAL '625 days')::DATE, 1200.00
);

SELECT seed_batch_with_receipt(
    'b0000024-0000-0000-0000-000000000024', 'BATCH-PUN-SGR-002',
    '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'u0000002-0000-0000-0000-000000000002', 'Pune District Co-operative Sugar Federation', 'MH-12-CS-9911', 'DC/PUN/302',
    (CURRENT_DATE - INTERVAL '40 days')::DATE, (CURRENT_DATE + INTERVAL '690 days')::DATE, 2200.00
);

SELECT seed_batch_with_receipt(
    'b0000025-0000-0000-0000-000000000025', 'BATCH-PUN-BJR-001',
    '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'u0000002-0000-0000-0000-000000000002', 'Solapur Millet Producers Co-op', 'MH-13-BN-4411', 'DC/PUN/401',
    (CURRENT_DATE - INTERVAL '70 days')::DATE, (CURRENT_DATE + INTERVAL '110 days')::DATE, 1400.00
);

SELECT seed_batch_with_receipt(
    'b0000026-0000-0000-0000-000000000026', 'BATCH-PUN-BJR-002',
    '22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'u0000002-0000-0000-0000-000000000002', 'Ahmednagar Krishi Utpadan', 'MH-17-BC-9011', 'DC/PUN/402',
    (CURRENT_DATE - INTERVAL '15 days')::DATE, (CURRENT_DATE + INTERVAL '165 days')::DATE, 2500.00
);

SELECT seed_batch_with_receipt(
    'b0000027-0000-0000-0000-000000000027', 'BATCH-WHT-2026-007',
    '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'u0000001-0000-0000-0000-000000000001', 'FCI Base Depot Nagpur Rural', 'MH-40-BL-9900', 'DC/FCI/1301',
    (CURRENT_DATE - INTERVAL '10 days')::DATE, (CURRENT_DATE + INTERVAL '355 days')::DATE, 3000.00
);

SELECT seed_batch_with_receipt(
    'b0000028-0000-0000-0000-000000000028', 'BATCH-RIC-2026-005',
    '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'u0000001-0000-0000-0000-000000000001', 'Chhattisgarh State Civil Supplies', 'CG-04-E-9911', 'DC/CGCS/2012',
    (CURRENT_DATE - INTERVAL '8 days')::DATE, (CURRENT_DATE + INTERVAL '357 days')::DATE, 4000.00
);

SELECT seed_batch_with_receipt(
    'b0000029-0000-0000-0000-000000000029', 'BATCH-SGR-2026-003',
    '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'u0000001-0000-0000-0000-000000000001', 'Kolhapur Sugar Mills Sahakari', 'MH-09-DT-1122', 'DC/KSM/102',
    (CURRENT_DATE - INTERVAL '5 days')::DATE, (CURRENT_DATE + INTERVAL '725 days')::DATE, 3000.00
);

SELECT seed_batch_with_receipt(
    'b0000030-0000-0000-0000-000000000030', 'BATCH-BJR-2026-004',
    '11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'u0000001-0000-0000-0000-000000000001', 'Gujarat Agro Industries', 'GJ-01-AX-1122', 'DC/GAI/5513',
    (CURRENT_DATE - INTERVAL '1 day')::DATE, (CURRENT_DATE + INTERVAL '179 days')::DATE, 5000.00
);

-- Clean up helper function
DROP FUNCTION seed_batch_with_receipt;

-- ----------------------------------------------------------------------------
-- 9. MILESTONE M9 SEED: PHYSICAL STORAGE ZONES & 200+ BINS
-- ----------------------------------------------------------------------------

-- A. Storage Zones for Nagpur (WH-NGP-01) and Pune (WH-PUN-01)
INSERT INTO storage_zones (id, warehouse_id, zone_code, zone_name, zone_type) VALUES
('z1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'BULK-NGP', 'Deep Bulk Storage Area', 'BULK'),
('z1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'PF-NGP', 'Fast-Mover Pick Face (Dispatch Adjacent)', 'PICK_FACE'),
('z1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'QUAR-NGP', 'Quarantine Barricaded Hold Cell', 'QUARANTINE'),
('z1111111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'STAGE-NGP', 'Outbound Marshalling & Vehicle Staging', 'DISPATCH_STAGING'),
('z1111111-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'RET-NGP', 'Customer Refusal Triage Area', 'RETURNS'),

('z2222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'BULK-PUN', 'Deep Bulk Storage Area', 'BULK'),
('z2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'PF-PUN', 'Fast-Mover Pick Face', 'PICK_FACE'),
('z2222222-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'QUAR-PUN', 'Quarantine Barricaded Hold Cell', 'QUARANTINE'),
('z2222222-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'STAGE-PUN', 'Outbound Staging', 'DISPATCH_STAGING'),
('z2222222-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'RET-PUN', 'Triage Area', 'RETURNS')
ON CONFLICT (warehouse_id, zone_code) DO NOTHING;

-- B. Generate 200+ Godown Bins across Racks A, B, C, D, Pick-Face, and Quarantine
DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_bulk_zone UUID := 'z1111111-0000-0000-0000-000000000001';
    v_pf_zone UUID := 'z1111111-0000-0000-0000-000000000002';
    v_quar_zone UUID := 'z1111111-0000-0000-0000-000000000003';
    v_stg_zone UUID := 'z1111111-0000-0000-0000-000000000004';
    v_rack TEXT;
    v_bay INT;
    v_level INT;
    v_seq INT := 100;
BEGIN
    -- 1. Bulk Racks A, B, C, D (4 racks * 10 bays * 4 levels = 160 bulk bins)
    FOREACH v_rack IN ARRAY ARRAY['A', 'B', 'C', 'D'] LOOP
        FOR v_bay IN 1..10 LOOP
            FOR v_level IN 1..4 LOOP
                v_seq := v_seq + 1;
                INSERT INTO bins (
                    warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence
                ) VALUES (
                    v_wh_id, v_bulk_zone, 
                    'BLK-' || v_rack || '-' || LPAD(v_bay::text, 2, '0') || '-' || v_level::text,
                    v_rack, v_bay::text, v_level::text,
                    50000000, -- 50 MT capacity per bin
                    v_seq
                ) ON CONFLICT (warehouse_id, bin_code) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    -- 2. Fast-Mover Pick Face Bins (PF-01 to PF-20 = 20 bins)
    FOR v_bay IN 1..20 LOOP
        v_seq := v_seq + 1;
        INSERT INTO bins (
            warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence
        ) VALUES (
            v_wh_id, v_pf_zone, 
            'PF-' || LPAD(v_bay::text, 2, '0'),
            'PF', v_bay::text, '1',
            20000000, -- 20 MT
            v_bay -- High priority pick sequence (1..20)
        ) ON CONFLICT (warehouse_id, bin_code) DO NOTHING;
    END LOOP;

    -- 3. Quarantine Barricade Bins (Q-01 to Q-10 = 10 bins)
    FOR v_bay IN 1..10 LOOP
        INSERT INTO bins (
            warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence
        ) VALUES (
            v_wh_id, v_quar_zone, 
            'QUAR-' || LPAD(v_bay::text, 2, '0'),
            'Q', v_bay::text, '1',
            25000000, 999
        ) ON CONFLICT (warehouse_id, bin_code) DO NOTHING;
    END LOOP;

    -- 4. Dispatch Staging Docks (STG-01 to STG-10 = 10 bins)
    FOR v_bay IN 1..10 LOOP
        INSERT INTO bins (
            warehouse_id, zone_id, bin_code, rack, bay, level, max_capacity_g, pick_sequence
        ) VALUES (
            v_wh_id, v_stg_zone, 
            'STG-DOCK-' || LPAD(v_bay::text, 2, '0'),
            'STG', v_bay::text, '1',
            100000000, 1
        ) ON CONFLICT (warehouse_id, bin_code) DO NOTHING;
    END LOOP;
END $$;

-- C. Distribute Nagpur Batches into Physical Bins (Ensuring Zero Invariant Mismatch)
DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_user_id UUID := 'u0000001-0000-0000-0000-000000000001';
    v_bin_lane_1 UUID;
    v_bin_lane_2 UUID;
    v_bin_lane_3 UUID;
    v_bin_quar UUID;
    v_bin_pf UUID;
    v_b RECORD;
    v_target_bin UUID;
    v_bin_cur_idx INT := 0;
    v_bulk_bins UUID[];
BEGIN
    -- Select specific bins for special test scenarios
    SELECT id INTO v_bin_lane_1 FROM bins WHERE warehouse_id = v_wh_id AND bin_code = 'BLK-A-01-1';
    SELECT id INTO v_bin_lane_2 FROM bins WHERE warehouse_id = v_wh_id AND bin_code = 'BLK-A-01-2';
    SELECT id INTO v_bin_lane_3 FROM bins WHERE warehouse_id = v_wh_id AND bin_code = 'BLK-A-01-3';
    SELECT id INTO v_bin_quar FROM bins WHERE warehouse_id = v_wh_id AND bin_code = 'QUAR-01';
    SELECT id INTO v_bin_pf FROM bins WHERE warehouse_id = v_wh_id AND bin_code = 'PF-01';

    SELECT ARRAY_AGG(id) INTO v_bulk_bins 
    FROM bins 
    WHERE warehouse_id = v_wh_id AND bin_code NOT IN ('BLK-A-01-1', 'BLK-A-01-2', 'BLK-A-01-3', 'QUAR-01', 'PF-01')
      AND rack IN ('A', 'B', 'C', 'D');

    -- Iterate through each batch in Nagpur Godown and slot into bins via bin_movements PUTAWAY
    FOR v_b IN SELECT id, batch_no, current_qty_g, status, expiry_date FROM batches WHERE warehouse_id = v_wh_id ORDER BY received_date ASC LOOP
        IF v_b.current_qty_g > 0 THEN
            -- Scenario 1: One held batch in quarantine bin
            IF v_b.status = 'QUALITY_HOLD' THEN
                v_target_bin := v_bin_quar;
            -- Scenario 2: One near-expiry batch in Pick Face
            ELSIF v_b.expiry_date IS NOT NULL AND v_b.expiry_date <= (CURRENT_DATE + INTERVAL '20 days') THEN
                v_target_bin := v_bin_pf;
            -- Scenario 3: FIFO Lane Order (Rack A Bay 1 has 3 batches in exact FIFO sequence)
            ELSIF v_b.batch_no = 'BATCH-WHT-2026-001' THEN
                v_target_bin := v_bin_lane_1;
            ELSIF v_b.batch_no = 'BATCH-WHT-2026-002' THEN
                v_target_bin := v_bin_lane_2;
            ELSIF v_b.batch_no = 'BATCH-WHT-2026-003' THEN
                v_target_bin := v_bin_lane_3;
            ELSE
                -- Distribute across remaining bulk bins
                v_bin_cur_idx := (v_bin_cur_idx % array_length(v_bulk_bins, 1)) + 1;
                v_target_bin := v_bulk_bins[v_bin_cur_idx];
            END IF;

            -- Insert putaway movement (which triggers bin_inventory population)
            INSERT INTO bin_movements (
                warehouse_id, bin_id, batch_id, qty_delta_g, move_type, removal_reason, created_by
            ) VALUES (
                v_wh_id, v_target_bin, v_b.id, v_b.current_qty_g, 'PUTAWAY', NULL, v_user_id
            );
        END IF;
    END LOOP;
END $$;

-- D. Seed Open Putaway & Pick Tasks for Control Tower Live Queue
DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_b1 UUID := 'b0000001-0000-0000-0000-000000000001';
    v_b2 UUID := 'b0000002-0000-0000-0000-000000000002';
    v_bin_target UUID;
BEGIN
    SELECT id INTO v_bin_target FROM bins WHERE warehouse_id = v_wh_id AND bin_code = 'BLK-A-02-1';

    -- Open putaway task
    INSERT INTO putaway_tasks (
        task_no, batch_id, warehouse_id, qty_g, suggested_bin_id, status, sla_due_at
    ) VALUES (
        'PT-2026-0101', v_b1, v_wh_id, 2000000, v_bin_target, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '1 hour'
    ) ON CONFLICT (task_no) DO NOTHING;
END $$;

-- E. Calculate ABC Classifications and Refresh All Read Models
SELECT calculate_abc_velocity('11111111-1111-1111-1111-111111111111');
SELECT refresh_control_tower_read_models('11111111-1111-1111-1111-111111111111');

