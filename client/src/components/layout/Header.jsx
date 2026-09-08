import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <button type="button" className="menu-toggle" onClick={onMenuToggle} aria-label="Mo menu dieu huong">Menu</button>
      <section className="brand-row" aria-label="Nhan dien he thong">
        <strong className="brand-name">FU SHENG PORTAL</strong>
        <mark className="badge badge-normal">INTRANET</mark>
      </section>

      <section className="header-actions" aria-label="Tai khoan nguoi dung">
        {user && (
          <article className="profile-summary" aria-label="Tom tat ho so dang nhap">
            <section className="profile-copy">
              <p className="profile-name">{user.full_name}</p>
              <p className="profile-role">{user.role} | {user.position || 'Nhan vien'}</p>
            </section>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary compact-button"
              aria-label="Dang xuat khoi he thong"
            >
              Dang xuat
            </button>
          </article>
        )}
      </section>
    </header>
  );
}
