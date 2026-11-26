import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import QRScannerModal from '../components/QRScannerModal';
import CampusMapWidget from '../components/CampusMapWidget';
import FaceCheckinModal from '../components/FaceCheckinModal';
import TodayPulseBar from '../components/TodayPulseBar';
import AttendanceLedgerWidget from '../components/AttendanceLedgerWidget';
import CorrectionRequestModal from '../components/CorrectionRequestModal';
import NoDuesWidget from '../components/NoDuesWidget';
import LibraryWidget from '../components/LibraryWidget';
import PlacementWidget from '../components/PlacementWidget';
import MarksGrid from '../components/MarksGrid';
import GrievanceModal from '../components/GrievanceModal';
import NoticeBanner from '../components/NoticeBanner';
import { QrCode, TrendingUp, AlertTriangle, BookOpen, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface ActiveFaceSession {
  sessionId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  expiresAt: string;
  alreadyMarked: boolean;
  status: string | null;
}

interface AttendanceReport {
  overallPercentage: number;
  totalClasses: number;
  attendedClasses: number;
  defaulter: boolean;
  subjectReports?: Array<{
    subjectId: number;
    subjectName: string;
    subjectCode?: string;
    total: number;
    attended: number;
    percentage: number;
  }>;
}

interface StudentAcademicHistory {
  currentSemester?: number;
  currentSection?: string;
  courseName?: string;
  student?: {
    id: number;
    rollNo: string;
    currentSemester: number;
    section?: { id: number; name: string; year: number; course?: { name: string; code: string } };
  };
  promotions?: Array<{
    id: number;
    promotedAt: string;
    academicYear?: { name: string };
    sourceSection?: { id: number; name: string; year: number };
    targetSection?: { id: number; name: string; year: number };
  }>;
  currentAttendance?: {
    totalSessions: number;
    attendedSessions: number;
    percentage: number;
  };
  allTimeAttendance?: {
    totalSessions: number;
    attendedSessions: number;
    percentage: number;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [academicHistory, setAcademicHistory] = useState<StudentAcademicHistory | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isGrievanceOpen, setIsGrievanceOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeFaceSession, setActiveFaceSession] = useState<ActiveFaceSession | null>(null);
  const [isFaceCheckinOpen, setIsFaceCheckinOpen] = useState(false);
  const [faceTimer, setFaceTimer] = useState('');

  const checkActiveFaceSession = async () => {
    try {
      const res = await api.get('/attendance/face-window/active-for-me');
      if (res.data?.data) {
        setActiveFaceSession(res.data.data);
      } else {
        setActiveFaceSession(null);
      }
    } catch {
      setActiveFaceSession(null);
    }
  };

  useEffect(() => {
    checkActiveFaceSession();
    const interval = setInterval(checkActiveFaceSession, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeFaceSession?.expiresAt) return;
    const updateTimer = () => {
      const diff = new Date(activeFaceSession.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setFaceTimer('00:00');
        setActiveFaceSession(null);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setFaceTimer(`${m}:${s.toString().padStart(2, '0')}`);
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [activeFaceSession]);

  const loadData = async () => {
    setLoadingReport(true);
    try {
      const repRes = await api.get('/reports/my-report');
      const raw = repRes.data?.data;
      if (raw) {
        if (Array.isArray(raw.history)) {
          setHistory(raw.history);
        }
        const summary = raw.summary ?? raw;
        const subjects = raw.subjects ?? raw.subjectReports ?? [];
        const total = summary.totalClasses ?? 0;
        const attended = summary.present ?? summary.attendedClasses ?? 0;
        const pct = typeof summary.percentage === 'number'
          ? summary.percentage
          : typeof summary.overallPercentage === 'number'
            ? summary.overallPercentage
            : (total > 0 ? (attended / total) * 100 : 100);

        setReport({
          overallPercentage: pct,
          totalClasses: total,
          attendedClasses: attended,
          defaulter: !!(summary.isDefaulter ?? summary.defaulter),
          subjectReports: Array.isArray(subjects)
            ? subjects.map((sub: any) => ({
                subjectId: sub.subjectId ?? sub.id ?? 0,
                subjectName: sub.subjectName ?? sub.subject?.name ?? 'Subject',
                subjectCode: sub.subjectCode ?? sub.subject?.code,
                total: sub.total ?? 0,
                attended: sub.present ?? sub.attended ?? 0,
                percentage: typeof sub.percentage === 'number' ? sub.percentage : (sub.total > 0 ? ((sub.present ?? sub.attended ?? 0) / sub.total) * 100 : 100),
              }))
            : [],
        });
      }
    } catch (err) {
      console.warn('Attendance report not loaded:', err);
    } finally {
      setLoadingReport(false);
    }

    try {
      const histRes = await api.get('/academic/student-history');
      if (histRes.data?.data) {
        setAcademicHistory(histRes.data.data);
      }
    } catch (err) {
      console.warn('Academic history not loaded:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bunk Calculator Logic
  const calculateBunk = () => {
    if (!report || !report.totalClasses || report.totalClasses === 0) return null;
    const { totalClasses, attendedClasses, overallPercentage } = report;
    const safeOverall = typeof overallPercentage === 'number' ? overallPercentage : 0;

    if (safeOverall >= 75) {
      const safeBunks = Math.floor((attendedClasses - 0.75 * totalClasses) / 0.75);
      return {
        safe: true,
        count: Math.max(0, safeBunks),
        text: safeBunks > 0
          ? `You can safely miss ${safeBunks} more ${safeBunks === 1 ? 'class' : 'classes'} while staying above 75%.`
          : `You are right at the 75% boundary! Attend your next class to stay safe.`
      };
    } else {
      const needed = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
      return {
        safe: false,
        count: Math.max(1, needed),
        text: `Attendance is critical (${safeOverall.toFixed(1)}%). Attend next ${needed} consecutive ${needed === 1 ? 'class' : 'classes'} to reach 75%.`
      };
    }
  };

  const bunkInfo = calculateBunk();
  const overall = typeof report?.overallPercentage === 'number' ? report.overallPercentage : 0;
  const isHealthy = overall >= 75;

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Welcome Banner */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>
          Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
          Section: <span style={{ color: 'var(--color-accent-text)', fontWeight: '700' }}>{academicHistory?.currentSection || user?.student?.section?.name || 'Classroom'}</span> • Roll: <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}>{user?.student?.rollNo || 'N/A'}</span>
        </p>
      </div>

      {/* Semester & Academic Progression Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🎓</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary)' }}>
              Semester {academicHistory?.currentSemester ?? academicHistory?.student?.currentSemester ?? 1}
              <span style={{ marginLeft: '8px', fontSize: '11px', background: 'var(--color-success-light)', color: 'var(--color-success-text)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                Active
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {academicHistory?.currentSection || academicHistory?.student?.section?.name || user?.student?.section?.name || 'Section'} • Year {academicHistory?.student?.section?.year || 1}
            </div>
          </div>
        </div>

        {academicHistory?.promotions && academicHistory.promotions.length > 0 && academicHistory.promotions[0]?.sourceSection && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '700', background: 'var(--color-surface-hover)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              Promoted: {academicHistory.promotions[0].sourceSection?.name} ➔ {academicHistory.promotions[0].targetSection?.name}
            </span>
          </div>
        )}
      </div>

      {/* Live Lecture Face Attendance Notification Banner */}
      {activeFaceSession && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          background: activeFaceSession.alreadyMarked
            ? 'var(--color-success-light)'
            : '#FFFBEB',
          border: activeFaceSession.alreadyMarked ? '1px solid #A7F3D0' : '1px solid #FDE68A',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                background: activeFaceSession.alreadyMarked ? '#10B981' : '#F59E0B',
              }} />
              <span style={{ fontSize: '12px', fontWeight: '800', color: activeFaceSession.alreadyMarked ? '#047857' : '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeFaceSession.alreadyMarked ? 'Attendance Confirmed' : 'Live Lecture Face ID Window'}
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)' }}>
              {activeFaceSession.subjectName} ({activeFaceSession.subjectCode})
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Prof. {activeFaceSession.teacherName} · Window closing in: <strong style={{ color: 'var(--color-accent-text)' }}>{faceTimer}</strong>
            </div>
          </div>

          <div>
            {activeFaceSession.alreadyMarked ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '10px', background: '#FFFFFF', color: '#047857',
                border: '1px solid #A7F3D0', fontWeight: '700', fontSize: '13px'
              }}>
                <CheckCircle2 size={16} /> Present (Face ID)
              </div>
            ) : (
              <button
                onClick={() => setIsFaceCheckinOpen(true)}
                style={{
                  padding: '10px 18px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-primary)',
                  border: 'none', color: '#FFFFFF', fontWeight: '800', fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                }}
              >
                <Sparkles size={16} color="#F59E0B" /> Scan Face Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Today's Live Attendance Pulse Bar */}
      <TodayPulseBar
        history={history}
        onClaimCorrection={(rec) => {
          setSelectedRecord(rec);
          setIsCorrectionOpen(true);
        }}
      />

      {/* Hero QR Scan Action */}
      <button
        onClick={() => setIsScannerOpen(true)}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: '20px',
          transition: 'transform 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F59E0B'
          }}>
            <QrCode size={26} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800' }}>Scan Lecture QR</div>
            <div style={{ fontSize: '12px', opacity: 0.85, color: '#CBD5E1' }}>Mark your attendance instantly</div>
          </div>
        </div>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F59E0B'
        }}>
          <ArrowRight size={18} />
        </div>
      </button>

      {/* Attendance Summary Stat Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)' }}>
            Overall Attendance
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            padding: '3px 9px',
            borderRadius: 'var(--radius-pill)',
            background: isHealthy ? 'var(--color-success-light)' : 'var(--color-danger-light)',
            color: isHealthy ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            border: `1px solid ${isHealthy ? '#A7F3D0' : '#FECACA'}`
          }}>
            {isHealthy ? 'GOOD STANDING' : 'DEFICIENCY RISK'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '38px', fontWeight: '900', color: isHealthy ? '#047857' : '#DC2626', letterSpacing: '-1px' }}>
            {loadingReport ? '--' : `${overall.toFixed(1)}%`}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            ({report?.attendedClasses || 0} / {report?.totalClasses || 0} Lectures Attended)
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, overall))}%`,
            height: '100%',
            background: isHealthy ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #EF4444, #DC2626)',
            borderRadius: '999px',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Bunk Advisory Box */}
        {bunkInfo && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: bunkInfo.safe ? '#EFF6FF' : '#FFFBEB',
            border: `1px solid ${bunkInfo.safe ? '#BFDBFE' : '#FDE68A'}`,
            fontSize: '12px',
            fontWeight: 600,
            color: bunkInfo.safe ? '#1E40AF' : '#92400E'
          }}>
            {bunkInfo.safe ? <TrendingUp size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{bunkInfo.text}</span>
          </div>
        )}

        {/* Semester vs All-time stats comparison if promoted */}
        {academicHistory?.allTimeAttendance && academicHistory?.promotions && academicHistory.promotions.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            marginTop: '12px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontWeight: 600
          }}>
            <span>Current Sem ({academicHistory?.currentSemester ?? academicHistory?.student?.currentSemester ?? 1}): <strong style={{ color: 'var(--color-primary)' }}>{academicHistory?.currentAttendance?.percentage ?? 0}%</strong></span>
            <span>Cumulative: <strong style={{ color: 'var(--color-accent-text)' }}>{academicHistory?.allTimeAttendance?.percentage ?? 0}%</strong></span>
          </div>
        )}
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="var(--color-accent)" />
          <span>Subject Attendance</span>
        </h2>

        {loadingReport ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Loading attendance records...
          </div>
        ) : !report?.subjectReports || report.subjectReports.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            fontSize: '13px'
          }}>
            No lectures recorded for your section yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.subjectReports.map((sub, idx) => {
              const subHealthy = sub.percentage >= 75;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary)' }}>
                      {sub.subjectName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
                      {sub.attended} / {sub.total} classes attended
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    color: subHealthy ? '#047857' : '#DC2626'
                  }}>
                    {(sub.percentage ?? 0).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance Audit Ledger & CSV Export */}
      <AttendanceLedgerWidget
        records={history}
        onRaiseCorrection={(rec) => {
          setSelectedRecord(rec);
          setIsCorrectionOpen(true);
        }}
      />

      {/* Campus ERP & Student Services Hub */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary, #0F172A)', margin: 0 }}>
            Campus ERP & Services Hub
          </h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setIsGrievanceOpen(true)}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                cursor: 'pointer',
              }}
            >
              File Grievance
            </button>
            <Link
              to="/leaves"
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#EEF2FF',
                color: '#4F46E5',
                border: '1px solid #C7D2FE',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Leave Desk
            </Link>
          </div>
        </div>

        <NoDuesWidget />
        <LibraryWidget />
        <PlacementWidget />
        <MarksGrid />
      </div>

      {/* Upgraded Campus Announcements Carousel with Scope & PDF download */}
      <NoticeBanner
        branchName={academicHistory?.student?.section?.course?.name || academicHistory?.courseName}
        sectionName={academicHistory?.student?.section?.name || academicHistory?.currentSection}
      />

      {/* Campus Map Widget — collapsible, hidden if no API key */}
      <CampusMapWidget />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAttendanceMarked={loadData}
      />

      {/* Face Check-in Modal */}
      {activeFaceSession && (
        <FaceCheckinModal
          isOpen={isFaceCheckinOpen}
          sessionId={activeFaceSession.sessionId}
          subjectName={activeFaceSession.subjectName}
          onClose={() => setIsFaceCheckinOpen(false)}
          onSuccess={() => {
            checkActiveFaceSession();
            loadData();
          }}
        />
      )}

      {/* Attendance Correction Dispute Modal */}
      <CorrectionRequestModal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        record={selectedRecord}
        onSuccess={loadData}
      />

      {/* Confidential Grievance Desk Modal */}
      <GrievanceModal
        isOpen={isGrievanceOpen}
        onClose={() => setIsGrievanceOpen(false)}
      />
    </div>
  );
}
