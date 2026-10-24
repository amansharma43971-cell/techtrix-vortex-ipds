import React, { useState } from 'react';
import { 
  ClipboardCheck, Clock, CheckCircle, XCircle, AlertTriangle, 
  UserCheck, Shield, ChevronRight, X, AlertOctagon, User
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from '../i18n/translations';
import { MOCK_APPROVALS, ApprovalRequest } from '../mocks/mockData';
import { formatDate } from '../lib/formatters';

export const ApprovalsView: React.FC = () => {
  const { activeRole, approvals, updateApprovalStatus } = useUIStore();
  const { t } = useTranslation();

  // Selected for review modal
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isDelegationActive, setIsDelegationActive] = useState(false);

  // Maker-checker policy check
  // Suppose current user ID is "u1". If request.requested_by_id === "u1", cannot approve!
  const currentUserId = activeRole === 'STORE_EMPLOYEE' ? 'u1' : 'u2';

  const handleApprove = (req: ApprovalRequest) => {
    if (req.requested_by_id === currentUserId && !isDelegationActive) {
      alert("Maker-Checker Violation (SQLSTATE BS004): You created this request and cannot approve it yourself.");
      return;
    }
    updateApprovalStatus(req.id, 'APPROVED');
    setSelectedRequest(null);
  };

  const handleReject = (req: ApprovalRequest) => {
    updateApprovalStatus(req.id, 'REJECTED');
    setSelectedRequest(null);
  };

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const pastApprovals = approvals.filter(a => a.status !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t('nav.approvals')} & Dual-Sign Guard
            </h1>
            <p className="text-xs text-muted-foreground">
              Maker-Checker Dual Authorization Queue for FIFO Exceptions, Hold Releases & Loss Escalations
            </p>
          </div>
        </div>

        {/* Delegation Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDelegationActive(!isDelegationActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDelegationActive 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {isDelegationActive ? 'Delegation Mode (Active: Area Manager)' : 'Enable Delegation Mode'}
          </button>
        </div>
      </div>

      {/* Maker-Checker Rule Callout */}
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserCheck className="w-4 h-4 text-brand" />
          <span>
            <strong>Enforced Constraint:</strong> The creator (Maker) of an exception is strictly barred from approving it (Checker). Current active actor: <strong className="text-foreground">{activeRole}</strong>
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold text-brand">
          {pendingApprovals.length} Pending Actions
        </span>
      </div>

      {/* Unified Queue */}
      <div className="space-y-4">
        {pendingApprovals.map(req => {
          const isOwnRequest = req.requested_by_id === currentUserId && !isDelegationActive;

          return (
            <div 
              key={req.id}
              className="p-5 rounded-xl bg-surface border border-border hover:border-brand/40 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    req.request_type === 'FIFO_EXCEPTION' 
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : req.request_type === 'HOLD_RELEASE'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>
                    {req.request_type}
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {req.reference_no}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> SLA: 2h remaining
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground">
                  {req.title}
                </h3>

                <p className="text-xs text-muted-foreground">
                  {req.details}
                </p>

                {req.skipped_batch && (
                  <div className="text-[11px] font-mono text-muted-foreground pt-1 flex items-center gap-2">
                    <span>Skipping: <strong className="text-red-500">{req.skipped_batch}</strong></span>
                    <span>→</span>
                    <span>Selecting: <strong className="text-emerald-500">{req.chosen_batch}</strong></span>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground pt-0.5 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Requested by: <span className="font-semibold text-foreground">{req.requested_by_name}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {isOwnRequest ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                    <AlertOctagon className="w-4 h-4" />
                    Maker-Checker Locked (Self)
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleReject(req)}
                      className="px-3.5 py-2 rounded-lg border border-red-500/30 text-red-600 text-xs font-semibold hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Dual-Sign & Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {pendingApprovals.length === 0 && (
          <div className="p-8 rounded-xl bg-surface border border-dashed border-border text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Inbox Zero: No Pending Approvals</h3>
            <p className="text-xs text-muted-foreground">All operational requests have been verified and settled.</p>
          </div>
        )}
      </div>

      {/* Historical Approvals */}
      {pastApprovals.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Settled History (Audited)
          </span>
          <div className="rounded-xl bg-surface border border-border divide-y divide-border/60">
            {pastApprovals.map(req => (
              <div key={req.id} className="p-3.5 text-xs flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-foreground mr-2">{req.reference_no}</span>
                  <span className="text-muted-foreground">{req.title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

