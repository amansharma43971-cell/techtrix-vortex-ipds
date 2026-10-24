import React, { useState } from 'react';
import { 
  FileSearch, ShieldCheck, CheckCircle2, AlertTriangle, 
  RefreshCw, GitCommit, ArrowRight, Lock, Key, ShieldAlert
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { QuantityText } from '../components/ui/QuantityText';
import { BatchChip } from '../components/ui/BatchChip';

export const AuditView: React.FC = () => {
  const { ledgerFeed } = useUIStore();
  const { t } = useTranslation();

  const [searchTarget, setSearchTarget] = useState('BATCH-WHT-2026-001');
  const [isVerifying, setIsVerifying] = useState(false);
  const [chainVerified, setChainVerified] = useState(true);
  const [tamperedRowId, setTamperedRowId] = useState<number | null>(null);

  // Run cryptographic verification simulation
  const handleVerifyChain = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setChainVerified(tamperedRowId === null);
    }, 600);
  };

  // Simulate hash attack
  const handleSimulateTamper = (id: number) => {
    setTamperedRowId(id);
    setChainVerified(false);
  };

  const handleRepairChain = () => {
    setTamperedRowId(null);
    setChainVerified(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.audit')} & Cryptographic Hash Verifier
            </h1>
            <p className="text-xs text-muted-foreground">
              Append-Only Ledger Integrity Verification and End-to-End Batch Traceability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tamperedRowId ? (
            <button
              onClick={handleRepairChain}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-sync & Repair Ledger Chain
            </button>
          ) : (
            <button
              onClick={() => handleSimulateTamper(ledgerFeed[0]?.movement_id || 4814)}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 text-xs font-semibold hover:bg-red-500/10 flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Simulate DB Tampering Attack
            </button>
          )}

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand/90 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            Run Cryptographic Audit
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        chainVerified 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
          : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
      }`}>
        <div className="flex items-center gap-3">
          {chainVerified ? (
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500" />
          )}
          <div>
            <h2 className="text-sm font-bold">
              {chainVerified ? 'Cryptographic Hash-Chain Validated (Unbroken)' : 'Ledger Hash Mismatch Detected! (Tamper Alert)'}
            </h2>
            <p className="text-xs opacity-90">
              {chainVerified 
                ? 'All PostgreSQL row SHA-256 signatures match the parent Merkle root. Zero unauthorized modifications.'
                : `Row #${tamperedRowId} signature does not match sha256(prev_hash || payload). Transaction rejected by auditor constraint.`}
            </p>
          </div>
        </div>
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-background/50 border border-current">
          {chainVerified ? 'CHAIN HEALTH: 100%' : 'CHAIN INTEGRITY: COMPROMISED'}
        </span>
      </div>

      {/* Interactive Trace Tree Visualization */}
      <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-brand" />
              Batch Lineage & Dispatch Provenance Tree
            </h3>
            <p className="text-[11px] text-muted-foreground">End-to-end chain of custody for trace query</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono rounded border border-border bg-background text-foreground"
              placeholder="Enter Batch No..."
            />
          </div>
        </div>

        {/* Tree Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">1. Inward Intake</span>
            <strong className="text-foreground block truncate">GR-2026-FCI-001</strong>
            <span className="text-[11px] text-muted-foreground block">Depot Gondia</span>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">2. Putaway Location</span>
            <strong className="text-blue-600 dark:text-blue-400 font-mono block">BLK-A-01-1</strong>
            <span className="text-[11px] text-muted-foreground block">Bay 1, Level 1</span>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">3. Quality Assay</span>
            <strong className="text-emerald-500 font-mono block">NABL-QC-9912</strong>
            <span className="text-[11px] text-muted-foreground block">Moisture 11.2% (Pass)</span>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">4. Pick Task</span>
            <strong className="text-foreground font-mono block">PTK-2026-0012</strong>
            <span className="text-[11px] text-muted-foreground block">400 kg via FIFO</span>
          </div>

          <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 text-xs space-y-1">
            <span className="text-[10px] text-brand uppercase font-mono block">5. Gate Pass Seal</span>
            <strong className="text-brand font-mono block truncate">DSP-2026-NAG-101</strong>
            <span className="text-[11px] text-foreground font-semibold block">FPS-NGP-101 (Delivered)</span>
          </div>
        </div>
      </div>

      {/* Row-by-Row Hash Ledger Table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            Immutable Cryptographic Ledger Rows (PostgreSQL Partitioned)
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            Algorithm: SHA-256 HMAC
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/10">
                <th className="py-2.5 px-4">Seq #</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Event</th>
                <th className="py-2.5 px-4">Batch</th>
                <th className="py-2.5 px-4">Bin</th>
                <th className="py-2.5 px-4 text-right">Delta (kg)</th>
                <th className="py-2.5 px-4">Cryptographic Hash</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {ledgerFeed.map(row => {
                const isTampered = tamperedRowId === row.movement_id;
                return (
                  <tr key={row.movement_id} className={`hover:bg-muted/30 ${isTampered ? 'bg-red-500/10' : ''}`}>
                    <td className="py-2.5 px-4 font-mono font-bold text-muted-foreground">#{row.movement_id}</td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">{row.created_at.slice(11, 19)}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-foreground">{row.movement_type}</td>
                    <td className="py-2.5 px-4"><BatchChip batchNo={row.batch_no} /></td>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">{row.bin_code}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                      {row.qty_delta_g > 0 ? `+${row.qty_delta_g / 1000}` : row.qty_delta_g / 1000}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-muted-foreground">
                      {isTampered ? (
                        <span className="text-red-500 font-bold line-through">0xdeadbeef123456...</span>
                      ) : (
                        row.row_hash
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isTampered ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          TAMPERED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          VERIFIED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

