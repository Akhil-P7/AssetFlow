import { Bell, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="ghost" icon={<CheckCircle2 className="w-4 h-4" />}>
            Mark all as read
          </Button>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-fade-in shadow-sm">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${i === 1 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
              <div className="flex gap-4">
                <div className={`p-2 rounded-full h-fit ${i === 1 ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm ${i === 1 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                    Maintenance Request Updated
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Your request for MacBook Pro (SN-123) has been approved and assigned to John Doe.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    2 hours ago
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
