import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import SyncBadge from '../../components/SyncBadge';

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'stats' | 'academic' | 'users' | 'rules' | 'audit'>('stats');

  // Stats
  const [stats, setStats] = useState<any | null>(null);

  // Rules
  const [rules, setRules] = useState({
    minPercent: 75,
    lateGraceMinutes: 10,
    editWindowHours: 24,
    countLeaveAsPresent: false,
  });
  const [savingRules, setSavingRules] = useState(false);
  const [rulesMessage, setRulesMessage] = useState<string | null>(null);

  // Academic data
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Add Department form
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  // Bulk Upload Students
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [selectedBulkSection, setSelectedBulkSection] = useState<number | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRules();
    loadAcademic();
  }, []);

  async function loadStats() {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    }
  }

  async function loadRules() {
    try {
      const res = await api.get('/admin/rules');
      if (res.data.data) setRules(res.data.data);
    } catch (err) {
      console.error('Failed to load rules', err);
    }
  }

  async function loadAcademic() {
    try {
      const [dRes, cRes, sRes, subRes] = await Promise.all([
        api.get('/academic/departments'),
        api.get('/academic/courses'),
        api.get('/academic/sections'),
        api.get('/academic/subjects'),
      ]);
      setDepartments(dRes.data.data);
      setCourses(cRes.data.data);
      setSections(sRes.data.data);
      setSubjects(subRes.data.data);
      if (sRes.data.data.length > 0) {
        setSelectedBulkSection(sRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load academic data', err);
    }
  }

  async function loadAuditLogs() {
    try {
      const res = await api.get('/admin/audit-logs');
      setAuditLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    }
  }

  async function handleSaveRules(e: React.FormEvent) {
    e.preventDefault();
    setSavingRules(true);
    setRulesMessage(null);
    try {
      await api.put('/admin/rules', rules);
      setRulesMessage('✓ Attendance rules updated successfully!');
    } catch (err) {
      setRulesMessage('⚠️ Failed to save rules.');
    } finally {
      setSavingRules(false);
      setTimeout(() => setRulesMessage(null), 4000);
    }
  }

  async function handleCreateDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    try {
      await api.post('/academic/departments', {
        name: newDeptName,
        code: newDeptCode.toUpperCase(),
        academicYearId: 1,
      });
      setNewDeptName('');
      setNewDeptCode('');
      loadAcademic();
      alert('✓ Department created!');
    } catch (err) {
      alert('Failed to create department');
    }
  }

  async function handleBulkUpload() {
    if (!bulkCsvText.trim() || !selectedBulkSection) {
      alert('Please enter student data and select a section');
      return;
    }

    setBulkUploading(true);
    setBulkResult(null);

    try {
      // Parse CSV lines: RollNo, Name, Email, Phone
      const lines = bulkCsvText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsedStudents = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          rollNo: parts[0],
          name: parts[1] || `Student ${parts[0]}`,
          email: parts[2] || `${parts[0].toLowerCase()}@college.edu`,
          phone: parts[3] || undefined,
          sectionId: selectedBulkSection,
        };
      });

      const res = await api.post('/users/students/bulk', {
        students: parsedStudents,
      });

      setBulkResult(res.data.data);
      setBulkCsvText('');
      loadStats();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Bulk upload failed';
      alert(`⚠️ ${msg}`);
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  }

  return (
    <div className="page">
      {/* Header */}
      <header
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '1.25rem' }}>⚙️</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>AttendAI</span>
          <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)' }}>
            {user?.name || 'Admin'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge />
          <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: 'var(--color-surface-2)',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
        }}
      >
        <button
          className={`btn btn--sm ${activeTab === 'stats' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('stats')}
        >
          📈 Stats & Overview
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'academic' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('academic')}
        >
          🏫 Academic Setup
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'users' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Bulk Upload
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'rules' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('rules')}
        >
          ⚖️ Attendance Rules
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'audit' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => {
            setActiveTab('audit');
            loadAuditLogs();
          }}
        >
          📜 Audit Logs
        </button>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '1.5rem 1rem' }}>
        <div className="container container--wide">
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: STATS & OVERVIEW
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem' }}>System Dashboard</h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}
              >
                <div className="card">
                  <p className="text-xs text-muted">Total Students</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {stats?.totalStudents ?? '—'}
                  </div>
                </div>

                <div className="card">
                  <p className="text-xs text-muted">Total Faculty (Teachers)</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
                    {stats?.totalTeachers ?? '—'}
                  </div>
                </div>

                <div className="card">
                  <p className="text-xs text-muted">Total Courses</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-warning)' }}>
                    {stats?.totalCourses ?? '—'}
                  </div>
                </div>

                <div className="card">
                  <p className="text-xs text-muted">Classes Conducted</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a78bfa' }}>
                    {stats?.totalSessions ?? '—'}
                  </div>
                </div>
              </div>

              {/* Architecture & Offline Resilience Box */}
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(108,99,255,0.05))',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                <h3 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                  ⚡ System Operational & Offline-Ready
                </h3>
                <p className="text-sm">
                  PWA caching enabled with Workbox. Dexie IndexedDB configured for offline queueing. Sync engine active with exponential backoff and cursor synchronization.
                </p>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: ACADEMIC SETUP
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'academic' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {/* Departments */}
                <div className="card">
                  <h3>Departments ({departments.length})</h3>
                  <form onSubmit={handleCreateDepartment} style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Name (e.g. Computer Science)"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Code (CS)"
                      style={{ maxWidth: 90 }}
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      required
                    />
                    <button className="btn btn--primary btn--sm" type="submit">
                      Add
                    </button>
                  </form>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {departments.map((d) => (
                      <div key={d.id} className="card" style={{ padding: '0.75rem' }}>
                        <strong>{d.name}</strong> <span className="badge">{d.code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Courses & Sections */}
                <div className="card">
                  <h3>Courses ({courses.length}) & Sections ({sections.length})</h3>
                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
                    {courses.map((c) => (
                      <div key={c.id} className="card" style={{ padding: '0.75rem' }}>
                        <p className="font-semibold">{c.name} ({c.code})</p>
                        <p className="text-xs text-muted">Duration: {c.durationYears} Years</p>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Sections</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {sections.map((s) => (
                      <div key={s.id} className="card" style={{ padding: '0.5rem 0.75rem' }}>
                        <span>{s.name} (Year {s.year})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subjects */}
                <div className="card">
                  <h3>Subjects ({subjects.length})</h3>
                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
                    {subjects.map((sub) => (
                      <div key={sub.id} className="card" style={{ padding: '0.75rem' }}>
                        <strong>{sub.name}</strong> <span className="badge">{sub.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: BULK STUDENT UPLOAD
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>👥 Bulk Student Import</h2>
              <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
                Paste CSV lines in format: <code>RollNo, Name, Email, Phone</code>. Each student will automatically be assigned an account.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Target Section
                </label>
                <select
                  className="input"
                  value={selectedBulkSection || ''}
                  onChange={(e) => setSelectedBulkSection(Number(e.target.value))}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  CSV Data (One student per line)
                </label>
                <textarea
                  className="input"
                  rows={6}
                  placeholder={`CS101, Aarav Sharma, aarav@college.edu, 9876543210\nCS102, Diya Patel, diya@college.edu, 9876543211\nCS103, Rahul Verma, rahul@college.edu, 9876543212`}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                />
              </div>

              {bulkResult && (
                <div
                  className="card"
                  style={{
                    marginBottom: '1rem',
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid var(--color-success)',
                  }}
                >
                  <p className="font-semibold" style={{ color: 'var(--color-success)' }}>
                    ✓ Import Completed: {bulkResult.created} / {bulkResult.total} students created!
                  </p>
                  {bulkResult.errors?.length > 0 && (
                    <div style={{ marginTop: '0.5rem', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
                      {bulkResult.errors.map((err: any, idx: number) => (
                        <p key={idx}>Row {err.row} ({err.rollNo}): {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn--primary"
                onClick={handleBulkUpload}
                disabled={bulkUploading}
                style={{ width: '100%' }}
              >
                {bulkUploading ? 'Importing Students...' : '🚀 Import Students'}
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: ATTENDANCE RULES
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'rules' && (
            <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>⚖️ Attendance Rules & Policies</h2>
              <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
                Configure threshold criteria, edit window before session locking, and grace periods.
              </p>

              <form onSubmit={handleSaveRules} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Minimum Attendance Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    className="input"
                    value={rules.minPercent}
                    onChange={(e) => setRules({ ...rules, minPercent: Number(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                    Students falling below this threshold are flagged as defaulters.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Late Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    className="input"
                    value={rules.lateGraceMinutes}
                    onChange={(e) => setRules({ ...rules, lateGraceMinutes: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Edit Window Before Session Auto-Lock (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    className="input"
                    value={rules.editWindowHours}
                    onChange={(e) => setRules({ ...rules, editWindowHours: Number(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                    After this duration, only HOD or Admin can unlock the attendance session.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="checkbox"
                    id="countLeave"
                    checked={rules.countLeaveAsPresent}
                    onChange={(e) => setRules({ ...rules, countLeaveAsPresent: e.target.checked })}
                    style={{ width: 20, height: 20 }}
                  />
                  <label htmlFor="countLeave" style={{ cursor: 'pointer' }}>
                    Count Approved Leaves (LV) as Present in Attendance % calculation
                  </label>
                </div>

                {rulesMessage && (
                  <div
                    className="card"
                    style={{
                      padding: '0.75rem',
                      background: rulesMessage.includes('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      border: `1px solid ${rulesMessage.includes('✓') ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      fontWeight: 600,
                    }}
                  >
                    {rulesMessage}
                  </div>
                )}

                <button className="btn btn--primary" type="submit" disabled={savingRules}>
                  {savingRules ? 'Saving Changes...' : 'Save Attendance Rules'}
                </button>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 5: AUDIT LOGS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'audit' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>📜 Immutable System Audit Logs</h2>
                <button className="btn btn--ghost btn--sm" onClick={loadAuditLogs}>
                  ⟳ Refresh
                </button>
              </div>

              <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '0.75rem' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem' }}>User</th>
                      <th style={{ padding: '0.75rem' }}>Action</th>
                      <th style={{ padding: '0.75rem' }}>Entity</th>
                      <th style={{ padding: '0.75rem' }}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <strong>{log.user?.name}</strong> ({log.user?.role})
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge">{log.action}</span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{log.entity}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>{log.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
