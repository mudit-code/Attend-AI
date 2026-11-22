import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { db } from '../lib/db';
import { runSync } from '../lib/syncEngine';
import heroImage from '../assets/attendance_3d_hero.jpg';
import BrandLogo from '../components/common/BrandLogo';

interface RegistrationSection {
  id: number;
  name: string;
  year: number;
  course: {
    name: string;
    department: { name: string };
  };
}

const COLLEGE_BRANCHES: { id: string; name: string }[] = [];
const ACADEMIC_YEARS: string[] = [];
const ACADEMIC_SECTIONS: string[] = [];
const TEACHER_DESIGNATIONS: string[] = [];
const ADMIN_ROLE_TYPES: string[] = [];

interface RegistrationDepartment {
  id: number;
  name: string;
  code: string;
}

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<'TEACHER' | 'STUDENT' | 'ADMIN'>('TEACHER');

  // Login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register credentials
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Student specific fields
  const [rollNo, setRollNo] = useState('');
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [branch, setBranch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const [sections, setSections] = useState<RegistrationSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsLoadError, setSectionsLoadError] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [departments] = useState<RegistrationDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departmentsLoading] = useState(false);
  const [departmentLoadError] = useState('');
  const [designation, setDesignation] = useState('');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherSection, setClassTeacherSection] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [adminBranch, setAdminBranch] = useState('');
  const [adminRoleType, setAdminRoleType] = useState('');

  // OAuth Modal state
  const [oauthModalOpen, setOauthModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, setUser, unlockApp } = useAuthStore();

  useEffect(() => {
    const quick = (location.state as any)?.quickRole;
    if (quick === 'TEACHER' || quick === 'STUDENT' || quick === 'ADMIN') {
      handleSelectRole(quick);
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    api.get<{ data: RegistrationSection[] }>('/auth/sections')
      .then(({ data }) => {
        if (cancelled) return;
        setSections(data.data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setSectionsLoadError(
          err.response?.data?.error?.message || 'Could not load available classes. Check the backend connection and refresh.'
        );
      })
      .finally(() => {
        if (!cancelled) setSectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectRole(role: 'TEACHER' | 'STUDENT' | 'ADMIN') {
    setSelectedRole(role);
    setError('');
    setSuccessMsg('');
  }

  // Handle standard login
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });

      unlockApp();
      setToken(data.accessToken);
      setUser(data.user);

      await db.users.put({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      });

      if ('storage' in navigator && 'persist' in navigator.storage) {
        await navigator.storage.persist().catch(() => {});
      }

      void runSync();

      const role = data.user.role;
      if (role === 'ADMIN' || role === 'HOD') navigate('/admin');
      else if (role === 'TEACHER') navigate('/teacher');
      else if (role === 'STUDENT' || role === 'PARENT') navigate('/student');
      else navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(err.response?.data?.error?.message || 'Invalid email or password.');
      } else {
        setError(err.response?.data?.error?.message || 'Unable to sign in. Check that the backend is running and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle account registration
  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (selectedRole !== 'STUDENT') {
      setError('Teacher and administrator accounts are created by an administrator.');
      return;
    }
    if (!rollNo.trim() || !sectionId) {
      setError('Enter your official roll number and select your class.');
      return;
    }
    if (sectionsLoading || sectionsLoadError || sections.length === 0) {
      setError(sectionsLoadError || 'No classes are currently available for student registration.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email: regEmail,
        password: regPassword,
        role: 'STUDENT',
        phone: phone || undefined,
        rollNo: rollNo.trim(),
        sectionId,
      };

      const { data } = await api.post('/auth/register', payload);

      setToken(data.accessToken);
      setUser(data.user);

      await db.users.put({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      });

      setSuccessMsg('Account created successfully! Loading your dashboard...');
      setTimeout(() => navigate('/student'), 500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Check that the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  }

  function completeOAuth(_selectedEmail: string, _selectedName: string) {
    setOauthModalOpen(false);
    setError('Google sign-in is unavailable because no OAuth provider is configured.');
  }

  return (
    <main className="page auth-page">
      <div className="auth-shell">
        <section className="auth-story">
          <div className="auth-story-brand">
            <BrandLogo size="lg" subtitle="Institutional Campus Access" onClick={() => navigate('/')} />
          </div>

          <div className="auth-story-heading">
            <h1>
              {authMode === 'LOGIN' ? 'Welcome to your campus portal' : 'Create your student account'}
            </h1>
            <p>
              {authMode === 'LOGIN'
                ? 'A clear, connected view of your campus day.'
                : 'Register with your institutional details to get started.'}
            </p>
          </div>

          <div className="auth-story-art" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
        </section>

        <section className="auth-form-panel">
        {/* Auth Mode Toggle Tabs (Sign In / Register) */}
        <div
          style={{
            display: 'flex',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode('LOGIN');
              setError('');
              setSuccessMsg('');
            }}
            id="tab-sign-in"
            style={{
              flex: 1,
              padding: '0.5rem 0',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'LOGIN' ? '#FFFFFF' : 'transparent',
              color: authMode === 'LOGIN' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '0.875rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: authMode === 'LOGIN' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
             Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('REGISTER');
              setError('');
              setSuccessMsg('');
              handleSelectRole('STUDENT');
            }}
            id="tab-register"
            style={{
              flex: 1,
              padding: '0.5rem 0',
              borderRadius: '9px',
              border: 'none',
              background: authMode === 'REGISTER' ? '#FFFFFF' : 'transparent',
              color: authMode === 'REGISTER' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '0.875rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: authMode === 'REGISTER' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
             Register / Sign Up
          </button>
        </div>

        {/* Role Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label
              style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: 'var(--color-text)',
              }}
            >
              Select Your Role
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700 }}>
              {selectedRole === 'STUDENT' ? ' Student Portal' : selectedRole === 'TEACHER' ? ' Faculty Portal' : ' Admin Cell'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            {(['TEACHER', 'STUDENT', 'ADMIN'] as const).map((role) => {
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  id={`role-btn-${role.toLowerCase()}`}
                  onClick={() => handleSelectRole(role)}
                  disabled={authMode === 'REGISTER' && role !== 'STUDENT'}
                  className="auth-role-option"
                  aria-pressed={active}
                >
                  <span className="auth-role-indicator" aria-hidden="true" />
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>

            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              background: '#E8F5E9',
              color: '#2E7D32',
              border: '1px solid #A5D6A7',
              fontWeight: 700,
            }}
          >
            {successMsg}
          </div>
        )}

        {/* ─── TAB 1: SIGN IN FORM ─── */}
        {authMode === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Email / Username */}
            <div>
              <div style={{ position: 'relative' }}>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="Enter Username / Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  style={{ paddingRight: '2.75rem', height: 46 }}
                />

              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: '2.75rem', height: 46 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-primary)',
                    fontSize: '1.1rem',
                    padding: '0.25rem',
                    lineHeight: 1,
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >

                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading}
              id="login-submit-btn"
              style={{
                marginTop: '0.25rem',
                height: 48,
                fontSize: '1rem',
                fontWeight: 800,
                boxShadow: '0 8px 20px var(--color-primary-glow)',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                  Entering Dashboard...
                </>
              ) : (
                `Sign In as ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} →`
              )}
            </button>
          </form>
        ) : (
          /* ─── TAB 2: REGISTER / SIGN UP FORM ─── */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Basic Info: Full Name & Mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                   Full Name *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  className="input"
                  placeholder="Full Name (e.g. Aman Kumar)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  style={{ height: 42, fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                   Mobile Number *
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  className="input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                  style={{ height: 42, fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                 Institutional College Email *
              </label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder={
                  selectedRole === 'STUDENT'
                    ? 'Student College Email (e.g. aman@kit.ac.in)'
                    : selectedRole === 'TEACHER'
                    ? 'Faculty Email (e.g. teacher@kit.ac.in)'
                    : 'Admin Email (e.g. admin@kit.ac.in)'
                }
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                disabled={loading}
                style={{ height: 42, fontSize: '0.85rem' }}
              />
            </div>

            {/* Role-Specific Fields */}
            {selectedRole === 'STUDENT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Roll No & Year */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                       AKTU / University Roll No *
                    </label>
                    <input
                      id="reg-rollno"
                      type="text"
                      className="input"
                      placeholder="e.g. 2101640100015"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      required
                      disabled={loading}
                      style={{ height: 42, fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'none' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                       Academic Year *
                    </label>
                    <select
                      id="reg-student-year"
                      className="input"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      disabled={loading}
                      style={{ height: 42, fontSize: '0.82rem', background: '#FFF0EE', border: '1.5px solid #FFDCD7' }}
                    >
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y} style={{ background: '#FFFFFF', color: '#1E293B' }}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branch / Department Dropdown */}
                <div style={{ display: 'none' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                     Department / Branch *
                  </label>
                  <select
                    id="reg-student-branch"
                    className="input"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={loading}
                    style={{ height: 42, fontSize: '0.82rem', background: '#FFF0EE', border: '1.5px solid #FFDCD7' }}
                  >
                    {COLLEGE_BRANCHES.slice(1).map((b) => (
                      <option key={b.id} value={b.name} style={{ background: '#FFFFFF', color: '#1E293B' }}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live class options from the database */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                    Class *
                  </label>
                  <select
                    id="reg-student-section"
                    className="input"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')}
                    disabled={loading || sectionsLoading || sections.length === 0}
                    required
                    style={{ height: 42, fontSize: '0.82rem', background: '#FFF0EE', border: '1.5px solid #FFDCD7' }}
                  >
                    <option value="">
                      {sectionsLoading ? 'Loading classes...' : sections.length ? 'Select your class' : 'No classes available'}
                    </option>
                    {sections.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.course.department.name} - {entry.course.name} - Year {entry.year} - {entry.name}
                      </option>
                    ))}
                  </select>
                  {sectionsLoadError && <p role="alert" className="text-xs" style={{ color: '#B42318' }}>{sectionsLoadError}</p>}
                </div>

                {/* Parent / Guardian Alert Box */}
                <div
                  style={{
                    display: 'none',
                    background: 'rgba(255, 60, 40, 0.04)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.75rem',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                       Parent / Guardian Alerts
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Attendance & SMS</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      id="reg-parent-name"
                      type="text"
                      className="input"
                      placeholder="Parent / Guardian Name"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      disabled={loading}
                      style={{ height: 38, fontSize: '0.8rem', background: '#FFFFFF' }}
                    />
                    <input
                      id="reg-parent-phone"
                      type="tel"
                      className="input"
                      placeholder="Parent Mobile Number"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      disabled={loading}
                      style={{ height: 38, fontSize: '0.8rem', background: '#FFFFFF' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'TEACHER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Faculty ID & Designation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                       Faculty Employee Code *
                    </label>
                    <input
                      id="reg-empcode"
                      type="text"
                      className="input"
                      placeholder="e.g. FAC-KIT-204"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      required
                      disabled={loading}
                      style={{ height: 42, fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                       Designation / Post *
                    </label>
                    <select
                      id="reg-teacher-designation"
                      className="input"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      disabled={loading}
                      style={{ height: 42, fontSize: '0.82rem', background: '#FFF0EE', border: '1.5px solid #FFDCD7' }}
                    >
                      {TEACHER_DESIGNATIONS.map((d) => (
                        <option key={d} value={d} style={{ background: '#FFFFFF', color: '#1E293B' }}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department Dropdown */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                     Academic Department *
                  </label>
                  <select
                    id="reg-teacher-department"
                    className="input"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                    disabled={loading || departmentsLoading || departments.length === 0}
                    style={{ height: 42, fontSize: '0.82rem', background: '#FFF0EE', border: '1.5px solid #FFDCD7' }}
                  >
                    <option value="" disabled>
                      {departmentsLoading ? 'Loading departments...' : departments.length ? 'Select a department' : 'No departments configured'}
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id} style={{ background: '#FFFFFF', color: '#1E293B' }}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {departmentLoadError && (
                    <p role="alert" style={{ color: '#B42318', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                      {departmentLoadError}
                    </p>
                  )}
                </div>

                {/* Class Teacher Toggle */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    background: '#FFF0EE',
                    border: '1px solid #FFDCD7',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                    <input
                      id="reg-class-teacher-toggle"
                      type="checkbox"
                      checked={isClassTeacher}
                      onChange={(e) => setIsClassTeacher(e.target.checked)}
                      disabled={loading}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>
                       Assigned as Class Teacher / Proctor
                    </span>
                  </label>
                  {isClassTeacher && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: '0.2rem' }}>
                        Select Class Teacher Section:
                      </label>
                      <select
                        id="reg-class-teacher-section"
                        className="input"
                        value={classTeacherSection}
                        onChange={(e) => setClassTeacherSection(e.target.value)}
                        disabled={loading}
                        style={{ height: 38, fontSize: '0.8rem', background: '#FFFFFF' }}
                      >
                        {ACADEMIC_SECTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedRole === 'ADMIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Staff Code & Role Level */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                       Admin Staff Code *
                    </label>
                    <input
                      id="reg-admcode"
                      type="text"
                      className="input"
                      placeholder="e.g. ADM-KIT-001"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      required
                      disabled={loading}
                      style={{ height: 42, fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                       Admin Role Level *
                    </label>
                    <select
                      id="reg-admin-role-type"
                      className="input"
                      value={adminRoleType}
                      onChange={(e) => setAdminRoleType(e.target.value)}
                      disabled={loading}
                      style={{ height: 42, fontSize: '0.82rem', background: '#FFF0EE', border: '1.5px solid #FFDCD7' }}
                    >
                      {ADMIN_ROLE_TYPES.map((r) => (
                        <option key={r} value={r} style={{ background: '#FFFFFF', color: '#1E293B' }}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* College Branch Dropdown for Admin */}
                <div>
                  <label
                    htmlFor="reg-admin-branch"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.2rem',
                    }}
                  >
                    <span> College Branch / Campus Jurisdiction</span>
                  </label>
                  <select
                    id="reg-admin-branch"
                    className="input"
                    value={adminBranch}
                    onChange={(e) => setAdminBranch(e.target.value)}
                    disabled={loading}
                    style={{
                      height: 42,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      background: '#FFF0EE',
                      border: '1.5px solid #FFDCD7',
                      cursor: 'pointer',
                      borderRadius: '8px',
                    }}
                  >
                    {COLLEGE_BRANCHES.map((b) => (
                      <option key={b.id} value={b.name} style={{ background: '#FFFFFF', color: '#1E293B' }}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Master Admin Security Code */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <label htmlFor="reg-adminpass" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                       Master Admin Passcode *
                    </label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Authorized personnel only</span>
                  </div>
                  <input
                    id="reg-adminpass"
                    type="password"
                    className="input"
                    placeholder="Administrator passcode"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    required
                    disabled={loading}
                    style={{ height: 42, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {/* Passwords */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.2rem', display: 'block' }}>
                 Set Account Password *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  id="reg-password"
                  type="password"
                  className="input"
                  placeholder="Create Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ height: 42, fontSize: '0.85rem' }}
                />
                <input
                  id="reg-confirm-password"
                  type="password"
                  className="input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ height: 42, fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading}
              id="register-submit-btn"
              style={{
                marginTop: '0.25rem',
                height: 48,
                fontSize: '0.975rem',
                fontWeight: 800,
                boxShadow: '0 8px 20px var(--color-primary-glow)',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                  Creating Account...
                </>
              ) : (
                `Register as ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} →`
              )}
            </button>
          </form>
        )}

        {/* ─── GOOGLE WORKSPACE SSO ─── */}
        <div style={{ marginTop: '1.25rem', display: 'none' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#FFDCD7' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A58B87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {authMode === 'LOGIN' ? 'Or sign in with Google' : 'Or register with Google'}
            </span>
            <div style={{ flex: 1, height: '1px', background: '#FFDCD7' }} />
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            id="oauth-google-btn"
            onClick={() => setOauthModalOpen(true)}
            disabled={loading}
            style={{
              width: '100%',
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              borderRadius: '12px',
              border: '1.5px solid #FFDCD7',
              background: '#FFFFFF',
              color: '#2D3748',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{authMode === 'LOGIN' ? 'Continue with Google Workspace' : 'Sign up with Google Workspace'}</span>
          </button>
        </div>

        {/* Toggle between Login and Register via footer link */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          {authMode === 'LOGIN' ? (
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('REGISTER');
                  handleSelectRole('STUDENT');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Register Here
              </button>
            </p>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('LOGIN')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Sign In Instead
              </button>
            </p>
          )}
        </div>

        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '0.85rem' }}>
          Student accounts can be registered; staff accounts are provisioned by an administrator.
        </p>

        </section>
      </div>

      {/* ─── GOOGLE WORKSPACE SSO MODAL ─── */}
      {oauthModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setOauthModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                    Google Workspace SSO
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#666' }}>Campus Single Sign-On (@kit.ac.in)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOauthModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0.2rem',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
              Select a campus account to sign in as <strong>{selectedRole}</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {selectedRole === 'STUDENT' ? (
                <>
                  <button
                    type="button"
                    onClick={() => completeOAuth('aman.kumar@kit.ac.in', 'Aman Kumar')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#3B82F6',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      AK
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>Aman Kumar</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>aman.kumar@kit.ac.in · Roll: 2101640100015</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => completeOAuth('student.sso@kit.ac.in', 'Student Portal User')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#10B981',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      SP
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>Student Portal SSO</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>student.sso@kit.ac.in · B.Tech CSE</div>
                    </div>
                  </button>
                </>
              ) : selectedRole === 'TEACHER' ? (
                <>
                  <button
                    type="button"
                    onClick={() => completeOAuth('r.sharma@kit.ac.in', 'Dr. Rajesh Sharma')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#E63C2D',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      RS
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>Dr. Rajesh Sharma</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>r.sharma@kit.ac.in · Faculty CS</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => completeOAuth('faculty.cs@kit.ac.in', 'Prof. Anita Verma')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#8B5CF6',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      AV
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>Prof. Anita Verma</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>faculty.cs@kit.ac.in · Dept of CSE</div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => completeOAuth('dean.academics@kit.ac.in', 'Dean Academics')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#0F172A',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      DA
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>Dean Academic Office</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>dean.academics@kit.ac.in · Admin Cell</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => completeOAuth('registrar@kit.ac.in', 'KIT Registrar')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#DC2626',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      KR
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>KIT Registrar Office</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>registrar@kit.ac.in · Central Admin</div>
                    </div>
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn btn--outline btn--block"
              onClick={() => {
                const customEmail = prompt('Enter custom Google Workspace email:', 'user@kit.ac.in');
                if (customEmail) {
                  completeOAuth(customEmail, customEmail.split('@')[0]);
                }
              }}
              style={{
                height: 40,
                fontSize: '0.825rem',
                fontWeight: 700,
                borderRadius: '999px',
              }}
            >
              + Use another Google account...
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
