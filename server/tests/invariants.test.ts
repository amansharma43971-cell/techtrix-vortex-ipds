import { describe, it, expect, beforeAll } from 'vitest';
import { db, initializeDatabase, appendAuditLog } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed/seed.js';
import { verifyAuditChain } from '../src/services/auditService.js';

describe('Database Invariants & Ledger Security', () => {
  beforeAll(() => {
    initializeDatabase();
    seedDatabase();
  });

  it('guarantees stock_movements ledger is strictly immutable (rejects UPDATE)', () => {
    const firstMovement = db.prepare('SELECT id FROM stock_movements LIMIT 1').get() as { id: number };
    expect(firstMovement).toBeDefined();

    expect(() => {
      db.prepare('UPDATE stock_movements SET qty_delta = 999 WHERE id = ?').run(firstMovement.id);
    }).toThrow(/LEDGER_IMMUTABLE/);
  });

  it('guarantees audit_log is strictly immutable (rejects DELETE)', () => {
    const firstAudit = db.prepare('SELECT id FROM audit_log LIMIT 1').get() as { id: number };
    expect(firstAudit).toBeDefined();

    expect(() => {
      db.prepare('DELETE FROM audit_log WHERE id = ?').run(firstAudit.id);
    }).toThrow(/AUDIT_IMMUTABLE/);
  });

  it('verifies v_balance_mismatch returns zero rows on seeded state', () => {
    const mismatches = db.prepare('SELECT * FROM v_balance_mismatch').all();
    expect(mismatches).toHaveLength(0);
  });

  it('verifies SHA-256 cryptographic audit hash chain integrity', () => {
    const verification = verifyAuditChain();
    expect(verification.verified).toBe(true);
    expect(verification.brokenAtId).toBeNull();
    expect(verification.totalRecords).toBeGreaterThan(0);
  });
});

