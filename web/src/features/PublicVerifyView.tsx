import React, { useState } from 'react';
import { 
  ShieldCheck, QrCode, CheckCircle, FileText, 
  MapPin, Truck, Calendar, ArrowLeft, Printer, Share2, Award
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { QuantityText } from '../components/ui/QuantityText';

export const PublicVerifyView: React.FC = () => {
  const { setScreen } = useUIStore();
  const { t } = useTranslation();

  const [verifyToken, setVerifyToken] = useState('DSP-2026-NAG-8812');

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      {/* Top Bar for Demo Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setScreen('control-tower')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Internal Control Tower
        </button>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
          Public Endpoint: /verify/{verifyToken}
        </span>
      </div>

      {/* Main Official Verification Card */}
      <div className="rounded-2xl bg-surface border border-border shadow-lg overflow-hidden">
        {/* Civic Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 text-center space-y-2 relative">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 mx-auto flex items-center justify-center text-amber-400">
            <Award className="w-7 h-7" />
          </div>
          <h1 className="text-base font-bold tracking-tight">
            Government of Maharashtra · Food & Civil Supplies
          </h1>
          <p className="text-xs text-zinc-300">
            BhandarSetu Public Traceability & Dispatch Verification Gateway
          </p>
        </div>

        {/* Verification Status Pill */}
        <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" /> OFFICIAL DISPATCH AUTHENTICATED
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
            Cryptographic ledger proof matched with zero tampering
          </p>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-mono block">Gate Pass Ref</span>
              <strong className="font-mono text-sm text-foreground">{verifyToken}</strong>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-mono block">Issue Timestamp</span>
              <strong className="font-mono text-xs text-foreground">23 Oct 2026, 14:38 IST</strong>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-brand" /> Registered Vehicle
              </span>
              <span className="font-mono font-bold text-foreground">MH-31-AP-4921</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand" /> Origin Godown
              </span>
              <span className="font-semibold text-foreground">Nagpur Central Food Godown</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand" /> Destination FPS
              </span>
              <span className="font-mono font-bold text-foreground">FPS-NGP-101 (Sitabuldi)</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Commodity & Weight</span>
              <span className="font-mono font-bold text-foreground">Wheat Grade A · 1,000 kg (20 Quintals)</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">FIFO Compliance</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                100% (Batch BATCH-WHT-2026-001)
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Driver In-Charge</span>
              <span className="font-medium text-foreground">Raju Kulkarni (+91 98230 12944)</span>
            </div>
          </div>

          {/* SHA-256 Ledger Attestation */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-mono block">
              Cryptographic Ledger Signature
            </span>
            <div className="text-[10px] font-mono text-muted-foreground break-all">
              sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
            </div>
          </div>

          {/* Mobile Sharing Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted text-foreground flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Gate Pass
            </button>
            <button
              onClick={() => alert(`Share link copied: ${window.location.origin}/verify/${verifyToken}`)}
              className="flex-1 py-2.5 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share Proof Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

