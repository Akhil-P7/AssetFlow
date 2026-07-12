export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  ASSET_MANAGER = 'ASSET_MANAGER',
  ADMIN = 'ADMIN',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ALLOCATED = 'ALLOCATED',
  RESERVED = 'RESERVED',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  LOST = 'LOST',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
}

export enum AllocationStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum BookingStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  TECHNICIAN_ASSIGNED = 'TECHNICIAN_ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AuditCycleStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum AuditResult {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  MISSING = 'MISSING',
  DAMAGED = 'DAMAGED',
}

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  department?: Department;
  role: Role;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  parentDepartment?: Department;
  departmentHeadId: string | null;
  departmentHead?: Employee;
  status: EntityStatus;
  createdAt: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  customFields: CustomField[];
  status: EntityStatus;
  createdAt: string;
}

export interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId: string;
  category?: AssetCategory;
  serialNumber: string | null;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  condition: string | null;
  location: string | null;
  departmentId: string | null;
  department?: Department;
  isBookable: boolean;
  status: AssetStatus;
  qrCodeUrl: string | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  id: string;
  assetId: string;
  asset?: Asset;
  employeeId: string | null;
  employee?: Employee;
  departmentId: string | null;
  department?: Department;
  allocatedAt: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  conditionNote: string | null;
  status: AllocationStatus;
}

export interface TransferRequest {
  id: string;
  allocationId: string;
  allocation?: Allocation;
  requestedBy: string;
  requestedByEmployee?: Employee;
  approvedBy: string | null;
  approvedByEmployee?: Employee;
  fromHolder: string;
  toHolder: string;
  toEmployeeId: string | null;
  toDepartmentId: string | null;
  reason: string | null;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceAssetId?: string; // alias for backward compat
  resource?: Asset;
  bookedBy: string;
  bookedByEmployee?: Employee;
  bookedForDepartmentId?: string | null;
  timeRange: string; // PostgreSQL tstzrange string
  startTime?: string;
  endTime?: string;
  status: BookingStatus;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  asset?: Asset;
  raisedBy: string;
  raisedByEmployee?: Employee;
  issueDescription: string;
  priority: MaintenancePriority;
  photoUrl: string | null;
  status: MaintenanceStatus;
  approvedBy: string | null;
  technicianName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditCycle {
  id: string;
  name: string;
  _count: {
    totalAssets: number;
    completedAssets: number;
  };
  scopeDepartmentId: string | null;
  scopeDepartment?: Department;
  scopeLocation: string | null;
  startDate: string;
  endDate: string;
  status: AuditCycleStatus;
  auditors: Employee[];
  progress: {
    total: number;
    verified: number;
    missing: number;
    damaged: number;
    pending: number;
  };
  createdAt: string;
}

export interface AuditResultEntry {
  id: string;
  auditCycleId: string;
  assetId: string;
  asset?: Asset;
  result: AuditResult;
  notes: string | null;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actor?: Employee;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- Dashboard ---

export interface DashboardKPIs {
  assetsAvailable: number;
  assetsAllocated: number;
  maintenanceToday: number;
  activeBookings: number;
  pendingTransfers: number;
  upcomingReturns: number;
  overdueReturns: number;
  totalAssets: number;
}

// --- Reports ---

export interface UtilizationData {
  department: string;
  allocated: number;
  available: number;
  utilization: number;
}

export interface MaintenanceFrequencyData {
  month: string;
  count: number;
  resolved: number;
}

export interface TopAsset {
  id: string;
  assetTag: string;
  name: string;
  usageCount: number;
  category: string;
}

// --- API Envelope ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Auth ---

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Employee;
}
