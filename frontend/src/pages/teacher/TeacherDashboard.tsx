import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { api } from '../../lib/api';
import { db } from '../../lib/db';
import { runSync } from '../../lib/syncEngine';
import { useNavigate } from 'react-router-dom';
import SyncBadge from '../../components/SyncBadge';
import RealtimeInsightCard from '../../components/RealtimeInsightCard';
import UpcomingClassCard from '../../components/teacher/UpcomingClassCard';
import MarksEntryTab from '../../components/teacher/MarksEntryTab';
import { TeacherLeaveTab } from '../../components/teacher/TeacherLeaveTab';
import DefaulterEmailManager from '../../components/teacher/DefaulterEmailManager';
import SingleDateAttendanceSnapshot from '../../components/teacher/SingleDateAttendanceSnapshot';
import UserProfileDrawer from '../../components/common/UserProfileDrawer';
import ProjectorQRMode from '../../components/teacher/ProjectorQRMode';
import InstallAppPrompt from '../../components/common/InstallAppPrompt';
import BrandLogo from '../../components/common/BrandLogo';

interface StudentItem {
  id: number;
  rollNo: string;
  name: string;
  status: 'P' | 'A' | 'L' | 'LV' | 'OD';
}

interface SectionItem {
  id: number;
  name: string;
  year: number;
  courseId: number;
  courseName: string;
  courseCode: string;
  departmentName?: string;
}

interface SubjectItem {
  id: number;
  name: string;
  code: string;
}

interface AssignedChip {
  sectionId: number;
  sectionName: string;
  sectionYear: number;
  courseCode: string;
  courseName: string;
  departmentName: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
}

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isOnline, pendingCount, isSyncing } = useSyncStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'mark' | 'qr' | 'marks' | 'approvals' | 'reports' | 'leaves'>('mark');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Academic data
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [period, setPeriod] = useState(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isLabClass, setIsLabClass] = useState(false);

  // Branch filter & quick-switch chips
  const [assignedChips, setAssignedChips] = useState<AssignedChip[]>([]);
  const [filterBranchCode, setFilterBranchCode] = useState<string>('ALL');
  const [activeChipKey, setActiveChipKey] = useState<string | null>(null);

  // Attendance roster
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // QR Session
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(10);
  const [qrActive, setQrActive] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);
  const qrScannedCount = students.filter((s) => s.status === 'P').length;

  // Approvals
  const [leaves, setLeaves] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // Reports
  const [classReport, setClassReport] = useState<any | null>(null);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Initial load: fetch bootstrap data
  useEffect(() => {
    loadInitialData();
    loadAssignedChips();
  }, []);

  async function loadAssignedChips() {
    try {
      const res = await api.get('/academic/teacher/assigned-classes');
      setAssignedChips(res.data.data || []);
    } catch {
      // Backend unavailable: chips will be empty, graceful degradation
    }
  }

  async function loadInitialData() {
    try {
      if (isOnline) {
        const res = await api.get('/sync/bootstrap');
        const data = res.data.data;
        if (data.sections?.length > 0) {
          setSections(data.sections);
          setSelectedSection(data.sections[0].id);
        }
        if (data.subjects?.length > 0) {
          setSubjects(data.subjects);
          setSelectedSubject(data.subjects[0].id);
        }
      } else {
        // Load from IndexedDB
        const localSections = await db.sections.toArray();
        const localSubjects = await db.subjects.toArray();
        if (localSections.length > 0) {
          setSections(localSections);
          setSelectedSection(localSections[0].id);
        }
        if (localSubjects.length > 0) {
          setSubjects(localSubjects);
          setSelectedSubject(localSubjects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load initial teacher data', err);
    }
  }

  // When selectedSection changes, load students
  useEffect(() => {
    if (selectedSection) {
      loadStudentsForSection(selectedSection);
    }
  }, [selectedSection]);

  async function loadStudentsForSection(sectionId: number) {
    try {
      let stList: any[] = [];
      if (isOnline) {
        const res = await api.get(`/users/students?sectionId=${sectionId}`);
        stList = res.data.data;
      } else {
        stList = await db.students.where('sectionId').equals(sectionId).toArray();
      }

      setStudents(
        stList.map((s) => ({
          id: s.id,
          rollNo: s.rollNo,
          name: s.user?.name || s.name || `Student ${s.rollNo}`,
          status: 'P', // Default to Present
        }))
      );
    } catch (err) {
      console.error('Failed to load students', err);
    }
  }

  // Fast bulk status changes
  function markAll(status: 'P' | 'A') {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  }

  function toggleStudentStatus(studentId: number, nextStatus: 'P' | 'A' | 'L' | 'LV' | 'OD') {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: nextStatus } : s))
    );
  }

  // Save Attendance (Offline-First)
  async function handleSaveAttendance() {
    if (!selectedSection || !selectedSubject) {
      alert('Please select both a section and a subject');
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const recordsToSave = students.map((s) => ({
        studentId: s.id,
        status: s.status,
        method: 'MANUAL',
        clientTs: new Date().toISOString(),
      }));

      if (isOnline) {
        // 1. Create or get session on server
        const sessionRes = await api.post('/attendance/sessions', {
          sectionId: selectedSection,
          subjectId: selectedSubject,
          date,
          period,
        });
        const sessionId = sessionRes.data.data.id;

        // 2. Mark records on server
        await api.post(`/attendance/sessions/${sessionId}/records`, {
          records: recordsToSave,
        });

        // 3. STEP 5: If Lab Practical (Double Period), also record period + 1 for 2x attendance credit!
        if (isLabClass) {
          try {
            const nextPeriod = period + 1;
            const sessionRes2 = await api.post('/attendance/sessions', {
              sectionId: selectedSection,
              subjectId: selectedSubject,
              date,
              period: nextPeriod,
            });
            await api.post(`/attendance/sessions/${sessionRes2.data.data.id}/records`, {
              records: recordsToSave,
            });
            setSaveMessage(`✓ Lab Attendance saved for Periods ${period} & ${nextPeriod} (Double Attendance Credit · 2x)!`);
          } catch (labErr) {
            console.warn('Period + 1 lab credit logged:', labErr);
            setSaveMessage('✓ Attendance saved and synced to server!');
          }
        } else {
          setSaveMessage('✓ Attendance saved and synced to server!');
        }
      } else {
        const outboxItems = students.map((s) => ({
          id: crypto.randomUUID(),
          type: 'attendance_record' as const,
          payload: {
            sectionId: selectedSection,
            subjectId: selectedSubject,
            date,
            period,
            studentId: s.id,
            status: s.status,
            method: 'MANUAL',
            clientTs: new Date().toISOString(),
          },
          status: 'pending' as const,
          attempts: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        if (isLabClass) {
          const outboxItems2 = students.map((s) => ({
            id: crypto.randomUUID(),
            type: 'attendance_record' as const,
            payload: {
              sectionId: selectedSection,
              subjectId: selectedSubject,
              date,
              period: period + 1,
              studentId: s.id,
              status: s.status,
              method: 'MANUAL',
              clientTs: new Date().toISOString(),
            },
            status: 'pending' as const,
            attempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          await db.outbox.bulkAdd([...outboxItems, ...outboxItems2]);
          useSyncStore.getState().incrementPending();
          useSyncStore.getState().incrementPending();
          setSaveMessage('⚡ Lab Attendance saved locally for 2 continuous periods (2x Credit)! Will auto-sync.');
        } else {
          await db.outbox.bulkAdd(outboxItems);
          useSyncStore.getState().incrementPending();
          setSaveMessage('⚡ Saved locally! Will auto-sync when internet reconnects.');
        }
      }
    } catch (err: any) {
      console.error('Failed to save attendance', err);
      setSaveMessage('⚠️ Error saving attendance. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }

  // Live QR Attendance logic
  async function handleStartQr() {
    if (!selectedSection || !selectedSubject) {
      alert('Please select a section and a subject first');
      return;
    }

    try {
      const sessionRes = await api.post('/attendance/sessions', {
        sectionId: selectedSection,
        subjectId: selectedSubject,
        date,
        period,
      });
      const sId = sessionRes.data.data.id;
      setQrSessionId(sId);
      setQrActive(true);
    } catch (err) {
      console.error('Failed to start QR session', err);
      alert('Failed to start QR session');
    }
  }

  useEffect(() => {
    let interval: any;
    if (qrActive && qrSessionId) {
      const fetchToken = async () => {
        try {
          const res = await api.get(`/qr/token/${qrSessionId}`);
          setQrToken(res.data.data.token);
          setQrSecondsLeft(res.data.data.secondsRemaining);
        } catch (err) {
          console.error('Token fetch error', err);
        }
      };

      fetchToken();
      interval = setInterval(fetchToken, 2000);
    }
    return () => clearInterval(interval);
  }, [qrActive, qrSessionId]);

  // Approvals logic
  async function loadApprovals() {
    setLoadingApprovals(true);
    try {
      const [lRes, cRes] = await Promise.all([
        api.get('/leaves?status=PENDING'),
        api.get('/correction-requests?status=PENDING'),
      ]);
      setLeaves(lRes.data.data);
      setCorrections(cRes.data.data);
    } catch (err) {
      console.error('Failed to load approvals', err);
    } finally {
      setLoadingApprovals(false);
    }
  }

  async function handleLeaveDecision(leaveId: string, decision: 'APPROVED' | 'REJECTED') {
    try {
      await api.patch(`/leaves/${leaveId}/decision`, { decision, note: `${decision} by teacher` });
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (err) {
      alert('Failed to update leave');
    }
  }

  async function handleCorrectionDecision(corrId: string, decision: 'APPROVED' | 'REJECTED') {
    try {
      await api.patch(`/correction-requests/${corrId}/decision`, { decision, note: `${decision} by teacher` });
      setCorrections((prev) => prev.filter((c) => c.id !== corrId));
    } catch (err) {
      alert('Failed to update correction');
    }
  }

  // Reports logic
  async function loadReports() {
    setLoadingReport(true);
    try {
      const secId = selectedSection || 1;
      const [repRes, defRes] = await Promise.all([
        api.get(`/reports/class?sectionId=${secId}`),
        api.get(`/reports/defaulters?sectionId=${secId}`),
      ]);
      setClassReport(repRes.data.data);
      setDefaulters(defRes.data.data.defaulters);
    } catch (err) {
      console.warn('API unavailable, loading demo class attendance report', err);
      setClassReport({
        classAverage: 68.4,
        totalStudents: 6,
        students: [
          { studentId: 1, rollNo: '2101640100015', name: 'Aman Kumar', totalClasses: 44, present: 14, percentage: 31.8 },
          { studentId: 2, rollNo: '2101640100016', name: 'Ananya Dixit', totalClasses: 44, present: 39, percentage: 88.6 },
          { studentId: 3, rollNo: '2101640100017', name: 'Deepak Yadav', totalClasses: 44, present: 29, percentage: 65.9 },
          { studentId: 4, rollNo: '2101640100018', name: 'Muskan Gupta', totalClasses: 44, present: 41, percentage: 93.2 },
          { studentId: 5, rollNo: '2101640100019', name: 'Prashant Shukla', totalClasses: 44, present: 27, percentage: 61.4 },
          { studentId: 6, rollNo: '2101640100020', name: 'Rishabh Tripathi', totalClasses: 44, present: 36, percentage: 81.8 },
        ],
      });
      setDefaulters([
        { studentId: 1, rollNo: '2101640100015', name: 'Aman Kumar', percentage: 31.8, shortage: '19 classes' },
        { studentId: 3, rollNo: '2101640100017', name: 'Deepak Yadav', percentage: 65.9, shortage: '4 classes' },
        { studentId: 5, rollNo: '2101640100019', name: 'Prashant Shukla', percentage: 61.4, shortage: '6 classes' },
      ]);
    } finally {
      setLoadingReport(false);
    }
  }

  async function handleExportCSV() {
    const rows = classReport?.students || [
      { rollNo: '2101640100015', name: 'Aman Kumar', totalClasses: 44, present: 14, percentage: 31.8 },
      { rollNo: '2101640100016', name: 'Ananya Dixit', totalClasses: 44, present: 39, percentage: 88.6 },
      { rollNo: '2101640100017', name: 'Deepak Yadav', totalClasses: 44, present: 29, percentage: 65.9 },
      { rollNo: '2101640100018', name: 'Muskan Gupta', totalClasses: 44, present: 41, percentage: 93.2 },
      { rollNo: '2101640100019', name: 'Prashant Shukla', totalClasses: 44, present: 27, percentage: 61.4 },
      { rollNo: '2101640100020', name: 'Rishabh Tripathi', totalClasses: 44, present: 36, percentage: 81.8 },
    ];
    let csv = 'Roll No,Student Name,Total Classes,Classes Attended,Attendance %,Status\n';
    rows.forEach((s: any) => {
      csv += `${s.rollNo},"${s.name}",${s.totalClasses},${s.present},${s.percentage}%,${s.percentage >= 75 ? 'ELIGIBLE' : 'DEFAULTER'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AKTU_Attendance_Register_Section_${selectedSection || 'CSE-3A'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  }

  // Counts
  const presentCount = students.filter((s) => s.status === 'P').length;
  const absentCount = students.filter((s) => s.status === 'A').length;
  const lateCount = students.filter((s) => s.status === 'L').length;

  return (
    <div className="page">
      {/* Header */}
      <header
        style={{
          background: 'var(--color-surface)',
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
          <BrandLogo size="md" subtitle="Faculty Portal" onClick={() => navigate('/teacher')} />
        </div>

        {/* Trombone Quick Search Pill */}
        <div className="trombone-search-pill" style={{ minWidth: 220, maxWidth: 360, flex: 1, margin: '0 0.5rem' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Quick search student or subject..."
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem', fontFamily: 'inherit', color: 'var(--color-text)' }}
          />
          <span className="trombone-kbd-shortcut">⌘K</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Trombone User Profile Chip */}
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
            title="Click to view/edit profile"
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
              {(user?.name || 'TC').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {user?.name || 'Faculty Member'}
            </span>
            <span style={{ fontSize: '0.65rem', background: '#F59E0B', color: '#0F172A', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              FACULTY
            </span>
          </button>

          <SyncBadge />
          {pendingCount > 0 && isOnline && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => runSync()}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={handleLogout} title="Sign Out">
            ⎋ Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
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
          className={`btn btn--sm ${activeTab === 'mark' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('mark')}
        >
          ✏️ Mark Attendance
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'qr' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('qr')}
        >
          📱 Live QR Code
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'marks' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('marks')}
        >
          📝 Internal Marks
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'approvals' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => {
            setActiveTab('approvals');
            loadApprovals();
          }}
        >
          📑 Approvals ({leaves.length + corrections.length})
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'reports' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => {
            setActiveTab('reports');
            loadReports();
          }}
        >
          📊 Class Reports
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'leaves' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('leaves')}
        >
          🏖️ Faculty Leaves
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '1.25rem clamp(0.75rem, 2.5vw, 1.5rem)' }}>
        <div className="container container--wide">
          <InstallAppPrompt />
          {/* Realtime Insight & Calendar Widget (Screen 3) */}
          <RealtimeInsightCard />

          {/* ─────────────────────────────────────────────────────────────
              TAB 1: MARK ATTENDANCE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'mark' && (
            <div>
              {/* ── STEP 4: Schedule-Aware 1-Click Roll Call Launcher ── */}
              <UpcomingClassCard
                onStartManualRollCall={(secId, subId, p, isLab) => {
                  setSelectedSection(secId);
                  setSelectedSubject(subId);
                  setPeriod(p);
                  setIsLabClass(isLab);
                  setActiveTab('mark');
                  setTimeout(() => {
                    document.getElementById('attendance-roster-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
                onStartQr={(secId, subId, p, isLab) => {
                  setSelectedSection(secId);
                  setSelectedSubject(subId);
                  setPeriod(p);
                  setIsLabClass(isLab);
                  setActiveTab('qr');
                }}
              />

              {/* ── My Assigned Classes Quick-Switch Chips ── */}
              {assignedChips.length > 0 && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.875rem 1rem',
                    background: 'var(--color-surface-2)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🎯 My Assigned Classes
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                      {assignedChips.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {assignedChips.map((chip) => {
                      const chipKey = `${chip.sectionId}-${chip.subjectId}`;
                      const isActive = activeChipKey === chipKey;
                      return (
                        <button
                          key={chipKey}
                          type="button"
                          onClick={() => {
                            setActiveChipKey(chipKey);
                            setSelectedSection(chip.sectionId);
                            setSelectedSubject(chip.subjectId);
                            setFilterBranchCode(chip.courseCode);
                          }}
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '0.125rem',
                            padding: '0.5rem 0.875rem',
                            borderRadius: '10px',
                            border: isActive ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                            background: isActive ? 'linear-gradient(135deg, var(--color-primary) 0%, #FF7A00 100%)' : 'var(--color-surface)',
                            color: isActive ? '#fff' : 'var(--color-text)',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            boxShadow: isActive ? '0 4px 14px var(--color-primary-glow)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                            {chip.courseCode} · {chip.sectionName}
                          </span>
                          <span style={{ fontSize: '0.68rem', opacity: 0.85, fontWeight: 500 }}>
                            {chip.subjectName} ({chip.subjectCode})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Class & Date Controls with Branch Filter ── */}
              <div
                className="card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                {/* Branch Filter */}
                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>
                    🏛️ Filter by Branch
                  </label>
                  <select
                    className="input"
                    value={filterBranchCode}
                    onChange={(e) => {
                      setFilterBranchCode(e.target.value);
                      setActiveChipKey(null);
                    }}
                    style={{ height: 44, fontWeight: 600, background: 'var(--color-surface-2)' }}
                  >
                    <option value="ALL">🌐 All Branches</option>
                    {Array.from(new Set(sections.filter(s => s.courseCode).map(s => s.courseCode))).map((code) => {
                      const sec = sections.find(s => s.courseCode === code)!;
                      return (
                        <option key={code} value={code}>
                          {code} — {sec.courseName || sec.courseCode}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Grouped Section Selector */}
                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>
                    📋 Section
                  </label>
                  <select
                    className="input"
                    value={selectedSection || ''}
                    onChange={(e) => {
                      setSelectedSection(Number(e.target.value));
                      setActiveChipKey(null);
                    }}
                    style={{ height: 44 }}
                  >
                    {filterBranchCode === 'ALL' ? (
                      // Grouped by course
                      Array.from(new Set(sections.map(s => s.courseCode || 'Other'))).map((code) => (
                        <optgroup key={code} label={`📚 ${code}`}>
                          {sections.filter(s => (s.courseCode || 'Other') === code).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.year ? `(Year ${s.year})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    ) : (
                      sections
                        .filter(s => s.courseCode === filterBranchCode)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.year ? `(Year ${s.year})` : ''}
                          </option>
                        ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Select Subject
                  </label>
                  <select
                    className="input"
                    value={selectedSubject || ''}
                    onChange={(e) => {
                      const subId = Number(e.target.value);
                      setSelectedSubject(subId);
                      const subObj = subjects.find(s => s.id === subId);
                      if (subObj && (subObj.name.toLowerCase().includes('lab') || subObj.code.toLowerCase().includes('lab'))) {
                        setIsLabClass(true);
                      }
                    }}
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Period (Slot)
                  </label>
                  <select className="input" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* STEP 5: Lab Practical Double Period Toggle */}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      background: isLabClass ? '#EEF2FF' : 'var(--color-surface)',
                      border: isLabClass ? '1.5px solid #6366F1' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      height: 44,
                      userSelect: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isLabClass}
                      onChange={(e) => setIsLabClass(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#4F46E5', cursor: 'pointer' }}
                    />
                    <div style={{ lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isLabClass ? '#4F46E5' : 'var(--color-text)', display: 'block' }}>
                        🧪 Lab Practical
                      </span>
                      <span style={{ fontSize: '0.65rem', color: isLabClass ? '#6366F1' : 'var(--color-muted)' }}>
                        {isLabClass ? `Double Period (P${period} & P${period + 1} · 2x)` : '1 Period (1x)'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Active Class Context Hero Card ── */}
              {selectedSection && (() => {
                const sec = sections.find(s => s.id === selectedSection);
                const sub = subjects.find(s => s.id === selectedSubject);
                return sec ? (
                  <div
                    style={{
                      marginBottom: '1.25rem',
                      padding: '0.875rem 1.125rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(230,60,45,0.07) 0%, rgba(255,122,0,0.06) 100%)',
                      border: '1px solid rgba(230,60,45,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                        🏛️ {sec.departmentName || sec.courseName || sec.courseCode || 'Department'}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                        {sec.courseName || sec.courseCode} — {sec.name}
                        {sec.year ? <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>· Year {sec.year}</span> : null}
                      </div>
                      {sub && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                          Subject: <strong>{sub.name}</strong> ({sub.code}) · Period {period} · {date}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge badge--online">{presentCount} Present</span>
                      <span className="badge badge--offline">{absentCount} Absent</span>
                      <span className="badge badge--pending">{students.length} Total</span>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Roster Header & Quick Actions */}
              <div
                id="attendance-roster-section"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div className="flex items-center gap-2">
                  <h3>Student Roster ({students.length})</h3>
                  <span className="badge badge--online">{presentCount} Present</span>
                  <span className="badge badge--offline">{absentCount} Absent</span>
                  {lateCount > 0 && <span className="badge badge--pending">{lateCount} Late</span>}
                </div>

                <div className="flex items-center gap-1">
                  <button className="btn btn--ghost btn--sm" onClick={() => markAll('P')}>
                    ✓ All Present
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => markAll('A')}>
                    ✗ All Absent
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveAttendance}
                    disabled={saving || students.length === 0}
                  >
                    {saving ? 'Saving...' : '💾 Save Attendance'}
                  </button>
                </div>
              </div>

              {saveMessage && (
                <div
                  className="card"
                  style={{
                    marginBottom: '1rem',
                    background: saveMessage.includes('Error')
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${
                      saveMessage.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)'
                    }`,
                    fontWeight: 600,
                  }}
                >
                  {saveMessage}
                </div>
              )}

              {/* Student Cards List */}
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {students.map((st) => (
                  <div
                    key={st.id}
                    className="card"
                    style={{
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      background:
                        st.status === 'P'
                          ? 'rgba(16, 185, 129, 0.05)'
                          : st.status === 'A'
                          ? 'rgba(239, 68, 68, 0.05)'
                          : 'var(--color-surface)',
                    }}
                  >
                    <div>
                      <span className="badge" style={{ marginRight: '0.5rem' }}>
                        {st.rollNo}
                      </span>
                      <span className="font-semibold">{st.name}</span>
                    </div>

                    {/* 3-tap buttons: P, A, L, OD */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`btn btn--sm ${st.status === 'P' ? 'btn--primary' : 'btn--ghost'}`}
                        style={st.status === 'P' ? { background: 'var(--color-success)' } : {}}
                        onClick={() => toggleStudentStatus(st.id, 'P')}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${st.status === 'A' ? 'btn--primary' : 'btn--ghost'}`}
                        style={st.status === 'A' ? { background: 'var(--color-danger)' } : {}}
                        onClick={() => toggleStudentStatus(st.id, 'A')}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${st.status === 'L' ? 'btn--primary' : 'btn--ghost'}`}
                        style={st.status === 'L' ? { background: 'var(--color-warning)' } : {}}
                        onClick={() => toggleStudentStatus(st.id, 'L')}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${st.status === 'OD' ? 'btn--primary' : 'btn--ghost'}`}
                        style={st.status === 'OD' ? { background: 'var(--color-primary)' } : {}}
                        onClick={() => toggleStudentStatus(st.id, 'OD')}
                      >
                        OD
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: LIVE ROTATING QR CODE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'qr' && (
            <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
              {/* Projector Fullscreen Overlay */}
              {projectorMode && (
                <ProjectorQRMode
                  sessionId={qrSessionId}
                  qrToken={qrToken}
                  secondsLeft={qrSecondsLeft}
                  scannedCount={qrScannedCount}
                  totalStudents={students.length}
                  subjectName={subjects.find((s) => s.id === selectedSubject)?.name || 'Subject'}
                  subjectCode={subjects.find((s) => s.id === selectedSubject)?.code || ''}
                  sectionName={sections.find((s) => s.id === selectedSection)?.name || 'Section'}
                  period={period}
                  date={date}
                  onExit={() => setProjectorMode(false)}
                />
              )}
              <div className="card">
                <h2 style={{ marginBottom: '0.5rem' }}>📱 Rotating QR Attendance</h2>
                <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
                  Students scan this QR with their AttendAI app. Rotates every 10 seconds to eliminate proxy attendance.
                </p>

                {!qrActive ? (
                  <button className="btn btn--primary" onClick={handleStartQr}>
                    Start QR Session for Period {period}
                  </button>
                ) : (
                  <div>
                    {/* Live Token Box */}
                    <div
                      style={{
                        padding: '2rem',
                        margin: '1.5rem auto',
                        background: '#ffffff',
                        color: '#000000',
                        borderRadius: '16px',
                        display: 'inline-block',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '4px' }}>
                        {qrToken || '------'}
                      </div>
                      <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Or enter this 8-character code
                      </p>
                    </div>

                    {/* Countdown Progress Bar */}
                    <div style={{ width: '80%', margin: '0 auto 1.5rem auto' }}>
                      <div
                        style={{
                          height: 8,
                          background: 'var(--color-surface-2)',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(qrSecondsLeft / 10) * 100}%`,
                            background: qrSecondsLeft < 3 ? 'var(--color-danger)' : 'var(--color-primary)',
                            transition: 'width 1s linear',
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted" style={{ marginTop: '0.375rem' }}>
                        Rotates in {qrSecondsLeft}s
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        id="projector-mode-btn"
                        className="btn btn--primary btn--sm"
                        onClick={() => setProjectorMode(true)}
                        title="Display QR fullscreen on projector / smartboard"
                      >
                        📽️ Projector Fullscreen Mode
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setQrActive(false)}
                      >
                        Stop QR Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB: INTERNAL & SESSIONALS MARKS ENTRY
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'marks' && (
            <div>
              <MarksEntryTab
                sections={sections.length > 0 ? sections : undefined}
                subjects={subjects.length > 0 ? subjects : undefined}
              />
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: LEAVE & CORRECTION APPROVALS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'approvals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Pending Approvals</h2>
                <button className="btn btn--ghost btn--sm" onClick={loadApprovals} disabled={loadingApprovals}>
                  ⟳ Refresh
                </button>
              </div>

              {/* Leaves Section */}
              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
                🏖️ Leave Applications ({leaves.length})
              </h3>
              {leaves.length === 0 ? (
                <p className="text-sm text-muted">No pending leave applications.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {leaves.map((l) => (
                    <div key={l.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="font-semibold">
                            {l.student?.user?.name} ({l.student?.rollNo})
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(l.fromDate).toLocaleDateString()} — {new Date(l.toDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm" style={{ marginTop: '0.5rem' }}>
                            <strong>Type:</strong> {l.type} | <strong>Reason:</strong> {l.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn--primary btn--sm"
                            style={{ background: 'var(--color-success)' }}
                            onClick={() => handleLeaveDecision(l.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleLeaveDecision(l.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Corrections Section */}
              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem' }}>
                ✏️ Attendance Correction Requests ({corrections.length})
              </h3>
              {corrections.length === 0 ? (
                <p className="text-sm text-muted">No pending correction requests.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {corrections.map((c) => (
                    <div key={c.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="font-semibold">
                            {c.student?.user?.name} ({c.student?.rollNo})
                          </p>
                          <p className="text-xs text-muted">
                            Subject: {c.session?.subject?.name} | Date:{' '}
                            {new Date(c.session?.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm" style={{ marginTop: '0.5rem' }}>
                            Requested: <strong style={{ color: 'var(--color-success)' }}>{c.requestedStatus}</strong>{' '}
                            | Reason: {c.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn--primary btn--sm"
                            style={{ background: 'var(--color-success)' }}
                            onClick={() => handleCorrectionDecision(c.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleCorrectionDecision(c.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4: REPORTS & DEFAULTERS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Daily Historical Date & Period Attendance Snapshot (Repository Feature) */}
              <SingleDateAttendanceSnapshot />

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div>
                    <h2>Class Attendance Aggregate Report</h2>
                    <p className="text-sm text-muted">
                      Class Average:{' '}
                      <strong style={{ color: 'var(--color-primary)' }}>
                        {classReport?.classAverage || 0}%
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="btn btn--ghost btn--sm" onClick={loadReports} disabled={loadingReport}>
                      ⟳ Refresh
                    </button>
                    <button className="btn btn--primary btn--sm" onClick={handleExportCSV}>
                      📥 Export CSV
                    </button>
                  </div>
                </div>

                {/* Defaulter Alert Box */}
                {defaulters.length > 0 && (
                  <div
                    className="card"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h3 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                      ⚠️ {defaulters.length} Defaulters Below 75%
                    </h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {defaulters.map((d) => (
                        <div
                          key={d.studentId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <span>
                            {d.rollNo} — {d.name}
                          </span>
                          <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                            {d.percentage}% (Shortage: {d.shortage})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Student Summary Table */}
                <div className="card" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '0.75rem' }}>Roll No</th>
                        <th style={{ padding: '0.75rem' }}>Name</th>
                        <th style={{ padding: '0.75rem' }}>Total Classes</th>
                        <th style={{ padding: '0.75rem' }}>Present</th>
                        <th style={{ padding: '0.75rem' }}>Attendance %</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classReport?.students?.map((st: any) => (
                        <tr key={st.studentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.75rem' }}>{st.rollNo}</td>
                          <td style={{ padding: '0.75rem' }}>{st.name}</td>
                          <td style={{ padding: '0.75rem' }}>{st.totalClasses}</td>
                          <td style={{ padding: '0.75rem' }}>{st.present}</td>
                          <td
                            style={{
                              padding: '0.75rem',
                              fontWeight: 700,
                              color: st.percentage < 75 ? 'var(--color-danger)' : 'var(--color-success)',
                            }}
                          >
                            {st.percentage}%
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              className={`badge ${
                                st.percentage < 75 ? 'badge--offline' : 'badge--online'
                              }`}
                            >
                              {st.percentage < 75 ? 'Defaulter' : 'Eligible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Defaulter Email Warning Notification Engine */}
              <DefaulterEmailManager />
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 6: FACULTY LEAVE MANAGEMENT
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'leaves' && <TeacherLeaveTab />}
        </div>
      </main>

      {/* Institutional User Profile Drawer */}
      <UserProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
