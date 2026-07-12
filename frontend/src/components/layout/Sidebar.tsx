import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Package, ArrowLeftRight,
  Calendar, Wrench, ClipboardCheck, BarChart3, Bell,
  ChevronLeft, LogOut, Sun, Moon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Role } from '@/types';
import { RoleBadge } from '@/components/ui/Badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Organization', path: '/org', icon: Building2, roles: [Role.ADMIN] },
  { label: 'Assets', path: '/assets', icon: Package },
  { label: 'Allocations', path: '/allocations', icon: ArrowLeftRight },
  { label: 'Bookings', path: '/bookings', icon: Calendar },
  { label: 'Maintenance', path: '/maintenance', icon: Wrench },
  { label: 'Audit', path: '/audits', icon: ClipboardCheck, roles: [Role.ADMIN, Role.ASSET_MANAGER] },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: [Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD] },
  { label: 'Notifications', path: '/notifications', icon: Bell },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 z-30 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 h-screen z-40
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
          flex flex-col
          transition-all duration-300 ease-in-out
          
          /* Desktop behavior */
          md:translate-x-0
          ${sidebarCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'}

          /* Mobile behavior */
          w-[260px]
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
                <Package className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">AssetFlow</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`
              p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer
              ${sidebarCollapsed ? 'mx-auto rotate-180' : ''}
            `}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md
                  text-sm font-medium transition-colors duration-200
                  group relative
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              {!sidebarCollapsed && (
                <span className="animate-fade-in">{item.label}</span>
              )}
              {item.label === 'Notifications' && !sidebarCollapsed && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  4
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme Toggle Button */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-md
            text-sm font-medium text-slate-600 dark:text-slate-400
            hover:text-slate-900 dark:hover:text-slate-200
            hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer
            ${sidebarCollapsed ? 'justify-center' : ''}
          `}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5 shrink-0 text-amber-500" />
              {!sidebarCollapsed && <span className="animate-fade-in text-slate-600 dark:text-slate-400">Light Mode</span>}
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 shrink-0 text-indigo-500" />
              {!sidebarCollapsed && <span className="animate-fade-in text-slate-600 dark:text-slate-400">Dark Mode</span>}
            </>
          )}
        </button>
      </div>

      {user && (
        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`flex ${sidebarCollapsed ? 'flex-col items-center justify-center gap-2' : 'items-center gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 text-sm font-semibold shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                <RoleBadge role={user.role} />
              </div>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
