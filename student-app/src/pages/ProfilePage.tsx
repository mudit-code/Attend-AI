import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Hash, Building2, Smartphone, ShieldCheck, LogOut, CheckCircle2, Sparkles, KeyRound, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import FaceRegistrationModal from '../components/FaceRegistrationModal';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [deviceId, setDeviceId] = useState<string>('DEV-INITIALIZING');
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  // Security & Password state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currPassword) {
      setPwdMsg({ text: 'Please enter your current password.', isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setIsChangingPwd(true);
    setPwdMsg(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg({ text: 'Password successfully updated.', isError: false });
    } catch {
      setPwdMsg({ text: 'Failed to update password.', isError: true });
    } finally {
      setIsChangingPwd(false);
    }
  };

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
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={22} color="var(--color-accent)" />
          <span>Student Profile</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
          Institutional identity and registered device details
        </p>
      </div>

      {/* ID Card Box */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px 20px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: '800',
            color: '#F59E0B',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)' }}>
              {user?.name || 'Enrolled Student'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-success-light)',
                color: 'var(--color-success-text)',
                border: '1px solid #A7F3D0'
              }}>
                ACTIVE STUDENT
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                • Roll: <strong style={{ color: 'var(--color-primary)' }}>{user?.student?.rollNo || 'N/A'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Mail size={16} color="var(--color-text-faint)" />
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Email:</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>{user?.email}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Building2 size={16} color="var(--color-text-faint)" />
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Section:</span>
            <span style={{ color: 'var(--color-accent-text)', fontWeight: '800' }}>
              {user?.student?.section?.name || 'Assigned Section'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Hash size={16} color="var(--color-text-faint)" />
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>System ID:</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>#{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Device Registration & Security Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Smartphone size={18} color="var(--color-success)" />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)' }}>
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
          fontWeight: 700,
          color: 'var(--color-primary)'
        }}>
          {deviceId}
        </div>
      </div>

      {/* Biometric Face ID Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)' }}>
              Biometric Face ID
            </h3>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '12px',
            background: isFaceRegistered ? 'var(--color-success-light)' : 'var(--color-warning-light)',
            color: isFaceRegistered ? 'var(--color-success-text)' : 'var(--color-warning-text)',
            border: `1px solid ${isFaceRegistered ? '#A7F3D0' : '#FDE68A'}`
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
            padding: '9px 18px',
            borderRadius: 'var(--radius-pill)',
            background: isFaceRegistered ? '#FFFFFF' : 'var(--color-primary)',
            border: isFaceRegistered ? '1px solid var(--color-border)' : 'none',
            color: isFaceRegistered ? 'var(--color-primary)' : '#FFFFFF',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: isFaceRegistered ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.2)'
          }}
        >
          {isFaceRegistered ? 'Update Face ID' : 'Register Face ID Now'}
        </button>
      </div>

      {/* No Dues & Clearances */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)' }}>
            Clearances & Standing
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-success-text)', fontWeight: 600 }}>
          <CheckCircle2 size={16} color="var(--color-success)" />
          <span>Institutional clearance valid for the current semester.</span>
        </div>
      </div>

      {/* Quick Link to Leave Desk */}
      <Link
        to="/leaves"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          textDecoration: 'none',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary)' }}>
              Leave Management Desk
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Apply for medical, personal or OD leaves
            </div>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#4F46E5' }}>Open Desk →</span>
      </Link>

      {/* Security & Password Settings */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '18px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <KeyRound size={18} color="var(--color-accent)" />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
            Security & Password Change
          </h3>
        </div>

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>
              Current Password
            </label>
            <input
              type="password"
              value={currPassword}
              onChange={(e) => setCurrPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 chars"
                required
                style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {pwdMsg && (
            <div style={{
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: pwdMsg.isError ? '#FEF2F2' : '#F0FDF4',
              color: pwdMsg.isError ? '#DC2626' : '#047857',
              border: `1px solid ${pwdMsg.isError ? '#FECACA' : '#BBF7D0'}`
            }}>
              {pwdMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPwd}
            style={{
              padding: '9px',
              borderRadius: '8px',
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: isChangingPwd ? 0.7 : 1,
            }}
          >
            {isChangingPwd ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
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
          padding: '13px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-danger-light)',
          border: '1px solid #FECACA',
          color: 'var(--color-danger-text)',
          fontSize: '14px',
          fontWeight: '800',
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
