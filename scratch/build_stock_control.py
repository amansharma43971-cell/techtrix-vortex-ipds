# Modular Stock Control Builder for BhandarSetu
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check if Part 1 already applied
if 'damagedStock:' not in html:
    target_state_anchor = "      selectedTaskId: null,"
    assert target_state_anchor in html, "Anchor selectedTaskId not found in appState"

    stock_control_state = """      selectedTaskId: null,
      activeStockControlDrawer: null,

      // Stock Control Filters
      damagedFilterStatus: 'ALL',
      damagedSearchQuery: '',
      clearanceFilterStatus: 'ALL',
      clearanceSearchQuery: '',
      transferFilterStatus: 'ALL',
      transferSearchQuery: '',
      verificationFilterStatus: 'ALL',
      disposalFilterStatus: 'ALL',

      damagedStock: [
        {
          id: 'DMG-2025-001',
          batchId: 'B004',
          commodity: 'Rice',
          warehouseId: 'GDN-NGP-01',
          godownName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          binCode: 'BAY-NGP-01-BIN-04',
          affectedQuantity: 25,
          unit: 'Bags',
          damageReason: 'MOISTURE',
          damageReasonLabel: 'High Moisture & Water Condensation',
          dateReported: '2025-10-23 10:30',
          reportedById: 'u-admin-ngp',
          reportedByName: 'Ramesh Patil',
          evidenceNotes: 'Condensation detected on pallet bottom row. Lab sample measured 15.2% wt moisture (threshold 14.0%).',
          inspectionFindings: '25 bags quarantined in Bay 4. Aeration and re-sampling recommended under SOP-QA-2025.',
          status: 'ON_HOLD',
          assignedTaskId: 'TSK-2025-001',
          resolutionHistory: [
            { status: 'REPORTED', timestamp: '2025-10-23 10:30', user: 'Ramesh Patil', notes: 'Initial damage alert logged during stack walk-through.' },
            { status: 'ON_HOLD', timestamp: '2025-10-23 11:00', user: 'Aayush Tripathi', notes: 'District Manager placed 25 bags on quarantine hold. Blocked from FIFO allocation.' }
          ]
        },
        {
          id: 'DMG-2025-002',
          batchId: 'B007',
          commodity: 'Rice',
          warehouseId: 'GDN-NGP-01',
          godownName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          binCode: 'BAY-NGP-01-BIN-07',
          affectedQuantity: 40,
          unit: 'Bags',
          damageReason: 'PESTS',
          damageReasonLabel: 'Live Weevil Infestation Outbreak',
          dateReported: '2025-10-22 14:15',
          reportedById: 'u-quality-01',
          reportedByName: 'Vikram Joshi',
          evidenceNotes: 'Live pest count 18 per kg with hollowed grain dust. Fumigation ineffective.',
          inspectionFindings: 'Stock certified completely unfit for human or livestock consumption. Scientific disposal required.',
          status: 'DISPOSAL_REQUESTED',
          assignedTaskId: null,
          resolutionHistory: [
            { status: 'REPORTED', timestamp: '2025-10-22 14:15', user: 'Vikram Joshi', notes: 'Quality inspection failure recorded.' },
            { status: 'DISPOSAL_REQUESTED', timestamp: '2025-10-23 09:30', user: 'Vikram Joshi', notes: 'Disposal request DSP-2025-001 submitted to Manager.' }
          ]
        },
        {
          id: 'DMG-2025-003',
          batchId: 'B010',
          commodity: 'Rice',
          warehouseId: 'GDN-PUN-02',
          godownName: 'Pune Buffer Depot (Hadapsar Central)',
          binCode: 'BAY-PUN-01-BIN-02',
          affectedQuantity: 10,
          unit: 'Bags',
          damageReason: 'PACKAGING_FAILURE',
          damageReasonLabel: 'Torn Jute Bags During Handling',
          dateReported: '2025-10-24 08:00',
          reportedById: 'u-admin-pun',
          reportedByName: 'Suresh Shinde',
          evidenceNotes: '10 bags snagged on forklift tine during intake restacking. Grain sound but re-bagging required.',
          inspectionFindings: 'Grain sound and clean. Re-bagging and re-stitching authorized.',
          status: 'RECHECK_REQUIRED',
          assignedTaskId: null,
          resolutionHistory: [
            { status: 'REPORTED', timestamp: '2025-10-24 08:00', user: 'Suresh Shinde', notes: 'Packaging tears reported during stack movement.' }
          ]
        }
      ],

      clearanceOrders: [
        {
          id: 'CLR-2025-001',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          godownBay: 'BAY-NGP-01-BIN-04',
          reason: 'DAMAGED_SEGREGATION',
          reasonLabel: 'Damaged & Held Stock Segregation',
          priority: 'HIGH',
          deadline: '2025-10-25 18:00',
          assignedToId: 'u-admin-ngp',
          assignedToName: 'Ramesh Patil',
          instructions: 'Relocate all 25 held bags of Batch B004 from Bay 4 to Quarantine Isolation Stack Q-1. Deep clean and fumigate Bay 4 floor.',
          totalBatches: 1,
          totalQuantity: 25,
          movedQuantity: 0,
          status: 'IN_PROGRESS',
          createdAt: '2025-10-23 11:30',
          createdBy: 'Aayush Tripathi',
          batches: [
            {
              batchId: 'B004',
              commodity: 'Rice',
              quantity: 25,
              resolution: 'MOVE_TO_BAY',
              destinationBay: 'BAY-NGP-QUARANTINE-01',
              movedQuantity: 0,
              status: 'PENDING'
            }
          ]
        },
        {
          id: 'CLR-2025-002',
          warehouseId: 'GDN-PUN-02',
          warehouseName: 'Pune Buffer Depot (Hadapsar Central)',
          godownBay: 'BAY-PUN-01-BIN-01',
          reason: 'SPACE_INTAKE',
          reasonLabel: 'Space Clearance for Seasonal Wheat Intake',
          priority: 'NORMAL',
          deadline: '2025-10-26 17:00',
          assignedToId: 'u-admin-pun',
          assignedToName: 'Suresh Shinde',
          instructions: 'Move sound stock in Bay 1 to high-density racks in Bay 3 ahead of 400 MT winter procurement arrival.',
          totalBatches: 1,
          totalQuantity: 50,
          movedQuantity: 50,
          status: 'COMPLETED',
          createdAt: '2025-10-22 09:00',
          createdBy: 'Aayush Tripathi',
          batches: [
            {
              batchId: 'B009',
              commodity: 'Wheat',
              quantity: 50,
              resolution: 'MOVE_TO_BAY',
              destinationBay: 'BAY-PUN-01-BIN-03',
              movedQuantity: 50,
              status: 'COMPLETED'
            }
          ]
        }
      ],

      stockTransfers: [
        {
          id: 'TRF-2025-001',
          sourceWarehouseId: 'GDN-NGP-01',
          sourceWarehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          sourceBay: 'BAY-NGP-01-BIN-01',
          destWarehouseId: 'GDN-PUN-02',
          destWarehouseName: 'Pune Buffer Depot (Hadapsar Central)',
          destBay: 'BAY-PUN-01-BIN-03',
          batchId: 'B001',
          commodity: 'Wheat',
          quantity: 50,
          unit: 'Bags',
          reason: 'Inter-depot buffer replenishment for Western Maharashtra ration deficit',
          requestedById: 'u-manager-01',
          requestedByName: 'Aayush Tripathi',
          assignedOperatorId: 'u-admin-ngp',
          assignedOperatorName: 'Ramesh Patil',
          approvalStatus: 'APPROVED',
          approvedById: 'u-manager-01',
          approvedAt: '2025-10-23 12:00',
          dispatchedAt: '2025-10-24 07:30',
          dispatchConfirmedBy: 'Ramesh Patil',
          vehicleNo: 'MH-31-CB-9021',
          driverName: 'Mohan Lal',
          receivedAt: null,
          receivedBy: null,
          status: 'IN_TRANSIT',
          remarks: 'Consignment dispatched under GPS e-Lock #9921. Gate pass GP-TRF-001 issued.'
        }
      ],

      stockVerifications: [
        {
          id: 'VER-2025-001',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          godownBay: 'BAY-NGP-01-BIN-01',
          commodity: 'Wheat',
          scheduledDate: '2025-10-24',
          countedById: 'u-admin-ngp',
          countedByName: 'Ramesh Patil',
          verifiedById: 'u-manager-01',
          verifiedByName: 'Aayush Tripathi',
          status: 'DISCREPANCY_DETECTED',
          createdAt: '2025-10-24 08:00',
          items: [
            {
              batchId: 'B001',
              commodity: 'Wheat',
              systemSnapshotBags: 120,
              physicallyCountedBags: 118,
              differenceBags: -2,
              variancePct: -1.67,
              discrepancyReason: '2 torn bags burst during pallet restacking. Grain salvaged into salvage bin #SB-01.',
              status: 'PENDING_MANAGER_APPROVAL',
              notes: 'Salvage grain weighed 96kg net.'
            }
          ],
          managerDecision: null
        },
        {
          id: 'VER-2025-002',
          warehouseId: 'GDN-PUN-02',
          warehouseName: 'Pune Buffer Depot (Hadapsar Central)',
          godownBay: 'BAY-PUN-01-BIN-01',
          commodity: 'Wheat',
          scheduledDate: '2025-10-23',
          countedById: 'u-admin-pun',
          countedByName: 'Suresh Shinde',
          verifiedById: 'u-manager-01',
          verifiedByName: 'Aayush Tripathi',
          status: 'RESOLVED',
          createdAt: '2025-10-23 10:00',
          items: [
            {
              batchId: 'B009',
              commodity: 'Wheat',
              systemSnapshotBags: 180,
              physicallyCountedBags: 180,
              differenceBags: 0,
              variancePct: 0.0,
              discrepancyReason: null,
              status: 'MATCHED',
              notes: 'Physical stack count exactly reconciles with system register.'
            }
          ],
          managerDecision: 'APPROVED'
        }
      ],

      disposalRequests: [
        {
          id: 'DSP-2025-001',
          batchId: 'B007',
          commodity: 'Rice',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          godownBay: 'BAY-NGP-01-BIN-07',
          quantity: 40,
          unit: 'Bags',
          inspectionRef: 'INS-2025-007',
          reason: 'Severe pest damage and mold infestation certified unrecoverable',
          evidenceNotes: 'BIS/FCI Lab certificate #QL-9081 declared stock unfit for public consumption.',
          requestedById: 'u-quality-01',
          requestedByName: 'Vikram Joshi (Quality Officer)',
          approvedById: 'u-manager-01',
          approvedByName: 'Aayush Tripathi (District Manager)',
          approvedAt: '2025-10-23 15:00',
          status: 'APPROVED',
          disposalMethod: 'Certified Scientific Composting & Biogas Facility',
          disposalCertificateRef: null,
          executedAt: null,
          executedBy: null,
          createdAt: '2025-10-23 09:30',
          remarks: 'Approved by District Godown Manager. Municipal bio-methanation lift scheduled for 26 Oct.'
        }
      ],"""

    html = html.replace(target_state_anchor, stock_control_state, 1)
    print("Part 1: Seed state applied to appState.")

# Ensure batches have damagedQuantity property
html = re.sub(r"id:\s*'B004',\s*commodity:\s*'Rice',", "id: 'B004', commodity: 'Rice', damagedQuantity: 25,", html)
html = re.sub(r"id:\s*'B007',\s*commodity:\s*'Rice',", "id: 'B007', commodity: 'Rice', damagedQuantity: 40,", html)
html = re.sub(r"id:\s*'B010',\s*commodity:\s*'Rice',", "id: 'B010', commodity: 'Rice', damagedQuantity: 10,", html)

# Update allocateFifo to strictly deduct damaged & in-transit quantities
old_fifo_math = """      const totalEligible = eligible.reduce((s, b) => s + b.availableQuantity, 0);"""
new_fifo_math = """      // Deduct damaged, held, or in-transit stock so sound batches are never starved or corrupted
      const totalEligible = eligible.reduce((s, b) => {
        const soundBags = Math.max(0, (b.availableQuantity || 0) - (b.damagedQuantity || 0) - (b.inTransitQuantity || 0));
        return s + soundBags;
      }, 0);"""

if old_fifo_math in html:
    html = html.replace(old_fifo_math, new_fifo_math, 1)

old_fifo_take = """          const take = Math.min(rem, b.availableQuantity);"""
new_fifo_take = """          const soundAvailable = Math.max(0, (b.availableQuantity || 0) - (b.damagedQuantity || 0) - (b.inTransitQuantity || 0));
          if (soundAvailable <= 0) continue;
          const take = Math.min(rem, soundAvailable);"""

if old_fifo_take in html:
    html = html.replace(old_fifo_take, new_fifo_take, 1)
    print("Part 1b: FIFO allocation logic updated with damaged stock isolation.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved Part 1 updates.")

