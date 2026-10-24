# BhandarSetu — REST API Reference & Specification

Base URL: `http://localhost:8000` (or configured reverse proxy)  
Interactive Swagger UI: `http://localhost:8000/docs`  
OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## 1. Master Data Endpoints

### `GET /warehouses`
Retrieves all registered PDS godowns.
```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "code": "GDN-NGP-01",
    "name": "Nagpur Central Food Godown",
    "district": "Nagpur",
    "state": "Maharashtra",
    "capacity_mt": 10000.00
  }
]
```

### `GET /commodities`
Retrieves standardized PDS grain commodities with allocation policies (FIFO/FEFO).

### `GET /ration-shops?warehouse_id={uuid}`
Retrieves fair price shops linked to a godown with distance and transit profile.

### `GET /users`
Retrieves active users and their operational roles.

---

## 2. Receipts & Batches

### `POST /receipts`
Records inward consignment from FCI base depots and registers a new grain batch.
**Request Body:**
```json
{
  "warehouse_id": "11111111-1111-1111-1111-111111111111",
  "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "supplier_source": "FCI Base Depot Gondia",
  "vehicle_no": "MH-31-AP-4921",
  "document_ref": "DC/FCI/2026/9021",
  "received_qty_kg": 2000.0,
  "received_date": "2026-10-23",
  "expiry_date": "2027-10-23",
  "received_by": "u0000001-0000-0000-0000-000000000001"
}
```

### `GET /batches?warehouse_id={uuid}&commodity_id={uuid}&status_filter={status}`
Lists batches with age in days, current balance, and quarantine status.

### `GET /batches/{id}/history`
Returns chronological lifecycle history of a batch from receipt to exhaustion.

---

## 3. Allocation & Dispatch Engine

### `POST /dispatch-requests` (Idempotent)
Creates a new dispatch demand record. Client supplies unique `idempotency_key`.
**Request Body:**
```json
{
  "idempotency_key": "IDEMP-2026-001-XYZ",
  "shop_id": "s0000001-0000-0000-0000-000000000001",
  "commodity_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "warehouse_id": "11111111-1111-1111-1111-111111111111",
  "requested_qty_kg": 1200.0,
  "created_by": "u0000001-0000-0000-0000-000000000001"
}
```

### `GET /dispatch-requests/{id}/allocation-preview`
Calculates atomic FIFO/FEFO candidate plan without writing (`dry_run = true`). Returns batch breakdown or `SHORTFALL` status.

### `POST /dispatch-requests/{id}/confirm`
Atomically commits the allocation plan: inserts allocations, updates batch balance, and writes signed negative `DISPATCH` stock movements to the immutable ledger.

---

## 4. Quality Control & Holds

### `POST /inspections`
Records lab sampling result (`PASS`, `FAIL`, `CONDITIONAL`). `FAIL` automatically quarantines the batch.

### `POST /batches/{id}/hold`
Places a batch under full or partial quality quarantine.
```json
{
  "reason": "High moisture content 14.8% exceeds FSSAI threshold",
  "placed_by": "u0000003-0000-0000-0000-000000000003",
  "held_qty_kg": 800.0
}
```

### `POST /batches/{id}/release-request`
Inspector submits clearance justification (`RELEASE_PENDING`).

### `POST /batches/{id}/release-approve`
Authorizing supervisor approves release. **Fails with `BS004` (422 Unprocessable Entity)** if requester == approver.

### `POST /recalls`
Initiates an emergency recall for a defective batch, quarantining remaining stock and tracing all receiving ration shops.

---

## 5. Reconciliation & Transit Loss

### `POST /shop-receipts`
FPS ration shop confirms physical weight received. Computes `transit_loss_kg` and flags in `v_transit_loss`.

### `GET /reconciliation/transit-loss`
Returns dispatches where transit loss exceeded commodity tolerance thresholds.

---

## 6. Audit & Traceability

### `GET /audit/trace/{request_no}`
Executes `trace_dispatch(request_no)` returning complete backward provenance JSON (Consignment $\rightarrow$ Batch $\rightarrow$ Allocation $\rightarrow$ Ledger Movement).

### `GET /audit/discrepancies`
Traverses `v_balance_mismatch` and executes `verify_ledger_chain()`.

### `GET /verify/{token}` (Public QR Verification)
Lightweight unauthenticated endpoint for scanning QR codes on physical grain bags or gate passes.

---

## 7. Predictive Intelligence & Observability

### `GET /dashboard/ageing`
Aggregates inventory into standard ageing buckets: 0-30 days, 31-60 days, 61-90 days, 90+ days.

### `GET /dashboard/expiry-risk`
Executes `predict_expiry_risk()` evaluating daily dispatch velocity vs. remaining shelf life.

### `GET /health`
Returns system status and database pool readiness.

### `GET /metrics`
Prometheus formatted metrics for scraping by monitoring systems.

---

## 8. Stock Allocation Control Tower (Milestone M9)

### `GET /control-tower/summary?warehouse_id={uuid}`
Returns real-time stock balances across commodities, open putaway/pick task counts, SLA breaches, and overall integrity health from read models.

### `GET /control-tower/stream?warehouse_id={uuid}`
Server-Sent Events (SSE) telemetry stream pushing live warehouse events (`stock.changed`, `task.updated`, `alert.raised`, `ledger.appended`) with $< 1\text{ s}$ latency.

### `GET /bins?warehouse_id={uuid}&zone_id={uuid}`
Lists godown bins with zone type, rack/bay coordinates, capacity, and current occupancy percentage.

### `GET /bins/heatmap?warehouse_id={uuid}`
Provides 2D physical matrix for rendering the godown spatial heatmap (occupancy percentage, oldest FIFO pick indicators, quarantine barricades).

### `GET /bins/{bin_id}`
Returns granular stack contents, active batches, and recent movements for a specific physical bin.

### Putaway Management
- `GET /putaway-tasks?warehouse_id={uuid}&status_filter={status}`: Lists inbound putaway tasks.
- `POST /putaway-tasks/{id}/suggest`: Returns ranked bin suggestions based on consolidation and FIFO lane rules.
- `POST /putaway-tasks/{id}/confirm`: Confirms physical putaway with scanned bin and batch QR payloads.

### Wave Picking & Dispatch Execution
- `GET /pick-tasks?wave_id={uuid}&warehouse_id={uuid}`: Returns pick lines ordered by walking path sequence.
- `POST /pick-waves`: Creates a multi-shop pick wave across eligible FIFO batches.
- `POST /pick-tasks/{id}/confirm`: Confirms pick task, handles short-picks, and appends to bin ledger.

### Outflow Analytics & Integrity
- `GET /analytics/flow`: Time-series hourly inflow vs outflow.
- `GET /analytics/removals-by-reason`: Aggregates removals by reason (`DISPATCH`, `QUALITY_HOLD`, `RECALL_QUARANTINE`, `EXPIRY_WRITE_OFF`, `ADJUSTMENT`).
- `GET /analytics/next-to-dispatch`: Returns prioritized FIFO/FEFO candidate batches with exact bin locations.
- `GET /analytics/slotting-recommendations`: Returns slotting recommendations from `v_slotting_recommendations`.
- `GET /control-tower/integrity`: Continuous reconciliation of `v_bin_vs_batch_mismatch`, `v_balance_mismatch`, and `verify_ledger_chain()`.


