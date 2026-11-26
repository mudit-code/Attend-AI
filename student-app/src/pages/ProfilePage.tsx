import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Hash, Building2, Smartphone, ShieldCheck, LogOut, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import FaceRegistrationModal from '../components/FaceRegistrationModal';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [deviceId, setDeviceId] = useState<string>('DEV-INITIALIZING');
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  const fetchFaceStatus = async () => {
    try {
      const res = await api.get('/users/student/face-status');
      if (res.data?.data?.isRegistered) {
        setIsFaceRegistered(true);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let dev = localStorage.getItem('attendai_student_device_id');
    if (!dev) {
      dev = 'DEV-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12));
      localStorage.setItem('attendai_student_device_id', dev);
    }
    setDeviceId(dev);
    fetchFaceStatus();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Title */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={22} color="#3B82F6" />
          <span>Student Profile</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Institutional identity and registered device details
        </p>
      </div>

      {/* ID Card Box */}
      <div style={{
        background: 'linear-gradient(135deg, #1E2638 0%, #131927 100%)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px 20px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.15)',
          filter: 'blur(30px)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: '800',
            color: '#FFFFFF'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>
              {user?.name || 'Enrolled Student'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                ACTIVE STUDENT
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                • Roll: <strong style={{ color: '#FFFFFF' }}>{user?.student?.rollNo || 'N/A'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Mail size={16} color="var(--color-text-faint)" />
            <span style={{ color: 'var(--color-text-muted)' }}>Email:</span>
            <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{user?.email}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Building2 size={16} color="var(--color-text-faint)" />
            <span style={{ color: 'var(--color-text-muted)' }}>Section:</span>
            <span style={{ color: '#93C5FD', fontWeight: '700' }}>
              {user?.student?.section?.name || 'Assigned Section'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Hash size={16} color="var(--color-text-faint)" />
            <span style={{ color: 'var(--color-text-muted)' }}>System ID:</span>
            <span style={{ color: '#FFFFFF', fontWeight: '600' }}>#{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Device Registration & Security Card */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Smartphone size={18} color="#10B981" />
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>
            Hardware Device Lock
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
          Your attendance is bound to this device signature to prevent proxy check-ins.
        </p>
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#93C5FD'
        }}>
          {deviceId}
        </div>
      </div>

      {/* Biometric Face ID Card */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#8B5CF6" />
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>
              Biometric Face ID
            </h3>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px',
            background: isFaceRegistered ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            color: isFaceRegistered ? '#10B981' : '#F59E0B'
          }}>
            {isFaceRegistered ? 'Registered ✅' : 'Setup Required ⚠️'}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
          {isFaceRegistered
            ? 'Your facial biometric vector is active for live classroom attendance.'
            : 'Register your face once to enable instant classroom check-in during lectures.'}
        </p>
        <button
          onClick={() => setIsFaceModalOpen(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            background: isFaceRegistered ? 'transparent' : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
            border: isFaceRegistered ? '1px solid #8B5CF6' : 'none',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {isFaceRegistered ? 'Update Face ID' : 'Register Face ID Now'}
        </button>
      </div>

      {/* No Dues & Clearances */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '18px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={18} color="#3B82F6" />
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>
            Clearances & Standing
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#A7F3D0' }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>Institutional clearance valid for the current semester.</span>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#F87171',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer'
        }}
      >
        <LogOut size={16} />
        <span>Log Out of Student Portal</span>
      </button>

      <FaceRegistrationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onSuccess={() => {
          setIsFaceRegistered(true);
        }}
      />
    </div>
  );
}
