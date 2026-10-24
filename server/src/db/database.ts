import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'bhandarsetu.db');

export const db: Database.Database = new Database(DB_PATH);

// Enable SQLite Write-Ahead Logging (WAL) for maximum concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

/**
 * Initialize Database Schema from SQL migrations
 */
export function initializeDatabase() {
  const migrationPath = path.resolve(__dirname, 'migrations/001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  db.exec(sql);
}

/**
 * Append to cryptographically hash-chained audit log
 */
export function appendAuditLog(params: {
  actorId: string | null;
  actorRole: string;
  action: string;
  entityName: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
}): string {
  // 1. Get the latest row hash in the chain
  const latestRow = db.prepare('SELECT row_hash FROM audit_log ORDER BY id DESC LIMIT 1').get() as { row_hash: string } | undefined;
  const prevHash = latestRow?.row_hash || '0'.repeat(64); // Genesis hash

  const beforeJson = params.beforeState ? JSON.stringify(params.beforeState) : null;
  const afterJson = params.afterState ? JSON.stringify(params.afterState) : null;
  const now = new Date().toISOString();

  // 2. Compute SHA-256 (prevHash + actorId + action + entityId + payload)
  const payloadToHash = `${prevHash}|${params.actorId || 'SYSTEM'}|${params.action}|${params.entityName}|${params.entityId}|${beforeJson}|${afterJson}|${now}`;
  const rowHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

  // 3. Insert into audit_log
  const stmt = db.prepare(`
    INSERT INTO audit_log (
      actor_id, actor_role, action, entity_name, entity_id,
      before_state, after_state, ip_address, prev_hash, row_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    params.actorId,
    params.actorRole,
    params.action,
    params.entityName,
    params.entityId,
    beforeJson,
    afterJson,
    params.ipAddress || '127.0.0.1',
    prevHash,
    rowHash,
    now
  );

  return rowHash;
}

