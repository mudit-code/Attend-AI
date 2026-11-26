import { useAuthStore } from '../stores/useAuthStore';
import { GraduationCap, LogOut } from 'lucide-react';
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
      background: 'rgba(19, 25, 39, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--color-border)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Brand & Student Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
        }}>
          <GraduationCap size={22} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              Attend<span style={{ color: '#3B82F6' }}>AI</span>
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60A5FA',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              STUDENT
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: '1.2' }}>
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
          gap: '6px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          color: 'var(--color-text-muted)',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <LogOut size={15} />
        <span style={{ display: 'none' }}>Logout</span>
      </button>
    </header>
  );
}
