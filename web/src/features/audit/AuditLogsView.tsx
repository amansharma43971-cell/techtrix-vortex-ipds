import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  UserCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UnauthorizedView } from '../auth/UnauthorizedView';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, hasPermission } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // RBAC Permission Check
  if (!hasPermission('VIEW_AUDIT_LOGS')) {
    return (
      <UnauthorizedView 
        requiredPermission="VIEW_AUDIT_LOGS" 
        resourceName="Depot Immutable Audit Trail & System Logs" 
      />
    );
  }

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

    return matchesSearch && matchesAction && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Action', 'Actor Name', 'Actor Role', 'Warehouse', 'Target Ref', 'Details', 'Reason', 'Timestamp', 'Status'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.action,
      l.actorName,
      l.actorRole,
      l.warehouseName,
      l.targetRef,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      l.timestamp,
      l.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BhandarSetu_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 uppercase">
              Immutable System Audit Log
            </span>
            <span className="text-xs text-slate-500 font-medium">Compliance &amp; Vigilance</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Activity Trail &amp; Regulatory Audit Records
          </h2>
          <p className="text-xs text-slate-500">
            Append-only tamper-evident event log recording user authentications, inward registrations, quality assays, FIFO deviations, and dispatch gate movements.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Trail (CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor, batch, dispatch ID, or details..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN_EVENT">Login / Authentication</option>
              <option value="INWARD_REGISTERED">Inward Registered</option>
              <option value="QUALITY_DECISION">Quality Assay Decision</option>
              <option value="FIFO_ALLOCATION">FIFO Allocation</option>
              <option value="DISPATCH_PREPARED">Dispatch Prepared</option>
              <option value="HOLD_OVERRIDE">On-Hold Override</option>
              <option value="USER_ROLE_CHANGED">User Role Changed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="DENIED">Denied</option>
              <option value="FLAGGED">Flagged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">Log ID / Timestamp</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Actor Identity</th>
                <th className="p-3.5">Reference Target</th>
                <th className="p-3.5">Audit Event Details</th>
                <th className="p-3.5">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-mono">
                    <strong className="block text-slate-900">{log.id}</strong>
                    <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-slate-100 text-slate-800 border border-slate-200 inline-block">
                      {log.action}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <strong className="block text-slate-900">{log.actorName}</strong>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {log.actorRole} · {log.warehouseName.split(' ')[0]}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono font-bold text-[#0B4DA8]">
                    {log.targetRef}
                  </td>

                  <td className="p-3.5 max-w-md">
                    <p className="text-slate-800 leading-snug">{log.details}</p>
                    {log.reason && (
                      <span className="text-[11px] text-amber-800 italic block mt-0.5">
                        Justification: "{log.reason}"
                      </span>
                    )}
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {log.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      <span>{log.status}</span>
                    </span>
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

export default AuditLogsView;

