import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Megaphone,
  BookOpen,
  ScrollText,
  Building2,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ open = false, isOpen, onNavigate, onClose }) {
  const { user } = useAuth();
  const isExpanded = Boolean(open || isOpen);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onClose]);

  const navItems = [
    { to: '/', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { to: '/employees', label: 'Danh bạ nhân viên', icon: Users },
    { to: '/leaves', label: 'Đơn nghỉ phép & OT', icon: CalendarClock },
    { to: '/announcements', label: 'Bảng tin công ty', icon: Megaphone },
    { to: '/internship-plan', label: 'Kế hoạch thực tập', icon: BookOpen },
    ...(user?.role === 'admin' ? [{ to: '/audit-logs', label: 'Nhật ký hệ thống', icon: ScrollText }] : []),
    ...(user?.role === 'admin' ? [{ to: '/departments', label: 'Quản trị phòng ban', icon: Building2 }] : []),
    { to: '/profile', label: 'Hồ sơ cá nhân', icon: User }
  ];

  const handleNavClick = () => {
    onNavigate?.();
    onClose?.();
  };

  return (
    <>
      {isExpanded && (
        <aside
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar${isExpanded ? ' is-open' : ''}`} aria-label="Menu điều hướng chính">
        <header className="sidebar-mobile-header">
          <strong className="sidebar-mobile-title">Danh mục điều hướng</strong>
          <button
            type="button"
            className="btn btn-secondary compact-button sidebar-close-btn"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <nav aria-label="Sidebar Navigation">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li className="nav-item" key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <mark className="nav-icon" aria-hidden="true">
                      <Icon size={18} />
                    </mark>
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
