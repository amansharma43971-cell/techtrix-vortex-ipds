import React from 'react';
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const ToastNotification: React.FC = () => {
  const { activeToast, setToast, undoDispatch } = useStore();

  if (!activeToast) return null;

  const handleUndo = () => {
    if (activeToast.undoDispatchId) {
      undoDispatch(activeToast.undoDispatchId);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-[#0F172A] text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 max-w-md">
        {activeToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        {activeToast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
        {activeToast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}

        <div className="flex-1 text-xs">
          <p className="font-medium text-slate-100">{activeToast.message}</p>
        </div>

        {activeToast.undoDispatchId && (
          <button
            onClick={handleUndo}
            className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
        )}

        <button
          onClick={() => setToast(null)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

