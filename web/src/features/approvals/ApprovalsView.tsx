import React, { useState } from 'react';
import { UserCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ApprovalItem {
  id: string;
  type: 'FIFO_DEVIATION' | 'HOLD_RELEASE' | 'DISPATCH_CANCEL';
  refId: string;
  requestedBy: string;
  requestedRole: string;
  requestedAt: string;
  reason: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: 'APP-101',
    type: 'FIFO_DEVIATION',
    refId: 'FIFO-OVR-01',
    requestedBy: 'Aayush Tripathi',
    requestedRole: 'Godown Operator',
    requestedAt: '2025-10-23 10:15',
    reason: 'Temporary forklift stack blockage in Bay 2; need to pick B002 before B001',
    details: 'Skips older batch B001 (100 bags, arrived 01-01-2025)',
    status: 'PENDING'
  },
  {
    id: 'APP-102',
    type: 'HOLD_RELEASE',
    refId: 'B004',
    requestedBy: 'Dr. Anita Rao',
    requestedRole: 'Quality Inspector',
    requestedAt: '2025-10-22 16:40',
    reason: 'Aeration cycle completed; re-tested moisture reduced from 14.2% to 11.8%',
    details: 'Batch B004 (120 bags Rice) held since 05-02-2025 (>7 days threshold)',
    status: 'PENDING'
  }
];

export const ApprovalsView: React.FC = () => {
  const { user, setToast } = useStore();
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);

  const handleDecision = (id: string, decision: 'APPROVED' | 'REJECTED') => {
    // Check maker-checker rule
    const item = approvals.find(a => a.id === id);
    if (!item) return;

    if (item.requestedBy === user.name) {
      alert('Maker-Checker Constraint Violation: You cannot approve your own request.');
      return;
    }

    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: decision } : a));

    setToast({
      id: Date.now().toString(),
      message: `Request ${id} marked as ${decision} by ${user.name}.`,
      type: decision === 'APPROVED' ? 'success' : 'info'
    });
  };

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto">
      {/* Header */}
      <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A]">Users &amp; Officer Approvals Center</h2>
            <p className="text-[13px] text-[#64748B]">
              Maker-Checker governance for FIFO deviations, aged quarantine releases, and reversal audits
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          {pendingCount} Pending Decision
        </span>
      </div>

      {/* Maker Checker Policy Banner */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold">Government Dual-Authorization Policy Active:</span> Operates strictly under statutory iPDS maker-checker rule. The requesting operator cannot decide their own requisition.
        </div>
      </div>

      {/* Approvals Table */}
      <div className="p-6 rounded-xl bg-white border border-[#E3E8F0] shadow-xs space-y-4">
        <h3 className="text-[16px] font-bold text-[#0F172A]">Active Requisition Queue</h3>

        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3">Req ID</th>
                <th className="p-3">Requisition Type</th>
                <th className="p-3">Requested By</th>
                <th className="p-3">Justification &amp; Impact</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.map(app => (
                <tr key={app.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono font-bold text-slate-900">{app.id}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-800">
                      {app.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900 block">{app.requestedBy}</span>
                    <span className="text-[10px] text-slate-400">{app.requestedRole}</span>
                  </td>
                  <td className="p-3 max-w-sm">
                    <p className="font-medium text-slate-800">{app.reason}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{app.details}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{app.requestedAt}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      app.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {app.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDecision(app.id, 'APPROVED')}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(app.id, 'REJECTED')}
                          className="px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 font-semibold text-xs cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">Decided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

