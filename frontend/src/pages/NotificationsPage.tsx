import { Bell, CheckCircle2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { PageLoader, EmptyState } from '@/components/ui/LoadingSpinner';
import apiClient from '@/api/apiClient';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: loading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res: any = await apiClient.get('/notifications');
      return (res.data || res) as Notification[];
    },
  });

  const markAllAsRead = async () => {
    await apiClient.patch('/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="ghost" icon={<CheckCircle2 className="w-4 h-4" />} onClick={markAllAsRead} disabled={notifications.every(n => n.isRead)}>
            Mark all as read
          </Button>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-fade-in shadow-sm">
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" description="You're all caught up!" icon={<Bell className="w-8 h-8 text-slate-400" />} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                <div className="flex gap-4">
                  <div className={`p-2 rounded-full h-fit ${!n.isRead ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
