import { AssetStatus, AllocationStatus, TransferStatus, BookingStatus, MaintenanceStatus, MaintenancePriority, AuditResult, AuditCycleStatus, EntityStatus, Role } from '@/types';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'teal' | 'purple' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  danger: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  info: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  teal: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
  purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
};

export function Badge({ children, variant = 'neutral', className = '', dot }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-xs font-medium rounded-full border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      )}
      {children}
    </span>
  );
}


export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, { variant: BadgeVariant; label: string }> = {
    [AssetStatus.AVAILABLE]: { variant: 'success', label: 'Available' },
    [AssetStatus.ALLOCATED]: { variant: 'info', label: 'Allocated' },
    [AssetStatus.RESERVED]: { variant: 'teal', label: 'Reserved' },
    [AssetStatus.UNDER_MAINTENANCE]: { variant: 'warning', label: 'Under Maintenance' },
    [AssetStatus.LOST]: { variant: 'danger', label: 'Lost' },
    [AssetStatus.RETIRED]: { variant: 'neutral', label: 'Retired' },
    [AssetStatus.DISPOSED]: { variant: 'neutral', label: 'Disposed' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { variant: BadgeVariant; label: string }> = {
    [Role.ADMIN]: { variant: 'danger', label: 'Admin' },
    [Role.ASSET_MANAGER]: { variant: 'teal', label: 'Asset Manager' },
    [Role.DEPARTMENT_HEAD]: { variant: 'purple', label: 'Dept Head' },
    [Role.EMPLOYEE]: { variant: 'neutral', label: 'Employee' },
  };
  const { variant, label } = map[role];
  return <Badge variant={variant}>{label}</Badge>;
}

export function EntityStatusBadge({ status }: { status: EntityStatus }) {
  return status === EntityStatus.ACTIVE
    ? <Badge variant="success" dot>Active</Badge>
    : <Badge variant="danger" dot>Inactive</Badge>;
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const map: Record<MaintenanceStatus, { variant: BadgeVariant; label: string }> = {
    [MaintenanceStatus.PENDING]: { variant: 'warning', label: 'Pending' },
    [MaintenanceStatus.APPROVED]: { variant: 'info', label: 'Approved' },
    [MaintenanceStatus.REJECTED]: { variant: 'danger', label: 'Rejected' },
    [MaintenanceStatus.TECHNICIAN_ASSIGNED]: { variant: 'teal', label: 'Tech Assigned' },
    [MaintenanceStatus.IN_PROGRESS]: { variant: 'purple', label: 'In Progress' },
    [MaintenanceStatus.RESOLVED]: { variant: 'success', label: 'Resolved' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const map: Record<MaintenancePriority, { variant: BadgeVariant; label: string }> = {
    [MaintenancePriority.LOW]: { variant: 'neutral', label: 'Low' },
    [MaintenancePriority.MEDIUM]: { variant: 'info', label: 'Medium' },
    [MaintenancePriority.HIGH]: { variant: 'warning', label: 'High' },
    [MaintenancePriority.CRITICAL]: { variant: 'danger', label: 'Critical' },
  };
  const { variant, label } = map[priority];
  return <Badge variant={variant}>{label}</Badge>;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { variant: BadgeVariant; label: string }> = {
    [BookingStatus.UPCOMING]: { variant: 'info', label: 'Upcoming' },
    [BookingStatus.ONGOING]: { variant: 'success', label: 'Ongoing' },
    [BookingStatus.COMPLETED]: { variant: 'neutral', label: 'Completed' },
    [BookingStatus.CANCELLED]: { variant: 'danger', label: 'Cancelled' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const map: Record<TransferStatus, { variant: BadgeVariant; label: string }> = {
    [TransferStatus.REQUESTED]: { variant: 'warning', label: 'Requested' },
    [TransferStatus.APPROVED]: { variant: 'success', label: 'Approved' },
    [TransferStatus.REJECTED]: { variant: 'danger', label: 'Rejected' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function AuditResultBadge({ result }: { result: AuditResult }) {
  const map: Record<AuditResult, { variant: BadgeVariant; label: string }> = {
    [AuditResult.PENDING]: { variant: 'neutral', label: 'Pending' },
    [AuditResult.VERIFIED]: { variant: 'success', label: 'Verified' },
    [AuditResult.MISSING]: { variant: 'danger', label: 'Missing' },
    [AuditResult.DAMAGED]: { variant: 'warning', label: 'Damaged' },
  };
  const { variant, label } = map[result];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function AuditCycleStatusBadge({ status }: { status: AuditCycleStatus }) {
  return status === AuditCycleStatus.OPEN
    ? <Badge variant="success" dot>Open</Badge>
    : <Badge variant="neutral" dot>Closed</Badge>;
}
