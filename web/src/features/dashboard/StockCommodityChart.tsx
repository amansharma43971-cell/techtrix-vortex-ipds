import React from 'react';
import { useStore } from '../../store/useStore';

export const StockCommodityChart: React.FC = () => {
  const { batches } = useStore();

  // Compute live available stock by commodity
  const wheatStock = batches
    .filter((b) => b.commodity === 'Wheat' && b.qualityStatus === 'Eligible')
    .reduce((sum, b) => sum + b.availableQuantity, 0);

  const riceStock = batches
    .filter((b) => b.commodity === 'Rice' && b.qualityStatus === 'Eligible')
    .reduce((sum, b) => sum + b.availableQuantity, 0);

  // Maximum value for axis scaling (e.g. 700)
  const maxVal = Math.max(700, Math.ceil(Math.max(wheatStock, riceStock) / 100) * 100 + 100);
  const chartHeight = 160;

  const wheatHeight = (wheatStock / maxVal) * chartHeight;
  const riceHeight = (riceStock / maxVal) * chartHeight;

  return (
    <div className="p-5 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
      {/* Header & Legend */}
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#0F172A]">Stock by Commodity</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB93B]" />
            Wheat
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D6EF2]" />
            Rice
          </span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="pt-2">
        <div className="relative flex items-end justify-center gap-16 h-[190px] border-b border-[#E2E8F0] px-6">
          {/* Subtle Horizontal Gridlines */}
          <div className="absolute inset-x-0 top-0 border-b border-[#F1F5F9] text-[10px] text-slate-400">
            <span className="absolute -left-1 -top-2.5 font-mono">600</span>
          </div>
          <div className="absolute inset-x-0 top-[25%] border-b border-[#F1F5F9] text-[10px] text-slate-400">
            <span className="absolute -left-1 -top-2.5 font-mono">450</span>
          </div>
          <div className="absolute inset-x-0 top-[50%] border-b border-[#F1F5F9] text-[10px] text-slate-400">
            <span className="absolute -left-1 -top-2.5 font-mono">300</span>
          </div>
          <div className="absolute inset-x-0 top-[75%] border-b border-[#F1F5F9] text-[10px] text-slate-400">
            <span className="absolute -left-1 -top-2.5 font-mono">150</span>
          </div>

          {/* Wheat Bar */}
          <div className="flex flex-col items-center gap-2 z-10">
            {/* Value label above bar */}
            <span className="text-[14px] font-bold text-[#0F172A] font-mono tabular-nums leading-none">
              {wheatStock}
            </span>
            <div
              style={{ height: `${Math.max(12, wheatHeight)}px` }}
              className="w-14 bg-[#FFB93B] rounded-t-md hover:brightness-105 transition-all duration-300 shadow-xs"
              title={`Wheat Eligible Stock: ${wheatStock} Bags`}
            />
            <span className="text-xs font-semibold text-slate-600">Wheat</span>
          </div>

          {/* Rice Bar */}
          <div className="flex flex-col items-center gap-2 z-10">
            {/* Value label above bar */}
            <span className="text-[14px] font-bold text-[#0F172A] font-mono tabular-nums leading-none">
              {riceStock}
            </span>
            <div
              style={{ height: `${Math.max(12, riceHeight)}px` }}
              className="w-14 bg-[#2D6EF2] rounded-t-md hover:brightness-105 transition-all duration-300 shadow-xs"
              title={`Rice Eligible Stock: ${riceStock} Bags`}
            />
            <span className="text-xs font-semibold text-slate-600">Rice</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 font-mono">
          <span>Eligible Stock Quantity (Bags)</span>
          <span>Target Buffer: 400 Bags</span>
        </div>
      </div>
    </div>
  );
};

