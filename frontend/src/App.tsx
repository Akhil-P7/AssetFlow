import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { OrgSetupPage } from '@/pages/OrgSetupPage';
import { AssetsPage, AssetDetailPage } from '@/pages/AssetsPage';
import { AllocationsPage } from '@/pages/AllocationsPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { AuditsPage } from '@/pages/AuditsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { useAuthStore } from '@/stores/auth-store';
import { Role } from '@/types';

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — redirect to dashboard if already logged in */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/forgot-password" element={<AuthPage />} />
        </Route>

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Admin-only */}
            <Route element={<RoleGuard roles={[Role.ADMIN]} />}>
              <Route path="/org" element={<OrgSetupPage />} />
            </Route>

            {/* All roles */}
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/assets/:id" element={<AssetDetailPage />} />
            <Route path="/allocations" element={<AllocationsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />

            {/* Admin + Asset Manager */}
            <Route element={<RoleGuard roles={[Role.ADMIN, Role.ASSET_MANAGER]} />}>
              <Route path="/audits" element={<AuditsPage />} />
            </Route>

            {/* Admin + Asset Manager + Dept Head */}
            <Route element={<RoleGuard roles={[Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD]} />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
