import React, { useState } from 'react';
import { QrCode, Camera, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, Search, FileText } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusPill } from '../../components/ui/StatusPill';
import { calculateAgeDays, formatNumber } from '../../lib/format';
import { DEMO_TODAY } from '../../data/seedData';

export const ScannerView: React.FC = () => {
  const { batches, setSelectedBatch, setActiveRoute } = useStore();
  const [manualToken, setManualToken] = useState('B001');
  const [scannedBatchId, setScannedBatchId] = useState<string | null>('B001');
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'mismatch'>('success');
  const [expectedBatchId, setExpectedBatchId] = useState<string>('B001');

  const activeBatch = batches.find(b => b.id.toUpperCase() === (scannedBatchId || '').toUpperCase());

  const handleScan = (batchId: string) => {
    setScannedBatchId(batchId);
    if (expectedBatchId && batchId.toUpperCase() !== expectedBatchId.toUpperCase()) {
      setScanStatus('mismatch');
    } else {
      setScanStatus('success');
    }
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto">
      {/* Page Title */}
      <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EBF3FC] text-[#0B4DA8] flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A]">QR / Barcode Batch Scanner</h2>
            <p className="text-[13px] text-[#64748B]">Scan physical gunny bag QR tags for instant provenance, age, and dispatch verification</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Camera Ready
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Camera Viewport & Manual Fallback */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
            <h3 className="text-[15px] font-bold text-[#0F172A] flex items-center justify-between">
              <span>Live Scanner Viewfinder</span>
              <span className="text-xs text-slate-400 font-normal">Rear Sensor 1080p</span>
            </h3>

            {/* Viewfinder Window */}
            <div className="relative aspect-video rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center overflow-hidden group">
              {/* Animated Scan Line */}
              <div className="absolute inset-x-0 h-0.5 bg-[#3B82F6] shadow-[0_0_12px_#3B82F6] animate-bounce" />

              {/* Reticle Overlay */}
              <div className="w-48 h-48 border-2 border-white/40 rounded-xl relative flex items-center justify-center">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FBBF24]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FBBF24]" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FBBF24]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FBBF24]" />
                <QrCode className="w-16 h-16 text-white/30" />
              </div>

              <div className="absolute bottom-3 text-center px-4 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[11px] text-white">
                Align QR Code within the yellow reticle
              </div>
            </div>

            {/* Quick Demo Simulator Buttons */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Simulate Hardware Scan Tag:</p>
              <div className="flex flex-wrap gap-2">
                {batches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleScan(b.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      scannedBatchId === b.id
                        ? 'bg-[#0B4DA8] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Tag {b.id} ({b.commodity})
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Entry Fallback */}
            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Manual Batch ID or QR Token Fallback
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="e.g. B001 or BS-B001-..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-[#0B4DA8] focus:outline-hidden font-mono"
                />
                <button
                  onClick={() => handleScan(manualToken)}
                  className="px-4 py-2 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  Lookup
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scanned Batch Details & Dispatch Verification */}
        <div className="lg:col-span-6 space-y-6">
          {activeBatch ? (
            <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Verified Consignment Tag</span>
                  <h3 className="text-2xl font-bold font-mono text-[#0F172A] flex items-center gap-3">
                    {activeBatch.id}
                    <StatusPill status={activeBatch.qualityStatus} />
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Days in Godown</span>
                  <span className="text-lg font-bold font-mono text-slate-800">
                    {calculateAgeDays(activeBatch.arrivalDate, DEMO_TODAY)} Days
                  </span>
                </div>
              </div>

              {/* Status Warning Banner if Mismatch */}
              {scanStatus === 'mismatch' && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">FIFO DISPATCH MISMATCH BLOCKED</span>
                    Scanned batch {activeBatch.id} does not match allocated batch {expectedBatchId}. Loading this batch violates FIFO order.
                  </div>
                </div>
              )}

              {/* Specification Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Commodity</span>
                  <span className="font-bold text-slate-800 text-sm">{activeBatch.commodity}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Arrival Date</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">{activeBatch.arrivalDate}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Available Stock</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">
                    {formatNumber(activeBatch.availableQuantity)} Bags ({(activeBatch.availableQuantity * 50).toLocaleString()} kg)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Supplier Depot</span>
                  <span className="font-bold text-slate-800 text-sm">{activeBatch.supplier || 'FCI Depot'}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                <span className="font-semibold text-blue-900 block mb-0.5">Inspection / Grade Notes:</span>
                <p className="text-blue-800">{activeBatch.holdReason || activeBatch.notes || 'Meets FAQ grain standards.'}</p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    setSelectedBatch(activeBatch);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  View Full Consignment Drawer
                </button>

                <button
                  onClick={() => setActiveRoute('quality')}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Flag for Inspection
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white border border-[#E3E8F0] shadow-xs text-center space-y-3">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No Batch Scanned Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Scan a barcode using the camera or select one of the simulation tags on the left to review batch specs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

