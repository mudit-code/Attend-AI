import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import SyncBadge from '../../components/SyncBadge';

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'qr' | 'history' | 'leave'>('overview');

  // Report data
  const [report, setReport] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);

  // QR mark state
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [qrSessionId, setQrSessionId] = useState('');
  const [markingQr, setMarkingQr] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);

  // Leave Form state
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveType, setLeaveType] = useState<'MEDICAL' | 'PERSONAL' | 'EVENT' | 'OD'>('MEDICAL');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);

  // Correction Modal state
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<any | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  useEffect(() => {
    loadMyReport();
    loadMyLeaves();
  }, []);

  async function loadMyReport() {
    setLoadingReport(true);
    try {
      const res = await api.get('/reports/my-report');
      setReport(res.data.data);
    } catch (err) {
      console.error('Failed to load student report', err);
    } finally {
      setLoadingReport(false);
    }
  }

  async function loadMyLeaves() {
    try {
      const res = await api.get('/leaves');
      setMyLeaves(res.data.data);
    } catch (err) {
      console.error('Failed to load my leaves', err);
    }
  }

  // Mark Attendance via QR Token
  async function handleMarkQr() {
    if (!qrTokenInput.trim() || !qrSessionId.trim()) {
      alert('Please enter both the Session ID and 8-character Token');
      return;
    }

    setMarkingQr(true);
    setQrResult(null);

    // Get or create unique persistent deviceId fingerprint
    let deviceId = localStorage.getItem('attendai_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + crypto.randomUUID();
      localStorage.setItem('attendai_device_id', deviceId);
    }

    try {
      await api.post('/qr/mark', {
        sessionId: qrSessionId.trim(),
        token: qrTokenInput.trim().toUpperCase(),
        deviceId,
      });

      setQrResult('✓ Attendance marked successfully! Marked as Present.');
      loadMyReport();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to mark attendance';
      setQrResult(`⚠️ ${msg}`);
    } finally {
      setMarkingQr(false);
    }
  }

  // Apply Leave
  async function handleApplyLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveFrom || !leaveTo || !leaveReason) return;

    setSubmittingLeave(true);
    setLeaveMessage(null);

    try {
      await api.post('/leaves', {
        fromDate: leaveFrom,
        toDate: leaveTo,
        type: leaveType,
        reason: leaveReason,
      });

      setLeaveMessage('✓ Leave request submitted! Waiting for teacher approval.');
      setLeaveReason('');
      loadMyLeaves();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit leave request';
      setLeaveMessage(`⚠️ ${msg}`);
    } finally {
      setSubmittingLeave(false);
    }
  }

  // Submit Correction Request
  async function handleSubmitCorrection() {
    if (!selectedRecordForCorrection || !correctionReason) return;

    setSubmittingCorrection(true);
    try {
      await api.post('/correction-requests', {
        sessionId: selectedRecordForCorrection.sessionId,
        requestedStatus: 'P',
        reason: correctionReason,
      });

      alert('✓ Correction request submitted successfully!');
      setSelectedRecordForCorrection(null);
      setCorrectionReason('');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit correction';
      alert(`⚠️ ${msg}`);
    } finally {
      setSubmittingCorrection(false);
    }
  }

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  }

  const overall = report?.summary?.percentage ?? 0;
  const isDefaulter = report?.summary?.isDefaulter ?? false;

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
          <span style={{ fontSize: '1.25rem' }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>AttendAI</span>
          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)' }}>
            {user?.name || 'Student'}
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
          className={`btn btn--sm ${activeTab === 'overview' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'qr' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('qr')}
        >
          📱 Scan QR / Code
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'history' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('history')}
        >
          📅 Class History
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'leave' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('leave')}
        >
          🏖️ Apply Leave ({myLeaves.length})
        </button>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '1.5rem 1rem' }}>
        <div className="container">
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: OVERVIEW
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div>
              {/* Defaulter Warning Banner */}
              {isDefaulter && (
                <div
                  className="card"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--color-danger)',
                    marginBottom: '1rem',
                  }}
                >
                  <h3 style={{ color: 'var(--color-danger)', marginBottom: '0.25rem' }}>
                    ⚠️ Low Attendance Alert ({overall}%)
                  </h3>
                  <p className="text-sm" style={{ color: '#ffbaba' }}>
                    Your attendance is below the mandatory 75% college requirement. Please attend upcoming classes to avoid exam debarment.
                  </p>
                </div>
              )}

              {/* Big Attendance Meter Card */}
              <div
                className="card"
                style={{
                  background: isDefaulter
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(108,99,255,0.05))'
                    : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(108,99,255,0.05))',
                  border: `1px solid ${isDefaulter ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  textAlign: 'center',
                  padding: '2rem 1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <p className="text-sm text-muted" style={{ marginBottom: '0.25rem' }}>
                  Overall Attendance
                </p>
                <div
                  style={{
                    fontSize: '4rem',
                    fontWeight: 900,
                    color: isDefaulter ? 'var(--color-danger)' : 'var(--color-success)',
                    lineHeight: 1,
                  }}
                >
                  {loadingReport ? '...' : `${overall}%`}
                </div>
                <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
                  {report?.summary?.present || 0} Attended / {report?.summary?.totalClasses || 0} Total Classes
                </p>
              </div>

              {/* Subject Breakdown */}
              <h3 style={{ marginBottom: '0.75rem' }}>📚 Subject-wise Breakdown</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {report?.subjects?.map((sub: any) => (
                  <div key={sub.subjectId} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="font-semibold">{sub.subjectName}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: sub.percentage < 75 ? 'var(--color-danger)' : 'var(--color-success)',
                        }}
                      >
                        {sub.percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 6,
                        background: 'var(--color-surface-2)',
                        borderRadius: 3,
                        overflow: 'hidden',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, sub.percentage)}%`,
                          background: sub.percentage < 75 ? 'var(--color-danger)' : 'var(--color-success)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span className="text-muted">{sub.present} / {sub.total} classes</span>
                      <span className="text-muted">{sub.absent} absent</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: QR CODE SCAN / TOKEN ENTRY
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'qr' && (
            <div className="card" style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>📱 Mark Attendance</h2>
              <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
                Enter the rotating code displayed on your teacher's projector or screen.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Session UUID / ID
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Paste session ID from teacher screen"
                    value={qrSessionId}
                    onChange={(e) => setQrSessionId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    8-Character Live Code
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 7F3A9B1C"
                    maxLength={8}
                    style={{ fontSize: '1.5rem', letterSpacing: '3px', textTransform: 'uppercase', textAlign: 'center' }}
                    value={qrTokenInput}
                    onChange={(e) => setQrTokenInput(e.target.value)}
                  />
                </div>

                {qrResult && (
                  <div
                    className="card"
                    style={{
                      background: qrResult.includes('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      border: `1px solid ${qrResult.includes('✓') ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {qrResult}
                  </div>
                )}

                <button
                  className="btn btn--primary"
                  onClick={handleMarkQr}
                  disabled={markingQr}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {markingQr ? 'Validating Token...' : '✓ Submit Attendance'}
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: CLASS HISTORY & CORRECTIONS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>📅 Recent Classes</h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {report?.history?.map((h: any) => (
                  <div key={h.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p className="font-semibold">{h.subject}</p>
                        <p className="text-xs text-muted">
                          {new Date(h.date).toLocaleDateString()} — Period {h.period} ({h.teacher})
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`badge ${
                            h.status === 'P'
                              ? 'badge--online'
                              : h.status === 'A'
                              ? 'badge--offline'
                              : 'badge--pending'
                          }`}
                        >
                          {h.status === 'P'
                            ? 'Present'
                            : h.status === 'A'
                            ? 'Absent'
                            : h.status === 'L'
                            ? 'Late'
                            : h.status === 'OD'
                            ? 'On Duty'
                            : 'Leave'}
                        </span>

                        {h.status === 'A' && (
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setSelectedRecordForCorrection(h)}
                          >
                            Request Fix
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Correction Modal */}
              {selectedRecordForCorrection && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    zIndex: 200,
                  }}
                >
                  <div className="card" style={{ maxWidth: 450, width: '100%' }}>
                    <h3>Request Attendance Correction</h3>
                    <p className="text-xs text-muted" style={{ marginBottom: '1rem' }}>
                      Class: {selectedRecordForCorrection.subject} (
                      {new Date(selectedRecordForCorrection.date).toLocaleDateString()})
                    </p>

                    <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Reason for correction
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="e.g. Present in class, was sitting on last bench during roll call"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      style={{ marginBottom: '1rem' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setSelectedRecordForCorrection(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={handleSubmitCorrection}
                        disabled={submittingCorrection || !correctionReason}
                      >
                        {submittingCorrection ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: APPLY LEAVE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'leave' && (
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>🏖️ Submit Leave Application</h3>
                <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        From Date
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={leaveFrom}
                        onChange={(e) => setLeaveFrom(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                        To Date
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={leaveTo}
                        onChange={(e) => setLeaveTo(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Leave Type
                    </label>
                    <select
                      className="input"
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as any)}
                    >
                      <option value="MEDICAL">Medical Leave</option>
                      <option value="PERSONAL">Personal Leave</option>
                      <option value="EVENT">College Event / Fest</option>
                      <option value="OD">On Duty (OD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Reason
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Detailed reason for absence..."
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      required
                    />
                  </div>

                  {leaveMessage && (
                    <div
                      className="card"
                      style={{
                        padding: '0.75rem',
                        background: leaveMessage.includes('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        border: `1px solid ${leaveMessage.includes('✓') ? 'var(--color-success)' : 'var(--color-danger)'}`,
                        fontWeight: 600,
                      }}
                    >
                      {leaveMessage}
                    </div>
                  )}

                  <button className="btn btn--primary" type="submit" disabled={submittingLeave}>
                    {submittingLeave ? 'Submitting...' : 'Submit Leave Application'}
                  </button>
                </form>
              </div>

              {/* My Previous Leaves */}
              <h3 style={{ marginBottom: '0.75rem' }}>My Applications ({myLeaves.length})</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {myLeaves.map((l) => (
                  <div key={l.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="badge" style={{ marginRight: '0.5rem' }}>
                          {l.type}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(l.fromDate).toLocaleDateString()} — {new Date(l.toDate).toLocaleDateString()}
                        </span>
                        <p className="text-sm" style={{ marginTop: '0.25rem' }}>{l.reason}</p>
                      </div>

                      <span
                        className={`badge ${
                          l.status === 'APPROVED'
                            ? 'badge--online'
                            : l.status === 'REJECTED'
                            ? 'badge--offline'
                            : 'badge--pending'
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
