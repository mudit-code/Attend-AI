import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { db } from '../lib/db';
import { runSync } from '../lib/syncEngine';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });

      // Store token in memory (Zustand) — NOT localStorage
      setToken(data.accessToken);
      setUser(data.user);

      // Store minimal user info in IndexedDB for offline PIN
      await db.users.put({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      });

      // Request persistent storage (prevent browser eviction)
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const granted = await navigator.storage.persist();
        if (!granted) console.warn('Persistent storage not granted');
      }

      // Trigger bootstrap sync
      void runSync();

      // Navigate by role
      const role = data.user.role;
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'TEACHER') navigate('/teacher');
      else if (role === 'STUDENT') navigate('/student');
      else if (role === 'HOD') navigate('/hod');
      else if (role === 'PARENT') navigate('/parent');
      else navigate('/');

    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { code?: string } } } };
      if (e.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="page"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.15) 0%, var(--color-bg) 70%)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
        minHeight: '100dvh',
      }}
    >
      <div className="container">
        {/* Logo & Title */}
        <div className="flex flex-col items-center" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, #6C63FF, #9C8FFF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', marginBottom: '1rem',
              boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
            }}
          >
            📋
          </div>
          <h1 style={{ marginBottom: '0.25rem' }}>AttendAI</h1>
          <p className="text-muted text-sm">College Attendance Management</p>
        </div>

        {/* Login Card */}
        <div className="card card--glass">
          <h2 style={{ marginBottom: '0.25rem' }}>Welcome back</h2>
          <p className="text-sm text-muted" style={{ marginBottom: '1.75rem' }}>
            Sign in to continue
          </p>

          {error && (
            <div className="alert alert--error" style={{ marginBottom: '1.25rem' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.1rem',
                    padding: '0.25rem', lineHeight: 1,
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div
            style={{
              marginTop: '1.5rem', padding: '0.875rem',
              background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem', color: 'var(--color-text-muted)',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              🧪 Dev Credentials
            </p>
            <p>Admin: <code style={{ color: 'var(--color-primary)' }}>admin@attendai.com</code> / Admin@123</p>
            <p>Teacher: <code style={{ color: 'var(--color-primary)' }}>teacher1@attendai.com</code> / Teacher@123</p>
            <p>Student: <code style={{ color: 'var(--color-primary)' }}>student1@attendai.com</code> / Student@123</p>
          </div>
        </div>

        {/* Offline note */}
        <p
          className="text-xs text-muted"
          style={{ textAlign: 'center', marginTop: '1.25rem' }}
        >
          🔒 Offline-first · Works without internet after first login
        </p>
      </div>
    </main>
  );
}
