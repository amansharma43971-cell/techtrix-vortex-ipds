import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, '/Users/aayushtripathi/Downloads/vortex')
from api.main import app, IN_MEMORY_CONSIGNMENTS, IN_MEMORY_TASKS, IN_MEMORY_NOTIFICATIONS, IN_MEMORY_CONFIGURED_WAREHOUSES

client = TestClient(app)

class TestPutawayBackend(unittest.TestCase):
    def setUp(self):
        self.mgr_headers = {"Authorization": "Bearer BS-TOKEN-MANAGER-SECURE"}
        self.ngp_headers = {"Authorization": "Bearer BS-TOKEN-OPERATOR-NGP"}

    def test_01_inward_analysis_and_recommendation(self):
        """Test automated inward analysis and deterministic recommendation reasoning."""
        payload = {
            "commodity": "Wheat",
            "total_quantity": 120,
            "arrival_date": "2025-10-24",
            "destination_warehouse_id": "GDN-NGP-01",
            "supplier_name": "Punjab State Grains Co-op"
        }
        res = client.post("/consignments/analyze", json=payload, headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertGreater(data["recommendations_count"], 0)
        plan = data["recommended_putaway_plan"]
        self.assertEqual(sum(p["quantity"] for p in plan), 120)
        # Verify reasoning is present and informative
        for item in plan:
            self.assertIn("recommendation_reason", item)
            self.assertTrue(len(item["recommendation_reason"]) > 10)
        # Verify operator preview
        self.assertTrue(data["operator_assignment_preview"]["is_auto_assignable"])
        self.assertEqual(data["operator_assignment_preview"]["operator_name"], "Ramesh Patil")

    def test_02_receive_staged_and_auto_task_creation(self):
        """Test consignment receipt sets STAGED status, zero double counting, and creates operator task."""
        # Check initial bin occupancy
        wh = next(w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == "GDN-NGP-01")
        target_bin = next(b for b in wh["bins"] if b["bin_code"] == "BAY-NGP-01-BIN-01")
        init_occupied = target_bin.get("occupied", 0)

        cid = "CSG-TEST-PUTAWAY-01"
        alloc_qty = 80
        payload = {
            "consignment_id": cid,
            "supplier_name": "Haryana Agro Supply",
            "challan_number": "CH-TEST-8899",
            "arrival_date": "2025-10-24",
            "arrival_time": "11:30",
            "commodity": "Wheat",
            "total_quantity": alloc_qty,
            "unit": "Bags (50kg)",
            "vehicle_number": "MH-31-AX-9001",
            "remarks": "Sound new crop arrival",
            "destination_warehouse_id": "GDN-NGP-01",
            "allocation_mode": "AUTO_SLOT",
            "batch_allocations": [
                {
                    "batch_id": "B-TEST-PA-01",
                    "commodity": "Wheat",
                    "quantity": alloc_qty,
                    "zone_code": "ZONE-A",
                    "rack": "RACK-01",
                    "bin_code": "BAY-NGP-01-BIN-01",
                    "receipt_date": "2025-10-24"
                }
            ]
        }

        res = client.post("/consignments/receive", json=payload, headers=self.mgr_headers)
        self.assertEqual(res.status_code, 201, res.text)
        data = res.json()
        self.assertEqual(data["status"], "STAGED_AWAITING_PUTAWAY")

        # Crucial Invariant: Bin occupancy must NOT increase before physical confirmation!
        after_receive_occupied = target_bin.get("occupied", 0)
        self.assertEqual(after_receive_occupied, init_occupied, "Bin occupancy must remain unchanged while stock is awaiting put-away!")

        # Verify task created
        task_id = data["tasks"][0]["task_id"]
        task = next((t for t in IN_MEMORY_TASKS if t["id"] == task_id), None)
        self.assertIsNotNone(task)
        self.assertEqual(task["task_type"], "STOCK_PUTAWAY")
        self.assertEqual(task["status"], "ASSIGNED")
        self.assertEqual(task["assigned_to_name"], "Ramesh Patil")

        # Verify operator received notification
        notif = next((n for n in IN_MEMORY_NOTIFICATIONS if n.get("ref_id") == task_id), None)
        self.assertIsNotNone(notif)
        self.assertEqual(notif["type"], "TASK_ASSIGNED")

    def test_03_physical_confirmation_full(self):
        """Test operator confirms physical placement: bin occupied, batch stored, task completed, manager notified."""
        # Find the task from test 2
        task = next(t for t in IN_MEMORY_TASKS if t.get("consignment_id") == "CSG-TEST-PUTAWAY-01")
        wh = next(w for w in IN_MEMORY_CONFIGURED_WAREHOUSES if w["id"] == "GDN-NGP-01")
        target_bin = next(b for b in wh["bins"] if b["bin_code"] == "BAY-NGP-01-BIN-01")
        occupied_before = target_bin.get("occupied", 0)

        confirm_payload = {
            "actual_quantity": 80,
            "actual_bin_code": "BAY-NGP-01-BIN-01",
            "damaged_bags_count": 0,
            "discrepancy_reason": "No Discrepancy (Exact Match)",
            "notes": "Physically moved and stacked 80 bags in Bay A-1.",
            "physical_verification_certified": True
        }

        res = client.post(f"/tasks/putaway/{task['id']}/confirm", json=confirm_payload, headers=self.ngp_headers)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertEqual(data["task_status"], "COMPLETED")
        self.assertEqual(data["sound_placed_quantity"], 80)

        # Verify bin occupancy now increased by exactly 80
        self.assertEqual(target_bin.get("occupied", 0), occupied_before + 80)

        # Verify task cannot be confirmed a second time (idempotency check)
        res_dup = client.post(f"/tasks/putaway/{task['id']}/confirm", json=confirm_payload, headers=self.ngp_headers)
        self.assertEqual(res_dup.status_code, 400, "Duplicate put-away confirmation must be rejected.")

    def test_04_partial_placement_and_damaged_stock(self):
        """Test partial put-away with transit damage: segregates damage and marks task PARTIALLY_COMPLETED."""
        cid = "CSG-TEST-PARTIAL-02"
        alloc_qty = 100
        payload = {
            "consignment_id": cid,
            "supplier_name": "Punjab Agro Mills",
            "challan_number": "CH-TEST-9900",
            "arrival_date": "2025-10-24",
            "arrival_time": "14:00",
            "commodity": "Wheat",
            "total_quantity": alloc_qty,
            "unit": "Bags (50kg)",
            "vehicle_number": "MH-31-CB-5544",
            "destination_warehouse_id": "GDN-NGP-01",
            "batch_allocations": [
                {
                    "batch_id": "B-TEST-PART-02",
                    "commodity": "Wheat",
                    "quantity": alloc_qty,
                    "zone_code": "ZONE-A",
                    "rack": "RACK-02",
                    "bin_code": "BAY-NGP-01-BIN-02",
                    "receipt_date": "2025-10-24"
                }
            ]
        }
        res = client.post("/consignments/receive", json=payload, headers=self.mgr_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        task_id = data["tasks"][0]["task_id"]

        # Operator reports: Placed 90 bags (85 sound, 5 damaged torn in transit), 10 unplaced (truck shortage)
        confirm_payload = {
            "actual_quantity": 90,
            "actual_bin_code": "BAY-NGP-01-BIN-02",
            "damaged_bags_count": 5,
            "discrepancy_reason": "Damaged / Torn Bags Segregated on Dock + Truck Shortage",
            "notes": "Truck delivered 90 bags instead of 100. 5 bags torn in transit segregated into hold bay.",
            "physical_verification_certified": True
        }
        res_confirm = client.post(f"/tasks/putaway/{task_id}/confirm", json=confirm_payload, headers=self.ngp_headers)
        self.assertEqual(res_confirm.status_code, 200)
        cdata = res_confirm.json()
        self.assertEqual(cdata["task_status"], "PARTIALLY_COMPLETED")
        self.assertEqual(cdata["sound_placed_quantity"], 85)
        self.assertEqual(cdata["damaged_quantity"], 5)
        self.assertEqual(cdata["unplaced_quantity"], 10)
        self.assertTrue(cdata["is_discrepancy"])

    def test_05_reassign_task(self):
        """Test manager can reassign task to another operator."""
        task = next(t for t in IN_MEMORY_TASKS if t.get("status") == "ASSIGNED")
        reassign_payload = {
            "new_operator_id": "u0000001-0000-0000-0000-000000000001",
            "reassignment_reason": "Shift handover"
        }
        res = client.post(f"/tasks/{task['id']}/reassign", json=reassign_payload, headers=self.mgr_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

if __name__ == '__main__':
    unittest.main()

