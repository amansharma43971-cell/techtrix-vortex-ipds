import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { QrCode, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Building2, MapPin, Calendar, Boxes } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatNumber, calculateAgeDays } from '../../lib/format';
import { DEMO_TODAY } from '../../data/seedData';

export const BatchDetailView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { batches } = useStore();

  // Find batch by token or ID
  const batch = batches.find(
    (b) => b.qrToken === token || b.id.toUpperCase() === (token || '').toUpperCase()
  );

  if (!batch) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Consignment Tag Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested QR token <span className="font-mono font-bold text-slate-800">{token}</span> does not match any authenticated grain batch in the iPDS registry.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B4DA8] text-white text-xs font-semibold rounded-lg hover:bg-[#0A2F6B]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const ageDays = calculateAgeDays(batch.arrivalDate, DEMO_TODAY);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/inventory"
          className="text-xs font-semibold text-[#0B4DA8] hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory &amp; Batches</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">Token: {batch.qrToken || batch.id}</span>
      </div>

      {/* Verified Tag Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E3E8F0] shadow-md space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0B4DA8] flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Authenticated Gunny Bag Tag
              </span>
              <h1 className="text-2xl font-bold font-mono text-[#0F172A]">{batch.id}</h1>
            </div>
          </div>

          <StatusPill status={batch.qualityStatus} />
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block mb-0.5">Commodity</span>
            <span className="font-bold text-slate-900 text-sm">{batch.commodity}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block mb-0.5">Arrival Date</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{batch.arrivalDate}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block mb-0.5">Available Balance</span>
            <span className="font-mono font-bold text-[#0B4DA8] text-sm">
              {formatNumber(batch.availableQuantity)} / {formatNumber(batch.totalQuantity)} Bags
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block mb-0.5">Storage Age</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{ageDays} Days in Depot</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg col-span-2">
            <span className="text-slate-500 block mb-0.5">Warehouse Location</span>
            <span className="font-medium text-slate-800">
              {batch.warehouse || 'Surajpur Central Depot'} · {batch.storageSection || 'Bay-A, Stack-01'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg col-span-2">
            <span className="text-slate-500 block mb-0.5">Procurement Source</span>
            <span className="font-medium text-slate-800">{batch.supplier || 'FCI Central Pool'}</span>
          </div>
        </div>

        {/* Inspection Notice */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <span className="font-bold block mb-1">Quality Status: {batch.qualityStatus}</span>
          {batch.qualityStatus === 'Pending Inspection' && (
            <p>This batch is currently under quarantine. Quality inspection must certify moisture and cleanliness before FIFO allocation.</p>
          )}
          {batch.qualityStatus === 'Eligible' && (
            <p>Grain meets Fair Average Quality (FAQ) standards. Eligible for FIFO dispatch allocation.</p>
          )}
          {batch.qualityStatus === 'Hold' && (
            <p>Batch placed on hold: {batch.holdReason || 'Pending laboratory re-assay'}. Blocked from dispatch.</p>
          )}
          {batch.qualityStatus === 'Rejected' && (
            <p>Batch failed inspection: {batch.holdReason || 'Infestation detected'}. Scheduled for return or write-off.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchDetailView;

