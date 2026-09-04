import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header style={{
      height: '64px',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-6)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <strong style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          FU SHENG PORTAL
        </strong>
        <span className="badge badge-normal">INTRANET</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {user && (
          <section aria-label="User Profile Summary" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                {user.full_name}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {user.role?.toUpperCase()} | {user.position || 'Nhân viên'}
              </p>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              aria-label="Đăng xuất khỏi hệ thống"
              style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
            >
              Đăng xuất
            </button>
          </section>
        )}
      </div>
    </header>
  );
}
