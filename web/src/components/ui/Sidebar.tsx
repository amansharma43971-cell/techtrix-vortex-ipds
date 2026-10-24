import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowDownToLine, 
  Boxes, 
  QrCode, 
  ShieldCheck, 
  Layers, 
  Truck, 
  BellRing, 
  LogOut,
  ClipboardList,
  Navigation,
  History
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, alerts, currentUser, logout } = useStore();

  const unreadAlertsCount = alerts.filter(a => !a.isRead).length;

  const role = currentUser?.role || 'MANAGER';

  let navGroups: NavGroup[] = [];

  if (role === 'MANAGER') {
    navGroups = [
      {
        title: 'Overview',
        items: [
          { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/alerts', label: 'Alerts', icon: BellRing, badge: unreadAlertsCount },
        ],
      },
      {
        title: 'Stock Management',
        items: [
          { to: '/stock-allocation', label: 'Receive Stock', icon: ArrowDownToLine },
          { to: '/inventory', label: 'Inventory & Batches', icon: Boxes },
          { to: '/quality', label: 'Quality Inspection', icon: ShieldCheck },
        ],
      },
      {
        title: 'Operations',
        items: [
          { to: '/fifo', label: 'FIFO Allocation', icon: Layers },
          { to: '/dispatch', label: 'Ready to Dispatch', icon: Truck },
          { to: '/out-delivery', label: 'Out for Delivery', icon: Navigation },
          { to: '/delivery-history', label: 'Delivery History', icon: History },
        ],
      },
    ];
  } else {
    // Warehouse Admin / Operator Task-Focused Navigation
    navGroups = [
      {
        title: 'Overview',
        items: [
          { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/alerts', label: 'Alerts', icon: BellRing, badge: unreadAlertsCount },
        ],
      },
      {
        title: 'Stock Management',
        items: [
          { to: '/stock-allocation', label: 'Receive Stock', icon: ArrowDownToLine },
          { to: '/inventory', label: 'Batch Inventory', icon: Boxes },
          { to: '/quality', label: 'Quality Inspection', icon: ShieldCheck },
        ],
      },
      {
        title: 'Operations',
        items: [
          { to: '/fifo', label: 'FIFO Allocation', icon: ClipboardList },
          { to: '/dispatch', label: 'Ready to Dispatch', icon: Truck },
          { to: '/out-delivery', label: 'Out for Delivery', icon: Navigation },
          { to: '/delivery-history', label: 'Delivery History', icon: History },
        ],
      },
    ];
  }

  return (
    <aside
      className={`bg-gradient-to-b from-[#0B4DA8] to-[#0A2F6B] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none z-40 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      {/* Top Header Branding */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        {/* Wheat Stalk Gold Logo Mark */}
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-[#FBBF24]"
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
            <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
            <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
            <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
          </svg>
        </div>

        {!sidebarCollapsed && (
          <div className="overflow-hidden min-w-0">
            <h2 className="text-[18px] font-bold tracking-tight text-white leading-none">
              BhandarSetu
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-blue-200 font-medium tracking-wide">
                iPDS Smart FIFO
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                role === 'MANAGER' 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {role === 'MANAGER' ? 'SUPERVISOR' : 'OPERATOR'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation List using NavLink */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navGroups.map((group, gIdx) => (
          <div key={group.title} className="space-y-0.5">
            {sidebarCollapsed ? (
              gIdx > 0 && <div className="my-2 border-t border-white/10 mx-1" />
            ) : (
              <div className="text-[10px] font-bold text-blue-200/60 uppercase tracking-wider px-3 pt-2.5 pb-1">
                {group.title}
              </div>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `w-full h-[38px] px-3 rounded-lg flex items-center justify-between transition-all text-[13px] font-medium cursor-pointer ${
                      isActive
                        ? 'bg-[#1E63C4] text-white font-semibold shadow-xs'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Warehouse Scoping Banner */}
      {!sidebarCollapsed && currentUser && (
        <div className="px-3 py-2 border-t border-white/10 shrink-0">
          <div className="p-2.5 rounded-lg bg-black/20 border border-white/10 text-xs">
            <span className="text-[10px] text-blue-200 block font-semibold uppercase tracking-wider">
              {role === 'MANAGER' ? 'State / Central Scope' : 'Assigned Godown'}
            </span>
            <span className="text-white font-medium text-[11px] truncate block mt-0.5" title={currentUser.warehouseName}>
              {currentUser.warehouseName}
            </span>
          </div>
        </div>
      )}

      {/* Bottom User / Logout */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          onClick={logout}
          className="w-full h-[38px] px-3 rounded-lg flex items-center gap-3 text-blue-200 hover:bg-rose-500/20 hover:text-rose-200 transition-all text-[13px] cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>Logout Session</span>}
        </button>
      </div>
    </aside>
  );
};
