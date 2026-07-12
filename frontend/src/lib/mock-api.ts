import {
  Role, AssetStatus, AllocationStatus, TransferStatus,
  BookingStatus, MaintenanceStatus, MaintenancePriority,
  AuditCycleStatus, AuditResult, EntityStatus,
  type Employee, type Department, type AssetCategory, type Asset,
  type Allocation, type TransferRequest, type Booking,
  type MaintenanceRequest, type AuditCycle, type AuditResultEntry,
  type Notification, type ActivityLogEntry, type DashboardKPIs,
  type UtilizationData, type MaintenanceFrequencyData, type TopAsset,
  type LoginResponse,
} from '@/types';

const uuid = () => crypto.randomUUID();
const ago = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};
const future = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export const DEMO_USERS: Record<string, Employee & { password: string }> = {
  admin: {
    id: 'u-001',
    name: 'Arjun Mehta',
    email: 'admin@assetflow.io',
    password: 'password',
    departmentId: 'd-001',
    role: Role.ADMIN,
    status: EntityStatus.ACTIVE,
    createdAt: ago(90),
    updatedAt: ago(1),
  },
  manager: {
    id: 'u-002',
    name: 'Priya Sharma',
    email: 'manager@assetflow.io',
    password: 'password',
    departmentId: 'd-002',
    role: Role.ASSET_MANAGER,
    status: EntityStatus.ACTIVE,
    createdAt: ago(85),
    updatedAt: ago(2),
  },
  head: {
    id: 'u-003',
    name: 'Rahul Gupta',
    email: 'head@assetflow.io',
    password: 'password',
    departmentId: 'd-002',
    role: Role.DEPARTMENT_HEAD,
    status: EntityStatus.ACTIVE,
    createdAt: ago(80),
    updatedAt: ago(3),
  },
  employee: {
    id: 'u-004',
    name: 'Neha Patel',
    email: 'employee@assetflow.io',
    password: 'password',
    departmentId: 'd-003',
    role: Role.EMPLOYEE,
    status: EntityStatus.ACTIVE,
    createdAt: ago(60),
    updatedAt: ago(5),
  },
};

const extraEmployees: Employee[] = [
  { id: 'u-005', name: 'Vikram Singh', email: 'vikram@assetflow.io', departmentId: 'd-002', role: Role.EMPLOYEE, status: EntityStatus.ACTIVE, createdAt: ago(50), updatedAt: ago(4) },
  { id: 'u-006', name: 'Ananya Iyer', email: 'ananya@assetflow.io', departmentId: 'd-003', role: Role.EMPLOYEE, status: EntityStatus.ACTIVE, createdAt: ago(45), updatedAt: ago(3) },
  { id: 'u-007', name: 'Siddharth Rao', email: 'siddharth@assetflow.io', departmentId: 'd-001', role: Role.EMPLOYEE, status: EntityStatus.ACTIVE, createdAt: ago(40), updatedAt: ago(2) },
  { id: 'u-008', name: 'Kavya Menon', email: 'kavya@assetflow.io', departmentId: 'd-004', role: Role.EMPLOYEE, status: EntityStatus.INACTIVE, createdAt: ago(70), updatedAt: ago(10) },
];

export const allEmployees: Employee[] = [
  ...Object.values(DEMO_USERS).map(({ password: _p, ...e }) => e),
  ...extraEmployees,
];

export const departments: Department[] = [
  { id: 'd-001', name: 'Administration', parentDepartmentId: null, departmentHeadId: 'u-001', status: EntityStatus.ACTIVE, createdAt: ago(100) },
  { id: 'd-002', name: 'Engineering', parentDepartmentId: null, departmentHeadId: 'u-003', status: EntityStatus.ACTIVE, createdAt: ago(100) },
  { id: 'd-003', name: 'Marketing', parentDepartmentId: null, departmentHeadId: null, status: EntityStatus.ACTIVE, createdAt: ago(95) },
  { id: 'd-004', name: 'Human Resources', parentDepartmentId: 'd-001', departmentHeadId: null, status: EntityStatus.ACTIVE, createdAt: ago(90) },
  { id: 'd-005', name: 'Frontend Team', parentDepartmentId: 'd-002', departmentHeadId: null, status: EntityStatus.ACTIVE, createdAt: ago(85) },
  { id: 'd-006', name: 'Backend Team', parentDepartmentId: 'd-002', departmentHeadId: null, status: EntityStatus.INACTIVE, createdAt: ago(85) },
];

export const categories: AssetCategory[] = [
  { id: 'c-001', name: 'Laptops', customFields: [{ key: 'ram', label: 'RAM (GB)', type: 'number' }, { key: 'warranty', label: 'Warranty Expiry', type: 'date' }], status: EntityStatus.ACTIVE, createdAt: ago(100) },
  { id: 'c-002', name: 'Monitors', customFields: [{ key: 'size', label: 'Screen Size (inches)', type: 'number' }], status: EntityStatus.ACTIVE, createdAt: ago(100) },
  { id: 'c-003', name: 'Conference Rooms', customFields: [{ key: 'capacity', label: 'Capacity', type: 'number' }], status: EntityStatus.ACTIVE, createdAt: ago(100) },
  { id: 'c-004', name: 'Vehicles', customFields: [{ key: 'plate', label: 'License Plate', type: 'text' }], status: EntityStatus.ACTIVE, createdAt: ago(95) },
  { id: 'c-005', name: 'Furniture', customFields: [], status: EntityStatus.ACTIVE, createdAt: ago(90) },
  { id: 'c-006', name: 'Printers', customFields: [{ key: 'color', label: 'Color Printing', type: 'boolean' }], status: EntityStatus.INACTIVE, createdAt: ago(88) },
];

export const assets: Asset[] = [
  { id: 'a-001', assetTag: 'AF-0001', name: 'MacBook Pro 16"', categoryId: 'c-001', category: categories[0], serialNumber: 'SN-MBP-2024-001', acquisitionDate: ago(60), acquisitionCost: 2499, condition: 'Excellent', location: 'Floor 3, Desk 12', departmentId: 'd-002', isBookable: false, status: AssetStatus.ALLOCATED, qrCodeUrl: null, photoUrls: [], createdAt: ago(60), updatedAt: ago(2) },
  { id: 'a-002', assetTag: 'AF-0002', name: 'Dell XPS 15', categoryId: 'c-001', category: categories[0], serialNumber: 'SN-DXPS-2024-002', acquisitionDate: ago(55), acquisitionCost: 1899, condition: 'Good', location: 'Floor 2, Desk 8', departmentId: 'd-003', isBookable: false, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(55), updatedAt: ago(5) },
  { id: 'a-003', assetTag: 'AF-0003', name: 'LG UltraWide 34"', categoryId: 'c-002', category: categories[1], serialNumber: 'SN-LGM-2024-003', acquisitionDate: ago(50), acquisitionCost: 799, condition: 'Excellent', location: 'Floor 3, Desk 12', departmentId: 'd-002', isBookable: false, status: AssetStatus.ALLOCATED, qrCodeUrl: null, photoUrls: [], createdAt: ago(50), updatedAt: ago(3) },
  { id: 'a-004', assetTag: 'AF-0004', name: 'Conference Room Alpha', categoryId: 'c-003', category: categories[2], serialNumber: null, acquisitionDate: ago(200), acquisitionCost: 15000, condition: 'Good', location: 'Floor 2, Room 201', departmentId: null, isBookable: true, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: 'a-005', assetTag: 'AF-0005', name: 'Conference Room Beta', categoryId: 'c-003', category: categories[2], serialNumber: null, acquisitionDate: ago(200), acquisitionCost: 12000, condition: 'Good', location: 'Floor 3, Room 301', departmentId: null, isBookable: true, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(200), updatedAt: ago(1) },
  { id: 'a-006', assetTag: 'AF-0006', name: 'Toyota Innova', categoryId: 'c-004', category: categories[3], serialNumber: 'VIN-TI-2023-006', acquisitionDate: ago(365), acquisitionCost: 25000, condition: 'Fair', location: 'Basement Parking B2', departmentId: 'd-001', isBookable: true, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(365), updatedAt: ago(10) },
  { id: 'a-007', assetTag: 'AF-0007', name: 'Standing Desk - Ergonomic', categoryId: 'c-005', category: categories[4], serialNumber: 'SN-SD-2024-007', acquisitionDate: ago(30), acquisitionCost: 450, condition: 'Excellent', location: 'Floor 2, Desk 15', departmentId: 'd-003', isBookable: false, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(30), updatedAt: ago(1) },
  { id: 'a-008', assetTag: 'AF-0008', name: 'ThinkPad X1 Carbon', categoryId: 'c-001', category: categories[0], serialNumber: 'SN-TPX1-2024-008', acquisitionDate: ago(45), acquisitionCost: 1799, condition: 'Good', location: 'Floor 1, Desk 3', departmentId: 'd-001', isBookable: false, status: AssetStatus.UNDER_MAINTENANCE, qrCodeUrl: null, photoUrls: [], createdAt: ago(45), updatedAt: ago(1) },
  { id: 'a-009', assetTag: 'AF-0009', name: 'Samsung 27" Monitor', categoryId: 'c-002', category: categories[1], serialNumber: 'SN-SM27-2024-009', acquisitionDate: ago(40), acquisitionCost: 350, condition: 'Good', location: 'Storage Room A', departmentId: null, isBookable: false, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(40), updatedAt: ago(8) },
  { id: 'a-010', assetTag: 'AF-0010', name: 'HP LaserJet Pro', categoryId: 'c-006', category: categories[5], serialNumber: 'SN-HPLJ-2023-010', acquisitionDate: ago(400), acquisitionCost: 600, condition: 'Poor', location: 'Floor 1', departmentId: 'd-001', isBookable: false, status: AssetStatus.RETIRED, qrCodeUrl: null, photoUrls: [], createdAt: ago(400), updatedAt: ago(20) },
  { id: 'a-011', assetTag: 'AF-0011', name: 'MacBook Air M3', categoryId: 'c-001', category: categories[0], serialNumber: 'SN-MBA-2025-011', acquisitionDate: ago(15), acquisitionCost: 1299, condition: 'Excellent', location: 'Floor 3, Desk 20', departmentId: 'd-002', isBookable: false, status: AssetStatus.ALLOCATED, qrCodeUrl: null, photoUrls: [], createdAt: ago(15), updatedAt: ago(1) },
  { id: 'a-012', assetTag: 'AF-0012', name: 'Dell UltraSharp 32"', categoryId: 'c-002', category: categories[1], serialNumber: 'SN-DU32-2025-012', acquisitionDate: ago(10), acquisitionCost: 650, condition: 'Excellent', location: 'Floor 2, Desk 5', departmentId: 'd-003', isBookable: false, status: AssetStatus.AVAILABLE, qrCodeUrl: null, photoUrls: [], createdAt: ago(10), updatedAt: ago(1) },
];

export const allocations: Allocation[] = [
  { id: 'al-001', assetId: 'a-001', asset: assets[0], employeeId: 'u-004', employee: allEmployees[3], departmentId: 'd-002', allocatedAt: ago(30), expectedReturnDate: future(30), returnedAt: null, conditionNote: null, status: AllocationStatus.ACTIVE },
  { id: 'al-002', assetId: 'a-003', asset: assets[2], employeeId: 'u-005', employee: extraEmployees[0], departmentId: 'd-002', allocatedAt: ago(20), expectedReturnDate: future(10), returnedAt: null, conditionNote: null, status: AllocationStatus.ACTIVE },
  { id: 'al-003', assetId: 'a-011', asset: assets[10], employeeId: 'u-003', employee: allEmployees[2], departmentId: 'd-002', allocatedAt: ago(10), expectedReturnDate: future(50), returnedAt: null, conditionNote: null, status: AllocationStatus.ACTIVE },
  { id: 'al-004', assetId: 'a-002', asset: assets[1], employeeId: 'u-006', employee: extraEmployees[1], departmentId: 'd-003', allocatedAt: ago(40), expectedReturnDate: ago(5), returnedAt: ago(5), conditionNote: 'Minor scratches on lid', status: AllocationStatus.CLOSED },
];

export const transfers: TransferRequest[] = [
  { id: 'tr-001', allocationId: 'al-001', requestedBy: 'u-005', fromHolder: 'Neha Patel', toHolder: 'Vikram Singh', toEmployeeId: 'u-005', toDepartmentId: null, reason: 'Need a higher-spec laptop for ML project', status: TransferStatus.REQUESTED, createdAt: ago(2), updatedAt: ago(2), approvedBy: "u-001" },
  { id: 'tr-002', allocationId: 'al-002', requestedBy: 'u-003', fromHolder: 'Vikram Singh', toHolder: 'Rahul Gupta', toEmployeeId: 'u-003', toDepartmentId: null, reason: 'Department head needs monitor for presentations', status: TransferStatus.APPROVED, createdAt: ago(5), updatedAt: ago(3), approvedBy: "u-001" },
];

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
export const bookings: Booking[] = [
  { id: 'b-001', resourceAssetId: 'a-004', resource: assets[3], bookedBy: 'u-004', bookedByEmployee: allEmployees[3], startTime: `${todayStr}T09:00:00Z`, endTime: `${todayStr}T10:00:00Z`, status: BookingStatus.ONGOING, cancelledReason: null, createdAt: ago(1) },
  { id: 'b-002', resourceAssetId: 'a-004', resource: assets[3], bookedBy: 'u-003', bookedByEmployee: allEmployees[2], startTime: `${todayStr}T10:00:00Z`, endTime: `${todayStr}T11:30:00Z`, status: BookingStatus.UPCOMING, cancelledReason: null, createdAt: ago(1) },
  { id: 'b-003', resourceAssetId: 'a-004', resource: assets[3], bookedBy: 'u-005', bookedByEmployee: extraEmployees[0], startTime: `${todayStr}T14:00:00Z`, endTime: `${todayStr}T15:00:00Z`, status: BookingStatus.UPCOMING, cancelledReason: null, createdAt: ago(1) },
  { id: 'b-004', resourceAssetId: 'a-005', resource: assets[4], bookedBy: 'u-004', bookedByEmployee: allEmployees[3], startTime: `${todayStr}T11:00:00Z`, endTime: `${todayStr}T12:00:00Z`, status: BookingStatus.UPCOMING, cancelledReason: null, createdAt: ago(1) },
  { id: 'b-005', resourceAssetId: 'a-006', resource: assets[5], bookedBy: 'u-001', bookedByEmployee: allEmployees[0], startTime: `${todayStr}T08:00:00Z`, endTime: `${todayStr}T17:00:00Z`, status: BookingStatus.ONGOING, cancelledReason: null, createdAt: ago(2) },
];

export const maintenanceRequests: MaintenanceRequest[] = [
  { id: 'm-001', assetId: 'a-008', asset: assets[7], raisedBy: 'u-007', raisedByEmployee: extraEmployees[2], issueDescription: 'Keyboard not responding intermittently. Keys get stuck after 30 minutes of use.', priority: MaintenancePriority.HIGH, photoUrl: null, status: MaintenanceStatus.IN_PROGRESS, approvedBy: 'u-002', technicianName: 'Rajesh Kumar', resolvedAt: null, createdAt: ago(5), updatedAt: ago(1) },
  { id: 'm-002', assetId: 'a-006', asset: assets[5], raisedBy: 'u-001', raisedByEmployee: allEmployees[0], issueDescription: 'AC not cooling in the vehicle. Needs compressor check.', priority: MaintenancePriority.MEDIUM, photoUrl: null, status: MaintenanceStatus.APPROVED, approvedBy: 'u-002', technicianName: null, resolvedAt: null, createdAt: ago(3), updatedAt: ago(2) },
  { id: 'm-003', assetId: 'a-009', asset: assets[8], raisedBy: 'u-006', raisedByEmployee: extraEmployees[1], issueDescription: 'Dead pixels in bottom-left corner of the screen.', priority: MaintenancePriority.LOW, photoUrl: null, status: MaintenanceStatus.PENDING, approvedBy: null, technicianName: null, resolvedAt: null, createdAt: ago(1), updatedAt: ago(1) },
  { id: 'm-004', assetId: 'a-002', asset: assets[1], raisedBy: 'u-004', raisedByEmployee: allEmployees[3], issueDescription: 'Battery drains within 2 hours. Needs battery replacement.', priority: MaintenancePriority.HIGH, photoUrl: null, status: MaintenanceStatus.TECHNICIAN_ASSIGNED, approvedBy: 'u-002', technicianName: 'Suresh Babu', resolvedAt: null, createdAt: ago(7), updatedAt: ago(2) },
  { id: 'm-005', assetId: 'a-007', asset: assets[6], raisedBy: 'u-005', raisedByEmployee: extraEmployees[0], issueDescription: 'Height adjustment mechanism is jammed.', priority: MaintenancePriority.MEDIUM, photoUrl: null, status: MaintenanceStatus.RESOLVED, approvedBy: 'u-002', technicianName: 'Rajesh Kumar', resolvedAt: ago(3), createdAt: ago(10), updatedAt: ago(3) },
];

export const auditCycles: AuditCycle[] = [
  {
    id: 'ac-001', name: 'Q1 2026 Audit', _count: { totalAssets: 5, completedAssets: 2 }, scopeDepartmentId: 'd-002', scopeLocation: 'Floor 3',
    startDate: ago(7), endDate: future(7), status: AuditCycleStatus.OPEN,
    auditors: [allEmployees[2], extraEmployees[0]],
    progress: { total: 5, verified: 2, missing: 1, damaged: 0, pending: 2 },
    createdAt: ago(7),
  },
  {
    id: 'ac-002', name: 'Q1 2026 Audit', _count: { totalAssets: 3, completedAssets: 2 }, scopeDepartmentId: null, scopeLocation: 'Floor 1',
    startDate: ago(30), endDate: ago(20), status: AuditCycleStatus.CLOSED,
    auditors: [allEmployees[1]],
    progress: { total: 3, verified: 2, missing: 0, damaged: 1, pending: 0 },
    createdAt: ago(30),
  },
];

export const auditResults: AuditResultEntry[] = [
  { id: 'ar-001', auditCycleId: 'ac-001', assetId: 'a-001', asset: assets[0], result: AuditResult.VERIFIED, notes: 'Asset in good condition at expected location', updatedAt: ago(3) },
  { id: 'ar-002', auditCycleId: 'ac-001', assetId: 'a-003', asset: assets[2], result: AuditResult.VERIFIED, notes: null, updatedAt: ago(3) },
  { id: 'ar-003', auditCycleId: 'ac-001', assetId: 'a-011', asset: assets[10], result: AuditResult.MISSING, notes: 'Not found at expected desk. Employee on leave.', updatedAt: ago(2) },
  { id: 'ar-004', auditCycleId: 'ac-001', assetId: 'a-008', asset: assets[7], result: AuditResult.PENDING, notes: null, updatedAt: ago(1) },
  { id: 'ar-005', auditCycleId: 'ac-001', assetId: 'a-009', asset: assets[8], result: AuditResult.PENDING, notes: null, updatedAt: ago(1) },
];

export const notifications: Notification[] = [
  { id: 'n-001', recipientId: 'u-001', type: 'TRANSFER_REQUESTED', title: 'Transfer Request', message: 'Vikram Singh requested transfer of MacBook Pro 16" (AF-0001) from Neha Patel.', entityType: 'transfer', entityId: 'tr-001', readAt: null, createdAt: ago(0.1) },
  { id: 'n-002', recipientId: 'u-001', type: 'MAINTENANCE_RAISED', title: 'New Maintenance Request', message: 'Ananya Iyer raised a maintenance request for Samsung 27" Monitor (AF-0009).', entityType: 'maintenance', entityId: 'm-003', readAt: null, createdAt: ago(1) },
  { id: 'n-003', recipientId: 'u-001', type: 'BOOKING_CONFIRMED', title: 'Booking Confirmed', message: 'Your booking for Conference Room Alpha on today 09:00–10:00 is confirmed.', entityType: 'booking', entityId: 'b-001', readAt: ago(0.5), createdAt: ago(1) },
  { id: 'n-004', recipientId: 'u-001', type: 'OVERDUE_RETURN', title: 'Overdue Return Alert', message: 'Dell XPS 15 (AF-0002) was due for return 5 days ago from Ananya Iyer.', entityType: 'allocation', entityId: 'al-004', readAt: null, createdAt: ago(0.2) },
  { id: 'n-005', recipientId: 'u-001', type: 'AUDIT_DISCREPANCY', title: 'Audit Discrepancy', message: 'MacBook Air M3 (AF-0011) marked as Missing during Floor 3 audit.', entityType: 'audit', entityId: 'ac-001', readAt: null, createdAt: ago(2) },
  { id: 'n-006', recipientId: 'u-001', type: 'MAINTENANCE_RESOLVED', title: 'Maintenance Resolved', message: 'Standing Desk (AF-0007) maintenance has been resolved by Rajesh Kumar.', entityType: 'maintenance', entityId: 'm-005', readAt: ago(3), createdAt: ago(3) },
];

export const activityLog: ActivityLogEntry[] = [
  { id: 'log-001', actorId: 'u-005', actor: extraEmployees[0], action: 'TRANSFER_REQUESTED', entityType: 'transfer', entityId: 'tr-001', metadata: { asset: 'AF-0001', from: 'Neha Patel', to: 'Vikram Singh' }, createdAt: ago(0.1) },
  { id: 'log-002', actorId: 'u-006', actor: extraEmployees[1], action: 'MAINTENANCE_RAISED', entityType: 'maintenance', entityId: 'm-003', metadata: { asset: 'AF-0009', priority: 'LOW' }, createdAt: ago(1) },
  { id: 'log-003', actorId: 'u-002', actor: allEmployees[1], action: 'MAINTENANCE_APPROVED', entityType: 'maintenance', entityId: 'm-002', metadata: { asset: 'AF-0006' }, createdAt: ago(2) },
  { id: 'log-004', actorId: 'u-004', actor: allEmployees[3], action: 'BOOKING_CREATED', entityType: 'booking', entityId: 'b-001', metadata: { resource: 'Conference Room Alpha', time: '09:00–10:00' }, createdAt: ago(1) },
  { id: 'log-005', actorId: 'u-001', actor: allEmployees[0], action: 'ASSET_REGISTERED', entityType: 'asset', entityId: 'a-012', metadata: { assetTag: 'AF-0012', name: 'Dell UltraSharp 32"' }, createdAt: ago(10) },
  { id: 'log-006', actorId: 'u-002', actor: allEmployees[1], action: 'ALLOCATION_CREATED', entityType: 'allocation', entityId: 'al-003', metadata: { asset: 'AF-0011', employee: 'Rahul Gupta' }, createdAt: ago(10) },
  { id: 'log-007', actorId: 'u-001', actor: allEmployees[0], action: 'ROLE_PROMOTED', entityType: 'employee', entityId: 'u-002', metadata: { employee: 'Priya Sharma', from: 'EMPLOYEE', to: 'ASSET_MANAGER' }, createdAt: ago(85) },
  { id: 'log-008', actorId: 'u-002', actor: allEmployees[1], action: 'AUDIT_CYCLE_CREATED', entityType: 'audit', entityId: 'ac-001', metadata: { scope: 'Engineering, Floor 3' }, createdAt: ago(7) },
];

export const dashboardKPIs: DashboardKPIs = {
  assetsAvailable: 5,
  assetsAllocated: 3,
  maintenanceToday: 2,
  activeBookings: 4,
  pendingTransfers: 1,
  upcomingReturns: 3,
  overdueReturns: 1,
  totalAssets: 12,
};

export const utilizationData: UtilizationData[] = [
  { department: 'Engineering', allocated: 4, available: 1, utilization: 80 },
  { department: 'Marketing', allocated: 1, available: 2, utilization: 33 },
  { department: 'Administration', allocated: 1, available: 2, utilization: 33 },
  { department: 'HR', allocated: 0, available: 1, utilization: 0 },
];

export const maintenanceFrequency: MaintenanceFrequencyData[] = [
  { month: 'Jan', count: 3, resolved: 3 },
  { month: 'Feb', count: 5, resolved: 4 },
  { month: 'Mar', count: 2, resolved: 2 },
  { month: 'Apr', count: 7, resolved: 6 },
  { month: 'May', count: 4, resolved: 4 },
  { month: 'Jun', count: 6, resolved: 5 },
  { month: 'Jul', count: 5, resolved: 2 },
];

export const topAssets: TopAsset[] = [
  { id: 'a-004', assetTag: 'AF-0004', name: 'Conference Room Alpha', usageCount: 142, category: 'Conference Rooms' },
  { id: 'a-005', assetTag: 'AF-0005', name: 'Conference Room Beta', usageCount: 98, category: 'Conference Rooms' },
  { id: 'a-006', assetTag: 'AF-0006', name: 'Toyota Innova', usageCount: 67, category: 'Vehicles' },
  { id: 'a-001', assetTag: 'AF-0001', name: 'MacBook Pro 16"', usageCount: 45, category: 'Laptops' },
];


const delay = (ms = 300) => new Promise(res => setTimeout(res, ms + Math.random() * 200));

export const mockApi = {
  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    await delay();
    const user = Object.values(DEMO_USERS).find(u => u.email === email && u.password === password);
    if (!user) throw { response: { data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } } } };
    const { password: _p, ...userData } = user;
    return { accessToken: 'mock-access-token-' + uuid(), refreshToken: 'mock-refresh-token-' + uuid(), user: userData };
  },

  async signup(name: string, email: string, _password: string): Promise<{ message: string }> {
    await delay();
    if (Object.values(DEMO_USERS).some(u => u.email === email)) {
      throw { response: { data: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email already exists' } } } };
    }
    return { message: `Account created for ${name}. You can now log in.` };
  },

  async getMe(): Promise<Employee> {
    await delay(100);
    const { password: _p, ...user } = DEMO_USERS.admin;
    return user;
  },

  // Dashboard
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    await delay();
    return dashboardKPIs;
  },

  // Organization
  async getDepartments(): Promise<Department[]> {
    await delay();
    return departments;
  },

  async getCategories(): Promise<AssetCategory[]> {
    await delay();
    return categories;
  },

  async getEmployees(): Promise<Employee[]> {
    await delay();
    return allEmployees;
  },

  // Assets
  async getAssets(): Promise<Asset[]> {
    await delay();
    return assets;
  },

  async getAssetById(id: string): Promise<Asset | undefined> {
    await delay();
    return assets.find(a => a.id === id);
  },

  // Allocations
  async getAllocations(): Promise<Allocation[]> {
    await delay();
    return allocations;
  },

  async getTransfers(): Promise<TransferRequest[]> {
    await delay();
    return transfers;
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    await delay();
    return bookings;
  },

  async getBookableResources(): Promise<Asset[]> {
    await delay();
    return assets.filter(a => a.isBookable);
  },

  // Maintenance
  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    await delay();
    return maintenanceRequests;
  },

  // Audits
  async getAuditCycles(): Promise<AuditCycle[]> {
    await delay();
    return auditCycles;
  },

  async getAuditResults(cycleId: string): Promise<AuditResultEntry[]> {
    await delay();
    return auditResults.filter(r => r.auditCycleId === cycleId);
  },

  // Reports
  async getUtilization(): Promise<UtilizationData[]> {
    await delay();
    return utilizationData;
  },

  async getMaintenanceFrequency(): Promise<MaintenanceFrequencyData[]> {
    await delay();
    return maintenanceFrequency;
  },

  async getTopAssets(): Promise<TopAsset[]> {
    await delay();
    return topAssets;
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    await delay();
    return notifications;
  },

  // Activity Log
  async getActivityLog(): Promise<ActivityLogEntry[]> {
    await delay();
    return activityLog;
  },
};
