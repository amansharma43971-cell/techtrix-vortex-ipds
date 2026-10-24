export interface BatchRow {
  id: string;
  godown_id?: string;
  commodity_id: string;
  arrival_date: string;
  total_qty: number;
  available_qty: number;
  quality_status: 'Pending Inspection' | 'Eligible' | 'Hold' | 'Rejected' | 'Exhausted';
  supplier?: string;
  notes?: string;
  hold_reason?: string;
}

export interface AllocationItem {
  batchId: string;
  arrivalDate: string;
  allocatedBags: number;
  remainingBags: number;
  status: string;
  commodityId: string;
}

export interface FifoPlanResult {
  commodityId: string;
  requestedBags: number;
  totalAllocatedBags: number;
  shortfallBags: number;
  isShortfall: boolean;
  allocations: AllocationItem[];
  nextInQueue: AllocationItem | null;
  skippedBatches: { batchId: string; reason: string }[];
  explanation: string;
}

/**
 * Pure FIFO Stock Allocation Engine
 */
export function allocateFifo(
  allBatches: BatchRow[],
  commodityId: string,
  requestedQuantity: number
): FifoPlanResult {
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return {
      commodityId,
      requestedBags: Math.max(0, requestedQuantity || 0),
      totalAllocatedBags: 0,
      shortfallBags: 0,
      isShortfall: false,
      allocations: [],
      nextInQueue: null,
      skippedBatches: [],
      explanation: 'Requested quantity must be a positive integer.'
    };
  }

  // 1. Separate relevant batches
  const commodityBatches = allBatches.filter(b => b.commodity_id === commodityId);
  const eligibleBatches: BatchRow[] = [];
  const skippedBatches: { batchId: string; reason: string }[] = [];

  for (const b of commodityBatches) {
    if (b.quality_status !== 'Eligible') {
      skippedBatches.push({ batchId: b.id, reason: `Excluded due to quality status: ${b.quality_status} (${b.hold_reason || 'Quarantine hold'})` });
    } else if (b.available_qty <= 0) {
      skippedBatches.push({ batchId: b.id, reason: 'Zero available stock remaining' });
    } else {
      eligibleBatches.push(b);
    }
  }

  // 2. Sort deterministically: Oldest arrival_date first, tie-break by ID ascending
  eligibleBatches.sort((a, b) => {
    const timeA = new Date(a.arrival_date).getTime();
    const timeB = new Date(b.arrival_date).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id.localeCompare(b.id);
  });

  const totalEligibleStock = eligibleBatches.reduce((acc, b) => acc + b.available_qty, 0);
  const isShortfall = requestedQuantity > totalEligibleStock;
  const shortfallBags = isShortfall ? requestedQuantity - totalEligibleStock : 0;

  let remaining = isShortfall ? totalEligibleStock : requestedQuantity;
  const allocations: AllocationItem[] = [];
  let nextInQueue: AllocationItem | null = null;

  for (let i = 0; i < eligibleBatches.length; i++) {
    const batch = eligibleBatches[i];

    if (remaining > 0) {
      const take = Math.min(remaining, batch.available_qty);
      allocations.push({
        batchId: batch.id,
        arrivalDate: batch.arrival_date,
        allocatedBags: take,
        remainingBags: batch.available_qty - take,
        status: batch.quality_status,
        commodityId: batch.commodity_id
      });
      remaining -= take;
    } else if (!nextInQueue) {
      nextInQueue = {
        batchId: batch.id,
        arrivalDate: batch.arrival_date,
        allocatedBags: 0,
        remainingBags: batch.available_qty,
        status: batch.quality_status,
        commodityId: batch.commodity_id
      };
      break;
    }
  }

  const totalAllocatedBags = allocations.reduce((sum, a) => sum + a.allocatedBags, 0);

  // Construct plain-language explanation
  let explanation = '';
  if (allocations.length > 0) {
    const breakdown = allocations.map(a => `${a.allocatedBags} bags from ${a.batchId} (Arrived ${a.arrivalDate})`).join(', ');
    explanation = `Strict FIFO allocation: ${breakdown}.`;
    if (nextInQueue) {
      explanation += ` Next batch in queue is ${nextInQueue.batchId} (${nextInQueue.remainingBags} bags available).`;
    }
  } else {
    explanation = 'No eligible stock found for this commodity.';
  }

  if (skippedBatches.length > 0) {
    explanation += ` Skipped: ${skippedBatches.map(s => `${s.batchId} (${s.reason})`).join('; ')}.`;
  }

  if (isShortfall) {
    explanation += ` Warning: Shortfall of ${shortfallBags} bags (Requested ${requestedQuantity}, Eligible ${totalEligibleStock}).`;
  }

  return {
    commodityId,
    requestedBags: requestedQuantity,
    totalAllocatedBags,
    shortfallBags,
    isShortfall,
    allocations,
    nextInQueue,
    skippedBatches,
    explanation
  };
}

