import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, appendAuditLog } from '../database.js';

export function seedDatabase() {
  const existingGodown = db.prepare('SELECT id FROM godowns LIMIT 1').get();
  if (existingGodown) {
    // Already seeded
    return;
  }

  const salt = bcrypt.genSaltSync(10);

  const tx = db.transaction(() => {
    // 1. Godown
    const godownId = 'gdn-noida-01';
    db.prepare(`
      INSERT INTO godowns (id, code, name, district, state, capacity_bags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(godownId, 'GDN-NOIDA-01', 'Surajpur Central Depot', 'Gautam Buddha Nagar (Noida)', 'Uttar Pradesh', 10000);

    // 2. Users
    const users = [
      { id: 'usr-admin', username: 'admin', name: 'System Administrator', role: 'Admin' },
      { id: 'usr-operator', username: 'operator', name: 'Aayush Tripathi', role: 'Godown Operator' },
      { id: 'usr-inspector', username: 'inspector', name: 'Dr. Anita Rao', role: 'Quality Inspector' },
      { id: 'usr-officer', username: 'officer', name: 'Vikram Deshmukh', role: 'Officer' },
    ];

    for (const u of users) {
      const hash = bcrypt.hashSync(`${u.username}123`, salt);
      db.prepare(`
        INSERT INTO users (id, username, password_hash, full_name, role, godown_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(u.id, u.username, hash, u.name, u.role, godownId);
    }

    // 3. Commodities
    const commodities = [
      { id: 'comm-wheat', code: 'WHEAT', name: 'Wheat Grade-A (FAQ)', weight: 50, lowStock: 200, shelfLife: 365 },
      { id: 'comm-rice', code: 'RICE', name: 'Raw Rice Grade-I', weight: 50, lowStock: 150, shelfLife: 730 },
    ];

    for (const c of commodities) {
      db.prepare(`
        INSERT INTO commodities (id, code, name, standard_bag_weight_kg, low_stock_threshold_bags, shelf_life_days)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(c.id, c.code, c.name, c.weight, c.lowStock, c.shelfLife);
    }

    // 4. Batches & Stock Movements (Seed exact 7 batches)
    const batches = [
      { id: 'B001', commId: 'comm-wheat', arrival: '2025-01-01', total: 100, avail: 100, status: 'Eligible', supplier: 'FCI Depot Karnal', notes: 'FAQ grade, moisture 10.4%' },
      { id: 'B002', commId: 'comm-wheat', arrival: '2025-01-10', total: 150, avail: 150, status: 'Eligible', supplier: 'Punjab Agro Pool', notes: 'Sona Moti grain' },
      { id: 'B003', commId: 'comm-wheat', arrival: '2025-01-20', total: 200, avail: 200, status: 'Eligible', supplier: 'Haryana Agro Pool', notes: 'Moisture 11.2%' },
      { id: 'B004', commId: 'comm-rice', arrival: '2025-02-05', total: 120, avail: 120, status: 'Hold', supplier: 'Chhattisgarh State Pool', holdReason: 'Moisture content exceeds 14%, pending aeration re-test' },
      { id: 'B005', commId: 'comm-rice', arrival: '2025-02-15', total: 180, avail: 180, status: 'Eligible', supplier: 'Andhra Millers Co-op', notes: 'Common Raw Grade I' },
      { id: 'B006', commId: 'comm-wheat', arrival: '2025-02-28', total: 160, avail: 160, status: 'Eligible', supplier: 'MP State Supplies', notes: 'Fresh arrival' },
      { id: 'B007', commId: 'comm-wheat', arrival: '2025-03-10', total: 140, avail: 140, status: 'Rejected', supplier: 'UP Agro Corporation', holdReason: 'Weevil infestation detected by lab inspection' }
    ];

    for (const b of batches) {
      const qrToken = `BS-${b.id}-${crypto.randomBytes(8).toString('hex')}`;
      db.prepare(`
        INSERT INTO batches (id, godown_id, commodity_id, arrival_date, total_qty, available_qty, quality_status, supplier, qr_token, notes, hold_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(b.id, godownId, b.commId, b.arrival, b.total, b.avail, b.status, b.supplier, qrToken, b.notes || null, b.holdReason || null);

      // Ledger Receipt
      db.prepare(`
        INSERT INTO stock_movements (movement_type, batch_id, qty_delta, ref_type, ref_id, performed_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('RECEIPT', b.id, b.total, 'STOCK_INWARD', `INW-${b.id}`, 'usr-operator');

      // Audit Log for Inward
      appendAuditLog({
        actorId: 'usr-operator',
        actorRole: 'Godown Operator',
        action: 'INWARD_RECEIPT',
        entityName: 'batches',
        entityId: b.id,
        afterState: { total_qty: b.total, arrival_date: b.arrival, quality_status: b.status }
      });
    }

    // 5. Past Dispatches (D0053 to D0056)
    const dispatches = [
      { id: 'D0056', no: 'D0056', commId: 'comm-wheat', req: 120, date: '2025-04-20', shop: 'FPS-101 (Sitabuldi)', remarks: 'Regular PDS allocation for Ward 4' },
      { id: 'D0055', no: 'D0055', commId: 'comm-rice', req: 50, date: '2025-04-18', shop: 'FPS-102 (Dharampeth)', remarks: 'BPL quota dispatch' },
      { id: 'D0054', no: 'D0054', commId: 'comm-wheat', req: 80, date: '2025-04-15', shop: 'FPS-103 (Itwari)', remarks: 'Mid-day meal quota' },
      { id: 'D0053', no: 'D0053', commId: 'comm-wheat', req: 60, date: '2025-04-10', shop: 'FPS-104 (Sadar)', remarks: 'Buffer replenishment' },
    ];

    for (const d of dispatches) {
      db.prepare(`
        INSERT INTO dispatch_orders (id, dispatch_no, godown_id, commodity_id, destination_shop, requested_qty, allocated_qty, status, idempotency_key, created_by, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(d.id, d.no, godownId, d.commId, d.shop, d.req, d.req, 'Completed', `idem-${d.id}`, 'usr-operator', d.remarks);
    }

    // 6. Starting Alerts
    const alerts = [
      { id: 'alt-1', type: 'HOLD_AGED', severity: 'warning', title: 'Batch B004 is on Hold (Quality Inspection Pending)', msg: 'Moisture content exceeds 14%, pending aeration re-test', batchId: 'B004' },
      { id: 'alt-2', type: 'PENDING_INSPECTION', severity: 'critical', title: 'Batch B007 has been Rejected', msg: 'Weevil infestation detected by lab inspection', batchId: 'B007' },
      { id: 'alt-3', type: 'AGED_STOCK', severity: 'info', title: 'Batch B002 is 80% aged (Consider dispatch soon)', msg: 'Arrived 10-01-2025, prioritised under FIFO allocation', batchId: 'B002' },
    ];

    for (const a of alerts) {
      db.prepare(`
        INSERT INTO alerts (id, godown_id, alert_type, severity, title, message, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(a.id, godownId, a.type, a.severity, a.title, a.msg, a.batchId);
    }

    // 7. Settings
    const settings = [
      { key: 'DEMO_TODAY', val: '2025-10-23', desc: 'Reference demo date for age and shelf-life calculations' },
      { key: 'ALLOW_PARTIAL_DISPATCH', val: 'true', desc: 'Whether to allow dispatch when shortfall occurs' },
      { key: 'PENDING_INSPECTION_DEFAULT', val: 'false', desc: 'Whether newly inwarded batches default to Hold' },
      { key: 'HOLD_APPROVAL_DAYS', val: '7', desc: 'Days on hold after which Officer approval is mandated for release' },
      { key: 'WORKING_HOURS_START', val: '08:00', desc: 'Godown operations start time' },
      { key: 'WORKING_HOURS_END', val: '18:00', desc: 'Godown operations close time' },
    ];

    for (const s of settings) {
      db.prepare(`
        INSERT INTO settings (key, value, description)
        VALUES (?, ?, ?)
      `).run(s.key, s.val, s.desc);
    }
  });

  tx();
  console.log('✓ BhandarSetu Database initialized and seeded successfully.');
}

