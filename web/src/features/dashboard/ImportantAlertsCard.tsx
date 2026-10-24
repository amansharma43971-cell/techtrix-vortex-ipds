import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const ImportantAlertsCard: React.FC = () => {
  const { alerts, setActiveRoute, markAlertAsRead } = useStore();

  return (
    <div className="p-5 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
          <h3 className="text-[16px] font-bold text-[#0F172A]">Important Alerts</h3>
        </div>
        <button
          onClick={() => setActiveRoute('quality')}
          className="text-[13px] font-semibold text-[#1D6FE8] hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          View All →
        </button>
      </div>

      {/* Alert List */}
      <div className="divide-y divide-[#F1F5F9] text-xs">
        {alerts.slice(0, 4).map((alt) => (
          <div
            key={alt.id}
            onClick={() => markAlertAsRead(alt.id)}
            className="py-3 flex items-start gap-3 hover:bg-slate-50 rounded-lg px-1 transition-colors cursor-pointer"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                alt.type === 'amber'
                  ? 'bg-[#F59E0B]'
                  : alt.type === 'red'
                  ? 'bg-[#EF4444]'
                  : 'bg-[#3B82F6]'
              }`}
            />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#1E293B] leading-snug">
                {alt.title}
              </p>
              <span className="text-[11px] text-[#64748B] font-mono mt-1 block">
                {alt.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

