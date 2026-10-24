import React, { useState } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  Lock, 
  Mail, 
  User, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { RoleType, AuthUser } from '../../data/types';
import { UnauthorizedView } from '../auth/UnauthorizedView';

export const UserManagementView: React.FC = () => {
  const { 
    currentUser, 
    users, 
    updateUserRole, 
    toggleUserStatus, 
    addUser,
    hasPermission 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  // New user form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<RoleType>('WAREHOUSE_ADMIN');
  const [newWarehouseId, setNewWarehouseId] = useState<string>('GDN-NGP-01');

  // RBAC Permission Check
  if (!hasPermission('MANAGE_USERS')) {
    return (
      <UnauthorizedView 
        requiredPermission="MANAGE_USERS" 
        resourceName="User & Role Administration Center" 
      />
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsername || !newEmail) return;

    let roleTitle = 'Godown Operator / Warehouse Admin';
    let permissions = ['CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY'];
    if (newRole === 'MANAGER') {
      roleTitle = 'District Godown Manager / Supervisor';
      permissions = [
        'VIEW_SYSTEM_DATA', 'MANAGE_USERS', 'APPROVE_EXCEPTIONS', 'VIEW_ANALYTICS',
        'VIEW_AUDIT_LOGS', 'CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION',
        'PREPARE_DISPATCH', 'UPDATE_DELIVERY', 'APPROVE_QUALITY', 'OVERRIDE_HOLD_BATCH', 'CANCEL_DISPATCH'
      ];
    } else if (newRole === 'QUALITY_OFFICER') {
      roleTitle = 'Lead Laboratory Assayer & Quality Officer';
      permissions = ['VIEW_INVENTORY', 'APPROVE_QUALITY', 'APPROVE_EXCEPTIONS'];
    }

    const warehouseName = newWarehouseId === 'GDN-NGP-01'
      ? 'Central Food Godown, Nagpur (Surajpur Depot)'
      : (newWarehouseId === 'GDN-PUN-02' ? 'District Buffer Depot, Pune' : 'All Warehouses (National Central Depot)');

    addUser({
      fullName: newFullName,
      username: newUsername,
      email: newEmail,
      role: newRole,
      roleTitle,
      warehouseId: newRole === 'MANAGER' ? null : newWarehouseId,
      warehouseName: newRole === 'MANAGER' ? 'All Warehouses (National Central Depot)' : warehouseName,
      isActive: true,
      permissions: permissions as any
    });

    setIsAddModalOpen(false);
    setNewFullName('');
    setNewUsername('');
    setNewEmail('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUserRole(
      editingUser.id,
      editingUser.role,
      editingUser.role === 'MANAGER' ? null : editingUser.warehouseId
    );

    setEditingUser(null);
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-[#E3E8F0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 uppercase">
              Administrator Security Console
            </span>
            <span className="text-xs text-slate-500 font-medium">RBAC Governance</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            User Accounts &amp; Role-Based Access Control
          </h2>
          <p className="text-xs text-slate-500">
            Enforce separation of duties, configure warehouse access scopes, and provision official employee credentials.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-[#0B4DA8] hover:bg-[#1E63C4] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
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
            placeholder="Search by name, username, or email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium shrink-0">Role Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">Manager / Supervisor</option>
            <option value="WAREHOUSE_ADMIN">Warehouse Admin / Operator</option>
            <option value="QUALITY_OFFICER">Quality Officer / Assayer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Official Role</th>
                <th className="p-3.5">Assigned Warehouse Scope</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5">Last Login</th>
                <th className="p-3.5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold font-mono">
                        {u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <strong className="block text-slate-900">{u.fullName}</strong>
                        <span className="text-[11px] text-slate-500 font-mono">{u.username}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${
                      u.role === 'MANAGER'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : (u.role === 'QUALITY_OFFICER' ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-blue-50 text-[#0B4DA8] border-blue-300')
                    }`}>
                      {u.roleTitle}
                    </span>
                  </td>

                  <td className="p-3.5 font-medium text-slate-800">
                    <span className="block">{u.warehouseName}</span>
                    {u.warehouseId && <span className="font-mono text-[10px] text-slate-400">ID: {u.warehouseId}</span>}
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {u.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                    </span>
                  </td>

                  <td className="p-3.5 font-mono text-slate-500">
                    {u.lastLogin || 'Never'}
                  </td>

                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                    >
                      Edit Role
                    </button>

                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                        u.isActive 
                          ? 'border border-rose-200 text-rose-600 hover:bg-rose-50' 
                          : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit User Role & Scope */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Modify Role &amp; Warehouse Scope
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">User Account:</span>
                <strong className="text-slate-900 text-sm">{editingUser.fullName}</strong>
                <span className="text-slate-500 block font-mono">{editingUser.username}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as RoleType })}
                  className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-[#0B4DA8]"
                >
                  <option value="MANAGER">District Godown Manager / Supervisor</option>
                  <option value="WAREHOUSE_ADMIN">Godown Operator / Warehouse Admin</option>
                  <option value="QUALITY_OFFICER">Quality Officer / Assayer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Warehouse Scope</label>
                <select
                  disabled={editingUser.role === 'MANAGER'}
                  value={editingUser.warehouseId || 'ALL'}
                  onChange={(e) => setEditingUser({ ...editingUser, warehouseId: e.target.value === 'ALL' ? null : e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-[#0B4DA8] disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="ALL">All Warehouses (National Central Scope)</option>
                  <option value="GDN-NGP-01">Central Food Godown, Nagpur (GDN-NGP-01)</option>
                  <option value="GDN-PUN-02">District Buffer Depot, Pune (GDN-PUN-02)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B4DA8] hover:bg-[#1E63C4] text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Provision New Employee Account
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Anand Deshmukh"
                  className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username / ID *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. anand.deshmukh"
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="anand@bhandarsetu.gov.in"
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-[#0B4DA8] outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleType)}
                  className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-[#0B4DA8]"
                >
                  <option value="WAREHOUSE_ADMIN">Warehouse Admin / Operator</option>
                  <option value="MANAGER">District Godown Manager / Supervisor</option>
                  <option value="QUALITY_OFFICER">Quality Officer / Assayer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Godown Scope</label>
                <select
                  disabled={newRole === 'MANAGER'}
                  value={newWarehouseId}
                  onChange={(e) => setNewWarehouseId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-[#0B4DA8] disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="GDN-NGP-01">Central Food Godown, Nagpur (GDN-NGP-01)</option>
                  <option value="GDN-PUN-02">District Buffer Depot, Pune (GDN-PUN-02)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B4DA8] hover:bg-[#1E63C4] text-white rounded-xl font-bold cursor-pointer"
                >
                  Provision User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;

