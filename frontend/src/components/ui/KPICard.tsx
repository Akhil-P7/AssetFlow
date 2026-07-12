import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  accentColor: string;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
}

export function KPICard({ title, value, icon: Icon, accentColor, subtitle, trend }: KPICardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm transition-all hover:shadow-md group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-slate-400 dark:text-slate-500">vs last month</span>
            </div>
          )}
        </div>
        <div
          className="p-3 rounded-md transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
