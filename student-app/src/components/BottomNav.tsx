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
      background: 'rgba(19, 25, 39, 0.95)',
      backdropFilter: 'blur(18px)',
      borderTop: '1px solid var(--color-border)',
      paddingBottom: 'calc(var(--sab) + 6px)',
      paddingTop: '6px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center'
    }}>
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.path ? location.pathname === item.path : false;

        if (item.isHero) {
          return (
            <button
              key={index}
              onClick={item.action}
              style={{
                position: 'relative',
                top: '-14px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                border: '4px solid var(--color-bg)',
                borderRadius: '50%',
                width: '54px',
                height: '54px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(59, 130, 246, 0.5)',
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
              color: isActive ? '#3B82F6' : 'var(--color-text-faint)',
              cursor: 'pointer',
              transition: 'color 0.15s ease'
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: '11px', fontWeight: isActive ? '700' : '500' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
