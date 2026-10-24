import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff, Shield, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<'MANAGER' | 'WAREHOUSE_ADMIN' | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleRoleSelect = (role: 'MANAGER' | 'WAREHOUSE_ADMIN') => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleContinueToLogin = () => {
    if (!selectedRole) return;
    setStep(2);
    setErrorMessage(null);
  };

  const handleBackToRoleSelection = () => {
    setStep(1);
    setErrorMessage(null);
    setUsername('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = login(username, password, selectedRole || undefined);
      setIsLoading(false);

      if (result.success && result.user) {
        navigate('/');
      } else {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your official username and password, or contact your supervisor.');
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2545] via-[#0B4DA8] to-[#134E96] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 transition-all duration-200">
        {/* Top Emblem Header */}
        <div className="bg-[#0A2F6B] text-white p-6 text-center border-b border-white/10 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 mb-3 shadow-md">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-[#FBBF24]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 22 16 8" />
              <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
              <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
              <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
              <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">BhandarSetu Portal</h1>
          <p className="text-xs text-blue-200 mt-0.5">
            Smart Commodity Inventory &amp; FIFO Management in iPDS
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-blue-100 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {step === 1
                ? 'Two-Level Role-Based Access Control'
                : selectedRole === 'MANAGER'
                ? 'Manager / Supervisor Portal'
                : 'Warehouse Operator Portal'}
            </span>
          </div>
        </div>

        {/* SCREEN 1: SELECT YOUR ROLE */}
        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome to BhandarSetu
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Select your role to continue.
              </p>
            </div>

            {/* Selectable Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Manager Card */}
              <button
                type="button"
                onClick={() => handleRoleSelect('MANAGER')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                  selectedRole === 'MANAGER'
                    ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-[#0B4DA8]/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === 'MANAGER'
                        ? 'bg-[#0B4DA8] text-white shadow-xs'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-amber-100'
                    }`}
                  >
                    <Shield className="w-6 h-6" />
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedRole === 'MANAGER'
                        ? 'border-[#0B4DA8] bg-[#0B4DA8] text-white'
                        : 'border-slate-300 bg-transparent'
                    }`}
                  >
                    {selectedRole === 'MANAGER' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Manager / Supervisor</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Oversight
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Manage warehouse operations, monitor inventory, review reports, and manage authorized users.
                  </p>
                </div>
              </button>

              {/* Operator Card */}
              <button
                type="button"
                onClick={() => handleRoleSelect('WAREHOUSE_ADMIN')}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                  selectedRole === 'WAREHOUSE_ADMIN'
                    ? 'border-[#0B4DA8] bg-blue-50/70 ring-2 ring-[#0B4DA8]/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === 'WAREHOUSE_ADMIN'
                        ? 'bg-[#0B4DA8] text-white shadow-xs'
                        : 'bg-blue-50 text-[#0B4DA8] border border-blue-200 group-hover:bg-blue-100'
                    }`}
                  >
                    <Package className="w-6 h-6" />
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedRole === 'WAREHOUSE_ADMIN'
                        ? 'border-[#0B4DA8] bg-[#0B4DA8] text-white'
                        : 'border-slate-300 bg-transparent'
                    }`}
                  >
                    {selectedRole === 'WAREHOUSE_ADMIN' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Warehouse Operator</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Operations
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Receive stock, view assigned batches, request FIFO allocation, and manage permitted dispatch tasks.
                  </p>
                </div>
              </button>
            </div>

            {/* Continue Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!selectedRole}
                onClick={handleContinueToLogin}
                className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                  selectedRole
                    ? 'bg-[#0B4DA8] hover:bg-[#1E63C4] text-white cursor-pointer hover:shadow-lg'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                }`}
              >
                <span>Continue to Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2.5">
                {selectedRole
                  ? `Selected: ${selectedRole === 'MANAGER' ? 'Manager / Supervisor' : 'Warehouse Operator'}`
                  : 'Select your official role above to continue'}
              </p>
            </div>
          </div>
        )}

        {/* SCREEN 2: LOGIN FORM */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            {/* Back button to change role */}
            <div>
              <button
                type="button"
                onClick={handleBackToRoleSelection}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B4DA8] transition-colors mb-2 cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Change Role Selection</span>
              </button>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {selectedRole === 'MANAGER' ? 'Manager Login' : 'Operator Login'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your official credentials. Access clearance is verified server-side.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    selectedRole === 'MANAGER'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-blue-50 text-[#0B4DA8] border-blue-300'
                  }`}
                >
                  {selectedRole === 'MANAGER' ? '👑 Supervisor Scope' : '🚚 Operator Scope'}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Authentication Failed</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Username or Official Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`e.g. ${
                      selectedRole === 'MANAGER'
                        ? 'manager@bhandarsetu.gov.in'
                        : 'admin.nagpur@bhandarsetu.gov.in'
                    }`}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] focus:border-transparent transition-all outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotSubmitted(false);
                      setForgotIdentifier(username);
                    }}
                    className="text-[11px] font-semibold text-[#0B4DA8] hover:text-[#0A2F6B] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B4DA8] focus:border-transparent transition-all outline-hidden font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-[#0B4DA8] focus:ring-[#0B4DA8]"
                  />
                  <span>Remember on this device</span>
                </label>
                <span className="text-slate-400">8h session token</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0B4DA8] hover:bg-[#1E63C4] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating Credentials...</span>
                ) : (
                  <>
                    <span>Sign In as {selectedRole === 'MANAGER' ? 'Manager' : 'Operator'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Integrated Public Distribution System (iPDS) · Ministry of Consumer Affairs, Food &amp; Public Distribution
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Official Password Assistance</h3>
            {forgotSubmitted ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
                <p className="font-semibold">Reset request recorded.</p>
                <p>
                  Official recovery instructions or password resets must be provisioned by your District Manager /
                  System Administrator via the Manager User Console.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-2 py-2 rounded-lg bg-emerald-700 text-white font-bold cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setForgotSubmitted(true);
                }}
                className="space-y-3"
              >
                <p className="text-xs text-slate-600">
                  Enter your assigned username or official government email. Operators requiring resets can also contact
                  their District Supervisor directly.
                </p>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. admin.nagpur@bhandarsetu.gov.in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B4DA8]"
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-lg bg-[#0B4DA8] text-white text-xs font-bold hover:bg-[#1E63C4] cursor-pointer"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
