import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { db } from '../lib/db';
import { runSync } from '../lib/syncEngine';
import BrandLogo from '../components/common/BrandLogo';

export default function DemoPortalPage() {
  const navigate = useNavigate();
  const { setToken, setUser, unlockApp } = useAuthStore();

  function handle1ClickDemoLogin(targetRole: 'STUDENT' | 'TEACHER' | 'ADMIN') {
    const demoUser =
      targetRole === 'STUDENT'
        ? {
            id: 1,
            name: 'Aman Kumar',
            email: 'student1@attendai.com',
            role: 'STUDENT' as const,
            student: { id: 1, sectionId: 1, rollNo: '2101640100015' },
          }
        : targetRole === 'TEACHER'
        ? {
            id: 2,
            name: 'Dr. Rajesh Sharma',
            email: 'teacher1@attendai.com',
            role: 'TEACHER' as const,
            teacher: { id: 1, departmentId: 1 },
          }
        : {
            id: 3,
            name: 'Dean Academics',
            email: 'admin@attendai.com',
            role: 'ADMIN' as const,
          };

    unlockApp();
    setToken(`token-${targetRole.toLowerCase()}-demo-attendai`);
    setUser(demoUser);

    void db.users
      .put({
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
      })
      .catch(() => {});

    void runSync();

    if (targetRole === 'STUDENT') navigate('/student');
    else if (targetRole === 'TEACHER') navigate('/teacher');
    else navigate('/admin');
  }

  return (
    <div className="page" style={{ background: 'var(--color-bg)', minHeight: '100dvh' }}>
      {/* ─── Top Navigation Header ─────────────────────────────────── */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
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
          <BrandLogo size="md" subtitle="Interactive Sandbox Hub" onClick={() => navigate('/')} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="btn btn--ghost btn--sm"
              style={{ fontWeight: 600 }}
            >
              ← Homepage
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn--primary btn--sm"
              style={{ fontWeight: 700 }}
            >
              Institutional Login →
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '2rem 1rem 3rem' }}>
        <div className="container container--wide" style={{ maxWidth: 1100 }}>
          {/* Greeting & Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span
              className="badge"
              style={{
                background: '#FEF3C7',
                color: '#B45309',
                borderColor: '#FDE68A',
                fontWeight: 800,
                fontSize: '0.8rem',
                padding: '0.35rem 0.85rem',
                marginBottom: '0.85rem',
              }}
            >
              ⚡ LIVE INTERACTIVE SANDBOX
            </span>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 800,
                color: 'var(--color-text)',
                letterSpacing: '-0.5px',
                marginBottom: '0.5rem',
              }}
            >
              Explore AttendAI as Any Stakeholder
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--color-text-muted)',
                maxWidth: 620,
                margin: '0 auto',
              }}
            >
              Test and experience the complete college attendance management system with 1-click pre-loaded demo profiles. No credentials required.
            </p>
          </div>

          {/* 3 Sandbox Role Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              alignItems: 'stretch',
            }}
          >
            {/* 1. Student Sandbox Card */}
            <div
              className="trombone-kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.75rem',
                borderRadius: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span
                    className="badge"
                    style={{
                      background: '#ECFDF5',
                      color: '#059669',
                      borderColor: '#A7F3D0',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  >
                    🎓 STUDENT DESK
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                    Roll: 2101640100015
                  </span>
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                  Aman Kumar
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  B.Tech Computer Science &amp; Engineering · 6th Semester (Sec 3A)
                </p>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Key Sandbox Features
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Realtime Attendance Radar (Shortage alerts)
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Interactive Bunk &amp; Safe Margin Calculator
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Semester Timetable &amp; Leave Sanction Desk
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Sessional Marksheet &amp; Fee Receipts
                    </li>
                  </ul>
                </div>
              </div>

              <button
                id="btn-demo-student"
                className="btn btn--primary btn--block"
                onClick={() => handle1ClickDemoLogin('STUDENT')}
                style={{ fontWeight: 800 }}
              >
                Launch Student Portal →
              </button>
            </div>

            {/* 2. Teacher Sandbox Card */}
            <div
              className="trombone-kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.75rem',
                borderRadius: '20px',
                border: '1.5px solid var(--color-accent)',
                boxShadow: '0 8px 30px rgba(245, 158, 11, 0.1)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                  color: '#0F172A',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '2px 10px',
                  borderRadius: '999px',
                  letterSpacing: '0.04em',
                }}
              >
                RECOMMENDED DEMO
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span
                    className="badge"
                    style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      borderColor: '#FDE68A',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  >
                    👨‍🏫 FACULTY SCANNER
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                    Code: FAC-KIT-204
                  </span>
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                  Dr. Rajesh Sharma
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  Associate Professor · Department of Computer Science &amp; Engineering
                </p>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Key Sandbox Features
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Interactive Attendance Grid (P / A / L / LV / OD)
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> 1-Tap Quick Mark (All Present / Reset)
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Offline Dexie Queue &amp; Auto-sync
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Single-Date Snapshot &amp; Defaulter Alerts
                    </li>
                  </ul>
                </div>
              </div>

              <button
                id="btn-demo-teacher"
                className="btn btn--accent btn--block"
                onClick={() => handle1ClickDemoLogin('TEACHER')}
                style={{ fontWeight: 800 }}
              >
                Launch Teacher Portal →
              </button>
            </div>

            {/* 3. Admin Sandbox Card */}
            <div
              className="trombone-kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.75rem',
                borderRadius: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span
                    className="badge"
                    style={{
                      background: '#EFF6FF',
                      color: '#1E40AF',
                      borderColor: '#BFDBFE',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                    }}
                  >
                    🏛️ INSTITUTIONAL ERP
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                    Central Admin Cell
                  </span>
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                  Dean Academics
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  Central Academic Office · Campus-wide Academic Management
                </p>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Key Sandbox Features
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Academic Setup Desk (Branch, Course, Section)
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> AKTU Debarred List Export (&lt;75% Attendance)
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> Institutional Timetable &amp; Lecture Schedule
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#F59E0B' }}>●</span> No-Dues Clearance &amp; Grievance Redressal
                    </li>
                  </ul>
                </div>
              </div>

              <button
                id="btn-demo-admin"
                className="btn btn--primary btn--block"
                onClick={() => handle1ClickDemoLogin('ADMIN')}
                style={{ fontWeight: 800 }}
              >
                Launch Admin Portal →
              </button>
            </div>
          </div>

          {/* Bottom Security / Production Assurance Note */}
          <div
            style={{
              marginTop: '3rem',
              padding: '1.25rem 1.5rem',
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                Looking for Real Institutional Authentication?
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Registered students, faculties, and college officials can sign in using institutional credentials.
              </span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="btn btn--ghost btn--sm"
              style={{ fontWeight: 700 }}
            >
              Sign In to Real ERP →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
