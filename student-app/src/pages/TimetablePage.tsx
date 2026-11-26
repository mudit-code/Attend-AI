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
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={22} color="var(--color-accent)" />
          <span>{dayName}'s Schedule</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
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

            return (
              <div
                key={slot.period}
                style={{
                  background: isCurrent ? '#FFFBEB' : '#FFFFFF',
                  border: `1px solid ${isCurrent ? '#F59E0B' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-card)',
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
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
