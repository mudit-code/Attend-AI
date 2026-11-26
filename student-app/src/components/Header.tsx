import { useAuthStore } from '../stores/useAuthStore';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--color-border)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Brand & Student Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Trombone Amber Squircle Icon */}
        <div style={{
          width: '36px',
          height: '36px',
          minWidth: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0F172A',
          fontWeight: '900',
          fontSize: '1.25rem',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
        }}>
          a
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-0.3px' }}>
              attend<span style={{ color: 'var(--color-accent)' }}>.ai</span>
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 7px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-accent-light)',
              color: 'var(--color-accent-text)',
              border: '1px solid #FDE68A'
            }}>
              STUDENT
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.2', fontWeight: 600 }}>
            {user?.name || 'Student Portal'} {user?.student?.rollNo ? `• ${user.student.rollNo}` : ''}
          </p>
        </div>
      </div>

      {/* Logout Action */}
      <button
        onClick={handleLogout}
        title="Sign Out"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
