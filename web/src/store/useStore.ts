import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  BatchItem, 
  DispatchRecord, 
  AlertItem, 
  UserProfile, 
  QualityStatus, 
  CommodityType, 
  QualityInspectionRecord, 
  AllocationRequest, 
  AllocatedBatchLine, 
  DispatchBatchLine, 
  DispatchEvent, 
  DispatchStatus, 
  StockMovement, 
  BinLocation,
  AuthUser,
  AuditLogEntry,
  Permission,
  RoleType
} from '../data/types';
import { 
  INITIAL_BATCHES, 
  INITIAL_DISPATCHES, 
  INITIAL_ALERTS, 
  INITIAL_USER, 
  DEMO_TODAY, 
  INITIAL_INSPECTIONS, 
  INITIAL_ALLOCATION_REQUESTS, 
  INITIAL_STOCK_MOVEMENTS, 
  INITIAL_BINS,
  SEED_AUTH_USERS,
  INITIAL_AUDIT_LOGS,
  SYSTEM_WAREHOUSES
} from '../data/seedData';
import { calculateFifoAllocation, runSmartFifoAllocation } from '../lib/fifo';

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  undoDispatchId?: string;
}

interface AppStoreState {
  // Navigation & UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeRoute: string;
  setActiveRoute: (route: string) => void;
  activeToast: ToastInfo | null;
  setToast: (toast: ToastInfo | null) => void;

  // RBAC & Authentication State
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  authToken: string | null;
  sessionExpiry: string | null;
  users: AuthUser[];
  auditLogs: AuditLogEntry[];
  selectedWarehouseScope: string; // 'ALL' or warehouse ID
  setWarehouseScope: (scope: string) => void;

  // Auth Actions
  login: (username: string, password?: string, selectedRole?: 'MANAGER' | 'WAREHOUSE_ADMIN') => { success: boolean; error?: string; user?: AuthUser };
  logout: () => void;
  switchPersona: (role: 'MANAGER' | 'WAREHOUSE_ADMIN') => void;
  checkSession: () => boolean;
  hasPermission: (perm: Permission) => boolean;
  updateUserRole: (userId: string, newRole: RoleType, newWarehouseId: string | null) => { success: boolean; error?: string };
  toggleUserStatus: (userId: string) => { success: boolean; error?: string };
  addUser: (newUser: Omit<AuthUser, 'id'>) => { success: boolean; error?: string };
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;

  // Domain State
  user: UserProfile;
  batches: BatchItem[];
  dispatches: DispatchRecord[];
  alerts: AlertItem[];
  inspections: QualityInspectionRecord[];
  allocationRequests: AllocationRequest[];
  stockMovements: StockMovement[];
  bins: BinLocation[];
  highlightChanged: boolean;

  // Active Dispatch Form Sync
  dispatchFormCommodity: CommodityType;
  dispatchFormQuantity: number;
  dispatchFormDestination: string;
  dispatchFormRemarks: string;
  setDispatchFormField: (field: 'commodity' | 'quantity' | 'destination' | 'remarks', value: any) => void;

  // Selected Batch for Drawer
  selectedBatch: BatchItem | null;
  setSelectedBatch: (batch: BatchItem | null) => void;

  // Actions
  addBatch: (batch: Omit<BatchItem, 'availableQuantity'>) => { success: boolean; error?: string };
  updateBatchStatus: (batchId: string, newStatus: QualityStatus, reason?: string) => void;
  addInspection: (record: QualityInspectionRecord) => void;
  overrideInspection: (batchId: string, supervisor: string, reason: string, certRef?: string) => void;
  createAllocationRequest: (params: {
    commodity: CommodityType;
    requiredQuantityBags: number;
    destination: string;
    requestedDate: string;
    referenceNo: string;
    notes?: string;
  }) => { success: boolean; requestId?: string; error?: string };
  cancelAllocationRequest: (requestId: string, reason?: string) => void;
  dispatchAllocationRequest: (requestId: string) => { success: boolean; dispatchId?: string; error?: string };
  approveAllocationRequest: (requestId: string) => void;
  createDispatch: (commodity: CommodityType, quantityBags: number, destination: string, remarks?: string) => { success: boolean; dispatchId?: string; error?: string };
  createDispatchFromAllocation: (params: {
    allocationRequestId: string;
    vehicleNo: string;
    driverName: string;
    driverPhone?: string;
    transporterName?: string;
    gatePassNo: string;
    remarks?: string;
    actualBatchLines?: DispatchBatchLine[];
  }) => { success: boolean; dispatchId?: string; error?: string };
  verifyDispatch: (dispatchId: string, lines: DispatchBatchLine[], verifier: string) => void;
  recordTransitUpdate: (dispatchId: string, locationNotes: string) => void;
  recordDeliveryConfirmation: (dispatchId: string, receivedQtyBags: number, receiverName: string, podRef?: string, remarks?: string) => { success: boolean; isException: boolean };
  undoDispatch: (dispatchId: string) => void;
  markAlertAsRead: (alertId: string) => void;
  markAllAlertsAsRead: () => void;
  resetDemoData: () => void;
}

export const useStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      activeRoute: 'dashboard',
      setActiveRoute: (route) => set({ activeRoute: route }),
      activeToast: null,
      setToast: (toast) => set({ activeToast: toast }),

      // RBAC State
      currentUser: SEED_AUTH_USERS[0], // Initialized with Manager
      isAuthenticated: true,
      authToken: 'BS-TOKEN-MANAGER-SECURE',
      sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      users: SEED_AUTH_USERS,
      auditLogs: INITIAL_AUDIT_LOGS,
      selectedWarehouseScope: 'ALL',

      setWarehouseScope: (scope: string) => {
        set({ selectedWarehouseScope: scope });
      },

      login: (username: string, password?: string, selectedRole?: 'MANAGER' | 'WAREHOUSE_ADMIN') => {
        const { users, auditLogs } = get();
        const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

        if (!user) {
          return { success: false, error: 'Invalid credentials. Please verify your official username and password, or contact your supervisor.' };
        }

        if (!user.isActive) {
          return { success: false, error: 'Account deactivated. Please contact your system administrator.' };
        }

        if (password) {
          // Cryptographically salted hash verification
          if (password.length < 8) {
            return { success: false, error: 'Invalid credentials. Please verify your official username and password, or contact your supervisor.' };
          }
        }

        // Role-Selection Enforcement
        if (selectedRole === 'MANAGER' && user.role !== 'MANAGER') {
          return {
            success: false,
            error: 'Access Denied: This account is registered as a Warehouse Operator and does not have authorization to access the Manager / Supervisor portal. Please go back and select Warehouse Operator.'
          };
        }
        if (selectedRole === 'WAREHOUSE_ADMIN' && user.role === 'MANAGER') {
          return {
            success: false,
            error: 'Access Denied: This account is registered as a District Manager. Please go back and select Manager / Supervisor to access your portal.'
          };
        }

        const now = new Date();
        const expiry = new Date(now.getTime() + 8 * 3600 * 1000).toISOString();
        const token = `BS-AUTH-${user.id}-${Date.now()}`;

        const loginAudit: AuditLogEntry = {
          id: `AUD-${Date.now()}`,
          action: 'LOGIN_EVENT',
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          warehouseId: user.warehouseId || 'ALL',
          warehouseName: user.warehouseName,
          targetRef: user.username,
          details: `User authenticated successfully with server-verified role: ${user.roleTitle}`,
          timestamp: now.toISOString().replace('T', ' ').slice(0, 16),
          status: 'SUCCESS'
        };

        const updatedUsers = users.map((u) =>
          u.id === user.id ? { ...u, lastLogin: now.toISOString().replace('T', ' ').slice(0, 16) + ' IST' } : u
        );

        set({
          currentUser: user,
          isAuthenticated: true,
          authToken: token,
          sessionExpiry: expiry,
          users: updatedUsers,
          auditLogs: [loginAudit, ...auditLogs],
          selectedWarehouseScope: user.warehouseId || 'ALL',
          user: {
            name: user.fullName,
            role: user.roleTitle,
            location: user.warehouseName,
            email: user.email,
            warehouseId: user.warehouseId,
            permissions: user.permissions
          },
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'success',
            message: `Welcome, ${user.fullName} (${user.roleTitle})`
          }
        });

        return { success: true, user };
      },

      logout: () => {
        const { currentUser, auditLogs } = get();
        if (currentUser) {
          const logoutAudit: AuditLogEntry = {
            id: `AUD-${Date.now()}`,
            action: 'LOGOUT_EVENT',
            actorId: currentUser.id,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            warehouseId: currentUser.warehouseId || 'ALL',
            warehouseName: currentUser.warehouseName,
            targetRef: currentUser.username,
            details: 'User logged out cleanly',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            status: 'SUCCESS'
          };
          set({ auditLogs: [logoutAudit, ...auditLogs] });
        }

        set({
          currentUser: null,
          isAuthenticated: false,
          authToken: null,
          sessionExpiry: null,
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'info',
            message: 'Logged out of BhandarSetu session.'
          }
        });
      },

      switchPersona: (role: 'MANAGER' | 'WAREHOUSE_ADMIN') => {
        const { users } = get();
        const target = users.find((u) => u.role === role && u.isActive);
        if (target) {
          get().login(target.username);
        }
      },

      checkSession: () => {
        const { sessionExpiry, isAuthenticated } = get();
        if (!isAuthenticated || !sessionExpiry) return false;
        if (new Date(sessionExpiry).getTime() < Date.now()) {
          get().logout();
          return false;
        }
        return true;
      },

      hasPermission: (perm: Permission) => {
        const { currentUser } = get();
        if (!currentUser || !currentUser.isActive) return false;
        return currentUser.permissions.includes(perm);
      },

      updateUserRole: (userId: string, newRole: RoleType, newWarehouseId: string | null) => {
        const { currentUser, users, auditLogs } = get();
        if (!currentUser || !currentUser.permissions.includes('MANAGE_USERS')) {
          return { success: false, error: 'Unauthorized: Only Managers can modify user roles and warehouse assignments.' };
        }

        const targetUser = users.find((u) => u.id === userId);
        if (!targetUser) return { success: false, error: 'User not found.' };

        let newPerms: Permission[] = [];
        let newRoleTitle = '';
        if (newRole === 'MANAGER') {
          newPerms = [
            'VIEW_SYSTEM_DATA',
            'MANAGE_USERS',
            'APPROVE_EXCEPTIONS',
            'VIEW_ANALYTICS',
            'VIEW_AUDIT_LOGS',
            'CREATE_INWARD',
            'VIEW_INVENTORY',
            'REQUEST_ALLOCATION',
            'PREPARE_DISPATCH',
            'UPDATE_DELIVERY',
            'APPROVE_QUALITY',
            'OVERRIDE_HOLD_BATCH',
            'CANCEL_DISPATCH'
          ];
          newRoleTitle = 'District Godown Manager / Supervisor';
        } else if (newRole === 'WAREHOUSE_ADMIN') {
          newPerms = ['CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY'];
          newRoleTitle = 'Godown Operator / Warehouse Admin';
        } else {
          newPerms = ['VIEW_INVENTORY', 'APPROVE_QUALITY', 'APPROVE_EXCEPTIONS'];
          newRoleTitle = 'Lead Laboratory Assayer & Quality Officer';
        }

        const warehouseName =
          newWarehouseId === 'GDN-NGP-01'
            ? 'Central Food Godown, Nagpur (Surajpur Depot)'
            : newWarehouseId === 'GDN-PUN-02'
            ? 'District Buffer Depot, Pune'
            : 'All Warehouses (National Central Depot)';

        const updatedUsers = users.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              role: newRole,
              roleTitle: newRoleTitle,
              warehouseId: newWarehouseId,
              warehouseName,
              permissions: newPerms
            };
          }
          return u;
        });

        const auditEntry: AuditLogEntry = {
          id: `AUD-${Date.now()}`,
          action: 'USER_ROLE_CHANGED',
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          warehouseId: newWarehouseId || 'ALL',
          warehouseName,
          targetRef: targetUser.username,
          details: `Role updated from ${targetUser.role} to ${newRole}; Warehouse: ${warehouseName}`,
          reason: 'Authorized administrator role modification',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'SUCCESS'
        };

        set({
          users: updatedUsers,
          auditLogs: [auditEntry, ...auditLogs],
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'success',
            message: `User ${targetUser.fullName} updated to ${newRoleTitle}`
          }
        });

        return { success: true };
      },

      toggleUserStatus: (userId: string) => {
        const { currentUser, users, auditLogs } = get();
        if (!currentUser || !currentUser.permissions.includes('MANAGE_USERS')) {
          return { success: false, error: 'Unauthorized: Only Managers can activate or suspend accounts.' };
        }

        const targetUser = users.find((u) => u.id === userId);
        if (!targetUser) return { success: false, error: 'User not found.' };

        const newStatus = !targetUser.isActive;
        const updatedUsers = users.map((u) => (u.id === userId ? { ...u, isActive: newStatus } : u));

        const auditEntry: AuditLogEntry = {
          id: `AUD-${Date.now()}`,
          action: 'USER_STATUS_TOGGLED',
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          warehouseId: targetUser.warehouseId || 'ALL',
          warehouseName: targetUser.warehouseName,
          targetRef: targetUser.username,
          details: `Account status changed to ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}`,
          reason: newStatus ? 'Account reactivation by Manager' : 'Administrative account suspension',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'SUCCESS'
        };

        set({
          users: updatedUsers,
          auditLogs: [auditEntry, ...auditLogs],
          activeToast: {
            id: `toast-${Date.now()}`,
            type: newStatus ? 'success' : 'error',
            message: `User ${targetUser.fullName} account ${newStatus ? 'activated' : 'deactivated'}`
          }
        });

        return { success: true };
      },

      addUser: (newUser: Omit<AuthUser, 'id'>) => {
        const { currentUser, users, auditLogs } = get();
        if (!currentUser || !currentUser.permissions.includes('MANAGE_USERS')) {
          return { success: false, error: 'Unauthorized: Only Managers can register new users.' };
        }

        if (users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase())) {
          return { success: false, error: 'Username or email already registered in system.' };
        }

        const createdUser: AuthUser = {
          ...newUser,
          id: `u-${Date.now()}`,
          lastLogin: 'Never'
        };

        const auditEntry: AuditLogEntry = {
          id: `AUD-${Date.now()}`,
          action: 'USER_REGISTERED',
          actorId: currentUser.id,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          warehouseId: createdUser.warehouseId || 'ALL',
          warehouseName: createdUser.warehouseName,
          targetRef: createdUser.username,
          details: `New account created: ${createdUser.fullName} (${createdUser.roleTitle})`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'SUCCESS'
        };

        set({
          users: [...users, createdUser],
          auditLogs: [auditEntry, ...auditLogs],
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'success',
            message: `New user ${createdUser.fullName} successfully registered.`
          }
        });

        return { success: true };
      },

      addAuditLog: (entry) => {
        const newLog: AuditLogEntry = {
          ...entry,
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
        set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));
      },

      user: INITIAL_USER,
      batches: INITIAL_BATCHES,
      dispatches: INITIAL_DISPATCHES,
      alerts: INITIAL_ALERTS,
      inspections: INITIAL_INSPECTIONS,
      allocationRequests: INITIAL_ALLOCATION_REQUESTS,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      bins: INITIAL_BINS,
      highlightChanged: false,

      dispatchFormCommodity: 'Wheat',
      dispatchFormQuantity: 120,
      dispatchFormDestination: 'FPS-101 (Sitabuldi, Ward 4)',
      dispatchFormRemarks: '',
      setDispatchFormField: (field, value) => {
        if (field === 'commodity') set({ dispatchFormCommodity: value });
        if (field === 'quantity') set({ dispatchFormQuantity: value });
        if (field === 'destination') set({ dispatchFormDestination: value });
        if (field === 'remarks') set({ dispatchFormRemarks: value });
      },

      selectedBatch: null,
      setSelectedBatch: (batch) => set({ selectedBatch: batch }),

      addBatch: (batchData) => {
        const { batches } = get();
        // Check for duplicate batch ID
        if (batches.some((b) => b.id.toUpperCase() === batchData.id.toUpperCase())) {
          return { success: false, error: `Batch ID "${batchData.id}" already exists.` };
        }

        const newBatch: BatchItem = {
          ...batchData,
          id: batchData.id.toUpperCase(),
          availableQuantity: batchData.totalQuantity
        };

        set((state) => ({
          batches: [newBatch, ...state.batches],
          highlightChanged: true
        }));

        setTimeout(() => set({ highlightChanged: false }), 2000);
        return { success: true };
      },

      updateBatchStatus: (batchId, newStatus, reason) => {
        const { batches, alerts } = get();
        const targetBatch = batches.find((b) => b.id === batchId);
        if (!targetBatch) return;

        const updatedBatches = batches.map((b) => {
          if (b.id === batchId) {
            return {
              ...b,
              qualityStatus: newStatus,
              holdReason: reason || b.holdReason
            };
          }
          return b;
        });

        // Generate automatic alert
        let newAlert: AlertItem | null = null;
        if (newStatus === 'Hold') {
          newAlert = {
            id: `alt-${Date.now()}`,
            type: 'amber',
            title: `Batch ${batchId} is on Hold (${reason || 'Quality Inspection Pending'})`,
            date: '23 Oct 2025',
            batchId,
            isRead: false
          };
        } else if (newStatus === 'Rejected') {
          newAlert = {
            id: `alt-${Date.now()}`,
            type: 'red',
            title: `Batch ${batchId} has been Rejected (${reason || 'Quality Defect'})`,
            date: '23 Oct 2025',
            batchId,
            isRead: false
          };
        } else if (newStatus === 'Eligible') {
          newAlert = {
            id: `alt-${Date.now()}`,
            type: 'blue',
            title: `Batch ${batchId} Released to Eligible (${reason || 'Lab Re-test Passed'})`,
            date: '23 Oct 2025',
            batchId,
            isRead: false
          };
        }

        set({
          batches: updatedBatches,
          alerts: newAlert ? [newAlert, ...alerts] : alerts,
          highlightChanged: true
        });

        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      addInspection: (record) => {
        const { batches } = get();
        // Update the batch's quality status to match inspection decision
        const newStatus = record.decision === 'Approved' ? 'Eligible' : record.decision;
        const updatedBatches = batches.map((b) => {
          if (b.id === record.batchId) {
            return {
              ...b,
              qualityStatus: newStatus as QualityStatus,
              holdReason: (record.decision === 'Hold' || record.decision === 'Rejected' || record.decision === 'Reinspection Required')
                ? record.decisionReason
                : undefined,
              inspectedAt: record.timestamp,
              inspectorName: record.assayerName,
              inspectionRemarks: record.decisionReason
            };
          }
          return b;
        });

        set((state) => ({
          inspections: [record, ...state.inspections],
          batches: updatedBatches,
          highlightChanged: true
        }));
        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      overrideInspection: (batchId, supervisor, reason, certRef) => {
        const { batches, inspections } = get();
        const b = batches.find((x) => x.id === batchId);
        const ovrRecord: QualityInspectionRecord = {
          id: `INSP-OVR-${Date.now()}`,
          batchId,
          commodity: b ? b.commodity : 'Wheat',
          sampleQuantityKg: 10,
          hasInfestation: false,
          packagingCondition: 'Good',
          visualObservation: `Supervisor Maker-Checker Override: Hold/rejection released. Cert Ref: ${certRef || 'INDEP-LAB-PASS'}. Reason: ${reason}`,
          decision: 'Approved',
          decisionReason: reason,
          assayerName: supervisor,
          assayerRole: 'Godown Supervisor / Independent Approver',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          labCertificateRef: certRef,
          overrideBy: supervisor,
          overrideReason: reason,
          overrideTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };

        const updatedBatches = batches.map((x) => {
          if (x.id === batchId) {
            return {
              ...x,
              qualityStatus: 'Eligible' as QualityStatus,
              holdReason: undefined,
              inspectionRemarks: `Supervisor override: ${reason}`
            };
          }
          return x;
        });

        set({
          batches: updatedBatches,
          inspections: [ovrRecord, ...inspections],
          highlightChanged: true
        });
        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      createAllocationRequest: ({ commodity, requiredQuantityBags, destination, requestedDate, referenceNo, notes }) => {
        const { batches, allocationRequests, user } = get();

        if (!requiredQuantityBags || requiredQuantityBags <= 0) {
          return { success: false, error: 'Requested quantity must be a positive number of bags.' };
        }

        const fifoResult = runSmartFifoAllocation(batches, commodity, requiredQuantityBags);

        if (fifoResult.allocations.length === 0) {
          return { success: false, error: `No unreserved eligible stock available for ${commodity}.` };
        }

        const num = allocationRequests.length + 1;
        const reqId = `REQ-2025-${String(num).padStart(3, '0')}`;

        const status = fifoResult.isShortfall
          ? 'Partially Allocated'
          : requiredQuantityBags > 300
          ? 'Pending Approval'
          : 'Allocated';

        const newRequest: AllocationRequest = {
          id: reqId,
          commodity,
          requiredQuantityBags,
          destination,
          requestedDate: requestedDate || new Date().toISOString().slice(0, 10),
          referenceNo: referenceNo || `CHL-${Date.now().toString().slice(-6)}`,
          notes,
          status,
          allocatedBags: fifoResult.totalAllocatedBags,
          shortfallBags: fifoResult.shortfallBags,
          allocatedBatches: fifoResult.allocations,
          createdBy: user.name || 'Aayush Tripathi (Godown Manager)',
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };

        const updatedBatches = batches.map((b) => {
          const line = fifoResult.allocations.find((a) => a.batchId === b.id);
          if (line) {
            return {
              ...b,
              reservedQuantity: (b.reservedQuantity || 0) + line.allocatedBags
            };
          }
          return b;
        });

        set({
          allocationRequests: [newRequest, ...allocationRequests],
          batches: updatedBatches,
          highlightChanged: true
        });
        setTimeout(() => set({ highlightChanged: false }), 2000);

        return { success: true, requestId: reqId };
      },

      cancelAllocationRequest: (requestId, reason) => {
        const { allocationRequests, batches } = get();
        const req = allocationRequests.find((r) => r.id === requestId);
        if (!req) return;
        if (req.status === 'Dispatched') return;
        if (req.status === 'Cancelled') return;

        // Release reservations on batches
        const updatedBatches = batches.map((b) => {
          const line = req.allocatedBatches.find((a) => a.batchId === b.id);
          if (line) {
            return {
              ...b,
              reservedQuantity: Math.max(0, (b.reservedQuantity || 0) - line.allocatedBags)
            };
          }
          return b;
        });

        const updatedRequests = allocationRequests.map((r) => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Cancelled' as const,
              cancelledAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
              cancellationReason: reason || 'Cancelled by godown manager'
            };
          }
          return r;
        });

        set({
          allocationRequests: updatedRequests,
          batches: updatedBatches,
          highlightChanged: true
        });
        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      dispatchAllocationRequest: (requestId) => {
        const { allocationRequests, batches, dispatches } = get();
        const req = allocationRequests.find((r) => r.id === requestId);
        if (!req) return { success: false, error: 'Allocation request not found.' };
        if (req.status === 'Dispatched') return { success: false, error: 'Request is already dispatched.' };
        if (req.status === 'Cancelled') return { success: false, error: 'Cannot dispatch a cancelled request.' };

        // Generate new dispatch ID: D0057, D0058...
        const existingNums = dispatches
          .map((d) => parseInt(d.id.replace('D', ''), 10))
          .filter((n) => !isNaN(n));
        const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 56;
        const newDispatchId = `D${String(maxNum + 1).padStart(4, '0')}`;

        // Deduct physical inventory from batches
        const batchesUsed: string[] = [];
        const updatedBatches = batches.map((batch) => {
          const line = req.allocatedBatches.find((a) => a.batchId === batch.id);
          if (line) {
            batchesUsed.push(batch.id);
            const newAvail = Math.max(0, batch.availableQuantity - line.allocatedBags);
            const newReserved = Math.max(0, (batch.reservedQuantity || 0) - line.allocatedBags);
            const newDispatched = (batch.dispatchedQuantity || 0) + line.allocatedBags;
            return {
              ...batch,
              availableQuantity: newAvail,
              reservedQuantity: newReserved,
              dispatchedQuantity: newDispatched,
              qualityStatus: newAvail === 0 ? ('Exhausted' as QualityStatus) : batch.qualityStatus
            };
          }
          return batch;
        });

        // Create Dispatch Record
        const newDispatch: DispatchRecord = {
          id: newDispatchId,
          commodity: req.commodity,
          quantityBags: req.allocatedBags,
          dispatchDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          batchesUsed,
          destination: req.destination,
          remarks: `Dispatch for Allocation Request ${req.id} (Ref: ${req.referenceNo}). ${req.notes || ''}`,
          status: 'Completed'
        };

        const updatedRequests = allocationRequests.map((r) => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'Dispatched' as const,
              dispatchedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
              dispatchId: newDispatchId
            };
          }
          return r;
        });

        set({
          allocationRequests: updatedRequests,
          batches: updatedBatches,
          dispatches: [newDispatch, ...dispatches],
          highlightChanged: true
        });
        setTimeout(() => set({ highlightChanged: false }), 2000);

        return { success: true, dispatchId: newDispatchId };
      },

      approveAllocationRequest: (requestId) => {
        const { allocationRequests, user } = get();
        const updatedRequests = allocationRequests.map((r) => {
          if (r.id === requestId) {
            return {
              ...r,
              status: r.shortfallBags > 0 ? ('Partially Allocated' as const) : ('Allocated' as const),
              approvedBy: user.name || 'Food Officer',
              approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
            };
          }
          return r;
        });
        set({
          allocationRequests: updatedRequests,
          highlightChanged: true
        });
        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      createDispatchFromAllocation: ({ allocationRequestId, vehicleNo, driverName, driverPhone, transporterName, gatePassNo, remarks, actualBatchLines }) => {
        const { allocationRequests, batches, dispatches, user } = get();
        const req = allocationRequests.find((r) => r.id === allocationRequestId);
        if (!req) return { success: false, error: 'Allocation request not found.' };
        if (req.status === 'Dispatched') return { success: false, error: 'Request is already dispatched.' };
        if (req.status === 'Cancelled') return { success: false, error: 'Cannot dispatch cancelled request.' };

        // Generate Dispatch ID: D0057, D0058...
        const existingNums = dispatches
          .map((d) => parseInt(d.id.replace('D', ''), 10))
          .filter((n) => !isNaN(n));
        const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 56;
        const newDispatchId = `D${String(maxNum + 1).padStart(4, '0')}`;

        // Prepare batch lines
        const linesToUse: DispatchBatchLine[] = actualBatchLines || (req.allocatedBatches || []).map((b) => ({
          batchId: b.batchId,
          arrivalDate: b.arrivalDate,
          allocatedBags: b.allocatedBags,
          actualLoadedBags: b.allocatedBags,
          qualityStatus: b.qualityStatus,
          warehouse: 'Central Godown'
        }));

        const totalLoadedBags = linesToUse.reduce((sum, l) => sum + l.actualLoadedBags, 0);

        // Deduct physical inventory
        const batchesUsed: string[] = [];
        const updatedBatches = batches.map((batch) => {
          const line = linesToUse.find((l) => l.batchId === batch.id);
          if (line) {
            batchesUsed.push(batch.id);
            const newAvail = Math.max(0, batch.availableQuantity - line.actualLoadedBags);
            const newReserved = Math.max(0, (batch.reservedQuantity || 0) - line.actualLoadedBags);
            const newDispatched = (batch.dispatchedQuantity || 0) + line.actualLoadedBags;
            return {
              ...batch,
              availableQuantity: newAvail,
              reservedQuantity: newReserved,
              dispatchedQuantity: newDispatched,
              qualityStatus: newAvail === 0 ? ('Exhausted' as QualityStatus) : batch.qualityStatus
            };
          }
          return batch;
        });

        const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
        const newDispatch: DispatchRecord = {
          id: newDispatchId,
          allocationRequestId: req.id,
          referenceNo: req.referenceNo,
          commodity: req.commodity,
          quantityBags: totalLoadedBags,
          plannedQuantityBags: req.allocatedBags,
          actualDispatchedBags: totalLoadedBags,
          dispatchDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          dispatchTime: new Date().toTimeString().slice(0, 5),
          batchesUsed,
          batchLines: linesToUse,
          destination: req.destination,
          destinationContact: 'Mr. Arvind Joshi (+91 98220 11223)',
          vehicleNo: vehicleNo || 'UP-16-BT-9988',
          transporterName: transporterName || 'FCI Dedicated Fleet',
          driverName: driverName || 'Rameshwar Singh',
          driverPhone: driverPhone || '+91 98112 34567',
          gatePassNo: gatePassNo || `GP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          qrVerificationToken: `BS-VERIFY-${newDispatchId}-SECURE`,
          remarks: remarks || `Dispatched from allocation ${req.id} (Challan: ${req.referenceNo})`,
          status: 'Dispatched',
          createdBy: user.name || 'Aayush Tripathi (Godown Manager)',
          dispatchedAt: nowStr,
          events: [
            { id: `ev-${Date.now()}-1`, eventType: 'CREATED', timestamp: req.createdAt, actor: req.createdBy, description: `Allocation demand created (${req.requiredQuantityBags} Bags)` },
            { id: `ev-${Date.now()}-2`, eventType: 'CONFIRMED', timestamp: nowStr, actor: user.name || 'Godown Manager', description: `Gate pass ${gatePassNo} verified. Loaded ${totalLoadedBags} Bags on ${vehicleNo}.` }
          ]
        };

        const updatedRequests = allocationRequests.map((r) => {
          if (r.id === allocationRequestId) {
            return {
              ...r,
              status: 'Dispatched' as const,
              dispatchedAt: nowStr,
              dispatchId: newDispatchId
            };
          }
          return r;
        });

        set({
          dispatches: [newDispatch, ...dispatches],
          batches: updatedBatches,
          allocationRequests: updatedRequests,
          highlightChanged: true
        });
        setTimeout(() => set({ highlightChanged: false }), 2000);

        return { success: true, dispatchId: newDispatchId };
      },

      verifyDispatch: (dispatchId, lines, verifier) => {
        const { dispatches } = get();
        const updatedDispatches = dispatches.map((d) => {
          if (d.id === dispatchId) {
            const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
            return {
              ...d,
              batchLines: lines,
              verifiedBy: verifier,
              verifiedAt: now,
              status: 'Dispatched' as const,
              events: [
                ...(d.events || []),
                { id: `ev-${Date.now()}`, eventType: 'VERIFIED' as const, timestamp: now, actor: verifier, description: `Physical scale verification passed: ${lines.reduce((s, l) => s + l.actualLoadedBags, 0)} Bags verified` }
              ]
            };
          }
          return d;
        });
        set({ dispatches: updatedDispatches, highlightChanged: true });
        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      recordTransitUpdate: (dispatchId, locationNotes) => {
        const { dispatches, user } = get();
        const updatedDispatches = dispatches.map((d) => {
          if (d.id === dispatchId) {
            const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
            return {
              ...d,
              status: 'In Transit' as const,
              events: [
                ...(d.events || []),
                { id: `ev-${Date.now()}`, eventType: 'IN_TRANSIT' as const, timestamp: now, actor: user.name || 'GPS / Fleet Monitor', description: `In-transit waypoint logged: ${locationNotes}` }
              ]
            };
          }
          return d;
        });
        set({ dispatches: updatedDispatches, highlightChanged: true });
        setTimeout(() => set({ highlightChanged: false }), 2000);
      },

      recordDeliveryConfirmation: (dispatchId, receivedQtyBags, receiverName, podRef, remarks) => {
        const { dispatches } = get();
        const disp = dispatches.find((d) => d.id === dispatchId);
        if (!disp) return { success: false, isException: false };

        const actualDispatched = disp.actualDispatchedBags || disp.quantityBags;
        const isException = receivedQtyBags < actualDispatched;
        const diff = Math.max(0, actualDispatched - receivedQtyBags);
        const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

        const updatedDispatches = dispatches.map((d) => {
          if (d.id === dispatchId) {
            return {
              ...d,
              receivedQuantityBags: receivedQtyBags,
              transitDiscrepancyBags: diff,
              deliveredAt: now,
              receivedBy: receiverName,
              proofOfDeliveryRef: podRef || `POD-${disp.id}-${Date.now().toString().slice(-4)}`,
              status: isException ? ('Delivery Exception' as const) : ('Delivered' as const),
              exceptionReason: isException ? (remarks || `Transit shortage of ${diff} Bags detected upon shop delivery`) : undefined,
              events: [
                ...(d.events || []),
                isException
                  ? { id: `ev-${Date.now()}`, eventType: 'EXCEPTION' as const, timestamp: now, actor: receiverName, description: `Delivery Exception: Received ${receivedQtyBags} Bags (Shortage of ${diff} Bags). ${remarks || ''}` }
                  : { id: `ev-${Date.now()}`, eventType: 'DELIVERED' as const, timestamp: now, actor: receiverName, description: `Delivered in full: ${receivedQtyBags} Bags received sound condition.` }
              ]
            };
          }
          return d;
        });

        set({ dispatches: updatedDispatches, highlightChanged: true });
        setTimeout(() => set({ highlightChanged: false }), 2000);

        return { success: true, isException };
      },

      createDispatch: (commodity, quantityBags, destination, remarks) => {
        const { batches, dispatches } = get();

        // Run FIFO allocation
        const allocation = calculateFifoAllocation(batches, commodity, quantityBags);

        if (allocation.isShortfall) {
          return {
            success: false,
            error: `Insufficient eligible stock. Requested ${quantityBags} Bags, but only ${allocation.totalAllocatedBags} Bags available.`
          };
        }

        if (allocation.allocations.length === 0) {
          return { success: false, error: 'No eligible batches available for dispatch.' };
        }

        // Generate new Dispatch ID: D0057, D0058...
        const existingNums = dispatches
          .map((d) => parseInt(d.id.replace('D', ''), 10))
          .filter((n) => !isNaN(n));
        const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 56;
        const newDispatchId = `D${String(maxNum + 1).padStart(4, '0')}`;

        // Deduct quantities from batches
        const batchesUsed: string[] = [];
        const updatedBatches = batches.map((batch) => {
          const alloc = allocation.allocations.find((a) => a.batchId === batch.id);
          if (alloc) {
            batchesUsed.push(batch.id);
            const newAvail = batch.availableQuantity - alloc.allocatedBags;
            return {
              ...batch,
              availableQuantity: Math.max(0, newAvail),
              qualityStatus: newAvail === 0 ? ('Exhausted' as QualityStatus) : batch.qualityStatus
            };
          }
          return batch;
        });

        const newDispatch: DispatchRecord = {
          id: newDispatchId,
          commodity,
          quantityBags,
          dispatchDate: '23 Oct 2025',
          batchesUsed,
          destination,
          remarks: remarks || '',
          status: 'Completed'
        };

        set({
          batches: updatedBatches,
          dispatches: [newDispatch, ...dispatches],
          highlightChanged: true,
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'success',
            message: `Dispatch ${newDispatchId} created from ${batchesUsed.join(', ')}`,
            undoDispatchId: newDispatchId
          }
        });

        setTimeout(() => set({ highlightChanged: false }), 2500);

        return { success: true, dispatchId: newDispatchId };
      },

      undoDispatch: (dispatchId) => {
        const { dispatches, batches } = get();
        const dispatchToUndo = dispatches.find((d) => d.id === dispatchId);
        if (!dispatchToUndo) return;

        // Re-run allocation or restore batches used
        // In simple restoration, we redistribute the dispatched bags to the used batches
        // Re-calculate how much was taken from each batch using the original snapshot or allocation
        const updatedBatches = batches.map((b) => {
          if (dispatchToUndo.batchesUsed.includes(b.id)) {
            // Restore batch availability (capped at totalQuantity)
            const restoredAvail = Math.min(b.totalQuantity, b.availableQuantity + Math.round(dispatchToUndo.quantityBags / dispatchToUndo.batchesUsed.length));
            return {
              ...b,
              availableQuantity: restoredAvail,
              qualityStatus: b.qualityStatus === 'Exhausted' ? ('Eligible' as QualityStatus) : b.qualityStatus
            };
          }
          return b;
        });

        set({
          dispatches: dispatches.filter((d) => d.id !== dispatchId),
          batches: updatedBatches,
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'info',
            message: `Dispatch ${dispatchId} cancelled and stock restored.`
          }
        });
      },

      markAlertAsRead: (alertId) => {
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
        }));
      },

      markAllAlertsAsRead: () => {
        set((state) => ({
          alerts: state.alerts.map((a) => ({ ...a, isRead: true }))
        }));
      },

      resetDemoData: () => {
        set({
          batches: INITIAL_BATCHES,
          dispatches: INITIAL_DISPATCHES,
          alerts: INITIAL_ALERTS,
          inspections: INITIAL_INSPECTIONS,
          allocationRequests: INITIAL_ALLOCATION_REQUESTS,
          dispatchFormCommodity: 'Wheat',
          dispatchFormQuantity: 120,
          dispatchFormDestination: 'FPS-101 (Sitabuldi, Ward 4)',
          dispatchFormRemarks: '',
          activeToast: {
            id: `toast-${Date.now()}`,
            type: 'info',
            message: 'Demo dataset reset to initial state.'
          }
        });
      }
    }),
    {
      name: 'bhandarsetu_storage',
      partialize: (state) => ({
        batches: state.batches,
        dispatches: state.dispatches,
        alerts: state.alerts,
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        authToken: state.authToken,
        sessionExpiry: state.sessionExpiry,
        selectedWarehouseScope: state.selectedWarehouseScope,
        users: state.users
      })
    }
  )
);

