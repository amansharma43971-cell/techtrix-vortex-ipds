import { describe, it, expect } from 'vitest';
import { allocateFifo, BatchRow } from '../src/services/fifoEngine.js';

describe('FIFO Allocation Engine', () => {
  const seedBatches: BatchRow[] = [
    { id: 'B001', commodity_id: 'comm-wheat', arrival_date: '2025-01-01', total_qty: 100, available_qty: 100, quality_status: 'Eligible' },
    { id: 'B002', commodity_id: 'comm-wheat', arrival_date: '2025-01-10', total_qty: 150, available_qty: 150, quality_status: 'Eligible' },
    { id: 'B003', commodity_id: 'comm-wheat', arrival_date: '2025-01-20', total_qty: 200, available_qty: 200, quality_status: 'Eligible' },
    { id: 'B004', commodity_id: 'comm-rice', arrival_date: '2025-02-05', total_qty: 120, available_qty: 120, quality_status: 'Hold', hold_reason: 'Moisture' },
    { id: 'B005', commodity_id: 'comm-rice', arrival_date: '2025-02-15', total_qty: 180, available_qty: 180, quality_status: 'Eligible' },
    { id: 'B006', commodity_id: 'comm-wheat', arrival_date: '2025-02-28', total_qty: 160, available_qty: 160, quality_status: 'Eligible' },
    { id: 'B007', commodity_id: 'comm-wheat', arrival_date: '2025-03-10', total_qty: 140, available_qty: 140, quality_status: 'Rejected', hold_reason: 'Weevils' },
  ];

  it('correctly reproduces exact allocation: 120 Wheat -> B001: 100, B002: 20, B003: 0', () => {
    const plan = allocateFifo(seedBatches, 'comm-wheat', 120);

    expect(plan.totalAllocatedBags).toBe(120);
    expect(plan.isShortfall).toBe(false);
    expect(plan.allocations).toHaveLength(2);

    expect(plan.allocations[0].batchId).toBe('B001');
    expect(plan.allocations[0].allocatedBags).toBe(100);
    expect(plan.allocations[0].remainingBags).toBe(0);

    expect(plan.allocations[1].batchId).toBe('B002');
    expect(plan.allocations[1].allocatedBags).toBe(20);
    expect(plan.allocations[1].remainingBags).toBe(130);

    expect(plan.nextInQueue?.batchId).toBe('B003');
    expect(plan.nextInQueue?.allocatedBags).toBe(0);
    expect(plan.nextInQueue?.remainingBags).toBe(200);
  });

  it('strictly excludes Hold and Rejected batches from allocation', () => {
    const ricePlan = allocateFifo(seedBatches, 'comm-rice', 200);
    const holdBatchAllocated = ricePlan.allocations.some(a => a.batchId === 'B004');
    expect(holdBatchAllocated).toBe(false);

    const wheatPlan = allocateFifo(seedBatches, 'comm-wheat', 700);
    const rejectedBatchAllocated = wheatPlan.allocations.some(a => a.batchId === 'B007');
    expect(rejectedBatchAllocated).toBe(false);
  });

  it('accurately identifies shortfall when requested > eligible stock', () => {
    // Total eligible wheat = 100 + 150 + 200 + 160 = 610
    const plan = allocateFifo(seedBatches, 'comm-wheat', 650);

    expect(plan.isShortfall).toBe(true);
    expect(plan.shortfallBags).toBe(40);
    expect(plan.totalAllocatedBags).toBe(610);
  });

  it('deterministically breaks ties on equal arrival dates by batch ID ascending', () => {
    const tieBatches: BatchRow[] = [
      { id: 'B010', commodity_id: 'comm-wheat', arrival_date: '2025-05-01', total_qty: 50, available_qty: 50, quality_status: 'Eligible' },
      { id: 'B009', commodity_id: 'comm-wheat', arrival_date: '2025-05-01', total_qty: 50, available_qty: 50, quality_status: 'Eligible' },
    ];
    const plan = allocateFifo(tieBatches, 'comm-wheat', 60);

    expect(plan.allocations[0].batchId).toBe('B009');
    expect(plan.allocations[1].batchId).toBe('B010');
  });
});

