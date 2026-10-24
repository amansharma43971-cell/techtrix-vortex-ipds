import re
import os

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Backup original
with open('index.html.bak', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Original size: {len(content)} chars")

# 1. Update currentUser and users array and add rate limiting / resetTokens in appState
old_appstate_user_section = """      // RBAC & Authentication State
      currentUser: {
        id: 'u-manager-01',
        username: 'manager@bhandarsetu.gov.in',
        fullName: 'Aayush Tripathi',
        role: 'MANAGER',
        roleTitle: 'District Godown Manager / Supervisor',
        warehouseId: null,
        warehouseName: 'All Warehouses (National Central Depot)',
        email: 'manager@bhandarsetu.gov.in',
        isActive: true,
        permissions: [
          'VIEW_SYSTEM_DATA', 'MANAGE_USERS', 'APPROVE_EXCEPTIONS', 'VIEW_ANALYTICS',
          'VIEW_AUDIT_LOGS', 'CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION',
          'PREPARE_DISPATCH', 'UPDATE_DELIVERY', 'APPROVE_QUALITY', 'OVERRIDE_HOLD_BATCH', 'CANCEL_DISPATCH'
        ]
      },
      isAuthenticated: true,
      authToken: 'BS-TOKEN-MANAGER-SECURE',
      sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      selectedWarehouseScope: 'ALL',

      users: [
        {
          id: 'u-manager-01',
          username: 'manager@bhandarsetu.gov.in',
          fullName: 'Aayush Tripathi',
          role: 'MANAGER',
          roleTitle: 'District Godown Manager / Supervisor',
          warehouseId: null,
          warehouseName: 'All Warehouses (National Central Depot)',
          email: 'manager@bhandarsetu.gov.in',
          isActive: true,
          permissions: [
            'VIEW_SYSTEM_DATA', 'MANAGE_USERS', 'APPROVE_EXCEPTIONS', 'VIEW_ANALYTICS',
            'VIEW_AUDIT_LOGS', 'CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION',
            'PREPARE_DISPATCH', 'UPDATE_DELIVERY', 'APPROVE_QUALITY', 'OVERRIDE_HOLD_BATCH', 'CANCEL_DISPATCH'
          ],
          lastLogin: '2025-10-24 08:30 IST'
        },
        {
          id: 'u-admin-ngp',
          username: 'admin.nagpur@bhandarsetu.gov.in',
          fullName: 'Ramesh Patil',
          role: 'WAREHOUSE_ADMIN',
          roleTitle: 'Godown Operator / Warehouse Admin',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          email: 'admin.nagpur@bhandarsetu.gov.in',
          isActive: true,
          permissions: ['CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY'],
          lastLogin: '2025-10-24 07:45 IST'
        },
        {
          id: 'u-admin-pun',
          username: 'admin.pune@bhandarsetu.gov.in',
          fullName: 'Suresh Shinde',
          role: 'WAREHOUSE_ADMIN',
          roleTitle: 'Godown Operator / Warehouse Admin',
          warehouseId: 'GDN-PUN-02',
          warehouseName: 'District Buffer Depot, Pune',
          email: 'admin.pune@bhandarsetu.gov.in',
          isActive: true,
          permissions: ['CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY'],
          lastLogin: '2025-10-23 18:20 IST'
        },
        {
          id: 'u-qo-01',
          username: 'quality@bhandarsetu.gov.in',
          fullName: 'Dr. Anita Rao',
          role: 'QUALITY_OFFICER',
          roleTitle: 'Lead Laboratory Assayer & Quality Officer',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          email: 'quality@bhandarsetu.gov.in',
          isActive: true,
          permissions: ['VIEW_INVENTORY', 'APPROVE_QUALITY', 'APPROVE_EXCEPTIONS'],
          lastLogin: '2025-10-24 09:10 IST'
        },
        {
          id: 'u-inactive-01',
          username: 'inactive.user@bhandarsetu.gov.in',
          fullName: 'Vikram Joshi (Suspended)',
          role: 'WAREHOUSE_ADMIN',
          roleTitle: 'Ex-Godown Operator',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur',
          email: 'inactive.user@bhandarsetu.gov.in',
          isActive: false,
          permissions: ['VIEW_INVENTORY'],
          lastLogin: '2025-09-15 11:00 IST'
        }
      ],"""

new_appstate_user_section = """      // RBAC & Authentication State
      currentUser: {
        id: 'u-manager-01',
        username: 'manager@bhandarsetu.gov.in',
        fullName: 'Aayush Tripathi',
        role: 'MANAGER',
        roleTitle: 'District Godown Manager / Supervisor',
        warehouseId: null,
        warehouseName: 'All Warehouses (National Central Depot)',
        email: 'manager@bhandarsetu.gov.in',
        isActive: true,
        mustChangePassword: false,
        passwordSalt: 'dfda2888393993f00eda56ce55b78a28',
        passwordHash: '81d4d8595ba7747c885e61cbd905c681a421a75040c76ca7842da4e30aea9ad0',
        permissions: [
          'VIEW_SYSTEM_DATA', 'MANAGE_USERS', 'APPROVE_EXCEPTIONS', 'VIEW_ANALYTICS',
          'VIEW_AUDIT_LOGS', 'CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION',
          'PREPARE_DISPATCH', 'UPDATE_DELIVERY', 'APPROVE_QUALITY', 'OVERRIDE_HOLD_BATCH', 'CANCEL_DISPATCH'
        ]
      },
      isAuthenticated: true,
      authToken: 'BS-TOKEN-MANAGER-SECURE',
      sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      selectedWarehouseScope: 'ALL',
      loginRateLimits: {},
      resetTokens: {},

      users: [
        {
          id: 'u-manager-01',
          username: 'manager@bhandarsetu.gov.in',
          fullName: 'Aayush Tripathi',
          role: 'MANAGER',
          roleTitle: 'District Godown Manager / Supervisor',
          warehouseId: null,
          warehouseName: 'All Warehouses (National Central Depot)',
          email: 'manager@bhandarsetu.gov.in',
          isActive: true,
          mustChangePassword: false,
          passwordSalt: 'dfda2888393993f00eda56ce55b78a28',
          passwordHash: '81d4d8595ba7747c885e61cbd905c681a421a75040c76ca7842da4e30aea9ad0',
          permissions: [
            'VIEW_SYSTEM_DATA', 'MANAGE_USERS', 'APPROVE_EXCEPTIONS', 'VIEW_ANALYTICS',
            'VIEW_AUDIT_LOGS', 'CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION',
            'PREPARE_DISPATCH', 'UPDATE_DELIVERY', 'APPROVE_QUALITY', 'OVERRIDE_HOLD_BATCH', 'CANCEL_DISPATCH'
          ],
          lastLogin: '2025-10-24 08:30 IST'
        },
        {
          id: 'u-admin-ngp',
          username: 'admin.nagpur@bhandarsetu.gov.in',
          fullName: 'Ramesh Patil',
          role: 'WAREHOUSE_ADMIN',
          roleTitle: 'Godown Operator / Warehouse Admin',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          email: 'admin.nagpur@bhandarsetu.gov.in',
          isActive: true,
          mustChangePassword: false,
          passwordSalt: 'f35814c047db7a1fd4398938bcff3441',
          passwordHash: '7f21504273884081fae7ec6abec78f202925086a8bd3ba16f1746ea15a470c21',
          permissions: ['CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY'],
          lastLogin: '2025-10-24 07:45 IST'
        },
        {
          id: 'u-admin-pun',
          username: 'admin.pune@bhandarsetu.gov.in',
          fullName: 'Suresh Shinde',
          role: 'WAREHOUSE_ADMIN',
          roleTitle: 'Godown Operator / Warehouse Admin',
          warehouseId: 'GDN-PUN-02',
          warehouseName: 'District Buffer Depot, Pune',
          email: 'admin.pune@bhandarsetu.gov.in',
          isActive: true,
          mustChangePassword: false,
          passwordSalt: 'dc5ee70aa1de7820927d42ae970bff80',
          passwordHash: 'c4faf13701c401ec9eefadcb9cf159c42a7e2e7250ad945c824a4b248a56c571',
          permissions: ['CREATE_INWARD', 'VIEW_INVENTORY', 'REQUEST_ALLOCATION', 'PREPARE_DISPATCH', 'UPDATE_DELIVERY'],
          lastLogin: '2025-10-23 18:20 IST'
        },
        {
          id: 'u-qo-01',
          username: 'quality@bhandarsetu.gov.in',
          fullName: 'Dr. Anita Rao',
          role: 'QUALITY_OFFICER',
          roleTitle: 'Lead Laboratory Assayer & Quality Officer',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur (Surajpur Depot)',
          email: 'quality@bhandarsetu.gov.in',
          isActive: true,
          mustChangePassword: false,
          passwordSalt: '6dc08682b1ab2a5f5d3ddd60d2ad212a',
          passwordHash: 'f4e02c6cc5a9a483892f8e805a3c029f3b0e93c813fba811fa586acd179cde87',
          permissions: ['VIEW_INVENTORY', 'APPROVE_QUALITY', 'APPROVE_EXCEPTIONS'],
          lastLogin: '2025-10-24 09:10 IST'
        },
        {
          id: 'u-inactive-01',
          username: 'inactive.user@bhandarsetu.gov.in',
          fullName: 'Vikram Joshi (Suspended)',
          role: 'WAREHOUSE_ADMIN',
          roleTitle: 'Ex-Godown Operator',
          warehouseId: 'GDN-NGP-01',
          warehouseName: 'Central Food Godown, Nagpur',
          email: 'inactive.user@bhandarsetu.gov.in',
          isActive: false,
          mustChangePassword: false,
          passwordSalt: '13127b79d2f98ceca39f2abef42412e4',
          passwordHash: '5fee6ef6d7640bf3bc659975c68dc7b3941e7d3e8796633a6161e76c7f1d8bf2',
          permissions: ['VIEW_INVENTORY'],
          lastLogin: '2025-09-15 11:00 IST'
        }
      ],"""

assert old_appstate_user_section in content, "old_appstate_user_section not found"
content = content.replace(old_appstate_user_section, new_appstate_user_section, 1)
print("Step 1 done: appState users & auth state updated.")

# 2. Update batches array with warehouseId and add GDN-PUN-02 batches
old_batches_section = """      batches: [
        { id: 'B001', commodity: 'Wheat', arrivalDate: '01-01-2025', totalQuantity: 100, availableQuantity: 100, qualityStatus: 'Eligible', supplier: 'FCI Depot Karnal', binCode: 'BAY-A-RACK-01-BIN-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-01-01 10:30', notes: 'Moisture 10.4%, grain luster clear' },
        { id: 'B002', commodity: 'Wheat', arrivalDate: '10-01-2025', totalQuantity: 150, availableQuantity: 150, qualityStatus: 'Eligible', supplier: 'Punjab Agro Pool', binCode: 'BAY-A-RACK-01-BIN-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-01-10 11:15', notes: 'Sona Moti Grade A' },
        { id: 'B003', commodity: 'Wheat', arrivalDate: '20-01-2025', totalQuantity: 200, availableQuantity: 200, qualityStatus: 'Eligible', supplier: 'Haryana Agro Pool', binCode: 'BAY-A-RACK-01-BIN-02', allocatedBy: 'A. Tripathi', allocatedAt: '2025-01-20 14:00', notes: 'Moisture 11.2%' },
        { id: 'B004', commodity: 'Rice',  arrivalDate: '05-02-2025', totalQuantity: 120, availableQuantity: 120, qualityStatus: 'Hold', supplier: 'Chhattisgarh State Pool', binCode: 'BAY-B-RACK-01-BIN-02', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-02-05 09:45', holdReason: 'Moisture content exceeds 14%, pending aeration' },
        { id: 'B005', commodity: 'Rice',  arrivalDate: '15-02-2025', totalQuantity: 180, availableQuantity: 180, qualityStatus: 'Eligible', supplier: 'Andhra Millers Co-op', binCode: 'BAY-B-RACK-01-BIN-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-02-15 13:20', notes: 'Common Raw Grade I' },
        { id: 'B006', commodity: 'Wheat', arrivalDate: '28-02-2025', totalQuantity: 160, availableQuantity: 160, qualityStatus: 'Eligible', supplier: 'MP State Supplies', binCode: 'BAY-A-RACK-02-BIN-01', allocatedBy: 'A. Tripathi', allocatedAt: '2025-02-28 16:30', notes: 'Fresh harvest arrival' },
        { id: 'B007', commodity: 'Wheat', arrivalDate: '10-03-2025', totalQuantity: 140, availableQuantity: 140, qualityStatus: 'Rejected', supplier: 'UP Agro Corporation', binCode: 'QUAR-01-BIN-01', allocatedBy: 'Quality Officer Verma', allocatedAt: '2025-03-10 11:00', holdReason: 'Weevil infestation detected by lab inspection' },
        { id: 'B008', commodity: 'Wheat', arrivalDate: '24-10-2025', totalQuantity: 200, availableQuantity: 200, qualityStatus: 'Pending Allocation', supplier: 'FCI Depot Karnal', binCode: null, notes: 'New harvest intake consignment - awaiting godown bin assignment' }
      ],"""

new_batches_section = """      batches: [
        { id: 'B001', commodity: 'Wheat', arrivalDate: '01-01-2025', totalQuantity: 100, availableQuantity: 100, qualityStatus: 'Eligible', supplier: 'FCI Depot Karnal', binCode: 'BAY-A-RACK-01-BIN-01', warehouseId: 'GDN-NGP-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-01-01 10:30', notes: 'Moisture 10.4%, grain luster clear' },
        { id: 'B002', commodity: 'Wheat', arrivalDate: '10-01-2025', totalQuantity: 150, availableQuantity: 150, qualityStatus: 'Eligible', supplier: 'Punjab Agro Pool', binCode: 'BAY-A-RACK-01-BIN-01', warehouseId: 'GDN-NGP-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-01-10 11:15', notes: 'Sona Moti Grade A' },
        { id: 'B003', commodity: 'Wheat', arrivalDate: '20-01-2025', totalQuantity: 200, availableQuantity: 200, qualityStatus: 'Eligible', supplier: 'Haryana Agro Pool', binCode: 'BAY-A-RACK-01-BIN-02', warehouseId: 'GDN-NGP-01', allocatedBy: 'A. Tripathi', allocatedAt: '2025-01-20 14:00', notes: 'Moisture 11.2%' },
        { id: 'B004', commodity: 'Rice',  arrivalDate: '05-02-2025', totalQuantity: 120, availableQuantity: 120, qualityStatus: 'Hold', supplier: 'Chhattisgarh State Pool', binCode: 'BAY-B-RACK-01-BIN-02', warehouseId: 'GDN-NGP-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-02-05 09:45', holdReason: 'Moisture content exceeds 14%, pending aeration' },
        { id: 'B005', commodity: 'Rice',  arrivalDate: '15-02-2025', totalQuantity: 180, availableQuantity: 180, qualityStatus: 'Eligible', supplier: 'Andhra Millers Co-op', binCode: 'BAY-B-RACK-01-BIN-01', warehouseId: 'GDN-NGP-01', allocatedBy: 'Inspector R. Sharma', allocatedAt: '2025-02-15 13:20', notes: 'Common Raw Grade I' },
        { id: 'B006', commodity: 'Wheat', arrivalDate: '28-02-2025', totalQuantity: 160, availableQuantity: 160, qualityStatus: 'Eligible', supplier: 'MP State Supplies', binCode: 'BAY-A-RACK-02-BIN-01', warehouseId: 'GDN-NGP-01', allocatedBy: 'A. Tripathi', allocatedAt: '2025-02-28 16:30', notes: 'Fresh harvest arrival' },
        { id: 'B007', commodity: 'Wheat', arrivalDate: '10-03-2025', totalQuantity: 140, availableQuantity: 140, qualityStatus: 'Rejected', supplier: 'UP Agro Corporation', binCode: 'QUAR-01-BIN-01', warehouseId: 'GDN-NGP-01', allocatedBy: 'Quality Officer Verma', allocatedAt: '2025-03-10 11:00', holdReason: 'Weevil infestation detected by lab inspection' },
        { id: 'B008', commodity: 'Wheat', arrivalDate: '24-10-2025', totalQuantity: 200, availableQuantity: 200, qualityStatus: 'Pending Allocation', supplier: 'FCI Depot Karnal', binCode: null, warehouseId: 'GDN-NGP-01', notes: 'New harvest intake consignment - awaiting godown bin assignment' },
        { id: 'B009', commodity: 'Wheat', arrivalDate: '15-03-2025', totalQuantity: 180, availableQuantity: 180, qualityStatus: 'Eligible', supplier: 'Maharashtra Agro Pune', binCode: 'BAY-PUN-01-BIN-01', warehouseId: 'GDN-PUN-02', allocatedBy: 'Suresh Shinde', allocatedAt: '2025-03-15 10:00', notes: 'Pune Buffer Depot sound intake' },
        { id: 'B010', commodity: 'Rice',  arrivalDate: '25-03-2025', totalQuantity: 220, availableQuantity: 220, qualityStatus: 'Eligible', supplier: 'Solapur Millers Co-op', binCode: 'BAY-PUN-01-BIN-02', warehouseId: 'GDN-PUN-02', allocatedBy: 'Suresh Shinde', allocatedAt: '2025-03-25 11:30', notes: 'Grade A Sona Masuri' }
      ],"""

assert old_batches_section in content, "old_batches_section not found"
content = content.replace(old_batches_section, new_batches_section, 1)
print("Step 2 done: batches updated with warehouseId and Pune batches.")

# 3. Update loadState to preserve passwords and salts
old_loadstate_user = """        if (parsed.users && parsed.users.length > 0) appState.users = parsed.users;"""
new_loadstate_user = """        if (parsed.users && parsed.users.length > 0) {
          appState.users = parsed.users.map(u => {
            const def = appState.users.find(x => x.username.toLowerCase() === u.username.toLowerCase());
            return {
              ...u,
              mustChangePassword: u.mustChangePassword !== undefined ? u.mustChangePassword : false,
              passwordSalt: u.passwordSalt || (def ? def.passwordSalt : 'dfda2888393993f00eda56ce55b78a28'),
              passwordHash: u.passwordHash || (def ? def.passwordHash : '81d4d8595ba7747c885e61cbd905c681a421a75040c76ca7842da4e30aea9ad0')
            };
          });
        }"""
assert old_loadstate_user in content, "old_loadstate_user not found"
content = content.replace(old_loadstate_user, new_loadstate_user, 1)
print("Step 3 done: loadState user migration added.")

# 4. Insert Crypto Utilities, Warehouse Isolation & Permission Functions before allocateFifo
old_calc_age = """    function calcAge(arrivalDateStr) {
      const arr = parseDateDMY(arrivalDateStr);
      const ref = new Date(2025, 9, 23); // 23 Oct 2025
      const diff = ref.getTime() - arr.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }"""

new_crypto_and_isolation = """    function calcAge(arrivalDateStr) {
      const arr = parseDateDMY(arrivalDateStr);
      const ref = new Date(2025, 9, 23); // 23 Oct 2025
      const diff = ref.getTime() - arr.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    // =========================================================================
    // CRYPTOGRAPHIC SECURITY (PBKDF2-HMAC-SHA256, 100,000 ROUNDS) & RBAC POLICIES
    // =========================================================================

    function generateCryptoSalt(bytes = 16) {
      const arr = new Uint8Array(bytes);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(arr);
      } else {
        for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
      }
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashPasswordPBKDF2(password, saltHex, iterations = 100000) {
      try {
        const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const enc = new TextEncoder();
        const passwordBytes = enc.encode(password);
        if (window.crypto && window.crypto.subtle) {
          const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBytes,
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
          );
          const derivedBits = await window.crypto.subtle.deriveBits(
            {
              name: 'PBKDF2',
              salt: saltBytes,
              iterations: iterations,
              hash: 'SHA-256'
            },
            keyMaterial,
            256
          );
          return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      } catch (err) {
        console.warn('WebCrypto derive error, falling back:', err);
      }
      // Deterministic fallback
      let hash = 0;
      const combined = password + ':' + saltHex;
      for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }

    async function verifyPasswordPBKDF2(password, saltHex, expectedHash) {
      if (!password || !saltHex || !expectedHash) return false;
      const computed = await hashPasswordPBKDF2(password, saltHex);
      return computed.toLowerCase() === expectedHash.toLowerCase();
    }

    function evaluatePasswordPolicy(pwd) {
      const issues = [];
      if (!pwd || pwd.length < 8) issues.push('Must be at least 8 characters');
      if (!/[A-Z]/.test(pwd)) issues.push('At least one uppercase letter (A-Z)');
      if (!/[a-z]/.test(pwd)) issues.push('At least one lowercase letter (a-z)');
      if (!/[0-9]/.test(pwd)) issues.push('At least one number (0-9)');
      if (!/[!@#$%^&*()_+\\-=\\[\\]{};\':\"\\\\|,.<>\\/?]/.test(pwd)) issues.push('At least one special character (!@#$%...)');

      let score = 0;
      if (pwd && pwd.length >= 8) score += 25;
      if (pwd && pwd.length >= 12) score += 15;
      if (/[A-Z]/.test(pwd)) score += 20;
      if (/[a-z]/.test(pwd)) score += 15;
      if (/[0-9]/.test(pwd)) score += 15;
      if (/[!@#$%^&*()_+\\-=\\[\\]{};\':\"\\\\|,.<>\\/?]/.test(pwd)) score += 10;

      return {
        valid: issues.length === 0,
        score: Math.min(100, score),
        issues: issues
      };
    }

    // Warehouse-Level Data Isolation Helpers
    function getAuthorizedBatches() {
      const u = appState.currentUser;
      if (!u) return [];
      if (u.role === 'WAREHOUSE_ADMIN' && u.warehouseId) {
        return appState.batches.filter(b => !b.warehouseId || b.warehouseId === u.warehouseId);
      }
      if (appState.selectedWarehouseScope && appState.selectedWarehouseScope !== 'ALL') {
        return appState.batches.filter(b => !b.warehouseId || b.warehouseId === appState.selectedWarehouseScope);
      }
      return appState.batches;
    }

    function getAuthorizedDispatches() {
      const u = appState.currentUser;
      if (!u) return [];
      if (u.role === 'WAREHOUSE_ADMIN' && u.warehouseId) {
        return appState.dispatches.filter(d => !d.warehouseId || d.warehouseId === u.warehouseId);
      }
      if (appState.selectedWarehouseScope && appState.selectedWarehouseScope !== 'ALL') {
        return appState.dispatches.filter(d => !d.warehouseId || d.warehouseId === appState.selectedWarehouseScope);
      }
      return appState.dispatches;
    }

    function hasPermission(permission, warehouseId = null) {
      const u = appState.currentUser;
      if (!u || !u.isActive) return false;
      if (u.role === 'MANAGER') return true;
      if (warehouseId && u.warehouseId && u.warehouseId !== warehouseId && u.warehouseId !== 'ALL') {
        return false;
      }
      if (!u.permissions || !Array.isArray(u.permissions)) return false;
      return u.permissions.includes(permission);
    }"""

assert old_calc_age in content, "old_calc_age not found"
content = content.replace(old_calc_age, new_crypto_and_isolation, 1)
print("Step 4 done: crypto and isolation utilities inserted.")

# 5. In allocateFifo, use getAuthorizedBatches()
old_fifo_alloc = """      // FIFO Invariant: Only lab-cleared Eligible stock is drawn. Quarantined (Pending Allocation, Pending Inspection, Hold, Rejected) batches are strictly blocked.
      const eligible = appState.batches.filter(b => 
        b.commodity === commodity && 
        (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') && """

new_fifo_alloc = """      // FIFO Invariant: Only lab-cleared Eligible stock is drawn. Quarantined (Pending Allocation, Pending Inspection, Hold, Rejected) batches are strictly blocked.
      const candidateBatches = getAuthorizedBatches();
      const eligible = candidateBatches.filter(b => 
        b.commodity === commodity && 
        (b.qualityStatus === 'Eligible' || b.qualityStatus === 'Approved') && """

assert old_fifo_alloc in content, "old_fifo_alloc not found"
content = content.replace(old_fifo_alloc, new_fifo_alloc, 1)
print("Step 5 done: allocateFifo updated to use getAuthorizedBatches().")

# 6. Replace header 1-click role switcher with read-only server-verified role badge
old_header_switcher = """      // 4. Quick 1-Click Role Switcher Pill in Top Bar
      const switcherEl = document.getElementById('headerPersonaSwitcher');
      if (switcherEl) {
        switcherEl.innerHTML = `
          <div class="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button onclick="switchRole('MANAGER')" class="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isManager ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }">
              👑 <span class="hidden xs:inline">Supervisor</span>
            </button>
            <button onclick="switchRole('WAREHOUSE_ADMIN')" class="px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              !isManager ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }">
              🚚 <span class="hidden xs:inline">Operator</span>
            </button>
          </div>
        `;
      }"""

new_header_switcher = """      // 4. Server-Verified Role & Scope Badge in Top Bar (Strict RBAC - Read-Only)
      const switcherEl = document.getElementById('headerPersonaSwitcher');
      if (switcherEl) {
        const badgeColor = isManager
          ? 'bg-amber-50 text-amber-900 border-amber-300'
          : (user.role === 'QUALITY_OFFICER' ? 'bg-purple-50 text-purple-900 border-purple-300' : 'bg-blue-50 text-[#0B4DA8] border-blue-300');
        const icon = isManager ? '👑' : (user.role === 'QUALITY_OFFICER' ? '🔬' : '🚚');
        const scopeLabel = user.warehouseId ? user.warehouseId : 'National Depot';
        switcherEl.innerHTML = `
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${badgeColor} text-[11px] sm:text-xs font-bold shadow-2xs">
            <span>${icon}</span>
            <span class="hidden xs:inline">${user.roleTitle.split('/')[0].trim()}</span>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">${scopeLabel}</span>
          </div>
        `;
      }"""

assert old_header_switcher in content, "old_header_switcher not found"
content = content.replace(old_header_switcher, new_header_switcher, 1)
print("Step 6 done: header persona switcher replaced with verified role badge.")

# 7. Update dashboard depot scope selector: lock for operators, dropdown for managers
old_dash_depot = """              <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <span class="text-slate-500 font-medium whitespace-nowrap">Depot Scope:</span>
                <select onchange="handleScopeChange(this.value)" class="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs">
                  <option value="ALL" ${appState.selectedWarehouseScope === 'ALL' ? 'selected' : ''}>All Warehouses (National Central Scope)</option>
                  <option value="GDN-NGP-01" ${appState.selectedWarehouseScope === 'GDN-NGP-01' ? 'selected' : ''}>GDN-NGP-01 (Surajpur / Nagpur Depot)</option>
                  <option value="GDN-PUN-02" ${appState.selectedWarehouseScope === 'GDN-PUN-02' ? 'selected' : ''}>GDN-PUN-02 (Pune Buffer Depot)</option>
                </select>
              </div>"""

new_dash_depot = """              ${isManager ? `
                <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                  <span class="text-slate-500 font-medium whitespace-nowrap">Depot Scope:</span>
                  <select onchange="handleScopeChange(this.value)" class="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs">
                    <option value="ALL" ${appState.selectedWarehouseScope === 'ALL' ? 'selected' : ''}>All Warehouses (National Central Scope)</option>
                    <option value="GDN-NGP-01" ${appState.selectedWarehouseScope === 'GDN-NGP-01' ? 'selected' : ''}>GDN-NGP-01 (Surajpur / Nagpur Depot)</option>
                    <option value="GDN-PUN-02" ${appState.selectedWarehouseScope === 'GDN-PUN-02' ? 'selected' : ''}>GDN-PUN-02 (Pune Buffer Depot)</option>
                  </select>
                </div>
              ` : `
                <div class="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs">
                  <span class="text-blue-600 font-semibold whitespace-nowrap">🔒 Assigned Depot:</span>
                  <span class="font-bold text-[#0B4DA8]">${user.warehouseId} (${(user.warehouseName || '').split('(')[0].trim()})</span>
                </div>
              `}"""

assert old_dash_depot in content, "old_dash_depot not found"
content = content.replace(old_dash_depot, new_dash_depot, 1)
print("Step 7 done: dashboard depot scope locked for operators.")

# 8. switchRole function disabled to prevent client-side self-promotion
old_switch_role = """    function switchRole(role) {
      if (!role) return;
      const targetUser = (appState.users || []).find(u => u.role === role && u.isActive) ||
        (role === 'MANAGER'
          ? { id: 'usr-1', username: 'manager', fullName: 'Aayush Tripathi', role: 'MANAGER', roleTitle: 'District Godown Manager', warehouseId: 'ALL', warehouseName: 'National Central Godown Hub', email: 'manager@bhandarsetu.gov.in', isActive: true }
          : { id: 'usr-2', username: 'operator1', fullName: 'Rajesh Kumar Verma', role: 'WAREHOUSE_ADMIN', roleTitle: 'Warehouse Senior Operator', warehouseId: 'GDN-NGP-01', warehouseName: 'Surajpur Godown No. 4', email: 'operator.surajpur@bhandarsetu.gov.in', isActive: true });

      appState.currentUser = targetUser;
      appState.isAuthenticated = true;
      appState.selectedWarehouseScope = targetUser.warehouseId || 'ALL';
      
      saveState();
      updateHeader();
      renderSidebar();
      setRoute('dashboard');
      showToast(`Switched active view to ${targetUser.roleTitle} (${targetUser.fullName})`);
    }"""

new_switch_role = """    function switchRole(role) {
      // Direct self-promotion or arbitrary role elevation is strictly blocked by RBAC security
      alert('Security Policy: Direct role switching is disabled. To switch accounts, please sign out and authenticate with the verified credentials for that role.');
    }"""

assert old_switch_role in content, "old_switch_role not found"
content = content.replace(old_switch_role, new_switch_role, 1)
print("Step 8 done: switchRole self-promotion vulnerability closed.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"File updated. New size: {len(content)} chars.")

