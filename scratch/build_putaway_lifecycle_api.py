with open('api/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace receive_consignment_workflow with updated putaway-aware version
old_workflow_target = """@app.post("/consignments/receive", status_code=status.HTTP_201_CREATED)
async def receive_consignment_workflow(
    workflow: ConsignmentReceiveWorkflow,
    user: dict = Depends(get_current_user_from_header)
):"""

new_workflow_code = """@app.post("/consignments/receive", status_code=status.HTTP_201_CREATED)
async def receive_consignment_workflow(
    workflow: ConsignmentReceiveWorkflow,
    user: dict = Depends(get_current_user_from_header)
):
    \"\"\"
    Automated Inward Analysis, Smart Recommendation & Put-Away Task Workflow:
    1. Consignment intake validation (Supplier, Challan, Arrival, Qty, Warehouse RBAC).
    2. Planned storage allocation: Stock remains STAGED (AWAITING_PUTAWAY) until physical confirmation.
    3. Prevents double-counting: Bin capacity is not occupied until operator confirms physical placement.
    4. Auto-generates persistent STOCK_PUTAWAY task for the active destination godown operator.
    5. Dispatches real-time in-app notification to the assigned operator.
    \"\"\"
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

    # 6. Validate planned storage capacity on bins (pre-check, does not occupy yet)
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

    # 7. Find active operator for destination godown
    assigned_op = None
    for token, u in ACTIVE_SESSIONS.items():
        if u.get("role") == "WAREHOUSE_ADMIN" and u.get("warehouse_id") == wh["id"] and u.get("is_active", True):
            assigned_op = u
            break

    receipt_voucher_id = f"RCV-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    created_batches = []
    created_tasks = []

    # 8. Create Planned Batches and Put-Away Tasks
    for alloc in workflow.batch_allocations:
        batch_record = {
            "batch_id": alloc.batch_id,
            "consignment_id": workflow.consignment_id,
            "commodity": alloc.commodity,
            "total_quantity": alloc.quantity,
            "available_quantity": 0, # Not available for dispatch until confirmed and inspected!
            "planned_quantity": alloc.quantity,
            "storage_status": "AWAITING_PUTAWAY", # Strict: Staged at dock until confirmed
            "quality_status": "Pending Inspection",
            "receipt_date": alloc.receipt_date,
            "supplier": workflow.supplier_name,
            "warehouse_id": workflow.destination_warehouse_id,
            "warehouse_name": wh["name"],
            "zone_code": alloc.zone_code,
            "rack": alloc.rack,
            "planned_bin_code": alloc.bin_code,
            "bin_code": None, # Staged at dock, not physically placed yet
            "challan_number": workflow.challan_number,
            "vehicle_number": workflow.vehicle_number,
            "receipt_voucher": receipt_voucher_id,
            "notes": workflow.remarks or "Gate intake sound receipt - Staged awaiting operator put-away"
        }
        created_batches.append(batch_record)

        # Auto-create Operator Put-Away Task
        task_id = f"TSK-PUTAWAY-{uuid.uuid4().hex[:6].upper()}"
        task_record = {
            "id": task_id,
            "task_no": task_id,
            "consignment_id": workflow.consignment_id,
            "title": f"Stock Put-Away: {alloc.commodity} (Batch {alloc.batch_id})",
            "description": f"Physically move {alloc.quantity} Bags of {alloc.commodity} from Receiving Dock to Bin {alloc.bin_code}. Stack safely and verify bag labels.",
            "task_type": "STOCK_PUTAWAY",
            "task_type_title": "Stock Put-Away & Storage Confirmation",
            "batch_id": alloc.batch_id,
            "commodity": alloc.commodity,
            "warehouse_id": workflow.destination_warehouse_id,
            "warehouse_name": wh["name"],
            "assigned_to_id": assigned_op.get("id") if assigned_op else "UNASSIGNED",
            "assigned_to_name": assigned_op.get("full_name") if assigned_op else "Awaiting Manager Assignment",
            "assigned_to_role": assigned_op.get("role_title") if assigned_op else "Godown Operator",
            "assigned_by_id": user.get("id"),
            "assigned_by_name": user.get("full_name") or user.get("username"),
            "assigned_at": now_str,
            "priority": "HIGH",
            "due_at": (datetime.datetime.now() + datetime.timedelta(hours=4)).strftime("%Y-%m-%d %H:%M"),
            "is_overdue": False,
            "status": "ASSIGNED" if assigned_op else "PENDING_ASSIGNMENT",
            "planned_batch_id": alloc.batch_id,
            "planned_bin_code": alloc.bin_code,
            "planned_quantity": alloc.quantity,
            "recommendation_reason": f"Zone {alloc.zone_code} Intake Buffer (Bin {alloc.bin_code}) recommended for FIFO stack continuity.",
            "checklist": [
                {"id": "c1", "label": "Inspect bag fabric & tamper-evident seals", "required": True},
                {"id": "c2", "label": "Verify batch tag details match delivery challan", "required": True},
                {"id": "c3", "label": "Scan/Verify physical destination bin code", "required": True},
                {"id": "c4", "label": "Confirm sound stack geometry & aeration gap", "required": True}
            ],
            "timeline": [
                {
                    "id": f"tm-{uuid.uuid4().hex[:4]}",
                    "status": "ASSIGNED" if assigned_op else "PENDING_ASSIGNMENT",
                    "timestamp": now_str,
                    "actor_id": user.get("id"),
                    "actor_name": user.get("full_name") or user.get("username"),
                    "actor_role": user.get("role"),
                    "comment": f"Consignment {workflow.consignment_id} received. Automated put-away task created."
                }
            ]
        }
        IN_MEMORY_TASKS.insert(0, task_record)
        created_tasks.append(task_record)

        # Notify Operator
        if assigned_op:
            IN_MEMORY_NOTIFICATIONS.insert(0, {
                "id": f"notif-putaway-{uuid.uuid4().hex[:6]}",
                "recipient_id": assigned_op.get("id"),
                "recipient_role": "WAREHOUSE_ADMIN",
                "type": "TASK_ASSIGNED",
                "title": f"New Put-Away Task: {alloc.commodity} ({alloc.quantity} Bags)",
                "message": f"Please physically store Batch {alloc.batch_id} into Bin {alloc.bin_code}. Consignment: {workflow.consignment_id}.",
                "ref_id": task_id,
                "timestamp": now_str,
                "is_read": False
            })
        else:
            # Notify Manager of unassigned task
            IN_MEMORY_NOTIFICATIONS.insert(0, {
                "id": f"notif-unassigned-{uuid.uuid4().hex[:6]}",
                "recipient_id": "u0000004-0000-0000-0000-000000000004",
                "recipient_role": "MANAGER",
                "type": "TASK_UNASSIGNED",
                "title": f"Put-Away Task Requires Assignment",
                "message": f"Consignment {workflow.consignment_id} received at {wh['name']}, but no active operator was found. Please assign an operator.",
                "ref_id": task_id,
                "timestamp": now_str,
                "is_read": False
            })

    # 9. Consignment record with Staged Status
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
        "tasks": [t["id"] for t in created_tasks],
        "batch_count": len(created_batches),
        "status": "STAGED_AWAITING_PUTAWAY"
    }
    IN_MEMORY_CONSIGNMENTS.insert(0, consignment_record)

    # 10. Audit Log
    IN_MEMORY_AUDIT_LOGS.insert(0, {
        "id": f"AUD-INW-{uuid.uuid4().hex[:8]}",
        "action": "STOCK_CONSIGNMENT_RECEIVED",
        "actor_id": user.get("id"),
        "actor_name": user.get("full_name") or user.get("username"),
        "actor_role": user.get("role"),
        "warehouse_id": workflow.destination_warehouse_id,
        "warehouse_name": wh["name"],
        "target_ref": workflow.consignment_id,
        "details": f"Consignment {workflow.consignment_id}: Received {workflow.total_quantity} Bags {workflow.commodity}. Staged awaiting put-away across {len(created_tasks)} tasks.",
        "timestamp": now_str,
        "status": "SUCCESS"
    })

    return {
        "success": True,
        "message": f"Consignment {workflow.consignment_id} successfully recorded. Put-away tasks dispatched to godown staff.",
        "consignment_id": workflow.consignment_id,
        "receipt_voucher_id": receipt_voucher_id,
        "destination_warehouse": wh["name"],
        "total_quantity": workflow.total_quantity,
        "status": "STAGED_AWAITING_PUTAWAY",
        "tasks": [{"task_id": t["id"], "batch_id": t["planned_batch_id"], "bin_code": t["planned_bin_code"], "assigned_to": t["assigned_to_name"]} for t in created_tasks],
        "batches": created_batches
    }
"""

# Replace the existing receive_consignment_workflow
start_pos = content.find(old_workflow_target)
end_target = "    return {\n        \"success\": True,\n        \"message\": f\"Consignment {workflow.consignment_id} successfully received and allocated across {len(created_batches)} batches/bins.\","
end_pos = content.find(end_target)
if end_pos != -1:
    end_bracket = content.find("\n    }\n", end_pos)
    if end_bracket != -1:
        end_pos = end_bracket + len("\n    }\n")
        content = content[:start_pos] + new_workflow_code + content[end_pos:]
        print("Successfully replaced receive_consignment_workflow")
    else:
        print("Could not find end bracket for receive_consignment_workflow")
else:
    print("Could not find end_target for receive_consignment_workflow")

# 3. Add PUTAWAY CONFIRMATION & REASSIGNMENT ENDPOINTS
putaway_confirmation_endpoints = '''
@app.post("/tasks/putaway/{task_id}/confirm")
async def confirm_physical_putaway(
    task_id: str,
    req: PutawayPhysicalConfirmRequest,
    user: dict = Depends(get_current_user_from_header)
):
    """
    Operator Physical Put-Away Confirmation & Exception Handling:
    1. Validates operator identity / authorization for target godown.
    2. Validates physical count: actual quantity placed, shortage, excess, or transit damage.
    3. Transaction-safe inventory update: Only occupies destination bin upon confirmed placement.
    4. Segregates damaged stock discovered during placement into ON_HOLD damaged register.
    5. Updates task status: COMPLETED (full) or PARTIALLY_COMPLETED (partial).
    6. Records stock movement ledger entry and dispatches manager notification.
    """
    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    if task.get("task_type") != "STOCK_PUTAWAY":
        raise HTTPException(status_code=400, detail=f"Task '{task_id}' is of type '{task.get('task_type')}', not STOCK_PUTAWAY.")

    if task.get("status") == "COMPLETED":
        raise HTTPException(status_code=400, detail="This put-away task has already been fully confirmed and completed.")

    enforce_warehouse_scope(user, task.get("warehouse_id"))

    # Validate quantities
    if req.actual_quantity <= 0:
        raise HTTPException(status_code=400, detail="Actual placed quantity must be greater than 0.")
    if req.damaged_bags_count < 0:
        raise HTTPException(status_code=400, detail="Damaged bags count cannot be negative.")
    if req.damaged_bags_count > req.actual_quantity:
        raise HTTPException(status_code=400, detail="Damaged bags cannot exceed total actual placed quantity.")

    planned_qty = task.get("planned_quantity", req.actual_quantity)
    sound_placed_qty = req.actual_quantity - req.damaged_bags_count
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    # Find destination warehouse and bin
    wh = next((w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == task.get("warehouse_id")), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Destination warehouse not found.")

    b_target = next((b for b in wh.get("bins", []) if b["bin_code"] == req.actual_bin_code), None)
    if not b_target:
        raise HTTPException(status_code=404, detail=f"Target storage bin '{req.actual_bin_code}' not found in {wh['name']}.")

    if not b_target.get("is_active", True):
        raise HTTPException(status_code=400, detail=f"Storage bin '{req.actual_bin_code}' is currently INACTIVE.")

    # Check bin capacity for sound placed bags
    avail = max(0, b_target["capacity"] - b_target.get("occupied", 0))
    if sound_placed_qty > avail:
        raise HTTPException(
            status_code=400,
            detail=f"Storage overflow at Bin {req.actual_bin_code}: Capacity is {b_target['capacity']} Bags, holding {b_target.get('occupied', 0)} Bags. Cannot place {sound_placed_qty} sound bags (exceeds by {sound_placed_qty - avail} Bags)."
        )

    # Apply physical occupancy to bin
    b_target["occupied"] = b_target.get("occupied", 0) + sound_placed_qty
    b_target["commodity"] = task.get("commodity")
    if task.get("batch_id") not in b_target.setdefault("batches", []):
        b_target["batches"].append(task.get("batch_id"))

    # Update batch in consignment
    consignment_found = None
    for c in IN_MEMORY_CONSIGNMENTS:
        for b in c.get("batches", []):
            if b.get("batch_id") == task.get("batch_id"):
                consignment_found = c
                b["storage_status"] = "STORED"
                b["bin_code"] = req.actual_bin_code
                b["total_quantity"] = req.actual_quantity
                b["available_quantity"] = sound_placed_qty
                b["damaged_quantity"] = req.damaged_bags_count
                b["putaway_confirmed_at"] = now_str
                b["putaway_confirmed_by"] = user.get("full_name") or user.get("username")
                break
        if consignment_found:
            break

    # If damaged stock discovered, register in damaged stock list
    if req.damaged_bags_count > 0:
        damaged_entry = {
            "id": f"DAM-{uuid.uuid4().hex[:6].upper()}",
            "batch_id": task.get("batch_id"),
            "commodity": task.get("commodity"),
            "damaged_quantity": req.damaged_bags_count,
            "status": "ON_HOLD",
            "category": "TRANSIT_DAMAGE",
            "reported_by": user.get("full_name") or user.get("username"),
            "reported_at": now_str,
            "reason": req.discrepancy_reason or "Torn / damaged bags discovered during physical intake offloading",
            "warehouse_id": task.get("warehouse_id"),
            "warehouse_name": wh["name"],
            "bin_code": req.actual_bin_code
        }
        IN_MEMORY_DAMAGED_STOCK.insert(0, damaged_entry)

        # Notify Quality Officer and Manager
        IN_MEMORY_NOTIFICATIONS.insert(0, {
            "id": f"notif-dmg-{uuid.uuid4().hex[:6]}",
            "recipient_id": "u0000004-0000-0000-0000-000000000004",
            "recipient_role": "MANAGER",
            "type": "QUALITY_HOLD",
            "title": f"Damaged Stock Segregated ({req.damaged_bags_count} Bags)",
            "message": f"Operator discovered {req.damaged_bags_count} damaged bags during put-away of Batch {task.get('batch_id')} in {req.actual_bin_code}. Segregated on hold.",
            "ref_id": task.get("batch_id"),
            "timestamp": now_str,
            "is_read": False
        })

    # Update Task Status
    is_partial = req.actual_quantity < planned_qty
    is_discrepancy = is_partial or (req.actual_quantity > planned_qty) or (req.actual_bin_code != task.get("planned_bin_code")) or (req.damaged_bags_count > 0)

    task["status"] = "PARTIALLY_COMPLETED" if is_partial else "COMPLETED"
    task["actual_quantity"] = req.actual_quantity
    task["actual_bin_code"] = req.actual_bin_code
    task["damaged_bags_count"] = req.damaged_bags_count
    task["sound_placed_quantity"] = sound_placed_qty
    task["unplaced_quantity"] = max(0, planned_qty - req.actual_quantity)
    task["discrepancy_reason"] = req.discrepancy_reason
    task["confirmation_notes"] = req.notes
    task["completed_at"] = now_str
    task["completed_by"] = user.get("full_name") or user.get("username")

    task.setdefault("timeline", []).append({
        "id": f"tm-{uuid.uuid4().hex[:4]}",
        "status": task["status"],
        "timestamp": now_str,
        "actor_id": user.get("id"),
        "actor_name": user.get("full_name") or user.get("username"),
        "actor_role": user.get("role"),
        "comment": f"Physical placement confirmed: Stored {sound_placed_qty} sound bags in {req.actual_bin_code}." + (f" ({req.damaged_bags_count} damaged bags segregated)" if req.damaged_bags_count > 0 else "")
    })

    # Record Stock Movement
    sm_id = f"SM-{uuid.uuid4().hex[:6].upper()}"
    IN_MEMORY_AUDIT_LOGS.insert(0, {
        "id": f"AUD-PUTAWAY-{uuid.uuid4().hex[:8]}",
        "action": "STOCK_PUTAWAY_CONFIRMED",
        "actor_id": user.get("id"),
        "actor_name": user.get("full_name") or user.get("username"),
        "actor_role": user.get("role"),
        "warehouse_id": task.get("warehouse_id"),
        "warehouse_name": wh["name"],
        "target_ref": task.get("batch_id"),
        "details": f"Put-Away Confirmed: {sound_placed_qty} Bags {task.get('commodity')} stored in Bin {req.actual_bin_code}. Damaged: {req.damaged_bags_count} Bags. Status: {task['status']}.",
        "timestamp": now_str,
        "status": "SUCCESS"
    })

    # Dispatch Manager Notification
    notif_msg = f"Put-away {task['status']}: Operator {user.get('full_name')} physically stored {sound_placed_qty} Bags of {task.get('commodity')} (Batch {task.get('batch_id')}) into Bin {req.actual_bin_code}."
    if is_discrepancy:
        notif_msg += f" (Discrepancy: {req.discrepancy_reason or 'Quantity/Location difference'})"

    IN_MEMORY_NOTIFICATIONS.insert(0, {
        "id": f"notif-mgr-putaway-{uuid.uuid4().hex[:6]}",
        "recipient_id": "u0000004-0000-0000-0000-000000000004",
        "recipient_role": "MANAGER",
        "type": "PUTAWAY_DISCREPANCY" if is_discrepancy else "TASK_COMPLETED",
        "title": "Put-Away Discrepancy Alert" if is_discrepancy else "Stock Put-Away Completed",
        "message": notif_msg,
        "ref_id": task_id,
        "timestamp": now_str,
        "is_read": False
    })

    return {
        "success": True,
        "message": f"Stock put-away successfully confirmed and stored in Bin {req.actual_bin_code}.",
        "task_id": task_id,
        "task_status": task["status"],
        "batch_id": task.get("batch_id"),
        "destination_bin": req.actual_bin_code,
        "sound_placed_quantity": sound_placed_qty,
        "damaged_quantity": req.damaged_bags_count,
        "unplaced_quantity": task["unplaced_quantity"],
        "is_discrepancy": is_discrepancy,
        "quality_status": "Pending Inspection"
    }

@app.post("/tasks/{task_id}/reassign")
async def reassign_warehouse_task(
    task_id: str,
    new_operator_id: str = Body(..., embed=True),
    reassignment_reason: Optional[str] = Body(None, embed=True),
    user: dict = Depends(require_manager_permission)
):
    """Reassign any task to a different operator with audit logging."""
    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    target_op = None
    for token, u in ACTIVE_SESSIONS.items():
        if u.get("id") == new_operator_id or u.get("username") == new_operator_id:
            target_op = u
            break

    if not target_op:
        raise HTTPException(status_code=404, detail="Target operator not found in active staff.")

    old_operator_name = task.get("assigned_to_name", "Unassigned")
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    task["assigned_to_id"] = target_op.get("id")
    task["assigned_to_name"] = target_op.get("full_name")
    task["assigned_to_role"] = target_op.get("role_title")
    if task["status"] == "PENDING_ASSIGNMENT":
        task["status"] = "ASSIGNED"

    task.setdefault("timeline", []).append({
        "id": f"tm-{uuid.uuid4().hex[:4]}",
        "status": task["status"],
        "timestamp": now_str,
        "actor_id": user.get("id"),
        "actor_name": user.get("full_name") or user.get("username"),
        "actor_role": user.get("role"),
        "comment": f"Reassigned from {old_operator_name} to {target_op.get('full_name')}. Reason: {reassignment_reason or 'Manager reallocation'}."
    })

    # Notify new operator
    IN_MEMORY_NOTIFICATIONS.insert(0, {
        "id": f"notif-reassign-{uuid.uuid4().hex[:6]}",
        "recipient_id": target_op.get("id"),
        "recipient_role": "WAREHOUSE_ADMIN",
        "type": "TASK_ASSIGNED",
        "title": f"Reassigned Task: {task.get('title')}",
        "message": f"Task #{task_id} has been assigned to you by Manager {user.get('full_name')}.",
        "ref_id": task_id,
        "timestamp": now_str,
        "is_read": False
    })

    return {
        "success": True,
        "message": f"Task successfully reassigned to {target_op.get('full_name')}.",
        "task_id": task_id,
        "assigned_to": target_op.get("full_name"),
        "status": task["status"]
    }
'''

content += "\n" + putaway_confirmation_endpoints + "\n"

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved api/main.py stage 2 with putaway lifecycle endpoints")

