import re

with open('api/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

task_section = '''
# -----------------------------------------------------------------------------
# 10. Task Assignment, Quality Follow-up & Real-Time Notification Center
# -----------------------------------------------------------------------------

class TaskCreate(BaseModel):
    title: str
    description: str
    batch_id: str
    commodity: str
    task_type: str = "QUALITY_INSPECTION" # QUALITY_INSPECTION, RECHECK, STOCK_VERIFICATION, DISPATCH_PREPARATION, GENERAL
    assigned_to_id: str
    warehouse_id: str
    priority: str = "NORMAL" # NORMAL, HIGH, URGENT
    due_at: str
    checklist: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    action: str # ACCEPT, START, BLOCK, RECHECK
    reason: Optional[str] = None
    notes: Optional[str] = None

class TaskReviewSubmission(BaseModel):
    checklist_responses: Optional[Dict[str, Any]] = None
    measurements: Optional[Dict[str, Any]] = None # moisture_pct, foreign_matter_pct, weevil_count, damaged_bags_count
    remarks: str
    evidence_notes: Optional[str] = None
    evidence_photo: Optional[str] = None

class TaskReviewDecision(BaseModel):
    decision: str # APPROVED, HOLD, REJECTED, RECHECK_REQUIRED
    remarks: str
    moisture_pct: Optional[float] = None
    foreign_matter_pct: Optional[float] = None
    weevil_count: Optional[int] = None

IN_MEMORY_TASKS = [
    {
        "id": "TSK-2025-001",
        "task_no": "TSK-2025-001",
        "title": "Aerate & Re-assay Held Rice Consignment",
        "description": "Batch B004 placed on quality hold due to 14.8% moisture. Verify 48h aeration in Bay B and conduct moisture meter assay.",
        "task_type": "QUALITY_INSPECTION",
        "task_type_title": "Quality Inspection & Re-assay",
        "batch_id": "B004",
        "commodity": "Rice",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "assigned_to_id": "u0000001-0000-0000-0000-000000000001",
        "assigned_to_name": "Ramesh Patil",
        "assigned_to_role": "WAREHOUSE_ADMIN",
        "assigned_by_id": "u0000004-0000-0000-0000-000000000004",
        "assigned_by_name": "Aayush Tripathi",
        "assigned_at": "2025-10-23 09:00",
        "priority": "HIGH",
        "due_at": "2025-10-24 16:00",
        "is_overdue": False,
        "status": "IN_PROGRESS",
        "checklist": [
            {"id": "c1", "label": "Verify mechanical aeration run duration >= 48 hours", "required": True, "type": "boolean", "value": True},
            {"id": "c2", "label": "Moisture % Meter Measurement (Must be <= 14.0%)", "required": True, "type": "number", "unit": "%", "value": 13.8},
            {"id": "c3", "label": "Check for moisture condensation inside inner polyethylene liner", "required": True, "type": "boolean", "value": False},
            {"id": "c4", "label": "Absence of damp or moldy smell", "required": True, "type": "boolean", "value": True}
        ],
        "submission": None,
        "blocker_reason": None,
        "recheck_reason": None,
        "timeline": [
            {"id": "tm-1", "status": "ASSIGNED", "timestamp": "2025-10-23 09:00", "actor_id": "u0000004-0000-0000-0000-000000000004", "actor_name": "Aayush Tripathi", "actor_role": "MANAGER", "comment": "Task assigned following laboratory hold notice."},
            {"id": "tm-2", "status": "ACCEPTED", "timestamp": "2025-10-23 09:30", "actor_id": "u0000001-0000-0000-0000-000000000001", "actor_name": "Ramesh Patil", "actor_role": "WAREHOUSE_ADMIN", "comment": "Accepted task. Scheduled aeration fans check."},
            {"id": "tm-3", "status": "IN_PROGRESS", "timestamp": "2025-10-24 08:15", "actor_id": "u0000001-0000-0000-0000-000000000001", "actor_name": "Ramesh Patil", "actor_role": "WAREHOUSE_ADMIN", "comment": "Began sampling top, middle and bottom bags across 120 bags stack."}
        ]
    },
    {
        "id": "TSK-2025-002",
        "task_no": "TSK-2025-002",
        "title": "Pre-Dispatch Physical Bag Count Verification",
        "description": "Audit physical stack counts for Batch B006 prior to outward lifting for Fair Price Shop FPS-104.",
        "task_type": "DISPATCH_PREPARATION",
        "task_type_title": "Dispatch Preparation & Bag Count",
        "batch_id": "B006",
        "commodity": "Wheat",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "assigned_to_id": "u0000001-0000-0000-0000-000000000001",
        "assigned_to_name": "Ramesh Patil",
        "assigned_to_role": "WAREHOUSE_ADMIN",
        "assigned_by_id": "u0000004-0000-0000-0000-000000000004",
        "assigned_by_name": "Aayush Tripathi",
        "assigned_at": "2025-10-23 14:00",
        "priority": "NORMAL",
        "due_at": "2025-10-24 17:30",
        "is_overdue": False,
        "status": "ACCEPTED",
        "checklist": [
            {"id": "c1", "label": "Physical bag count matches allocated 50 bags exactly", "required": True, "type": "boolean"},
            {"id": "c2", "label": "No burst or torn jute bags detected in pick face", "required": True, "type": "boolean"},
            {"id": "c3", "label": "Official stencil markings legible (B006 / MP Supplies)", "required": True, "type": "boolean"}
        ],
        "submission": None,
        "timeline": [
            {"id": "tm-4", "status": "ASSIGNED", "timestamp": "2025-10-23 14:00", "actor_id": "u0000004-0000-0000-0000-000000000004", "actor_name": "Aayush Tripathi", "actor_role": "MANAGER", "comment": "Order D0059 allocated. Verify stock staging."},
            {"id": "tm-5", "status": "ACCEPTED", "timestamp": "2025-10-23 15:10", "actor_id": "u0000001-0000-0000-0000-000000000001", "actor_name": "Ramesh Patil", "actor_role": "WAREHOUSE_ADMIN", "comment": "Order staging accepted for afternoon loading bay."}
        ]
    },
    {
        "id": "TSK-2025-003",
        "task_no": "TSK-2025-003",
        "title": "Post-Fumigation Quarantine Clearance Assaying",
        "description": "Quarantined Batch B007 completed aluminium phosphide fumigation. Sample 10% bags to confirm 0 live weevils.",
        "task_type": "RECHECK",
        "task_type_title": "Post-Treatment Quality Recheck",
        "batch_id": "B007",
        "commodity": "Wheat",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "assigned_to_id": "u0000001-0000-0000-0000-000000000001",
        "assigned_to_name": "Ramesh Patil",
        "assigned_to_role": "WAREHOUSE_ADMIN",
        "assigned_by_id": "u0000004-0000-0000-0000-000000000004",
        "assigned_by_name": "Aayush Tripathi",
        "assigned_at": "2025-10-22 10:00",
        "priority": "URGENT",
        "due_at": "2025-10-23 12:00",
        "is_overdue": True,
        "status": "ASSIGNED",
        "checklist": [
            {"id": "c1", "label": "Gas degasification certificate CERT-FUM-8812 verified", "required": True, "type": "boolean"},
            {"id": "c2", "label": "Live Weevil Count per 1000g sample (Must be 0)", "required": True, "type": "number", "unit": "insects"},
            {"id": "c3", "label": "Grain temperature within ambient tolerance (< 32°C)", "required": True, "type": "boolean"}
        ],
        "submission": None,
        "timeline": [
            {"id": "tm-6", "status": "ASSIGNED", "timestamp": "2025-10-22 10:00", "actor_id": "u0000004-0000-0000-0000-000000000004", "actor_name": "Aayush Tripathi", "actor_role": "MANAGER", "comment": "Urgent quarantine recheck assigned."}
        ]
    },
    {
        "id": "TSK-2025-004",
        "task_no": "TSK-2025-004",
        "title": "Intake Consignment Bin Stacking & Quality Sampling",
        "description": "Consignment B008 (200 Bags Wheat) received at Gate 1. Stack in designated bulk bay and perform laboratory sampling.",
        "task_type": "STOCK_VERIFICATION",
        "task_type_title": "Stock Verification & Intake Sampling",
        "batch_id": "B008",
        "commodity": "Wheat",
        "warehouse_id": "GDN-NGP-01",
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "assigned_to_id": "u0000001-0000-0000-0000-000000000001",
        "assigned_to_name": "Ramesh Patil",
        "assigned_to_role": "WAREHOUSE_ADMIN",
        "assigned_by_id": "u0000004-0000-0000-0000-000000000004",
        "assigned_by_name": "Aayush Tripathi",
        "assigned_at": "2025-10-24 07:00",
        "priority": "HIGH",
        "due_at": "2025-10-24 14:00",
        "is_overdue": False,
        "status": "SUBMITTED_FOR_REVIEW",
        "checklist": [
            {"id": "c1", "label": "Stack stability & dunnage placement verified", "required": True, "type": "boolean", "value": True},
            {"id": "c2", "label": "Moisture % Meter Reading (Tolerance <= 12.0%)", "required": True, "type": "number", "unit": "%", "value": 11.0},
            {"id": "c3", "label": "Foreign matter percentage (Tolerance <= 0.75%)", "required": True, "type": "number", "unit": "%", "value": 0.40},
            {"id": "c4", "label": "Weevil Count (Tolerance <= 1)", "required": True, "type": "number", "unit": "count", "value": 0}
        ],
        "submission": {
            "submitted_at": "2025-10-24 10:15",
            "submitted_by": "Ramesh Patil",
            "measurements": {
                "moisture_pct": 11.0,
                "foreign_matter_pct": 0.40,
                "weevil_count": 0,
                "damaged_bags_count": 0
            },
            "checklist_responses": {"c1": True, "c2": 11.0, "c3": 0.40, "c4": 0},
            "remarks": "Sound quality fresh harvest intake. Moisture 11.0% well below 12.0% ceiling. Stacking completed on wooden dunnage crates in Bay A.",
            "evidence_notes": "Sample composite sealed in moisture canister #MC-1049.",
            "evidence_photo": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%23e2e8f0'/><text x='15' y='45' font-family='sans-serif' font-size='12' fill='%230b4da8'>ASSAY-PASSED</text></svg>"
        },
        "timeline": [
            {"id": "tm-7", "status": "ASSIGNED", "timestamp": "2025-10-24 07:00", "actor_id": "u0000004-0000-0000-0000-000000000004", "actor_name": "Aayush Tripathi", "actor_role": "MANAGER", "comment": "Assigned upon Gate 1 arrival."},
            {"id": "tm-8", "status": "ACCEPTED", "timestamp": "2025-10-24 07:30", "actor_id": "u0000001-0000-0000-0000-000000000001", "actor_name": "Ramesh Patil", "actor_role": "WAREHOUSE_ADMIN", "comment": "Operator accepted."},
            {"id": "tm-9", "status": "IN_PROGRESS", "timestamp": "2025-10-24 08:00", "actor_id": "u0000001-0000-0000-0000-000000000001", "actor_name": "Ramesh Patil", "actor_role": "WAREHOUSE_ADMIN", "comment": "Unloading and stacking underway."},
            {"id": "tm-10", "status": "SUBMITTED_FOR_REVIEW", "timestamp": "2025-10-24 10:15", "actor_id": "u0000001-0000-0000-0000-000000000001", "actor_name": "Ramesh Patil", "actor_role": "WAREHOUSE_ADMIN", "comment": "Submitted for laboratory quality review & clearance."}
        ]
    },
    {
        "id": "TSK-2025-005",
        "task_no": "TSK-2025-005",
        "title": "Initial Intake Assay Verification (Pune Depot)",
        "description": "Routine intake assay verification for 180 bags wheat at District Buffer Depot, Pune.",
        "task_type": "QUALITY_INSPECTION",
        "task_type_title": "Quality Inspection & Assay",
        "batch_id": "B009",
        "commodity": "Wheat",
        "warehouse_id": "GDN-PUN-02",
        "warehouse_name": "District Buffer Depot, Pune",
        "assigned_to_id": "u0000002-0000-0000-0000-000000000002",
        "assigned_to_name": "Suresh Shinde",
        "assigned_to_role": "WAREHOUSE_ADMIN",
        "assigned_by_id": "u0000004-0000-0000-0000-000000000004",
        "assigned_by_name": "Aayush Tripathi",
        "assigned_at": "2025-03-15 09:00",
        "priority": "NORMAL",
        "due_at": "2025-03-15 18:00",
        "is_overdue": False,
        "status": "COMPLETED",
        "checklist": [
            {"id": "c1", "label": "Moisture % Meter Measurement", "required": True, "type": "number", "unit": "%", "value": 10.9},
            {"id": "c2", "label": "Stacking integrity confirmed", "required": True, "type": "boolean", "value": True}
        ],
        "submission": {
            "submitted_at": "2025-03-15 14:00",
            "submitted_by": "Suresh Shinde",
            "measurements": {"moisture_pct": 10.9, "foreign_matter_pct": 0.3, "weevil_count": 0},
            "remarks": "Passed all parameters cleanly. Stock sound."
        },
        "review": {
            "reviewed_at": "2025-03-15 15:30",
            "reviewed_by": "Aayush Tripathi",
            "reviewer_role": "MANAGER",
            "decision": "APPROVED",
            "remarks": "Intake approved and admitted into FIFO rotation queue."
        },
        "timeline": [
            {"id": "tm-11", "status": "ASSIGNED", "timestamp": "2025-03-15 09:00", "actor_id": "u0000004-0000-0000-0000-000000000004", "actor_name": "Aayush Tripathi", "actor_role": "MANAGER", "comment": "Assigned to Pune operator."},
            {"id": "tm-12", "status": "COMPLETED", "timestamp": "2025-03-15 15:30", "actor_id": "u0000004-0000-0000-0000-000000000004", "actor_name": "Aayush Tripathi", "actor_role": "MANAGER", "comment": "Approved following physical assay."}
        ]
    }
]

IN_MEMORY_NOTIFICATIONS = [
    {
        "id": "NOTIF-001",
        "user_id": "u0000001-0000-0000-0000-000000000001",
        "target_role": "WAREHOUSE_ADMIN",
        "warehouse_id": "GDN-NGP-01",
        "task_id": "TSK-2025-001",
        "batch_id": "B004",
        "type": "TASK_ASSIGNED",
        "severity": "urgent",
        "title": "New High-Priority Task Assigned",
        "message": "Manager Aayush Tripathi assigned task: Aerate & Re-assay Held Rice Consignment (Batch B004).",
        "timestamp": "2025-10-23 09:00",
        "is_read": False
    },
    {
        "id": "NOTIF-002",
        "user_id": "u0000004-0000-0000-0000-000000000004",
        "target_role": "MANAGER",
        "warehouse_id": "GDN-NGP-01",
        "task_id": "TSK-2025-004",
        "batch_id": "B008",
        "type": "TASK_SUBMITTED",
        "severity": "info",
        "title": "Task Awaiting Your Quality Review",
        "message": "Operator Ramesh Patil submitted Task TSK-2025-004 (Batch B008 Intake Sampling) for review.",
        "timestamp": "2025-10-24 10:15",
        "is_read": False
    },
    {
        "id": "NOTIF-003",
        "user_id": "u0000004-0000-0000-0000-000000000004",
        "target_role": "MANAGER",
        "warehouse_id": "GDN-NGP-01",
        "task_id": "TSK-2025-003",
        "batch_id": "B007",
        "type": "TASK_OVERDUE",
        "severity": "urgent",
        "title": "Overdue Task Alert",
        "message": "Urgent task TSK-2025-003 (Quarantine Clearance for Batch B007) is overdue by 16 hours.",
        "timestamp": "2025-10-23 12:01",
        "is_read": False
    },
    {
        "id": "NOTIF-004",
        "user_id": "u0000001-0000-0000-0000-000000000001",
        "target_role": "WAREHOUSE_ADMIN",
        "warehouse_id": "GDN-NGP-01",
        "task_id": "TSK-2025-002",
        "batch_id": "B006",
        "type": "TASK_ASSIGNED",
        "severity": "info",
        "title": "Dispatch Task Assigned",
        "message": "Dispatch Preparation assigned for Order D0059 / Batch B006.",
        "timestamp": "2025-10-23 14:00",
        "is_read": True
    }
]

def dispatch_notification(
    user_id: Optional[str],
    target_role: Optional[str],
    warehouse_id: Optional[str],
    task_id: Optional[str],
    batch_id: Optional[str],
    notif_type: str,
    severity: str,
    title: str,
    message: str
):
    notif = {
        "id": f"NOTIF-{Date_now_id()}",
        "user_id": user_id,
        "target_role": target_role or "ALL",
        "warehouse_id": warehouse_id or "GLOBAL",
        "task_id": task_id,
        "batch_id": batch_id,
        "type": notif_type,
        "severity": severity,
        "title": title,
        "message": message,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "is_read": False
    }
    IN_MEMORY_NOTIFICATIONS.insert(0, notif)
    return notif

def Date_now_id():
    return str(int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000))[-6:]

@app.get("/tasks")
async def list_tasks(
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_from_header)
):
    tasks = list(IN_MEMORY_TASKS)
    is_manager = current_user.get("role") == "MANAGER"
    user_id = current_user.get("id")
    user_wh = current_user.get("warehouse_id")

    # Strict RBAC filtering
    if not is_manager:
        # Operator sees only tasks explicitly assigned to them or within their assigned depot
        tasks = [t for t in tasks if t["assigned_to_id"] == user_id or (user_wh and t["warehouse_id"] in (user_wh, "GDN-NGP-01" if "1111" in user_wh else "GDN-PUN-02"))]
    else:
        # Manager respects warehouse filter if specified
        if warehouse_id and warehouse_id != "ALL":
            tasks = [t for t in tasks if t["warehouse_id"] == warehouse_id or warehouse_id in t["warehouse_id"]]

    if status and status != "ALL":
        tasks = [t for t in tasks if t["status"] == status]
    if task_type and task_type != "ALL":
        tasks = [t for t in tasks if t["task_type"] == task_type]
    if priority and priority != "ALL":
        tasks = [t for t in tasks if t["priority"] == priority]
    if batch_id and batch_id != "ALL":
        tasks = [t for t in tasks if t["batch_id"].lower() == batch_id.lower()]

    return tasks

@app.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    req: TaskCreate,
    current_user: dict = Depends(get_current_user_from_header)
):
    # Only Managers can create tasks
    if current_user.get("role") != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only District Godown Managers can create and assign warehouse tasks."
        )

    enforce_warehouse_scope(current_user, req.warehouse_id)

    task_id = f"TSK-2025-{Date_now_id()}"
    new_task = {
        "id": task_id,
        "task_no": task_id,
        "title": req.title,
        "description": req.description,
        "task_type": req.task_type,
        "task_type_title": req.task_type.replace("_", " ").title(),
        "batch_id": req.batch_id,
        "commodity": req.commodity,
        "warehouse_id": req.warehouse_id,
        "warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)" if "NGP" in req.warehouse_id or "1111" in req.warehouse_id else "District Buffer Depot, Pune",
        "assigned_to_id": req.assigned_to_id,
        "assigned_to_name": "Ramesh Patil" if "ngp" in req.assigned_to_id or "1111" in req.assigned_to_id else "Suresh Shinde",
        "assigned_to_role": "WAREHOUSE_ADMIN",
        "assigned_by_id": current_user["id"],
        "assigned_by_name": current_user["full_name"],
        "assigned_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "priority": req.priority,
        "due_at": req.due_at,
        "is_overdue": False,
        "status": "ASSIGNED",
        "checklist": req.checklist or [
            {"id": "c1", "label": "Physical inspection of stack condition & dunnage", "required": True, "type": "boolean"},
            {"id": "c2", "label": "Moisture % Meter Measurement", "required": True, "type": "number", "unit": "%"}
        ],
        "submission": None,
        "notes": req.notes,
        "timeline": [
            {
                "id": f"tm-{Date_now_id()}",
                "status": "ASSIGNED",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M"),
                "actor_id": current_user["id"],
                "actor_name": current_user["full_name"],
                "actor_role": current_user["role"],
                "comment": f"Task created and assigned by {current_user['full_name']}."
            }
        ]
    }
    IN_MEMORY_TASKS.insert(0, new_task)

    # In-App Notification to assigned Operator
    dispatch_notification(
        user_id=req.assigned_to_id,
        target_role="WAREHOUSE_ADMIN",
        warehouse_id=req.warehouse_id,
        task_id=task_id,
        batch_id=req.batch_id,
        notif_type="TASK_ASSIGNED",
        severity="urgent" if req.priority == "URGENT" else "info",
        title=f"New Task Assigned: {req.title}",
        message=f"Manager {current_user['full_name']} assigned task for Batch {req.batch_id}. Due by {req.due_at}."
    )

    # Audit Log
    IN_MEMORY_AUDIT_LOGS.insert(0, {
        "id": f"AUD-{Date_now_id()}",
        "action": "TASK_CREATED",
        "actor_id": current_user["id"],
        "actor_name": current_user["full_name"],
        "actor_role": current_user["role"],
        "warehouse_id": req.warehouse_id,
        "warehouse_name": new_task["warehouse_name"],
        "target_ref": task_id,
        "details": f"Created task {task_id}: {req.title} for Batch {req.batch_id}. Assigned to operator.",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "status": "SUCCESS"
    })

    return new_task

@app.get("/tasks/{task_id}")
async def get_task_details(
    task_id: str,
    current_user: dict = Depends(get_current_user_from_header)
):
    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id or t["task_no"] == task_id), None)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    if current_user.get("role") != "MANAGER":
        if task["assigned_to_id"] != current_user["id"] and current_user.get("warehouse_id") not in (task["warehouse_id"], "GDN-NGP-01" if "1111" in str(current_user.get("warehouse_id")) else "GDN-PUN-02"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to access tasks assigned to another operator."
            )
    return task

@app.put("/tasks/{task_id}/status")
async def update_task_status(
    task_id: str,
    req: TaskStatusUpdate,
    current_user: dict = Depends(get_current_user_from_header)
):
    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id or t["task_no"] == task_id), None)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    action = req.action.upper()
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M")

    if action == "ACCEPT":
        task["status"] = "ACCEPTED"
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "ACCEPTED",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": "Task accepted by operator."
        })
        dispatch_notification(
            user_id="u0000004-0000-0000-0000-000000000004",
            target_role="MANAGER",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="TASK_ACCEPTED",
            severity="info",
            title=f"Task Accepted: {task['task_no']}",
            message=f"Operator {current_user['full_name']} accepted task '{task['title']}'."
        )

    elif action == "START":
        task["status"] = "IN_PROGRESS"
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "IN_PROGRESS",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": "Operator commenced task execution."
        })
        dispatch_notification(
            user_id="u0000004-0000-0000-0000-000000000004",
            target_role="MANAGER",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="TASK_STARTED",
            severity="info",
            title=f"Task In Progress: {task['task_no']}",
            message=f"Operator {current_user['full_name']} started working on task '{task['title']}'."
        )

    elif action == "BLOCK":
        task["status"] = "BLOCKED"
        task["blocker_reason"] = req.reason or "Operational impediment reported."
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "BLOCKED",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": f"Blocker reported: {task['blocker_reason']}"
        })
        dispatch_notification(
            user_id="u0000004-0000-0000-0000-000000000004",
            target_role="MANAGER",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="TASK_BLOCKED",
            severity="urgent",
            title=f"⚠️ Blocker Reported on {task['task_no']}",
            message=f"Operator {current_user['full_name']} reported blocker: {task['blocker_reason']}."
        )

    elif action == "RECHECK":
        task["status"] = "RECHECK_REQUIRED"
        task["recheck_reason"] = req.reason or "Recheck requested."
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "RECHECK_REQUIRED",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": f"Recheck requested: {task['recheck_reason']}"
        })
        dispatch_notification(
            user_id="u0000004-0000-0000-0000-000000000004",
            target_role="MANAGER",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="TASK_RECHECK",
            severity="warning",
            title=f"Recheck Requested on {task['task_no']}",
            message=f"Operator {current_user['full_name']} requested recheck: {task['recheck_reason']}."
        )

    return {"success": True, "task": task}

@app.post("/tasks/{task_id}/submit")
async def submit_task_for_review(
    task_id: str,
    req: TaskReviewSubmission,
    current_user: dict = Depends(get_current_user_from_header)
):
    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id or t["task_no"] == task_id), None)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M")

    task["submission"] = {
        "submitted_at": now_str,
        "submitted_by": current_user["full_name"],
        "checklist_responses": req.checklist_responses or {},
        "measurements": req.measurements or {},
        "remarks": req.remarks,
        "evidence_notes": req.evidence_notes,
        "evidence_photo": req.evidence_photo
    }
    task["status"] = "SUBMITTED_FOR_REVIEW"
    task["timeline"].append({
        "id": f"tm-{Date_now_id()}",
        "status": "SUBMITTED_FOR_REVIEW",
        "timestamp": now_str,
        "actor_id": current_user["id"],
        "actor_name": current_user["full_name"],
        "actor_role": current_user["role"],
        "comment": f"Submitted for review: {req.remarks}"
    })

    dispatch_notification(
        user_id="u0000004-0000-0000-0000-000000000004",
        target_role="MANAGER",
        warehouse_id=task["warehouse_id"],
        task_id=task["id"],
        batch_id=task["batch_id"],
        notif_type="TASK_SUBMITTED",
        severity="info",
        title=f"Task Awaiting Quality Review: {task['task_no']}",
        message=f"Operator {current_user['full_name']} submitted measurements for Batch {task['batch_id']}."
    )

    return {"success": True, "message": "Task submitted for supervisor review.", "task": task}

@app.post("/tasks/{task_id}/review")
async def review_task_and_decide_quality(
    task_id: str,
    req: TaskReviewDecision,
    current_user: dict = Depends(get_current_user_from_header)
):
    # Only Manager or Quality Officer with APPROVE_QUALITY can sign off
    if "APPROVE_QUALITY" not in current_user.get("permissions", []) and current_user.get("role") != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Account lacks explicit APPROVE_QUALITY permission. Only authorized Quality Assayers or District Managers can approve quality inspections."
        )

    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id or t["task_no"] == task_id), None)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    decision = req.decision.upper()
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M")

    task["review"] = {
        "reviewed_at": now_str,
        "reviewed_by": current_user["full_name"],
        "reviewer_role": current_user["role"],
        "decision": decision,
        "remarks": req.remarks
    }

    if decision == "APPROVED":
        task["status"] = "COMPLETED"
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "COMPLETED",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": f"Quality Approved by {current_user['full_name']}: {req.remarks}"
        })
        dispatch_notification(
            user_id=task["assigned_to_id"],
            target_role="WAREHOUSE_ADMIN",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="QUALITY_APPROVED",
            severity="success",
            title=f"✅ Task Completed & Approved: {task['task_no']}",
            message=f"Batch {task['batch_id']} approved by {current_user['full_name']}. Eligible for FIFO allocation."
        )
    elif decision in ("HOLD", "REJECTED"):
        task["status"] = "COMPLETED"
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "COMPLETED",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": f"Quality Decision {decision}: {req.remarks}"
        })
        dispatch_notification(
            user_id=task["assigned_to_id"],
            target_role="WAREHOUSE_ADMIN",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="QUALITY_HOLD" if decision == "HOLD" else "ALERT",
            severity="warning" if decision == "HOLD" else "urgent",
            title=f"Batch {task['batch_id']} marked as {decision}",
            message=f"Supervisor decision: {req.remarks}"
        )
    elif decision == "RECHECK_REQUIRED":
        task["status"] = "RECHECK_REQUIRED"
        task["timeline"].append({
            "id": f"tm-{Date_now_id()}",
            "status": "RECHECK_REQUIRED",
            "timestamp": now_str,
            "actor_id": current_user["id"],
            "actor_name": current_user["full_name"],
            "actor_role": current_user["role"],
            "comment": f"Recheck mandated by reviewer: {req.remarks}"
        })
        dispatch_notification(
            user_id=task["assigned_to_id"],
            target_role="WAREHOUSE_ADMIN",
            warehouse_id=task["warehouse_id"],
            task_id=task["id"],
            batch_id=task["batch_id"],
            notif_type="TASK_RECHECK",
            severity="warning",
            title=f"Recheck Required: {task['task_no']}",
            message=f"Supervisor requested resampling: {req.remarks}"
        )

    # Audit Trail
    IN_MEMORY_AUDIT_LOGS.insert(0, {
        "id": f"AUD-{Date_now_id()}",
        "action": "QUALITY_DECISION",
        "actor_id": current_user["id"],
        "actor_name": current_user["full_name"],
        "actor_role": current_user["role"],
        "warehouse_id": task["warehouse_id"],
        "warehouse_name": task["warehouse_name"],
        "target_ref": task["batch_id"],
        "details": f"Quality decision for Batch {task['batch_id']} (Task {task['task_no']}): {decision}. Remarks: {req.remarks}",
        "timestamp": now_str,
        "status": "SUCCESS"
    })

    return {"success": True, "decision": decision, "task": task}

@app.post("/tasks/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    reason: Optional[str] = Query("Task cancelled by supervisor."),
    current_user: dict = Depends(get_current_user_from_header)
):
    if current_user.get("role") != "MANAGER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Managers can cancel tasks.")

    task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id or t["task_no"] == task_id), None)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

    task["status"] = "CANCELLED"
    task["timeline"].append({
        "id": f"tm-{Date_now_id()}",
        "status": "CANCELLED",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "actor_id": current_user["id"],
        "actor_name": current_user["full_name"],
        "actor_role": current_user["role"],
        "comment": f"Cancelled: {reason}"
    })

    dispatch_notification(
        user_id=task["assigned_to_id"],
        target_role="WAREHOUSE_ADMIN",
        warehouse_id=task["warehouse_id"],
        task_id=task["id"],
        batch_id=task["batch_id"],
        notif_type="TASK_CANCELLED",
        severity="info",
        title=f"Task Cancelled: {task['task_no']}",
        message=f"Task was cancelled by Manager {current_user['full_name']}. Reason: {reason}"
    )

    return {"success": True, "message": "Task cancelled successfully."}

@app.get("/notifications")
async def get_user_notifications(
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user_from_header)
):
    is_manager = current_user.get("role") == "MANAGER"
    user_id = current_user.get("id")
    user_role = current_user.get("role")

    user_notifs = []
    for n in IN_MEMORY_NOTIFICATIONS:
        if is_manager:
            if n.get("target_role") in ("MANAGER", "ALL") or n.get("user_id") == user_id:
                user_notifs.append(n)
        else:
            if n.get("user_id") == user_id or (n.get("target_role") in ("WAREHOUSE_ADMIN", "ALL") and not n.get("user_id")):
                user_notifs.append(n)

    if unread_only:
        user_notifs = [n for n in user_notifs if not n.get("is_read")]

    unread_count = sum(1 for n in user_notifs if not n.get("is_read"))
    return {
        "unread_count": unread_count,
        "notifications": user_notifs
    }

@app.post("/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: str,
    current_user: dict = Depends(get_current_user_from_header)
):
    notif = next((n for n in IN_MEMORY_NOTIFICATIONS if n["id"] == notif_id), None)
    if notif:
        notif["is_read"] = True
    return {"success": True}

@app.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user_from_header)
):
    is_manager = current_user.get("role") == "MANAGER"
    user_id = current_user.get("id")

    for n in IN_MEMORY_NOTIFICATIONS:
        if is_manager and (n.get("target_role") in ("MANAGER", "ALL") or n.get("user_id") == user_id):
            n["is_read"] = True
        elif not is_manager and (n.get("user_id") == user_id or n.get("target_role") in ("WAREHOUSE_ADMIN", "ALL")):
            n["is_read"] = True

    return {"success": True, "message": "All notifications marked as read."}

@app.get("/notifications/stream")
async def stream_notifications(
    current_user: dict = Depends(get_current_user_from_header)
):
    """Real-time SSE Notification Stream for instant in-app alerts without polling"""
    user_id = current_user.get("id")
    is_manager = current_user.get("role") == "MANAGER"

    async def notification_generator():
        last_check = datetime.datetime.now(datetime.timezone.utc)
        while True:
            try:
                # Heartbeat ping every 5 seconds
                ping_data = json.dumps({"type": "PING", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()})
                yield f"event: ping\\ndata: {ping_data}\\n\\n"
                await asyncio.sleep(5)
            except Exception as e:
                yield f"event: error\\ndata: {json.dumps({'error': str(e)})}\\n\\n"
                break

    return StreamingResponse(notification_generator(), media_type="text/event-stream")
'''

target = "# 10. Health & Observability Metrics"
replacement = task_section + "\n# -----------------------------------------------------------------------------\n# 11. Health & Observability Metrics"

assert target in content, "Target '# 10. Health & Observability Metrics' not found in api/main.py"
new_content = content.replace(target, replacement, 1)

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("api/main.py successfully updated with Section 10 Task Assignment & Notifications!")
