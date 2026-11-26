import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import QRScannerModal from '../components/QRScannerModal';
import CampusMapWidget from '../components/CampusMapWidget';
import FaceCheckinModal from '../components/FaceCheckinModal';
import { QrCode, TrendingUp, AlertTriangle, BookOpen, Bell, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

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
  student: {
    id: number;
    rollNo: string;
    currentSemester: number;
    section?: { id: number; name: string; year: number; course?: { name: string; code: string } };
  };
  promotions: Array<{
    id: number;
    promotedAt: string;
    academicYear?: { name: string };
    sourceSection: { id: number; name: string; year: number };
    targetSection: { id: number; name: string; year: number };
  }>;
  currentAttendance: {
    totalSessions: number;
    attendedSessions: number;
    percentage: number;
  };
  allTimeAttendance: {
    totalSessions: number;
    attendedSessions: number;
    percentage: number;
  };
}

interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [academicHistory, setAcademicHistory] = useState<StudentAcademicHistory | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
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
      if (repRes.data?.data) {
        setReport(repRes.data.data);
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

    try {
      const notRes = await api.get('/notices');
      const noticeList = notRes.data?.data || notRes.data;
      if (Array.isArray(noticeList)) {
        setNotices(noticeList.slice(0, 3));
      }
    } catch (err) {
      console.warn('Notices not loaded:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bunk Calculator Logic
  const calculateBunk = () => {
    if (!report || report.totalClasses === 0) return null;
    const { totalClasses, attendedClasses, overallPercentage } = report;

    if (overallPercentage >= 75) {
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
        text: `Attendance is critical (${overallPercentage.toFixed(1)}%). Attend next ${needed} consecutive ${needed === 1 ? 'class' : 'classes'} to reach 75%.`
      };
    }
  };

  const bunkInfo = calculateBunk();
  const overall = report?.overallPercentage ?? 0;
  const isHealthy = overall >= 75;

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Welcome Banner */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF' }}>
          Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Section: <span style={{ color: '#60A5FA', fontWeight: '600' }}>{user?.student?.section?.name || 'Classroom'}</span> • Roll: <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{user?.student?.rollNo || 'N/A'}</span>
        </p>
      </div>

      {/* Semester & Academic Progression Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🎓</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>
              Semester {academicHistory?.student?.currentSemester || 1}
              <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '1px 6px', borderRadius: '4px' }}>
                Active
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {academicHistory?.student?.section?.name || user?.student?.section?.name || 'Section'} • Year {academicHistory?.student?.section?.year || 1}
            </div>
          </div>
        </div>

        {academicHistory?.promotions && academicHistory.promotions.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#60A5FA', fontWeight: '600', background: 'rgba(96, 165, 250, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
              Promoted from {academicHistory.promotions[0].sourceSection?.name} ➔ {academicHistory.promotions[0].targetSection?.name}
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
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(109, 40, 217, 0.15) 100%)',
          border: activeFaceSession.alreadyMarked ? '1px solid #10B981' : '1px solid #8B5CF6',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)',
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
                boxShadow: '0 0 8px currentColor'
              }} />
              <span style={{ fontSize: '12px', fontWeight: '800', color: activeFaceSession.alreadyMarked ? '#10B981' : '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeFaceSession.alreadyMarked ? 'Attendance Confirmed' : 'Live Lecture Face ID Window'}
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF' }}>
              {activeFaceSession.subjectName} ({activeFaceSession.subjectCode})
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Prof. {activeFaceSession.teacherName} · Window closing in: <strong style={{ color: '#FCD34D' }}>{faceTimer}</strong>
            </div>
          </div>

          <div>
            {activeFaceSession.alreadyMarked ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981',
                fontWeight: '700', fontSize: '13px'
              }}>
                <CheckCircle2 size={16} /> Present (Face ID)
              </div>
            ) : (
              <button
                onClick={() => setIsFaceCheckinOpen(true)}
                style={{
                  padding: '10px 18px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none', color: '#FFFFFF', fontWeight: '800', fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Sparkles size={16} /> Scan Face Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero QR Scan Action */}
      <button
        onClick={() => setIsScannerOpen(true)}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: 'var(--shadow-glow)',
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
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <QrCode size={26} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800' }}>Scan Lecture QR</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Mark your attendance instantly</div>
          </div>
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ArrowRight size={18} />
        </div>
      </button>

      {/* Attendance Summary Stat Card */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-muted)' }}>
            Overall Attendance
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            background: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isHealthy ? '#34D399' : '#F87171',
            border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {isHealthy ? 'GOOD STANDING' : 'DEFICIENCY RISK'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '38px', fontWeight: '900', color: isHealthy ? '#10B981' : '#EF4444', letterSpacing: '-1px' }}>
            {loadingReport ? '--' : `${overall.toFixed(1)}%`}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            ({report?.attendedClasses || 0} / {report?.totalClasses || 0} Lectures Attended)
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: 'var(--color-surface-2)', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, overall))}%`,
            height: '100%',
            background: isHealthy ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #EF4444, #F87171)',
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
            background: bunkInfo.safe ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${bunkInfo.safe ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontSize: '12px',
            color: bunkInfo.safe ? '#93C5FD' : '#FCD34D'
          }}>
            {bunkInfo.safe ? <TrendingUp size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{bunkInfo.text}</span>
          </div>
        )}

        {/* Semester vs All-time stats comparison if promoted */}
        {academicHistory?.allTimeAttendance && academicHistory.promotions && academicHistory.promotions.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            marginTop: '12px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px',
            color: 'var(--color-text-muted)'
          }}>
            <span>Current Sem ({academicHistory.student.currentSemester}): <strong style={{ color: '#FFFFFF' }}>{academicHistory.currentAttendance.percentage}%</strong></span>
            <span>Cumulative (All Semesters): <strong style={{ color: '#60A5FA' }}>{academicHistory.allTimeAttendance.percentage}%</strong></span>
          </div>
        )}
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="#3B82F6" />
          <span>Subject Attendance</span>
        </h2>

        {loadingReport ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: '13px' }}>
            Loading attendance records...
          </div>
        ) : !report?.subjectReports || report.subjectReports.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
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
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>
                      {sub.subjectName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {sub.attended} / {sub.total} classes attended
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    color: subHealthy ? '#10B981' : '#EF4444'
                  }}>
                    {sub.percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campus Map Widget — collapsible, hidden if no API key */}
      <CampusMapWidget />

      {/* Recent Notices */}
      {notices.length > 0 && (
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#F59E0B" />
            <span>Campus Announcements</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notices.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  {n.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
