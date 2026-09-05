import React, { useEffect, useState } from 'react';
import { employeesApi } from '../api/employeesApi';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await employeesApi.updateMe(profileForm);
      await refreshUser();
      setMessage('Cap nhat ho so thanh cong.');
    } catch (err) {
      setError(err.message || 'Khong the cap nhat ho so.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await employeesApi.changePassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '' });
      setMessage('Doi mat khau thanh cong.');
    } catch (err) {
      setError(err.message || 'Khong the doi mat khau.');
    }
  };

  return (
    <section aria-labelledby="profile-heading">
      <header className="page-header">
        <section>
          <h1 id="profile-heading">Ho So Ca Nhan</h1>
          <p>Xem va cap nhat thong tin lien lac ca nhan trong cong thong tin noi bo.</p>
        </section>
      </header>

      {message && <aside className="alert success-alert" aria-live="polite">{message}</aside>}
      {error && <aside className="alert" aria-live="polite">{error}</aside>}

      <section className="profile-grid" aria-label="Thong tin ho so va bao mat">
        <article className="panel">
          <h2>Thong Tin Nhan Vien</h2>
          <dl className="detail-list">
            <dt>Ma nhan vien</dt>
            <dd><code>{user?.employee_code}</code></dd>
            <dt>Vai tro</dt>
            <dd>{user?.role}</dd>
            <dt>Phong ban</dt>
            <dd>{user?.department?.name || 'Chua phan bo'}</dd>
            <dt>Chuc vu</dt>
            <dd>{user?.position || 'Nhan vien'}</dd>
            <dt>Ngay vao lam</dt>
            <dd>{user?.hire_date || 'Chua cap nhat'}</dd>
          </dl>
        </article>

        <article className="panel">
          <h2>Cap Nhat Lien Lac</h2>
          <form onSubmit={handleProfileSubmit}>
            <fieldset>
              <legend className="visually-hidden">Thong tin lien lac</legend>
              <section className="field-group">
                <label htmlFor="profile_full_name">Ho va ten</label>
                <input
                  id="profile_full_name"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                />
              </section>
              <section className="field-group">
                <label htmlFor="profile_phone">So dien thoai</label>
                <input
                  id="profile_phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </section>
              <section className="field-group">
                <label htmlFor="profile_avatar">Avatar URL</label>
                <input
                  id="profile_avatar"
                  type="url"
                  value={profileForm.avatar_url}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                />
              </section>
              <button type="submit" className="btn btn-primary">Luu ho so</button>
            </fieldset>
          </form>
        </article>

        <article className="panel">
          <h2>Doi Mat Khau</h2>
          <form onSubmit={handlePasswordSubmit}>
            <fieldset>
              <legend className="visually-hidden">Doi mat khau tai khoan</legend>
              <section className="field-group">
                <label htmlFor="current_password">Mat khau hien tai</label>
                <input
                  id="current_password"
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                />
              </section>
              <section className="field-group">
                <label htmlFor="new_password">Mat khau moi</label>
                <input
                  id="new_password"
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                />
              </section>
              <button type="submit" className="btn btn-secondary">Doi mat khau</button>
            </fieldset>
          </form>
        </article>
      </section>
    </section>
  );
}
