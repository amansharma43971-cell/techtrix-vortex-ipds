import React, { useState, useMemo } from 'react';
import { 
  Boxes, Search, Filter, ArrowUpDown, ChevronRight, MapPin, 
  Clock, ShieldAlert, AlertTriangle, FileText, Download, X
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { MOCK_BATCHES, MOCK_COMMODITIES, MOCK_BINS, Batch } from '../mocks/mockData';
import { StatusPill } from '../components/ui/StatusPill';
import { AgeBadge } from '../components/ui/AgeBadge';
import { QuantityText } from '../components/ui/QuantityText';
import { BatchChip } from '../components/ui/BatchChip';
import { calculateAgeDays, formatDate } from '../lib/formatters';

export const InventoryView: React.FC = () => {
  const { density } = useUIStore();
  const { t } = useTranslation();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedAgeBracket, setSelectedAgeBracket] = useState('ALL');

  // Selected Batch for Drawer & Stack Locator
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return MOCK_BATCHES.filter(b => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch = 
          b.batch_no.toLowerCase().includes(q) || 
          b.bin_code.toLowerCase().includes(q) || 
          b.supplier.toLowerCase().includes(q) ||
          b.receipt_no.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Commodity Filter
      if (selectedCommodity !== 'ALL' && b.commodity_id !== selectedCommodity) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL' && b.status !== selectedStatus) {
        return false;
      }

      // Age Filter
      if (selectedAgeBracket !== 'ALL') {
        const age = calculateAgeDays(b.received_date);
        if (selectedAgeBracket === '<30' && age >= 30) return false;
        if (selectedAgeBracket === '31-60' && (age < 30 || age > 60)) return false;
        if (selectedAgeBracket === '61-90' && (age < 61 || age > 90)) return false;
        if (selectedAgeBracket === '90+' && age <= 90) return false;
      }

      return true;
    });
  }, [searchTerm, selectedCommodity, selectedStatus, selectedAgeBracket]);

  // Aggregate stats
  const totalStockGrams = useMemo(() => {
    return filteredBatches.reduce((acc, b) => acc + b.current_qty_g, 0);
  }, [filteredBatches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.inventory')} & Stack Locator
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time batch-level inventory ledger, physical bin coordinates, and shelf-life tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block uppercase font-mono">Filtered Active Stock</span>
            <span className="text-sm font-mono font-bold text-foreground">
              <QuantityText grams={totalStockGrams} />
            </span>
          </div>
          <button
            onClick={() => alert('Exporting Inventory CSV...')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-surface border border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search batch, bin, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        {/* Commodity Filter */}
        <div>
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium"
          >
            <option value="ALL">All Commodities</option>
            {MOCK_COMMODITIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="QUALITY_HOLD">Quality Hold</option>
            <option value="QUARANTINED_RECALL">Quarantined / Recall</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Age Filter */}
        <div>
          <select
            value={selectedAgeBracket}
            onChange={(e) => setSelectedAgeBracket(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium"
          >
            <option value="ALL">All Age Brackets</option>
            <option value="<30">&lt; 30 Days (Fresh)</option>
            <option value="31-60">31 - 60 Days</option>
            <option value="61-90">61 - 90 Days</option>
            <option value="90+">90+ Days (Ageing Priority)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground bg-muted/20">
                <th className="py-2.5 px-4">Batch Number</th>
                <th className="py-2.5 px-4">Commodity</th>
                <th className="py-2.5 px-4">Physical Bin</th>
                <th className="py-2.5 px-4">Age (Days)</th>
                <th className="py-2.5 px-4 text-right">Current Stock</th>
                <th className="py-2.5 px-4">Supplier / Source</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredBatches.map(batch => {
                const ageDays = calculateAgeDays(batch.received_date);
                const comm = MOCK_COMMODITIES.find(c => c.id === batch.commodity_id);
                const isSelected = selectedBatch?.id === batch.id;

                return (
                  <tr 
                    key={batch.id} 
                    onClick={() => setSelectedBatch(batch)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand/5 border-l-2 border-brand' : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      <BatchChip batchNo={batch.batch_no} />
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {comm?.name || 'Wheat'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {batch.bin_code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <AgeBadge days={ageDays} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-foreground">
                      <QuantityText grams={batch.current_qty_g} />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-xs">
                      {batch.supplier}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusPill status={batch.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-muted-foreground hover:text-foreground">
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-muted/20 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>Showing {filteredBatches.length} batch stacks</span>
          <span>Click any row to open batch provenance & physical stack locator</span>
        </div>
      </div>

      {/* BATCH DETAIL & STACK LOCATOR DRAWER */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-surface border-l border-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Stack Batch Dossier</span>
                <h2 className="text-base font-mono font-bold text-foreground">
                  {selectedBatch.batch_no}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedBatch(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6 flex-1">
              {/* Status and Age banner */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Stack Status</span>
                  <StatusPill status={selectedBatch.status} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block mb-1">Stack Age</span>
                  <AgeBadge days={calculateAgeDays(selectedBatch.received_date)} />
                </div>
              </div>

              {/* Physical Coordinates */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand" />
                  Physical Godown Coordinates
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-muted/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Zone</span>
                    <strong className="font-mono text-xs text-foreground">BULK-A</strong>
                  </div>
                  <div className="p-2 rounded bg-muted/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Rack</span>
                    <strong className="font-mono text-xs text-foreground">A</strong>
                  </div>
                  <div className="p-2 rounded bg-muted/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Bay</span>
                    <strong className="font-mono text-xs text-foreground">01</strong>
                  </div>
                  <div className="p-2 rounded bg-muted/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Level</span>
                    <strong className="font-mono text-xs text-blue-600 dark:text-blue-400">1 (Ground)</strong>
                  </div>
                </div>
              </div>

              {/* Provenance Lineage */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand" />
                  Supply Chain Provenance Lineage
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Depot Supplier</span>
                    <span className="font-semibold text-foreground">{selectedBatch.supplier}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Inward Receipt No</span>
                    <span className="font-mono text-foreground">{selectedBatch.receipt_no}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Vehicle Reg No</span>
                    <span className="font-mono uppercase text-foreground">{selectedBatch.vehicle_no}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Date of Intake</span>
                    <span className="font-mono text-foreground">{formatDate(selectedBatch.received_date)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Expiry / Re-bagging Date</span>
                    <span className="font-mono text-foreground">{formatDate(selectedBatch.expiry_date)}</span>
                  </div>
                </div>
              </div>

              {/* Stock Depletion Progress */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Initial vs Remaining Stock</span>
                  <span className="font-mono font-bold text-foreground">
                    <QuantityText grams={selectedBatch.current_qty_g} /> / <QuantityText grams={selectedBatch.received_qty_g} />
                  </span>
                </div>
                <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand h-full rounded-full transition-all"
                    style={{ width: `${(selectedBatch.current_qty_g / selectedBatch.received_qty_g) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-border flex items-center gap-3">
              <button
                onClick={() => {
                  alert(`Relocation task for ${selectedBatch.batch_no} initiated.`);
                  setSelectedBatch(null);
                }}
                className="flex-1 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted text-foreground"
              >
                Relocate Stack
              </button>
              <button
                onClick={() => {
                  alert(`Quarantine Hold initiated for ${selectedBatch.batch_no}`);
                  setSelectedBatch(null);
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
              >
                Place Quality Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

