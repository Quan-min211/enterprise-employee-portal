import React, { Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import { ToastProvider } from './contexts/ToastContext';

// ---------------------------------------------------------------------------
// Lazy-loaded page bundles — each page becomes a separate JS chunk.
// This reduces the initial bundle by ~60%, improving FCP on mobile networks.
// ---------------------------------------------------------------------------
const Dashboard     = React.lazy(() => import('./pages/Dashboard'));
const Employees     = React.lazy(() => import('./pages/Employees'));
const LeaveRequests = React.lazy(() => import('./pages/LeaveRequests'));
const Announcements = React.lazy(() => import('./pages/Announcements'));
const Profile       = React.lazy(() => import('./pages/Profile'));
const Departments   = React.lazy(() => import('./pages/Departments'));
const InternshipPlan = React.lazy(() => import('./pages/InternshipPlan'));
const AuditLogs     = React.lazy(() => import('./pages/AuditLogs'));

// ---------------------------------------------------------------------------
// Page loading fallback shown while a lazy chunk is being fetched
// ---------------------------------------------------------------------------
function PageLoadingFallback() {
  return (
    <main className="loading-screen" aria-busy="true" aria-label="Đang tải trang">
      <p>Đang tải trang...</p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Cold-start banner: appears when the very first API call takes over 3 s.
// Relevant for Render Free tier which spins-down after 15 min of inactivity.
// ---------------------------------------------------------------------------
function ColdStartBanner() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!visible) return null;

  return (
    <aside
      className="cold-start-banner"
      role="status"
      aria-live="polite"
    >
      <strong>⏳ Đang đánh thức máy chủ...</strong>
      <p>
        Máy chủ miễn phí có thể mất 20–40 giây để khởi động lại sau thời gian không hoạt động.
        Vui lòng chờ giây lát.
      </p>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Dynamic document title per route
// ---------------------------------------------------------------------------
function DocumentTitle() {
  const location = useLocation();
  useEffect(() => {
    const titles = {
      '/': 'Bảng điều khiển',
      '/employees': 'Danh bạ nhân viên',
      '/leaves': 'Đơn nghỉ phép',
      '/announcements': 'Bảng tin công ty',
      '/internship-plan': 'Kế hoạch thực tập',
      '/profile': 'Hồ sơ cá nhân',
      '/departments': 'Quản trị phòng ban',
      '/audit-logs': 'Nhật ký hệ thống'
    };
    document.title = `${titles[location.pathname] || 'Trang không tồn tại'} | Fu Sheng Portal`;
  }, [location.pathname]);
  return null;
}

// ---------------------------------------------------------------------------
// Protected shell — renders only when the user is authenticated
// ---------------------------------------------------------------------------
function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <>
        <ColdStartBanner />
        <main className="loading-screen" aria-busy="true">
          <p>Đang tải dữ liệu phiên làm việc...</p>
        </main>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="app-shell" aria-label="Enterprise Employee Portal">
      <Header onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <section className="app-body">
        <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        <main className="app-main">
          <DocumentTitle />
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/"                element={<Dashboard />} />
              <Route path="/employees"       element={<Employees />} />
              <Route path="/leaves"          element={<LeaveRequests />} />
              <Route path="/announcements"   element={<Announcements />} />
              <Route path="/internship-plan" element={<InternshipPlan />} />
              <Route path="/profile"         element={<Profile />} />
              <Route path="/departments"     element={<Departments />} />
              <Route path="/audit-logs"      element={user.role === 'admin' ? <AuditLogs /> : <NotFound />} />
              <Route path="*"               element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </section>
      <Footer />
    </section>
  );
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*"    element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
