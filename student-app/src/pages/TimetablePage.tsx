import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Clock, MapPin, User, Calendar, AlertCircle, CheckCircle2, QrCode, ShieldAlert } from 'lucide-react';
import QRScannerModal from '../components/QRScannerModal';
import CorrectionRequestModal from '../components/CorrectionRequestModal';

interface TimetableSlot {
  period: number;
  startTime: string;
  endTime: string;
  roomNo: string | null;
  subject: { id: number; name: string; code: string } | null;
  teacher: { id: number; name: string } | null;
}

interface TimetableData {
  dayOfWeek: number;
  currentTime: string;
  currentPeriod: number | null;
  nextPeriod: number | null;
  slots: TimetableSlot[];
}

interface TodayRecord {
  id: string | number;
  sessionId: string | number;
  date: string;
  period: number;
  subject: string;
  teacher?: string;
  status: string;
}

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetablePage() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TodayRecord | null>(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/academic/timetable/today');
      setData(res.data.data ?? null);
    } catch (err: any) {
      setError('Could not load today’s lecture timetable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const rep = await api.get('/reports/my-report');
      const hist = rep.data?.data?.history;
      if (Array.isArray(hist)) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const filtered = hist.filter((h: any) => {
          try {
            return new Date(h.date).toISOString().slice(0, 10) === todayStr;
          } catch {
            return false;
          }
        });
        setTodayRecords(filtered);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTimetable();
    fetchTodayAttendance();
  }, []);

  const dayName = data?.dayOfWeek ? DAYS[data.dayOfWeek] || 'Today' : 'Today';

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={22} color="var(--color-accent)" />
          <span>{dayName}'s Schedule</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
          Live schedule for your registered academic section with attendance status
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          Fetching class timetable...
        </div>
      ) : error ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-danger-light)',
          color: 'var(--color-danger-text)',
          border: '1px solid #FECACA',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : !data?.slots || data.slots.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          color: 'var(--color-text-muted)'
        }}>
          <Calendar size={40} style={{ opacity: 0.3, margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>No lectures scheduled for today</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Enjoy your day off or check upcoming assignments!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.slots.map((slot) => {
            const isCurrent = data.currentPeriod === slot.period;
            const isNext = data.nextPeriod === slot.period;
            const record = todayRecords.find((r) => r.period === slot.period);

            return (
              <div
                key={slot.period}
                style={{
                  background: isCurrent ? '#FFFBEB' : '#FFFFFF',
                  border: `1.5px solid ${isCurrent ? '#F59E0B' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Badges on Top Right */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                  {record ? (
                    record.status === 'P' || record.status === 'OD' ? (
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#F0FDF4', color: '#047857', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Present
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertCircle size={12} /> Absent
                      </span>
                    )
                  ) : null}

                  {isCurrent && (
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--color-accent)',
                      color: '#FFFFFF'
                    }}>
                      LIVE NOW
                    </div>
                  )}

                  {isNext && (
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-border)'
                    }}>
                      UP NEXT
                    </div>
                  )}
                </div>

                {/* Period & Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  <Clock size={14} color="var(--color-accent-text)" />
                  <span style={{ fontWeight: '800', color: 'var(--color-accent-text)' }}>Period {slot.period}</span>
                  <span>•</span>
                  <span>{slot.startTime} - {slot.endTime}</span>
                </div>

                {/* Subject Name & Code */}
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '8px' }}>
                  {slot.subject?.name || 'Class Lecture'} {slot.subject?.code ? `(${slot.subject.code})` : ''}
                </h3>

                {/* Instructor & Room */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {slot.teacher?.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={13} />
                        <span>{slot.teacher.name}</span>
                      </div>
                    )}
                    {slot.roomNo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={13} />
                        <span>Room {slot.roomNo}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions: Claim Fix on Absent or Mark Live if Current */}
                  <div>
                    {record && record.status === 'A' ? (
                      <button
                        onClick={() => {
                          setSelectedRecord(record);
                          setIsCorrectionOpen(true);
                        }}
                        style={{
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldAlert size={12} />
                        <span>Claim Fix</span>
                      </button>
                    ) : isCurrent && !record ? (
                      <button
                        onClick={() => setIsScannerOpen(true)}
                        style={{
                          background: 'var(--color-primary)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <QrCode size={13} color="#F59E0B" />
                        <span>Mark Live</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAttendanceMarked={() => {
          fetchTimetable();
          fetchTodayAttendance();
        }}
      />

      {/* Correction Request Modal */}
      <CorrectionRequestModal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        record={selectedRecord}
        onSuccess={() => {
          fetchTodayAttendance();
        }}
      />
    </div>
  );
}
