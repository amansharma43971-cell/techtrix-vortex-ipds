import crypto from 'crypto';
import { db, appendAuditLog } from '../db/database.js';

export function updateBatchQualityStatus(params: {
  batchId: string;
  newStatus: 'Eligible' | 'Hold' | 'Rejected';
  reason: string;
  inspectorId: string;
  inspectorRole: string;
}) {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(params.batchId) as any;
  if (!batch) {
    throw new Error(`Batch with ID "${params.batchId}" not found.`);
  }

  const prevStatus = batch.quality_status;
  if (prevStatus === params.newStatus) {
    return { success: true, message: `Batch is already in status ${params.newStatus}.` };
  }

  const tx = db.transaction(() => {
    // Update batch status
    db.prepare(`
      UPDATE batches
      SET quality_status = ?,
          hold_reason = ?,
          version = version + 1
      WHERE id = ?
    `).run(
      params.newStatus,
      params.newStatus === 'Eligible' ? null : params.reason,
      params.batchId
    );

    // Insert inspection entry
    const inspectionId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO inspections (id, batch_id, prev_status, new_status, reason, inspector_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(inspectionId, params.batchId, prevStatus, params.newStatus, params.reason, params.inspectorId);

    // Create or clear alerts
    if (params.newStatus === 'Hold' || params.newStatus === 'Rejected') {
      const alertId = `alt-${Date.now().toString().slice(-4)}`;
      const severity = params.newStatus === 'Hold' ? 'warning' : 'critical';
      const title = params.newStatus === 'Hold'
        ? `Batch ${params.batchId} placed on Hold`
        : `Batch ${params.batchId} Rejected`;

      db.prepare(`
        INSERT INTO alerts (id, godown_id, alert_type, severity, title, message, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(alertId, batch.godown_id, 'PENDING_INSPECTION', severity, title, params.reason, params.batchId);
    }

    // Append cryptographic audit log
    appendAuditLog({
      actorId: params.inspectorId,
      actorRole: params.inspectorRole,
      action: 'QUALITY_STATUS_CHANGE',
      entityName: 'batches',
      entityId: params.batchId,
      beforeState: { quality_status: prevStatus, hold_reason: batch.hold_reason },
      afterState: { quality_status: params.newStatus, hold_reason: params.reason }
    });
  });

  tx();
  return {
    success: true,
    batchId: params.batchId,
    prevStatus,
    newStatus: params.newStatus,
    reason: params.reason
  };
}

export function getInspectionQueue() {
  return db.prepare(`
    SELECT b.*, c.name as commodity_name,
           CAST((julianday('now') - julianday(b.arrival_date)) AS INTEGER) as age_days
    FROM batches b
    JOIN commodities c ON b.commodity_id = c.id
    WHERE b.quality_status IN ('Hold', 'Rejected')
    ORDER BY b.arrival_date ASC
  `).all();
}

