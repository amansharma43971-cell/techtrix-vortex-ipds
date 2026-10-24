import React, { useState, useMemo } from 'react';
import { 
  Scale, CheckCircle2, AlertTriangle, ShieldCheck, 
  RotateCcw, Save, ArrowRight, FileCheck, Layers, HelpCircle
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { MOCK_BATCHES, Batch } from '../mocks/mockData';
import { QuantityText } from '../components/ui/QuantityText';
import { BatchChip } from '../components/ui/BatchChip';

interface CountRow {
  batch: Batch;
  systemKg: number;
  physicalKg: number;
  varianceKg: number;
  variancePct: number;
  status: 'TOLERANCE_OK' | 'WARNING' | 'BREACH';
}

export const ReconciliationView: React.FC = () => {
  const { activeRole, addLedgerMovement, addApprovalRequest } = useUIStore();
  const { t } = useTranslation();

  // Active batches for Nagpur godown
  const initialCounts = useMemo(() => {
    return MOCK_BATCHES.slice(0, 6).map(b => {
      const sysKg = b.current_qty_g / 1000;
      return {
        batchId: b.id,
        physicalKg: sysKg // initially exact
      };
    });
  }, []);

  const [counts, setCounts] = useState<{ [key: string]: number }>(() => {
    const map: { [key: string]: number } = {};
    MOCK_BATCHES.slice(0, 6).forEach(b => {
      map[b.id] = b.current_qty_g / 1000;
    });
    // Add one deliberate realistic variance
    if (MOCK_BATCHES[1]) {
      map[MOCK_BATCHES[1].id] = (MOCK_BATCHES[1].current_qty_g / 1000) - 25; // 25kg moisture loss
    }
    return map;
  });

  const [isSaved, setIsSaved] = useState(false);

  // Compute variance rows
  const computedRows: CountRow[] = useMemo(() => {
    return MOCK_BATCHES.slice(0, 6).map(b => {
      const systemKg = b.current_qty_g / 1000;
      const physicalKg = counts[b.id] ?? systemKg;
      const varianceKg = physicalKg - systemKg;
      const variancePct = systemKg > 0 ? (varianceKg / systemKg) * 100 : 0;

      let status: 'TOLERANCE_OK' | 'WARNING' | 'BREACH' = 'TOLERANCE_OK';
      const absPct = Math.abs(variancePct);
      if (absPct > 1.5) {
        status = 'BREACH';
      } else if (absPct > 0.5) {
        status = 'WARNING';
      }

      return {
        batch: b,
        systemKg,
        physicalKg,
        varianceKg,
        variancePct,
        status
      };
    });
  }, [counts]);

  // Aggregate stats
  const totalSystemKg = computedRows.reduce((acc, r) => acc + r.systemKg, 0);
  const totalPhysicalKg = computedRows.reduce((acc, r) => acc + r.physicalKg, 0);
  const netVarianceKg = totalPhysicalKg - totalSystemKg;

  // Handle Commit to Ledger
  const handleCommitReconciliation = () => {
    // Record ledger adjustment
    computedRows.forEach(r => {
      if (r.varianceKg !== 0) {
        addLedgerMovement({
          movement_id: Math.floor(9000 + Math.random() * 1000),
          created_at: new Date().toISOString(),
          movement_type: 'ADJUSTMENT',
          batch_no: r.batch.batch_no,
          bin_code: r.batch.bin_code,
          qty_delta_g: r.varianceKg * 1000,
          balance_after_g: r.physicalKg * 1000,
          ref_no: `PHY-REC-${Date.now().toString().slice(-4)}`,
          actor: `${activeRole} (Physical Auditor)`,
          row_hash: `0x${Math.random().toString(16).substring(2, 10)}`
        });

        if (r.status === 'BREACH') {
          addApprovalRequest({
            id: `appr-var-${Date.now()}`,
            request_type: 'TRANSIT_LOSS_ESCALATION',
            reference_no: `VAR-2026-${Math.floor(100 + Math.random() * 900)}`,
            title: `Reconciliation Variance Breach on ${r.batch.batch_no}`,
            requested_by_id: 'u-auditor',
            requested_by_name: 'Physical Stock Auditor',
            details: `Observed discrepancy of ${r.varianceKg} kg (${r.variancePct.toFixed(2)}%) exceeds statutory 1.5% tolerance threshold. Requires Area Manager investigation.`,
            reason_code: 'STOCK_COUNT_BREACH',
            status: 'PENDING',
            created_at: new Date().toISOString(),
            sla_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
          });
        }
      }
    });

    setIsSaved(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.reconciliation')} & Physical Stock-Taking
            </h1>
            <p className="text-xs text-muted-foreground">
              Keyboard-First Count Sheet, Weight Tolerance Enforcer, and Loss Audit Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block font-mono">Net Count Variance</span>
            <span className={`text-sm font-mono font-bold ${netVarianceKg < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {netVarianceKg > 0 ? `+${netVarianceKg}` : netVarianceKg} kg
            </span>
          </div>
          <button
            onClick={() => setCounts(() => {
              const map: { [key: string]: number } = {};
              MOCK_BATCHES.slice(0, 6).forEach(b => {
                map[b.id] = b.current_qty_g / 1000;
              });
              return map;
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Counts
          </button>
        </div>
      </div>

      {/* Helper Banner */}
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brand" />
          <span>
            <strong>Keyboard Shortcut:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">Tab</kbd> to jump across physical weight inputs. Variances over <strong>±0.5%</strong> trigger alerts; over <strong>±1.5%</strong> escalate to maker-checker review.
          </span>
        </div>
      </div>

      {/* Main Physical Count Sheet */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/20">
                <th className="py-2.5 px-4">Stack / Bin</th>
                <th className="py-2.5 px-4">Batch Number</th>
                <th className="py-2.5 px-4 text-right">Ledger System Wt (kg)</th>
                <th className="py-2.5 px-4 text-right w-44">Physical Count (kg)</th>
                <th className="py-2.5 px-4 text-right">Variance (kg)</th>
                <th className="py-2.5 px-4 text-right">Variance (%)</th>
                <th className="py-2.5 px-4 text-center">Tolerance Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {computedRows.map((row, idx) => (
                <tr key={row.batch.id} className="hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {row.batch.bin_code}
                  </td>
                  <td className="py-3 px-4">
                    <BatchChip batchNo={row.batch.batch_no} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-foreground">
                    {row.systemKg.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      step="1"
                      value={counts[row.batch.id] ?? row.systemKg}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCounts(prev => ({ ...prev, [row.batch.id]: val }));
                        setIsSaved(false);
                      }}
                      className="w-36 text-right px-2.5 py-1.5 rounded border border-border bg-background text-foreground font-mono font-bold focus:ring-1 focus:ring-brand focus:outline-none"
                    />
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                    row.varianceKg < 0 ? 'text-amber-500' : row.varianceKg > 0 ? 'text-emerald-500' : 'text-muted-foreground'
                  }`}>
                    {row.varianceKg > 0 ? `+${row.varianceKg}` : row.varianceKg} kg
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                    Math.abs(row.variancePct) > 1.5 ? 'text-red-500' : Math.abs(row.variancePct) > 0.5 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}>
                    {row.variancePct > 0 ? `+${row.variancePct.toFixed(2)}` : row.variancePct.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.status === 'TOLERANCE_OK' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> In Tolerance
                      </span>
                    )}
                    {row.status === 'WARNING' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" /> Shrinkage Warn
                      </span>
                    )}
                    {row.status === 'BREACH' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" /> Breach Escalation
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Reconciliation adjustments committed to ledger.
              </span>
            ) : (
              <span>Uncommitted physical adjustments will be hashed and signed.</span>
            )}
          </div>
          <button
            onClick={handleCommitReconciliation}
            disabled={isSaved}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            Commit Physical Counts to Ledger
          </button>
        </div>
      </div>
    </div>
  );
};

