import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  ChevronDown, 
  ChevronRight,
  User, 
  LogOut
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const routeMetaMap: Record<string, { group: string; title: string }> = {
  '/stock-allocation': { group: 'Godown Operations', title: 'Stock Inward & Allocation' },
  '/inventory': { group: 'Godown Operations', title: 'Commodity Inventory & Batches' },
  '/scanner': { group: 'Tools', title: 'QR / Barcode Scanner' },
  '/quality': { group: 'Laboratory Operations', title: 'Quality Inspection & Assaying' },
  '/fifo': { group: 'Dispatch Logistics', title: 'Smart FIFO Allocation' },
  '/dispatch': { group: 'Dispatch Logistics', title: 'Dispatch Management' },
  '/out-delivery': { group: 'Dispatch Logistics', title: 'Out for Delivery & Active Fleet' },
  '/delivery-history': { group: 'Archives', title: 'Delivery History & POD Archives' },
  '/alerts': { group: 'Surveillance', title: 'Godown Alerts' },
  '/reports': { group: 'Executive Oversight', title: 'Reports & Analytics' },
  '/users': { group: 'Administration', title: 'User Management' },
  '/audit': { group: 'Administration', title: 'Regulatory Audit Trail' },
  '/settings': { group: 'Preferences', title: 'Settings & System Configuration' }
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { 
    user, 
    currentUser, 
    alerts, 
    toggleSidebar, 
    markAlertAsRead, 
    markAllAlertsAsRead, 
    setActiveRoute,
    switchPersona,
    logout
  } = useStore();
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const alertsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const unreadCount = unreadAlerts.length;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlertsDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = currentUser?.fullName || user.name;
  const displayRole = currentUser?.roleTitle || user.role;
  const isManager = currentUser?.role === 'MANAGER';
  const isDashboard = location.pathname === '/' || location.pathname === '';
  const currentMeta = routeMetaMap[location.pathname];

  return (
    <header className="h-[76px] bg-white border-b border-[#E3E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Hamburger & Dynamic Page Context / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2 sm:mr-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 truncate">
          {isDashboard ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight truncate">
                BhandarSetu iPDS
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="hidden sm:inline text-xs font-semibold text-slate-500 truncate">
                Smart Commodity &amp; FIFO Management
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs truncate">
              <Link to="/" className="text-slate-400 hover:text-[#0B4DA8] font-medium transition-colors shrink-0">
                BhandarSetu
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-400 hidden sm:inline truncate">
                {currentMeta?.group || 'Operations'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
              <span className="text-slate-900 font-bold truncate">
                {currentMeta?.title || 'Details'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Role Switcher, Alerts Bell & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick 1-Click Role Switcher Pill */}
        <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
          <button
            onClick={() => switchPersona('MANAGER')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isManager ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👑 <span className="hidden xs:inline">Supervisor</span>
          </button>
          <button
            onClick={() => switchPersona('WAREHOUSE_ADMIN')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              !isManager ? 'bg-[#0B4DA8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚚 <span className="hidden xs:inline">Operator</span>
          </button>
        </div>

        {/* Network Status Chip */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Alerts Bell */}
        <div className="relative shrink-0" ref={alertsRef}>
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="p-2 sm:p-2.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors cursor-pointer"
            aria-label="View Important Alerts"
          >
            <Bell className="w-5 h-5 text-[#475569]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#EF4444] text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown */}
          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E3E8F0] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 border-b border-[#E3E8F0] bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#0F172A] uppercase tracking-wider">
                    Notifications &amp; Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAlertsAsRead}
                    className="text-[11px] text-[#1D6FE8] hover:underline font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No active alerts</div>
                ) : (
                  alerts.slice(0, 6).map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => markAlertAsRead(alt.id)}
                      className={`p-3 text-xs flex items-start gap-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !alt.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          alt.type === 'amber'
                            ? 'bg-[#F59E0B]'
                            : alt.type === 'red'
                            ? 'bg-[#EF4444]'
                            : 'bg-[#3B82F6]'
                        }`}
                      />
                      <div className="flex-1">
                        <p className={`text-[12px] leading-snug ${!alt.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {alt.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{alt.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-[#E3E8F0] bg-slate-50 text-center">
                <Link
                  to="/alerts"
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-xs font-semibold text-[#1D6FE8] hover:underline"
                >
                  View All Alerts Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative shrink-0" ref={userRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#0B4DA8] to-[#1E63C4] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0">
              {displayName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <span className="text-[13px] font-semibold text-[#0F172A] hidden md:block leading-none truncate max-w-[130px]">
              {displayName}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#E3E8F0] py-1.5 z-50 animate-in fade-in duration-150 text-xs">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="font-bold text-slate-900 text-sm">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || user.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isManager ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                  }`}>
                    {displayRole}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Session
                  </span>
                </div>
              </div>

              {/* Warehouse Scope info */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Authorized Scope</span>
                <span className="text-slate-800 text-[11px] font-medium block mt-0.5 truncate">
                  {currentUser?.warehouseName || user.location}
                </span>
              </div>

              <Link
                to="/settings"
                onClick={() => setShowUserDropdown(false)}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Settings &amp; System Config</span>
              </Link>

              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 border-t border-slate-100 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
