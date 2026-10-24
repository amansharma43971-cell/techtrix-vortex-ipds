import crypto from 'crypto';
import { db } from '../db/database.js';

export function getAuditLogs(filters?: {
  actorRole?: string;
  action?: string;
  entityName?: string;
  search?: string;
  limit?: number;
}) {
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];

  if (filters?.actorRole) {
    query += ' AND actor_role = ?';
    params.push(filters.actorRole);
  }
  if (filters?.action) {
    query += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters?.entityName) {
    query += ' AND entity_name = ?';
    params.push(filters.entityName);
  }
  if (filters?.search) {
    query += ' AND (entity_id LIKE ? OR after_state LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(filters?.limit || 100);

  return db.prepare(query).all(...params);
}

export function verifyAuditChain() {
  const records = db.prepare('SELECT * FROM audit_log ORDER BY id ASC').all() as any[];

  let expectedPrevHash = '0'.repeat(64);
  let brokenAtId: number | null = null;
  let brokenReason: string | null = null;

  for (const record of records) {
    if (record.prev_hash !== expectedPrevHash) {
      brokenAtId = record.id;
      brokenReason = `Previous hash mismatch: expected ${expectedPrevHash.slice(0, 10)}..., found ${record.prev_hash.slice(0, 10)}...`;
      break;
    }

    const payloadToHash = `${record.prev_hash}|${record.actor_id || 'SYSTEM'}|${record.action}|${record.entity_name}|${record.entity_id}|${record.before_state}|${record.after_state}|${record.created_at}`;
    const calculatedHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    if (calculatedHash !== record.row_hash) {
      brokenAtId = record.id;
      brokenReason = `Cryptographic checksum invalid at record #${record.id}. Data has been altered.`;
      break;
    }

    expectedPrevHash = record.row_hash;
  }

  return {
    verified: brokenAtId === null,
    totalRecords: records.length,
    brokenAtId,
    brokenReason,
    latestHash: records.length > 0 ? records[records.length - 1].row_hash : expectedPrevHash
  };
}

export function getDispatchTrace(dispatchNo: string) {
  const dispatch = db.prepare(`
    SELECT d.*, c.name as commodity_name, g.name as godown_name, u.full_name as operator_name
    FROM dispatch_orders d
    JOIN commodities c ON d.commodity_id = c.id
    JOIN godowns g ON d.godown_id = g.id
    JOIN users u ON d.created_by = u.id
    WHERE d.dispatch_no = ?
  `).get(dispatchNo) as any;

  if (!dispatch) {
    throw new Error(`Dispatch #${dispatchNo} not found.`);
  }

  const allocations = db.prepare(`
    SELECT a.*, b.arrival_date, b.supplier, b.quality_status, b.notes, b.qr_token
    FROM dispatch_allocations a
    JOIN batches b ON a.batch_id = b.id
    WHERE a.dispatch_id = ?
    ORDER BY a.fifo_rank ASC
  `).all(dispatch.id) as any[];

  const detailedAllocations = allocations.map(a => {
    const inward = db.prepare('SELECT * FROM stock_inward WHERE batch_id = ?').get(a.batch_id) as any;
    const movements = db.prepare('SELECT * FROM stock_movements WHERE batch_id = ? ORDER BY id ASC').all(a.batch_id);
    return {
      ...a,
      inwardReceipt: inward || null,
      movements
    };
  });

  return {
    dispatch,
    allocations: detailedAllocations
  };
}

