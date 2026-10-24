import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Header({ sidebarOpen = false, onMenuToggle }) {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'FS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Quản trị viên', className: 'badge-admin' };
      case 'manager':
        return { label: 'Quản lý', className: 'badge-manager' };
      default:
        return { label: 'Nhân viên', className: 'badge-employee' };
    }
  };

  const roleInfo = user ? getRoleBadge(user.role) : null;

  return (
    <header className="topbar">
      <section className="topbar-brand-section">
        <button
          type="button"
          className="menu-toggle btn btn-secondary compact-button"
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={Boolean(sidebarOpen)}
        >
          <Menu size={18} aria-hidden="true" />
          <strong className="menu-toggle-text">Menu</strong>
        </button>

        <NavLink to="/" className="brand-row" aria-label="Trang chủ Fu Sheng Portal">
          <figure className="brand-emblem" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="20"
                height="20"
                rx="5"
                fill="var(--accent)"
                fillOpacity="0.12"
                stroke="var(--accent)"
                strokeWidth="1.75"
              />
              <path
                d="M7 17V7h10M7 12h7"
                stroke="var(--accent)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </figure>
          <hgroup className="brand-group">
            <strong className="brand-name">FU SHENG PORTAL</strong>
            <mark className="badge badge-normal badge-intranet">INTRANET</mark>
          </hgroup>
        </NavLink>

        <aside className="system-status-indicator" aria-label="Trạng thái hệ thống">
          <mark className="status-dot-pulse" aria-hidden="true" />
          <small className="status-label">Trực tuyến</small>
        </aside>
      </section>

      <nav className="header-actions" aria-label="Tài khoản người dùng">
        {user && (
          <aside className="profile-summary" aria-label="Tóm tắt hồ sơ đăng nhập">
            <NavLink
              to="/profile"
              className="profile-chip"
              aria-label={`Xem hồ sơ của ${user.full_name}`}
            >
              <figure className="avatar-badge" aria-hidden="true">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="avatar-img"
                  />
                ) : (
                  <strong className="avatar-initials">
                    {getInitials(user.full_name)}
                  </strong>
                )}
              </figure>
              <hgroup className="profile-copy">
                <p className="profile-name">{user.full_name}</p>
                <p className="profile-role">
                  <mark className={`badge ${roleInfo?.className || 'badge-normal'}`}>
                    {roleInfo?.label}
                  </mark>
                  {user.department?.name
                    ? ` • ${user.department.name}`
                    : user.position
                    ? ` • ${user.position}`
                    : ''}
                </p>
              </hgroup>
            </NavLink>

            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary compact-button logout-btn"
              aria-label="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={15} aria-hidden="true" />
              Đăng xuất
            </button>
          </aside>
        )}
      </nav>
    </header>
  );
}

