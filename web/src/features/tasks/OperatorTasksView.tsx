import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Building2, 
  CheckSquare, 
  Eye, 
  ArrowRight,
  AlertCircle,
  Play,
  FileCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WarehouseTask } from '../../data/types';

export const OperatorTasksView: React.FC = () => {
  const { currentUser } = useStore();
  const [tab, setTab] = useState<'ALL' | 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState<WarehouseTask | null>(null);

  const initialTasks: WarehouseTask[] = [
    {
      id: 'TSK-2025-001',
      taskNo: 'TSK-2025-001',
      title: 'Aerate & Re-assay Held Rice Consignment',
      description: 'Batch B004 was quarantined on quality hold due to 14.8% moisture. Verify 48h mechanical aeration in Bay B and conduct moisture meter assay.',
      taskType: 'QUALITY_INSPECTION',
      taskTypeTitle: 'Quality Inspection & Re-assay',
      batchId: 'B004',
      commodity: 'Rice',
      warehouseId: 'GDN-NGP-01',
      warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      assignedToId: 'u-admin-ngp',
      assignedToName: 'Ramesh Patil',
      assignedToRole: 'WAREHOUSE_ADMIN',
      assignedById: 'u-manager-01',
      assignedByName: 'Aayush Tripathi',
      assignedAt: '2025-10-23 09:00',
      priority: 'HIGH',
      dueAt: '2025-10-24 16:00',
      isOverdue: false,
      status: 'IN_PROGRESS',
      checklist: [
        { id: 'c1', label: 'Verify mechanical aeration run duration >= 48 hours', required: true, type: 'boolean', value: true },
        { id: 'c2', label: 'Moisture % Meter Measurement (Must be <= 14.0%)', required: true, type: 'number', unit: '%', value: 13.8 }
      ],
      timeline: []
    },
    {
      id: 'TSK-2025-002',
      taskNo: 'TSK-2025-002',
      title: 'Pre-Dispatch Physical Bag Count Verification',
      description: 'Audit physical stack counts and bag seals for Batch B006 prior to outward lifting for Fair Price Shop FPS-104.',
      taskType: 'DISPATCH_PREPARATION',
      taskTypeTitle: 'Dispatch Preparation & Bag Count',
      batchId: 'B006',
      commodity: 'Wheat',
      warehouseId: 'GDN-NGP-01',
      warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      assignedToId: 'u-admin-ngp',
      assignedToName: 'Ramesh Patil',
      assignedToRole: 'WAREHOUSE_ADMIN',
      assignedById: 'u-manager-01',
      assignedByName: 'Aayush Tripathi',
      assignedAt: '2025-10-23 14:00',
      priority: 'NORMAL',
      dueAt: '2025-10-24 17:30',
      isOverdue: false,
      status: 'ACCEPTED',
      checklist: [],
      timeline: []
    }
  ];

  const [tasks, setTasks] = useState<WarehouseTask[]>(initialTasks);

  const now = new Date();
  const counts = {
    ALL: tasks.length,
    NEW: tasks.filter(t => t.status === 'ASSIGNED').length,
    ACCEPTED: tasks.filter(t => t.status === 'ACCEPTED').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    REVIEW: tasks.filter(t => t.status === 'SUBMITTED_FOR_REVIEW').length,
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
    OVERDUE: tasks.filter(t => t.isOverdue || (new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')).length
  };

  const filteredTasks = tasks.filter(t => {
    if (tab === 'NEW' && t.status !== 'ASSIGNED') return false;
    if (tab === 'ACCEPTED' && t.status !== 'ACCEPTED') return false;
    if (tab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
    if (tab === 'REVIEW' && t.status !== 'SUBMITTED_FOR_REVIEW') return false;
    if (tab === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (tab === 'OVERDUE' && !(t.isOverdue || (new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'))) return false;

    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (search) {
      const match = 
        t.taskNo.toLowerCase().includes(search.toLowerCase()) ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.batchId.toLowerCase().includes(search.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const handleAccept = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'ACCEPTED' as const } : t));
  };

  const handleStart = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'IN_PROGRESS' as const } : t));
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Godown Operations</span>
            <span className="text-slate-300">/</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200">
              Operator Execution Scope
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">My Tasks &amp; Assaying Duties</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assigned warehouse duties, quality sampling parameters, and verification checklists for your depot.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs pb-1">
        {(['ALL', 'NEW', 'ACCEPTED', 'IN_PROGRESS', 'REVIEW', 'OVERDUE', 'COMPLETED'] as const).map(tKey => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`px-3.5 py-2 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              tab === tKey ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tKey === 'ALL' ? 'All Tasks' : tKey.replace('_', ' ')}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab === tKey ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {counts[tKey]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
            <div className={`px-4 py-2 text-[10px] font-bold flex items-center justify-between border-b ${
              t.priority === 'URGENT' ? 'bg-rose-50 text-rose-800 border-rose-200' :
              t.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-[#0B4DA8] border-blue-100'
            }`}>
              <span className="font-mono">{t.taskNo}</span>
              <span className="uppercase">{t.priority}</span>
            </div>

            <div className="p-4 space-y-3 flex-1">
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{t.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold">{t.commodity}</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-[#0B4DA8] font-bold text-xs">Batch {t.batchId}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Due Date:</span>
                <span className="font-semibold text-slate-800">{t.dueAt.replace('T', ' ')}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{t.status.replace(/_/g, ' ')}</span>

              <div>
                {t.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleAccept(t.id)}
                    className="px-3.5 py-1.5 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Accept Task
                  </button>
                )}
                {t.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleStart(t.id)}
                    className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Start Task
                  </button>
                )}
                {t.status === 'IN_PROGRESS' && (
                  <span className="px-3 py-1 rounded-xl bg-blue-100 text-blue-900 font-bold text-xs">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperatorTasksView;
