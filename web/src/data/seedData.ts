import { BatchItem, DispatchRecord, AlertItem, UserProfile, QualityInspectionRecord, AllocationRequest, StockMovement, BinLocation, AuthUser, AuditLogEntry, WarehouseInfo } from './types';

export const DEMO_TODAY = '2025-10-23';

export const SYSTEM_WAREHOUSES: WarehouseInfo[] = [
  {
    id: 'GDN-NGP-01',
    code: 'GDN-NGP-01',
    name: 'Central Food Godown, Nagpur (Surajpur Depot)',
    district: 'Nagpur',
    state: 'Maharashtra',
    capacityMt: 5000.0
  },
  {
    id: 'GDN-PUN-02',
    code: 'GDN-PUN-02',
    name: 'District Buffer Depot, Pune',
    district: 'Pune',
    state: 'Maharashtra',
    capacityMt: 7500.0
  }
];

export const INITIAL_USER: UserProfile = {
  name: 'Aayush Tripathi',
  role: 'District Godown Manager',
  location: 'Surajpur, Noida / Nagpur Central',
  email: 'aayush.tripathi@ipds.gov.in',
  warehouseId: null
};

export const SEED_AUTH_USERS: AuthUser[] = [
  {
    id: 'u-manager-01',
    username: 'manager@bhandarsetu.gov.in',
    mustChangePassword: false,
    passwordSalt: 'dfda2888393993f00eda56ce55b78a28',
    passwordHash: '81d4d8595ba7747c885e61cbd905c681a421a75040c76ca7842da4e30aea9ad0',
    fullName: 'Aayush Tripathi',
    role: 'MANAGER',
    roleTitle: 'District Godown Manager / Supervisor',
    warehouseId: null, // System-wide multi-warehouse scope
    warehouseName: 'All Warehouses (National Central Depot & Buffer Godowns)',
    email: 'manager@bhandarsetu.gov.in',
    isActive: true,
    permissions: [
      'VIEW_SYSTEM_DATA',
      'MANAGE_USERS',
      'APPROVE_EXCEPTIONS',
      'VIEW_ANALYTICS',
      'VIEW_AUDIT_LOGS',
      'CREATE_INWARD',
      'VIEW_INVENTORY',
      'REQUEST_ALLOCATION',
      'PREPARE_DISPATCH',
      'UPDATE_DELIVERY',
      'APPROVE_QUALITY',
      'OVERRIDE_HOLD_BATCH',
      'CANCEL_DISPATCH'
    ],
    lastLogin: '2025-10-24 08:30 IST'
  },
  {
    id: 'u-admin-ngp',
    username: 'admin.nagpur@bhandarsetu.gov.in',
    mustChangePassword: false,
    passwordSalt: 'f35814c047db7a1fd4398938bcff3441',
    passwordHash: '7f21504273884081fae7ec6abec78f202925086a8bd3ba16f1746ea15a470c21',
    fullName: 'Ramesh Patil',
    role: 'WAREHOUSE_ADMIN',
    roleTitle: 'Godown Operator / Warehouse Admin',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
    email: 'admin.nagpur@bhandarsetu.gov.in',
    isActive: true,
    permissions: [
      'CREATE_INWARD',
      'VIEW_INVENTORY',
      'REQUEST_ALLOCATION',
      'PREPARE_DISPATCH',
      'UPDATE_DELIVERY'
    ],
    lastLogin: '2025-10-24 07:45 IST'
  },
  {
    id: 'u-admin-pun',
    username: 'admin.pune@bhandarsetu.gov.in',
    mustChangePassword: false,
    passwordSalt: 'dc5ee70aa1de7820927d42ae970bff80',
    passwordHash: 'c4faf13701c401ec9eefadcb9cf159c42a7e2e7250ad945c824a4b248a56c571',
    fullName: 'Suresh Shinde',
    role: 'WAREHOUSE_ADMIN',
    roleTitle: 'Godown Operator / Warehouse Admin',
    warehouseId: 'GDN-PUN-02',
    warehouseName: 'District Buffer Depot, Pune',
    email: 'admin.pune@bhandarsetu.gov.in',
    isActive: true,
    permissions: [
      'CREATE_INWARD',
      'VIEW_INVENTORY',
      'REQUEST_ALLOCATION',
      'PREPARE_DISPATCH',
      'UPDATE_DELIVERY'
    ],
    lastLogin: '2025-10-23 18:20 IST'
  },
  {
    id: 'u-qo-01',
    username: 'quality@bhandarsetu.gov.in',
    mustChangePassword: false,
    passwordSalt: '6dc08682b1ab2a5f5d3ddd60d2ad212a',
    passwordHash: 'f4e02c6cc5a9a483892f8e805a3c029f3b0e93c813fba811fa586acd179cde87',
    fullName: 'Dr. Anita Rao',
    role: 'QUALITY_OFFICER',
    roleTitle: 'Lead Laboratory Assayer & Quality Officer',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
    email: 'quality@bhandarsetu.gov.in',
    isActive: true,
    permissions: [
      'VIEW_INVENTORY',
      'APPROVE_QUALITY',
      'APPROVE_EXCEPTIONS'
    ],
    lastLogin: '2025-10-24 09:10 IST'
  },
  {
    id: 'u-inactive-01',
    username: 'inactive.user@bhandarsetu.gov.in',
    mustChangePassword: false,
    passwordSalt: '13127b79d2f98ceca39f2abef42412e4',
    passwordHash: '5fee6ef6d7640bf3bc659975c68dc7b3941e7d3e8796633a6161e76c7f1d8bf2',
    fullName: 'Vikram Joshi (Suspended)',
    role: 'WAREHOUSE_ADMIN',
    roleTitle: 'Ex-Godown Operator',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur',
    email: 'inactive.user@bhandarsetu.gov.in',
    isActive: false, // Testing inactive account rejection
    permissions: [
      'VIEW_INVENTORY'
    ],
    lastLogin: '2025-09-15 11:00 IST'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-2025-001',
    action: 'INWARD_REGISTERED',
    actorId: 'u-admin-ngp',
    actorName: 'Ramesh Patil',
    actorRole: 'WAREHOUSE_ADMIN',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur',
    targetRef: 'BS-2025-001',
    details: 'Registered inward consignment: 100 Bags Wheat (50.0 MT) from Punjab Agro Food Corp via vehicle PB-10-AX-8912',
    timestamp: '2025-01-01 10:30',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-2025-002',
    action: 'QUALITY_DECISION',
    actorId: 'u-qo-01',
    actorName: 'Dr. Anita Rao',
    actorRole: 'QUALITY_OFFICER',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur',
    targetRef: 'BS-2025-001',
    details: 'Assay certified standard compliance: Moisture 11.2%, Foreign matter 0.35%, Weevil count 0. Decision: APPROVED (Eligible for FIFO)',
    timestamp: '2025-01-02 11:15',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-2025-003',
    action: 'FIFO_ALLOCATION',
    actorId: 'u-admin-ngp',
    actorName: 'Ramesh Patil',
    actorRole: 'WAREHOUSE_ADMIN',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur',
    targetRef: 'REQ-2025-001',
    details: 'Allocated 120 Bags Wheat strictly following FIFO ordering: Batch B001 (100 Bags, oldest) + Batch B002 (20 Bags)',
    timestamp: '2025-04-18 09:30',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-2025-004',
    action: 'DISPATCH_PREPARED',
    actorId: 'u-admin-ngp',
    actorName: 'Ramesh Patil',
    actorRole: 'WAREHOUSE_ADMIN',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur',
    targetRef: 'D0056',
    details: 'Loaded vehicle MH-31-AP-9921 with 120 Bags Wheat. Verified bag counts and issued Gate Pass GP-2025-10492',
    timestamp: '2025-04-20 14:15',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-2025-005',
    action: 'HOLD_OVERRIDE',
    actorId: 'u-manager-01',
    actorName: 'Aayush Tripathi',
    actorRole: 'MANAGER',
    warehouseId: 'GDN-NGP-01',
    warehouseName: 'Central Food Godown, Nagpur',
    targetRef: 'B007',
    details: 'Reviewed batch B007 quarantine status. Fumigation treatment completed with certificate CERT-FUM-8812. Released to Normal status.',
    reason: 'Fumigation certification verified by District Officer. Post-treatment assay passed.',
    timestamp: '2025-04-22 16:40',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-2025-006',
    action: 'USER_ROLE_CHANGED',
    actorId: 'u-manager-01',
    actorName: 'Aayush Tripathi',
    actorRole: 'MANAGER',
    warehouseId: 'GDN-PUN-02',
    warehouseName: 'District Buffer Depot, Pune',
    targetRef: 'u-admin-pun',
    details: 'Updated user Suresh Shinde role permissions and confirmed depot access for GDN-PUN-02',
    reason: 'Quarterly administrative role verification',
    timestamp: '2025-04-23 11:20',
    status: 'SUCCESS'
  }
];


export const INITIAL_BATCHES: BatchItem[] = [
  {
    id: 'B001',
    commodity: 'Wheat',
    arrivalDate: '01-01-2025',
    totalQuantity: 100,
    availableQuantity: 100,
    qualityStatus: 'Eligible',
    supplier: 'FCI Depot Karnal',
    notes: 'Good grain luster, moisture 10.4%'
  },
  {
    id: 'B002',
    commodity: 'Wheat',
    arrivalDate: '10-01-2025',
    totalQuantity: 150,
    availableQuantity: 150,
    qualityStatus: 'Eligible',
    supplier: 'Punjab Agro Pool',
    notes: 'Standard grade Sona Moti'
  },
  {
    id: 'B003',
    commodity: 'Wheat',
    arrivalDate: '20-01-2025',
    totalQuantity: 200,
    availableQuantity: 200,
    qualityStatus: 'Eligible',
    supplier: 'Haryana Agro Pool',
    notes: 'Standard moisture 11.2%'
  },
  {
    id: 'B004',
    commodity: 'Rice',
    arrivalDate: '05-02-2025',
    totalQuantity: 120,
    availableQuantity: 120,
    qualityStatus: 'Hold',
    supplier: 'Chhattisgarh State Pool',
    holdReason: 'Moisture content exceeds 14%, pending aeration re-test'
  },
  {
    id: 'B005',
    commodity: 'Rice',
    arrivalDate: '15-02-2025',
    totalQuantity: 180,
    availableQuantity: 180,
    qualityStatus: 'Eligible',
    supplier: 'Andhra Millers Co-op',
    notes: 'Common Raw Grade I'
  },
  {
    id: 'B006',
    commodity: 'Wheat',
    arrivalDate: '28-02-2025',
    totalQuantity: 160,
    availableQuantity: 160,
    qualityStatus: 'Eligible',
    supplier: 'MP State Supplies',
    notes: 'Fresh harvest arrival'
  },
  {
    id: 'B007',
    commodity: 'Wheat',
    arrivalDate: '10-03-2025',
    totalQuantity: 140,
    availableQuantity: 140,
    qualityStatus: 'Rejected',
    supplier: 'UP Agro Corporation',
    holdReason: 'Weevil infestation detected by lab inspection'
  }
];

export const INITIAL_DISPATCHES: DispatchRecord[] = [
  {
    id: 'D0056',
    allocationRequestId: 'REQ-2025-001',
    referenceNo: 'CHL-2025-0891',
    commodity: 'Wheat',
    quantityBags: 120,
    plannedQuantityBags: 120,
    actualDispatchedBags: 120,
    receivedQuantityBags: 120,
    transitDiscrepancyBags: 0,
    dispatchDate: '20 Apr 2025',
    dispatchTime: '14:15',
    batchesUsed: ['B001', 'B002'],
    batchLines: [
      {
        batchId: 'B001',
        arrivalDate: '01-01-2025',
        allocatedBags: 100,
        actualLoadedBags: 100,
        qualityStatus: 'Eligible',
        warehouse: 'Central Godown',
        binCode: 'BAY-A-01'
      },
      {
        batchId: 'B002',
        arrivalDate: '10-01-2025',
        allocatedBags: 20,
        actualLoadedBags: 20,
        qualityStatus: 'Eligible',
        warehouse: 'Central Godown',
        binCode: 'BAY-A-02'
      }
    ],
    destination: 'FPS-101 (Sitabuldi, Ward 4)',
    destinationContact: 'Mr. Arvind Joshi (+91 98220 11223)',
    vehicleNo: 'UP-16-BT-9988',
    transporterName: 'FCI Dedicated Fleet',
    driverName: 'Rameshwar Singh',
    driverPhone: '+91 98112 34567',
    gatePassNo: 'GP-2025-10492',
    qrVerificationToken: 'BS-VERIFY-D0056-SECURE',
    remarks: 'Regular PDS allocation for Ward 4 - Delivery receipt verified',
    status: 'Delivered',
    createdBy: 'Aayush Tripathi',
    verifiedBy: 'Dr. V. K. Sharma (Assayer)',
    verifiedAt: '2025-04-20 13:45',
    dispatchedAt: '2025-04-20 14:15',
    deliveredAt: '2025-04-20 17:30',
    receivedBy: 'Arvind Joshi (FPS Dealer)',
    proofOfDeliveryRef: 'POD-2025-0891-ACK',
    events: [
      { id: 'ev-1', eventType: 'CREATED', timestamp: '2025-04-18 09:30', actor: 'Aayush Tripathi', description: 'Dispatch order created from allocation REQ-2025-001' },
      { id: 'ev-2', eventType: 'VERIFIED', timestamp: '2025-04-20 13:45', actor: 'Dr. V. K. Sharma', description: 'Staging verification completed. 120 Bags confirmed on scale' },
      { id: 'ev-3', eventType: 'CONFIRMED', timestamp: '2025-04-20 14:15', actor: 'Aayush Tripathi', description: 'Gate pass GP-2025-10492 issued. Vehicle UP-16-BT-9988 cleared' },
      { id: 'ev-4', eventType: 'DELIVERED', timestamp: '2025-04-20 17:30', actor: 'Arvind Joshi', description: 'Delivered in full. 120 Bags received without transit loss' }
    ]
  },
  {
    id: 'D0057',
    allocationRequestId: 'REQ-2025-002',
    referenceNo: 'CHL-2025-0945',
    commodity: 'Wheat',
    quantityBags: 100,
    plannedQuantityBags: 100,
    actualDispatchedBags: 100,
    dispatchDate: '23 Apr 2025',
    dispatchTime: '10:30',
    batchesUsed: ['B002'],
    batchLines: [
      {
        batchId: 'B002',
        arrivalDate: '10-01-2025',
        allocatedBags: 100,
        actualLoadedBags: 100,
        qualityStatus: 'Eligible',
        warehouse: 'Central Godown',
        binCode: 'BAY-A-02'
      }
    ],
    destination: 'FPS-102 (Dharampeth, Ward 9)',
    destinationContact: 'Mrs. Rekha Sharma (+91 98221 22334)',
    vehicleNo: 'UP-16-AX-4411',
    transporterName: 'State Civil Supplies Corp',
    driverName: 'Mohd. Salim',
    driverPhone: '+91 97110 55443',
    gatePassNo: 'GP-2025-10518',
    qrVerificationToken: 'BS-VERIFY-D0057-SECURE',
    remarks: 'Monthly quota dispatch in transit',
    status: 'In Transit',
    createdBy: 'Aayush Tripathi',
    verifiedBy: 'Dr. V. K. Sharma (Assayer)',
    verifiedAt: '2025-04-23 09:50',
    dispatchedAt: '2025-04-23 10:30',
    events: [
      { id: 'ev-5', eventType: 'CREATED', timestamp: '2025-04-22 10:15', actor: 'Aayush Tripathi', description: 'Dispatch order generated from allocation REQ-2025-002' },
      { id: 'ev-6', eventType: 'VERIFIED', timestamp: '2025-04-23 09:50', actor: 'Dr. V. K. Sharma', description: 'Bag counts verified: 100 Bags sound condition' },
      { id: 'ev-7', eventType: 'IN_TRANSIT', timestamp: '2025-04-23 10:30', actor: 'Gate Security', description: 'Vehicle departed godown gate. Estimated transit time: 2 hours' }
    ]
  },
  {
    id: 'D0058',
    allocationRequestId: 'REQ-2025-003',
    referenceNo: 'CHL-2025-1012',
    commodity: 'Rice',
    quantityBags: 180,
    plannedQuantityBags: 180,
    actualDispatchedBags: 180,
    dispatchDate: '24 Apr 2025',
    dispatchTime: '08:45',
    batchesUsed: ['B005'],
    batchLines: [
      {
        batchId: 'B005',
        arrivalDate: '15-02-2025',
        allocatedBags: 180,
        actualLoadedBags: 180,
        qualityStatus: 'Eligible',
        warehouse: 'Central Godown',
        binCode: 'BAY-B-01'
      }
    ],
    destination: 'FPS-103 (Itwari, Ward 14)',
    destinationContact: 'Mr. Prakash Agrawal (+91 98225 33445)',
    vehicleNo: 'MH-31-CB-7812',
    transporterName: 'Nagpur Freight Logistics',
    driverName: 'Sanjay Deshmukh',
    driverPhone: '+91 99221 66778',
    gatePassNo: 'GP-2025-10544',
    qrVerificationToken: 'BS-VERIFY-D0058-SECURE',
    remarks: 'Dispatched from staging area',
    status: 'Dispatched',
    createdBy: 'Aayush Tripathi',
    verifiedBy: 'Dr. V. K. Sharma (Assayer)',
    verifiedAt: '2025-04-24 08:15',
    dispatchedAt: '2025-04-24 08:45',
    events: [
      { id: 'ev-8', eventType: 'CREATED', timestamp: '2025-04-24 07:30', actor: 'Aayush Tripathi', description: 'Dispatch order prepared' },
      { id: 'ev-9', eventType: 'CONFIRMED', timestamp: '2025-04-24 08:45', actor: 'Aayush Tripathi', description: 'Gate pass generated and truck loaded' }
    ]
  },
  {
    id: 'D0059',
    allocationRequestId: 'REQ-2025-004',
    referenceNo: 'CHL-2025-1088',
    commodity: 'Sugar',
    quantityBags: 50,
    plannedQuantityBags: 50,
    actualDispatchedBags: 50,
    dispatchDate: '25 Apr 2025',
    dispatchTime: '09:00',
    batchesUsed: ['B006'],
    batchLines: [
      {
        batchId: 'B006',
        arrivalDate: '01-03-2025',
        allocatedBags: 50,
        actualLoadedBags: 50,
        qualityStatus: 'Eligible',
        warehouse: 'Central Godown',
        binCode: 'BAY-C-01'
      }
    ],
    destination: 'FPS-104 (Sadar Bazar)',
    destinationContact: 'Mr. Deepak Verma (+91 98230 44556)',
    vehicleNo: 'UP-16-CR-1199',
    transporterName: 'Northern Cargo Movers',
    driverName: 'Virendra Yadav',
    driverPhone: '+91 98991 77889',
    gatePassNo: 'GP-2025-10590',
    qrVerificationToken: 'BS-VERIFY-D0059-SECURE',
    remarks: 'Staging verification pending for festival stock',
    status: 'Verification Pending',
    createdBy: 'Aayush Tripathi',
    events: [
      { id: 'ev-10', eventType: 'CREATED', timestamp: '2025-04-25 08:50', actor: 'Aayush Tripathi', description: 'Staged for physical bag inspection' }
    ]
  },
  {
    id: 'D0055',
    referenceNo: 'CHL-2025-0720',
    commodity: 'Wheat',
    quantityBags: 80,
    plannedQuantityBags: 80,
    actualDispatchedBags: 80,
    receivedQuantityBags: 76,
    transitDiscrepancyBags: 4,
    dispatchDate: '15 Apr 2025',
    dispatchTime: '11:00',
    batchesUsed: ['B003'],
    batchLines: [
      {
        batchId: 'B003',
        arrivalDate: '20-01-2025',
        allocatedBags: 80,
        actualLoadedBags: 80,
        qualityStatus: 'Eligible',
        warehouse: 'Central Godown',
        binCode: 'BAY-A-03'
      }
    ],
    destination: 'FPS-105 (Kamptee Village)',
    destinationContact: 'Mr. Sunil Patil (+91 98224 55667)',
    vehicleNo: 'MH-31-DF-9012',
    transporterName: 'Local Transport Union',
    driverName: 'Santosh Shinde',
    driverPhone: '+91 98222 33441',
    gatePassNo: 'GP-2025-10311',
    qrVerificationToken: 'BS-VERIFY-D0055-SECURE',
    remarks: 'Transit shortage recorded upon delivery inspection',
    status: 'Delivery Exception',
    exceptionReason: '4 Bags damaged during transit due to tarpaulin leak during thunderstorm. Discrepancy report filed.',
    createdBy: 'Aayush Tripathi',
    dispatchedAt: '2025-04-15 11:00',
    deliveredAt: '2025-04-15 15:45',
    receivedBy: 'Sunil Patil (FPS Dealer)',
    proofOfDeliveryRef: 'POD-2025-0720-EXCEPTION',
    events: [
      { id: 'ev-11', eventType: 'CREATED', timestamp: '2025-04-15 09:00', actor: 'Aayush Tripathi', description: 'Order created' },
      { id: 'ev-12', eventType: 'CONFIRMED', timestamp: '2025-04-15 11:00', actor: 'Aayush Tripathi', description: 'Dispatched 80 bags' },
      { id: 'ev-13', eventType: 'EXCEPTION', timestamp: '2025-04-15 15:45', actor: 'Sunil Patil', description: 'Received 76 Bags. 4 bags damaged in rain. Exception recorded.' }
    ]
  }
];

export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-1',
    type: 'amber',
    title: 'Batch B004 is on Hold (Quality Inspection Pending)',
    date: '05 Feb 2025',
    batchId: 'B004',
    isRead: false
  },
  {
    id: 'alt-2',
    type: 'red',
    title: 'Batch B007 has been Rejected',
    date: '10 Mar 2025',
    batchId: 'B007',
    isRead: false
  },
  {
    id: 'alt-3',
    type: 'blue',
    title: 'Batch B002 is 80% aged (Consider dispatch soon)',
    date: '10 Jan 2025',
    batchId: 'B002',
    isRead: false
  }
];

export const FPS_DESTINATIONS = [
  'FPS-101 (Sitabuldi, Ward 4)',
  'FPS-102 (Dharampeth, Ward 9)',
  'FPS-103 (Itwari, Ward 14)',
  'FPS-104 (Sadar Bazar)',
  'FPS-105 (Kamptee Village)'
];

export const INITIAL_INSPECTIONS: QualityInspectionRecord[] = [
  {
    id: 'INSP-B001-1',
    batchId: 'B001',
    commodity: 'Wheat',
    sampleQuantityKg: 10.0,
    moisturePercent: 10.4,
    hasInfestation: false,
    foreignMatterPercent: 0.4,
    packagingCondition: 'Good',
    visualObservation: 'Clear amber grain luster, standard size',
    decision: 'Approved',
    decisionReason: 'Conforms strictly to BIS IS 14887:2014 & FCI uniform specifications.',
    assayerName: 'Dr. V. K. Sharma (Senior Quality Assayer)',
    assayerRole: 'Senior Assayer',
    timestamp: '2025-01-01 14:30',
    labCertificateRef: 'FCI-QC-2025-0891'
  },
  {
    id: 'INSP-B002-1',
    batchId: 'B002',
    commodity: 'Wheat',
    sampleQuantityKg: 10.0,
    moisturePercent: 11.2,
    hasInfestation: false,
    foreignMatterPercent: 0.6,
    packagingCondition: 'Good',
    visualObservation: 'Standard Sona Moti grade, sound grains',
    decision: 'Approved',
    decisionReason: 'Moisture well below 12.0% FCI threshold; sound grain count >98%.',
    assayerName: 'Dr. V. K. Sharma (Senior Quality Assayer)',
    assayerRole: 'Senior Assayer',
    timestamp: '2025-01-10 16:15',
    labCertificateRef: 'FCI-QC-2025-1044'
  },
  {
    id: 'INSP-B003-1',
    batchId: 'B003',
    commodity: 'Wheat',
    sampleQuantityKg: 10.0,
    moisturePercent: 11.2,
    hasInfestation: false,
    foreignMatterPercent: 0.5,
    packagingCondition: 'Good',
    visualObservation: 'Standard golden grains, dry sound texture',
    decision: 'Approved',
    decisionReason: 'All physical assays within BIS Class-I tolerances.',
    assayerName: 'Sunita Rao (Lead Food Inspector)',
    assayerRole: 'Lead Assayer',
    timestamp: '2025-01-20 11:45',
    labCertificateRef: 'QC-HAR-2025-031'
  },
  {
    id: 'INSP-B004-1',
    batchId: 'B004',
    commodity: 'Rice',
    sampleQuantityKg: 12.0,
    moisturePercent: 15.8,
    hasInfestation: false,
    foreignMatterPercent: 1.8,
    packagingCondition: 'Good',
    visualObservation: 'Excess moisture detected upon sensor probe; grains soft and cool to touch.',
    decision: 'Hold',
    decisionReason: 'Moisture content measured at 15.8% exceeds FCI maximum permissible threshold of 14.0%. Held for aeration & re-assay.',
    assayerName: 'Sunita Rao (Lead Food Inspector)',
    assayerRole: 'Lead Assayer',
    timestamp: '2025-02-05 10:20',
    labCertificateRef: 'FCI-QC-2025-1482'
  },
  {
    id: 'INSP-B007-1',
    batchId: 'B007',
    commodity: 'Wheat',
    sampleQuantityKg: 10.0,
    moisturePercent: 16.5,
    hasInfestation: true,
    foreignMatterPercent: 3.2,
    packagingCondition: 'Damaged',
    visualObservation: 'Live Sitophilus oryzae (weevils) detected under sieve; moldy odor, damp bagging.',
    decision: 'Rejected',
    decisionReason: 'Active weevil infestation detected; moisture 16.5% exceeds statutory limit. Mandatory rejection & quarantine to Bay Q.',
    assayerName: 'Dr. V. K. Sharma (Senior Quality Assayer)',
    assayerRole: 'Senior Assayer',
    timestamp: '2025-03-10 09:30',
    labCertificateRef: 'FCI-QC-2025-2190'
  }
];

export const INITIAL_ALLOCATION_REQUESTS: AllocationRequest[] = [
  {
    id: 'REQ-2025-001',
    commodity: 'Wheat',
    requiredQuantityBags: 120,
    destination: 'FPS-101 (Sitabuldi, Ward 4)',
    requestedDate: '2025-04-18',
    referenceNo: 'CHL-2025-0891',
    notes: 'Urgent buffer stock lifting for Ward 4 fair price shops',
    status: 'Dispatched',
    allocatedBags: 120,
    shortfallBags: 0,
    createdBy: 'Aayush Tripathi',
    createdAt: '2025-04-18 09:30',
    dispatchedAt: '2025-04-20 14:15',
    dispatchId: 'D0056',
    allocatedBatches: [
      {
        batchId: 'B001',
        arrivalDate: '01-01-2025',
        qualityStatus: 'Eligible',
        availableBeforeBags: 100,
        allocatedBags: 100,
        remainingBags: 0,
        fifoRank: 1,
        selectionReason: 'Rank 1: Oldest eligible stock in godown (Arrived 01-01-2025, 296d aged). Fully consumed.'
      },
      {
        batchId: 'B002',
        arrivalDate: '10-01-2025',
        qualityStatus: 'Eligible',
        availableBeforeBags: 150,
        allocatedBags: 20,
        remainingBags: 130,
        fifoRank: 2,
        selectionReason: 'Rank 2: Second oldest eligible stock (Arrived 10-01-2025, 287d aged). Partial allocation.'
      }
    ]
  },
  {
    id: 'REQ-2025-002',
    commodity: 'Wheat',
    requiredQuantityBags: 100,
    destination: 'FPS-102 (Dharampeth, Ward 9)',
    requestedDate: '2025-04-22',
    referenceNo: 'CHL-2025-0945',
    notes: 'Regular NFSA monthly ration quota for Ward 9',
    status: 'Allocated',
    allocatedBags: 100,
    shortfallBags: 0,
    createdBy: 'Aayush Tripathi',
    createdAt: '2025-04-22 10:15',
    allocatedBatches: [
      {
        batchId: 'B002',
        arrivalDate: '10-01-2025',
        qualityStatus: 'Eligible',
        availableBeforeBags: 130,
        allocatedBags: 100,
        remainingBags: 30,
        fifoRank: 1,
        selectionReason: 'Rank 1: Oldest eligible stock with available unreserved balance (Arrived 10-01-2025).'
      }
    ]
  },
  {
    id: 'REQ-2025-003',
    commodity: 'Rice',
    requiredQuantityBags: 250,
    destination: 'FPS-103 (Itwari, Ward 14)',
    requestedDate: '2025-04-24',
    referenceNo: 'CHL-2025-1012',
    notes: 'Partial allocation - 120 Bags of Batch B004 held for laboratory re-test',
    status: 'Partially Allocated',
    allocatedBags: 180,
    shortfallBags: 70,
    createdBy: 'Aayush Tripathi',
    createdAt: '2025-04-24 11:00',
    allocatedBatches: [
      {
        batchId: 'B005',
        arrivalDate: '15-02-2025',
        qualityStatus: 'Eligible',
        availableBeforeBags: 180,
        allocatedBags: 180,
        remainingBags: 0,
        fifoRank: 1,
        selectionReason: 'Rank 1: Oldest eligible stock. (Batch B004 arrived 05-02-2025 skipped due to Quality Hold).'
      }
    ]
  },
  {
    id: 'REQ-2025-004',
    commodity: 'Sugar',
    requiredQuantityBags: 50,
    destination: 'FPS-104 (Sadar Bazar)',
    requestedDate: '2025-04-25',
    referenceNo: 'CHL-2025-1088',
    notes: 'Special festival buffer allocation awaiting Food Officer sign-off',
    status: 'Pending Approval',
    allocatedBags: 50,
    shortfallBags: 0,
    createdBy: 'Aayush Tripathi',
    createdAt: '2025-04-25 08:45',
    allocatedBatches: [
      {
        batchId: 'B006',
        arrivalDate: '01-03-2025',
        qualityStatus: 'Eligible',
        availableBeforeBags: 80,
        allocatedBags: 50,
        remainingBags: 30,
        fifoRank: 1,
        selectionReason: 'Rank 1: Oldest eligible stock (Arrived 01-03-2025, 237d aged).'
      }
    ]
  }
];

export const INITIAL_BINS: BinLocation[] = [
  { binCode: 'BAY-A-RACK-01-BIN-01', godown: 'Central Godown', section: 'Bay A', rack: '01', bin: '01', maxCapacityBags: 400, currentBags: 250, commodity: 'Wheat', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-A-RACK-01-BIN-02', godown: 'Central Godown', section: 'Bay A', rack: '01', bin: '02', maxCapacityBags: 400, currentBags: 200, commodity: 'Wheat', zoneType: 'BULK' },
  { binCode: 'BAY-A-RACK-02-BIN-01', godown: 'Central Godown', section: 'Bay A', rack: '02', bin: '01', maxCapacityBags: 400, currentBags: 160, commodity: 'Wheat', zoneType: 'BULK' },
  { binCode: 'BAY-A-RACK-02-BIN-02', godown: 'Central Godown', section: 'Bay A', rack: '02', bin: '02', maxCapacityBags: 400, currentBags: 0, commodity: 'Wheat', zoneType: 'BULK' },
  { binCode: 'BAY-B-RACK-01-BIN-01', godown: 'Central Godown', section: 'Bay B', rack: '01', bin: '01', maxCapacityBags: 400, currentBags: 180, commodity: 'Rice', zoneType: 'PICK_FACE' },
  { binCode: 'BAY-B-RACK-01-BIN-02', godown: 'Central Godown', section: 'Bay B', rack: '01', bin: '02', maxCapacityBags: 400, currentBags: 120, commodity: 'Rice', zoneType: 'BULK' },
  { binCode: 'BAY-B-RACK-02-BIN-01', godown: 'Central Godown', section: 'Bay B', rack: '02', bin: '01', maxCapacityBags: 400, currentBags: 0, commodity: 'Rice', zoneType: 'BULK' },
  { binCode: 'BAY-C-RACK-01-BIN-01', godown: 'Central Godown', section: 'Bay C', rack: '01', bin: '01', maxCapacityBags: 300, currentBags: 80, commodity: 'Sugar', zoneType: 'BULK' },
  { binCode: 'BAY-C-RACK-01-BIN-02', godown: 'Central Godown', section: 'Bay C', rack: '01', bin: '02', maxCapacityBags: 300, currentBags: 0, commodity: 'Pulses', zoneType: 'BULK' },
  { binCode: 'QUAR-01-BIN-01', godown: 'Central Godown', section: 'Quarantine', rack: '01', bin: '01', maxCapacityBags: 200, currentBags: 140, commodity: 'Wheat', zoneType: 'QUARANTINE' }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'SM-001', timestamp: '2025-01-01 10:30', createdAt: '2025-01-01 10:30', movementType: 'RECEIPT', batchId: 'B001', commodity: 'Wheat', quantity: 100, qtyDeltaBags: 100, balanceAfterBags: 100, fromBin: 'GATE-01', toBin: 'BAY-A-RACK-01-BIN-01', sourceLocation: 'GATE-01', targetLocation: 'BAY-A-RACK-01-BIN-01', referenceId: 'CHL-INW-001', performedBy: 'Inspector R. Sharma', createdBy: 'Inspector R. Sharma', reason: 'Initial intake arrival sound condition' },
  { id: 'SM-002', timestamp: '2025-01-10 11:15', createdAt: '2025-01-10 11:15', movementType: 'RECEIPT', batchId: 'B002', commodity: 'Wheat', quantity: 150, qtyDeltaBags: 150, balanceAfterBags: 250, fromBin: 'GATE-01', toBin: 'BAY-A-RACK-01-BIN-01', sourceLocation: 'GATE-01', targetLocation: 'BAY-A-RACK-01-BIN-01', referenceId: 'CHL-INW-002', performedBy: 'Inspector R. Sharma', createdBy: 'Inspector R. Sharma', reason: 'Fresh intake arrival' },
  { id: 'SM-003', timestamp: '2025-01-20 14:00', createdAt: '2025-01-20 14:00', movementType: 'RECEIPT', batchId: 'B003', commodity: 'Wheat', quantity: 200, qtyDeltaBags: 200, balanceAfterBags: 200, fromBin: 'GATE-01', toBin: 'BAY-A-RACK-01-BIN-02', sourceLocation: 'GATE-01', targetLocation: 'BAY-A-RACK-01-BIN-02', referenceId: 'CHL-INW-003', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Haryana Agro Pool consignment' },
  { id: 'SM-004', timestamp: '2025-02-05 09:45', createdAt: '2025-02-05 09:45', movementType: 'RECEIPT', batchId: 'B004', commodity: 'Rice', quantity: 120, qtyDeltaBags: 120, balanceAfterBags: 120, fromBin: 'GATE-01', toBin: 'BAY-B-RACK-01-BIN-02', sourceLocation: 'GATE-01', targetLocation: 'BAY-B-RACK-01-BIN-02', referenceId: 'CHL-INW-004', performedBy: 'Inspector R. Sharma', createdBy: 'Inspector R. Sharma', reason: 'Chhattisgarh State Pool arrival' },
  { id: 'SM-005', timestamp: '2025-02-15 13:20', createdAt: '2025-02-15 13:20', movementType: 'RECEIPT', batchId: 'B005', commodity: 'Rice', quantity: 180, qtyDeltaBags: 180, balanceAfterBags: 180, fromBin: 'GATE-01', toBin: 'BAY-B-RACK-01-BIN-01', sourceLocation: 'GATE-01', targetLocation: 'BAY-B-RACK-01-BIN-01', referenceId: 'CHL-INW-005', performedBy: 'Inspector R. Sharma', createdBy: 'Inspector R. Sharma', reason: 'Andhra Millers Co-op arrival' },
  { id: 'SM-006', timestamp: '2025-02-28 16:30', createdAt: '2025-02-28 16:30', movementType: 'RECEIPT', batchId: 'B006', commodity: 'Wheat', quantity: 160, qtyDeltaBags: 160, balanceAfterBags: 160, fromBin: 'GATE-01', toBin: 'BAY-A-RACK-02-BIN-01', sourceLocation: 'GATE-01', targetLocation: 'BAY-A-RACK-02-BIN-01', referenceId: 'CHL-INW-006', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'MP State Supplies arrival' },
  { id: 'SM-007', timestamp: '2025-03-10 11:00', createdAt: '2025-03-10 11:00', movementType: 'RELOCATION', batchId: 'B007', commodity: 'Wheat', quantity: 140, qtyDeltaBags: 0, balanceAfterBags: 140, fromBin: 'BAY-A-RACK-02-BIN-02', toBin: 'QUAR-01-BIN-01', sourceLocation: 'BAY-A-RACK-02-BIN-02', targetLocation: 'QUAR-01-BIN-01', referenceId: 'QUAR-RELOC-01', performedBy: 'Quality Officer Verma', createdBy: 'Quality Officer Verma', reason: 'Transferred to quarantine due to weevil infestation' },
  { id: 'SM-008', timestamp: '2025-04-15 11:00', createdAt: '2025-04-15 11:00', movementType: 'DISPATCH', batchId: 'B003', commodity: 'Wheat', quantity: 80, qtyDeltaBags: -80, balanceAfterBags: 120, fromBin: 'BAY-A-RACK-01-BIN-02', toBin: 'FPS-105 (Kamptee Village)', sourceLocation: 'BAY-A-RACK-01-BIN-02', targetLocation: 'FPS-105 (Kamptee Village)', referenceId: 'D0055', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Outbound dispatch order D0055' },
  { id: 'SM-009', timestamp: '2025-04-20 14:15', createdAt: '2025-04-20 14:15', movementType: 'DISPATCH', batchId: 'B001', commodity: 'Wheat', quantity: 100, qtyDeltaBags: -100, balanceAfterBags: 0, fromBin: 'BAY-A-RACK-01-BIN-01', toBin: 'FPS-101 (Sitabuldi, Ward 4)', sourceLocation: 'BAY-A-RACK-01-BIN-01', targetLocation: 'FPS-101 (Sitabuldi, Ward 4)', referenceId: 'D0056', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Outbound dispatch order D0056 (Batch exhausted)' },
  { id: 'SM-010', timestamp: '2025-04-20 14:15', createdAt: '2025-04-20 14:15', movementType: 'DISPATCH', batchId: 'B002', commodity: 'Wheat', quantity: 20, qtyDeltaBags: -20, balanceAfterBags: 130, fromBin: 'BAY-A-RACK-01-BIN-01', toBin: 'FPS-101 (Sitabuldi, Ward 4)', sourceLocation: 'BAY-A-RACK-01-BIN-01', targetLocation: 'FPS-101 (Sitabuldi, Ward 4)', referenceId: 'D0056', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Outbound dispatch order D0056 (Partial allocation)' },
  { id: 'SM-011', timestamp: '2025-04-23 10:30', createdAt: '2025-04-23 10:30', movementType: 'DISPATCH', batchId: 'B002', commodity: 'Wheat', quantity: 100, qtyDeltaBags: -100, balanceAfterBags: 30, fromBin: 'BAY-A-RACK-01-BIN-01', toBin: 'FPS-102 (Dharampeth, Ward 9)', sourceLocation: 'BAY-A-RACK-01-BIN-01', targetLocation: 'FPS-102 (Dharampeth, Ward 9)', referenceId: 'D0057', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Outbound dispatch order D0057' },
  { id: 'SM-012', timestamp: '2025-04-24 08:45', createdAt: '2025-04-24 08:45', movementType: 'DISPATCH', batchId: 'B005', commodity: 'Rice', quantity: 180, qtyDeltaBags: -180, balanceAfterBags: 0, fromBin: 'BAY-B-RACK-01-BIN-01', toBin: 'FPS-103 (Itwari, Ward 14)', sourceLocation: 'BAY-B-RACK-01-BIN-01', targetLocation: 'FPS-103 (Itwari, Ward 14)', referenceId: 'D0058', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Outbound dispatch order D0058 (Batch exhausted)' },
  { id: 'SM-013', timestamp: '2025-04-25 09:00', createdAt: '2025-04-25 09:00', movementType: 'DISPATCH', batchId: 'B006', commodity: 'Sugar', quantity: 50, qtyDeltaBags: -50, balanceAfterBags: 30, fromBin: 'BAY-C-RACK-01-BIN-01', toBin: 'FPS-104 (Sadar Bazar)', sourceLocation: 'BAY-C-RACK-01-BIN-01', targetLocation: 'FPS-104 (Sadar Bazar)', referenceId: 'D0059', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'Outbound dispatch order D0059 (Verification pending staging)' },
  { id: 'SM-014', timestamp: '2025-10-24 08:00', createdAt: '2025-10-24 08:00', movementType: 'RECEIPT', batchId: 'B008', commodity: 'Wheat', quantity: 200, qtyDeltaBags: 200, balanceAfterBags: 200, fromBin: 'GATE-01', toBin: 'GATE-HOLD-01', sourceLocation: 'GATE-01', targetLocation: 'GATE-HOLD-01', referenceId: 'CHL-INW-008', performedBy: 'A. Tripathi', createdBy: 'A. Tripathi', reason: 'New intake consignment - awaiting godown bin assignment' }
];

