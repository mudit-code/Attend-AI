import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { db } from '../lib/db';
import { runSync } from '../lib/syncEngine';
import heroImage from '../assets/attendance_3d_hero.jpg';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'TEACHER' | 'STUDENT' | 'ADMIN'>('TEACHER');
  const [email, setEmail] = useState('teacher1@attendai.com');
  const [password, setPassword] = useState('Teacher@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  // Quick switch role & prefill demo credentials
  function handleSelectRole(role: 'TEACHER' | 'STUDENT' | 'ADMIN') {
    setSelectedRole(role);
    if (role === 'TEACHER') {
      setEmail('teacher1@attendai.com');
      setPassword('Teacher@123');
    } else if (role === 'STUDENT') {
      setEmail('student1@attendai.com');
      setPassword('Student@123');
    } else if (role === 'ADMIN') {
      setEmail('admin@attendai.com');
      setPassword('Admin@123');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });

      // Store token in memory (Zustand)
      setToken(data.accessToken);
      setUser(data.user);

      // Store minimal user info in IndexedDB for offline PIN
      await db.users.put({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      });

      // Request persistent storage
      if ('storage' in navigator && 'persist' in navigator.storage) {
        await navigator.storage.persist().catch(() => {});
      }

      // Trigger bootstrap sync
      void runSync();

      // Navigate by role
      const role = data.user.role;
      if (role === 'ADMIN' || role === 'HOD') navigate('/admin');
      else if (role === 'TEACHER') navigate('/teacher');
      else if (role === 'STUDENT' || role === 'PARENT') navigate('/student');
      else navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      if (e.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
        setError('Invalid username or password');
      } else {
        setError(e.response?.data?.error?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="page"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #FFEBE8 0%, #FFF3F1 260px, #FFF9F8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 12px 40px rgba(230, 60, 45, 0.08)',
          border: '1px solid rgba(255, 60, 50, 0.08)',
          padding: '2rem 1.75rem',
        }}
      >
        {/* Title (from Screen 1 in reference) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              lineHeight: 1.25,
              color: 'var(--color-text)',
              letterSpacing: '-0.3px',
              marginBottom: '0.25rem',
            }}
          >
            Sign In to Web<br />Attendance Management<br />System
          </h1>
          <p className="text-xs text-muted" style={{ fontWeight: 600 }}>
            College Attendance Management System
          </p>
        </div>

        {/* 3D Illustration Graphic (Screens 1 & 2 in reference) */}
        <div
          style={{
            width: '100%',
            height: 190,
            borderRadius: '18px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            background: '#FFF0EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 20px rgba(255, 60, 40, 0.05)',
          }}
        >
          <img
            src={heroImage}
            alt="3D College Attendance"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Role Selection (Screen 2 in reference) */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              marginBottom: '0.625rem',
            }}
          >
            Select Your Role
          </label>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {(['TEACHER', 'STUDENT', 'ADMIN'] as const).map((role) => {
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.625rem 0.5rem',
                    borderRadius: '999px',
                    border: active ? '2px solid var(--color-primary)' : '1.5px solid #FFDCD7',
                    background: active ? '#FFF0EE' : '#FFFFFF',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: active ? '4px solid var(--color-primary)' : '1.5px solid #A58B87',
                      background: '#FFFFFF',
                      display: 'inline-block',
                    }}
                  />
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs (Screens 2 in reference) */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Username / Email */}
          <div>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="Enter Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                style={{ paddingRight: '2.75rem' }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '1.1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-primary)',
                  fontSize: '1.15rem',
                  pointerEvents: 'none',
                }}
              >
                ✉️
              </span>
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-primary)',
                  fontSize: '1.15rem',
                  padding: '0.25rem',
                  lineHeight: 1,
                }}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                🔒
              </button>
            </div>
          </div>

          {/* Sign In Button (Screens 1 & 2 in reference) */}
          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={loading}
            id="login-submit-btn"
            style={{
              marginTop: '0.5rem',
              height: 52,
              fontSize: '1.05rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px var(--color-primary-glow)',
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }} />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Offline notice */}
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          🔒 Offline-first PWA · Works without internet after login
        </p>
      </div>
    </main>
  );
}
