import React, { useState } from 'react';
import { BellRing, ShieldAlert, AlertTriangle, Info, CheckCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const AlertsView: React.FC = () => {
  const { alerts, markAlertAsRead, markAllAlertsAsRead, setActiveRoute, setSelectedBatch, batches } = useStore();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredAlerts = alerts.filter(a => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !a.isRead;
    return a.type === filterType;
  });

  const handleAction = (alert: any) => {
    markAlertAsRead(alert.id);
    if (alert.batchId) {
      const b = batches.find(x => x.id === alert.batchId);
      if (b) setSelectedBatch(b);
    }
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto">
      {/* Header */}
      <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A]">Godown Alerts &amp; Notifications Center</h2>
            <p className="text-[13px] text-[#64748B]">Automated detection of aged stock, quality quarantine holds, and low-inventory warnings</p>
          </div>
        </div>

        <button
          onClick={markAllAlertsAsRead}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <CheckCheck className="w-4 h-4 text-slate-500" />
          Mark All As Read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'unread', label: 'Unread Only' },
          { id: 'red', label: 'Critical' },
          { id: 'amber', label: 'Warnings' },
          { id: 'blue', label: 'Info' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterType === tab.id
                ? 'bg-[#0B4DA8] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 rounded-xl bg-white border border-slate-200 text-center text-slate-400 text-xs">
            No alerts found for this filter.
          </div>
        ) : (
          filteredAlerts.map(alt => (
            <div
              key={alt.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                !alt.isRead ? 'bg-white border-[#CBD5E1] shadow-xs' : 'bg-slate-50/70 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  alt.type === 'red' ? 'bg-red-100 text-red-600' : alt.type === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {alt.type === 'red' ? <ShieldAlert className="w-5 h-5" /> : alt.type === 'amber' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{alt.title}</h4>
                    {!alt.isRead && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Triggered by automated inventory rules. Requires storekeeper review prior to next dispatch cycle.
                  </p>
                  <span className="text-[11px] text-slate-400 font-mono mt-2 block">{alt.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {alt.batchId && (
                  <button
                    onClick={() => handleAction(alt)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Batch {alt.batchId}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}

                {!alt.isRead && (
                  <button
                    onClick={() => markAlertAsRead(alt.id)}
                    className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

