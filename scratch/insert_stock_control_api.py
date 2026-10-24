# Script to insert Stock Control endpoints into api/main.py
import re

stock_control_code = '''
# -----------------------------------------------------------------------------
# 11. Stock Control, Damaged Stock, Clearance & Disposals
# -----------------------------------------------------------------------------

class DamagedStockReport(BaseModel):
    batch_id: str
    affected_quantity: int
    damage_reason: str  # MOISTURE, FUNGUS, PESTS, CONTAMINATION, PACKAGING_FAILURE, QUALITY_FAILURE, OTHER
    evidence_notes: str
    photos: Optional[List[str]] = None

class DamagedStockStatusUpdate(BaseModel):
    status: str  # REPORTED, AWAITING_INSPECTION, ON_HOLD, RECHECK_REQUIRED, APPROVED_FOR_RELEASE, DISPOSAL_REQUESTED, DISPOSED
    inspection_findings: Optional[str] = None
    resolution_notes: Optional[str] = None

class ClearanceOrderBatchItem(BaseModel):
    batch_id: str
    commodity: str
    quantity: int
    resolution: str  # MOVE_TO_BAY, TRANSFER_DEPOT, DISPATCH_ALLOCATION, QUARANTINE_SEGREGATION, WRITE_OFF
    destination_bay: Optional[str] = None

class ClearanceOrderCreate(BaseModel):
    warehouse_id: str
    godown_bay: str
    reason: str  # REORGANIZATION, SPACE_INTAKE, TRANSFER_LOCATION, DISPATCH_ALLOCATION, DAMAGED_SEGREGATION, APPROVED_DISPOSAL
    priority: str = "NORMAL"  # NORMAL, HIGH, URGENT
    deadline: str
    assigned_to_id: str
    instructions: str
    batches: List[ClearanceOrderBatchItem]

class ClearanceItemMove(BaseModel):
    batch_id: str
    destination_bay: str
    moved_quantity: int
    notes: Optional[str] = None

class StockTransferCreate(BaseModel):
    source_warehouse_id: str
    source_bay: str
    dest_warehouse_id: str
    dest_bay: str
    batch_id: str
    quantity: int
    reason: str
    assigned_operator_id: str
    vehicle_no: Optional[str] = None
    driver_name: Optional[str] = None

class StockTransferStatusUpdate(BaseModel):
    action: str  # APPROVE, REJECT, DISPATCH, RECEIVE, CANCEL
    remarks: Optional[str] = None

class StockVerificationCreate(BaseModel):
    warehouse_id: str
    godown_bay: str
    commodity: Optional[str] = None
    batches: List[str]

class StockCountItemSubmit(BaseModel):
    batch_id: str
    physically_counted_bags: int
    notes: Optional[str] = None

class StockCountSubmit(BaseModel):
    items: List[StockCountItemSubmit]

class StockAdjustmentItem(BaseModel):
    batch_id: str
    approved_adjustment_bags: int
    reason: str

class StockAdjustmentApprove(BaseModel):
    items: List[StockAdjustmentItem]
    manager_notes: str

class DisposalRequestCreate(BaseModel):
    batch_id: str
    quantity: int
    inspection_ref: Optional[str] = None
    reason: str
    disposal_method: str  # CERTIFIED_INCINERATION, SCIENTIFIC_COMPOSTING, INDUSTRIAL_REPURPOSING, SECURE_LANDFILL
    evidence_notes: str

class DisposalReview(BaseModel):
    decision: str  # APPROVE, REJECT, MORE_INFO
    remarks: str

class DisposalComplete(BaseModel):
    disposal_certificate_ref: str
    actual_disposed_quantity: int
    execution_notes: str

# Seed in-memory records
IN_MEMORY_DAMAGED_STOCK = [
    {
        "id": "DMG-2025-001",
        "batch_id": "B004",
        "commodity": "Rice",
        "warehouse_id": "GDN-NGP-01",
        "godown_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "bin_code": "BAY-NGP-01-BIN-04",
        "affected_quantity": 25,
        "unit": "Bags",
        "damage_reason": "MOISTURE",
        "damage_reason_label": "High Moisture & Water Condensation",
        "date_reported": "2025-10-23 10:30",
        "reported_by_id": "u-admin-ngp",
        "reported_by_name": "Ramesh Patil",
        "evidence_notes": "Moisture condensation detected on pallet bottom layer. Lab reading 15.2% wt (ceiling 14.0%).",
        "inspection_findings": "25 bags quarantined in Bay 4. Aeration and re-sampling recommended.",
        "status": "ON_HOLD",
        "assigned_task_id": "TSK-2025-001",
        "resolution_history": [
            {"status": "REPORTED", "timestamp": "2025-10-23 10:30", "user": "Ramesh Patil", "notes": "Initial damage alert logged during stack walk-through."},
            {"status": "ON_HOLD", "timestamp": "2025-10-23 11:00", "user": "Aayush Tripathi", "notes": "Manager placed 25 bags on quarantine hold. Task TSK-2025-001 created."}
        ]
    },
    {
        "id": "DMG-2025-002",
        "batch_id": "B007",
        "commodity": "Rice",
        "warehouse_id": "GDN-NGP-01",
        "godown_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "bin_code": "BAY-NGP-01-BIN-07",
        "affected_quantity": 40,
        "unit": "Bags",
        "damage_reason": "PESTS",
        "damage_reason_label": "Live Weevil Infestation Outbreak",
        "date_reported": "2025-10-22 14:15",
        "reported_by_id": "u-quality-01",
        "reported_by_name": "Vikram Joshi",
        "evidence_notes": "Live pest count 18 per kg. Extensive grain hollows and dust powder.",
        "inspection_findings": "Consignment certified completely unfit for human or livestock consumption. Scientific disposal required.",
        "status": "DISPOSAL_REQUESTED",
        "assigned_task_id": None,
        "resolution_history": [
            {"status": "REPORTED", "timestamp": "2025-10-22 14:15", "user": "Vikram Joshi", "notes": "Quality inspection failure recorded."},
            {"status": "DISPOSAL_REQUESTED", "timestamp": "2025-10-23 09:30", "user": "Vikram Joshi", "notes": "Disposal request DSP-2025-001 submitted to Manager."}
        ]
    },
    {
        "id": "DMG-2025-003",
        "batch_id": "B010",
        "commodity": "Rice",
        "warehouse_id": "GDN-PUN-02",
        "godown_name": "Pune Buffer Depot (Hadapsar Central)",
        "bin_code": "BAY-PUN-01-BIN-02",
        "affected_quantity": 10,
        "unit": "Bags",
        "damage_reason": "PACKAGING_FAILURE",
        "damage_reason_label": "Torn Jute Bags During Handling",
        "date_reported": "2025-10-24 08:00",
        "reported_by_id": "u-admin-pun",
        "reported_by_name": "Suresh Shinde",
        "evidence_notes": "10 bags snagged on forklift tine during intake restacking. Grain sound but re-bagging required.",
        "inspection_findings": "Grain free of impurities. Re-bagging and re-stitching authorized.",
        "status": "RECHECK_REQUIRED",
        "assigned_task_id": None,
        "resolution_history": [
            {"status": "REPORTED", "timestamp": "2025-10-24 08:00", "user": "Suresh Shinde", "notes": "Packaging tears reported."}
        ]
    }
]

IN_MEMORY_CLEARANCE_ORDERS = [
    {
        "id": "CLR-2025-001",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "godown_bay": "BAY-NGP-01-BIN-04",
        "reason": "DAMAGED_SEGREGATION",
        "reason_label": "Damaged & Held Stock Segregation",
        "priority": "HIGH",
        "deadline": "2025-10-25 18:00",
        "assigned_to_id": "u-admin-ngp",
        "assigned_to_name": "Ramesh Patil",
        "instructions": "Relocate all 25 held bags of Batch B004 from Bay 4 to Quarantine Isolation Stack Q-1. Deep clean and fumigate Bay 4 floor.",
        "total_batches": 1,
        "total_quantity": 25,
        "moved_quantity": 0,
        "status": "IN_PROGRESS",
        "created_at": "2025-10-23 11:30",
        "created_by": "Aayush Tripathi",
        "batches": [
            {
                "batch_id": "B004",
                "commodity": "Rice",
                "quantity": 25,
                "resolution": "MOVE_TO_BAY",
                "destination_bay": "BAY-NGP-QUARANTINE-01",
                "moved_quantity": 0,
                "status": "PENDING"
            }
        ]
    },
    {
        "id": "CLR-2025-002",
        "warehouse_id": "GDN-PUN-02",
        "warehouse_name": "Pune Buffer Depot (Hadapsar Central)",
        "godown_bay": "BAY-PUN-01-BIN-01",
        "reason": "SPACE_INTAKE",
        "reason_label": "Space Clearance for Seasonal Wheat Intake",
        "priority": "NORMAL",
        "deadline": "2025-10-26 17:00",
        "assigned_to_id": "u-admin-pun",
        "assigned_to_name": "Suresh Shinde",
        "instructions": "Move sound stock in Bay 1 to high-density racks in Bay 3 ahead of 400 MT winter procurement arrival.",
        "total_batches": 1,
        "total_quantity": 50,
        "moved_quantity": 50,
        "status": "COMPLETED",
        "created_at": "2025-10-22 09:00",
        "created_by": "Aayush Tripathi",
        "batches": [
            {
                "batch_id": "B009",
                "commodity": "Wheat",
                "quantity": 50,
                "resolution": "MOVE_TO_BAY",
                "destination_bay": "BAY-PUN-01-BIN-03",
                "moved_quantity": 50,
                "status": "COMPLETED"
            }
        ]
    }
]

IN_MEMORY_STOCK_TRANSFERS = [
    {
        "id": "TRF-2025-001",
        "source_warehouse_id": "GDN-NGP-01",
        "source_warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "source_bay": "BAY-NGP-01-BIN-01",
        "dest_warehouse_id": "GDN-PUN-02",
        "dest_warehouse_name": "Pune Buffer Depot (Hadapsar Central)",
        "dest_bay": "BAY-PUN-01-BIN-03",
        "batch_id": "B001",
        "commodity": "Wheat",
        "quantity": 50,
        "unit": "Bags",
        "reason": "Inter-depot buffer replenishment for Western Maharashtra ration deficit",
        "requested_by_id": "u-manager-01",
        "requested_by_name": "Aayush Tripathi",
        "assigned_operator_id": "u-admin-ngp",
        "assigned_operator_name": "Ramesh Patil",
        "approval_status": "APPROVED",
        "approved_by_id": "u-manager-01",
        "approved_at": "2025-10-23 12:00",
        "dispatched_at": "2025-10-24 07:30",
        "dispatch_confirmed_by": "Ramesh Patil",
        "vehicle_no": "MH-31-CB-9021",
        "driver_name": "Mohan Lal",
        "received_at": None,
        "received_by": None,
        "status": "IN_TRANSIT",
        "remarks": "Consignment dispatched under GPS e-Lock #9921. Gate pass GP-TRF-001 issued."
    }
]

IN_MEMORY_STOCK_VERIFICATIONS = [
    {
        "id": "VER-2025-001",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "godown_bay": "BAY-NGP-01-BIN-01",
        "commodity": "Wheat",
        "scheduled_date": "2025-10-24",
        "counted_by_id": "u-admin-ngp",
        "counted_by_name": "Ramesh Patil",
        "verified_by_id": "u-manager-01",
        "verified_by_name": "Aayush Tripathi",
        "status": "DISCREPANCY_DETECTED",
        "created_at": "2025-10-24 08:00",
        "items": [
            {
                "batch_id": "B001",
                "commodity": "Wheat",
                "system_snapshot_bags": 120,
                "physically_counted_bags": 118,
                "difference_bags": -2,
                "variance_pct": -1.67,
                "discrepancy_reason": "2 torn bags burst during pallet restacking. Grain salvaged into salvage bin #SB-01.",
                "status": "PENDING_MANAGER_APPROVAL",
                "notes": "Salvage grain weighed 96kg net."
            }
        ],
        "manager_decision": None
    },
    {
        "id": "VER-2025-002",
        "warehouse_id": "GDN-PUN-02",
        "warehouse_name": "Pune Buffer Depot (Hadapsar Central)",
        "godown_bay": "BAY-PUN-01-BIN-01",
        "commodity": "Wheat",
        "scheduled_date": "2025-10-23",
        "counted_by_id": "u-admin-pun",
        "counted_by_name": "Suresh Shinde",
        "verified_by_id": "u-manager-01",
        "verified_by_name": "Aayush Tripathi",
        "status": "RESOLVED",
        "created_at": "2025-10-23 10:00",
        "items": [
            {
                "batch_id": "B009",
                "commodity": "Wheat",
                "system_snapshot_bags": 180,
                "physically_counted_bags": 180,
                "difference_bags": 0,
                "variance_pct": 0.0,
                "discrepancy_reason": None,
                "status": "MATCHED",
                "notes": "Physical stack count exactly reconciles with system register."
            }
        ],
        "manager_decision": "APPROVED"
    }
]

IN_MEMORY_DISPOSAL_REQUESTS = [
    {
        "id": "DSP-2025-001",
        "batch_id": "B007",
        "commodity": "Rice",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "godown_bay": "BAY-NGP-01-BIN-07",
        "quantity": 40,
        "unit": "Bags",
        "inspection_ref": "INS-2025-007",
        "reason": "Severe pest damage and mold infestation certified unrecoverable",
        "evidence_notes": "BIS/FCI Lab certificate #QL-9081 declared stock unfit for public consumption.",
        "requested_by_id": "u-quality-01",
        "requested_by_name": "Vikram Joshi (Quality Officer)",
        "approved_by_id": "u-manager-01",
        "approved_by_name": "Aayush Tripathi (District Manager)",
        "approved_at": "2025-10-23 15:00",
        "status": "APPROVED",
        "disposal_method": "Certified Scientific Composting & Biogas Facility",
        "disposal_certificate_ref": None,
        "executed_at": None,
        "executed_by": None,
        "created_at": "2025-10-23 09:30",
        "remarks": "Approved by District Godown Manager. Municipal bio-methanation lift scheduled for 26 Oct."
    }
]

# -----------------------------------------------------------------------------
# Stock Control Endpoints
# -----------------------------------------------------------------------------

@app.get("/stock-control/damaged")
async def get_damaged_stock(
    status: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    results = IN_MEMORY_DAMAGED_STOCK
    if current_user.role != "MANAGER":
        results = [d for d in results if d["warehouse_id"] == current_user.warehouse_id]
    elif warehouse_id and warehouse_id != "ALL":
        results = [d for d in results if d["warehouse_id"] == warehouse_id]
    if status and status != "ALL":
        results = [d for d in results if d["status"] == status]
    return results

@app.post("/stock-control/damaged")
async def report_damaged_stock(
    payload: DamagedStockReport,
    current_user: User = Depends(get_current_user)
):
    dmg_id = f"DMG-2025-{len(IN_MEMORY_DAMAGED_STOCK) + 1:03d}"
    record = {
        "id": dmg_id,
        "batch_id": payload.batch_id,
        "commodity": "Wheat" if payload.batch_id.startswith("B001") or payload.batch_id.startswith("B006") else "Rice",
        "warehouse_id": current_user.warehouse_id or "GDN-NGP-01",
        "godown_name": "Central Food Godown, Nagpur" if (current_user.warehouse_id or "GDN-NGP-01") == "GDN-NGP-01" else "Pune Buffer Depot",
        "bin_code": "BAY-NGP-01-BIN-01",
        "affected_quantity": payload.affected_quantity,
        "unit": "Bags",
        "damage_reason": payload.damage_reason,
        "damage_reason_label": payload.damage_reason.replace("_", " ").title(),
        "date_reported": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "reported_by_id": current_user.id,
        "reported_by_name": current_user.full_name,
        "evidence_notes": payload.evidence_notes,
        "inspection_findings": None,
        "status": "ON_HOLD",
        "assigned_task_id": None,
        "resolution_history": [
            {
                "status": "REPORTED",
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                "user": current_user.full_name,
                "notes": f"Damage report submitted for {payload.affected_quantity} bags: {payload.evidence_notes}"
            },
            {
                "status": "ON_HOLD",
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                "user": "System Auto-Lock",
                "notes": "Affected stock placed on quarantine hold. Blocked from FIFO allocation and outward dispatch."
            }
        ]
    }
    IN_MEMORY_DAMAGED_STOCK.insert(0, record)

    # Notify Managers
    await dispatch_notification(
        title=f"⚠️ Damaged Stock Alert: Batch {payload.batch_id} ({payload.affected_quantity} Bags)",
        message=f"{current_user.full_name} reported {payload.damage_reason.replace('_', ' ')} on {payload.batch_id}. Placed on quarantine hold.",
        type_="WARNING",
        target_role="MANAGER",
        batch_id=payload.batch_id
    )

    return record

@app.put("/stock-control/damaged/{dmg_id}/status")
async def update_damaged_stock_status(
    dmg_id: str,
    payload: DamagedStockStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "MANAGER":
        raise HTTPException(status_code=403, detail="Only Managers can update damaged stock resolution status.")
    rec = next((d for d in IN_MEMORY_DAMAGED_STOCK if d["id"] == dmg_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Damaged stock record not found.")
    rec["status"] = payload.status
    if payload.inspection_findings:
        rec["inspection_findings"] = payload.inspection_findings
    rec["resolution_history"].append({
        "status": payload.status,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "user": current_user.full_name,
        "notes": payload.resolution_notes or f"Status transitioned to {payload.status}"
    })
    return rec

# Clearance Orders
@app.get("/stock-control/clearances")
async def get_clearance_orders(
    status: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    results = IN_MEMORY_CLEARANCE_ORDERS
    if current_user.role != "MANAGER":
        results = [c for c in results if c["warehouse_id"] == current_user.warehouse_id]
    elif warehouse_id and warehouse_id != "ALL":
        results = [c for c in results if c["warehouse_id"] == warehouse_id]
    if status and status != "ALL":
        results = [c for c in results if c["status"] == status]
    return results

@app.post("/stock-control/clearances")
async def create_clearance_order(
    payload: ClearanceOrderCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "MANAGER":
        raise HTTPException(status_code=403, detail="Only Godown Managers can issue Clearance Orders.")
    clr_id = f"CLR-2025-{len(IN_MEMORY_CLEARANCE_ORDERS) + 1:03d}"
    total_qty = sum(b.quantity for b in payload.batches)
    order = {
        "id": clr_id,
        "warehouse_id": payload.warehouse_id,
        "warehouse_name": "Central Food Godown, Nagpur" if payload.warehouse_id == "GDN-NGP-01" else "Pune Buffer Depot",
        "godown_bay": payload.godown_bay,
        "reason": payload.reason,
        "reason_label": payload.reason.replace("_", " ").title(),
        "priority": payload.priority,
        "deadline": payload.deadline,
        "assigned_to_id": payload.assigned_to_id,
        "assigned_to_name": "Ramesh Patil" if payload.assigned_to_id == "u-admin-ngp" else "Suresh Shinde",
        "instructions": payload.instructions,
        "total_batches": len(payload.batches),
        "total_quantity": total_qty,
        "moved_quantity": 0,
        "status": "ASSIGNED",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "created_by": current_user.full_name,
        "batches": [
            {
                "batch_id": b.batch_id,
                "commodity": b.commodity,
                "quantity": b.quantity,
                "resolution": b.resolution,
                "destination_bay": b.destination_bay or "Designated Quarantine Bay",
                "moved_quantity": 0,
                "status": "PENDING"
            } for b in payload.batches
        ]
    }
    IN_MEMORY_CLEARANCE_ORDERS.insert(0, order)

    # Notify Operator
    await dispatch_notification(
        title=f"📦 New Clearance Order {clr_id} Assigned",
        message=f"Clearance order issued for Bay {payload.godown_bay} ({total_qty} bags). Deadline: {payload.deadline}",
        type_="INFO",
        target_role="OPERATOR",
        user_id=payload.assigned_to_id
    )
    return order

@app.post("/stock-control/clearances/{clr_id}/item-move")
async def record_clearance_item_move(
    clr_id: str,
    payload: ClearanceItemMove,
    current_user: User = Depends(get_current_user)
):
    order = next((c for c in IN_MEMORY_CLEARANCE_ORDERS if c["id"] == clr_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Clearance order not found.")
    item = next((b for b in order["batches"] if b["batch_id"] == payload.batch_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Batch item not found in clearance order.")
    item["moved_quantity"] = min(item["quantity"], item["moved_quantity"] + payload.moved_quantity)
    if item["moved_quantity"] >= item["quantity"]:
        item["status"] = "COMPLETED"
    else:
        item["status"] = "PARTIAL"
    order["moved_quantity"] = sum(b["moved_quantity"] for b in order["batches"])
    if order["moved_quantity"] >= order["total_quantity"]:
        order["status"] = "COMPLETED"
    else:
        order["status"] = "IN_PROGRESS"
    return order

# Stock Transfers
@app.get("/stock-control/transfers")
async def get_stock_transfers(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    results = IN_MEMORY_STOCK_TRANSFERS
    if current_user.role != "MANAGER":
        results = [t for t in results if t["source_warehouse_id"] == current_user.warehouse_id or t["dest_warehouse_id"] == current_user.warehouse_id]
    if status and status != "ALL":
        results = [t for t in results if t["status"] == status]
    return results

@app.post("/stock-control/transfers")
async def create_stock_transfer(
    payload: StockTransferCreate,
    current_user: User = Depends(get_current_user)
):
    trf_id = f"TRF-2025-{len(IN_MEMORY_STOCK_TRANSFERS) + 1:03d}"
    is_manager = current_user.role == "MANAGER"
    transfer = {
        "id": trf_id,
        "source_warehouse_id": payload.source_warehouse_id,
        "source_warehouse_name": "Central Food Godown, Nagpur" if payload.source_warehouse_id == "GDN-NGP-01" else "Pune Buffer Depot",
        "source_bay": payload.source_bay,
        "dest_warehouse_id": payload.dest_warehouse_id,
        "dest_warehouse_name": "Pune Buffer Depot" if payload.dest_warehouse_id == "GDN-PUN-02" else "Central Food Godown, Nagpur",
        "dest_bay": payload.dest_bay,
        "batch_id": payload.batch_id,
        "commodity": "Wheat" if payload.batch_id.startswith("B001") else "Rice",
        "quantity": payload.quantity,
        "unit": "Bags",
        "reason": payload.reason,
        "requested_by_id": current_user.id,
        "requested_by_name": current_user.full_name,
        "assigned_operator_id": payload.assigned_operator_id,
        "assigned_operator_name": "Ramesh Patil" if payload.assigned_operator_id == "u-admin-ngp" else "Suresh Shinde",
        "approval_status": "APPROVED" if is_manager else "REQUESTED",
        "approved_by_id": current_user.id if is_manager else None,
        "approved_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M") if is_manager else None,
        "dispatched_at": None,
        "dispatch_confirmed_by": None,
        "vehicle_no": payload.vehicle_no,
        "driver_name": payload.driver_name,
        "received_at": None,
        "received_by": None,
        "status": "APPROVED" if is_manager else "REQUESTED",
        "remarks": payload.reason
    }
    IN_MEMORY_STOCK_TRANSFERS.insert(0, transfer)
    return transfer

@app.post("/stock-control/transfers/{trf_id}/approve")
async def approve_stock_transfer(
    trf_id: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "MANAGER":
        raise HTTPException(status_code=403, detail="Only Managers can approve stock transfers.")
    transfer = next((t for t in IN_MEMORY_STOCK_TRANSFERS if t["id"] == trf_id), None)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    transfer["approval_status"] = "APPROVED"
    transfer["approved_by_id"] = current_user.id
    transfer["approved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    transfer["status"] = "APPROVED"
    return transfer

@app.post("/stock-control/transfers/{trf_id}/dispatch")
async def dispatch_stock_transfer(
    trf_id: str,
    current_user: User = Depends(get_current_user)
):
    transfer = next((t for t in IN_MEMORY_STOCK_TRANSFERS if t["id"] == trf_id), None)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    if transfer["approval_status"] != "APPROVED":
        raise HTTPException(status_code=400, detail="Cannot dispatch unapproved transfer.")
    transfer["dispatched_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    transfer["dispatch_confirmed_by"] = current_user.full_name
    transfer["status"] = "IN_TRANSIT"
    return transfer

@app.post("/stock-control/transfers/{trf_id}/receive")
async def receive_stock_transfer(
    trf_id: str,
    current_user: User = Depends(get_current_user)
):
    transfer = next((t for t in IN_MEMORY_STOCK_TRANSFERS if t["id"] == trf_id), None)
    if not transfer:
        raise HTTPException(status_code=404, detail="Stock transfer not found.")
    if transfer["status"] != "IN_TRANSIT":
        raise HTTPException(status_code=400, detail="Transfer is not currently in transit.")
    transfer["received_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    transfer["received_by"] = current_user.full_name
    transfer["status"] = "DELIVERED"
    return transfer

# Stock Verification Sessions
@app.get("/stock-control/verifications")
async def get_verifications(
    warehouse_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    results = IN_MEMORY_STOCK_VERIFICATIONS
    if current_user.role != "MANAGER":
        results = [v for v in results if v["warehouse_id"] == current_user.warehouse_id]
    elif warehouse_id and warehouse_id != "ALL":
        results = [v for v in results if v["warehouse_id"] == warehouse_id]
    return results

@app.post("/stock-control/verifications")
async def create_verification_session(
    payload: StockVerificationCreate,
    current_user: User = Depends(get_current_user)
):
    ver_id = f"VER-2025-{len(IN_MEMORY_STOCK_VERIFICATIONS) + 1:03d}"
    session = {
        "id": ver_id,
        "warehouse_id": payload.warehouse_id,
        "warehouse_name": "Central Food Godown, Nagpur" if payload.warehouse_id == "GDN-NGP-01" else "Pune Buffer Depot",
        "godown_bay": payload.godown_bay,
        "commodity": payload.commodity or "All Commodities",
        "scheduled_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "counted_by_id": None,
        "counted_by_name": None,
        "verified_by_id": current_user.id,
        "verified_by_name": current_user.full_name,
        "status": "SCHEDULED",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "items": [
            {
                "batch_id": b,
                "commodity": "Wheat" if b.startswith("B001") else "Rice",
                "system_snapshot_bags": 120,
                "physically_counted_bags": None,
                "difference_bags": None,
                "variance_pct": None,
                "discrepancy_reason": None,
                "status": "PENDING_COUNT",
                "notes": None
            } for b in payload.batches
        ],
        "manager_decision": None
    }
    IN_MEMORY_STOCK_VERIFICATIONS.insert(0, session)
    return session

@app.post("/stock-control/verifications/{ver_id}/submit-count")
async def submit_stock_count(
    ver_id: str,
    payload: StockCountSubmit,
    current_user: User = Depends(get_current_user)
):
    session = next((v for v in IN_MEMORY_STOCK_VERIFICATIONS if v["id"] == ver_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Verification session not found.")
    session["counted_by_id"] = current_user.id
    session["counted_by_name"] = current_user.full_name
    has_discrepancy = False
    for submit_item in payload.items:
        match = next((i for i in session["items"] if i["batch_id"] == submit_item.batch_id), None)
        if match:
            match["physically_counted_bags"] = submit_item.physically_counted_bags
            diff = submit_item.physically_counted_bags - match["system_snapshot_bags"]
            match["difference_bags"] = diff
            match["variance_pct"] = round((diff / match["system_snapshot_bags"]) * 100, 2) if match["system_snapshot_bags"] else 0
            match["notes"] = submit_item.notes
            if diff != 0:
                has_discrepancy = True
                match["status"] = "DISCREPANCY"
            else:
                match["status"] = "MATCHED"
    session["status"] = "DISCREPANCY_DETECTED" if has_discrepancy else "RESOLVED"
    return session

@app.post("/stock-control/verifications/{ver_id}/approve-adjustment")
async def approve_stock_adjustment(
    ver_id: str,
    payload: StockAdjustmentApprove,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "MANAGER":
        raise HTTPException(status_code=403, detail="Only Managers can authorize stock balance adjustments.")
    session = next((v for v in IN_MEMORY_STOCK_VERIFICATIONS if v["id"] == ver_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Verification session not found.")
    session["manager_decision"] = "ADJUST_APPROVED"
    session["status"] = "ADJUSTED"
    return session

# Disposal & Write-off
@app.get("/stock-control/disposals")
async def get_disposal_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    results = IN_MEMORY_DISPOSAL_REQUESTS
    if current_user.role != "MANAGER":
        results = [d for d in results if d["warehouse_id"] == current_user.warehouse_id]
    if status and status != "ALL":
        results = [d for d in results if d["status"] == status]
    return results

@app.post("/stock-control/disposals")
async def create_disposal_request(
    payload: DisposalRequestCreate,
    current_user: User = Depends(get_current_user)
):
    dsp_id = f"DSP-2025-{len(IN_MEMORY_DISPOSAL_REQUESTS) + 1:03d}"
    request = {
        "id": dsp_id,
        "batch_id": payload.batch_id,
        "commodity": "Wheat" if payload.batch_id.startswith("B001") else "Rice",
        "warehouse_id": current_user.warehouse_id or "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur",
        "godown_bay": "BAY-NGP-01-BIN-07",
        "quantity": payload.quantity,
        "unit": "Bags",
        "inspection_ref": payload.inspection_ref,
        "reason": payload.reason,
        "evidence_notes": payload.evidence_notes,
        "requested_by_id": current_user.id,
        "requested_by_name": current_user.full_name,
        "approved_by_id": None,
        "approved_by_name": None,
        "approved_at": None,
        "status": "REQUESTED",
        "disposal_method": payload.disposal_method.replace("_", " ").title(),
        "disposal_certificate_ref": None,
        "executed_at": None,
        "executed_by": None,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "remarks": payload.evidence_notes
    }
    IN_MEMORY_DISPOSAL_REQUESTS.insert(0, request)
    return request

@app.post("/stock-control/disposals/{dsp_id}/review")
async def review_disposal_request(
    dsp_id: str,
    payload: DisposalReview,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "MANAGER":
        raise HTTPException(status_code=403, detail="Only Managers can review disposal requests.")
    request = next((d for d in IN_MEMORY_DISPOSAL_REQUESTS if d["id"] == dsp_id), None)
    if not request:
        raise HTTPException(status_code=404, detail="Disposal request not found.")
    # Separation of duties check
    if request["requested_by_id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Separation of duties policy violation: You cannot approve your own disposal request.")
    if payload.decision == "APPROVE":
        request["status"] = "APPROVED"
        request["approved_by_id"] = current_user.id
        request["approved_by_name"] = current_user.full_name
        request["approved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    elif payload.decision == "REJECT":
        request["status"] = "REJECTED"
    else:
        request["status"] = "MORE_INFO_REQUIRED"
    request["remarks"] = payload.remarks
    return request

@app.post("/stock-control/disposals/{dsp_id}/complete")
async def complete_disposal_execution(
    dsp_id: str,
    payload: DisposalComplete,
    current_user: User = Depends(get_current_user)
):
    request = next((d for d in IN_MEMORY_DISPOSAL_REQUESTS if d["id"] == dsp_id), None)
    if not request:
        raise HTTPException(status_code=404, detail="Disposal request not found.")
    if request["status"] != "APPROVED":
        raise HTTPException(status_code=400, detail="Cannot execute unapproved disposal request.")
    request["status"] = "COMPLETED"
    request["executed_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    request["executed_by"] = current_user.full_name
    request["disposal_certificate_ref"] = payload.disposal_certificate_ref
    return request

@app.get("/stock-control/analytics")
async def get_stock_control_analytics(
    current_user: User = Depends(get_current_user)
):
    total_damaged_bags = sum(d["affected_quantity"] for d in IN_MEMORY_DAMAGED_STOCK if d["status"] != "DISPOSED")
    total_disposed_bags = sum(d["quantity"] for d in IN_MEMORY_DISPOSAL_REQUESTS if d["status"] == "COMPLETED")
    active_clearances = sum(1 for c in IN_MEMORY_CLEARANCE_ORDERS if c["status"] in ["ASSIGNED", "IN_PROGRESS"])
    in_transit_transfers = sum(1 for t in IN_MEMORY_STOCK_TRANSFERS if t["status"] == "IN_TRANSIT")
    discrepancies = sum(1 for v in IN_MEMORY_STOCK_VERIFICATIONS if v["status"] == "DISCREPANCY_DETECTED")
    return {
        "total_damaged_bags": total_damaged_bags,
        "total_disposed_bags": total_disposed_bags,
        "active_clearances": active_clearances,
        "in_transit_transfers": in_transit_transfers,
        "discrepancies_flagged": discrepancies
    }
'''

with open('api/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '# 11. Health & Observability Metrics'
assert target in content, "Anchor target not found in api/main.py"

updated = content.replace(target, stock_control_code + "\n\n" + target, 1)

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(updated)

print("Stock Control endpoints inserted into api/main.py successfully.")

