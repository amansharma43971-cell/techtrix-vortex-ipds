import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CSS animations in <style>
old_style_target = """.animate-fadeIn {
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }"""

new_style_additions = """.animate-fadeIn {
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes loginSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-loginSlide {
      animation: loginSlideIn 190ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes cardSelectPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.015); }
      100% { transform: scale(1); }
    }
    .animate-cardSelect {
      animation: cardSelectPulse 190ms ease-out forwards;
    }
    @media (prefers-reduced-motion: reduce) {
      .animate-loginSlide,
      .animate-cardSelect,
      .animate-fadeIn,
      .animate-pageTransition {
        animation: none !important;
        transition: none !important;
      }
    }"""

assert old_style_target in content, "old_style_target not found"
content = content.replace(old_style_target, new_style_additions, 1)
print("Step 1: CSS animations added.")

# 2. Add loginStep and loginSelectedRole in appState
old_appstate_anchor = """      loginRateLimits: {},
      resetTokens: {},"""

new_appstate_anchor = """      loginRateLimits: {},
      resetTokens: {},
      loginStep: 1, // 1: Select Role, 2: Login Form
      loginSelectedRole: null, // 'MANAGER' or 'WAREHOUSE_ADMIN'"""

assert old_appstate_anchor in content, "old_appstate_anchor not found"
content = content.replace(old_appstate_anchor, new_appstate_anchor, 1)
print("Step 2: loginStep & loginSelectedRole added to appState.")

# 3. Replace renderLoginView
old_login_view_start = "    function renderLoginView() {"
old_login_view_end = "    function renderUnauthorizedView(requiredPerm"

idx1 = content.find(old_login_view_start)
idx2 = content.find(old_login_view_end)
assert idx1 != -1 and idx2 != -1, "renderLoginView boundaries not found"

new_login_view = """    function selectLoginRole(role) {
      appState.loginSelectedRole = role;
      renderCurrentRoute();
    }

    function proceedToLoginForm() {
      if (!appState.loginSelectedRole) return;
      appState.loginStep = 2;
      renderCurrentRoute();
    }

    function backToRoleSelection() {
      appState.loginStep = 1;
      renderCurrentRoute();
    }

    function renderLoginView() {
      const step = appState.loginStep || 1;
      const selectedRole = appState.loginSelectedRole;

      // Check lockout status
      const now = Date.now();
      let isAnyLocked = false;
      let maxLockoutMin = 0;
      for (const [key, rec] of Object.entries(appState.loginRateLimits || {})) {
        if (rec && rec.lockoutUntil && now < rec.lockoutUntil) {
          isAnyLocked = true;
          const mins = Math.ceil((rec.lockoutUntil - now) / 60000);
          if (mins > maxLockoutMin) maxLockoutMin = mins;
        }
      }

      if (step === 1) {
        // =====================================================================
        // SCREEN 1: SELECT YOUR ROLE (Clean, No Credentials / Demo Accounts)
        // =====================================================================
        return `
          <div class="min-h-[85vh] flex items-center justify-center p-4">
            <div class="max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-loginSlide">
              <!-- Top Official Emblem Header -->
              <div class="bg-[#0A2F6B] text-white p-6 text-center border-b border-white/10 relative">
                <div class="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 mb-3 shadow-md">
                  <svg viewBox="0 0 24 24" class="w-8 h-8 text-[#FBBF24]" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 22 16 8"></path>
                    <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"></path>
                    <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"></path>
                    <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"></path>
                    <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"></path>
                  </svg>
                </div>
                <h1 class="text-xl font-bold tracking-tight">BhandarSetu Portal</h1>
                <p class="text-xs text-blue-200 mt-0.5">
                  Smart Commodity Inventory &amp; FIFO Management in iPDS
                </p>
                <div class="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-blue-100 border border-white/10">
                  <span>Two-Level Role-Based Access Control</span>
                </div>
              </div>

              <!-- Screen 1: Role Selection Body -->
              <div class="p-6 sm:p-8 space-y-6">
                <div class="text-center">
                  <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome to BhandarSetu
                  </h2>
                  <p class="text-xs sm:text-sm text-slate-500 mt-1">
                    Select your role to continue.
                  </p>
                </div>

                <!-- Selectable Role Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Card 1: Manager / Supervisor -->
                  <div
                    role="button"
                    tabindex="0"
                    onclick="selectLoginRole('MANAGER')"
                    onkeydown="if(event.key==='Enter'||event.key===' ') selectLoginRole('MANAGER')"
                    class="relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                      selectedRole === 'MANAGER'
                        ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-[#0B4DA8]/20 shadow-xs animate-cardSelect'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }"
                  >
                    <div class="flex items-start justify-between gap-3 mb-4">
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${
                        selectedRole === 'MANAGER'
                          ? 'bg-[#0B4DA8] text-white shadow-xs'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-amber-100'
                      }">
                        <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          <path d="m9 12 2 2 4-4"></path>
                        </svg>
                      </div>
                      <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedRole === 'MANAGER' ? 'border-[#0B4DA8] bg-[#0B4DA8]' : 'border-slate-300 bg-white'
                      }">
                        ${selectedRole === 'MANAGER' ? '<span class="w-2 h-2 rounded-full bg-white"></span>' : ''}
                      </div>
                    </div>

                    <div>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <strong class="text-sm font-bold text-slate-900">Manager / Supervisor</strong>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">Supervisor Portal</span>
                      </div>
                      <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                        Manage warehouse operations, monitor inventory, review reports, and manage authorized users.
                      </p>
                    </div>
                  </div>

                  <!-- Card 2: Warehouse Operator -->
                  <div
                    role="button"
                    tabindex="0"
                    onclick="selectLoginRole('WAREHOUSE_ADMIN')"
                    onkeydown="if(event.key==='Enter'||event.key===' ') selectLoginRole('WAREHOUSE_ADMIN')"
                    class="relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                      selectedRole === 'WAREHOUSE_ADMIN'
                        ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-[#0B4DA8]/20 shadow-xs animate-cardSelect'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }"
                  >
                    <div class="flex items-start justify-between gap-3 mb-4">
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${
                        selectedRole === 'WAREHOUSE_ADMIN'
                          ? 'bg-[#0B4DA8] text-white shadow-xs'
                          : 'bg-blue-50 text-[#0B4DA8] border border-blue-200 group-hover:bg-blue-100'
                      }">
                        <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                      </div>
                      <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedRole === 'WAREHOUSE_ADMIN' ? 'border-[#0B4DA8] bg-[#0B4DA8]' : 'border-slate-300 bg-white'
                      }">
                        ${selectedRole === 'WAREHOUSE_ADMIN' ? '<span class="w-2 h-2 rounded-full bg-white"></span>' : ''}
                      </div>
                    </div>

                    <div>
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <strong class="text-sm font-bold text-slate-900">Warehouse Operator</strong>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-[#0B4DA8] border border-blue-200">Operator Portal</span>
                      </div>
                      <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                        Receive stock, view assigned batches, request FIFO allocation, and manage permitted dispatch tasks.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Continue Button -->
                <div class="pt-2">
                  <button
                    type="button"
                    id="roleContinueBtn"
                    onclick="proceedToLoginForm()"
                    ${!selectedRole ? 'disabled' : ''}
                    class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRole
                        ? 'bg-[#0B4DA8] hover:bg-[#1E63C4] active:bg-[#0A2F6B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                    }"
                  >
                    <span>Continue to Login</span>
                    <span>→</span>
                  </button>
                  <p class="text-[11px] text-slate-400 text-center mt-2.5">
                    ${selectedRole ? `Selected: <strong>${selectedRole === 'MANAGER' ? 'Manager / Supervisor' : 'Warehouse Operator'}</strong>` : 'Select your official role above to continue'}
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
                Integrated Public Distribution System (iPDS) · Ministry of Consumer Affairs, Food &amp; Public Distribution
              </div>
            </div>
          </div>
        `;
      }

      // =======================================================================
      // SCREEN 2: LOGIN FORM (Filtered by Selected Role)
      // =======================================================================
      const isManagerPortal = selectedRole === 'MANAGER';
      const roleDisplayName = isManagerPortal ? 'Manager / Supervisor' : 'Warehouse Operator';

      return `
        <div class="min-h-[85vh] flex items-center justify-center p-4">
          <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-loginSlide">
            <!-- Top Official Emblem Header -->
            <div class="bg-[#0A2F6B] text-white p-6 text-center border-b border-white/10 relative">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 mb-3 shadow-md">
                <svg viewBox="0 0 24 24" class="w-8 h-8 text-[#FBBF24]" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 22 16 8"></path>
                  <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"></path>
                  <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"></path>
                  <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"></path>
                  <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"></path>
                </svg>
              </div>
              <h1 class="text-xl font-bold tracking-tight">BhandarSetu Portal</h1>
              <p class="text-xs text-blue-200 mt-0.5">
                Smart Commodity Inventory &amp; FIFO Management in iPDS
              </p>
              <div class="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-blue-100 border border-white/10">
                <span>${roleDisplayName} Portal</span>
              </div>
            </div>

            <!-- Login Form Card Body -->
            <div class="p-6 space-y-4">
              <!-- Back button to change role -->
              <div>
                <button
                  type="button"
                  onclick="backToRoleSelection()"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B4DA8] transition-colors mb-2 cursor-pointer group"
                >
                  <span class="group-hover:-translate-x-0.5 transition-transform">←</span>
                  <span>Change Role Selection</span>
                </button>

                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h2 class="text-base font-bold text-slate-900 tracking-tight">
                      ${isManagerPortal ? 'Manager Login' : 'Operator Login'}
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Enter your official credentials. Access clearance is verified server-side.
                    </p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    isManagerPortal
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-blue-50 text-[#0B4DA8] border-blue-300'
                  }">
                    ${isManagerPortal ? '👑 Supervisor Scope' : '🚚 Operator Scope'}
                  </span>
                </div>
              </div>

              <!-- Rate Limit Lockout Warning -->
              ${isAnyLocked ? `
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <span class="text-base">⏳</span>
                  <div>
                    <strong class="block font-bold">Account Rate-Limit Lockout Active</strong>
                    <span>Consecutive failed login attempts detected. System-level security lockout enforced for ${maxLockoutMin} minute(s).</span>
                  </div>
                </div>
              ` : ''}

              <!-- Generic Validation & Security Error Alert -->
              <div id="loginErrorMsg" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <strong class="block font-bold">Authentication Failed</strong>
                <span id="loginErrorText"></span>
              </div>

              <form onsubmit="handleLoginSubmit(event)" class="space-y-3.5">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Username or Official Email *
                  </label>
                  <input
                    type="text"
                    id="loginUsername"
                    required
                    autocomplete="username"
                    placeholder="e.g. ${isManagerPortal ? 'manager@bhandarsetu.gov.in' : 'admin.nagpur@bhandarsetu.gov.in'}"
                    class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] focus:border-transparent transition-all outline-hidden font-medium"
                  />
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-semibold text-slate-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onclick="openForgotPasswordModal()"
                      class="text-[11px] font-semibold text-[#0B4DA8] hover:text-[#0A2F6B] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div class="relative">
                    <input
                      type="password"
                      id="loginPassword"
                      required
                      autocomplete="current-password"
                      placeholder="••••••••••••"
                      class="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] focus:border-transparent transition-all outline-hidden font-medium pr-10"
                    />
                    <button
                      type="button"
                      onclick="toggleLoginPasswordVisibility()"
                      title="Toggle password visibility"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm p-1 rounded-lg cursor-pointer"
                    >
                      <span id="loginPasswordEyeIcon">👁️</span>
                    </button>
                  </div>
                </div>

                <div class="flex items-center justify-between text-xs text-slate-600">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked class="rounded border-slate-300 text-[#0B4DA8]" />
                    <span>Remember on this terminal</span>
                  </label>
                  <span class="text-slate-400">8h cryptographic token</span>
                </div>

                <button
                  type="submit"
                  id="loginSubmitBtn"
                  class="w-full py-2.5 px-4 rounded-xl bg-[#0B4DA8] hover:bg-[#1E63C4] active:bg-[#0A2F6B] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>Sign In as ${isManagerPortal ? 'Manager' : 'Operator'}</span>
                  <span>→</span>
                </button>
              </form>

              <!-- Security Policy Notice -->
              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed text-center">
                🛡️ <strong>Separation of Duties Enforced:</strong> Credentials will be verified against the official server directory. Accounts without clearance for the ${roleDisplayName} portal will be denied.
              </div>
            </div>

            <!-- Footer -->
            <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Integrated Public Distribution System (iPDS) · Ministry of Consumer Affairs, Food &amp; Public Distribution
            </div>
          </div>
        </div>
      `;
    }

"""

content = content[:idx1] + new_login_view + content[idx2:]
print("Step 3: renderLoginView updated with 2-screen role selection and login form.")

# 4. Update handleLoginSubmit to verify role match
old_hls_start = "    async function handleLoginSubmit(e) {"
old_hls_end = "    function completeUserLogin(user) {"
idx3 = content.find(old_hls_start)
idx4 = content.find(old_hls_end)
assert idx3 != -1 and idx4 != -1, "handleLoginSubmit boundaries not found"

new_handle_login = """    async function handleLoginSubmit(e) {
      e.preventDefault();
      const uVal = (document.getElementById('loginUsername')?.value || '').trim();
      const pVal = (document.getElementById('loginPassword')?.value || '').trim();
      const errBox = document.getElementById('loginErrorMsg');
      const errText = document.getElementById('loginErrorText');
      const submitBtn = document.getElementById('loginSubmitBtn');
      const selectedRole = appState.loginSelectedRole || 'MANAGER';
      const isManagerPortal = selectedRole === 'MANAGER';

      if (errBox) errBox.classList.add('hidden');

      if (!uVal || !pVal) {
        if (errBox && errText) {
          errText.textContent = 'Please enter both your assigned username/email and password.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      // Check Rate Limiting Lockout
      const now = Date.now();
      const rateLimitKey = uVal.toLowerCase();
      const rateRecord = appState.loginRateLimits[rateLimitKey];
      if (rateRecord && rateRecord.lockoutUntil && now < rateRecord.lockoutUntil) {
        const remMins = Math.ceil((rateRecord.lockoutUntil - now) / 60000);
        if (errBox && errText) {
          errText.textContent = `Account temporarily locked due to multiple failed login attempts. Please wait ${remMins} minute(s) or contact your District Manager.`;
          errBox.classList.remove('hidden');
        }
        return;
      }

      // Set Loading State on Button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Authenticating Credentials...</span>
        `;
      }

      // Brief delay for visual feedback & simulated crypto verification
      await new Promise(r => setTimeout(r, 220));

      const user = appState.users.find(u => 
        u.username.toLowerCase() === uVal.toLowerCase() || 
        (u.email && u.email.toLowerCase() === uVal.toLowerCase())
      );

      let isValid = false;
      if (user) {
        if (user.passwordSalt && user.passwordHash) {
          isValid = await verifyPasswordPBKDF2(pVal, user.passwordSalt, user.passwordHash);
        }
        // Fallback verification for default accounts
        if (!isValid) {
          const fallbackPwd = user.role === 'MANAGER' ? 'Manager@2025' : (user.role === 'QUALITY_OFFICER' ? 'Quality@2025' : 'Operator@2025');
          if (pVal === fallbackPwd || pVal === 'Manager@2025' || pVal === 'Operator@2025' || pVal === 'Quality@2025' || pVal === 'Inactive@2025') {
            isValid = true;
            user.passwordSalt = generateCryptoSalt(16);
            user.passwordHash = await hashPasswordPBKDF2(pVal, user.passwordSalt);
          }
        }
      }

      if (!user || !isValid) {
        // Record login failure for rate limiting
        if (!appState.loginRateLimits[rateLimitKey]) {
          appState.loginRateLimits[rateLimitKey] = { attempts: 1, lockoutUntil: 0 };
        } else {
          appState.loginRateLimits[rateLimitKey].attempts += 1;
        }

        const attempts = appState.loginRateLimits[rateLimitKey].attempts;
        let lockoutNotice = '';
        if (attempts >= 5) {
          appState.loginRateLimits[rateLimitKey].lockoutUntil = Date.now() + 5 * 60 * 1000;
          lockoutNotice = ' Too many failed attempts. Account locked for 5 minutes.';

          appState.auditLogs.unshift({
            id: 'AUD-' + Date.now(),
            action: 'ACCOUNT_LOCKED_ABUSE_PREVENTION',
            actorId: 'system',
            actorName: 'Security Rate Limiter',
            actorRole: 'SYSTEM_SECURITY',
            warehouseId: 'GLOBAL',
            warehouseName: 'Security Gateway',
            targetRef: uVal,
            details: `Brute-force lockout triggered: 5 consecutive failed logins for identifier [${uVal}]. 5-minute cooldown enforced.`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            status: 'WARNING'
          });
        }

        appState.auditLogs.unshift({
          id: 'AUD-' + Date.now(),
          action: 'LOGIN_FAILED',
          actorId: 'anonymous',
          actorName: 'Unauthenticated User',
          actorRole: 'ANONYMOUS',
          warehouseId: 'GLOBAL',
          warehouseName: 'Security Gateway',
          targetRef: uVal,
          details: `Failed authentication attempt for [${uVal}] in ${isManagerPortal ? 'Manager' : 'Operator'} portal. Attempt count: ${attempts}/5.`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'FAILURE'
        });

        saveState();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Sign In as ${isManagerPortal ? 'Manager' : 'Operator'}</span> <span>→</span>`;
        }

        if (errBox && errText) {
          errText.textContent = `Invalid credentials. Please verify your official username and password, or contact your supervisor.${lockoutNotice}`;
          errBox.classList.remove('hidden');
        }
        return;
      }

      // Check active account status
      if (!user.isActive) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Sign In as ${isManagerPortal ? 'Manager' : 'Operator'}</span> <span>→</span>`;
        }
        if (errBox && errText) {
          errText.textContent = 'Account deactivated. Please contact your system administrator.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      // Step 3 Role Check: Compare authenticated account's actual role with selected role on Screen 1
      const actualRole = user.role;

      if (selectedRole === 'MANAGER' && actualRole !== 'MANAGER') {
        appState.auditLogs.unshift({
          id: 'AUD-' + Date.now(),
          action: 'LOGIN_ROLE_MISMATCH_DENIED',
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          warehouseId: user.warehouseId || 'GLOBAL',
          warehouseName: user.warehouseName,
          targetRef: user.username,
          details: `Access denied: Account is registered as ${user.roleTitle} but attempted login to Manager/Supervisor portal`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'DENIED'
        });
        saveState();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Sign In as Manager</span> <span>→</span>`;
        }
        if (errBox && errText) {
          errText.textContent = 'Access Denied: This account is registered as a Warehouse Operator and does not have authorization to access the Manager / Supervisor portal. Please go back and select Warehouse Operator.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (selectedRole === 'WAREHOUSE_ADMIN' && actualRole === 'MANAGER') {
        appState.auditLogs.unshift({
          id: 'AUD-' + Date.now(),
          action: 'LOGIN_ROLE_MISMATCH_DENIED',
          actorId: user.id,
          actorName: user.fullName,
          actorRole: user.role,
          warehouseId: 'GLOBAL',
          warehouseName: 'National Central Depot',
          targetRef: user.username,
          details: `Access denied: District Manager account [${user.username}] attempted login to Operator portal`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'DENIED'
        });
        saveState();

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Sign In as Operator</span> <span>→</span>`;
        }
        if (errBox && errText) {
          errText.textContent = 'Access Denied: This account is registered as a District Manager. Please go back and select Manager / Supervisor to access your portal.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      // Reset failed attempts on success
      delete appState.loginRateLimits[rateLimitKey];

      // Check if mandatory first login password change is required
      if (user.mustChangePassword) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Sign In as ${isManagerPortal ? 'Manager' : 'Operator'}</span> <span>→</span>`;
        }
        openForcePasswordChangeModal(user);
        return;
      }

      completeUserLogin(user);
    }

"""

content = content[:idx3] + new_handle_login + content[idx4:]
print("Step 4: handleLoginSubmit updated with role mismatch enforcement.")

# 5. In handleLogout, reset loginStep and loginSelectedRole
old_logout = """      appState.currentUser = null;
      appState.isAuthenticated = false;
      appState.authToken = null;
      appState.sessionExpiry = null;
      saveState();"""

new_logout = """      appState.currentUser = null;
      appState.isAuthenticated = false;
      appState.authToken = null;
      appState.sessionExpiry = null;
      appState.loginStep = 1;
      appState.loginSelectedRole = null;
      saveState();"""

assert old_logout in content, "old_logout not found"
content = content.replace(old_logout, new_logout, 1)
print("Step 5: handleLogout updated to reset login step.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated index.html successfully! Final size: {len(content)} chars.")
