import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, QrCode, DoorOpen, User } from 'lucide-react';

interface BottomNavProps {
  onOpenScanner?: () => void;
}

export default function BottomNav({ onOpenScanner }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Timetable', path: '/timetable', icon: Calendar },
    { label: 'Scan QR', action: onOpenScanner, icon: QrCode, isHero: true },
    { label: 'Gate Pass', path: '/gatepass', icon: DoorOpen },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.96)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderTop: '1px solid var(--color-border)',
      paddingBottom: 'calc(var(--sab) + 6px)',
      paddingTop: '6px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.path ? location.pathname === item.path : false;

        if (item.isHero) {
          return (
            <button
              key={index}
              onClick={item.action}
              aria-label="Scan QR Code"
              style={{
                position: 'relative',
                top: '-14px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#F59E0B',
                border: '4px solid var(--color-bg)',
                borderRadius: '50%',
                width: '54px',
                height: '54px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.28)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              <Icon size={24} />
            </button>
          );
        }

        return (
          <button
            key={index}
            onClick={() => item.path && navigate(item.path)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'color 0.15s ease'
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: '11px', fontWeight: isActive ? '800' : '600' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
