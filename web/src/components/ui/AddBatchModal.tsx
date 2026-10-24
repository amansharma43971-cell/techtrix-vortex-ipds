import React, { useState } from 'react';
import { X, Plus, Calendar, Package, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CommodityType, QualityStatus } from '../../data/types';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({ isOpen, onClose }) => {
  const { batches, addBatch } = useStore();

  // Auto-suggest next batch ID e.g. B008
  const existingNums = batches
    .map((b) => parseInt(b.id.replace('B', ''), 10))
    .filter((n) => !isNaN(n));
  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 7;
  const defaultNextId = `B${String(maxNum + 1).padStart(3, '0')}`;

  const [batchId, setBatchId] = useState(defaultNextId);
  const [commodity, setCommodity] = useState<CommodityType>('Wheat');
  const [arrivalDate, setArrivalDate] = useState('23-10-2025');
  const [quantity, setQuantity] = useState<number>(150);
  const [status, setStatus] = useState<QualityStatus>('Eligible');
  const [supplier, setSupplier] = useState('FCI Central Depot');
  const [notes, setNotes] = useState('Standard harvest consignment');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!batchId.trim()) {
      setError('Batch ID is required.');
      return;
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      setError('Quantity must be a positive whole number of bags.');
      return;
    }

    const result = addBatch({
      id: batchId.trim(),
      commodity,
      arrivalDate,
      totalQuantity: quantity,
      qualityStatus: status,
      supplier,
      notes
    });

    if (!result.success) {
      setError(result.error || 'Failed to add batch.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-[#E3E8F0] w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E8F0] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E6F0FE] text-[#1D6FE8] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#0F172A]">Add New Commodity Batch</h3>
              <p className="text-[12px] text-[#64748B]">Register inward grain shipment into the godown registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#475569] block mb-1">
                Batch ID *
              </label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                placeholder="e.g. B008"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
                required
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-[#475569] block mb-1">
                Commodity *
              </label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value as CommodityType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
              >
                <option value="Wheat">Wheat</option>
                <option value="Rice">Rice</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#475569] block mb-1">
                Arrival Date (DD-MM-YYYY) *
              </label>
              <input
                type="text"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
                required
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-[#475569] block mb-1">
                Total Quantity (Bags) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#475569] block mb-1">
                Initial Quality Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QualityStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
              >
                <option value="Eligible">Eligible (Ready for Allocation)</option>
                <option value="Hold">Hold (Quality Inspection Required)</option>
              </select>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-[#475569] block mb-1">
                Supplier / Pool Agency
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Punjab Agro Depot"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
              />
            </div>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-[#475569] block mb-1">
              Inspection / Inward Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Moisture level, packaging condition..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] resize-none focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E3E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#1D6FE8] hover:bg-[#1858BA] text-white text-xs font-bold transition-all shadow-xs"
            >
              Add Batch to Registry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

