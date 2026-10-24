# Add Stock Control interfaces to web/src/data/types.ts
stock_types = """
export interface DamagedStockRecord {
  id: string;
  batchId: string;
  commodity: string;
  warehouseId: string;
  godownName: string;
  binCode: string;
  affectedQuantity: number;
  unit: string;
  damageReason: 'MOISTURE' | 'FUNGUS' | 'PESTS' | 'CONTAMINATION' | 'PACKAGING_FAILURE' | 'QUALITY_FAILURE' | 'OTHER';
  damageReasonLabel: string;
  dateReported: string;
  reportedById: string;
  reportedByName: string;
  evidenceNotes: string;
  inspectionFindings?: string;
  status: 'REPORTED' | 'AWAITING_INSPECTION' | 'ON_HOLD' | 'RECHECK_REQUIRED' | 'APPROVED_FOR_RELEASE' | 'DISPOSAL_REQUESTED' | 'DISPOSED';
  assignedTaskId?: string;
  resolutionHistory: {
    status: string;
    timestamp: string;
    user: string;
    notes: string;
  }[];
}

export interface ClearanceOrderBatchItem {
  batchId: string;
  commodity: string;
  quantity: number;
  resolution: 'MOVE_TO_BAY' | 'TRANSFER_DEPOT' | 'DISPATCH_ALLOCATION' | 'QUARANTINE_SEGREGATION' | 'WRITE_OFF';
  destinationBay: string;
  movedQuantity: number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
}

export interface ClearanceOrder {
  id: string;
  warehouseId: string;
  warehouseName: string;
  godownBay: string;
  reason: 'ROUTINE_REORGANIZATION' | 'SPACE_INTAKE' | 'TRANSFER_LOCATION' | 'DAMAGED_SEGREGATION' | 'DISPATCH_ALLOCATION' | 'APPROVED_DISPOSAL';
  reasonLabel: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  deadline: string;
  assignedToId: string;
  assignedToName: string;
  instructions: string;
  totalBatches: number;
  totalQuantity: number;
  movedQuantity: number;
  status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'PARTIALLY_COMPLETED' | 'AWAITING_VERIFICATION' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  createdBy: string;
  batches: ClearanceOrderBatchItem[];
}

export interface StockTransfer {
  id: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  sourceBay: string;
  destWarehouseId: string;
  destWarehouseName: string;
  destBay: string;
  batchId: string;
  commodity: string;
  quantity: number;
  unit: string;
  reason: string;
  requestedById: string;
  requestedByName: string;
  assignedOperatorId: string;
  assignedOperatorName: string;
  approvalStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'DELIVERED';
  approvedById?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  dispatchConfirmedBy?: string;
  vehicleNo?: string;
  driverName?: string;
  receivedAt?: string;
  receivedBy?: string;
  status: 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  remarks?: string;
}

export interface StockVerificationItem {
  batchId: string;
  commodity: string;
  systemSnapshotBags: number;
  physicallyCountedBags?: number;
  differenceBags?: number;
  variancePct?: number;
  discrepancyReason?: string;
  status: 'PENDING_COUNT' | 'MATCHED' | 'DISCREPANCY' | 'ADJUSTED';
  notes?: string;
}

export interface StockVerificationSession {
  id: string;
  warehouseId: string;
  warehouseName: string;
  godownBay: string;
  commodity: string;
  scheduledDate: string;
  countedById?: string;
  countedByName?: string;
  verifiedById: string;
  verifiedByName: string;
  status: 'SCHEDULED' | 'COUNTED' | 'DISCREPANCY_DETECTED' | 'RESOLVED' | 'ADJUSTED';
  createdAt: string;
  items: StockVerificationItem[];
  managerDecision?: string;
}

export interface DisposalRequest {
  id: string;
  batchId: string;
  commodity: string;
  warehouseId: string;
  warehouseName: string;
  godownBay: string;
  quantity: number;
  unit: string;
  inspectionRef?: string;
  reason: string;
  evidenceNotes: string;
  requestedById: string;
  requestedByName: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'MORE_INFO_REQUIRED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  disposalMethod: string;
  disposalCertificateRef?: string;
  executedAt?: string;
  executedBy?: string;
  createdAt: string;
  remarks?: string;
}
"""

with open('web/src/data/types.ts', 'a', encoding='utf-8') as f:
    f.write(stock_types)

print("Stock Control interfaces appended to web/src/data/types.ts successfully.")

