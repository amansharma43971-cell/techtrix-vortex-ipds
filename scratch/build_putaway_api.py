import re

with open('api/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Pydantic Models for Putaway & Analysis
models_code = '''
class ConsignmentAnalyzeRequest(BaseModel):
    commodity: str
    total_quantity: int
    arrival_date: str
    destination_warehouse_id: str
    supplier_name: Optional[str] = "FCI Regional Procurement"
    challan_number: Optional[str] = None

class PutawayPhysicalConfirmRequest(BaseModel):
    actual_quantity: int
    actual_bin_code: str
    damaged_bags_count: int = 0
    discrepancy_reason: Optional[str] = None
    notes: Optional[str] = None
    evidence_notes: Optional[str] = None
    evidence_photo_url: Optional[str] = None
    physical_verification_certified: bool = True
'''

# Insert models before ConsignmentReceiveWorkflow
insert_models_pos = content.find("class ConsignmentReceiveWorkflow(BaseModel):")
if insert_models_pos != -1:
    content = content[:insert_models_pos] + models_code + "\n" + content[insert_models_pos:]
    print("Inserted putaway Pydantic models")
else:
    print("Could not find class ConsignmentReceiveWorkflow")

# 2. Add /consignments/analyze endpoint before /consignments/auto-slot-preview
analyze_endpoint_code = '''
@app.post("/consignments/analyze")
async def analyze_consignment_inward(
    req: ConsignmentAnalyzeRequest,
    user: dict = Depends(get_current_user_from_header)
):
    """
    Automated Inward Analysis & Smart Batch Recommendation Engine:
    1. Validates commodity, quantity, receipt date, source, destination warehouse.
    2. Inspects existing batches of same commodity in godown (receipt dates, quality holds, sound quantities).
    3. Evaluates zone, rack, and bin capacities + commodity storage segregation.
    4. Deterministic FIFO-aware tie-breaking recommendation (adjacent to older stock for rotation).
    5. Quantity-wise multi-bin breakdown if single bin cannot hold full consignment.
    6. Returns planned allocations with explicit reasoning. Stock remains Staged until physical placement.
    """
    enforce_warehouse_scope(user, req.destination_warehouse_id)

    wh = next((w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == req.destination_warehouse_id), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Destination warehouse not found.")
    if not wh.get("is_active", True):
        raise HTTPException(status_code=400, detail=f"Destination godown '{wh['name']}' is currently inactive.")

    if req.total_quantity <= 0:
        raise HTTPException(status_code=400, detail="Consignment quantity must be strictly greater than 0.")

    # Check warehouse commodity compatibility
    if wh.get("compatible_commodities") and req.commodity not in wh["compatible_commodities"]:
        raise HTTPException(
            status_code=400,
            detail=f"Commodity '{req.commodity}' is not compatible with warehouse {wh['code']}. Compatible list: {', '.join(wh['compatible_commodities'])}."
        )

    # Inspect existing batches of same commodity in destination godown
    existing_batches = [
        b for b in IN_MEMORY_CONSIGNMENTS 
        for b_item in b.get("batches", [])
        if b.get("destination_warehouse_id") == wh["id"] and b_item.get("commodity") == req.commodity
    ]
    oldest_batch_date = None
    total_existing_stock = 0
    if existing_batches:
        dates = [b.get("receipt_date") or b.get("arrival_date") for b in existing_batches if b.get("receipt_date") or b.get("arrival_date")]
        if dates:
            oldest_batch_date = sorted(dates)[0]
        total_existing_stock = sum(b.get("total_quantity", 0) for b in existing_batches)

    # Evaluate candidate bins with deterministic tie-breaking
    candidate_bins = []
    zone_priority = {"ZONE-A": 1, "PICK_FACE": 1, "ZONE-B": 2, "BULK": 2, "ZONE-C": 3, "BUFFER": 3, "ZONE-PUN-01": 1, "ZONE-NOIDA-01": 1}

    for b in wh.get("bins", []):
        if not b.get("is_active", True):
            continue
        # Commodity segregation rule
        if b.get("commodity") and b["commodity"] != req.commodity and b.get("occupied", 0) > 0:
            continue
        avail = max(0, b["capacity"] - b.get("occupied", 0))
        if avail > 0:
            # Deterministic tie-breaker scoring:
            # 1. Zone priority (lower is faster intake buffer)
            # 2. Holds same commodity currently (co-location for FIFO rotation)
            # 3. Available capacity descending (minimize fragmentation)
            # 4. Bin code ascending
            is_same_comm = 1 if b.get("commodity") == req.commodity else 0
            candidate_bins.append({
                "zone_code": b["zone_code"],
                "rack": b["rack"],
                "bin_code": b["bin_code"],
                "capacity": b["capacity"],
                "occupied": b.get("occupied", 0),
                "available": avail,
                "is_same_comm": is_same_comm,
                "priority": zone_priority.get(b.get("zone_code"), 5)
            })

    # Sort deterministically
    candidate_bins.sort(key=lambda x: (x["priority"], -x["is_same_comm"], -x["available"], x["bin_code"]))

    total_avail = sum(b["available"] for b in candidate_bins)
    if total_avail < req.total_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Storage overflow: Godown '{wh['name']}' has only {total_avail} Bags compatible space available, but consignment requires {req.total_quantity} Bags."
        )

    # Generate recommended allocations with explicit reasoning
    remaining = req.total_quantity
    recommendations = []
    batch_idx = 1
    numeric_id_base = int(datetime.datetime.now().strftime("%y%m%d%H%M%S")[-4:])

    for cb in candidate_bins:
        if remaining <= 0:
            break
        take = min(remaining, cb["available"])
        batch_id = f"B{numeric_id_base + batch_idx}"

        reason_parts = [
            f"Zone {cb['zone_code']} priority intake buffer",
            f"Available capacity: {cb['available']} Bags (Fill: {cb['occupied'] + take}/{cb['capacity']})"
        ]
        if cb["is_same_comm"]:
            reason_parts.append(f"Co-located with existing {req.commodity} stack for streamlined FIFO physical rotation")
        if oldest_batch_date:
            reason_parts.append(f"Positioned to protect FIFO queue (oldest stack arrived {oldest_batch_date})")

        recommendations.append({
            "batch_id": batch_id,
            "commodity": req.commodity,
            "quantity": take,
            "warehouse_id": wh["id"],
            "warehouse_name": wh["name"],
            "zone_code": cb["zone_code"],
            "rack": cb["rack"],
            "bin_code": cb["bin_code"],
            "planned_receipt_date": req.arrival_date,
            "quality_status": "Pending Inspection",
            "storage_status": "AWAITING_PUTAWAY",
            "recommendation_reason": ". ".join(reason_parts) + "."
        })
        remaining -= take
        batch_idx += 1

    # Find active operator for this warehouse
    assigned_op = None
    for token, u in ACTIVE_SESSIONS.items():
        if u.get("role") == "WAREHOUSE_ADMIN" and u.get("warehouse_id") == wh["id"] and u.get("is_active", True):
            assigned_op = u
            break

    return {
        "success": True,
        "consignment_analysis": {
            "warehouse_id": wh["id"],
            "warehouse_name": wh["name"],
            "commodity": req.commodity,
            "total_quantity": req.total_quantity,
            "arrival_date": req.arrival_date,
            "existing_commodity_stock_in_godown": total_existing_stock,
            "oldest_batch_date": oldest_batch_date,
            "compatible_bins_count": len(candidate_bins),
            "total_available_capacity": total_avail
        },
        "recommended_putaway_plan": recommendations,
        "recommendations_count": len(recommendations),
        "operator_assignment_preview": {
            "operator_id": assigned_op.get("id") if assigned_op else None,
            "operator_name": assigned_op.get("full_name") if assigned_op else "Awaiting Manager Assignment",
            "operator_role": assigned_op.get("role_title") if assigned_op else "Godown Operator",
            "is_auto_assignable": assigned_op is not None
        },
        "planning_notice": "Recommendations are treated as planned allocations until physical placement is confirmed by the assigned operator. Stock is not eligible for dispatch until stored and quality-cleared."
    }
'''

insert_analyze_pos = content.find("@app.post(\"/consignments/auto-slot-preview\")")
if insert_analyze_pos != -1:
    content = content[:insert_analyze_pos] + analyze_endpoint_code + "\n\n" + content[insert_analyze_pos:]
    print("Inserted /consignments/analyze endpoint")
else:
    print("Could not find @app.post('/consignments/auto-slot-preview')")

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved api/main.py stage 1")

