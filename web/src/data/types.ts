// ============================================================================
// BhandarSetu: Smart Inventory Dashboard - TypeScript Domain Models
// ============================================================================

export type CommodityType = 'Wheat' | 'Rice' | 'Sugar' | 'Pulses';

export type QualityStatus = 
  | 'Pending Allocation'
  | 'Pending Inspection'
  | 'Eligible'
  | 'Hold'
  | 'Rejected'
  | 'Exhausted'
  | 'Approved'
  | 'Reinspection Required';

export interface QualityInspectionRecord {
  id: string;
  batchId: string;
  commodity: CommodityType;
  sampleQuantityKg: number;
  moisturePercent?: number;
  hasInfestation: boolean;
  foreignMatterPercent?: number;
  packagingCondition: 'Good' | 'Damaged' | 'Stained' | 'Torn';
  visualObservation: string;
  decision: 'Approved' | 'Hold' | 'Rejected' | 'Reinspection Required';
  decisionReason?: string;
  assayerName: string;
  assayerRole: string;
  timestamp: string;
  labCertificateRef?: string;
  overrideBy?: string;
  overrideReason?: string;
  overrideTimestamp?: string;
  photoUrl?: string;
}

export interface BinLocation {
  binCode: string; // e.g. "BAY-A-RACK-01-BIN-01"
  godown: string;
  section: string;
  rack: string;
  bin: string;
  maxCapacityBags: number;
  currentBags: number;
  commodity?: CommodityType;
  zoneType: 'BULK' | 'PICK_FACE' | 'QUARANTINE';
}

export interface StockMovement {
  id: string;
  movementType: 'RECEIPT' | 'LOCATION_ALLOCATION' | 'DISPATCH' | 'QUALITY_HOLD' | 'REJECTED' | 'EXPIRY_WRITE_OFF' | 'ADJUSTMENT' | 'RELOCATION';
  batchId: string;
  commodity: CommodityType;
  quantity?: number;
  qtyDeltaBags: number;
  balanceAfterBags: number;
  reason: string;
  fromBin?: string;
  toBin?: string;
  sourceLocation?: string;
  targetLocation?: string;
  createdBy: string;
  performedBy?: string;
  createdAt: string;
  timestamp?: string;
  referenceId?: string;
  notes?: string;
}

export interface BatchItem {
  id: string; // e.g. "B001"
  commodity: CommodityType;
  arrivalDate: string; // "DD-MM-YYYY" or "YYYY-MM-DD"
  totalQuantity: number; // in Bags
  availableQuantity: number; // in Bags
  reservedQuantity?: number; // Bags locked by active allocation requests
  dispatchedQuantity?: number; // Bags already dispatched out
  qualityStatus: QualityStatus;
  supplier?: string;
  receiptNo?: string;
  warehouse?: string;
  storageSection?: string;
  binCode?: string;
  allocatedBy?: string;
  allocatedAt?: string;
  allocationReason?: string;
  netWeightKg?: number;
  uom?: string;
  vehicleNo?: string;
  documentRef?: string;
  registeredBy?: string;
  registeredAt?: string;
  inspectionRemarks?: string;
  inspectorName?: string;
  inspectedAt?: string;
  qrToken?: string;
  holdReason?: string;
  notes?: string;
}

export interface DispatchAllocationItem {
  batchId: string;
  arrivalDate: string;
  allocatedBags: number;
  remainingBags: number;
  status: QualityStatus;
  commodity: CommodityType;
}

export interface FifoAllocationResult {
  requestedBags: number;
  totalAllocatedBags: number;
  shortfallBags: number;
  isShortfall: boolean;
  allocations: DispatchAllocationItem[];
  nextInQueue: DispatchAllocationItem | null;
}

export type AllocationRequestStatus = 
  | 'Draft'
  | 'Allocated'
  | 'Partially Allocated'
  | 'Pending Approval'
  | 'Dispatched'
  | 'Cancelled';

export interface AllocatedBatchLine {
  batchId: string;
  arrivalDate: string;
  qualityStatus: QualityStatus;
  availableBeforeBags: number;
  allocatedBags: number;
  remainingBags: number;
  fifoRank: number;
  selectionReason: string;
}

export interface AllocationRequest {
  id: string; // e.g. "REQ-2025-001"
  commodity: CommodityType;
  requiredQuantityBags: number;
  destination: string; // e.g. "FPS-101 (Sitabuldi, Ward 4)"
  requestedDate: string;
  referenceNo: string; // e.g. "CHL-2025-1049"
  notes?: string;
  status: AllocationRequestStatus;
  allocatedBags: number;
  shortfallBags: number;
  allocatedBatches: AllocatedBatchLine[];
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  dispatchId?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export type DispatchStatus = 
  | 'Ready to Dispatch'
  | 'Verification Pending'
  | 'Dispatched'
  | 'In Transit'
  | 'Delivered'
  | 'Delivery Exception'
  | 'Cancelled';

export interface DispatchBatchLine {
  batchId: string;
  arrivalDate: string;
  allocatedBags: number;
  actualLoadedBags: number;
  discrepancyBags?: number;
  discrepancyReason?: string;
  qualityStatus: QualityStatus;
  warehouse?: string;
  binCode?: string;
}

export interface DispatchEvent {
  id: string;
  eventType: 'CREATED' | 'VERIFIED' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'CANCELLED';
  timestamp: string;
  actor: string;
  description: string;
  referenceDoc?: string;
}

export interface DispatchRecord {
  id: string; // e.g. "D0056" or "DSP-2025-001"
  allocationRequestId?: string;
  referenceNo?: string; // e.g. "CHL-2025-0891"
  commodity: CommodityType;
  quantityBags: number; // legacy alias
  plannedQuantityBags?: number;
  actualDispatchedBags?: number;
  receivedQuantityBags?: number;
  transitDiscrepancyBags?: number;
  dispatchDate: string; // e.g. "20 Apr 2025"
  dispatchTime?: string;
  batchesUsed: string[]; // e.g. ["B001", "B002"]
  batchLines?: DispatchBatchLine[];
  destination: string;
  destinationContact?: string;
  vehicleNo?: string;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
  gatePassNo?: string;
  qrVerificationToken?: string;
  remarks?: string;
  status: DispatchStatus | 'Completed';
  createdBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  receivedBy?: string;
  proofOfDeliveryRef?: string;
  exceptionReason?: string;
  events?: DispatchEvent[];
}

export interface AlertItem {
  id: string;
  type: 'amber' | 'red' | 'blue';
  title: string;
  date: string; // e.g. "05 Feb 2025"
  batchId?: string;
  isRead: boolean;
}

export type RoleType = 'MANAGER' | 'WAREHOUSE_ADMIN' | 'QUALITY_OFFICER';

export type Permission = 
  | 'VIEW_SYSTEM_DATA'
  | 'MANAGE_USERS'
  | 'APPROVE_EXCEPTIONS'
  | 'VIEW_ANALYTICS'
  | 'VIEW_AUDIT_LOGS'
  | 'CREATE_INWARD'
  | 'VIEW_INVENTORY'
  | 'REQUEST_ALLOCATION'
  | 'PREPARE_DISPATCH'
  | 'UPDATE_DELIVERY'
  | 'APPROVE_QUALITY'
  | 'OVERRIDE_HOLD_BATCH'
  | 'CANCEL_DISPATCH';

export interface WarehouseInfo {
  id: string;
  code: string;
  name: string;
  district: string;
  state: string;
  capacityMt: number;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: RoleType;
  roleTitle: string; // e.g. "District Godown Manager" or "Godown Operator"
  warehouseId: string | null; // null represents System-Wide / All Warehouses scope
  warehouseName: string;
  email: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  passwordSalt?: string;
  passwordHash?: string;
  permissions: Permission[];
  lastLogin?: string;
}

export interface UserProfile {
  name: string;
  role: string;
  location: string;
  email: string;
  warehouseId?: string | null;
  permissions?: Permission[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: RoleType | string;
  warehouseId: string;
  warehouseName: string;
  targetRef: string;
  details: string;
  reason?: string;
  timestamp: string;
  status: 'SUCCESS' | 'DENIED' | 'FLAGGED';
}

export type TaskType = 'QUALITY_INSPECTION' | 'RECHECK' | 'STOCK_VERIFICATION' | 'DISPATCH_PREPARATION' | 'STOCK_PUTAWAY' | 'GENERAL';
export type TaskPriority = 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'SUBMITTED_FOR_REVIEW' | 'PARTIALLY_COMPLETED' | 'COMPLETED' | 'BLOCKED' | 'RECHECK_REQUIRED' | 'CANCELLED';

export interface TaskChecklistItem {
  id: string;
  label: string;
  required: boolean;
  type: 'boolean' | 'number' | 'text';
  value?: any;
  unit?: string;
}

export interface TaskTimelineEntry {
  id: string;
  status: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  comment: string;
}

export interface WarehouseTask {
  id: string;
  taskNo: string;
  title: string;
  description: string;
  taskType: TaskType;
  taskTypeTitle?: string;
  batchId: string;
  commodity: string;
  warehouseId: string;
  warehouseName: string;
  assignedToId: string;
  assignedToName: string;
  assignedToRole: string;
  assignedById: string;
  assignedByName: string;
  assignedAt: string;
  priority: TaskPriority;
  dueAt: string;
  isOverdue: boolean;
  status: TaskStatus;
  checklist: TaskChecklistItem[];
  notes?: string;
  submission?: {
    submittedAt: string;
    submittedBy: string;
    measurements?: {
      moisturePct?: number;
      foreignMatterPct?: number;
      weevilCount?: number;
      damagedBagsCount?: number;
    };
    checklistResponses?: Record<string, any>;
    remarks: string;
    evidenceNotes?: string;
  };
  blockerReason?: string;
  recheckReason?: string;
  review?: {
    reviewedAt: string;
    reviewedBy: string;
    reviewerRole: string;
    decision: 'APPROVED' | 'HOLD' | 'REJECTED' | 'RECHECK_REQUIRED';
    remarks: string;
  };
  timeline: TaskTimelineEntry[];
  consignmentId?: string;
  plannedQuantity?: number;
  plannedBatchId?: string;
  plannedBinCode?: string;
  recommendationReason?: string;
  actualQuantity?: number;
  actualBinCode?: string;
  damagedBagsCount?: number;
  soundPlacedQuantity?: number;
  unplacedQuantity?: number;
  discrepancyReason?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface InAppNotification {
  id: string;
  userId?: string;
  targetRole?: 'MANAGER' | 'WAREHOUSE_ADMIN' | 'ALL';
  warehouseId?: string;
  taskId?: string;
  batchId?: string;
  type: string;
  severity: 'info' | 'warning' | 'urgent' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}


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

export interface StorageLocationAllocation {
  batchId: string;
  commodity: string;
  quantity: number;
  warehouseId: string;
  zoneCode: string;
  rack: string;
  binCode: string;
  receiptDate: string;
  qualityStatus: QualityStatus;
}

export interface ConsignmentItem {
  consignmentId: string;
  receiptVoucherId: string;
  supplierName: string;
  challanNumber: string;
  arrivalDate: string;
  arrivalTime: string;
  commodity: string;
  totalQuantity: number;
  unit: string;
  vehicleNumber: string;
  remarks: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  allocationMode: 'MANUAL' | 'AUTO_SLOT';
  receivedById: string;
  receivedByName: string;
  receivedAt: string;
  status: 'STORED_AWAITING_INSPECTION' | 'INSPECTED' | 'DISPATCHED';
  documentName?: string;
  batches: StorageLocationAllocation[];
}

export interface StorageZoneConfig {
  code: string;
  name: string;
  zoneType: 'PICK_FACE' | 'BULK' | 'BUFFER';
  capacityBags: number;
  compatibleCommodity: string;
}

export interface WarehouseConfig {
  id: string;
  code: string;
  name: string;
  district: string;
  state: string;
  capacityMT: number;
  compatibleCommodities: string[];
  zones: StorageZoneConfig[];
  isActive: boolean;
}

