import { useNavigate } from 'react-router-dom';
import {
  Package, Users, Wrench, Calendar, ArrowLeftRight,
  Clock, AlertTriangle, Plus, Activity,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/auth-store';
import apiClient from '@/api/apiClient';
import type { DashboardKPIs, ActivityLogEntry } from '@/types';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const data = await apiClient.get('/dashboard/kpis');
      return data as DashboardKPIs;
    },
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery<ActivityLogEntry[]>({
    queryKey: ['activity-log'],
    queryFn: async () => {
      const res: any = await apiClient.get('/activity-log?limit=6');
      return (res.data || res) as ActivityLogEntry[];
    },
  });

  if (kpisLoading || activityLoading || !kpis) return <PageLoader />;

  const overduePercent = kpis.totalAssets > 0
    ? Math.round((kpis.overdueReturns / Math.max(kpis.upcomingReturns + kpis.overdueReturns, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? 'User'}`}
        subtitle="Here's what's happening with your assets today."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Available Assets" value={kpis.assetsAvailable} icon={Package} accentColor="#10b981" />
        <KPICard title="Allocated Assets" value={kpis.assetsAllocated} icon={Users} accentColor="#3b82f6" />
        <KPICard title="Maintenance Today" value={kpis.maintenanceToday} icon={Wrench} accentColor="#f59e0b" />
        <KPICard title="Active Bookings" value={kpis.activeBookings} icon={Calendar} accentColor="#0ea5e9" />
        <KPICard title="Pending Transfers" value={kpis.pendingTransfers} icon={ArrowLeftRight} accentColor="#8b5cf6" />
        <KPICard title="Upcoming Returns" value={kpis.upcomingReturns} icon={Clock} accentColor="#3b82f6" />
      </div>

      {kpis.overdueReturns > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Overdue Returns: <span className="text-red-500 font-bold">{kpis.overdueReturns}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${overduePercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-500">
            <span>{kpis.overdueReturns} overdue</span>
            <span>{kpis.upcomingReturns} on time</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 animate-fade-in shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h3>
          <div className="space-y-2.5">
            <Button
              variant="secondary"
              className="w-full justify-start"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/assets')}
            >
              Register Asset
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => navigate('/bookings')}
            >
              Book Resource
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              icon={<Wrench className="w-4 h-4" />}
              onClick={() => navigate('/maintenance')}
            >
              Raise Maintenance Request
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
            <button
              onClick={() => navigate('/notifications')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    <span className="font-medium">{entry.actor?.name}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">{formatAction(entry.action)}</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{timeAgo(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    TRANSFER_REQUESTED: 'requested a transfer',
    MAINTENANCE_RAISED: 'raised a maintenance request',
    MAINTENANCE_APPROVED: 'approved a maintenance request',
    BOOKING_CREATED: 'created a booking',
    ASSET_REGISTERED: 'registered a new asset',
    ALLOCATION_CREATED: 'allocated an asset',
    ROLE_PROMOTED: 'promoted an employee',
    AUDIT_CYCLE_CREATED: 'created an audit cycle',
  };
  return map[action] || action.toLowerCase().replace(/_/g, ' ');
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
