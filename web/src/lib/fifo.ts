import { BatchItem, CommodityType, FifoAllocationResult, DispatchAllocationItem, AllocatedBatchLine } from '../data/types';
import { parseDate, calculateAgeDays } from './format';

/**
 * Pure FIFO Stock Allocation Engine
 *
 * Enforces strict FIFO rules:
 * 1. Filter: status === 'Eligible' AND availableQuantity > 0 AND commodity === selectedCommodity
 * 2. Order: arrivalDate ascending (oldest first). Tie-break: batch ID ascending.
 * 3. Allocation: greedy take min(remainingRequested, availableQuantity).
 * 4. Sum of allocations equals requestedQuantity unless there is a shortfall.
 * 5. Returns all allocated batches PLUS the next eligible batch in the queue with 0 allocated.
 */
export function calculateFifoAllocation(
  batches: BatchItem[],
  commodity: CommodityType,
  requestedQuantity: number
): FifoAllocationResult {
  // Defensive validation
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return {
      requestedBags: Math.max(0, requestedQuantity || 0),
      totalAllocatedBags: 0,
      shortfallBags: 0,
      isShortfall: false,
      allocations: [],
      nextInQueue: null
    };
  }

  // 1. Filter eligible batches (Eligible or Approved only; Hold/Rejected/Pending strictly excluded)
  const eligibleBatches = batches.filter(
    (b) => b.commodity === commodity && (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') && b.availableQuantity > 0
  );

  // 2. Sort deterministically: Oldest arrival date first, tie-break by ID
  const sortedBatches = [...eligibleBatches].sort((a, b) => {
    const timeA = parseDate(a.arrivalDate).getTime();
    const timeB = parseDate(b.arrivalDate).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id.localeCompare(b.id);
  });

  const totalEligibleStock = sortedBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
  const isShortfall = requestedQuantity > totalEligibleStock;
  const shortfallBags = isShortfall ? requestedQuantity - totalEligibleStock : 0;

  let remainingToAllocate = isShortfall ? totalEligibleStock : requestedQuantity;
  const allocations: DispatchAllocationItem[] = [];
  let nextInQueue: DispatchAllocationItem | null = null;

  for (let i = 0; i < sortedBatches.length; i++) {
    const batch = sortedBatches[i];

    if (remainingToAllocate > 0) {
      const take = Math.min(remainingToAllocate, batch.availableQuantity);
      const remainingStockAfter = batch.availableQuantity - take;

      allocations.push({
        batchId: batch.id,
        arrivalDate: batch.arrivalDate,
        allocatedBags: take,
        remainingBags: remainingStockAfter,
        status: batch.qualityStatus,
        commodity: batch.commodity
      });

      remainingToAllocate -= take;
    } else if (!nextInQueue) {
      // The first eligible batch not consumed in this dispatch
      nextInQueue = {
        batchId: batch.id,
        arrivalDate: batch.arrivalDate,
        allocatedBags: 0,
        remainingBags: batch.availableQuantity,
        status: batch.qualityStatus,
        commodity: batch.commodity
      };
      break;
    }
  }

  const totalAllocatedBags = allocations.reduce((sum, item) => sum + item.allocatedBags, 0);

  return {
    requestedBags: requestedQuantity,
    totalAllocatedBags,
    shortfallBags,
    isShortfall,
    allocations,
    nextInQueue
  };
}

/**
 * Finds the oldest eligible batch ID for a commodity (for "Next to dispatch" star badge)
 */
export function getNextToDispatchBatchId(batches: BatchItem[], commodity: CommodityType): string | null {
  const eligible = batches.filter(
    (b) => b.commodity === commodity && (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') && b.availableQuantity > 0
  );
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const timeA = parseDate(a.arrivalDate).getTime();
    const timeB = parseDate(b.arrivalDate).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  return eligible[0].id;
}

export interface SmartFifoResult {
  requestedBags: number;
  totalAllocatedBags: number;
  shortfallBags: number;
  isShortfall: boolean;
  allocations: AllocatedBatchLine[];
  candidateBatchesCount: number;
  blockedStockBags: number;
}

/**
 * Smart FIFO Allocation Engine with Reservation Awareness & Selection Explanations
 */
export function runSmartFifoAllocation(
  batches: BatchItem[],
  commodity: CommodityType,
  requestedQuantity: number
): SmartFifoResult {
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return {
      requestedBags: Math.max(0, requestedQuantity || 0),
      totalAllocatedBags: 0,
      shortfallBags: 0,
      isShortfall: false,
      allocations: [],
      candidateBatchesCount: 0,
      blockedStockBags: 0
    };
  }

  // 1. Calculate blocked stock (non-eligible batches of this commodity)
  const blockedBatches = batches.filter(
    (b) => b.commodity === commodity && 
      (b.qualityStatus === 'Hold' || b.qualityStatus === 'Rejected' || b.qualityStatus === 'Pending Inspection' || b.qualityStatus === 'Pending Allocation' || b.qualityStatus === 'Reinspection Required')
  );
  const blockedStockBags = blockedBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

  // 2. Filter eligible batches with unreserved stock
  const eligibleBatches = batches.filter((b) => {
    if (b.commodity !== commodity) return false;
    if (b.qualityStatus !== 'Eligible' && b.qualityStatus !== 'Approved') return false;
    const unreserved = b.availableQuantity - (b.reservedQuantity || 0);
    return unreserved > 0;
  });

  // 3. Sort deterministically: earliest arrivalDate ascending, tie-breaker: batch.id ascending
  const sortedBatches = [...eligibleBatches].sort((a, b) => {
    const timeA = parseDate(a.arrivalDate).getTime();
    const timeB = parseDate(b.arrivalDate).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  let remainingNeeded = requestedQuantity;
  const allocations: AllocatedBatchLine[] = [];
  let rank = 1;

  for (const batch of sortedBatches) {
    if (remainingNeeded <= 0) break;

    const unreserved = batch.availableQuantity - (batch.reservedQuantity || 0);
    const take = Math.min(remainingNeeded, unreserved);
    const ageDays = calculateAgeDays(batch.arrivalDate);

    allocations.push({
      batchId: batch.id,
      arrivalDate: batch.arrivalDate,
      qualityStatus: batch.qualityStatus,
      availableBeforeBags: unreserved,
      allocatedBags: take,
      remainingBags: unreserved - take,
      fifoRank: rank,
      selectionReason: `Rank ${rank}: Oldest eligible stock in godown (Arrived: ${batch.arrivalDate}, ${ageDays}d aged). Allocated ${take} of ${unreserved} available unreserved Bags.`
    });

    remainingNeeded -= take;
    rank++;
  }

  const totalAllocatedBags = allocations.reduce((sum, item) => sum + item.allocatedBags, 0);
  const isShortfall = totalAllocatedBags < requestedQuantity;
  const shortfallBags = isShortfall ? requestedQuantity - totalAllocatedBags : 0;

  return {
    requestedBags: requestedQuantity,
    totalAllocatedBags,
    shortfallBags,
    isShortfall,
    allocations,
    candidateBatchesCount: sortedBatches.length,
    blockedStockBags
  };
}

