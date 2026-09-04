import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--ground)',
      padding: 'var(--space-4)'
    }}>
      <article style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-8)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
      }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
            Đăng Nhập Cổng Nội Bộ
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Công ty TNHH Công nghiệp Fu Sheng (Việt Nam)
          </p>
        </header>

        {error && (
          <aside aria-live="polite" style={{
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-sm)',
            border: '1px solid var(--danger)'
          }}>
            {error}
          </aside>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="visually-hidden" style={{ position: 'absolute', opacity: 0 }}>
              Thông tin xác thực
            </legend>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="email">Email công vụ</label>
              <input
                id="email"
                type="email"
                required
                placeholder="ten.nv@fusheng.com.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
            </button>
          </fieldset>
        </form>

        <footer style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0 }}>Tài khoản mặc định thử nghiệm:</p>
          <code style={{ display: 'block', marginTop: 'var(--space-1)', color: 'var(--accent)' }}>
            admin@fusheng.com.vn / Admin@123
          </code>
        </footer>
      </article>
    </main>
  );
}
