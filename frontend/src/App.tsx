import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { initSyncListeners } from './lib/syncEngine';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import UpdateBanner from './components/UpdateBanner';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './index.css';

// Lazy-load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const LockScreen = lazy(() => import('./pages/LockScreen'));

// ─── Route Guard ──────────────────────────────────────────────────
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, accessToken, isLocked } = useAuthStore();

  if (isLocked) return <Navigate to="/locked" replace />;
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

// ─── Loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  useIdleTimeout();

  return <>{children}</>;
}

// ─── Root App ────────────────────────────────────────────────────
export default function App() {
  const [showUpdate, setShowUpdate] = useState(false);

  // PWA update registration
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onNeedRefresh() { setShowUpdate(true); },
    onOfflineReady() { console.log('App ready for offline use'); },
  });

  // Initialize sync listeners
  useEffect(() => {
    const cleanup = initSyncListeners();
    return cleanup;
  }, []);

  const handleUpdate = () => {
    void updateServiceWorker(true);
    window.location.reload();
  };

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/locked" element={<LockScreen />} />

            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute roles={['TEACHER', 'HOD']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/*"
              element={
                <ProtectedRoute roles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/parent/*"
              element={
                <ProtectedRoute roles={['PARENT', 'STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute roles={['ADMIN', 'HOD']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hod/*"
              element={
                <ProtectedRoute roles={['HOD', 'ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Landing page & role redirect */}
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<RoleRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* PWA update banner */}
        {(showUpdate || needRefresh) && (
          <UpdateBanner onRefresh={handleUpdate} />
        )}
      </AppShell>
    </BrowserRouter>
  );
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;

  const roleRoutes: Record<string, string> = {
    ADMIN: '/admin',
    TEACHER: '/teacher',
    STUDENT: '/student',
    PARENT: '/parent',
    HOD: '/hod',
  };

  return <Navigate to={roleRoutes[user.role] ?? '/login'} replace />;
}
