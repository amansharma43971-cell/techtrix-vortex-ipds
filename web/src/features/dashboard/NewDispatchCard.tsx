import React, { useState } from 'react';
import { Truck, Send, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CommodityType } from '../../data/types';
import { FPS_DESTINATIONS } from '../../data/seedData';

export const NewDispatchCard: React.FC = () => {
  const {
    dispatchFormCommodity,
    dispatchFormQuantity,
    dispatchFormDestination,
    dispatchFormRemarks,
    setDispatchFormField,
    createDispatch
  } = useStore();

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (dispatchFormQuantity <= 0 || !Number.isInteger(dispatchFormQuantity)) {
      setFormError('Please enter a valid positive whole number of bags.');
      return;
    }

    const res = createDispatch(
      dispatchFormCommodity,
      dispatchFormQuantity,
      dispatchFormDestination,
      dispatchFormRemarks
    );

    if (!res.success) {
      setFormError(res.error || 'Failed to create dispatch.');
      return;
    }

    // Reset remarks and default quantity
    setDispatchFormField('remarks', '');
  };

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EBF3FE] text-[#1D6FE8] flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <h3 className="text-[16px] font-bold text-[#0F172A]">New Dispatch</h3>
        </div>
        <p className="text-[12px] text-[#64748B] mt-1">
          Create a new dispatch order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Commodity Field */}
        <div>
          <label className="text-[13px] font-semibold text-[#475569] block mb-1">
            Commodity *
          </label>
          <select
            value={dispatchFormCommodity}
            onChange={(e) => setDispatchFormField('commodity', e.target.value as CommodityType)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
          >
            <option value="Wheat">Wheat</option>
            <option value="Rice">Rice</option>
          </select>
        </div>

        {/* Required Quantity Field */}
        <div>
          <label className="text-[13px] font-semibold text-[#475569] block mb-1">
            Required Quantity (Bags) *
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="10"
              value={dispatchFormQuantity || ''}
              onChange={(e) => setDispatchFormField('quantity', Number(e.target.value))}
              placeholder="e.g. 120"
              className="w-full px-3 py-2 pr-14 text-xs font-mono font-bold rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
              required
            />
            <span className="absolute right-3 top-2 text-xs font-semibold text-slate-500 pointer-events-none">
              Bags
            </span>
          </div>
        </div>

        {/* Destination Field */}
        <div>
          <label className="text-[13px] font-semibold text-[#475569] block mb-1">
            Destination *
          </label>
          <select
            value={dispatchFormDestination}
            onChange={(e) => setDispatchFormField('destination', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
          >
            {FPS_DESTINATIONS.map((dest) => (
              <option key={dest} value={dest}>
                {dest}
              </option>
            ))}
          </select>
        </div>

        {/* Remarks Field (Optional) */}
        <div>
          <label className="text-[13px] font-semibold text-[#475569] block mb-1">
            Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={dispatchFormRemarks}
            onChange={(e) => setDispatchFormField('remarks', e.target.value)}
            placeholder="e.g. Allocation for NFSA beneficiaries, Vehicle MH-31-AP-4921"
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] resize-none focus:outline-none focus:ring-2 focus:ring-[#1D6FE8]"
          />
        </div>

        {/* Full-width Blue Create Dispatch Button */}
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-[#1D6FE8] hover:bg-[#1858BA] text-white text-[14px] font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <Send className="w-4 h-4" />
          Create Dispatch
        </button>
      </form>
    </div>
  );
};

