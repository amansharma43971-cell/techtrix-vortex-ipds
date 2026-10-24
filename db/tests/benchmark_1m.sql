-- ============================================================================
-- BhandarSetu: High-Scale FIFO Index Scan Benchmark (1M Batches Simulation)
-- Analyzes execution plan, buffer hits, index scan efficiency, and latency
-- ============================================================================

\set ON_ERROR_STOP on

\echo '------------------------------------------------------------------------'
\echo 'Generating Scale Benchmark Data (Batches)...'
\echo '------------------------------------------------------------------------'

-- Disable balance guard temporarily for synthetic bulk generator
SET bhandarsetu.allow_batch_balance_update = 'true';

-- Generate synthetic batches in chunks if not already populated
DO $$
DECLARE
    v_wh_id UUID := '11111111-1111-1111-1111-111111111111';
    v_comm_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_receipt_id UUID;
    v_current_count INT;
BEGIN
    SELECT id INTO v_receipt_id FROM goods_receipts LIMIT 1;
    SELECT COUNT(*) INTO v_current_count FROM batches;

    -- Generate up to 100,000 / 1,000,000 batches for benchmark test
    IF v_current_count < 100000 THEN
        RAISE NOTICE 'Populating synthetic batches up to 100,000 rows for query plan benchmark...';
        INSERT INTO batches (
            id, batch_no, receipt_id, commodity_id, warehouse_id,
            received_date, expiry_date, received_qty_g, current_qty_g, status
        )
        SELECT 
            gen_random_uuid(),
            'BENCH-BATCH-' || i,
            v_receipt_id,
            v_comm_id,
            v_wh_id,
            (CURRENT_DATE - (i % 300) * INTERVAL '1 day')::date,
            (CURRENT_DATE + 365 * INTERVAL '1 day')::date,
            5000000,
            CASE WHEN (i % 10 = 0) THEN 0 ELSE 5000000 END,
            CASE 
                WHEN (i % 10 = 0) THEN 'EXHAUSTED'::batch_status
                WHEN (i % 25 = 0) THEN 'QUALITY_HOLD'::batch_status
                ELSE 'AVAILABLE'::batch_status
            END
        FROM generate_series(v_current_count + 1, 100000) AS i;
    END IF;
END $$;

-- Reset flag
SET bhandarsetu.allow_batch_balance_update = 'false';

\echo 'Analyzing batches table statistics...'
ANALYZE batches;

\echo '\n========================================================================'
\echo 'EXPLAIN (ANALYZE, BUFFERS) FOR FIFO CANDIDATE QUERY'
\echo 'Target: Index Scan on idx_batches_fifo (< 5ms latency)'
\echo '========================================================================'

EXPLAIN (ANALYZE, BUFFERS)
SELECT b.id, b.batch_no, b.received_date, b.current_qty_g
FROM batches b
WHERE b.warehouse_id = '11111111-1111-1111-1111-111111111111'
  AND b.commodity_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND b.status = 'AVAILABLE'
  AND b.current_qty_g > 0
  AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
ORDER BY b.received_date ASC, b.id ASC
LIMIT 10;
