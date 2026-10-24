#!/usr/bin/env python3
"""
BhandarSetu Latency & Throughput Benchmark Runner
Measures p95 latencies for:
1. Dry-run allocation plan calculation (Target: p95 < 10 ms)
2. Atomic dispatch confirmation (Target: p95 < 30 ms)
3. End-to-end trace provenance query (Target: p95 < 50 ms)
"""

import asyncio
import os
import time
import uuid
import statistics
import asyncpg

DB_URL = os.getenv("DATABASE_URL", "postgresql://pds_admin:pds_secret_2026@localhost:5432/bhandarsetu")

async def run_benchmark(iterations=100):
    print(f"\n========================================================")
    print(f"RUNNING BHANDARSETU PERFORMANCE BENCHMARK ({iterations} SAMPLES)")
    print(f"========================================================\n")

    conn = await asyncpg.connect(DB_URL)
    wh_id = '11111111-1111-1111-1111-111111111111'
    comm_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    shop_id = 's0000001-0000-0000-0000-000000000001'
    user_id = 'u0000001-0000-0000-0000-000000000001'

    # Benchmark 1: Dry-Run Allocation Planning (Target: p95 < 10 ms)
    dry_latencies = []
    print(">>> 1. Benchmarking Dry-Run Allocation Planning...")
    for i in range(iterations):
        req_id = str(uuid.uuid4())
        req_no = f"DSP-BENCH-DRY-{i:04d}"
        await conn.execute("""
            INSERT INTO dispatch_requests (
                id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
                requested_qty_g, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 1200000, 'DRAFT', $7);
        """, req_id, req_no, f"IDEMP-DRY-{i}-{uuid.uuid4().hex[:6]}", shop_id, comm_id, wh_id, user_id)

        t0 = time.perf_counter()
        await conn.fetchval("SELECT allocate($1, true, false);", req_id)
        t1 = time.perf_counter()
        dry_latencies.append((t1 - t0) * 1000.0)

    p50_dry = statistics.median(dry_latencies)
    p95_dry = statistics.quantiles(dry_latencies, n=20)[18] if len(dry_latencies) >= 20 else max(dry_latencies)
    print(f"  Dry-Run Allocation: p50 = {p50_dry:.2f} ms | p95 = {p95_dry:.2f} ms (Target < 10 ms)")

    # Benchmark 2: Atomic Dispatch Confirmation (Target: p95 < 30 ms)
    confirm_latencies = []
    print("\n>>> 2. Benchmarking Atomic Dispatch Confirmation...")
    for i in range(min(50, iterations)):
        req_id = str(uuid.uuid4())
        req_no = f"DSP-BENCH-CONF-{i:04d}"
        await conn.execute("""
            INSERT INTO dispatch_requests (
                id, request_no, idempotency_key, shop_id, commodity_id, warehouse_id,
                requested_qty_g, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 50000, 'DRAFT', $7);
        """, req_id, req_no, f"IDEMP-CONF-{i}-{uuid.uuid4().hex[:6]}", shop_id, comm_id, wh_id, user_id)

        t0 = time.perf_counter()
        await conn.fetchval("SELECT allocate($1, false, false);", req_id)
        t1 = time.perf_counter()
        confirm_latencies.append((t1 - t0) * 1000.0)

    p50_conf = statistics.median(confirm_latencies)
    p95_conf = statistics.quantiles(confirm_latencies, n=20)[18] if len(confirm_latencies) >= 20 else max(confirm_latencies)
    print(f"  Atomic Dispatch: p50 = {p50_conf:.2f} ms | p95 = {p95_conf:.2f} ms (Target < 30 ms)")

    # Benchmark 3: Backward Provenance Trace (Target: p95 < 50 ms)
    trace_latencies = []
    print("\n>>> 3. Benchmarking Backward Provenance Trace (trace_dispatch)...")
    sample_disp = await conn.fetchval("SELECT request_no FROM dispatch_requests WHERE status = 'DISPATCHED' LIMIT 1;")
    if sample_disp:
        for i in range(iterations):
            t0 = time.perf_counter()
            await conn.fetchval("SELECT trace_dispatch($1);", sample_disp)
            t1 = time.perf_counter()
            trace_latencies.append((t1 - t0) * 1000.0)

        p50_trace = statistics.median(trace_latencies)
        p95_trace = statistics.quantiles(trace_latencies, n=20)[18] if len(trace_latencies) >= 20 else max(trace_latencies)
        print(f"  trace_dispatch: p50 = {p50_trace:.2f} ms | p95 = {p95_trace:.2f} ms (Target < 50 ms)")

    print("\n========================================================")
    print("PERFORMANCE TARGET COMPLIANCE SUMMARY:")
    print(f"  • Dry-Run Allocation: {'PASSED (p95 < 10ms)' if p95_dry < 10 else 'FAILED'}")
    print(f"  • Atomic Confirm:     {'PASSED (p95 < 30ms)' if p95_conf < 30 else 'FAILED'}")
    if sample_disp:
        print(f"  • Trace Provenance:   {'PASSED (p95 < 50ms)' if p95_trace < 50 else 'FAILED'}")
    print("========================================================\n")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_benchmark(100))

