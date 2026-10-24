import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface UnauthorizedViewProps {
  requiredPermission?: string;
  resourceName?: string;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  requiredPermission = 'MANAGE_USERS / VIEW_SYSTEM_DATA',
  resourceName = 'System Administration & Global Reports'
}) => {
  const navigate = useNavigate();
  const { currentUser } = useStore();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            HTTP 403 Forbidden · Access Denied
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-3">
            Insufficient Authorization Privileges
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Your current account role <strong>({currentUser?.roleTitle || 'Operator'})</strong> does not hold clearance to access <strong>{resourceName}</strong>.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Logged-in User:</span>
            <span className="font-semibold text-slate-900">{currentUser?.fullName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Server Role:</span>
            <span className="font-bold text-[#0B4DA8]">{currentUser?.role || 'UNVERIFIED'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Required Permission:</span>
            <span className="font-mono text-rose-600 font-bold">{requiredPermission}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Depot Scope:</span>
            <span className="text-slate-700">{currentUser?.warehouseName || 'Unassigned'}</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-[#0B4DA8] hover:bg-[#1E63C4] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to My Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedView;

