import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/LoadingSpinner';
import { BarChart3 } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate standard reports and view asset metrics."
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 min-h-[400px] flex items-center justify-center animate-fade-in shadow-sm">
        <EmptyState
          title="Reporting Engine"
          description="Advanced reporting and data export (CSV/PDF) features are being integrated. Check back in a future update."
          icon={<BarChart3 className="w-8 h-8 text-slate-400" />}
        />
      </div>
    </div>
  );
}
