import { Plus, ClipboardCheck, ArrowRight, FileCheck, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { AuditCycleStatusBadge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/LoadingSpinner';
import apiClient from '@/api/apiClient';
import type { AuditCycle } from '@/types';

export function AuditsPage() {
  const { data: cycles = [], isLoading: loading } = useQuery<AuditCycle[]>({
    queryKey: ['audits'],
    queryFn: async () => (await apiClient.get('/audits')) as AuditCycle[],
  });

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audits & Compliance"
        subtitle="Manage regular physical audits of organizational assets."
        actions={
          <Button icon={<Plus className="w-4 h-4" />}>
            New Audit Cycle
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        <div className="md:col-span-2 space-y-4">
          {cycles.length === 0 ? (
            <EmptyState title="No audit cycles" description="Start a new physical audit cycle to verify asset presence." icon={<ClipboardCheck className="w-8 h-8 text-slate-400" />} />
          ) : (
            cycles.map(cycle => (
              <div key={cycle.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors group cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                      <ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{cycle.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled: {new Date(cycle.startDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <AuditCycleStatusBadge status={cycle.status} />
                </div>

                <div className="flex items-center gap-4 text-sm mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Progress</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {Math.round((cycle._count?.completedAssets || 0) / Math.max((cycle._count?.totalAssets || 1), 1) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.round((cycle._count?.completedAssets || 0) / Math.max((cycle._count?.totalAssets || 1), 1) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                    View Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Compliance Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <div className="flex-1 text-sm text-slate-600 dark:text-slate-300">Verified Assets</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">94%</div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <div className="flex-1 text-sm text-slate-600 dark:text-slate-300">Cycles Completed</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">12</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
