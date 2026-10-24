import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, XCircle, Clock, Archive, Star } from 'lucide-react';
import { QualityStatus } from '../../data/types';

interface StatusPillProps {
  status: QualityStatus | string;
  isNextToDispatch?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, isNextToDispatch, className = '' }) => {
  if (isNextToDispatch) {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D6F5E3] text-[#11803F] border border-[#A3E5BA] shadow-xs ${className}`}>
        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span>⭐ NEXT TO DISPATCH</span>
      </span>
    );
  }

  switch (status) {
    case 'Pending Allocation':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE] ${className}`}>
          <Clock className="w-3 h-3 text-[#3730A3]" />
          <span>Pending Allocation</span>
        </span>
      );

    case 'Eligible':
    case 'Approved':
    case 'AVAILABLE':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D6F5E3] text-[#11803F] border border-[#A3E5BA] ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-[#11803F]" />
          <span>{status === 'Approved' ? 'Approved' : 'Eligible'}</span>
        </span>
      );

    case 'Reinspection Required':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3E8FF] text-[#6B21A8] border border-[#D8B4FE] ${className}`}>
          <Clock className="w-3 h-3 text-[#6B21A8]" />
          <span>Reinspection Required</span>
        </span>
      );

    case 'Pending Inspection':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] ${className}`}>
          <Clock className="w-3 h-3 text-[#92400E]" />
          <span>Pending Inspection</span>
        </span>
      );

    case 'Hold':
    case 'QUALITY_HOLD':
    case 'NEAR_EXPIRY':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDE9B8] text-[#8A5A00] border border-[#F6DFA0] ${className}`}>
          <AlertTriangle className="w-3 h-3 text-[#8A5A00]" />
          <span>Hold</span>
        </span>
      );

    case 'Rejected':
    case 'QUARANTINED_RECALL':
    case 'EXPIRED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDDCDC] text-[#B42318] border border-[#F8B4B8] ${className}`}>
          <XCircle className="w-3 h-3 text-[#B42318]" />
          <span>Rejected</span>
        </span>
      );

    case 'Exhausted':
    case 'EXHAUSTED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECEEF2] text-[#64748B] border border-slate-300 ${className}`}>
          <Archive className="w-3 h-3 text-[#64748B]" />
          <span>Exhausted</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
};
