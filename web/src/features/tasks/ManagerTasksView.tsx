import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  CheckSquare, 
  Eye, 
  X, 
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  FlaskConical
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WarehouseTask, TaskType, TaskPriority, TaskStatus } from '../../data/types';
import { UnauthorizedView } from '../auth/UnauthorizedView';

export const ManagerTasksView: React.FC = () => {
  const { 
    currentUser, 
    selectedWarehouseScope,
    batches,
    users
  } = useStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState<WarehouseTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<WarehouseTask | null>(null);

  // Manager-Only Access Guard
  if (!currentUser || currentUser.role !== 'MANAGER') {
    return <UnauthorizedView requiredPermission="MANAGE_TASKS" moduleName="Task & Quality Follow-up Console" />;
  }

  // Initial demo tasks if store doesn't have them
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
      assignedById: currentUser.id,
      assignedByName: currentUser.fullName,
      assignedAt: '2025-10-23 09:00',
      priority: 'HIGH',
      dueAt: '2025-10-24 16:00',
      isOverdue: false,
      status: 'IN_PROGRESS',
      checklist: [
        { id: 'c1', label: 'Verify mechanical aeration run duration >= 48 hours', required: true, type: 'boolean', value: true },
        { id: 'c2', label: 'Moisture % Meter Measurement (Must be <= 14.0%)', required: true, type: 'number', unit: '%', value: 13.8 },
        { id: 'c3', label: 'Check for moisture condensation inside inner liner', required: true, type: 'boolean', value: false },
        { id: 'c4', label: 'Absence of damp or moldy smell', required: true, type: 'boolean', value: true }
      ],
      timeline: [
        { id: 'tm-1', status: 'ASSIGNED', timestamp: '2025-10-23 09:00', actorId: currentUser.id, actorName: currentUser.fullName, actorRole: 'MANAGER', comment: 'Task assigned following laboratory hold notice.' },
        { id: 'tm-2', status: 'ACCEPTED', timestamp: '2025-10-23 09:30', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Accepted task. Scheduled aeration fans check.' },
        { id: 'tm-3', status: 'IN_PROGRESS', timestamp: '2025-10-24 08:15', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Began sampling top, middle and bottom bags across 120 bags stack.' }
      ]
    },
    {
      id: 'TSK-2025-002',
      taskNo: 'TSK-2025-002',
      title: 'Pre-Dispatch Physical Bag Count Verification',
      description: 'Audit physical stack counts and bag seals for Batch B006 prior to outward lifting for Fair Price Shop FPS-104 (Sadar Bazar).',
      taskType: 'DISPATCH_PREPARATION',
      taskTypeTitle: 'Dispatch Preparation & Bag Count',
      batchId: 'B006',
      commodity: 'Wheat',
      warehouseId: 'GDN-NGP-01',
      warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      assignedToId: 'u-admin-ngp',
      assignedToName: 'Ramesh Patil',
      assignedToRole: 'WAREHOUSE_ADMIN',
      assignedById: currentUser.id,
      assignedByName: currentUser.fullName,
      assignedAt: '2025-10-23 14:00',
      priority: 'NORMAL',
      dueAt: '2025-10-24 17:30',
      isOverdue: false,
      status: 'ACCEPTED',
      checklist: [
        { id: 'c1', label: 'Physical bag count matches allocated 50 bags exactly', required: true, type: 'boolean' },
        { id: 'c2', label: 'No burst or torn jute bags detected in pick face', required: true, type: 'boolean' }
      ],
      timeline: [
        { id: 'tm-4', status: 'ASSIGNED', timestamp: '2025-10-23 14:00', actorId: currentUser.id, actorName: currentUser.fullName, actorRole: 'MANAGER', comment: 'Order D0059 allocated. Verify stock staging.' },
        { id: 'tm-5', status: 'ACCEPTED', timestamp: '2025-10-23 15:10', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Order staging accepted for afternoon loading bay.' }
      ]
    },
    {
      id: 'TSK-2025-003',
      taskNo: 'TSK-2025-003',
      title: 'Post-Fumigation Quarantine Clearance Assaying',
      description: 'Quarantined Batch B007 completed aluminium phosphide fumigation. Sample 10% bags to confirm 0 live weevils.',
      taskType: 'RECHECK',
      taskTypeTitle: 'Post-Treatment Quality Recheck',
      batchId: 'B007',
      commodity: 'Wheat',
      warehouseId: 'GDN-NGP-01',
      warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      assignedToId: 'u-admin-ngp',
      assignedToName: 'Ramesh Patil',
      assignedToRole: 'WAREHOUSE_ADMIN',
      assignedById: currentUser.id,
      assignedByName: currentUser.fullName,
      assignedAt: '2025-10-22 10:00',
      priority: 'URGENT',
      dueAt: '2025-10-23 12:00',
      isOverdue: true,
      status: 'ASSIGNED',
      checklist: [
        { id: 'c1', label: 'Gas degasification certificate verified', required: true, type: 'boolean' },
        { id: 'c2', label: 'Live Weevil Count per 1000g sample (Must be 0)', required: true, type: 'number', unit: 'insects' }
      ],
      timeline: [
        { id: 'tm-6', status: 'ASSIGNED', timestamp: '2025-10-22 10:00', actorId: currentUser.id, actorName: currentUser.fullName, actorRole: 'MANAGER', comment: 'Urgent quarantine recheck assigned.' }
      ]
    },
    {
      id: 'TSK-2025-004',
      taskNo: 'TSK-2025-004',
      title: 'Intake Consignment Bin Stacking & Quality Sampling',
      description: 'Consignment B008 (200 Bags Wheat) received at Gate 1. Stack in bulk bay and perform laboratory sampling.',
      taskType: 'STOCK_VERIFICATION',
      taskTypeTitle: 'Stock Verification & Intake Sampling',
      batchId: 'B008',
      commodity: 'Wheat',
      warehouseId: 'GDN-NGP-01',
      warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
      assignedToId: 'u-admin-ngp',
      assignedToName: 'Ramesh Patil',
      assignedToRole: 'WAREHOUSE_ADMIN',
      assignedById: currentUser.id,
      assignedByName: currentUser.fullName,
      assignedAt: '2025-10-24 07:00',
      priority: 'HIGH',
      dueAt: '2025-10-24 14:00',
      isOverdue: false,
      status: 'SUBMITTED_FOR_REVIEW',
      checklist: [
        { id: 'c1', label: 'Stack stability & dunnage placement verified', required: true, type: 'boolean', value: true },
        { id: 'c2', label: 'Moisture % Meter Reading (Tolerance <= 12.0%)', required: true, type: 'number', unit: '%', value: 11.0 }
      ],
      submission: {
        submittedAt: '2025-10-24 10:15',
        submittedBy: 'Ramesh Patil',
        measurements: { moisturePct: 11.0, foreignMatterPct: 0.40, weevilCount: 0, damagedBagsCount: 0 },
        remarks: 'Sound quality fresh harvest intake. Moisture 11.0% well below 12.0% ceiling.'
      },
      timeline: [
        { id: 'tm-7', status: 'ASSIGNED', timestamp: '2025-10-24 07:00', actorId: currentUser.id, actorName: currentUser.fullName, actorRole: 'MANAGER', comment: 'Assigned upon Gate 1 arrival.' },
        { id: 'tm-8', status: 'SUBMITTED_FOR_REVIEW', timestamp: '2025-10-24 10:15', actorId: 'u-admin-ngp', actorName: 'Ramesh Patil', actorRole: 'WAREHOUSE_ADMIN', comment: 'Submitted for laboratory review.' }
      ]
    }
  ];

  const [tasks, setTasks] = useState<WarehouseTask[]>(initialTasks);

  const now = new Date();
  const kpis = {
    pending: tasks.filter(t => t.status === 'ASSIGNED' || t.status === 'ACCEPTED').length,
    overdue: tasks.filter(t => t.isOverdue || (new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')).length,
    qualityDue: tasks.filter(t => (t.taskType === 'QUALITY_INSPECTION' || t.taskType === 'RECHECK') && t.status !== 'COMPLETED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'SUBMITTED_FOR_REVIEW').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length
  };

  const filteredTasks = tasks.filter(t => {
    if (selectedWarehouseScope !== 'ALL' && t.warehouseId !== selectedWarehouseScope) return false;
    if (typeFilter !== 'ALL' && t.taskType !== typeFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OVERDUE') {
        const isOver = t.isOverdue || (new Date(t.dueAt) < now && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
        if (!isOver) return false;
      } else if (t.status !== statusFilter) {
        return false;
      }
    }
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (search) {
      const match = 
        t.taskNo.toLowerCase().includes(search.toLowerCase()) ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.batchId.toLowerCase().includes(search.toLowerCase()) ||
        t.assignedToName.toLowerCase().includes(search.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto pb-12 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations</span>
            <span className="text-slate-300">/</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B4DA8] border border-blue-200">
              Supervisor Task Control
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">Task &amp; Quality Follow-up</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervise operational task assignments, monitor overdue SLAs, and review laboratory quality follow-ups across depots.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-[#0B4DA8] hover:bg-[#0A2F6B] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Pending Tasks</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis.pending}</span>
            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Awaiting Action</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Overdue Tasks</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{kpis.overdue}</span>
            <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">SLA Breached</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Quality Due</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis.qualityDue}</span>
            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">Assaying Recheck</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">In Progress</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{kpis.inProgress}</span>
            <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">Active Ops</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Completed</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{kpis.completed}</span>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Closed Tasks</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task, batch ID, title, or operator..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
          >
            <option value="ALL">All Task Types</option>
            <option value="QUALITY_INSPECTION">Quality Inspection</option>
            <option value="RECHECK">Recheck &amp; Re-assay</option>
            <option value="STOCK_VERIFICATION">Stock Verification</option>
            <option value="DISPATCH_PREPARATION">Dispatch Prep</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SUBMITTED_FOR_REVIEW">Awaiting Review</option>
            <option value="OVERDUE">Overdue SLAs</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Task Ref &amp; Priority</th>
                <th className="py-3 px-4">Task Title &amp; Type</th>
                <th className="py-3 px-4">Target Batch</th>
                <th className="py-3 px-4">Assigned Operator</th>
                <th className="py-3 px-4">Due SLA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium">
                    <span className="font-mono font-bold text-slate-900 block">{t.taskNo}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                      t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block truncate max-w-[220px]">{t.title}</span>
                    <span className="text-[11px] text-slate-500">{t.taskTypeTitle || t.taskType}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0B4DA8] font-bold text-xs">
                      {t.batchId} · {t.commodity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 block">{t.assignedToName}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px] block">{t.warehouseName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-medium">
                    {t.dueAt.replace('T', ' ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'SUBMITTED_FOR_REVIEW' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {t.status === 'SUBMITTED_FOR_REVIEW' && (
                        <button
                          onClick={() => setShowReviewModal(t)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Review &amp; Approve
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTask(t)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
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

export default ManagerTasksView;
