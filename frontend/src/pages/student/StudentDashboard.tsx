import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import SyncBadge from '../../components/SyncBadge';
import RealtimeInsightCard from '../../components/RealtimeInsightCard';
import BunkCalculator from '../../components/student/BunkCalculator';
import TodayTimetable, { type TodayAttendanceRecord } from '../../components/student/TodayTimetable';
import NoDuesWidget from '../../components/student/NoDuesWidget';
import MarksGrid from '../../components/student/MarksGrid';
import NoticeBanner from '../../components/student/NoticeBanner';
import LibraryWidget from '../../components/student/LibraryWidget';
import PlacementWidget from '../../components/student/PlacementWidget';
import GrievanceButton from '../../components/student/GrievanceButton';
import AttendanceLedgerWidget from '../../components/student/AttendanceLedgerWidget';
import UserProfileDrawer from '../../components/common/UserProfileDrawer';
import InstallAppPrompt from '../../components/common/InstallAppPrompt';
import BrandLogo from '../../components/common/BrandLogo';
import StudentQRScannerModal from '../../components/student/StudentQRScannerModal';
import StudentAssignmentsTab from '../../components/student/StudentAssignmentsTab';

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'qr' | 'history' | 'leave'>('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Report data
  const [report, setReport] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  // QR mark state
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [qrSessionId, setQrSessionId] = useState('');
  const [markingQr, setMarkingQr] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Leave Form state
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveType, setLeaveType] = useState<'MEDICAL' | 'PERSONAL' | 'EVENT' | 'OD'>('MEDICAL');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [leaveMessageIsError, setLeaveMessageIsError] = useState(false);
  const [leaveLoadError, setLeaveLoadError] = useState<string | null>(null);
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
      setReportError(null);
    } catch {
      setReport(null);
      setReportError('Could not load your attendance report from the server.');
    } finally {
      setLoadingReport(false);
    }
  }

  async function loadMyLeaves() {
    try {
      const res = await api.get('/leaves');
      setMyLeaves(res.data.data);
      setLeaveLoadError(null);
    } catch {
      setMyLeaves([]);
      setLeaveLoadError('Could not load leave requests from the server.');
    }
  }

  // Mark Attendance via QR Token (Manual or Camera)
  async function handleMarkQr(overrideSessionId?: string, overrideToken?: string) {
    const targetSessionId = (overrideSessionId || qrSessionId || '').trim();
    const targetToken = (overrideToken || qrTokenInput || '').trim().toUpperCase();

    if (!targetToken || !targetSessionId) {
      alert('Please enter both the Session ID and 8-character Token, or use the camera scanner.');
      return;
    }

    setMarkingQr(true);
    setQrResult(null);

    // Dynamic browser device identifier
    let clientDeviceId = localStorage.getItem('attendai_device_id');
    if (!clientDeviceId) {
      clientDeviceId = 'DEV-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12));
      localStorage.setItem('attendai_device_id', clientDeviceId);
    }

    try {
      const res = await api.post('/qr/mark', {
        sessionId: targetSessionId,
        token: targetToken,
        deviceId: clientDeviceId,
      });
      const message = res.data.message || res.data.data?.message;

      setQrResult(message || 'Attendance marked successfully.');
      setQrTokenInput('');
      await loadMyReport();
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message || err.message;
      if (errCode === 'WRONG_SECTION' || msg?.toLowerCase().includes('section')) {
        setQrResult(` Access Denied: You are not enrolled in this section. Cross-section proxy attendance is strictly prohibited under institutional regulations.`);
      } else if (errCode === 'SESSION_LOCKED' || msg?.toLowerCase().includes('locked')) {
        setQrResult(` Session Locked: Faculty has already finalized and locked the roll call for this lecture.`);
      } else if (errCode === 'INVALID_TOKEN' || msg?.toLowerCase().includes('token')) {
        setQrResult(` Invalid / Expired Token: The 8-character token has expired. Please enter the current code from the projected screen.`);
      } else if (errCode === 'DEVICE_MISMATCH') {
        setQrResult(` Device Mismatch: Your account is bound to another registered device. Contact Admin/HOD for reset.`);
      } else {
        setQrResult(` Attendance Failed: ${msg || 'Could not verify session'}`);
      }
    } finally {
      setMarkingQr(false);
    }
  }

  const handleScannerScan = (scannedSessionId: string, scannedToken: string) => {
    setIsScannerOpen(false);
    if (scannedSessionId) setQrSessionId(scannedSessionId);
    if (scannedToken) setQrTokenInput(scannedToken);
    void handleMarkQr(scannedSessionId, scannedToken);
  };

  // Submit Leave Application
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

      setLeaveMessage('Leave request submitted for review.');
      setLeaveMessageIsError(false);
      setLeaveReason('');
      await loadMyLeaves();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Could not submit the leave request.';
      setLeaveMessage(msg);
      setLeaveMessageIsError(true);
    } finally {
      setSubmittingLeave(false);
    }
  }

  // Submit Correction Request
  async function handleSubmitCorrection() {
    if (!selectedRecordForCorrection || !correctionReason) return;
    if (!selectedRecordForCorrection.sessionId) {
      alert('This attendance record does not include a session ID and cannot be corrected.');
      return;
    }

    setSubmittingCorrection(true);
    try {
      await api.post('/correction-requests', {
        sessionId: selectedRecordForCorrection.sessionId,
        requestedStatus: 'P',
        reason: correctionReason,
      });

      alert('Attendance correction request submitted.');
      setSelectedRecordForCorrection(null);
      setCorrectionReason('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Could not submit the attendance correction request.');
    } finally {
      setSubmittingCorrection(false);
    }
  }

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  }

  const overall: number | null = report?.summary?.percentage ?? null;
  const isDefaulter = report?.summary?.isDefaulter ?? false;

  // Today's Live Attendance Records & Campus Pulse
  const todayISO = new Date().toISOString().slice(0, 10);
  const realTodayRecords: TodayAttendanceRecord[] = (report?.history || [])
    .filter((h: any) => h.date && new Date(h.date).toISOString().slice(0, 10) === todayISO)
    .map((h: any) => ({
      period: h.period,
      status: h.status,
      subject: h.subject,
      teacher: h.teacher,
      time: h.time,
      sessionId: h.sessionId,
    }));

  const todayRecordsList = realTodayRecords;
  const todayScheduledCount = todayRecordsList.length;
  const todayPresentCount = todayRecordsList.filter((r) => r.status === 'P' || r.status === 'OD').length;
  const todayAbsentCount = todayRecordsList.filter((r) => r.status === 'A').length;
  const todayAttendedPct = (todayPresentCount + todayAbsentCount) > 0
    ? Math.round((todayPresentCount / (todayPresentCount + todayAbsentCount)) * 100)
    : null;
  const todayAbsentItem = todayRecordsList.find((r) => r.status === 'A');

  return (
    <div className="page" style={{ background: 'linear-gradient(180deg, #FFEBE8 0%, #FFF3F1 320px, #FFF9F8 100%)', minHeight: '100dvh' }}>
      {/* ─── Top Executive Navigation Bar ─────────────────────────── */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.75rem clamp(0.75rem, 2.5vw, 1.5rem)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="flex items-center gap-3">
          <BrandLogo size="md" subtitle="Student Portal" onClick={() => navigate('/student')} />
          <div style={{ display: 'none', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }} className="hidden-mobile-info">
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
              }}
            >
               {report?.student?.section?.course?.department?.name || 'Department not assigned'} · {report?.student?.section?.name || 'Section not assigned'}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
              }}
            >
               {report?.student?.rollNo || user?.student?.rollNo || 'Roll number not assigned'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          {/* Trombone Student Profile Chip */}
          <button
            onClick={() => setIsProfileOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem 0.25rem 0.35rem',
              background: 'var(--color-surface-2)',
              borderRadius: '999px',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Click to view/edit student profile"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#B45309',
                fontWeight: 800,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {(user?.name || 'Student').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {user?.name || 'Student'}
            </span>
            <span style={{ fontSize: '0.65rem', background: '#0F172A', color: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              STUDENT
            </span>
          </button>

          <SyncBadge />
          <button className="btn btn--ghost btn--sm" onClick={handleLogout} style={{ fontWeight: 700 }} title="Sign Out">
            ⎋ Logout
          </button>
        </div>
      </header>

      {/* ─── Navigation Tabs Bar ──────────────────────────────────── */}
      <nav
        className="nav-scroll-touch"
        style={{
          gap: '0.5rem',
          padding: '0.65rem clamp(0.75rem, 2.5vw, 1.5rem)',
          background: 'var(--color-surface-2)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          id="tab-student-overview"
          className={`btn btn--sm ${activeTab === 'overview' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('overview')}
        >
           Academic Dashboard
        </button>
        {user?.role === 'STUDENT' && (
          <button
            id="tab-student-assignments"
            className={`btn btn--sm ${activeTab === 'assignments' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
        )}
        <button
          id="tab-student-qr"
          className={`btn btn--sm ${activeTab === 'qr' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('qr')}
        >
           Scan QR / Code Entry
        </button>
        <button
          id="tab-student-history"
          className={`btn btn--sm ${activeTab === 'history' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('history')}
        >
           Attendance Ledger & History
        </button>
        <button
          id="tab-student-leave"
          className={`btn btn--sm ${activeTab === 'leave' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('leave')}
        >
           Apply Leave ({myLeaves.length})
        </button>
      </nav>

      {/* ─── Main Desktop Content Area ────────────────────────────── */}
      <main style={{ flex: 1, padding: '1.25rem clamp(0.75rem, 2.5vw, 1.75rem)' }}>
        <div className="container--fluid">
          <InstallAppPrompt />
          {reportError && <p className="alert alert--error" role="alert">{reportError}</p>}
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: ACADEMIC OVERVIEW (DESKTOP EXECUTIVE VIEW)
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div>
              {/* ─── STEP 2: Today's Live Attendance Pulse Bar ────────── */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF7F6 100%)',
                  borderRadius: '20px',
                  border: '1.5px solid #FFDCD7',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.06)',
                  padding: '1.25rem 1.75rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        background: '#FFF0EE',
                        border: '1px solid #FFDCD7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}
                    >

                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                          Today's Live Attendance Pulse
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#DCFCE7',
                            color: '#15803D',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            border: '1px solid #86EFAC',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                          LIVE MONITOR
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Subject-wise period tracking updated in real-time as faculty marks attendance
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: '#F1F5F9',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#475569',
                      }}
                    >
                      {todayScheduledCount} Attendance Records
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: '#DCFCE7',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#15803D',
                      }}
                    >
                      ✓ {todayPresentCount} Present
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: todayAbsentCount > 0 ? '#FEE2E2' : '#F1F5F9',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: todayAbsentCount > 0 ? '#B91C1C' : '#64748B',
                      }}
                    >
                      ✗ {todayAbsentCount} Absent
                    </span>
                  </div>
                </div>

                {/* Progress bar and absent alert strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Daily Attendance Completion</span>
                      <span style={{ color: todayAttendedPct === null ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                        {todayAttendedPct === null ? 'No attendance records yet' : `${todayAttendedPct}% of recorded classes attended`}
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#FFE6E2', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${todayAttendedPct ?? 0}%`,
                          background: 'var(--color-success)',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {todayAbsentItem && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        borderRadius: '10px',
                        padding: '0.4rem 0.85rem',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>
                         Marked <strong>ABSENT</strong> in Period {todayAbsentItem.period} ({todayAbsentItem.subject})
                      </span>
                      <button
                        className="btn btn--sm"
                        style={{
                          background: '#DC2626',
                          color: '#FFFFFF',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setSelectedRecordForCorrection({
                            sessionId: todayAbsentItem.sessionId,
                            period: todayAbsentItem.period,
                            subject: todayAbsentItem.subject,
                            teacher: todayAbsentItem.teacher,
                            time: todayAbsentItem.time,
                          });
                          setCorrectionReason('');
                        }}
                      >
                         Claim Correction
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Top Executive Metric Deck (4 Responsive Cards) ─── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Metric 1: Overall Attendance % */}
                <div
                  className="card"
                  style={{
                    background: isDefaulter ? '#FFF5F5' : '#F0FDF4',
                    border: `1.5px solid ${isDefaulter ? '#FECDD3' : '#BBF7D0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Overall Attendance
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: isDefaulter ? '#FEE2E2' : '#DCFCE7',
                        color: isDefaulter ? '#B91C1C' : '#15803D',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {!report?.summary
                        ? 'Report unavailable'
                        : isDefaulter
                        ? 'Below attendance threshold'
                        : 'Attendance requirement met'}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '2.75rem',
                        fontWeight: 900,
                        color: isDefaulter ? 'var(--color-danger)' : 'var(--color-success)',
                        lineHeight: 1,
                      }}
                    >
                      {loadingReport ? '...' : overall === null ? '—' : `${overall}%`}
                    </span>
                    <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
                      Attendance percentage
                    </span>
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
                    {report?.summary
                      ? <><strong>{report.summary.present ?? 0}</strong> Attended / <strong>{report.summary.totalClasses ?? 0}</strong> Total Lectures</>
                      : 'Attendance totals unavailable'}
                  </p>
                </div>

                {/* Metric 2: Bunk Allowance & Forecast */}
                <div
                  className="card"
                  style={{
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Attendance Runway
                    </span>

                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>
                      {overall === null ? '—' : 'Available'}
                    </div>
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
                    {overall === null ? 'Forecast unavailable without attendance data' : 'Use the attendance calculator for a forecast'}
                  </p>
                </div>

                {/* Metric 3: Academic SGPA & Standing */}
                <div
                  className="card"
                  style={{
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Certified SGPA
                    </span>

                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#7C3AED', lineHeight: 1 }}>
                      —
                    </span>
                    <span className="badge" style={{ background: '#EDE9FE', color: '#6D28D9', fontWeight: 800 }}>
                      Marks data unavailable
                    </span>
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
                    Semester results are not available in the attendance report.
                  </p>
                </div>

                {/* Metric 4: 4-Pillar Clearance Status */}
                <div
                  className="card"
                  style={{
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Digital No-Dues
                    </span>

                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>
                      —
                    </span>
                    <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontWeight: 800 }}>
                      Status unavailable
                    </span>
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
                    Clearance data is not connected.
                  </p>
                </div>
              </div>

              {/* ─── Two-Column Desktop Dashboard Grid ──────────────── */}
              <div className="student-desktop-grid">
                {/* ─── LEFT COLUMN (Primary Attendance & Academics - 7fr) ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Realtime Insight & Calendar Widget */}
                  <RealtimeInsightCard />

                  {/* Campus Broadcast Notices (Filtered by Branch/Section) */}
                  <NoticeBanner
                    branchName={report?.student?.section?.course?.department?.name}
                    sectionName={report?.student?.section?.name}
                  />

                  {/* Defaulter Warning Banner */}
                  {isDefaulter && (
                    <div
                      className="card"
                      style={{
                        background: '#FFF1F2',
                        border: '1.5px solid #FECDD3',
                      }}
                    >
                      <h3 style={{ color: '#B91C1C', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Attendance requirement notice ({overall}%)
                      </h3>
                      <p className="text-sm" style={{ color: '#7F1D1D', lineHeight: 1.5 }}>
                        Your attendance is below the institution's required minimum of <strong>{report?.summary?.minRequired}%</strong>. Attend upcoming scheduled lectures to improve your attendance.
                      </p>
                    </div>
                  )}

                  {/* Subject-wise Attendance Breakdown Deck */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div>
                        <h3 style={{ margin: 0 }}> Subject-wise Attendance Breakdown</h3>
                        <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                          Current course-wise attendance breakdown and status
                        </p>
                      </div>
                      <span className="badge" style={{ background: '#FFF0EE', color: 'var(--color-primary)', fontWeight: 800 }}>
                        {report?.subjects?.length ?? 0} Subjects Enrolled
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {report?.subjects?.map((sub: any) => (
                        <div
                          key={sub.subjectId}
                          style={{
                            background: '#FFF9F8',
                            border: `1.5px solid ${sub.isDefaulter ? '#FFDCD7' : '#BBF7D0'}`,
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="font-semibold" style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                              {sub.subjectName}
                            </span>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: sub.isDefaulter ? 'var(--color-danger)' : 'var(--color-success)',
                              }}
                            >
                              {sub.percentage}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div
                            style={{
                              height: 8,
                              background: '#FFE6E2',
                              borderRadius: 4,
                              overflow: 'hidden',
                              marginBottom: '0.65rem',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(100, sub.percentage)}%`,
                                background: sub.isDefaulter ? 'var(--color-danger)' : 'var(--color-success)',
                                borderRadius: 4,
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span className="text-muted">
                              <strong>{sub.present}</strong> / {sub.total} classes attended
                            </span>
                            <span style={{ color: sub.isDefaulter ? '#DC2626' : 'var(--color-text-muted)', fontWeight: 600 }}>
                              {sub.absent} absent
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Ledger Widget */}
                  <AttendanceLedgerWidget />
                </div>

                {/* ─── RIGHT COLUMN (Academic Utilities & Campus Services - 5fr) ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Interactive Bunk Calculator */}
                  <BunkCalculator />

                  {/* 4-Pillar Digital Clearance Desk */}
                  <NoDuesWidget />

                  {/* Campus Digital Library Widget */}
                  <LibraryWidget />

                  {/* Campus Recruitment & Training Widget */}
                  <PlacementWidget />

                  {/* Today's Schedule with Live Class Quick Attendance */}
                  <TodayTimetable
                    onMarkLiveClass={() => setActiveTab('qr')}
                    todayRecords={todayRecordsList}
                    onRaiseCorrection={(rec) => {
                      setSelectedRecordForCorrection(rec);
                      setCorrectionReason('Present on bench, missed roll call during lecture');
                    }}
                  />

                  {/* Sessional & Internal Marks Grid */}
                  <MarksGrid />

                  {/* Student Confidential Grievance Button */}
                  <GrievanceButton />
                </div>
              </div>
            </div>
          )}

          {user?.role === 'STUDENT' && activeTab === 'assignments' && <StudentAssignmentsTab />}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: QR CODE SCAN / TOKEN ENTRY (CENTERED DESKTOP CARD)
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'qr' && (
            <div style={{ maxWidth: 640, margin: '2rem auto' }}>
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#FFF0EE',
                      border: '2px solid #FFDCD7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      margin: '0 auto 1rem',
                    }}
                  >

                  </div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Classroom Dynamic QR Scanner</h2>
                  <p className="text-sm text-muted">
                    Enter the rotating 8-character token displayed on your classroom projector screen. Each token refreshes every 10 seconds.
                  </p>
                </div>

                {/* Anti-Proxy Section Validation Callout */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    fontSize: '0.8rem',
                    color: '#1E40AF',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >

                  <div>
                    <strong>Anti-Proxy Protection Active:</strong> Token is cryptographically locked to{' '}
                    <strong>{report?.student?.section?.name || 'your assigned section'} ({report?.student?.section?.course?.department?.name || 'CSE'})</strong>. Attempts to mark attendance for another section will be rejected.
                  </div>
                </div>

                {/* ── LIVE CAMERA SCANNER BUTTON ── */}
                <button
                  type="button"
                  id="btn-open-camera-scanner"
                  className="btn btn--primary"
                  onClick={() => setIsScannerOpen(true)}
                  style={{
                    width: '100%',
                    height: 52,
                    fontSize: '1rem',
                    fontWeight: 800,
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.65rem',
                    boxShadow: '0 8px 24px rgba(230, 60, 45, 0.25)',
                    borderRadius: 14,
                  }}
                >
                   Open Live Camera Scanner
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Or Enter Code Manually
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                      Session ID / UUID
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Paste Session ID from classroom screen (e.g. SES-1-1-P1-...)"
                      value={qrSessionId}
                      onChange={(e) => setQrSessionId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                      8-Character Live Projected Code
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 7F3A9B1C"
                      maxLength={8}
                      style={{
                        fontSize: '1.75rem',
                        letterSpacing: '4px',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                      }}
                      value={qrTokenInput}
                      onChange={(e) => setQrTokenInput(e.target.value)}
                    />
                  </div>

                  {qrResult && (
                    <div
                      className="card"
                      style={{
                        background: qrResult.includes('✓') ? '#F0FDF4' : '#FFF1F2',
                        border: `1.5px solid ${qrResult.includes('✓') ? '#BBF7D0' : '#FECDD3'}`,
                        color: qrResult.includes('✓') ? '#15803D' : '#B91C1C',
                        fontWeight: 700,
                        textAlign: 'center',
                        padding: '1rem',
                        borderRadius: 12,
                      }}
                    >
                      {qrResult}
                    </div>
                  )}

                  <button
                    className="btn btn--primary"
                    onClick={() => handleMarkQr()}
                    disabled={markingQr}
                    style={{ width: '100%', marginTop: '0.5rem', fontWeight: 800, fontSize: '1rem' }}
                  >
                    {markingQr ? 'Validating Token & Device Binding...' : '✓ Submit Attendance Token'}
                  </button>
                </div>

                {/* Camera Scanner Modal */}
                <StudentQRScannerModal
                  isOpen={isScannerOpen}
                  onClose={() => setIsScannerOpen(false)}
                  onScan={handleScannerScan}
                />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: CLASS ATTENDANCE LEDGER & HISTORY
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}> Class Attendance Ledger & Audit History</h2>
                  <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                    Historical log of all classes conducted with presence status and 1-click correction requests
                  </p>
                </div>
              </div>

              <div className="student-history-grid">
                {report?.history?.map((h: any) => (
                  <div key={h.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p className="font-semibold" style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                          {h.subject}
                        </p>
                        <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                          {new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                          Period {h.period} · Instructor: {h.teacher}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <span
                          className={`badge ${
                            h.status === 'P'
                              ? 'badge--online'
                              : h.status === 'A'
                              ? 'badge--offline'
                              : 'badge--pending'
                          }`}
                          style={{ fontWeight: 800 }}
                        >
                          {h.status === 'P'
                            ? '✓ Present'
                            : h.status === 'A'
                            ? '✗ Absent'
                            : h.status === 'L'
                            ? 'Late'
                            : h.status === 'OD'
                            ? 'On Duty'
                            : 'Leave'}
                        </span>

                        {h.status === 'A' && (
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', minHeight: 30 }}
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

              {/* Correction Request Modal */}
              {selectedRecordForCorrection && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    zIndex: 200,
                  }}
                >
                  <div className="card" style={{ maxWidth: 480, width: '100%', padding: '1.75rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Request Attendance Correction</h3>
                    <p className="text-xs text-muted" style={{ marginBottom: '1.25rem' }}>
                      Class: <strong>{selectedRecordForCorrection.subject}</strong> ({new Date(selectedRecordForCorrection.date).toLocaleDateString()})
                    </p>

                    <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                      Reason for correction
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="e.g. Present in class, was sitting on the back bench during digital token scan"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      style={{ marginBottom: '1.25rem' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
              TAB 4: APPLY LEAVE (TWO-COLUMN DESKTOP VIEW)
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'leave' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}> Student Leave Application & Verification Desk</h2>
                <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                  Submit medical, personal, or on-duty leaves. Medical leaves are cross-checked automatically with campus dispensary records.
                </p>
              </div>

              <div className="student-leave-grid">
                {/* Left Side: Leave Application Form */}
                <div className="card" style={{ padding: '1.75rem' }}>
                  <h3 style={{ marginBottom: '1.25rem' }}>Submit New Leave Request</h3>
                  <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="text-xs text-muted font-semibold" style={{ display: 'block', marginBottom: '0.35rem' }}>
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
                        <label className="text-xs text-muted font-semibold" style={{ display: 'block', marginBottom: '0.35rem' }}>
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
                      <label className="text-xs text-muted font-semibold" style={{ display: 'block', marginBottom: '0.35rem' }}>
                        Leave Classification
                      </label>
                      <select
                        className="input"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value as any)}
                      >
                        <option value="MEDICAL">Medical Leave (Dispensary Verified)</option>
                        <option value="PERSONAL">Personal / Family Leave</option>
                        <option value="EVENT">College Technical Fest / Event</option>
                        <option value="OD">On Duty (OD) / Hackathon</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted font-semibold" style={{ display: 'block', marginBottom: '0.35rem' }}>
                        Justification & Reason
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Provide details for leave verification..."
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        required
                      />
                    </div>

                    {leaveMessage && (
                      <div
                        className="card"
                        style={{
                          padding: '0.85rem',
                          background: leaveMessageIsError ? '#FFF1F2' : '#F0FDF4',
                          border: `1.5px solid ${leaveMessageIsError ? '#FECDD3' : '#BBF7D0'}`,
                          color: leaveMessageIsError ? '#B91C1C' : '#15803D',
                          fontWeight: 700,
                        }}
                      >
                        {leaveMessage}
                      </div>
                    )}

                    <button className="btn btn--primary" type="submit" disabled={submittingLeave} style={{ fontWeight: 800 }}>
                      {submittingLeave ? 'Submitting Application...' : 'Submit Leave Application'}
                    </button>
                  </form>
                </div>

                {/* Right Side: Previous Leave Applications */}
                <div>
                  <div className="card" style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h3 style={{ margin: 0 }}>Application History ({myLeaves.length})</h3>
                      <span className="badge" style={{ background: '#FFF0EE', color: 'var(--color-primary)', fontWeight: 800 }}>
                        Realtime Tracker
                      </span>
                    </div>

                    {leaveLoadError && <p className="alert alert--error" role="alert">{leaveLoadError}</p>}
                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                      {myLeaves.map((l) => (
                        <div
                          key={l.id}
                          style={{
                            background: '#FFF9F8',
                            border: '1px solid var(--color-border)',
                            borderRadius: '14px',
                            padding: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span className="badge" style={{ background: '#FFF0EE', color: 'var(--color-primary)', fontWeight: 800 }}>
                                  {l.type}
                                </span>
                                <span className="text-xs text-muted">
                                  {new Date(l.fromDate).toLocaleDateString()} — {new Date(l.toDate).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: 'var(--color-text)', marginTop: '0.25rem' }}>
                                {l.reason}
                              </p>
                            </div>

                            <span
                              className={`badge ${
                                l.status === 'APPROVED'
                                  ? 'badge--online'
                                  : l.status === 'REJECTED'
                                  ? 'badge--offline'
                                  : 'badge--pending'
                              }`}
                              style={{ fontWeight: 800 }}
                            >
                              {l.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Institutional User Profile Drawer */}
      <UserProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* ─── STEP 3: Instant Attendance Dispute / Correction Modal ──── */}
      {selectedRecordForCorrection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setSelectedRecordForCorrection(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: 540,
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid #FFDCD7',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                  }}
                >

                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1E293B' }}>
                    Attendance Dispute Claim
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Instant 1-Click Request to Subject Faculty
                  </span>
                </div>
              </div>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setSelectedRecordForCorrection(null)}
                style={{ fontSize: '1.2rem', lineHeight: 1, padding: '0.25rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Class Details Card */}
            <div
              style={{
                background: '#FFF5F5',
                border: '1px solid #FECDD3',
                borderRadius: '14px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                  Period {selectedRecordForCorrection.period} Class Session
                </span>
                <span
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Marked:  ABSENT
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {selectedRecordForCorrection.subject || '—'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                Faculty: <strong style={{ color: '#334155' }}>{selectedRecordForCorrection.teacher || '—'}</strong>
                {selectedRecordForCorrection.time && ` ·  ${selectedRecordForCorrection.time}`}
              </div>
            </div>

            {/* Requested Status */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                REQUESTED ATTENDANCE STATUS
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#15803D',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <span>✓ Change Status to:</span>
                <strong style={{ textDecoration: 'underline' }}>PRESENT (P)</strong>
                <span style={{ fontSize: '0.75rem', color: '#16A34A', marginLeft: 'auto' }}>Direct Faculty Ledger Update</span>
              </div>
            </div>

            {/* Quick Reason Preset Chips */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                QUICK REASON PRESETS (CLICK TO SELECT)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[
                  'Was present on bench, roll call missed during late entry',
                  'Dynamic QR token expired while camera was focusing',
                  'Attended lab experiment and submitted report to faculty',
                  'Approved On-Duty college activity during period',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCorrectionReason(preset)}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 9px',
                      borderRadius: '8px',
                      border: correctionReason === preset ? '1.5px solid var(--color-primary)' : '1px solid #E2E8F0',
                      background: correctionReason === preset ? '#FFF0EE' : '#F8FAFC',
                      color: correctionReason === preset ? 'var(--color-primary)' : '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                DISPUTE EXPLANATION FOR FACULTY *
              </label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Explain clearly why you were present in this lecture..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSelectedRecordForCorrection(null)}
                disabled={submittingCorrection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSubmitCorrection}
                disabled={submittingCorrection || !correctionReason.trim()}
                style={{ fontWeight: 800, minWidth: 160 }}
              >
                {submittingCorrection ? 'Submitting Claim...' : ' Submit Correction Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
