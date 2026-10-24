// ============================================================================
// Realistic Seed Data for BhandarSetu Operations Mock Layer
// ============================================================================

export interface Godown {
  id: string;
  code: string;
  name: string;
  district: string;
  state: string;
  capacity_mt: number;
}

export interface Commodity {
  id: string;
  code: string;
  name: string;
  policy: 'FIFO' | 'FEFO';
  shelf_life_days: number;
  standard_pack_kg: number;
}

export interface RationShop {
  id: string;
  fps_code: string;
  owner_name: string;
  village_ward: string;
  district: string;
  warehouse_id: string;
  distance_km: number;
}

export interface Batch {
  id: string;
  batch_no: string;
  receipt_no: string;
  commodity_id: string;
  warehouse_id: string;
  received_date: string;
  expiry_date: string;
  received_qty_g: number;
  current_qty_g: number;
  held_qty_g: number;
  status: 'AVAILABLE' | 'QUALITY_HOLD' | 'QUARANTINED_RECALL' | 'EXHAUSTED' | 'EXPIRED';
  bin_code: string;
  supplier: string;
  vehicle_no: string;
}

export interface Bin {
  id: string;
  bin_code: string;
  warehouse_id: string;
  zone_type: 'BULK' | 'PICK_FACE' | 'QUARANTINE' | 'DISPATCH_STAGING';
  rack: string;
  bay: string;
  level: string;
  max_capacity_g: number;
  current_occupancy_g: number;
  pick_sequence: number;
}

export interface PutawayTask {
  id: string;
  task_no: string;
  batch_no: string;
  commodity_name: string;
  qty_g: number;
  suggested_bin_code: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  sla_due_at: string;
}

export interface PickTask {
  id: string;
  task_no: string;
  batch_no: string;
  bin_code: string;
  fps_code: string;
  qty_g: number;
  pick_sequence: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PICKED' | 'SHORT_PICKED';
  sla_due_at: string;
}

export interface QualityHold {
  id: string;
  batch_id: string;
  batch_no: string;
  commodity_name: string;
  held_qty_g: number;
  reason: string;
  placed_by: string;
  placed_at: string;
  release_requested_by: string | null;
  release_reason: string | null;
  release_approved_by: string | null;
  status: 'ACTIVE' | 'RELEASE_PENDING' | 'RELEASED';
}

export interface ApprovalRequest {
  id: string;
  request_type: 'FIFO_EXCEPTION' | 'HOLD_RELEASE' | 'TRANSIT_LOSS_ESCALATION';
  reference_no: string;
  title: string;
  requested_by_id: string;
  requested_by_name: string;
  details: string;
  skipped_batch?: string;
  chosen_batch?: string;
  reason_code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  sla_due_at: string;
}

export interface LedgerMovement {
  movement_id: number;
  created_at: string;
  movement_type: 'RECEIPT' | 'DISPATCH' | 'HOLD' | 'RELEASE' | 'ADJUSTMENT' | 'PUTAWAY' | 'PICK';
  batch_no: string;
  bin_code: string;
  qty_delta_g: number;
  balance_after_g: number;
  ref_no: string;
  actor: string;
  row_hash: string;
}

// ----------------------------------------------------------------------------
// Initial Seed Data Sets
// ----------------------------------------------------------------------------

export const MOCK_GODOWNS: Godown[] = [
  { id: "11111111-1111-1111-1111-111111111111", code: "GDN-NGP-01", name: "Nagpur Central Food Godown", district: "Nagpur", state: "Maharashtra", capacity_mt: 10000 },
  { id: "22222222-2222-2222-2222-222222222222", code: "GDN-PUN-01", name: "Pune District Buffer Godown", district: "Pune", state: "Maharashtra", capacity_mt: 8000 }
];

export const MOCK_COMMODITIES: Commodity[] = [
  { id: "c1", code: "WHEAT-A", name: "Wheat Grade A (Sona Moti)", policy: "FIFO", shelf_life_days: 365, standard_pack_kg: 50 },
  { id: "c2", code: "RICE-PARBOIL", name: "Parboiled Rice (Common Raw)", policy: "FIFO", shelf_life_days: 365, standard_pack_kg: 50 },
  { id: "c3", code: "SUGAR-M30", name: "Refined Sugar Grade M-30", policy: "FIFO", shelf_life_days: 730, standard_pack_kg: 50 },
  { id: "c4", code: "BAJRA-FORT", name: "Fortified Bajra Millet", policy: "FEFO", shelf_life_days: 180, standard_pack_kg: 50 }
];

export const MOCK_RATION_SHOPS: RationShop[] = [
  { id: "s1", fps_code: "FPS-NGP-101", owner_name: "Ganesh Kirana Bhandar", village_ward: "Sitabuldi Ward 4", district: "Nagpur", warehouse_id: "11111111-1111-1111-1111-111111111111", distance_km: 8.2 },
  { id: "s2", fps_code: "FPS-NGP-102", owner_name: "Maa Laxmi Sahakari", village_ward: "Dharampeth Ward 9", district: "Nagpur", warehouse_id: "11111111-1111-1111-1111-111111111111", distance_km: 12.5 },
  { id: "s3", fps_code: "FPS-NGP-103", owner_name: "Jai Hind PDS Kendra", village_ward: "Itwari Ward 14", district: "Nagpur", warehouse_id: "11111111-1111-1111-1111-111111111111", distance_km: 6.8 },
  { id: "s4", fps_code: "FPS-NGP-104", owner_name: "Pragati Mahila Mandal", village_ward: "Sadar Bazar", district: "Nagpur", warehouse_id: "11111111-1111-1111-1111-111111111111", distance_km: 15.0 },
  { id: "s5", fps_code: "FPS-NGP-105", owner_name: "Kisan Kalyan Kendra", village_ward: "Kamptee Village", district: "Nagpur", warehouse_id: "11111111-1111-1111-1111-111111111111", distance_km: 22.4 }
];

export const MOCK_BATCHES: Batch[] = [
  // FIFO Tier 1: Wheat Stack in Lane A
  { id: "b01", batch_no: "BATCH-WHT-2026-001", receipt_no: "GR-2026-FCI-001", commodity_id: "c1", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-07-03", expiry_date: "2027-07-03", received_qty_g: 20000000, current_qty_g: 400000, held_qty_g: 0, status: "AVAILABLE", bin_code: "BLK-A-01-1", supplier: "FCI Base Depot Gondia", vehicle_no: "MH-31-AP-4921" },
  { id: "b02", batch_no: "BATCH-WHT-2026-002", receipt_no: "GR-2026-FCI-002", commodity_id: "c1", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-08-01", expiry_date: "2027-08-01", received_qty_g: 25000000, current_qty_g: 600000, held_qty_g: 0, status: "AVAILABLE", bin_code: "BLK-A-01-2", supplier: "Punjab State Grains Pool", vehicle_no: "PB-10-CZ-8822" },
  { id: "b03", batch_no: "BATCH-WHT-2026-003", receipt_no: "GR-2026-FCI-003", commodity_id: "c1", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-09-02", expiry_date: "2027-09-02", received_qty_g: 30000000, current_qty_g: 1200000, held_qty_g: 0, status: "AVAILABLE", bin_code: "BLK-A-01-3", supplier: "Haryana Agro Depot", vehicle_no: "HR-26-DF-1090" },
  { id: "b04", batch_no: "BATCH-WHT-2026-004", receipt_no: "GR-2026-FCI-004", commodity_id: "c1", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-10-01", expiry_date: "2027-10-01", received_qty_g: 50000000, current_qty_g: 3000000, held_qty_g: 0, status: "AVAILABLE", bin_code: "BLK-A-02-1", supplier: "FCI Base Depot Nagpur", vehicle_no: "MH-40-BL-9900" },
  
  // Quality Hold Batch
  { id: "b05", batch_no: "BATCH-WHT-2026-005-HOLD", receipt_no: "GR-2026-FCI-003", commodity_id: "c1", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-08-20", expiry_date: "2027-08-20", received_qty_g: 15000000, current_qty_g: 1500000, held_qty_g: 1500000, status: "QUALITY_HOLD", bin_code: "QUAR-01", supplier: "Madhya Pradesh Civil Supplies", vehicle_no: "MP-04-E-1122" },

  // Rice Batches
  { id: "b06", batch_no: "BATCH-RIC-2026-001", receipt_no: "GR-2026-FCI-001", commodity_id: "c2", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-07-20", expiry_date: "2027-07-20", received_qty_g: 40000000, current_qty_g: 2500000, held_qty_g: 0, status: "AVAILABLE", bin_code: "BLK-B-01-1", supplier: "Chhattisgarh State Pool", vehicle_no: "CG-04-E-9911" },
  { id: "b07", batch_no: "BATCH-RIC-2026-002", receipt_no: "GR-2026-FCI-005", commodity_id: "c2", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-09-12", expiry_date: "2027-09-12", received_qty_g: 50000000, current_qty_g: 4000000, held_qty_g: 0, status: "AVAILABLE", bin_code: "BLK-B-02-1", supplier: "Andhra Rice Millers Co-op", vehicle_no: "AP-16-TX-5511" },

  // Near Expiry FEFO Batch (Bajra)
  { id: "b08", batch_no: "BATCH-BJR-2026-002-FEFO", receipt_no: "GR-2026-FCI-002", commodity_id: "c4", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-09-01", expiry_date: "2026-11-05", received_qty_g: 10000000, current_qty_g: 1000000, held_qty_g: 0, status: "AVAILABLE", bin_code: "PF-01", supplier: "Rajasthan Co-op Marketing", vehicle_no: "RJ-14-GH-9011" },

  // Expired Batch
  { id: "b09", batch_no: "BATCH-BJR-2025-001-EXPIRED", receipt_no: "GR-2025-FCI-99", commodity_id: "c4", warehouse_id: "11111111-1111-1111-1111-111111111111", received_date: "2026-03-01", expiry_date: "2026-09-01", received_qty_g: 8000000, current_qty_g: 800000, held_qty_g: 0, status: "EXPIRED", bin_code: "BLK-C-01-1", supplier: "Gujarat Agro Industries", vehicle_no: "GJ-01-AX-1122" }
];

export const MOCK_BINS: Bin[] = [
  // Rack A (Deep FIFO Lane)
  { id: "bin1", bin_code: "BLK-A-01-1", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "BULK", rack: "A", bay: "1", level: "1", max_capacity_g: 50000000, current_occupancy_g: 400000, pick_sequence: 101 },
  { id: "bin2", bin_code: "BLK-A-01-2", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "BULK", rack: "A", bay: "1", level: "2", max_capacity_g: 50000000, current_occupancy_g: 600000, pick_sequence: 102 },
  { id: "bin3", bin_code: "BLK-A-01-3", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "BULK", rack: "A", bay: "1", level: "3", max_capacity_g: 50000000, current_occupancy_g: 1200000, pick_sequence: 103 },
  { id: "bin4", bin_code: "BLK-A-02-1", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "BULK", rack: "A", bay: "2", level: "1", max_capacity_g: 50000000, current_occupancy_g: 3000000, pick_sequence: 104 },
  
  // Rack B (Rice)
  { id: "bin5", bin_code: "BLK-B-01-1", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "BULK", rack: "B", bay: "1", level: "1", max_capacity_g: 50000000, current_occupancy_g: 2500000, pick_sequence: 110 },
  { id: "bin6", bin_code: "BLK-B-02-1", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "BULK", rack: "B", bay: "2", level: "1", max_capacity_g: 50000000, current_occupancy_g: 4000000, pick_sequence: 111 },

  // Pick Face (Near Staging)
  { id: "bin7", bin_code: "PF-01", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "PICK_FACE", rack: "PF", bay: "1", level: "1", max_capacity_g: 20000000, current_occupancy_g: 1000000, pick_sequence: 10 },
  { id: "bin8", bin_code: "PF-02", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "PICK_FACE", rack: "PF", bay: "2", level: "1", max_capacity_g: 20000000, current_occupancy_g: 0, pick_sequence: 20 },

  // Quarantine Barricade
  { id: "bin9", bin_code: "QUAR-01", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "QUARANTINE", rack: "Q", bay: "1", level: "1", max_capacity_g: 25000000, current_occupancy_g: 1500000, pick_sequence: 999 },

  // Staging Docks
  { id: "bin10", bin_code: "STG-D01", warehouse_id: "11111111-1111-1111-1111-111111111111", zone_type: "DISPATCH_STAGING", rack: "STG", bay: "1", level: "1", max_capacity_g: 100000000, current_occupancy_g: 1200000, pick_sequence: 1 }
];

export const MOCK_PUTAWAY_TASKS: PutawayTask[] = [
  { id: "pt1", task_no: "PT-2026-0881", batch_no: "BATCH-WHT-2026-004", commodity_name: "Wheat Grade A", qty_g: 2000000, suggested_bin_code: "BLK-A-02-1", status: "OPEN", sla_due_at: "2026-10-23T18:30:00Z" },
  { id: "pt2", task_no: "PT-2026-0882", batch_no: "BATCH-RIC-2026-002", commodity_name: "Parboiled Rice", qty_g: 5000000, suggested_bin_code: "BLK-B-02-1", status: "IN_PROGRESS", sla_due_at: "2026-10-23T19:15:00Z" }
];

export const MOCK_PICK_TASKS: PickTask[] = [
  { id: "pk1", task_no: "PTK-2026-0012", batch_no: "BATCH-WHT-2026-001", bin_code: "BLK-A-01-1", fps_code: "FPS-NGP-101", qty_g: 400000, pick_sequence: 101, status: "PENDING", sla_due_at: "2026-10-23T16:00:00Z" },
  { id: "pk2", task_no: "PTK-2026-0013", batch_no: "BATCH-WHT-2026-002", bin_code: "BLK-A-01-2", fps_code: "FPS-NGP-101", qty_g: 600000, pick_sequence: 102, status: "PENDING", sla_due_at: "2026-10-23T16:00:00Z" }
];

export const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: "appr1",
    request_type: "FIFO_EXCEPTION",
    reference_no: "EXC-2026-881",
    title: "FIFO Bypass Request for Dispatch #DSP-2026-104",
    requested_by_id: "u1",
    requested_by_name: "Ramesh Patil (Store Keeper)",
    details: "Bay 1 forklift crane hydraulic maintenance in progress. Stack temporarily blocked.",
    skipped_batch: "BATCH-WHT-2026-001 (112 days old)",
    chosen_batch: "BATCH-WHT-2026-004 (20 days old)",
    reason_code: "PHYSICAL_ACCESS_BLOCKED",
    status: "PENDING",
    created_at: "2026-10-23T14:10:00Z",
    sla_due_at: "2026-10-23T16:00:00Z"
  },
  {
    id: "appr2",
    request_type: "HOLD_RELEASE",
    reference_no: "REL-2026-042",
    title: "Release Request for Quarantined Batch B-WHT-2026-005-HOLD",
    requested_by_id: "u3",
    requested_by_name: "Dr. Anita Rao (Quality Inspector)",
    details: "Re-testing report #QC-889 shows moisture normalized to 11.2% after aeration.",
    reason_code: "LAB_TEST_PASS",
    status: "PENDING",
    created_at: "2026-10-23T11:30:00Z",
    sla_due_at: "2026-10-23T17:00:00Z"
  }
];

export const MOCK_LEDGER_FEED: LedgerMovement[] = [
  { movement_id: 4814, created_at: "2026-10-23T14:42:01Z", movement_type: "PUTAWAY", batch_no: "BATCH-WHT-2026-004", bin_code: "BLK-A-02-1", qty_delta_g: 3000000, balance_after_g: 3000000, ref_no: "GR-2026-FCI-004", actor: "Ramesh Patil", row_hash: "7c9d4b1a8f9023..." },
  { movement_id: 4813, created_at: "2026-10-23T14:38:15Z", movement_type: "DISPATCH", batch_no: "BATCH-WHT-2026-001", bin_code: "BLK-A-01-1", qty_delta_g: -400000, balance_after_g: 0, ref_no: "DSP-2026-0001", actor: "Suresh Shinde", row_hash: "3b1e88f29c0182..." },
  { movement_id: 4812, created_at: "2026-10-23T14:30:00Z", movement_type: "HOLD", batch_no: "BATCH-WHT-2026-005-HOLD", bin_code: "QUAR-01", qty_delta_g: 0, balance_after_g: 1500000, ref_no: "HLD-2026-012", actor: "Dr. Anita Rao", row_hash: "a9018cff22405a..." }
];

