# Insertion script for Consignment, Warehouse Storage Allocation & Management in api/main.py

api_code = '''
# -----------------------------------------------------------------------------
# 2. Consignment Intake, Multi-Step Storage Allocation & Warehouse Management
# -----------------------------------------------------------------------------

class StorageLocationAllocation(BaseModel):
    batch_id: str
    commodity: str
    quantity: int # in bags
    warehouse_id: str
    zone_code: str
    rack: str
    bin_code: str
    receipt_date: str
    quality_status: str = "Pending Allocation" # Pending Inspection / Pending Allocation

class ConsignmentReceiveWorkflow(BaseModel):
    consignment_id: str
    supplier_name: str
    challan_number: str
    arrival_date: str
    arrival_time: Optional[str] = "10:00"
    commodity: str
    total_quantity: int
    unit: str = "Bags (50kg)"
    vehicle_number: Optional[str] = None
    remarks: Optional[str] = None
    document_url: Optional[str] = None
    destination_warehouse_id: str
    destination_warehouse_name: Optional[str] = None
    allocation_mode: str = "MANUAL" # MANUAL or AUTO_SLOT
    batch_allocations: List[StorageLocationAllocation]
    idempotency_key: Optional[str] = None

class AutoSlotRequest(BaseModel):
    destination_warehouse_id: str
    commodity: str
    total_quantity: int
    arrival_date: str
    supplier_name: Optional[str] = None
    consignment_id: Optional[str] = None

class WarehouseConfigCreate(BaseModel):
    code: str
    name: str
    district: str
    state: str
    capacity_mt: float
    is_active: bool = True
    compatible_commodities: List[str] = ["Wheat", "Rice"]

class BinConfigCreate(BaseModel):
    warehouse_id: str
    zone_code: str
    bin_code: str
    bay: str
    rack: str
    bin: str
    capacity_bags: int
    commodity: Optional[str] = None
    is_active: bool = True

IN_MEMORY_CONFIGURED_WAREHOUSES = [
    {
        "id": "GDN-NGP-01",
        "code": "GDN-NGP-01",
        "name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "district": "Nagpur",
        "state": "Maharashtra",
        "capacity_mt": 5000.0,
        "is_active": True,
        "compatible_commodities": ["Wheat", "Rice", "Sugar", "Pulses", "Mustard"],
        "zones": [
            {"zone_code": "ZONE-A", "zone_name": "Zone A - Primary North", "zone_type": "PICK_FACE", "temperature_controlled": False},
            {"zone_code": "ZONE-B", "zone_name": "Zone B - Central Bulk Bay", "zone_type": "BULK", "temperature_controlled": False},
            {"zone_code": "ZONE-C", "zone_name": "Zone C - Buffer Overflow", "zone_type": "BUFFER", "temperature_controlled": False},
            {"zone_code": "ZONE-Q", "zone_name": "Zone Q - Barricaded Quarantine", "zone_type": "QUARANTINE", "temperature_controlled": False}
        ],
        "bins": [
            {"bin_code": "BAY-A-RACK-01-BIN-01", "bay": "A", "rack": "01", "bin": "01", "zone_code": "ZONE-A", "commodity": "Wheat", "capacity": 400, "occupied": 250, "batches": ["B001", "B002"], "is_active": True, "pick_sequence": 10},
            {"bin_code": "BAY-A-RACK-01-BIN-02", "bay": "A", "rack": "01", "bin": "02", "zone_code": "ZONE-B", "commodity": "Wheat", "capacity": 400, "occupied": 200, "batches": ["B003"], "is_active": True, "pick_sequence": 20},
            {"bin_code": "BAY-A-RACK-02-BIN-01", "bay": "A", "rack": "02", "bin": "01", "zone_code": "ZONE-B", "commodity": "Wheat", "capacity": 400, "occupied": 160, "batches": ["B006"], "is_active": True, "pick_sequence": 30},
            {"bin_code": "BAY-A-RACK-02-BIN-02", "bay": "A", "rack": "02", "bin": "02", "zone_code": "ZONE-B", "commodity": "Wheat", "capacity": 400, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 40},
            {"bin_code": "BAY-B-RACK-01-BIN-01", "bay": "B", "rack": "01", "bin": "01", "zone_code": "ZONE-A", "commodity": "Rice", "capacity": 400, "occupied": 180, "batches": ["B005"], "is_active": True, "pick_sequence": 10},
            {"bin_code": "BAY-B-RACK-01-BIN-02", "bay": "B", "rack": "01", "bin": "02", "zone_code": "ZONE-B", "commodity": "Rice", "capacity": 400, "occupied": 120, "batches": ["B004"], "is_active": True, "pick_sequence": 20},
            {"bin_code": "BAY-B-RACK-02-BIN-01", "bay": "B", "rack": "02", "bin": "01", "zone_code": "ZONE-B", "commodity": "Rice", "capacity": 400, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 30},
            {"bin_code": "BAY-C-RACK-01-BIN-01", "bay": "C", "rack": "01", "bin": "01", "zone_code": "ZONE-C", "commodity": "Sugar", "capacity": 300, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 10},
            {"bin_code": "BAY-C-RACK-01-BIN-02", "bay": "C", "rack": "01", "bin": "02", "zone_code": "ZONE-C", "commodity": "Pulses", "capacity": 300, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 20},
            {"bin_code": "QUAR-01-BIN-01", "bay": "Q", "rack": "01", "bin": "01", "zone_code": "ZONE-Q", "commodity": "Wheat", "capacity": 200, "occupied": 140, "batches": ["B007"], "is_active": True, "pick_sequence": 99}
        ]
    },
    {
        "id": "GDN-PUN-02",
        "code": "GDN-PUN-02",
        "name": "District Buffer Depot, Pune",
        "district": "Pune",
        "state": "Maharashtra",
        "capacity_mt": 4000.0,
        "is_active": True,
        "compatible_commodities": ["Wheat", "Rice", "Sugar"],
        "zones": [
            {"zone_code": "ZONE-PUN-01", "zone_name": "Pune Primary Intake Bay", "zone_type": "BULK", "temperature_controlled": False},
            {"zone_code": "ZONE-PUN-02", "zone_name": "Pune Strategic Buffer", "zone_type": "BUFFER", "temperature_controlled": False}
        ],
        "bins": [
            {"bin_code": "BAY-PUN-01-BIN-01", "bay": "PUN-01", "rack": "01", "bin": "01", "zone_code": "ZONE-PUN-01", "commodity": "Wheat", "capacity": 400, "occupied": 180, "batches": ["B009"], "is_active": True, "pick_sequence": 10},
            {"bin_code": "BAY-PUN-01-BIN-02", "bay": "PUN-01", "rack": "01", "bin": "02", "zone_code": "ZONE-PUN-01", "commodity": "Rice", "capacity": 400, "occupied": 220, "batches": ["B010"], "is_active": True, "pick_sequence": 20},
            {"bin_code": "BAY-PUN-02-BIN-01", "bay": "PUN-02", "rack": "01", "bin": "01", "zone_code": "ZONE-PUN-02", "commodity": "Wheat", "capacity": 400, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 30},
            {"bin_code": "BAY-PUN-02-BIN-02", "bay": "PUN-02", "rack": "01", "bin": "02", "zone_code": "ZONE-PUN-02", "commodity": "Rice", "capacity": 400, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 40}
        ]
    },
    {
        "id": "GDN-NOIDA-01",
        "code": "GDN-NOIDA-01",
        "name": "Surajpur Central Depot (Noida Zone 1)",
        "district": "Gautam Buddha Nagar",
        "state": "Uttar Pradesh",
        "capacity_mt": 6000.0,
        "is_active": True,
        "compatible_commodities": ["Wheat", "Rice", "Sugar", "Pulses"],
        "zones": [
            {"zone_code": "ZONE-NOIDA-01", "zone_name": "North Staging Bay", "zone_type": "BULK", "temperature_controlled": False}
        ],
        "bins": [
            {"bin_code": "BAY-NOIDA-01-BIN-01", "bay": "NOIDA-01", "rack": "01", "bin": "01", "zone_code": "ZONE-NOIDA-01", "commodity": "Wheat", "capacity": 500, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 10},
            {"bin_code": "BAY-NOIDA-01-BIN-02", "bay": "NOIDA-01", "rack": "01", "bin": "02", "zone_code": "ZONE-NOIDA-01", "commodity": "Rice", "capacity": 500, "occupied": 0, "batches": [], "is_active": True, "pick_sequence": 20}
        ]
    }
]

IN_MEMORY_CONSIGNMENTS = [
    {
        "consignment_id": "CSG-2025-001",
        "supplier_name": "FCI Depot Karnal (Central Pool)",
        "challan_number": "CHL-PB-99120",
        "arrival_date": "2025-01-01",
        "arrival_time": "10:30",
        "commodity": "Wheat",
        "total_quantity": 100,
        "unit": "Bags (50kg)",
        "vehicle_number": "PB-10-AX-8912",
        "remarks": "Gate moisture 10.4%, standard tags verified",
        "destination_warehouse_id": "GDN-NGP-01",
        "destination_warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "allocation_mode": "MANUAL",
        "received_by_id": "u-admin-ngp",
        "received_by_name": "Ramesh Patil",
        "received_at": "2025-01-01T10:30:00Z",
        "batches": [
            {
                "batch_id": "B001",
                "commodity": "Wheat",
                "quantity": 100,
                "warehouse_id": "GDN-NGP-01",
                "zone_code": "ZONE-A",
                "rack": "01",
                "bin_code": "BAY-A-RACK-01-BIN-01",
                "receipt_date": "2025-01-01",
                "quality_status": "Eligible"
            }
        ]
    },
    {
        "consignment_id": "CSG-2025-002",
        "supplier_name": "Punjab Agro Pool Division",
        "challan_number": "CHL-PB-99144",
        "arrival_date": "2025-01-10",
        "arrival_time": "11:15",
        "commodity": "Wheat",
        "total_quantity": 150,
        "unit": "Bags (50kg)",
        "vehicle_number": "PB-10-BW-7714",
        "remarks": "Sona Moti Grade A certified intake",
        "destination_warehouse_id": "GDN-NGP-01",
        "destination_warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "allocation_mode": "MANUAL",
        "received_by_id": "u-admin-ngp",
        "received_by_name": "Ramesh Patil",
        "received_at": "2025-01-10T11:15:00Z",
        "batches": [
            {
                "batch_id": "B002",
                "commodity": "Wheat",
                "quantity": 150,
                "warehouse_id": "GDN-NGP-01",
                "zone_code": "ZONE-A",
                "rack": "01",
                "bin_code": "BAY-A-RACK-01-BIN-01",
                "receipt_date": "2025-01-10",
                "quality_status": "Eligible"
            }
        ]
    },
    {
        "consignment_id": "CSG-2025-008",
        "supplier_name": "FCI Depot Karnal (Central Pool)",
        "challan_number": "CHL-INW-008",
        "arrival_date": "2025-10-24",
        "arrival_time": "08:00",
        "commodity": "Wheat",
        "total_quantity": 200,
        "unit": "Bags (50kg)",
        "vehicle_number": "UP-16-BT-4412",
        "remarks": "Fresh harvest arrival - awaiting godown bin assignment",
        "destination_warehouse_id": "GDN-NGP-01",
        "destination_warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "allocation_mode": "MANUAL",
        "received_by_id": "u-manager-01",
        "received_by_name": "Aayush Tripathi",
        "received_at": "2025-10-24T08:00:00Z",
        "batches": [
            {
                "batch_id": "B008",
                "commodity": "Wheat",
                "quantity": 200,
                "warehouse_id": "GDN-NGP-01",
                "zone_code": "ZONE-B",
                "rack": "02",
                "bin_code": "GATE-HOLD-01",
                "receipt_date": "2025-10-24",
                "quality_status": "Pending Allocation"
            }
        ]
    }
]

@app.get("/warehouses/management")
async def get_warehouse_management_config(user: dict = Depends(get_current_user_from_header)):
    """Returns dynamic warehouse configuration including zones, bins, live occupancy and rules."""
    user_wh = user.get("warehouse_id")
    is_manager = user.get("role") == "MANAGER"

    result = []
    for wh in IN_MEMORY_CONFIGURED_WAREHOUSES:
        if not is_manager and user_wh and wh["id"] != user_wh:
            continue
        
        # Calculate live occupancy
        total_capacity_bags = sum(b["capacity"] for b in wh.get("bins", []))
        total_occupied_bags = sum(b["occupied"] for b in wh.get("bins", []))
        available_bags = max(0, total_capacity_bags - total_occupied_bags)
        occupancy_pct = round((total_occupied_bags / max(1, total_capacity_bags)) * 100, 1)

        wh_copy = dict(wh)
        wh_copy["total_capacity_bags"] = total_capacity_bags
        wh_copy["total_occupied_bags"] = total_occupied_bags
        wh_copy["available_bags"] = available_bags
        wh_copy["occupancy_pct"] = occupancy_pct
        result.append(wh_copy)

    return result

@app.post("/warehouses/management", status_code=status.HTTP_201_CREATED)
async def create_warehouse_management_config(cfg: WarehouseConfigCreate, user: dict = Depends(require_manager_permission)):
    """Manager-only: Create new warehouse configuration."""
    for existing in IN_MEMORY_CONFIGURED_WAREHOUSES:
        if existing["code"].upper() == cfg.code.upper():
            raise HTTPException(status_code=400, detail=f"Warehouse code {cfg.code} already exists.")

    new_wh = {
        "id": cfg.code.upper(),
        "code": cfg.code.upper(),
        "name": cfg.name,
        "district": cfg.district,
        "state": cfg.state,
        "capacity_mt": cfg.capacity_mt,
        "is_active": cfg.is_active,
        "compatible_commodities": cfg.compatible_commodities,
        "zones": [
            {"zone_code": "ZONE-A", "zone_name": "Main Intake Bay", "zone_type": "BULK", "temperature_controlled": False},
            {"zone_code": "ZONE-Q", "zone_name": "Quarantine Stacking", "zone_type": "QUARANTINE", "temperature_controlled": False}
        ],
        "bins": []
    }
    IN_MEMORY_CONFIGURED_WAREHOUSES.append(new_wh)

    IN_MEMORY_AUDIT_LOGS.insert(0, {
        "id": f"AUD-WH-{uuid.uuid4().hex[:8]}",
        "action": "WAREHOUSE_CREATED",
        "actor_id": user.get("id"),
        "actor_name": user.get("full_name") or user.get("username"),
        "actor_role": user.get("role"),
        "warehouse_id": new_wh["id"],
        "warehouse_name": new_wh["name"],
        "target_ref": new_wh["code"],
        "details": f"Created new warehouse node: {new_wh['name']} ({new_wh['code']}), Capacity {cfg.capacity_mt} MT.",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "status": "SUCCESS"
    })
    return {"success": True, "warehouse": new_wh}

@app.post("/warehouses/management/{wh_id}/bins", status_code=status.HTTP_201_CREATED)
async def add_bin_to_warehouse_management(wh_id: str, bin_cfg: BinConfigCreate, user: dict = Depends(require_manager_permission)):
    """Manager-only: Add a new bin location to warehouse."""
    wh = next((w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == wh_id), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found.")

    if any(b["bin_code"] == bin_cfg.bin_code for b in wh["bins"]):
        raise HTTPException(status_code=400, detail=f"Bin code {bin_cfg.bin_code} already exists in warehouse {wh_id}.")

    new_bin = {
        "bin_code": bin_cfg.bin_code,
        "bay": bin_cfg.bay,
        "rack": bin_cfg.rack,
        "bin": bin_cfg.bin,
        "zone_code": bin_cfg.zone_code,
        "commodity": bin_cfg.commodity,
        "capacity": bin_cfg.capacity_bags,
        "occupied": 0,
        "batches": [],
        "is_active": bin_cfg.is_active,
        "pick_sequence": 50
    }
    wh["bins"].append(new_bin)

    IN_MEMORY_AUDIT_LOGS.insert(0, {
        "id": f"AUD-BIN-{uuid.uuid4().hex[:8]}",
        "action": "BIN_CREATED",
        "actor_id": user.get("id"),
        "actor_name": user.get("full_name") or user.get("username"),
        "actor_role": user.get("role"),
        "warehouse_id": wh["id"],
        "warehouse_name": wh["name"],
        "target_ref": new_bin["bin_code"],
        "details": f"Added bin {new_bin['bin_code']} (Capacity {new_bin['capacity']} Bags) in Zone {new_bin['zone_code']}.",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "status": "SUCCESS"
    })
    return {"success": True, "bin": new_bin}

@app.get("/consignments")
async def list_consignments(user: dict = Depends(get_current_user_from_header)):
    """List received consignments, strictly scoped to user role permissions."""
    user_wh = user.get("warehouse_id")
    is_manager = user.get("role") == "MANAGER"

    if is_manager:
        return IN_MEMORY_CONSIGNMENTS
    return [c for c in IN_MEMORY_CONSIGNMENTS if c.get("destination_warehouse_id") == user_wh]

@app.get("/consignments/{consignment_id}")
async def get_consignment_details(consignment_id: str, user: dict = Depends(get_current_user_from_header)):
    """Fetch complete consignment details including batches and storage locations."""
    c = next((item for item in IN_MEMORY_CONSIGNMENTS if item["consignment_id"] == consignment_id), None)
    if not c:
        raise HTTPException(status_code=404, detail="Consignment not found.")
    
    enforce_warehouse_scope(user, c.get("destination_warehouse_id"))
    return c

@app.post("/consignments/auto-slot-preview")
async def calculate_auto_slot_preview(req: AutoSlotRequest, user: dict = Depends(get_current_user_from_header)):
    """
    Intelligent Auto-Slotting Engine:
    Recommends available bins based on compatible commodity rules, available capacity, and zone velocity priority.
    Does NOT mutate storage until user reviews and submits Step 4.
    """
    enforce_warehouse_scope(user, req.destination_warehouse_id)

    wh = next((w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == req.destination_warehouse_id), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Destination warehouse not found.")

    if not wh.get("is_active", True):
        raise HTTPException(status_code=400, detail=f"Warehouse {wh['name']} is currently inactive for intake.")

    # Check commodity compatibility
    if wh.get("compatible_commodities") and req.commodity not in wh["compatible_commodities"]:
        raise HTTPException(
            status_code=400,
            detail=f"Commodity '{req.commodity}' is not compatible with warehouse {wh['code']}. Compatible list: {', '.join(wh['compatible_commodities'])}."
        )

    # Sort bins: active only, compatible commodity, zone priority (PICK_FACE first, then BULK, then BUFFER)
    candidate_bins = []
    zone_priority = {"ZONE-A": 1, "PICK_FACE": 1, "ZONE-B": 2, "BULK": 2, "ZONE-C": 3, "BUFFER": 3, "ZONE-PUN-01": 1, "ZONE-NOIDA-01": 1}

    for b in wh.get("bins", []):
        if not b.get("is_active", True):
            continue
        # Check commodity segregation
        if b.get("commodity") and b["commodity"] != req.commodity and b.get("occupied", 0) > 0:
            continue # Already holds another commodity, cannot mix
        avail = max(0, b["capacity"] - b.get("occupied", 0))
        if avail > 0:
            candidate_bins.append({
                "bin_code": b["bin_code"],
                "bay": b.get("bay", "A"),
                "rack": b.get("rack", "01"),
                "bin": b.get("bin", "01"),
                "zone_code": b.get("zone_code", "ZONE-B"),
                "capacity": b["capacity"],
                "occupied": b.get("occupied", 0),
                "available": avail,
                "priority": zone_priority.get(b.get("zone_code"), 5)
            })

    candidate_bins.sort(key=lambda x: (x["priority"], -x["available"]))

    total_avail = sum(b["available"] for b in candidate_bins)
    if total_avail < req.total_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient capacity at {wh['name']}. Requested: {req.total_quantity} Bags, Available compatible space: {total_avail} Bags across {len(candidate_bins)} bins."
        )

    # Greedily allocate across bins
    remaining = req.total_quantity
    allocations = []
    batch_idx = 1
    numeric_id_base = int(datetime.datetime.now().strftime("%y%m%d%H%M%S")[-4:])

    for cb in candidate_bins:
        if remaining <= 0:
            break
        take = min(remaining, cb["available"])
        batch_id = f"B{numeric_id_base + batch_idx}"
        allocations.append({
            "batch_id": batch_id,
            "commodity": req.commodity,
            "quantity": take,
            "warehouse_id": wh["id"],
            "warehouse_name": wh["name"],
            "zone_code": cb["zone_code"],
            "rack": cb["rack"],
            "bin_code": cb["bin_code"],
            "receipt_date": req.arrival_date,
            "quality_status": "Pending Inspection",
            "bin_capacity": cb["capacity"],
            "bin_occupied_before": cb["occupied"],
            "bin_occupied_after": cb["occupied"] + take
        })
        remaining -= take
        batch_idx += 1

    return {
        "success": True,
        "can_allocate": True,
        "destination_warehouse_id": wh["id"],
        "destination_warehouse_name": wh["name"],
        "commodity": req.commodity,
        "total_requested": req.total_quantity,
        "total_allocated": req.total_quantity,
        "allocations_count": len(allocations),
        "allocations": allocations
    }

@app.post("/consignments/receive", status_code=status.HTTP_201_CREATED)
async def receive_consignment_workflow(
    workflow: ConsignmentReceiveWorkflow,
    user: dict = Depends(get_current_user_from_header)
):
    """
    Higher-level Warehouse, Batch & Storage Allocation workflow:
    1. Consignment intake details (Supplier, Challan, Arrival, Vehicle, Qty).
    2. Warehouse selection (RBAC enforced).
    3. Multi-batch & multi-storage allocation (balance check, duplicate check, bin capacity check).
    4. Atomic persistent recording + stock movement ledger + audit trail + receipt voucher.
    """
    # 1. Enforce RBAC
    enforce_warehouse_scope(user, workflow.destination_warehouse_id)

    # 2. Duplicate Consignment Check
    if any(c["consignment_id"] == workflow.consignment_id for c in IN_MEMORY_CONSIGNMENTS):
        raise HTTPException(
            status_code=400,
            detail=f"Consignment ID '{workflow.consignment_id}' has already been received. Duplicate submission rejected."
        )

    # 3. Check warehouse exists and is active
    wh = next((w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == workflow.destination_warehouse_id), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Destination warehouse not found.")
    if not wh.get("is_active", True):
        raise HTTPException(status_code=400, detail=f"Destination warehouse '{wh['name']}' is currently inactive.")

    # 4. Validate quantity balance: sum(batch_allocations) == total_quantity
    total_allocated = sum(alloc.quantity for alloc in workflow.batch_allocations)
    if total_allocated != workflow.total_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Allocation mismatch: Total received is {workflow.total_quantity} Bags, but allocated sum is {total_allocated} Bags. The unallocated quantity must be 0 before confirmation."
        )

    # 5. Validate non-negative quantities & unique batch IDs
    batch_ids_seen = set()
    for alloc in workflow.batch_allocations:
        if alloc.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Batch {alloc.batch_id} has invalid non-positive quantity {alloc.quantity}.")
        if alloc.batch_id in batch_ids_seen:
            raise HTTPException(status_code=400, detail=f"Duplicate batch ID '{alloc.batch_id}' in consignment submission.")
        batch_ids_seen.add(alloc.batch_id)

    # 6. Validate storage capacity & commodity compatibility on bins
    bin_deltas = {}
    for alloc in workflow.batch_allocations:
        bin_deltas[alloc.bin_code] = bin_deltas.get(alloc.bin_code, 0) + alloc.quantity

    for bin_code, delta in bin_deltas.items():
        b_target = next((b for b in wh.get("bins", []) if b["bin_code"] == bin_code), None)
        if b_target:
            if not b_target.get("is_active", True):
                raise HTTPException(status_code=400, detail=f"Storage Bin {bin_code} is currently flagged INACTIVE.")
            if b_target.get("commodity") and b_target["commodity"] != workflow.commodity and b_target.get("occupied", 0) > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Storage Bin {bin_code} currently holds '{b_target['commodity']}'. Cannot mix with '{workflow.commodity}'."
                )
            if b_target["occupied"] + delta > b_target["capacity"]:
                avail = max(0, b_target["capacity"] - b_target["occupied"])
                raise HTTPException(
                    status_code=400,
                    detail=f"Storage overflow at Bin {bin_code}: Capacity is {b_target['capacity']} Bags, currently holding {b_target['occupied']} Bags. Attempted to allocate {delta} Bags, exceeding limit by {b_target['occupied'] + delta - b_target['capacity']} Bags."
                )

    # 7. Apply mutations consistently
    created_batches = []
    receipt_voucher_id = f"RCV-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    for alloc in workflow.batch_allocations:
        # Update bin occupancy
        b_target = next((b for b in wh.get("bins", []) if b["bin_code"] == alloc.bin_code), None)
        if b_target:
            b_target["occupied"] = b_target.get("occupied", 0) + alloc.quantity
            if not b_target.get("commodity"):
                b_target["commodity"] = alloc.commodity
            if alloc.batch_id not in b_target.setdefault("batches", []):
                b_target["batches"].append(alloc.batch_id)

        # Batch record
        batch_record = {
            "batch_id": alloc.batch_id,
            "consignment_id": workflow.consignment_id,
            "commodity": alloc.commodity,
            "total_quantity": alloc.quantity,
            "available_quantity": alloc.quantity,
            "quality_status": "Pending Inspection", # Strict requirement: Newly received stock is NEVER automatically approved
            "receipt_date": alloc.receipt_date,
            "supplier": workflow.supplier_name,
            "warehouse_id": workflow.destination_warehouse_id,
            "warehouse_name": wh["name"],
            "zone_code": alloc.zone_code,
            "rack": alloc.rack,
            "bin_code": alloc.bin_code,
            "challan_number": workflow.challan_number,
            "vehicle_number": workflow.vehicle_number,
            "receipt_voucher": receipt_voucher_id,
            "notes": workflow.remarks or "Gate intake sound receipt"
        }
        created_batches.append(batch_record)

    # Consignment record
    consignment_record = {
        "consignment_id": workflow.consignment_id,
        "receipt_voucher_id": receipt_voucher_id,
        "supplier_name": workflow.supplier_name,
        "challan_number": workflow.challan_number,
        "arrival_date": workflow.arrival_date,
        "arrival_time": workflow.arrival_time,
        "commodity": workflow.commodity,
        "total_quantity": workflow.total_quantity,
        "unit": workflow.unit,
        "vehicle_number": workflow.vehicle_number,
        "remarks": workflow.remarks,
        "document_url": workflow.document_url,
        "destination_warehouse_id": workflow.destination_warehouse_id,
        "destination_warehouse_name": wh["name"],
        "allocation_mode": workflow.allocation_mode,
        "received_by_id": user.get("id"),
        "received_by_name": user.get("full_name") or user.get("username"),
        "received_by_role": user.get("role"),
        "received_at": datetime.datetime.utcnow().isoformat() + "Z",
        "batches": created_batches,
        "batch_count": len(created_batches),
        "status": "STORED_AWAITING_INSPECTION"
    }
    IN_MEMORY_CONSIGNMENTS.insert(0, consignment_record)

    # 8. Append to Stock Movements Ledger
    for b_item in created_batches:
        IN_MEMORY_AUDIT_LOGS.insert(0, {
            "id": f"AUD-INW-{uuid.uuid4().hex[:8]}",
            "action": "STOCK_CONSIGNMENT_RECEIVED",
            "actor_id": user.get("id"),
            "actor_name": user.get("full_name") or user.get("username"),
            "actor_role": user.get("role"),
            "warehouse_id": workflow.destination_warehouse_id,
            "warehouse_name": wh["name"],
            "target_ref": b_item["batch_id"],
            "details": f"Consignment {workflow.consignment_id}: Received {b_item['total_quantity']} Bags {b_item['commodity']} into Bin {b_item['bin_code']} (Status: Pending Inspection). Challan: {workflow.challan_number}.",
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "status": "SUCCESS"
        })

    return {
        "success": True,
        "message": f"Consignment {workflow.consignment_id} successfully received and allocated across {len(created_batches)} batches/bins.",
        "consignment_id": workflow.consignment_id,
        "receipt_voucher_id": receipt_voucher_id,
        "destination_warehouse": wh["name"],
        "total_quantity": workflow.total_quantity,
        "batch_count": len(created_batches),
        "batches": created_batches,
        "qr_token": f"BHANDARSETU:CSG:{workflow.consignment_id}:RCV:{receipt_voucher_id}:QTY:{workflow.total_quantity}"
    }
'''

with open('api/main.py', 'r', encoding='utf-8') as f:
    orig = f.read()

# Insert right after line 927: '# 2. Receipts & Batches'
marker = '# 2. Receipts & Batches'
assert marker in orig, "Marker not found in api/main.py"

updated = orig.replace(marker, api_code + '\n' + marker, 1)

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(updated)

print("api/main.py updated successfully!")

