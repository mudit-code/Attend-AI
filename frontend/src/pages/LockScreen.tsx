import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../lib/api';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { unlockApp, setToken, user } = useAuthStore();

  async function handleUnlock() {
    if (pin.length < 4) return;
    setLoading(true);
    setError('');

    try {
      // Try to refresh token using HttpOnly cookie
      const { data } = await api.post('/auth/refresh');
      setToken(data.accessToken);
      unlockApp();
    } catch {
      setError('Session expired. Please login again.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } finally {
      setLoading(false);
    }
  }

  function handlePinInput(digit: string) {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length >= 4) {
        setTimeout(() => handleUnlock(), 200);
      }
    }
  }

  return (
    <main
      className="page"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.1) 0%, var(--color-bg) 70%)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
        minHeight: '100dvh',
      }}
    >
      <div className="container" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ marginBottom: '0.5rem' }}>Screen Locked</h2>
        <p className="text-muted text-sm" style={{ marginBottom: '2rem' }}>
          {user?.name ?? 'Your session'} is locked due to inactivity
        </p>

        {/* PIN dots display */}
        <div className="flex items-center" style={{ justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[0,1,2,3,4,5].map((i) => (
            <div
              key={i}
              style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < pin.length ? 'var(--color-primary)' : 'var(--color-surface-2)',
                border: '2px solid',
                borderColor: i < pin.length ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {/* PIN Pad */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem', maxWidth: 240, margin: '0 auto 1.5rem',
          }}
        >
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === '⌫') setPin(pin.slice(0,-1));
                else if (key !== '') handlePinInput(key);
              }}
              disabled={key === '' || loading}
              className="btn"
              style={{
                background: key === '' ? 'transparent' : 'var(--color-surface-2)',
                border: key === '' ? 'none' : '1px solid var(--color-border)',
                fontSize: '1.25rem', fontWeight: '600',
                height: 64, borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
              }}
            >
              {loading && key === '0' ? <div className="spinner" /> : key}
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          className="btn btn--ghost btn--sm"
          onClick={() => { window.location.href = '/login'; }}
        >
          Sign in with password instead
        </button>
      </div>
    </main>
  );
}
