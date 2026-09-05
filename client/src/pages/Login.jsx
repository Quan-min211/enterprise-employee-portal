import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError(err.message || 'Dang nhap that bai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <article className="login-card">
        <header>
          <h1>Dang Nhap Cong Noi Bo</h1>
          <p>Cong ty TNHH Cong nghiep Fu Sheng (Viet Nam)</p>
        </header>

        {error && (
          <aside className="alert" aria-live="polite">
            {error}
          </aside>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend className="visually-hidden">Thong tin xac thuc</legend>

            <section className="field-group">
              <label htmlFor="email">Email cong vu</label>
              <input
                id="email"
                type="email"
                required
                placeholder="ten.nv@fusheng.com.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </section>

            <section className="field-group">
              <label htmlFor="password">Mat khau</label>
              <input
                id="password"
                type="password"
                required
                placeholder="Nhap mat khau"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </section>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary full-width"
            >
              {loading ? 'Dang xac thuc...' : 'Dang nhap vao he thong'}
            </button>
          </fieldset>
        </form>

        <footer>
          <p>Tai khoan mac dinh thu nghiem:</p>
          <code>admin@fusheng.com.vn / Admin@123</code>
        </footer>
      </article>
    </main>
  );
}
