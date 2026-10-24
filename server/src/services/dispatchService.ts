import crypto from 'crypto';
import { db, appendAuditLog } from '../db/database.js';
import { allocateFifo, BatchRow } from './fifoEngine.js';
import { generateDispatchPdf } from './pdfService.js';

export interface CreateDispatchInput {
  commodityId: string;
  requestedQty: number;
  destinationShop: string;
  vehicleNo?: string;
  remarks?: string;
  idempotencyKey: string;
  userId: string;
  userRole: string;
}

export function createDispatchOrder(input: CreateDispatchInput) {
  // 1. Idempotency Check: if this key already processed, return existing record
  const existingOrder = db.prepare('SELECT * FROM dispatch_orders WHERE idempotency_key = ?').get(input.idempotencyKey) as any;
  if (existingOrder) {
    return {
      isExisting: true,
      dispatch: existingOrder,
      message: 'Idempotent request returned existing dispatch order.'
    };
  }

  // 2. Fetch commodity and godown details
  const commodity = db.prepare('SELECT * FROM commodities WHERE id = ?').get(input.commodityId) as any;
  if (!commodity) {
    throw new Error(`Commodity with ID "${input.commodityId}" not found.`);
  }

  const godown = db.prepare('SELECT * FROM godowns LIMIT 1').get() as any;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(input.userId) as any;

  // 3. Fetch all current batches for this commodity
  const batches = db.prepare(`
    SELECT * FROM batches WHERE commodity_id = ?
  `).all(input.commodityId) as BatchRow[];

  // 4. Calculate FIFO Plan
  const plan = allocateFifo(batches, input.commodityId, input.requestedQty);

  if (plan.allocations.length === 0) {
    throw new Error('BS003: INSUFFICIENT_STOCK: No eligible stock available for dispatch.');
  }

  // Check shortfall setting
  const partialAllowed = db.prepare('SELECT value FROM settings WHERE key = "ALLOW_PARTIAL_DISPATCH"').get() as any;
  if (plan.isShortfall && partialAllowed?.value !== 'true') {
    throw new Error(`BS003: SHORTFALL: Cannot fulfill requested quantity of ${input.requestedQty} bags without partial dispatch.`);
  }

  const dispatchId = `D00${Date.now().toString().slice(-4)}`;
  const dispatchNo = dispatchId;
  const qrToken = `DSP-${dispatchNo}-${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  let ledgerHash = '';

  // 5. Execute DB Transaction
  const executeTransaction = db.transaction(() => {
    // Insert dispatch order
    db.prepare(`
      INSERT INTO dispatch_orders (
        id, dispatch_no, godown_id, commodity_id, destination_shop,
        requested_qty, allocated_qty, status, vehicle_no, remarks,
        idempotency_key, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dispatchId,
      dispatchNo,
      godown.id,
      input.commodityId,
      input.destinationShop,
      input.requestedQty,
      plan.totalAllocatedBags,
      'Completed',
      input.vehicleNo || null,
      input.remarks || null,
      input.idempotencyKey,
      input.userId,
      now
    );

    // Apply batch deductions, stock movements & allocations
    for (let i = 0; i < plan.allocations.length; i++) {
      const alloc = plan.allocations[i];

      // Re-verify batch state inside transaction
      const currentBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get(alloc.batchId) as BatchRow;
      if (currentBatch.quality_status !== 'Eligible') {
        throw new Error(`BS001: QUALITY_HOLD: Batch ${alloc.batchId} status changed to ${currentBatch.quality_status} during transaction.`);
      }
      if (currentBatch.available_qty < alloc.allocatedBags) {
        throw new Error(`BS004: CONCURRENCY_SHORTFALL: Batch ${alloc.batchId} has insufficient stock.`);
      }

      const newAvailable = currentBatch.available_qty - alloc.allocatedBags;
      const newStatus = newAvailable === 0 ? 'Exhausted' : currentBatch.quality_status;

      // Update batch
      db.prepare(`
        UPDATE batches
        SET available_qty = ?, quality_status = ?, version = version + 1
        WHERE id = ?
      `).run(newAvailable, newStatus, alloc.batchId);

      // Record dispatch allocation
      db.prepare(`
        INSERT INTO dispatch_allocations (id, dispatch_id, batch_id, allocated_qty, fifo_rank)
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), dispatchId, alloc.batchId, alloc.allocatedBags, i + 1);

      // Append-only stock movement
      db.prepare(`
        INSERT INTO stock_movements (movement_type, batch_id, qty_delta, ref_type, ref_id, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('DISPATCH', alloc.batchId, -alloc.allocatedBags, 'DISPATCH_ORDER', dispatchId, input.userId, now);
    }

    // Append cryptographic audit log
    ledgerHash = appendAuditLog({
      actorId: input.userId,
      actorRole: input.userRole,
      action: 'DISPATCH_CREATED',
      entityName: 'dispatch_orders',
      entityId: dispatchId,
      afterState: {
        dispatchNo,
        commodity: commodity.name,
        allocatedBags: plan.totalAllocatedBags,
        destination: input.destinationShop,
        allocations: plan.allocations
      }
    });
  });

  executeTransaction();

  // 6. Generate PDF receipt asynchronously or synchronously
  const pdfData = {
    dispatchNo,
    dispatchDate: now.slice(0, 10),
    godownName: godown.name,
    godownCode: godown.code,
    commodityName: commodity.name,
    destinationShop: input.destinationShop,
    vehicleNo: input.vehicleNo,
    operatorName: user?.full_name || 'Aayush Tripathi',
    totalBags: plan.totalAllocatedBags,
    totalKg: plan.totalAllocatedBags * commodity.standard_bag_weight_kg,
    allocations: plan.allocations,
    ledgerHash,
    qrToken
  };

  // Generate PDF file
  generateDispatchPdf(pdfData).catch(err => console.error('Error generating PDF:', err));

  return {
    isExisting: false,
    dispatchId,
    dispatchNo,
    allocatedQty: plan.totalAllocatedBags,
    allocations: plan.allocations,
    ledgerHash,
    qrToken,
    pdfDownloadUrl: `/api/dispatches/${dispatchId}/receipt.pdf`
  };
}

/**
 * Cancel Dispatch with Reversal Movement (Officer authorization)
 */
export function cancelDispatchOrder(dispatchId: string, reason: string, officerId: string) {
  const dispatch = db.prepare('SELECT * FROM dispatch_orders WHERE id = ?').get(dispatchId) as any;
  if (!dispatch) {
    throw new Error('Dispatch order not found.');
  }
  if (dispatch.status === 'Cancelled') {
    throw new Error('Dispatch order is already cancelled.');
  }

  const allocations = db.prepare('SELECT * FROM dispatch_allocations WHERE dispatch_id = ?').all(dispatchId) as any[];

  const tx = db.transaction(() => {
    for (const alloc of allocations) {
      // Restore batch stock
      db.prepare(`
        UPDATE batches
        SET available_qty = available_qty + ?,
            quality_status = CASE WHEN quality_status = 'Exhausted' THEN 'Eligible' ELSE quality_status END,
            version = version + 1
        WHERE id = ?
      `).run(alloc.allocated_qty, alloc.batch_id);

      // Insert REVERSAL movement
      db.prepare(`
        INSERT INTO stock_movements (movement_type, batch_id, qty_delta, ref_type, ref_id, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('REVERSAL', alloc.batch_id, alloc.allocated_qty, 'DISPATCH_ORDER', dispatchId, officerId);
    }

    // Mark cancelled
    db.prepare('UPDATE dispatch_orders SET status = "Cancelled", remarks = ? WHERE id = ?')
      .run(`Cancelled by Officer: ${reason}`, dispatchId);

    // Audit log
    appendAuditLog({
      actorId: officerId,
      actorRole: 'Officer',
      action: 'DISPATCH_CANCELLED',
      entityName: 'dispatch_orders',
      entityId: dispatchId,
      afterState: { reason, restoredBags: dispatch.allocated_qty }
    });
  });

  tx();
  return { success: true, message: `Dispatch ${dispatch.dispatch_no} successfully cancelled and stock reversed.` };
}

