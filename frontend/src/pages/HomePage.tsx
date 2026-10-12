import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import SyncBadge from '../components/SyncBadge';
import heroImage from '../assets/attendance_3d_hero.jpg';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  function getDashboardRoute() {
    if (!user) return '/login';
    const roleRoutes: Record<string, string> = {
      ADMIN: '/admin',
      TEACHER: '/teacher',
      STUDENT: '/student',
      PARENT: '/parent',
      HOD: '/hod',
    };
    return roleRoutes[user.role] ?? '/login';
  }

  function handleQuickDemo(role: 'ADMIN' | 'TEACHER' | 'STUDENT') {
    navigate('/login', { state: { quickRole: role } });
  }

  return (
    <div className="page" style={{ background: 'linear-gradient(180deg, #FFEBE8 0%, #FFF3F1 320px, #FFF9F8 100%)' }}>
      {/* ─── Navigation Header ─────────────────────────────────────── */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0.875rem 1.25rem',
        }}
      >
        <div
          className="container container--wide"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 0,
          }}
        >
          {/* Brand Logo */}
          <div
            className="flex items-center gap-2"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '11px',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '1.1rem',
                boxShadow: '0 4px 14px var(--color-primary-glow)',
              }}
            >
              ▲
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-text)', letterSpacing: '-0.2px' }}>
                AttendAI
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                College Attendance
              </span>
            </div>
          </div>

          {/* Nav links on desktop */}
          <div className="flex items-center gap-2">
            <SyncBadge />

            {user ? (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => navigate(getDashboardRoute())}
                style={{ fontWeight: 800 }}
              >
                Go to Dashboard ({user.name.split(' ')[0]}) →
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => navigate('/login')}
                  style={{ fontWeight: 700 }}
                >
                  Sign In
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => navigate('/login')}
                  style={{ fontWeight: 800 }}
                >
                  Launch App 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section style={{ padding: '3.5rem 1rem 2.5rem 1rem' }}>
        <div className="container container--wide">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            {/* Hero Left Content */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.875rem',
                  borderRadius: '999px',
                  background: '#FFF0EE',
                  border: '1.5px solid #FFDCD7',
                  color: 'var(--color-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  marginBottom: '1.25rem',
                }}
              >
                <span>✨</span> Offline-First PWA · Anti-Proxy Rotating QR
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.1rem, 5vw, 3.25rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '-0.8px',
                  color: 'var(--color-text)',
                  marginBottom: '1.25rem',
                }}
              >
                Student Attendance<br />
                <span style={{ color: 'var(--color-primary)' }}>Management</span>, Reimagined.
              </h1>

              <p
                style={{
                  fontSize: '1.075rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                  maxWidth: 520,
                }}
              >
                Mark 60 students in under 1 minute. Eliminate proxy attendance with 10-second rotating cryptographic QR codes. Works seamlessly offline even with zero campus Wi-Fi.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', marginBottom: '2rem' }}>
                <button
                  className="btn btn--primary"
                  onClick={() => navigate(getDashboardRoute())}
                  style={{
                    padding: '0.9rem 2rem',
                    fontSize: '1rem',
                    boxShadow: '0 8px 24px var(--color-primary-glow)',
                  }}
                >
                  {user ? 'Open My Dashboard →' : '🚀 Launch App / Sign In'}
                </button>
                <a
                  href="#features"
                  className="btn btn--ghost"
                  style={{
                    padding: '0.9rem 1.75rem',
                    fontSize: '1rem',
                    textDecoration: 'none',
                  }}
                >
                  ⚡ Explore Features
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <span>✓ 100% Offline Ready</span>
                <span>•</span>
                <span>✓ Zero Proxy Guarantee</span>
                <span>•</span>
                <span>✓ Auto 75% Defaulter Alerts</span>
              </div>
            </div>

            {/* Hero Right Visual */}
            <div style={{ position: 'relative' }}>
              <div
                className="card"
                style={{
                  padding: '1rem',
                  background: '#FFFFFF',
                  borderRadius: '28px',
                  boxShadow: '0 20px 60px rgba(230, 60, 45, 0.12)',
                  border: '1px solid rgba(255, 60, 50, 0.12)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={heroImage}
                  alt="AttendAI 3D Platform Illustration"
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '20px',
                    display: 'block',
                    objectFit: 'cover',
                  }}
                />

                {/* Floating stat pill 1 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '1.75rem',
                    left: '1.75rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1.5px solid #FFDCD7',
                    borderRadius: '999px',
                    padding: '0.5rem 1rem',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>⚡</span> &lt; 60s Class Roster
                </div>

                {/* Floating stat pill 2 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '1.75rem',
                    right: '1.75rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1.5px solid #A7F3D0',
                    borderRadius: '999px',
                    padding: '0.5rem 1rem',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>🔒</span> 10s Rotating QR Token
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metric Bar ────────────────────────────────────────────── */}
      <section style={{ padding: '1rem 1rem 3rem 1rem' }}>
        <div className="container container--wide">
          <div
            className="card"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              textAlign: 'center',
              padding: '2rem 1.5rem',
              background: '#FFFFFF',
              borderRadius: '24px',
            }}
          >
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>
                &lt; 60s
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', marginTop: '0.375rem' }}>
                Class Roll Call Speed
              </p>
              <p className="text-xs text-muted">60 students marked in 3 taps</p>
            </div>

            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>
                10s
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', marginTop: '0.375rem' }}>
                Anti-Proxy Rotation
              </p>
              <p className="text-xs text-muted">HMAC-SHA256 live refresh</p>
            </div>

            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#D97706', lineHeight: 1 }}>
                100%
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', marginTop: '0.375rem' }}>
                Offline IndexedDB
              </p>
              <p className="text-xs text-muted">Zero dependency on campus Wi-Fi</p>
            </div>

            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#7C3AED', lineHeight: 1 }}>
                75%
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', marginTop: '0.375rem' }}>
                Automated Defaulter Audit
              </p>
              <p className="text-xs text-muted">Instant shortage calculations</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Core Features Grid ────────────────────────────────────── */}
      <section id="features" style={{ padding: '2rem 1rem 4rem 1rem' }}>
        <div className="container container--wide">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Enterprise Features
            </span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-text)' }}>
              Engineered for Real College Classrooms
            </h2>
            <p className="text-muted" style={{ maxWidth: 560, margin: '0.5rem auto 0 auto' }}>
              Built specifically to overcome network dead zones, proxy attendance, and tedious manual paperwork.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Feature 1 */}
            <div className="card">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: '#FFF0EE',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid #FFDCD7',
                }}
              >
                📡
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Offline-First Sync Engine</h3>
              <p className="text-sm">
                Powered by 8 localized Dexie IndexedDB stores and Workbox Service Worker. Take attendance even in basement lecture halls with zero Wi-Fi; mutations queue in local outbox and sync automatically on reconnect.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid #A7F3D0',
                }}
              >
                📱
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Anti-Proxy Rotating QR</h3>
              <p className="text-sm">
                Cryptographic HMAC tokens update on screen every 10 seconds. Coupled with hardware device fingerprint binding, students cannot screenshot codes to friends outside class.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: '#FFFBEB',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid #FDE68A',
                }}
              >
                ⚡
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>3-Tap High-Speed Roster</h3>
              <p className="text-sm">
                Optimized mobile touch targets with 1-click &quot;Mark All Present&quot; and individual tap toggles for Present, Absent, Late, On Duty, and Leave.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: '#F3E8FF',
                  color: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid #E9D5FF',
                }}
              >
                📊
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Automated Defaulter Reports</h3>
              <p className="text-sm">
                Instantly calculates <code>(P + OD [+LV]) / Total * 100</code>. Flag students below the 75% threshold, view classes required to recover, and export official CSV registers in 1 click.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid #BFDBFE',
                }}
              >
                🏖️
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Leave & Correction Workflows</h3>
              <p className="text-sm">
                Students apply for medical and OD leaves online. Faculty approvals automatically synchronize past and future class records without manual paperwork.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: '#FFF1F2',
                  color: '#E11D48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                  border: '1.5px solid #FECDD3',
                }}
              >
                📜
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Immutable Audit Trail</h3>
              <p className="text-sm">
                Every record modification, session lock, and policy change is permanently preserved in the append-only <code>audit_logs</code> database table with user, timestamp, and IP.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── One-Click Demo Role Accounts ─────────────────────────── */}
      <section style={{ padding: '2rem 1rem 4rem 1rem', background: '#FFFFFF', borderTop: '1px solid var(--color-border)' }}>
        <div className="container container--wide">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Interactive Experience
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--color-text)' }}>
              Test Drive AttendAI by Role
            </h2>
            <p className="text-muted" style={{ maxWidth: 500, margin: '0.5rem auto 0 auto' }}>
              Click any demo account below to immediately explore that user experience:
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Teacher Card */}
            <div
              className="card"
              style={{
                border: '2px solid #FFDCD7',
                background: '#FFF9F8',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="flex items-center gap-1" style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>👨‍🏫</span>
                  <div>
                    <h3 style={{ margin: 0 }}>Faculty / Teacher</h3>
                    <p className="text-xs text-muted">Classroom Attendance & QR</p>
                  </div>
                </div>
                <p className="text-sm" style={{ marginBottom: '1.25rem' }}>
                  3-tap attendance marking, live 10-second rotating QR generator, student roster management, and leave approvals.
                </p>
                <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid #FFDCD7', marginBottom: '1.25rem' }}>
                  <p><strong>Login:</strong> teacher1@attendai.com</p>
                  <p><strong>Pass:</strong> Teacher@123</p>
                </div>
              </div>
              <button
                className="btn btn--primary btn--block btn--sm"
                onClick={() => handleQuickDemo('TEACHER')}
              >
                Log in as Teacher →
              </button>
            </div>

            {/* Student Card */}
            <div
              className="card"
              style={{
                border: '2px solid #A7F3D0',
                background: '#F6FDF9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="flex items-center gap-1" style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>🎓</span>
                  <div>
                    <h3 style={{ margin: 0 }}>Student</h3>
                    <p className="text-xs text-muted">Attendance Meter & QR Scan</p>
                  </div>
                </div>
                <p className="text-sm" style={{ marginBottom: '1.25rem' }}>
                  Overall percentage meter, 75% defaulter threshold warning, 8-char live QR scanner, history, and leave apply.
                </p>
                <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid #A7F3D0', marginBottom: '1.25rem' }}>
                  <p><strong>Login:</strong> student1@attendai.com</p>
                  <p><strong>Pass:</strong> Student@123</p>
                </div>
              </div>
              <button
                className="btn btn--primary btn--block btn--sm"
                style={{ background: '#059669' }}
                onClick={() => handleQuickDemo('STUDENT')}
              >
                Log in as Student →
              </button>
            </div>

            {/* Admin Card */}
            <div
              className="card"
              style={{
                border: '2px solid #FDE68A',
                background: '#FFFDF6',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="flex items-center gap-1" style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>⚙️</span>
                  <div>
                    <h3 style={{ margin: 0 }}>Administrator / HOD</h3>
                    <p className="text-xs text-muted">College Governance & Rules</p>
                  </div>
                </div>
                <p className="text-sm" style={{ marginBottom: '1.25rem' }}>
                  Live college stats, academic department setup, CSV student bulk upload, policy threshold rules, and audit trail.
                </p>
                <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid #FDE68A', marginBottom: '1.25rem' }}>
                  <p><strong>Login:</strong> admin@attendai.com</p>
                  <p><strong>Pass:</strong> Admin@123</p>
                </div>
              </div>
              <button
                className="btn btn--primary btn--block btn--sm"
                style={{ background: '#D97706' }}
                onClick={() => handleQuickDemo('ADMIN')}
              >
                Log in as Admin →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer
        style={{
          background: 'var(--color-surface-2)',
          borderTop: '1px solid var(--color-border)',
          padding: '2.5rem 1rem',
          textAlign: 'center',
          fontSize: '0.875rem',
        }}
      >
        <div className="container container--wide">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-1">
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                ▲ AttendAI
              </span>
              <span className="text-xs text-muted">• College Attendance Management System</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span>React 19</span>
              <span>•</span>
              <span>Node.js / Express</span>
              <span>•</span>
              <span>PostgreSQL 16 (Prisma)</span>
              <span>•</span>
              <span>Redis 7</span>
              <span>•</span>
              <span>PWA Offline</span>
            </div>
          </div>

          <p className="text-xs text-muted">
            Designed &amp; built for higher education institutions. Open-source under MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
