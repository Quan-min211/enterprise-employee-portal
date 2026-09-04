import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { to: '/', label: 'Bảng điều khiển', icon: '📊' },
    { to: '/employees', label: 'Danh bạ nhân viên', icon: '👥' },
    { to: '/leaves', label: 'Đơn nghỉ phép & OT', icon: '📝' },
    { to: '/announcements', label: 'Bảng tin công ty', icon: '📢' }
  ];

  return (
    <aside aria-label="Menu điều hướng chính" style={{
      width: '240px',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      minHeight: 'calc(100vh - 64px)',
      padding: 'var(--space-4) 0'
    }}>
      <nav aria-label="Sidebar Navigation">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => (
            <li key={item.to} style={{ marginBottom: 'var(--space-1)' }}>
              <NavLink
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-6)',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)'
                })}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
