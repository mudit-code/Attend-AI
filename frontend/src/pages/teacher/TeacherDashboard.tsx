import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { api } from '../../lib/api';
import { db } from '../../lib/db';
import { runSync } from '../../lib/syncEngine';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import SyncBadge from '../../components/SyncBadge';
import RealtimeInsightCard from '../../components/RealtimeInsightCard';
import UpcomingClassCard from '../../components/teacher/UpcomingClassCard';
import MarksEntryTab from '../../components/teacher/MarksEntryTab';
import AssignmentsTab from '../../components/teacher/AssignmentsTab';
import { TeacherLeaveTab } from '../../components/teacher/TeacherLeaveTab';
import DefaulterEmailManager from '../../components/teacher/DefaulterEmailManager';
import SingleDateAttendanceSnapshot from '../../components/teacher/SingleDateAttendanceSnapshot';
import UserProfileDrawer from '../../components/common/UserProfileDrawer';
import ProjectorQRMode from '../../components/teacher/ProjectorQRMode';
import InstallAppPrompt from '../../components/common/InstallAppPrompt';
import BrandLogo from '../../components/common/BrandLogo';
import FacultyAdjustmentHODDesk from '../../components/admin/FacultyAdjustmentHODDesk';

interface StudentItem {
  id: number;
  rollNo: string;
  name: string;
  status: 'P' | 'A' | 'L' | 'LV' | 'OD';
  method?: string;
}

interface SectionItem {
  id: number;
  name: string;
  year: number;
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

interface ProxyAdjustmentItem {
  id: number;
  period: number;
  sectionId: number;
  subjectId: number;
  status: string;
  reason?: string | null;
  section: { id: number; name: string; course?: { code: string; name: string } };
  subject: { id: number; name: string; code: string };
  originalTeacher?: { user?: { name: string } };
}

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { isOnline, pendingCount, isSyncing } = useSyncStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'mark' | 'qr' | 'marks' | 'assignments' | 'approvals' | 'reports' | 'leaves' | 'hod_adjustments'>('mark');
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
  const [assignedClassesLoading, setAssignedClassesLoading] = useState(true);
  const [assignedClassesError, setAssignedClassesError] = useState<string | null>(null);
  const [filterBranchCode, setFilterBranchCode] = useState<string>('ALL');
  const [activeChipKey, setActiveChipKey] = useState<string | null>(null);
  const [proxyAdjustments, setProxyAdjustments] = useState<ProxyAdjustmentItem[]>([]);

  // Attendance roster
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // QR Session
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(10);
  const [qrActive, setQrActive] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [projectorMode, setProjectorMode] = useState(false);
  const qrScannedCount = students.filter((s) => s.status === 'P').length;

  // Face Attendance Window
  const [faceSessionActive, setFaceSessionActive] = useState(false);
  const [faceSessionId, setFaceSessionId] = useState<string | null>(null);
  const [faceTimeLeft, setFaceTimeLeft] = useState<number>(0);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceMessage, setFaceMessage] = useState<string | null>(null);

  // Approvals
  const [leaves, setLeaves] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // Reports
  const [classReport, setClassReport] = useState<any | null>(null);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Initial load: fetch bootstrap data
  useEffect(() => {
    loadAssignedChips();
    loadTodayAdjustments();
  }, []);

  async function loadTodayAdjustments() {
    try {
      const res = await api.get('/academic/adjustments/today');
      setProxyAdjustments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setProxyAdjustments([]);
    }
  }

  async function loadAssignedChips() {
    try {
      const res = await api.get('/academic/teacher/assigned-classes');
      const assignments: AssignedChip[] = Array.isArray(res.data.data) ? res.data.data : [];
      setAssignedChips(assignments);
      const sectionMap = new Map<number, SectionItem>();
      const subjectMap = new Map<number, SubjectItem>();
      for (const assignment of assignments) {
        sectionMap.set(assignment.sectionId, {
          id: assignment.sectionId,
          name: assignment.sectionName,
          year: assignment.sectionYear,
          courseName: assignment.courseName,
          courseCode: assignment.courseCode,
          departmentName: assignment.departmentName,
        });
        subjectMap.set(assignment.subjectId, {
          id: assignment.subjectId,
          name: assignment.subjectName,
          code: assignment.subjectCode,
        });
      }
      const assignedSections = [...sectionMap.values()];
      const assignedSubjects = [...subjectMap.values()];
      setSections(assignedSections);
      setSubjects(assignedSubjects);
      if (assignments[0]) {
        setSelectedSection(assignments[0].sectionId);
        setSelectedSubject(assignments[0].subjectId);
        setActiveChipKey(`${assignments[0].sectionId}-${assignments[0].subjectId}`);
      }
      setAssignedClassesError(null);
    } catch (requestError: unknown) {
      const response = typeof requestError === 'object' && requestError !== null && 'response' in requestError
        ? (requestError as { response?: { data?: { error?: { message?: string } } } }).response
        : undefined;
      setAssignedChips([]);
      setAssignedClassesError(
        response?.data?.error?.message || 'Could not load your assigned classes. Check the backend connection and refresh.'
      );
    } finally {
      setAssignedClassesLoading(false);
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
        try {
          const res = await api.get(`/users/students?sectionId=${sectionId}`);
          stList = res.data.data;
        } catch {
          stList = await db.students.where('sectionId').equals(sectionId).toArray();
        }
      } else {
        stList = await db.students.where('sectionId').equals(sectionId).toArray();
      }

      if (!stList) stList = [];

      setStudents(
        stList.map((s) => ({
          id: s.id,
          rollNo: s.rollNo,
          name: s.user?.name || s.name || s.rollNo,
          status: 'A',
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
          setSaveMessage(' Lab Attendance saved locally for 2 continuous periods (2x Credit)! Will auto-sync.');
        } else {
          await db.outbox.bulkAdd(outboxItems);
          useSyncStore.getState().incrementPending();
          setSaveMessage(' Saved locally! Will auto-sync when internet reconnects.');
        }
      }
    } catch (err: any) {
      console.error('Failed to save attendance', err);
      setSaveMessage(' Error saving attendance. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }

  // Live QR Attendance logic
  async function handleStartQr(customSecId?: number, customSubId?: number, customPeriod?: number) {
    const targetSection = customSecId ?? selectedSection;
    const targetSubject = customSubId ?? selectedSubject;
    const targetPeriod = customPeriod ?? period;

    if (!targetSection || !targetSubject) {
      setQrError('Select an assigned section and subject before starting attendance.');
      return;
    }

    setQrError(null);
    try {
      const sessionRes = await api.post('/attendance/sessions', {
        sectionId: targetSection,
        subjectId: targetSubject,
        date,
        period: targetPeriod,
      });
      const sessionId = sessionRes.data?.data?.id;
      if (!sessionId) throw new Error('The server did not return an attendance session ID.');
      setQrSessionId(sessionId);
      setQrActive(true);
    } catch (requestError) {
      setQrError(requestError instanceof Error ? requestError.message : 'Could not start the QR attendance session.');
    }
  }

  useEffect(() => {
    let interval: any;
    if (qrActive && qrSessionId) {
      const updateToken = async () => {
        try {
          const res = await api.get(`/qr/token/${qrSessionId}`);
          if (!res.data?.data?.token) throw new Error('The server did not return an attendance token.');
          setQrToken(res.data.data.token);
          setQrSecondsLeft(res.data.data.secondsRemaining);
          setQrError(null);
        } catch (requestError) {
          setQrToken('');
          setQrError(requestError instanceof Error ? requestError.message : 'Could not refresh the QR attendance token.');
        }
      };

      updateToken();
      interval = setInterval(updateToken, 1000);
    }
    return () => clearInterval(interval);
  }, [qrActive, qrSessionId]);

  useEffect(() => {
    if (!qrActive || !qrSessionId) return;
    let active = true;
    const refreshRecords = async () => {
      try {
        const res = await api.get(`/attendance/sessions/${qrSessionId}`);
        if (!active) return;
        const records = res.data.data?.records ?? [];
        const recordedStatuses = new Map<number, StudentItem['status']>(
          records.map((record: any) => [record.studentId, record.status])
        );
        setStudents((current) => current.map((student) => ({
          ...student,
          status: recordedStatuses.get(student.id) ?? student.status,
        })));
      } catch {
        if (active) setQrError('Could not refresh attendance records from the server.');
      }
    };
    void refreshRecords();
    const intervalId = setInterval(refreshRecords, 3000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [qrActive, qrSessionId]);

  // Face Window Handlers & Effects
  async function handleStartFaceWindow(durationMinutes = 5) {
    if (!selectedSection || !selectedSubject) {
      alert('Please select a section and a subject first.');
      return;
    }
    setFaceLoading(true);
    setFaceMessage(null);
    try {
      const sessionRes = await api.post('/attendance/sessions', {
        sectionId: selectedSection,
        subjectId: selectedSubject,
        date,
        period,
      });
      const sessionId = sessionRes.data?.data?.id;
      if (!sessionId) throw new Error('Could not establish attendance session.');

      await api.post(`/attendance/sessions/${sessionId}/face-window/start`, {
        durationMinutes,
      });

      setFaceSessionId(sessionId);
      setFaceSessionActive(true);
      setFaceTimeLeft(durationMinutes * 60);
      setFaceMessage(`Face attendance window open for ${durationMinutes} minutes`);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Failed to start face window';
      setFaceMessage(`Error: ${errMsg}`);
    } finally {
      setFaceLoading(false);
    }
  }

  async function handleStopFaceWindow() {
    if (!faceSessionId) {
      setFaceSessionActive(false);
      return;
    }
    setFaceLoading(true);
    try {
      await api.post(`/attendance/sessions/${faceSessionId}/face-window/stop`);
      setFaceSessionActive(false);
      setFaceTimeLeft(0);
      setFaceMessage('Face attendance window closed.');
    } catch {
      setFaceSessionActive(false);
    } finally {
      setFaceLoading(false);
      setTimeout(() => setFaceMessage(null), 4000);
    }
  }

  useEffect(() => {
    if (!faceSessionActive || faceTimeLeft <= 0) {
      if (faceSessionActive && faceTimeLeft <= 0) {
        setFaceSessionActive(false);
        setFaceMessage('Face window expired.');
      }
      return;
    }
    const timer = setInterval(() => {
      setFaceTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFaceSessionActive(false);
          setFaceMessage('Face window expired.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [faceSessionActive, faceTimeLeft]);

  useEffect(() => {
    if (!faceSessionActive || !faceSessionId) return;
    let active = true;
    const fetchLatestRecords = async () => {
      try {
        const res = await api.get(`/attendance/sessions/${faceSessionId}`);
        if (!active) return;
        const records = res.data?.data?.records ?? [];
        if (records.length > 0) {
          const recordMap = new Map<number, { status: StudentItem['status']; method?: string }>(
            records.map((r: any) => [r.studentId, { status: r.status, method: r.method }])
          );
          setStudents((curr) =>
            curr.map((st) => {
              const matched = recordMap.get(st.id);
              if (matched) {
                return { ...st, status: matched.status, method: matched.method };
              }
              return st;
            })
          );
        }
      } catch {
        // silent polling
      }
    };

    void fetchLatestRecords();
    const interval = setInterval(fetchLatestRecords, 3500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [faceSessionActive, faceSessionId]);

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
    if (!selectedSection) {
      setClassReport(null);
      setDefaulters([]);
      setReportError('No assigned section is available for reporting.');
      return;
    }

    setLoadingReport(true);
    try {
      const [repRes, defRes] = await Promise.all([
        api.get(`/reports/class?sectionId=${selectedSection}`),
        api.get(`/reports/defaulters?sectionId=${selectedSection}`),
      ]);
      setClassReport(repRes.data.data);
      setDefaulters(defRes.data.data.defaulters);
      setReportError(null);
    } catch {
      setClassReport(null);
      setDefaulters([]);
      setReportError('Could not load class reports from the server.');
    } finally {
      setLoadingReport(false);
    }
  }

  async function handleExportCSV() {
    const rows = classReport?.students ?? [];
    if (rows.length === 0) {
      alert('There are no report records to export.');
      return;
    }
    let csv = 'Roll No,Student Name,Total Classes,Classes Attended,Attendance %,Status\n';
    rows.forEach((s: any) => {
      csv += `${s.rollNo},"${s.name}",${s.totalClasses},${s.present},${s.percentage}%,${s.percentage >= 75 ? 'ELIGIBLE' : 'DEFAULTER'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Register_Section_${selectedSection}_${new Date().toISOString().slice(0, 10)}.csv`;
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
           Mark Attendance
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'qr' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('qr')}
        >
           Live QR Code
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'marks' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('marks')}
        >
          Internal Marks
        </button>
        {user?.role === 'TEACHER' && (
          <button
            className={`btn btn--sm ${activeTab === 'assignments' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
        )}
        <button
          className={`btn btn--sm ${activeTab === 'approvals' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => {
            setActiveTab('approvals');
            loadApprovals();
          }}
        >
           Approvals ({leaves.length + corrections.length})
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'reports' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => {
            setActiveTab('reports');
            loadReports();
          }}
        >
           Class Reports
        </button>
        <button
          className={`btn btn--sm ${activeTab === 'leaves' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('leaves')}
        >
           Faculty Leaves
        </button>
        {user?.role === 'HOD' && (
          <button
            className={`btn btn--sm ${activeTab === 'hod_adjustments' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setActiveTab('hod_adjustments')}
          >
            🏛️ Proxy Adjustments
          </button>
        )}
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
                  void handleStartQr(secId, subId, p);
                }}
              />

              {/* ── Today's Assigned Proxy / Substitution Classes Banner ── */}
              {proxyAdjustments.length > 0 && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.12) 100%)',
                    borderRadius: '12px',
                    border: '1.5px solid #f59e0b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>🔄</span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
                          Substitution / Proxy Classes Assigned Today
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          You are authorized to take attendance for absent faculty. Records will credit student attendance seamlessly.
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.725rem', background: '#f59e0b', color: '#000', borderRadius: '999px', padding: '0.2rem 0.6rem', fontWeight: 800 }}>
                      {proxyAdjustments.length} Assigned
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {proxyAdjustments.map((proxy) => (
                      <div
                        key={proxy.id}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            Period {proxy.period} · {proxy.section?.name} ({proxy.section?.course?.code || 'Class'})
                          </div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
                            {proxy.subject?.name} ({proxy.subject?.code})
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#ef4444', marginTop: '0.2rem' }}>
                            Substituting: {proxy.originalTeacher?.user?.name || 'Absent Faculty'} {proxy.reason ? `(${proxy.reason})` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn--sm btn--primary"
                          onClick={() => {
                            if (!sections.some((s) => s.id === proxy.sectionId)) {
                              setSections((prev) => [
                                ...prev,
                                {
                                  id: proxy.section.id,
                                  name: proxy.section.name,
                                  year: 1,
                                  courseName: proxy.section.course?.name || '',
                                  courseCode: proxy.section.course?.code || '',
                                },
                              ]);
                            }
                            if (!subjects.some((s) => s.id === proxy.subjectId)) {
                              setSubjects((prev) => [
                                ...prev,
                                {
                                  id: proxy.subject.id,
                                  name: proxy.subject.name,
                                  code: proxy.subject.code,
                                },
                              ]);
                            }
                            setSelectedSection(proxy.sectionId);
                            setSelectedSubject(proxy.subjectId);
                            setPeriod(proxy.period);
                            setActiveTab('mark');
                            setTimeout(() => {
                              document.getElementById('attendance-roster-section')?.scrollIntoView({ behavior: 'smooth' });
                            }, 150);
                          }}
                        >
                          ⚡ Take Class
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                       My Assigned Classes
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
                     Filter by Branch
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
                    <option value="ALL"> All Branches</option>
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
                     Section
                  </label>
                  <select
                    className="input"
                    value={selectedSection || ''}
                    onChange={(e) => {
                      const sectionId = Number(e.target.value);
                      const assignment = assignedChips.find((chip) => chip.sectionId === sectionId);
                      setSelectedSection(sectionId);
                      if (assignment) {
                        setSelectedSubject(assignment.subjectId);
                        setActiveChipKey(`${assignment.sectionId}-${assignment.subjectId}`);
                      } else {
                        setActiveChipKey(null);
                      }
                    }}
                    style={{ height: 44 }}
                  >
                    {filterBranchCode === 'ALL' ? (
                      // Grouped by course
                      Array.from(new Set(sections.map(s => s.courseCode || 'Other'))).map((code) => (
                        <optgroup key={code} label={` ${code}`}>
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
                      setActiveChipKey(`${selectedSection}-${subId}`);
                      const subObj = subjects.find(s => s.id === subId);
                      if (subObj && (subObj.name.toLowerCase().includes('lab') || subObj.code.toLowerCase().includes('lab'))) {
                        setIsLabClass(true);
                      }
                    }}
                  >
                    {assignedChips
                      .filter((chip) => chip.sectionId === selectedSection)
                      .map((chip) => (
                      <option key={chip.subjectId} value={chip.subjectId}>
                        {chip.subjectName} ({chip.subjectCode})
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
                         Lab Practical
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
                         {sec.departmentName || sec.courseName || sec.courseCode || 'Department'}
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
                  {!faceSessionActive ? (
                    <button
                      className="btn btn--sm"
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                      }}
                      onClick={() => handleStartFaceWindow(5)}
                      disabled={faceLoading || students.length === 0}
                      title="Open a 5-minute live face attendance window for students"
                    >
                      {faceLoading ? 'Starting...' : '📷 Start Face Window (5m)'}
                    </button>
                  ) : (
                    <button
                      className="btn btn--sm"
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        fontWeight: 600,
                        border: 'none',
                      }}
                      onClick={handleStopFaceWindow}
                      disabled={faceLoading}
                    >
                      🛑 Stop Face Window
                    </button>
                  )}
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveAttendance}
                    disabled={saving || students.length === 0}
                  >
                    {saving ? 'Saving...' : ' Save Attendance'}
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

              {/* Live Face Attendance Active Banner */}
              {faceSessionActive && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, rgba(37,99,235,0.1), rgba(6,182,212,0.1))',
                    border: '1.5px solid #2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 10px #10b981',
                      }}
                    />
                    <div>
                      <strong style={{ color: '#1e40af', fontSize: '0.95rem' }}>
                        Live Face Attendance Window is OPEN
                      </strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        Students can scan their face on their Student App. Attendance updates automatically.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        color: '#1e40af',
                        background: 'rgba(255,255,255,0.85)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(37,99,235,0.3)',
                      }}
                    >
                      ⏳ {Math.floor(faceTimeLeft / 60).toString().padStart(2, '0')}:{(faceTimeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <button
                      className="btn btn--sm"
                      style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                      onClick={handleStopFaceWindow}
                    >
                      Stop Window
                    </button>
                  </div>
                </div>
              )}
              {faceMessage && !faceSessionActive && (
                <div
                  className="card"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.5rem 1rem',
                    background: faceMessage.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                    border: `1px solid ${faceMessage.includes('Error') ? '#ef4444' : '#3b82f6'}`,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  {faceMessage}
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
                      {st.method === 'FACE' && (
                        <span
                          className="badge"
                          style={{
                            marginLeft: '0.5rem',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: '1px solid #bfdbfe',
                          }}
                          title="Attendance verified via Biometric Face Scan"
                        >
                          👤 Face Verified
                        </span>
                      )}
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
                <h2 style={{ marginBottom: '0.5rem' }}> Rotating QR Attendance</h2>
                <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
                  Students scan this QR with their AttendAI app. Rotates every 10 seconds to eliminate proxy attendance.
                </p>
                {qrError && <p className="alert alert--error" role="alert">{qrError}</p>}

                {!qrActive ? (
                  <button className="btn btn--primary" onClick={() => handleStartQr()}>
                    Start QR Session for Period {period}
                  </button>
                ) : (
                  <div>
                    {/* Live Scannable Dynamic QR Code Image & Token Box */}
                    <div
                      style={{
                        padding: '1.25rem',
                        margin: '1.25rem auto',
                        background: '#ffffff',
                        borderRadius: '20px',
                        display: 'inline-block',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '2px solid var(--color-border)',
                      }}
                    >
                      <QRCodeSVG
                        value={JSON.stringify({ s: qrSessionId, t: qrToken })}
                        size={220}
                        level="M"
                        style={{ display: 'block', margin: '0 auto' }}
                      />
                      <div
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 900,
                          letterSpacing: '4px',
                          color: '#111827',
                          marginTop: '0.75rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {qrToken || '------'}
                      </div>
                      <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600 }}>
                        Scan via AttendAI Student App or enter 8-character token
                      </p>
                    </div>

                    <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                      <span className="badge badge--online" style={{ padding: '0.35rem 0.75rem', fontWeight: 800 }}>
                        ✓ {qrScannedCount} / {students.length} Students Scanned
                      </span>
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
                         Projector Fullscreen Mode
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

          {user?.role === 'TEACHER' && activeTab === 'assignments' && (
            <AssignmentsTab
              classes={assignedChips}
              classesError={assignedClassesError}
              classesLoading={assignedClassesLoading}
            />
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
                 Leave Applications ({leaves.length})
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
                 Attendance Correction Requests ({corrections.length})
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
                        {classReport ? `${classReport.classAverage}%` : '—'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="btn btn--ghost btn--sm" onClick={loadReports} disabled={loadingReport}>
                      ⟳ Refresh
                    </button>
                    <button className="btn btn--primary btn--sm" onClick={handleExportCSV} disabled={!classReport?.students?.length}>
                       Export CSV
                    </button>
                  </div>
                  {reportError && <p className="alert alert--error" role="alert">{reportError}</p>}
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
                       {defaulters.length} Defaulters Below 75%
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
          {activeTab === 'hod_adjustments' && <FacultyAdjustmentHODDesk />}
        </div>
      </main>

      {/* Institutional User Profile Drawer */}
      <UserProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
