import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertOctagon, UserCheck, RefreshCw, KeyRound } from 'lucide-react';

export default function HoldReleaseScreen({ apiBase, onActionComplete }) {
  const [holds, setHolds] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal / Form state for Release Request
  const [activeHoldId, setActiveHoldId] = useState(null);
  const [releaseReason, setReleaseReason] = useState('Laboratory re-testing certified moisture < 12% and zero pest presence.');
  const [requesterId, setRequesterId] = useState('');
  const [approverId, setApproverId] = useState('');

  const fetchHolds = async () => {
    setLoading(true);
    try {
      const [hRes, uRes] = await Promise.all([
        fetch(`${apiBase}/holds`),
        fetch(`${apiBase}/users`)
      ]);
      const hData = await hRes.json();
      const uData = await uRes.json();
      setHolds(hData);
      setUsers(uData);

      const qo = uData.find(u => u.role === 'QUALITY_OFFICER');
      const appr = uData.find(u => u.role === 'APPROVER');
      if (qo) setRequesterId(qo.id);
      if (appr) setApproverId(appr.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolds();
  }, []);

  const handleRequestRelease = async (holdId, batchId) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${apiBase}/batches/${batchId}/release-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hold_id: holdId,
          release_reason: releaseReason,
          requested_by: requesterId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to request release");

      setSuccessMsg("Release request submitted. Now awaiting authorized supervisor approval.");
      setActiveHoldId(null);
      fetchHolds();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleApproveRelease = async (holdId, batchId, simulatedApproverId) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${apiBase}/batches/${batchId}/release-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hold_id: holdId,
          approved_by: simulatedApproverId || approverId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Approval rejected");

      setSuccessMsg("Batch successfully released and restored to AVAILABLE status!");
      fetchHolds();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Quality Quarantine & Maker-Checker Release Queue
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enforces strict two-man rule: Release Requester ≠ Release Approver (Checked at DB schema level).
          </p>
        </div>
        <button
          onClick={fetchHolds}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Authorization / Rule Violation</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Workflow Update</p>
            <p className="mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Holds Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">
            Quarantine Records ({holds.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Quantity Quarantined</th>
                <th className="py-3 px-4">Quarantine Reason</th>
                <th className="py-3 px-4">Placed By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Maker-Checker Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {holds.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No active or historical quarantine holds found.
                  </td>
                </tr>
              ) : (
                holds.map((h) => {
                  const isActive = h.hold_status === 'ACTIVE';
                  const isPending = h.hold_status === 'RELEASE_PENDING';
                  const isReleased = h.hold_status === 'RELEASED';

                  return (
                    <tr key={h.hold_id} className={`hover:bg-slate-50 ${isActive ? 'bg-red-50/20' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {h.batch_no}
                      </td>
                      <td className="py-3 px-4">{h.commodity_name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {h.current_qty_kg?.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-600">
                        {h.hold_reason}
                        {h.release_reason && (
                          <div className="mt-1 text-[11px] text-blue-700 bg-blue-50 p-1.5 rounded">
                            <strong>Release Note:</strong> {h.release_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div>{h.placed_by_user}</div>
                        <div className="text-[10px]">{new Date(h.placed_at).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          isActive ? 'bg-red-100 text-red-800 border border-red-200' :
                          isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {h.hold_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-y-1">
                        {isActive && (
                          <button
                            onClick={() => setActiveHoldId(h.hold_id)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition"
                          >
                            Request Release
                          </button>
                        )}

                        {isPending && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => handleApproveRelease(h.hold_id, h.batch_id, approverId)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition"
                            >
                              Approve Release (Authorized)
                            </button>
                            <button
                              onClick={() => handleApproveRelease(h.hold_id, h.batch_id, requesterId)}
                              title="Tests DB constraint: attempts self-approval by the requester"
                              className="text-[10px] text-red-600 hover:underline"
                            >
                              [Test Maker-Checker Self-Approval]
                            </button>
                          </div>
                        )}

                        {isReleased && (
                          <span className="text-slate-400 text-[11px]">
                            Released by {h.release_approved_by}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Request Modal */}
      {activeHoldId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Request Quality Quarantine Release
            </h3>
            <p className="text-xs text-slate-500">
              Submit formal inspection clearance. An independent approver must confirm before stock can be unblocked.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Release Justification & Test Certification
              </label>
              <textarea
                rows="3"
                value={releaseReason}
                onChange={e => setReleaseReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requesting Inspector (Maker)
              </label>
              <select
                value={requesterId}
                onChange={e => setRequesterId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveHoldId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetHold = holds.find(h => h.hold_id === activeHoldId);
                  if (targetHold) handleRequestRelease(targetHold.hold_id, targetHold.batch_id);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow"
              >
                Submit Release Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
