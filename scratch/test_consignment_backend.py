import os
from fastapi.testclient import TestClient
from api.main import app, IN_MEMORY_CONSIGNMENTS, IN_MEMORY_CONFIGURED_WAREHOUSES

client = TestClient(app)

MANAGER_TOKEN = "BS-TOKEN-MANAGER-SECURE"
OPERATOR_TOKEN = "BS-AUTH-ADMIN-NAGPUR" # Operator for GDN-NGP-01

def test_consignment_backend():
    print("Testing Consignment Backend Endpoints...")

    # 1. Test GET /warehouses/management
    resp = client.get("/warehouses/management", headers={"Authorization": f"Bearer {MANAGER_TOKEN}"})
    assert resp.status_code == 200, f"Failed GET /warehouses/management: {resp.text}"
    whs = resp.json()
    assert len(whs) >= 2, "Expected at least 2 warehouses"
    print("✅ GET /warehouses/management passed:", len(whs), "warehouses")

    # 2. Test Operator RBAC on /warehouses/management
    resp_op = client.get("/warehouses/management", headers={"Authorization": f"Bearer {OPERATOR_TOKEN}"})
    assert resp_op.status_code == 200
    op_whs = resp_op.json()
    assert len(op_whs) == 1, "Operator should only see assigned depot"
    assert op_whs[0]["id"] == "GDN-NGP-01"
    print("✅ Operator warehouse scope isolation passed")

    # 3. Test Manager adding a warehouse
    new_wh = {
        "code": "GDN-KRN-03",
        "name": "Karnal Agro Procurement Hub",
        "district": "Karnal",
        "state": "Haryana",
        "capacity_mt": 3500.0,
        "is_active": True,
        "compatible_commodities": ["Wheat", "Rice"]
    }
    resp = client.post("/warehouses/management", json=new_wh, headers={"Authorization": f"Bearer {MANAGER_TOKEN}"})
    assert resp.status_code == 201, f"Failed POST /warehouses/management: {resp.text}"
    print("✅ POST /warehouses/management passed")

    # Operator cannot add warehouse (403)
    resp = client.post("/warehouses/management", json=new_wh, headers={"Authorization": f"Bearer {OPERATOR_TOKEN}"})
    assert resp.status_code == 403, "Operator must be forbidden from adding warehouses"
    print("✅ Operator 403 forbidden on warehouse creation passed")

    # 4. Test Auto-Slot Preview
    slot_req = {
        "destination_warehouse_id": "GDN-NGP-01",
        "commodity": "Wheat",
        "total_quantity": 250,
        "arrival_date": "2025-10-25",
        "supplier_name": "Punjab Agro"
    }
    resp = client.post("/consignments/auto-slot-preview", json=slot_req, headers={"Authorization": f"Bearer {MANAGER_TOKEN}"})
    assert resp.status_code == 200, f"Auto slot failed: {resp.text}"
    data = resp.json()
    assert data["can_allocate"] is True
    assert data["total_allocated"] == 250
    assert len(data["allocations"]) >= 1
    print("✅ POST /consignments/auto-slot-preview passed:", len(data["allocations"]), "bin recommendations")

    # 5. Test Consignment Receive Workflow (Multi-Batch & Multi-Bin)
    consignment_payload = {
        "consignment_id": "CSG-2025-9901",
        "supplier_name": "Haryana State Mandi Board",
        "challan_number": "CHL-HR-8821",
        "arrival_date": "2025-10-25",
        "arrival_time": "14:30",
        "commodity": "Wheat",
        "total_quantity": 200,
        "unit": "Bags (50kg)",
        "vehicle_number": "HR-05-AB-1234",
        "remarks": "Gate intake verified sound moisture",
        "destination_warehouse_id": "GDN-NGP-01",
        "destination_warehouse_name": "Central Food Godown, Nagpur (Surajpur Depot)",
        "allocation_mode": "MANUAL",
        "batch_allocations": [
            {
                "batch_id": "B9901-A",
                "commodity": "Wheat",
                "quantity": 120,
                "warehouse_id": "GDN-NGP-01",
                "zone_code": "ZONE-B",
                "rack": "02",
                "bin_code": "BAY-A-RACK-02-BIN-02",
                "receipt_date": "2025-10-25",
                "quality_status": "Pending Inspection"
            },
            {
                "batch_id": "B9901-B",
                "commodity": "Wheat",
                "quantity": 80,
                "warehouse_id": "GDN-NGP-01",
                "zone_code": "ZONE-B",
                "rack": "02",
                "bin_code": "BAY-A-RACK-02-BIN-02",
                "receipt_date": "2025-10-25",
                "quality_status": "Pending Inspection"
            }
        ]
    }
    resp = client.post("/consignments/receive", json=consignment_payload, headers={"Authorization": f"Bearer {OPERATOR_TOKEN}"})
    assert resp.status_code == 201, f"Failed receive consignment: {resp.text}"
    rec_res = resp.json()
    assert rec_res["success"] is True
    assert rec_res["batch_count"] == 2
    assert "qr_token" in rec_res
    print("✅ POST /consignments/receive passed with multi-batch split")

    # 6. Test Duplicate Consignment Rejection
    resp = client.post("/consignments/receive", json=consignment_payload, headers={"Authorization": f"Bearer {OPERATOR_TOKEN}"})
    assert resp.status_code == 400, "Must reject duplicate consignment"
    print("✅ Duplicate consignment rejection passed")

    # 7. Test Quantity Balance Mismatch (sum != total)
    bad_payload = dict(consignment_payload)
    bad_payload["consignment_id"] = "CSG-2025-9902"
    bad_payload["total_quantity"] = 300 # Mismatch: 300 total, but allocations sum to 200
    resp = client.post("/consignments/receive", json=bad_payload, headers={"Authorization": f"Bearer {OPERATOR_TOKEN}"})
    assert resp.status_code == 400
    assert "Allocation mismatch" in resp.json()["detail"]
    print("✅ Quantity balance mismatch validation passed")

    # 8. Test Operator cannot receive to another warehouse
    pune_payload = dict(consignment_payload)
    pune_payload["consignment_id"] = "CSG-2025-9903"
    pune_payload["destination_warehouse_id"] = "GDN-PUN-02"
    resp = client.post("/consignments/receive", json=pune_payload, headers={"Authorization": f"Bearer {OPERATOR_TOKEN}"})
    assert resp.status_code == 403, "Operator must be forbidden from receiving to another warehouse"
    print("✅ Cross-warehouse permission check passed")

    # 9. Verify newly received batch status is NOT eligible for FIFO
    for b in rec_res["batches"]:
        assert b["quality_status"] == "Pending Inspection", "Received stock MUST be Pending Inspection"
    print("✅ Strict FIFO isolation verified: Newly received stock is Pending Inspection (NOT FIFO eligible)")

    print("\nALL BACKEND CONSIGNMENT TESTS PASSED SUCCESSFULLY! (100%)\n")

if __name__ == "__main__":
    test_consignment_backend()

