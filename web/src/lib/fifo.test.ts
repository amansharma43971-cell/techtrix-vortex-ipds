import { calculateFifoAllocation, getNextToDispatchBatchId, runSmartFifoAllocation } from './fifo';
import { BatchItem } from '../data/types';

// Seed batches for unit testing
const testBatches: BatchItem[] = [
  { id: 'B001', commodity: 'Wheat', arrivalDate: '01-01-2025', totalQuantity: 100, availableQuantity: 100, qualityStatus: 'Eligible' },
  { id: 'B002', commodity: 'Wheat', arrivalDate: '10-01-2025', totalQuantity: 150, availableQuantity: 150, qualityStatus: 'Eligible' },
  { id: 'B003', commodity: 'Wheat', arrivalDate: '20-01-2025', totalQuantity: 200, availableQuantity: 200, qualityStatus: 'Eligible' },
  { id: 'B004', commodity: 'Rice', arrivalDate: '05-02-2025', totalQuantity: 120, availableQuantity: 120, qualityStatus: 'Hold' },
  { id: 'B005', commodity: 'Rice', arrivalDate: '15-02-2025', totalQuantity: 180, availableQuantity: 180, qualityStatus: 'Eligible' },
  { id: 'B006', commodity: 'Wheat', arrivalDate: '28-02-2025', totalQuantity: 160, availableQuantity: 160, qualityStatus: 'Eligible' },
  { id: 'B007', commodity: 'Wheat', arrivalDate: '10-03-2025', totalQuantity: 140, availableQuantity: 140, qualityStatus: 'Rejected' },
];

export function runFifoUnitTests(): { name: string; passed: boolean; message?: string }[] {
  const results: { name: string; passed: boolean; message?: string }[] = [];

  // Test 1: Exact allocation reproduction: 120 Wheat -> B001: 100, B002: 20, B003: 0
  try {
    const res = calculateFifoAllocation(testBatches, 'Wheat', 120);
    const b1 = res.allocations.find(a => a.batchId === 'B001');
    const b2 = res.allocations.find(a => a.batchId === 'B002');
    const next = res.nextInQueue;

    const pass = 
      res.totalAllocatedBags === 120 &&
      !res.isShortfall &&
      b1?.allocatedBags === 100 &&
      b1?.remainingBags === 0 &&
      b2?.allocatedBags === 20 &&
      b2?.remainingBags === 130 &&
      next?.batchId === 'B003' &&
      next?.allocatedBags === 0 &&
      next?.remainingBags === 200;

    results.push({
      name: '120 Wheat exact allocation (B001: 100, B002: 20, B003: 0)',
      passed: pass,
      message: pass ? 'Passed' : `Failed: ${JSON.stringify(res)}`
    });
  } catch (err: any) {
    results.push({ name: '120 Wheat exact allocation', passed: false, message: err.message });
  }

  // Test 2: Never allocate Hold or Rejected batches
  try {
    const riceRes = calculateFifoAllocation(testBatches, 'Rice', 200);
    const holdBatchAllocated = riceRes.allocations.some(a => a.batchId === 'B004');
    const wheatRes = calculateFifoAllocation(testBatches, 'Wheat', 700);
    const rejectedBatchAllocated = wheatRes.allocations.some(a => a.batchId === 'B007');

    const pass = !holdBatchAllocated && !rejectedBatchAllocated;
    results.push({
      name: 'Exclusion of Hold and Rejected batches',
      passed: pass,
      message: pass ? 'Passed' : 'Hold or rejected batches were allocated!'
    });
  } catch (err: any) {
    results.push({ name: 'Exclusion of Hold and Rejected batches', passed: false, message: err.message });
  }

  // Test 3: Shortfall detection when requested > available
  try {
    // Total eligible wheat = 100 + 150 + 200 + 160 = 610
    const res = calculateFifoAllocation(testBatches, 'Wheat', 650);
    const pass = res.isShortfall && res.shortfallBags === 40 && res.totalAllocatedBags === 610;
    results.push({
      name: 'Shortfall calculation when requested > eligible stock',
      passed: pass,
      message: pass ? 'Passed' : `Failed: Shortfall was ${res.shortfallBags}, expected 40`
    });
  } catch (err: any) {
    results.push({ name: 'Shortfall calculation', passed: false, message: err.message });
  }

  // Test 4: Tie-break on same arrival date
  try {
    const tieBatches: BatchItem[] = [
      { id: 'B010', commodity: 'Wheat', arrivalDate: '01-05-2025', totalQuantity: 50, availableQuantity: 50, qualityStatus: 'Eligible' },
      { id: 'B009', commodity: 'Wheat', arrivalDate: '01-05-2025', totalQuantity: 50, availableQuantity: 50, qualityStatus: 'Eligible' },
    ];
    const res = calculateFifoAllocation(tieBatches, 'Wheat', 60);
    const pass = res.allocations[0]?.batchId === 'B009' && res.allocations[1]?.batchId === 'B010';
    results.push({
      name: 'Deterministic tie-break by batch ID ascending on same arrival date',
      passed: pass,
      message: pass ? 'Passed' : `Failed: order was ${res.allocations.map(a => a.batchId).join(', ')}`
    });
  } catch (err: any) {
    results.push({ name: 'Tie-break ordering', passed: false, message: err.message });
  }

  // Test 5: Oldest eligible batch identification for star badge
  try {
    const starWheat = getNextToDispatchBatchId(testBatches, 'Wheat');
    const starRice = getNextToDispatchBatchId(testBatches, 'Rice');
    const pass = starWheat === 'B001' && starRice === 'B005'; // B004 is on Hold, so B005 is oldest eligible rice
    results.push({
      name: 'Star badge oldest eligible batch identification',
      passed: pass,
      message: pass ? 'Passed' : `Failed: starWheat=${starWheat}, starRice=${starRice}`
    });
  } catch (err: any) {
    results.push({ name: 'Star badge identification', passed: false, message: err.message });
  }

  // Test 6: Smart FIFO Reservation Awareness
  try {
    const reservedBatches: BatchItem[] = [
      { id: 'B001', commodity: 'Wheat', arrivalDate: '01-01-2025', totalQuantity: 100, availableQuantity: 100, reservedQuantity: 60, qualityStatus: 'Eligible' },
      { id: 'B002', commodity: 'Wheat', arrivalDate: '10-01-2025', totalQuantity: 150, availableQuantity: 150, reservedQuantity: 0, qualityStatus: 'Eligible' }
    ];
    // B001 has 100 - 60 = 40 available unreserved.
    // If requesting 80, B001 gives 40, and B002 gives 40.
    const res = runSmartFifoAllocation(reservedBatches, 'Wheat', 80);
    const pass = res.totalAllocatedBags === 80 &&
      res.allocations[0].batchId === 'B001' && res.allocations[0].allocatedBags === 40 &&
      res.allocations[1].batchId === 'B002' && res.allocations[1].allocatedBags === 40;
    results.push({
      name: 'Smart FIFO reservation awareness (accounts for reservedQuantity)',
      passed: pass,
      message: pass ? 'Passed' : `Failed: Allocated ${JSON.stringify(res.allocations)}`
    });
  } catch (err: any) {
    results.push({ name: 'Smart FIFO reservation awareness', passed: false, message: err.message });
  }

  // Test 7: Selection reasons and explanations generated
  try {
    const res = runSmartFifoAllocation(testBatches, 'Wheat', 120);
    const pass = res.allocations.length === 2 &&
      res.allocations[0].selectionReason.includes('Rank 1') &&
      res.allocations[0].selectionReason.includes('Oldest eligible stock');
    results.push({
      name: 'Batch selection rationale and explanation generation',
      passed: pass,
      message: pass ? 'Passed' : 'Failed to generate selection explanation'
    });
  } catch (err: any) {
    results.push({ name: 'Batch selection rationale', passed: false, message: err.message });
  }

  return results;
}

