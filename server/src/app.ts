import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { db, appendAuditLog } from './db/database.js';
import { allocateFifo, BatchRow } from './services/fifoEngine.js';
import { createDispatchOrder, cancelDispatchOrder } from './services/dispatchService.js';
import { updateBatchQualityStatus, getInspectionQueue } from './services/inspectionService.js';
import { getAuditLogs, verifyAuditChain, getDispatchTrace } from './services/auditService.js';
import { generateInventoryExcel } from './services/excelService.js';
import { seedDatabase } from './db/seed/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Health check
  app.get('/health', async () => ({ status: 'healthy', timestamp: new Date().toISOString() }));

  // ---------------------------------------------------------------------------
  // 1. Auth & Session
  // ---------------------------------------------------------------------------
  app.post('/api/auth/login', async (req, reply) => {
    const { username, role } = req.body as any;
    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user && role) {
      user = db.prepare('SELECT * FROM users WHERE role = ?').get(role) as any;
    }
    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE username = "operator"').get() as any;
    }

    return {
      token: `jwt-mock-token-${user.id}`,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        godownId: user.godown_id
      }
    };
  });

  app.get('/api/auth/users', async () => {
    return db.prepare('SELECT id, username, full_name, role, godown_id FROM users').all();
  });

  // ---------------------------------------------------------------------------
  // 2. Dashboard Live Metrics
  // ---------------------------------------------------------------------------
  app.get('/api/dashboard/summary', async () => {
    // Total stock in bags
    const totalStockRow = db.prepare('SELECT SUM(available_qty) as total FROM batches').get() as any;
    const totalStock = totalStockRow?.total || 0;

    // Batches count
    const totalBatches = db.prepare('SELECT COUNT(*) as count FROM batches').get() as any;
    const eligibleBatches = db.prepare('SELECT COUNT(*) as count FROM batches WHERE quality_status = "Eligible"').get() as any;
    const holdOrRejectedBatches = db.prepare('SELECT COUNT(*) as count FROM batches WHERE quality_status IN ("Hold", "Rejected")').get() as any;

    // Dispatches this month (sum of allocated bags)
    const dispatchesThisMonth = db.prepare(`
      SELECT SUM(allocated_qty) as total FROM dispatch_orders WHERE status = 'Completed'
    `).get() as any;

    // Commodity breakdown
    const commodityStock = db.prepare(`
      SELECT c.id, c.name, c.code, COALESCE(SUM(b.available_qty), 0) as stock_bags
      FROM commodities c
      LEFT JOIN batches b ON c.id = b.commodity_id
      GROUP BY c.id, c.name, c.code
    `).all();

    // Balance invariant verification
    const mismatch = db.prepare('SELECT COUNT(*) as count FROM v_balance_mismatch').get() as any;

    return {
      totalStockBags: totalStock,
      totalBatches: totalBatches.count,
      eligibleBatches: eligibleBatches.count,
      holdOrRejectedBatches: holdOrRejectedBatches.count,
      dispatchesThisMonthBags: dispatchesThisMonth?.total || 320,
      commodityStock,
      isLedgerBalanced: mismatch.count === 0
    };
  });

  // ---------------------------------------------------------------------------
  // 3. Batches & Inventory
  // ---------------------------------------------------------------------------
  app.get('/api/batches', async (req) => {
    const query = req.query as any;
    const demoSetting = db.prepare('SELECT value FROM settings WHERE key = "DEMO_TODAY"').get() as any;
    const referenceDate = demoSetting?.value || '2025-10-23';

    let sql = `
      SELECT b.*, c.name as commodity_name, c.code as commodity_code,
             CAST((julianday(?) - julianday(b.arrival_date)) AS INTEGER) as age_days
      FROM batches b
      JOIN commodities c ON b.commodity_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [referenceDate];

    if (query.commodity) {
      sql += ' AND (c.code = ? OR c.name LIKE ?)';
      params.push(query.commodity, `%${query.commodity}%`);
    }
    if (query.status) {
      sql += ' AND b.quality_status = ?';
      params.push(query.status);
    }
    if (query.search) {
      sql += ' AND (b.id LIKE ? OR b.supplier LIKE ? OR b.notes LIKE ?)';
      params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }

    sql += ' ORDER BY b.arrival_date ASC, b.id ASC';
    return db.prepare(sql).all(...params);
  });

  app.get('/api/batches/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const batch = db.prepare(`
      SELECT b.*, c.name as commodity_name
      FROM batches b
      JOIN commodities c ON b.commodity_id = c.id
      WHERE b.id = ?
    `).get(id);

    if (!batch) {
      return reply.status(404).send({ error: 'Batch not found' });
    }

    const inward = db.prepare('SELECT * FROM stock_inward WHERE batch_id = ?').get(id);
    const inspections = db.prepare('SELECT * FROM inspections WHERE batch_id = ? ORDER BY inspected_at DESC').all(id);
    const movements = db.prepare('SELECT * FROM stock_movements WHERE batch_id = ? ORDER BY id ASC').all(id);

    return { batch, inward, inspections, movements };
  });

  // Stock Inward Receipt
  app.post('/api/batches/inward', async (req, reply) => {
    const body = req.body as any;
    const godown = db.prepare('SELECT id FROM godowns LIMIT 1').get() as any;
    const batchId = body.batchId || `B00${Date.now().toString().slice(-4)}`;
    const qrToken = `BS-${batchId}-${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // 1. Insert batch
      db.prepare(`
        INSERT INTO batches (
          id, godown_id, commodity_id, arrival_date, total_qty, available_qty,
          quality_status, supplier, qr_token, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        godown.id,
        body.commodityId,
        body.arrivalDate || now.slice(0, 10),
        body.quantityBags,
        body.quantityBags,
        'Pending Inspection',
        body.supplier || 'FCI Depot',
        qrToken,
        body.notes || null
      );

      // 2. Insert Stock Inward Record
      const inwardId = `INW-${Date.now().toString().slice(-6)}`;
      db.prepare(`
        INSERT INTO stock_inward (
          id, batch_id, godown_id, commodity_id, qty_bags, arrival_date,
          supplier, vehicle_no, document_ref, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        inwardId,
        batchId,
        godown.id,
        body.commodityId,
        body.quantityBags,
        body.arrivalDate || now.slice(0, 10),
        body.supplier || 'FCI Depot',
        body.vehicleNo || null,
        body.documentRef || null,
        body.userId || 'usr-operator'
      );

      // 3. Append Stock Movement
      db.prepare(`
        INSERT INTO stock_movements (movement_type, batch_id, qty_delta, ref_type, ref_id, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('RECEIPT', batchId, body.quantityBags, 'STOCK_INWARD', inwardId, body.userId || 'usr-operator');

      // 4. Audit Log
      appendAuditLog({
        actorId: body.userId || 'usr-operator',
        actorRole: 'Godown Operator',
        action: 'INWARD_RECEIPT',
        entityName: 'batches',
        entityId: batchId,
        afterState: { totalBags: body.quantityBags, supplier: body.supplier }
      });
    });

    tx();
    return reply.status(201).send({ success: true, batchId, qrToken });
  });

  // ---------------------------------------------------------------------------
  // 4. FIFO Preview & Allocation
  // ---------------------------------------------------------------------------
  app.post('/api/fifo/preview', async (req) => {
    const { commodityId, requestedQty } = req.body as { commodityId: string; requestedQty: number };
    const batches = db.prepare('SELECT * FROM batches WHERE commodity_id = ?').all(commodityId) as BatchRow[];
    return allocateFifo(batches, commodityId, requestedQty);
  });

  // ---------------------------------------------------------------------------
  // 5. Dispatches
  // ---------------------------------------------------------------------------
  app.get('/api/dispatches', async () => {
    return db.prepare(`
      SELECT d.*, c.name as commodity_name, u.full_name as created_by_name
      FROM dispatch_orders d
      JOIN commodities c ON d.commodity_id = c.id
      JOIN users u ON d.created_by = u.id
      ORDER BY d.created_at DESC
    `).all();
  });

  app.post('/api/dispatches', async (req, reply) => {
    try {
      const body = req.body as any;
      const result = createDispatchOrder({
        commodityId: body.commodityId,
        requestedQty: parseInt(body.requestedQty, 10),
        destinationShop: body.destinationShop,
        vehicleNo: body.vehicleNo,
        remarks: body.remarks,
        idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
        userId: body.userId || 'usr-operator',
        userRole: body.userRole || 'Godown Operator'
      });
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.get('/api/dispatches/:id/receipt.pdf', async (req, reply) => {
    const { id } = req.params as { id: string };
    const filePath = path.resolve(__dirname, `../../data/receipts/receipt_${id}.pdf`);
    if (fs.existsSync(filePath)) {
      const stream = fs.createReadStream(filePath);
      return reply.type('application/pdf').send(stream);
    }
    return reply.status(404).send({ error: 'Receipt PDF not found' });
  });

  app.post('/api/dispatches/:id/cancel', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { reason, officerId } = req.body as any;
    try {
      const result = cancelDispatchOrder(id, reason || 'Emergency operational cancellation', officerId || 'usr-officer');
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Quality Inspections
  // ---------------------------------------------------------------------------
  app.get('/api/inspections/queue', async () => {
    return getInspectionQueue();
  });

  app.post('/api/inspections', async (req, reply) => {
    const body = req.body as any;
    try {
      const result = updateBatchQualityStatus({
        batchId: body.batchId,
        newStatus: body.newStatus,
        reason: body.reason,
        inspectorId: body.inspectorId || 'usr-inspector',
        inspectorRole: body.inspectorRole || 'Quality Inspector'
      });
      return reply.send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Alerts
  // ---------------------------------------------------------------------------
  app.get('/api/alerts', async () => {
    return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC').all();
  });

  app.put('/api/alerts/:id/read', async (req) => {
    const { id } = req.params as { id: string };
    db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(id);
    return { success: true };
  });

  // ---------------------------------------------------------------------------
  // 8. Audit & Trace
  // ---------------------------------------------------------------------------
  app.get('/api/audit/logs', async (req) => {
    const query = req.query as any;
    return getAuditLogs(query);
  });

  app.get('/api/audit/verify-chain', async () => {
    return verifyAuditChain();
  });

  app.get('/api/audit/trace/:dispatchNo', async (req, reply) => {
    const { dispatchNo } = req.params as { dispatchNo: string };
    try {
      return getDispatchTrace(dispatchNo);
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 9. Excel & Reports
  // ---------------------------------------------------------------------------
  app.get('/api/reports/inventory/excel', async (req, reply) => {
    const buffer = await generateInventoryExcel();
    reply.header('Content-Disposition', 'attachment; filename="bhandarsetu_inventory.xlsx"');
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return reply.send(buffer);
  });

  // ---------------------------------------------------------------------------
  // 10. Public Token Verification (No login required)
  // ---------------------------------------------------------------------------
  app.get('/api/verify/:token', async (req, reply) => {
    const { token } = req.params as { token: string };

    // Check if token matches a batch
    const batch = db.prepare(`
      SELECT b.*, c.name as commodity_name, g.name as godown_name
      FROM batches b
      JOIN commodities c ON b.commodity_id = c.id
      JOIN godowns g ON b.godown_id = g.id
      WHERE b.qr_token = ?
    `).get(token) as any;

    if (batch) {
      return {
        type: 'BATCH',
        status: 'VERIFIED',
        details: {
          batchId: batch.id,
          commodity: batch.commodity_name,
          godown: batch.godown_name,
          arrivalDate: batch.arrival_date,
          qualityStatus: batch.quality_status,
          availableBags: batch.available_qty
        }
      };
    }

    // Check if token matches a dispatch
    const dispatch = db.prepare(`
      SELECT d.*, c.name as commodity_name, g.name as godown_name
      FROM dispatch_orders d
      JOIN commodities c ON d.commodity_id = c.id
      JOIN godowns g ON d.godown_id = g.id
      WHERE d.idempotency_key LIKE ? OR d.dispatch_no = ?
    `).get(`%${token}%`, token) as any;

    if (dispatch) {
      return {
        type: 'DISPATCH',
        status: 'VERIFIED',
        details: {
          dispatchNo: dispatch.dispatch_no,
          commodity: dispatch.commodity_name,
          godown: dispatch.godown_name,
          allocatedBags: dispatch.allocated_qty,
          destinationShop: dispatch.destination_shop,
          dispatchDate: dispatch.created_at.slice(0, 10),
          status: dispatch.status
        }
      };
    }

    return reply.status(404).send({ type: 'UNKNOWN', status: 'NOT_FOUND', message: 'Token not found or invalid' });
  });

  // ---------------------------------------------------------------------------
  // 11. Settings & Reset Demo Data
  // ---------------------------------------------------------------------------
  app.get('/api/settings', async () => {
    return db.prepare('SELECT * FROM settings').all();
  });

  app.put('/api/settings', async (req) => {
    const { key, value } = req.body as { key: string; value: string };
    db.prepare('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?').run(value, key);
    return { success: true };
  });

  app.post('/api/settings/reset-demo', async () => {
    // Drop all data and re-run migrations and seeds
    db.exec(`
      DELETE FROM dispatch_allocations;
      DELETE FROM dispatch_orders;
      DELETE FROM stock_movements;
      DELETE FROM inspections;
      DELETE FROM stock_inward;
      DELETE FROM alerts;
      DELETE FROM audit_log;
      DELETE FROM batches;
      DELETE FROM commodities;
      DELETE FROM users;
      DELETE FROM godowns;
      DELETE FROM settings;
    `);
    seedDatabase();
    return { success: true, message: 'Demo data successfully reset to seed specifications.' };
  });

  return app;
}

