import React from 'react';

interface AgeBadgeProps {
  ageDays: number;
  className?: string;
}

export const AgeBadge: React.FC<AgeBadgeProps> = ({ ageDays, className = '' }) => {
  let colorStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  let bucketLabel = '0-30d';

  if (ageDays > 90) {
    colorStyle = 'bg-orange-950/60 text-orange-400 border-orange-800/80 font-bold';
    bucketLabel = '90+ Days (Priority)';
  } else if (ageDays > 60) {
    colorStyle = 'bg-amber-950/60 text-amber-400 border-amber-800/80 font-semibold';
    bucketLabel = '61-90 Days';
  } else if (ageDays > 30) {
    colorStyle = 'bg-blue-950/60 text-blue-300 border-blue-800/60';
    bucketLabel = '31-60 Days';
  } else {
    colorStyle = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60';
    bucketLabel = 'Fresh Stock (≤30d)';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${colorStyle} ${className}`}>
      <span>{ageDays}d old</span>
      <span className="opacity-70 text-[9px]">({bucketLabel})</span>
    </span>
  );
};

