import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
    { to: '/', label: 'Bảng điều khiển', icon: 'DB' },
    { to: '/employees', label: 'Danh bạ nhân viên', icon: 'NV' },
    { to: '/leaves', label: 'Đơn nghỉ phép & OT', icon: 'OT' },
    { to: '/announcements', label: 'Bảng tin công ty', icon: 'TB' },
    { to: '/internship-plan', label: 'Kế hoạch thực tập', icon: 'KH' },
    ...(user?.role === 'admin' ? [{ to: '/audit-logs', label: 'Nhật ký hệ thống', icon: 'LOG' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/departments', label: 'Quản trị phòng ban', icon: 'PB' }] : []),
    { to: '/profile', label: 'Hồ sơ cá nhân', icon: 'HS' }
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
            ✕
          </button>
        </header>
        <nav aria-label="Sidebar Navigation">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <mark className="nav-icon" aria-hidden="true">{item.icon}</mark>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
