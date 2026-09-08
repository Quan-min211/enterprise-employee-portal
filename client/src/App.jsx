import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Employees from './pages/Employees';
import LeaveRequests from './pages/LeaveRequests';
import Announcements from './pages/Announcements';
import Profile from './pages/Profile';
import Departments from './pages/Departments';
import InternshipPlan from './pages/InternshipPlan';
import AuditLogs from './pages/AuditLogs';
import NotFound from './pages/NotFound';
import { ToastProvider } from './contexts/ToastContext';

function DocumentTitle() {
  const location = useLocation();
  useEffect(() => {
    const titles = {
      '/': 'Bang dieu khien',
      '/employees': 'Danh ba nhan vien',
      '/leaves': 'Don nghi phep',
      '/announcements': 'Bang tin cong ty',
      '/internship-plan': 'Ke hoach thuc tap',
      '/profile': 'Ho so ca nhan',
      '/departments': 'Quan tri phong ban',
      '/audit-logs': 'Nhat ky he thong'
    };
    document.title = `${titles[location.pathname] || 'Trang khong ton tai'} | Fu Sheng Portal`;
  }, [location.pathname]);
  return null;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <main className="loading-screen">
        <p>Dang tai du lieu phien lam viec...</p>
      </main>
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/leaves" element={<LeaveRequests />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/internship-plan" element={<InternshipPlan />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/audit-logs" element={user.role === 'admin' ? <AuditLogs /> : <NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </section>
      <Footer />
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
