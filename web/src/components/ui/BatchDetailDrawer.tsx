import React from 'react';
import { X, Calendar, Package, AlertTriangle, ShieldCheck, Truck, Clock, CheckCircle2, Building2, MapPin, Hash, QrCode } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { calculateAgeDays, formatNumber } from '../../lib/format';
import { StatusPill } from './StatusPill';

interface BatchDetailDrawerProps {
  onOpenStatusModal: (batchId: string, action: 'Hold' | 'Eligible' | 'Rejected') => void;
}

export const BatchDetailDrawer: React.FC<BatchDetailDrawerProps> = ({ onOpenStatusModal }) => {
  const { selectedBatch, setSelectedBatch, dispatches, user } = useStore();

  if (!selectedBatch) return null;

  const ageDays = calculateAgeDays(selectedBatch.arrivalDate);
  const dispatchesUsingBatch = dispatches.filter((d) => d.batchesUsed.includes(selectedBatch.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border-l border-[#E3E8F0] h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E8F0]">
          <div>
            <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider block">
              Consignment Dossier &amp; Provenance
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h2 className="text-[20px] font-mono font-bold text-[#0F172A]">
                {selectedBatch.id}
              </h2>
              <StatusPill status={selectedBatch.qualityStatus} />
            </div>
          </div>
          <button
            onClick={() => setSelectedBatch(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="py-5 space-y-6 flex-1">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-[#64748B] block font-medium">Available Balance</span>
              <span className="text-[20px] font-mono font-bold text-[#0F172A] tabular-nums mt-0.5 block">
                {formatNumber(selectedBatch.availableQuantity)} Bags
              </span>
              <span className="text-[11px] text-slate-400">Total: {formatNumber(selectedBatch.totalQuantity)} Bags (≈{(selectedBatch.totalQuantity * 50).toLocaleString()} kg)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-[#64748B] block font-medium">Storage Age</span>
              <span className="text-[20px] font-mono font-bold text-[#0F172A] tabular-nums mt-0.5 block">
                {ageDays} Days
              </span>
              <span className="text-[11px] text-slate-400">Arrived: {selectedBatch.arrivalDate}</span>
            </div>
          </div>

          {/* Consignment Coordinates & Specifications */}
          <div className="p-4 rounded-xl border border-[#E3E8F0] space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Commodity</span>
              <span className="font-bold text-[#0F172A]">{selectedBatch.commodity}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Supplier / Depot</span>
              <span className="font-medium text-[#0F172A]">{selectedBatch.supplier || 'FCI Base Depot'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Receipt / Gate Pass</span>
              <span className="font-mono font-semibold text-[#0F172A]">{selectedBatch.receiptNo || 'RC-2025-0891'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Storage Warehouse</span>
              <span className="font-medium text-[#0F172A]">{selectedBatch.warehouse || 'Surajpur Central Depot'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-[#64748B]">Stack / Section</span>
              <span className="font-mono font-medium text-slate-700">{selectedBatch.storageSection || 'Bay-A, Stack-01'}</span>
            </div>
            {selectedBatch.vehicleNo && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Transport Vehicle</span>
                <span className="font-mono text-slate-700">{selectedBatch.vehicleNo}</span>
              </div>
            )}
            {selectedBatch.holdReason && (
              <div className="py-1">
                <span className="text-[#64748B] block mb-1">Quality Inspection Reason</span>
                <p className="text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-medium">
                  {selectedBatch.holdReason}
                </p>
              </div>
            )}
            {selectedBatch.notes && !selectedBatch.holdReason && (
              <div className="py-1">
                <span className="text-[#64748B] block mb-1">Inward Notes</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedBatch.notes}
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1D6FE8]" />
              Batch History &amp; Lifecycle Timeline
            </h4>

            <div className="relative pl-6 space-y-4 border-l-2 border-blue-200 ml-2 text-xs">
              {/* Event 1: Arrival */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#1D6FE8] border-2 border-white" />
                <p className="font-semibold text-[#0F172A]">Consignment Inward Receipt</p>
                <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                  {selectedBatch.arrivalDate} · {formatNumber(selectedBatch.totalQuantity)} Bags inward · Registered by {selectedBatch.registeredBy || 'Aayush Tripathi'}
                </p>
              </div>

              {/* Event 2: Quality Inspection */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  selectedBatch.qualityStatus === 'Hold' ? 'bg-amber-500' : selectedBatch.qualityStatus === 'Rejected' ? 'bg-red-500' : selectedBatch.qualityStatus === 'Pending Inspection' ? 'bg-amber-400' : 'bg-emerald-500'
                }`} />
                <p className="font-semibold text-[#0F172A]">Quality Assay Status: {selectedBatch.qualityStatus}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {selectedBatch.qualityStatus === 'Eligible'
                    ? 'Certified grain moisture & pest tolerance passed'
                    : selectedBatch.qualityStatus === 'Pending Inspection'
                    ? 'Awaiting laboratory inspection assay before allocation release'
                    : selectedBatch.holdReason || 'Inspection review active'}
                </p>
              </div>

              {/* Event 3: Dispatches (if any) */}
              {dispatchesUsingBatch.map((disp) => (
                <div key={disp.id} className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white" />
                  <p className="font-semibold text-[#0F172A]">Dispatched in {disp.id}</p>
                  <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                    {disp.dispatchDate} · Destination: {disp.destination}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div className="pt-4 border-t border-[#E3E8F0] flex items-center gap-2.5">
          {selectedBatch.qualityStatus !== 'Hold' && (
            <button
              onClick={() => {
                onOpenStatusModal(selectedBatch.id, 'Hold');
              }}
              className="flex-1 py-2 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Put on Hold
            </button>
          )}

          {selectedBatch.qualityStatus !== 'Eligible' && (
            <button
              onClick={() => {
                onOpenStatusModal(selectedBatch.id, 'Eligible');
              }}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Release to Eligible
            </button>
          )}

          {selectedBatch.qualityStatus !== 'Rejected' && (
            <button
              onClick={() => {
                onOpenStatusModal(selectedBatch.id, 'Rejected');
              }}
              className="flex-1 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reject Batch
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
