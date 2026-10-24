import React from 'react';
import { Layers } from 'lucide-react';

interface BatchChipProps {
  batchNo: string;
  onClick?: () => void;
  className?: string;
}

export const BatchChip: React.FC<BatchChipProps> = ({ batchNo, onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 transition cursor-pointer shadow-sm ${className}`}
      title={`Batch Number: ${batchNo}`}
    >
      <Layers className="w-3 h-3 text-slate-400" />
      <span>{batchNo}</span>
    </button>
  );
};

