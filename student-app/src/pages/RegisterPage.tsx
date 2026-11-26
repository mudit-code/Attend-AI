import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { GraduationCap, Lock, Mail, User, Hash, Phone, Building2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface SectionOption {
  id: number;
  name: string;
  semester?: number;
  academicYear?: string;
  branch?: {
    id: number;
    name: string;
    code: string;
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [phone, setPhone] = useState('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSections() {
      try {
        const res = await api.get('/auth/sections');
        const data = res.data.data || res.data;
        if (Array.isArray(data)) {
          setSections(data);
          if (data.length > 0) {
            setSectionId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load sections:', err);
      } finally {
        setLoadingSections(false);
      }
    }
    fetchSections();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !rollNo.trim() || !password || !sectionId) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'STUDENT',
        rollNo: rollNo.trim().toUpperCase(),
        sectionId: Number(sectionId),
        phone: phone.trim() ? phone.trim() : undefined,
      };

      const res = await api.post('/auth/register', payload);
      const { accessToken, user } = res.data;

      setSuccess(true);
      setTimeout(() => {
        if (accessToken && user) {
          setAuth(accessToken, user);
          navigate('/');
        } else {
          navigate('/login');
        }
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please verify your details.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(ellipse at 50% 0%, #1A2238 0%, #0B0F19 75%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '32px 24px',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            marginBottom: '12px'
          }}>
            <GraduationCap size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF' }}>
            Student Registration
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Register your institutional profile to track attendance and submit assignments
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#FCA5A5',
            fontSize: '13px',
            marginBottom: '18px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#6EE7B7',
            fontSize: '13px',
            marginBottom: '18px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>Registration successful! Launching your portal...</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
              Full Name *
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-faint)' }} />
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
              College Email *
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-faint)' }} />
              <input
                type="email"
                placeholder="rahul@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Roll No and Phone in 2 Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                Roll Number *
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Hash size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-faint)' }} />
                <input
                  type="text"
                  placeholder="23CSE042"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 36px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                Phone (Optional)
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-faint)' }} />
                <input
                  type="tel"
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 36px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
              Academic Section & Branch *
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              <Building2 size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-faint)' }} />
              <select
                value={sectionId}
                onChange={(e) => setSectionId(Number(e.target.value))}
                required
                disabled={loadingSections}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {loadingSections ? (
                  <option value="" style={{ background: '#131927' }}>Loading institutional sections...</option>
                ) : sections.length === 0 ? (
                  <option value="" style={{ background: '#131927' }}>No sections found. Contact Admin.</option>
                ) : (
                  sections.map((sec) => (
                    <option key={sec.id} value={sec.id} style={{ background: '#131927' }}>
                      {sec.name} {sec.branch?.code ? `(${sec.branch.code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                Password *
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Lock size={15} style={{ position: 'absolute', left: '10px', color: 'var(--color-text-faint)' }} />
                <input
                  type="password"
                  placeholder="Min 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 10px 11px 32px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                Confirm *
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Lock size={15} style={{ position: 'absolute', left: '10px', color: 'var(--color-text-faint)' }} />
                <input
                  type="password"
                  placeholder="Re-enter"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 10px 11px 32px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || success}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '13px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: '10px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              opacity: submitting ? 0.7 : 1,
              transition: 'transform 0.15s ease'
            }}
          >
            {submitting ? 'Registering Student Account...' : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Login Footer Link */}
        <div style={{
          marginTop: '22px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-text-muted)'
        }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: '#3B82F6',
              fontWeight: '700',
              textDecoration: 'none'
            }}
          >
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
