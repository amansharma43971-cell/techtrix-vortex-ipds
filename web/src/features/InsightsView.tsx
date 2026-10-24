import React from 'react';
import { 
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { MOCK_COMMODITIES } from '../mocks/mockData';

export const InsightsView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.insights')} & Operational Analytics
            </h1>
            <p className="text-xs text-muted-foreground">
              FIFO Compliance Tracking, Exception Diagnostics, and Stock Cover Projections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
            Current Period: October 2026
          </span>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            FIFO Dispatch Compliance
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">98.4%</span>
            <span className="text-xs text-emerald-500 flex items-center font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" /> +1.2%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Only 2 bypasses in past 128 dispatches</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Average Stock Age at Dispatch
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-foreground">34.2 Days</span>
            <span className="text-xs text-emerald-500 flex items-center font-bold">
              <ArrowDownRight className="w-3.5 h-3.5" /> -4.5d
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Reduced holding dwell time by 11%</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Net Weight Shrinkage / Loss
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-foreground">0.18%</span>
            <span className="text-xs text-emerald-500 font-bold">Well within 0.5% SLA</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Primarily natural moisture loss</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Maker-Checker Turnaround
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-foreground">18 Mins</span>
            <span className="text-xs text-emerald-500 font-bold">SLA: &lt; 2 hrs</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Fast dual-sign turnaround</p>
        </div>
      </div>

      {/* Grid: Exception Breakdown & Stock Cover Run-Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exception Reason Distribution */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-surface border border-border space-y-4">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            FIFO Bypass Reason Code Distribution
          </h3>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Physical Access Blocked (Forklift Crane Maintenance)', count: 8, pct: 57, color: 'bg-amber-500' },
              { label: 'Damaged Pallet / Bag Tear', count: 3, pct: 21, color: 'bg-blue-500' },
              { label: 'Suspected High Moisture / Re-test Hold', count: 2, pct: 14, color: 'bg-purple-500' },
              { label: 'Administrative / Court Order Reservation', count: 1, pct: 8, color: 'bg-zinc-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate">{item.label}</span>
                  <span className="font-mono text-muted-foreground">{item.count} ({item.pct}%)</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Cover Projections */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-surface border border-border space-y-4">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" />
            Commodity-wise Stock Cover Days
          </h3>

          <div className="space-y-3 pt-2">
            {MOCK_COMMODITIES.map((c, idx) => {
              const coverDays = [42, 28, 65, 14][idx % 4];
              const isLow = coverDays < 20;

              return (
                <div key={c.id} className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">Allocation: {c.policy}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-mono font-bold block ${isLow ? 'text-red-500' : 'text-foreground'}`}>
                      {coverDays} Days
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isLow ? 'Buffer Critical (<21d)' : 'Buffer Healthy'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

