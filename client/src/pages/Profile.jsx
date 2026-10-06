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
    document.title = 'Hồ Sơ Cá Nhân | Fu Sheng Portal';
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
      setMessage('Cập nhật hồ sơ thành công.');
    } catch (err) {
      setError(err.message || 'Không thể cập nhật hồ sơ.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await employeesApi.changePassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '' });
      setMessage('Đổi mật khẩu thành công.');
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu.');
    }
  };

  const roleLabels = {
    admin: 'Quản trị viên',
    manager: 'Quản lý bộ phận',
    employee: 'Nhân viên'
  };

  return (
    <section aria-labelledby="profile-heading">
      <header className="page-header">
        <section>
          <h1 id="profile-heading">Hồ Sơ Cá Nhân</h1>
          <p>Xem và cập nhật thông tin liên lạc cá nhân trong cổng thông tin nội bộ.</p>
        </section>
      </header>

      {message && <aside className="alert success-alert" aria-live="polite">{message}</aside>}
      {error && <aside className="alert" aria-live="polite">{error}</aside>}

      <section className="profile-grid" aria-label="Thông tin hồ sơ và bảo mật">
        <article className="panel">
          <h2>Thông Tin Nhân Viên</h2>
          <dl className="detail-list">
            <dt>Mã nhân viên</dt>
            <dd><code>{user?.employee_code}</code></dd>
            <dt>Vai trò</dt>
            <dd>{roleLabels[user?.role] || user?.role}</dd>
            <dt>Phòng ban</dt>
            <dd>{user?.department?.name || 'Chưa phân bổ'}</dd>
            <dt>Chức vụ</dt>
            <dd>{user?.position || 'Nhân viên'}</dd>
            <dt>Ngày vào làm</dt>
            <dd>
              {user?.hire_date
                ? new Date(user.hire_date).toLocaleDateString('vi-VN')
                : 'Chưa cập nhật'}
            </dd>
          </dl>
        </article>

        <article className="panel">
          <h2>Cập Nhật Liên Lạc</h2>
          <form onSubmit={handleProfileSubmit}>
            <fieldset>
              <legend className="visually-hidden">Thông tin liên lạc</legend>
              <section className="field-group">
                <label htmlFor="profile_full_name">Họ và tên</label>
                <input
                  id="profile_full_name"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                />
              </section>
              <section className="field-group">
                <label htmlFor="profile_phone">Số điện thoại</label>
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
              <button type="submit" className="btn btn-primary">Lưu hồ sơ</button>
            </fieldset>
          </form>
        </article>

        <article className="panel">
          <h2>Đổi Mật Khẩu</h2>
          <form onSubmit={handlePasswordSubmit}>
            <fieldset>
              <legend className="visually-hidden">Đổi mật khẩu tài khoản</legend>
              <section className="field-group">
                <label htmlFor="current_password">Mật khẩu hiện tại</label>
                <input
                  id="current_password"
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                />
              </section>
              <section className="field-group">
                <label htmlFor="new_password">Mật khẩu mới</label>
                <input
                  id="new_password"
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                />
              </section>
              <button type="submit" className="btn btn-secondary">Đổi mật khẩu</button>
            </fieldset>
          </form>
        </article>
      </section>
    </section>
  );
}
