import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Ban } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { QualityStatus } from '../../data/types';

interface StatusChangeDialogProps {
  batchId: string | null;
  targetStatus: QualityStatus | null;
  onClose: () => void;
}

export const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  batchId,
  targetStatus,
  onClose
}) => {
  const { updateBatchStatus, batches } = useStore();
  const [reason, setReason] = useState('');

  if (!batchId || !targetStatus) return null;

  const batch = batches.find((b) => b.id === batchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason for the quality status update.');
      return;
    }
    updateBatchStatus(batchId, targetStatus, reason.trim());
    onClose();
  };

  const getTitle = () => {
    switch (targetStatus) {
      case 'Hold':
        return `Put Batch ${batchId} on Hold`;
      case 'Rejected':
        return `Reject Batch ${batchId}`;
      case 'Eligible':
        return `Release Batch ${batchId} to Eligible Stock`;
      default:
        return `Update Status for ${batchId}`;
    }
  };

  const getDefaultPlaceholder = () => {
    switch (targetStatus) {
      case 'Hold':
        return 'e.g. Moisture reading exceeded 14%, pending drying/aeration cycle.';
      case 'Rejected':
        return 'e.g. Weevil infestation observed; failed NABL re-assay.';
      case 'Eligible':
        return 'e.g. Moisture normalized to 11.2%; lab certificate #QC-882 passed.';
      default:
        return 'Enter reason...';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-[#E3E8F0] w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E3E8F0] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {targetStatus === 'Hold' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {targetStatus === 'Rejected' && <Ban className="w-5 h-5 text-red-500" />}
            {targetStatus === 'Eligible' && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
            <h3 className="text-[15px] font-bold text-[#0F172A]">{getTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Updating status for <strong>{batch?.commodity}</strong> ({batch?.availableQuantity} Bags in stock).
            This action will update stock metrics and trigger an audit alert.
          </p>

          <div>
            <label className="text-[13px] font-semibold text-[#475569] block mb-1">
              Reason / Inspection Report Reference *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={getDefaultPlaceholder()}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
              required
            />
          </div>

          <div className="pt-2 border-t border-[#E3E8F0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-xs ${
                targetStatus === 'Hold'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : targetStatus === 'Rejected'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Confirm Status Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

