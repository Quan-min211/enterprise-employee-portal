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
  X,
  ShieldCheck,
  ChevronRight
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

  const navSections = [
    {
      category: 'TỔNG QUAN',
      items: [
        { to: '/', label: 'Bảng điều khiển', icon: LayoutDashboard },
        { to: '/announcements', label: 'Bảng tin công ty', icon: Megaphone }
      ]
    },
    {
      category: 'VẬN HÀNH & NHÂN SỰ',
      items: [
        { to: '/employees', label: 'Danh bạ nhân viên', icon: Users },
        { to: '/leaves', label: 'Đơn nghỉ phép & OT', icon: CalendarClock },
        { to: '/internship-plan', label: 'Kế hoạch thực tập', icon: BookOpen }
      ]
    },
    ...(user?.role === 'admin'
      ? [
          {
            category: 'QUẢN TRỊ HỆ THỐNG',
            items: [
              { to: '/departments', label: 'Quản trị phòng ban', icon: Building2 },
              { to: '/audit-logs', label: 'Nhật ký hệ thống', icon: ScrollText }
            ]
          }
        ]
      : []),
    {
      category: 'TÀI KHOẢN',
      items: [{ to: '/profile', label: 'Hồ sơ cá nhân', icon: User }]
    }
  ];

  const handleNavClick = () => {
    onNavigate?.();
    onClose?.();
  };

  return (
    <>
      {isExpanded && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar${isExpanded ? ' is-open' : ''}`}
        aria-label="Menu điều hướng chính"
      >
        <header className="sidebar-mobile-header">
          <hgroup className="sidebar-mobile-title-group">
            <strong className="sidebar-mobile-title">Danh mục điều hướng</strong>
            <small className="sidebar-mobile-sub">Fu Sheng Intranet</small>
          </hgroup>
          <button
            type="button"
            className="btn btn-secondary compact-button sidebar-close-btn"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <nav className="sidebar-nav" aria-label="Sidebar Navigation">
          {navSections.map((section) => (
            <section className="nav-group" key={section.category}>
              <p className="nav-group-title">{section.category}</p>
              <ul className="nav-list">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li className="nav-item" key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          `nav-link${isActive ? ' active' : ''}`
                        }
                      >
                        <mark className="nav-icon" aria-hidden="true">
                          <Icon size={18} />
                        </mark>
                        <strong className="nav-label">{item.label}</strong>
                        <ChevronRight
                          size={14}
                          className="nav-arrow"
                          aria-hidden="true"
                        />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <mark className="sidebar-footer-badge" aria-hidden="true">
            <ShieldCheck size={16} />
          </mark>
          <hgroup className="sidebar-footer-text">
            <strong className="sidebar-footer-title">Fu Sheng Industrial</strong>
            <small className="sidebar-footer-status">Cổng nội bộ bảo mật</small>
          </hgroup>
        </footer>
      </aside>
    </>
  );
}

