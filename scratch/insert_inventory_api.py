# Script to add inventory visibility and drilldown endpoints to api/main.py

with open('api/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

new_inventory_endpoints = '''
# -----------------------------------------------------------------------------
# 2.2 Warehouse-Wise Stock Visibility & Dispatch Readiness Endpoints
# -----------------------------------------------------------------------------

@app.get("/inventory/overview")
async def get_inventory_overview(user: dict = Depends(get_current_user_from_header)):
    """
    Returns live summary cards for inventory across warehouses with strict definitions
    and zero double-counting.
    """
    # Calculate from in-memory stores and DB
    wh_scope = user.get("warehouse_id") if user.get("role") == "WAREHOUSE_ADMIN" else None

    # Base seed batches representation
    batches = [
        {"id": "B001", "commodity": "Wheat", "arrival_date": "2025-01-01", "total_qty": 100, "avail_qty": 100, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-01-BIN-01"},
        {"id": "B002", "commodity": "Wheat", "arrival_date": "2025-01-10", "total_qty": 150, "avail_qty": 150, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-01-BIN-01"},
        {"id": "B003", "commodity": "Wheat", "arrival_date": "2025-01-20", "total_qty": 200, "avail_qty": 200, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-01-BIN-02"},
        {"id": "B004", "commodity": "Rice", "arrival_date": "2025-02-05", "total_qty": 120, "avail_qty": 120, "reserved_qty": 0, "damaged_qty": 25, "quality_status": "Hold", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-B-RACK-01-BIN-02", "hold_reason": "Moisture content exceeds 14%, pending aeration"},
        {"id": "B005", "commodity": "Rice", "arrival_date": "2025-02-15", "total_qty": 180, "avail_qty": 180, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-B-RACK-01-BIN-01"},
        {"id": "B006", "commodity": "Wheat", "arrival_date": "2025-02-28", "total_qty": 160, "avail_qty": 160, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-02-BIN-01"},
        {"id": "B007", "commodity": "Wheat", "arrival_date": "2025-03-10", "total_qty": 140, "avail_qty": 140, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Rejected", "warehouse_id": "GDN-NGP-01", "bin_code": "QUAR-01-BIN-01", "hold_reason": "Weevil infestation detected"},
        {"id": "B008", "commodity": "Wheat", "arrival_date": "2025-10-24", "total_qty": 200, "avail_qty": 200, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Pending Inspection", "warehouse_id": "GDN-NGP-01", "bin_code": None},
        {"id": "B009", "commodity": "Wheat", "arrival_date": "2025-03-15", "total_qty": 180, "avail_qty": 180, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-PUN-02", "bin_code": "BAY-PUN-01-BIN-01"},
        {"id": "B010", "commodity": "Rice", "arrival_date": "2025-03-25", "total_qty": 220, "avail_qty": 220, "reserved_qty": 0, "damaged_qty": 10, "quality_status": "Eligible", "warehouse_id": "GDN-PUN-02", "bin_code": "BAY-PUN-01-BIN-02"}
    ]

    # Include newly received batches from in-memory consignments
    for csg in IN_MEMORY_CONSIGNMENTS:
        for b in csg.get("batches", []):
            if not any(x["id"] == b.get("batch_id") for x in batches):
                batches.append({
                    "id": b.get("batch_id"),
                    "commodity": b.get("commodity"),
                    "arrival_date": b.get("receipt_date"),
                    "total_qty": b.get("quantity", 0),
                    "avail_qty": b.get("quantity", 0),
                    "reserved_qty": 0,
                    "damaged_qty": 0,
                    "quality_status": b.get("quality_status", "Pending Inspection"),
                    "warehouse_id": b.get("warehouse_id", "GDN-NGP-01"),
                    "bin_code": b.get("bin_code")
                })

    if wh_scope:
        batches = [b for b in batches if b["warehouse_id"] == wh_scope]

    # 1. Total Physical Stock = sum of physical bags on hand
    total_physical_bags = sum(b["avail_qty"] + b.get("damaged_qty", 0) for b in batches)
    total_physical_mt = round(total_physical_bags * 0.05, 2)

    # 2. Available Ready for Dispatch = approved, sound, and not reserved
    ready_for_dispatch_bags = sum(
        max(0, b["avail_qty"] - b["reserved_qty"])
        for b in batches
        if b["quality_status"] in ("Eligible", "Approved")
    )
    ready_for_dispatch_mt = round(ready_for_dispatch_bags * 0.05, 2)

    # 3. Pending Quality Inspection
    pending_inspection_bags = sum(
        b["avail_qty"]
        for b in batches
        if b["quality_status"] in ("Pending Inspection", "Pending Allocation", "Reinspection Required")
    )
    pending_inspection_mt = round(pending_inspection_bags * 0.05, 2)

    # 4. Reserved Stock Awaiting Dispatch
    reserved_bags = sum(b.get("reserved_qty", 0) for b in batches)
    reserved_mt = round(reserved_bags * 0.05, 2)

    # 5. In-Transit Stock (Transfers + Dispatches) - tracked separately
    in_transit_bags = sum(
        t.get("quantity", 0)
        for t in IN_MEMORY_STOCK_TRANSFERS
        if t.get("status") == "IN_TRANSIT" and (not wh_scope or t.get("source_warehouse_id") == wh_scope or t.get("dest_warehouse_id") == wh_scope)
    )
    in_transit_mt = round(in_transit_bags * 0.05, 2)

    # 6. Damaged, Held or Rejected Stock
    damaged_held_bags = sum(
        (b["avail_qty"] + b.get("damaged_qty", 0)) if b["quality_status"] in ("Hold", "Rejected") else b.get("damaged_qty", 0)
        for b in batches
    )
    damaged_held_mt = round(damaged_held_bags * 0.05, 2)

    # Active Warehouses & Batches
    active_wh_ids = set(b["warehouse_id"] for b in batches if b["avail_qty"] > 0)
    active_batches_count = sum(1 for b in batches if b["avail_qty"] > 0)

    # Commodity Breakdown
    commodities = ["Wheat", "Rice", "Pulses", "Sugar"]
    comm_stats = []
    for c in commodities:
        c_batches = [b for b in batches if b["commodity"] == c]
        c_phys = sum(b["avail_qty"] + b.get("damaged_qty", 0) for b in c_batches)
        c_ready = sum(max(0, b["avail_qty"] - b["reserved_qty"]) for b in c_batches if b["quality_status"] in ("Eligible", "Approved"))
        if c_phys > 0:
            comm_stats.append({
                "commodity": c,
                "physical_bags": c_phys,
                "physical_mt": round(c_phys * 0.05, 2),
                "ready_dispatch_bags": c_ready,
                "ready_dispatch_mt": round(c_ready * 0.05, 2),
                "batches_count": len(c_batches)
            })

    return {
        "status": "SUCCESS",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "scope": wh_scope or "ALL_WAREHOUSES",
        "metrics": {
            "total_physical_stock": {"bags": total_physical_bags, "mt": total_physical_mt},
            "available_ready_dispatch": {"bags": ready_for_dispatch_bags, "mt": ready_for_dispatch_mt},
            "pending_quality_inspection": {"bags": pending_inspection_bags, "mt": pending_inspection_mt},
            "reserved_awaiting_dispatch": {"bags": reserved_bags, "mt": reserved_mt},
            "in_transit_stock": {"bags": in_transit_bags, "mt": in_transit_mt},
            "damaged_held_rejected_stock": {"bags": damaged_held_bags, "mt": damaged_held_mt},
            "active_warehouses_count": len(active_wh_ids) if active_wh_ids else len(IN_MEMORY_CONFIGURED_WAREHOUSES),
            "active_batches_count": active_batches_count
        },
        "commodity_breakdown": comm_stats
    }

@app.get("/inventory/warehouses")
async def get_inventory_warehouses_breakdown(user: dict = Depends(get_current_user_from_header)):
    """
    Returns warehouse-by-warehouse stock visibility, capacity utilization, and readiness.
    """
    wh_scope = user.get("warehouse_id") if user.get("role") == "WAREHOUSE_ADMIN" else None

    # Base seed batches
    batches = [
        {"id": "B001", "commodity": "Wheat", "arrival_date": "2025-01-01", "total_qty": 100, "avail_qty": 100, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-01-BIN-01"},
        {"id": "B002", "commodity": "Wheat", "arrival_date": "2025-01-10", "total_qty": 150, "avail_qty": 150, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-01-BIN-01"},
        {"id": "B003", "commodity": "Wheat", "arrival_date": "2025-01-20", "total_qty": 200, "avail_qty": 200, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-01-BIN-02"},
        {"id": "B004", "commodity": "Rice", "arrival_date": "2025-02-05", "total_qty": 120, "avail_qty": 120, "reserved_qty": 0, "damaged_qty": 25, "quality_status": "Hold", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-B-RACK-01-BIN-02", "hold_reason": "Moisture content exceeds 14%, pending aeration"},
        {"id": "B005", "commodity": "Rice", "arrival_date": "2025-02-15", "total_qty": 180, "avail_qty": 180, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-B-RACK-01-BIN-01"},
        {"id": "B006", "commodity": "Wheat", "arrival_date": "2025-02-28", "total_qty": 160, "avail_qty": 160, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "bin_code": "BAY-A-RACK-02-BIN-01"},
        {"id": "B007", "commodity": "Wheat", "arrival_date": "2025-03-10", "total_qty": 140, "avail_qty": 140, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Rejected", "warehouse_id": "GDN-NGP-01", "bin_code": "QUAR-01-BIN-01", "hold_reason": "Weevil infestation detected"},
        {"id": "B008", "commodity": "Wheat", "arrival_date": "2025-10-24", "total_qty": 200, "avail_qty": 200, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Pending Inspection", "warehouse_id": "GDN-NGP-01", "bin_code": None},
        {"id": "B009", "commodity": "Wheat", "arrival_date": "2025-03-15", "total_qty": 180, "avail_qty": 180, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-PUN-02", "bin_code": "BAY-PUN-01-BIN-01"},
        {"id": "B010", "commodity": "Rice", "arrival_date": "2025-03-25", "total_qty": 220, "avail_qty": 220, "reserved_qty": 0, "damaged_qty": 10, "quality_status": "Eligible", "warehouse_id": "GDN-PUN-02", "bin_code": "BAY-PUN-01-BIN-02"}
    ]

    for csg in IN_MEMORY_CONSIGNMENTS:
        for b in csg.get("batches", []):
            if not any(x["id"] == b.get("batch_id") for x in batches):
                batches.append({
                    "id": b.get("batch_id"),
                    "commodity": b.get("commodity"),
                    "arrival_date": b.get("receipt_date"),
                    "total_qty": b.get("quantity", 0),
                    "avail_qty": b.get("quantity", 0),
                    "reserved_qty": 0,
                    "damaged_qty": 0,
                    "quality_status": b.get("quality_status", "Pending Inspection"),
                    "warehouse_id": b.get("warehouse_id", "GDN-NGP-01"),
                    "bin_code": b.get("bin_code")
                })

    result = []
    for wh in IN_MEMORY_CONFIGURED_WAREHOUSES:
        if wh_scope and wh["id"] != wh_scope:
            continue

        wh_batches = [b for b in batches if b["warehouse_id"] == wh["id"]]
        phys_bags = sum(b["avail_qty"] + b.get("damaged_qty", 0) for b in wh_batches)
        ready_bags = sum(max(0, b["avail_qty"] - b["reserved_qty"]) for b in wh_batches if b["quality_status"] in ("Eligible", "Approved"))
        fifo_eligible_bags = ready_bags
        pending_insp_bags = sum(b["avail_qty"] for b in wh_batches if b["quality_status"] in ("Pending Inspection", "Pending Allocation", "Reinspection Required"))
        res_bags = sum(b.get("reserved_qty", 0) for b in wh_batches)
        dmg_held_bags = sum(
            (b["avail_qty"] + b.get("damaged_qty", 0)) if b["quality_status"] in ("Hold", "Rejected") else b.get("damaged_qty", 0)
            for b in wh_batches
        )

        in_transit = sum(
            t.get("quantity", 0)
            for t in IN_MEMORY_STOCK_TRANSFERS
            if t.get("status") == "IN_TRANSIT" and (t.get("source_warehouse_id") == wh["id"] or t.get("dest_warehouse_id") == wh["id"])
        )

        capacity_bags = sum(bn.get("capacity", 400) for bn in wh.get("bins", [])) or (wh.get("capacity_mt", 5000) * 20)
        occupied_bags = sum(bn.get("occupied", 0) for bn in wh.get("bins", [])) or phys_bags
        remaining_bags = max(0, capacity_bags - occupied_bags)
        occupancy_pct = round((occupied_bags / capacity_bags * 100), 1) if capacity_bags > 0 else 0

        result.append({
            "warehouse_id": wh["id"],
            "code": wh["code"],
            "name": wh["name"],
            "district": wh["district"],
            "state": wh["state"],
            "capacity_mt": wh.get("capacity_mt", 5000),
            "capacity_bags": capacity_bags,
            "occupied_bags": occupied_bags,
            "remaining_bags": remaining_bags,
            "occupancy_pct": occupancy_pct,
            "total_physical_stock": {"bags": phys_bags, "mt": round(phys_bags * 0.05, 2)},
            "free_available_stock": {"bags": ready_bags, "mt": round(ready_bags * 0.05, 2)},
            "quality_approved_fifo_eligible": {"bags": fifo_eligible_bags, "mt": round(fifo_eligible_bags * 0.05, 2)},
            "pending_inspection_stock": {"bags": pending_insp_bags, "mt": round(pending_insp_bags * 0.05, 2)},
            "reserved_stock": {"bags": res_bags, "mt": round(res_bags * 0.05, 2)},
            "in_transit_stock": {"bags": in_transit, "mt": round(in_transit * 0.05, 2)},
            "damaged_held_stock": {"bags": dmg_held_bags, "mt": round(dmg_held_bags * 0.05, 2)},
            "active_batches_count": len([b for b in wh_batches if b["avail_qty"] > 0]),
            "zones_count": len(wh.get("zones", [])),
            "bins_count": len(wh.get("bins", [])),
            "compatible_commodities": wh.get("compatible_commodities", ["Wheat", "Rice"]),
            "is_active": wh.get("is_active", True)
        })

    return {
        "status": "SUCCESS",
        "total_warehouses": len(result),
        "warehouses": result
    }

@app.get("/inventory/warehouses/{warehouse_id}")
async def get_inventory_warehouse_drilldown(warehouse_id: str, user: dict = Depends(get_current_user_from_header)):
    """
    Returns full drilldown for a specific warehouse: zones, bins, commodity-wise totals,
    and detailed batches with FIFO dispatch readiness calculations.
    """
    if user.get("role") == "WAREHOUSE_ADMIN" and user.get("warehouse_id") and user.get("warehouse_id") != warehouse_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Operators can only drill down into their assigned godown."
        )

    wh = next((w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == warehouse_id), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Base seed batches
    batches = [
        {"id": "B001", "commodity": "Wheat", "arrival_date": "2025-01-01", "total_qty": 100, "avail_qty": 100, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-A", "rack": "01", "bin_code": "BAY-A-RACK-01-BIN-01", "supplier": "FCI Depot Karnal"},
        {"id": "B002", "commodity": "Wheat", "arrival_date": "2025-01-10", "total_qty": 150, "avail_qty": 150, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-A", "rack": "01", "bin_code": "BAY-A-RACK-01-BIN-01", "supplier": "Punjab Agro Pool"},
        {"id": "B003", "commodity": "Wheat", "arrival_date": "2025-01-20", "total_qty": 200, "avail_qty": 200, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-B", "rack": "01", "bin_code": "BAY-A-RACK-01-BIN-02", "supplier": "Haryana Agro Pool"},
        {"id": "B004", "commodity": "Rice", "arrival_date": "2025-02-05", "total_qty": 120, "avail_qty": 120, "reserved_qty": 0, "damaged_qty": 25, "quality_status": "Hold", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-B", "rack": "01", "bin_code": "BAY-B-RACK-01-BIN-02", "supplier": "Chhattisgarh State Pool", "hold_reason": "Moisture content exceeds 14%, pending aeration"},
        {"id": "B005", "commodity": "Rice", "arrival_date": "2025-02-15", "total_qty": 180, "avail_qty": 180, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-A", "rack": "01", "bin_code": "BAY-B-RACK-01-BIN-01", "supplier": "Andhra Millers Co-op"},
        {"id": "B006", "commodity": "Wheat", "arrival_date": "2025-02-28", "total_qty": 160, "avail_qty": 160, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-B", "rack": "02", "bin_code": "BAY-A-RACK-02-BIN-01", "supplier": "MP State Supplies"},
        {"id": "B007", "commodity": "Wheat", "arrival_date": "2025-03-10", "total_qty": 140, "avail_qty": 140, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Rejected", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-Q", "rack": "01", "bin_code": "QUAR-01-BIN-01", "supplier": "UP Agro Corporation", "hold_reason": "Weevil infestation detected"},
        {"id": "B008", "commodity": "Wheat", "arrival_date": "2025-10-24", "total_qty": 200, "avail_qty": 200, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Pending Inspection", "warehouse_id": "GDN-NGP-01", "zone": "ZONE-B", "rack": "02", "bin_code": "BAY-A-RACK-02-BIN-02", "supplier": "FCI Depot Karnal"},
        {"id": "B009", "commodity": "Wheat", "arrival_date": "2025-03-15", "total_qty": 180, "avail_qty": 180, "reserved_qty": 0, "damaged_qty": 0, "quality_status": "Eligible", "warehouse_id": "GDN-PUN-02", "zone": "ZONE-P1", "rack": "01", "bin_code": "BAY-PUN-01-BIN-01", "supplier": "Maharashtra Agro Pune"},
        {"id": "B010", "commodity": "Rice", "arrival_date": "2025-03-25", "total_qty": 220, "avail_qty": 220, "reserved_qty": 0, "damaged_qty": 10, "quality_status": "Eligible", "warehouse_id": "GDN-PUN-02", "zone": "ZONE-P1", "rack": "01", "bin_code": "BAY-PUN-01-BIN-02", "supplier": "Solapur Millers Co-op"}
    ]

    for csg in IN_MEMORY_CONSIGNMENTS:
        for b in csg.get("batches", []):
            if not any(x["id"] == b.get("batch_id") for x in batches):
                batches.append({
                    "id": b.get("batch_id"),
                    "commodity": b.get("commodity"),
                    "arrival_date": b.get("receipt_date"),
                    "total_qty": b.get("quantity", 0),
                    "avail_qty": b.get("quantity", 0),
                    "reserved_qty": 0,
                    "damaged_qty": 0,
                    "quality_status": b.get("quality_status", "Pending Inspection"),
                    "warehouse_id": b.get("warehouse_id", "GDN-NGP-01"),
                    "zone": b.get("zone_code", "ZONE-A"),
                    "rack": b.get("rack", "01"),
                    "bin_code": b.get("bin_code"),
                    "supplier": csg.get("supplier_name", "Central Pool")
                })

    wh_batches = [b for b in batches if b["warehouse_id"] == warehouse_id]

    # Calculate FIFO ranking among eligible batches of same commodity
    enriched_batches = []
    # Group eligible by commodity for FIFO sequence
    eligible_by_comm = {}
    for b in wh_batches:
        if b["quality_status"] in ("Eligible", "Approved") and (b["avail_qty"] - b["reserved_qty"]) > 0:
            c = b["commodity"]
            eligible_by_comm.setdefault(c, []).append(b)

    for c, el_list in eligible_by_comm.items():
        el_list.sort(key=lambda x: (x["arrival_date"], x["id"]))

    for b in wh_batches:
        avail = b["avail_qty"]
        res = b["reserved_qty"]
        dmg = b.get("damaged_qty", 0)
        phys = avail + dmg
        is_approved = b["quality_status"] in ("Eligible", "Approved")
        dispatchable = max(0, avail - res) if is_approved else 0
        pending_insp = avail if b["quality_status"] in ("Pending Inspection", "Pending Allocation", "Reinspection Required") else 0
        held_dmg = (avail + dmg) if b["quality_status"] in ("Hold", "Rejected") else dmg

        # FIFO status and eligibility reason
        if is_approved:
            if dispatchable > 0:
                rank = next((idx + 1 for idx, el in enumerate(eligible_by_comm.get(b["commodity"], [])) if el["id"] == b["id"]), 1)
                fifo_eligibility = "ELIGIBLE"
                fifo_reason = f"Rank #{rank} for {b['commodity']} (Earliest arrival {b['arrival_date']})"
            else:
                fifo_eligibility = "RESERVED"
                fifo_reason = "100% reserved for pending dispatch orders"
        elif b["quality_status"] in ("Hold", "Rejected"):
            fifo_eligibility = "BLOCKED_HOLD"
            fifo_reason = b.get("hold_reason") or "Quality Hold / Rejection notice active"
        else:
            fifo_eligibility = "BLOCKED_PENDING_INSPECTION"
            fifo_reason = "Pending laboratory assay and supervisory release"

        enriched_batches.append({
            "batch_id": b["id"],
            "commodity": b["commodity"],
            "supplier": b.get("supplier", "FCI Depot"),
            "original_received_qty": b["total_qty"],
            "current_physical_qty": phys,
            "reserved_qty": res,
            "dispatchable_qty": dispatchable,
            "pending_inspection_qty": pending_insp,
            "held_damaged_qty": held_dmg,
            "warehouse_id": warehouse_id,
            "warehouse_code": wh["code"],
            "warehouse_name": wh["name"],
            "zone": b.get("zone", "ZONE-A"),
            "rack": b.get("rack", "01"),
            "bin_code": b.get("bin_code") or "UNASSIGNED",
            "receipt_date": b["arrival_date"],
            "quality_status": b["quality_status"],
            "fifo_eligibility": fifo_eligibility,
            "fifo_reason": fifo_reason
        })

    # Commodity totals
    comm_totals = []
    for comm in wh.get("compatible_commodities", ["Wheat", "Rice"]):
        c_items = [b for b in enriched_batches if b["commodity"] == comm]
        c_phys = sum(x["current_physical_qty"] for x in c_items)
        c_ready = sum(x["dispatchable_qty"] for x in c_items)
        c_res = sum(x["reserved_qty"] for x in c_items)
        c_pending = sum(x["pending_inspection_qty"] for x in c_items)
        c_dmg = sum(x["held_damaged_qty"] for x in c_items)
        comm_totals.append({
            "commodity": comm,
            "physical_bags": c_phys,
            "physical_mt": round(c_phys * 0.05, 2),
            "dispatchable_bags": c_ready,
            "dispatchable_mt": round(c_ready * 0.05, 2),
            "reserved_bags": c_res,
            "pending_inspection_bags": c_pending,
            "held_damaged_bags": c_dmg,
            "batches_count": len(c_items)
        })

    return {
        "status": "SUCCESS",
        "warehouse": {
            "id": wh["id"],
            "code": wh["code"],
            "name": wh["name"],
            "district": wh["district"],
            "state": wh["state"],
            "capacity_mt": wh.get("capacity_mt", 5000),
            "zones": wh.get("zones", []),
            "bins": wh.get("bins", [])
        },
        "commodity_totals": comm_totals,
        "batches_count": len(enriched_batches),
        "batches": enriched_batches
    }
'''

assert '@app.get("/batches")' in code, "Could not find anchor @app.get('/batches')"
code = code.replace('@app.get("/batches")', new_inventory_endpoints + '\n\n@app.get("/batches")', 1)

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Added inventory overview, warehouse breakdown, and drilldown endpoints to api/main.py")

