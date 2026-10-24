import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Users,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-split-page">
      {/* Cột trái: Form Đăng nhập */}
      <section className="login-form-pane">
        <article className="login-form-container">
          <header className="login-brand-header">
            <NavLink to="/" className="login-brand-badge" aria-label="Trang chủ Fu Sheng Portal">
              <figure className="login-emblem" aria-hidden="true">
                <svg
                  width="26"
                  height="26"
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
                    fill="#2563EB"
                    fillOpacity="0.12"
                    stroke="#2563EB"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M7 17V7h10M7 12h7"
                    stroke="#2563EB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </figure>
              <hgroup className="login-brand-titles">
                <strong className="login-brand-name">FU SHENG PORTAL</strong>
                <mark className="badge badge-normal badge-intranet">INTRANET</mark>
              </hgroup>
            </NavLink>

            <hgroup className="login-heading-group">
              <h1 className="login-main-title">Đăng Nhập Cổng Nội Bộ</h1>
              <p className="login-subtitle">
                Công ty TNHH Công nghiệp Fu Sheng (Việt Nam) &bull; KCN Biên Hòa 2
              </p>
            </hgroup>
          </header>

          {error && (
            <aside className="alert alert-danger" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" />
              <p>{error}</p>
            </aside>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <fieldset>
              <legend className="visually-hidden">Thông tin xác thực nhân viên</legend>

              <p className="field-group">
                <label htmlFor="email">Email công vụ hoặc Mã nhân viên</label>
                <div className="input-with-icon">
                  <Mail size={18} className="field-icon" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="ten.nv@fusheng.com.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </p>

              <p className="field-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="input-with-icon">
                  <Lock size={18} className="field-icon" aria-hidden="true" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ẩn ký tự' : 'Hiển thị ký tự'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </p>

              <aside className="login-options-row">
                <label className="checkbox-label" htmlFor="remember-me">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Ghi nhớ đăng nhập
                </label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                >
                  Quên mật khẩu?
                </button>
              </aside>

              {showForgotNotice && (
                <aside className="forgot-notice-panel" aria-live="polite">
                  <small>
                    Vui lòng liên hệ <strong>Phòng CNTT</strong> (Nội bộ: Ext 102) hoặc gửi email đến{' '}
                    <code>it-support@fusheng.com.vn</code> để được cấp lại mật khẩu.
                  </small>
                </aside>
              )}

              <footer className="action-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary full-width login-submit-btn"
                >
                  {loading ? (
                    'Đang xác thực hệ thống...'
                  ) : (
                    <>
                      <LogIn size={18} aria-hidden="true" />
                      Đăng nhập vào hệ thống
                    </>
                  )}
                </button>
              </footer>
            </fieldset>
          </form>

          <footer className="login-card-footer">
            <aside className="demo-credentials-card" aria-label="Tài khoản thử nghiệm">
              <header className="demo-header">
                <KeyRound size={15} aria-hidden="true" />
                <strong>Tài khoản mặc định thử nghiệm:</strong>
              </header>
              <p className="demo-creds">
                <code>admin@fusheng.com.vn</code> &bull; <code>Admin@123</code>
              </p>
            </aside>
            <p className="login-legal-copy">
              &copy; 2026 Fu Sheng Industrial (Vietnam) Co., Ltd. Bảo mật thông tin nội bộ.
            </p>
          </footer>
        </article>
      </section>

      {/* Cột phải: Khu vực Thương hiệu & Abstract Glassmorphism UI Mockup */}
      <aside
        className="login-brand-pane"
        aria-label="Giới thiệu hệ thống quản trị nhân sự Fu Sheng"
      >
        <div className="brand-pane-ambient" aria-hidden="true">
          <div className="ambient-blob blob-1" />
          <div className="ambient-blob blob-2" />
          <div className="ambient-grid-overlay" />
        </div>

        <section className="brand-pane-content">
          <header className="brand-pane-header">
            <aside className="brand-kicker-badge">
              <ShieldCheck size={14} aria-hidden="true" />
              HỆ THỐNG DOANH NGHIỆP THÔNG MINH
            </aside>
            <h2 className="brand-pane-title">
              Quản trị Nhân sự &amp; Vận hành Sản xuất Hiện đại
            </h2>
            <p className="brand-pane-desc">
              Cổng thông tin tập trung quản lý ngày công, đơn nghỉ phép, tăng ca (OT) và phân bổ
              nguồn lực công nghiệp tại Fu Sheng Industrial Việt Nam.
            </p>
          </header>

          {/* Floating Glassmorphism Mockup Cards */}
          <div className="glass-mockup-stage" aria-hidden="true">
            {/* Glass Card 1: Key Metrics */}
            <article className="glass-card glass-metric-card">
              <header className="glass-card-header">
                <div className="glass-icon-circle blue">
                  <Users size={16} />
                </div>
                <mark className="glass-trend positive">
                  <TrendingUp size={12} />
                  +4.8%
                </mark>
              </header>
              <p className="glass-label">Tổng nhân lực trực tiếp</p>
              <h3 className="glass-value">42 nhân sự</h3>
              <div className="glass-progress-track">
                <div className="glass-progress-bar blue" style={{ width: '84%' }} />
              </div>
            </article>

            {/* Glass Card 2: Approval Rate */}
            <article className="glass-card glass-status-card">
              <header className="glass-card-header">
                <div className="glass-icon-circle green">
                  <CheckCircle2 size={16} />
                </div>
                <mark className="glass-badge-status">HOÀN TẤT</mark>
              </header>
              <p className="glass-label">Tỷ lệ duyệt đơn phép &amp; OT</p>
              <h3 className="glass-value">98.5%</h3>
              <small className="glass-subtext">Xử lý trong vòng &lt; 2 giờ làm việc</small>
            </article>

            {/* Glass Card 3: Broadcast / Announcement */}
            <article className="glass-card glass-announcement-card">
              <header className="glass-card-header">
                <div className="glass-icon-circle amber">
                  <Sparkles size={16} />
                </div>
                <small className="glass-time">Tin tức nội bộ</small>
              </header>
              <h4 className="glass-announce-title">
                Kế hoạch đánh giá năng lực &amp; khen thưởng Q4
              </h4>
              <p className="glass-announce-body">
                Hệ thống mở cổng cập nhật KPI định kỳ và lịch nghỉ lễ năm mới 2026.
              </p>
            </article>
          </div>

          <footer className="brand-pane-footer">
            <div className="security-guarantee">
              <Lock size={14} aria-hidden="true" />
              <small>
                Bảo mật doanh nghiệp chuẩn TLS 1.3 &bull; Xác thực phiên làm việc HttpOnly JWT
              </small>
            </div>
          </footer>
        </section>
      </aside>
    </main>
  );
}

