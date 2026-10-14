import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
    <main className="login-screen">
      <article className="login-card">
        <header>
          <hgroup>
            <h1>Đăng Nhập Cổng Nội Bộ</h1>
            <p>Công ty TNHH Công nghiệp Fu Sheng (Việt Nam)</p>
          </hgroup>
        </header>

        {error && (
          <aside className="alert" aria-live="polite">
            {error}
          </aside>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend className="visually-hidden">Thông tin xác thực</legend>

            <p className="field-group">
              <label htmlFor="email">Email công vụ</label>
              <input
                id="email"
                type="email"
                required
                placeholder="ten.nv@fusheng.com.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </p>

            <p className="field-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                required
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </p>

            <footer className="action-row">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary full-width"
              >
                {loading ? (
                  'Đang xác thực...'
                ) : (
                  <>
                    <LogIn size={16} aria-hidden="true" />
                    Đăng nhập vào hệ thống
                  </>
                )}
              </button>
            </footer>
          </fieldset>
        </form>

        <footer>
          <p>Tài khoản mặc định thử nghiệm:</p>
          <code>admin@fusheng.com.vn / Admin@123</code>
        </footer>
      </article>
    </main>
  );
}
