import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/stores/ui-store';
import { Menu, Package } from 'lucide-react';

export function AppShell() {
  const { sidebarCollapsed, toggleMobileMenu } = useUIStore();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
            <Package className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-md font-bold text-slate-900 dark:text-slate-100 tracking-tight">AssetFlow</span>
        </div>
        
        <button
          onClick={toggleMobileMenu}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle mobile menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <main
        className={`
          min-h-screen transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}
          ml-0
        `}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
