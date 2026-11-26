import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Clock, MapPin, User, Calendar, AlertCircle } from 'lucide-react';

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

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetablePage() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTimetable() {
      try {
        const res = await api.get('/academic/timetable/today');
        setData(res.data.data ?? null);
      } catch (err: any) {
        setError('Could not load today’s lecture timetable.');
      } finally {
        setLoading(false);
      }
    }
    fetchTimetable();
  }, []);

  const dayName = data?.dayOfWeek ? DAYS[data.dayOfWeek] || 'Today' : 'Today';

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={22} color="#3B82F6" />
          <span>{dayName}'s Schedule</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Live schedule for your registered academic section
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
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#FCA5A5',
          fontSize: '13px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : !data?.slots || data.slots.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)'
        }}>
          <Calendar size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', fontWeight: '600' }}>No lectures scheduled for today</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Enjoy your day off or check upcoming assignments!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.slots.map((slot) => {
            const isCurrent = data.currentPeriod === slot.period;
            const isNext = data.nextPeriod === slot.period;

            return (
              <div
                key={slot.period}
                style={{
                  background: isCurrent ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-surface)',
                  border: `1px solid ${isCurrent ? '#3B82F6' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  boxShadow: isCurrent ? 'var(--shadow-glow)' : 'var(--shadow-card)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Status Badge */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: '#3B82F6',
                    color: '#FFFFFF'
                  }}>
                    LIVE NOW
                  </div>
                )}
                {isNext && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.4)'
                  }}>
                    UP NEXT
                  </div>
                )}

                {/* Period & Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  <Clock size={14} color="#60A5FA" />
                  <span style={{ fontWeight: '700', color: '#93C5FD' }}>Period {slot.period}</span>
                  <span>•</span>
                  <span>{slot.startTime} - {slot.endTime}</span>
                </div>

                {/* Subject Name & Code */}
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', marginBottom: '8px' }}>
                  {slot.subject?.name || 'Class Lecture'} {slot.subject?.code ? `(${slot.subject.code})` : ''}
                </h3>

                {/* Instructor & Room */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
