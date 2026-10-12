import { useState, useEffect } from 'react';

export default function RealtimeInsightCard() {
  const [time, setTime] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(() => new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time: "8:02:09 AM"
  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Ordinal suffix (e.g. "12th", "2nd")
  function getOrdinal(n: number) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  const todayOrdinal = getOrdinal(time.getDate());
  const todayMonthName = time.toLocaleDateString('en-US', { month: 'long' });
  const todayYear = time.getFullYear();

  // Calendar calculations for viewDate
  const currentMonthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days list: previous month padding, current month, next month padding
  const calendarCells = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === time.getDate() &&
      month === time.getMonth() &&
      year === time.getFullYear();
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      isToday,
    });
  }

  const remaining = 35 - calendarCells.length;
  for (let n = 1; n <= Math.max(0, remaining); n++) {
    calendarCells.push({
      day: n,
      isCurrentMonth: false,
    });
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
      {/* ─── Realtime Insight Card ─────────────────────────────── */}
      <div className="realtime-widget">
        <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: '#FFF0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              border: '1px solid #FFDCD7',
            }}
          >
            ☀️
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '0.5px' }}>
              {formattedTime}
            </div>
            <div className="text-xs text-muted" style={{ fontWeight: 600 }}>
              Realtime Insight
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Today:
          </span>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.15rem' }}>
            {todayOrdinal} {todayMonthName} {todayYear}
          </h2>
        </div>
      </div>

      {/* ─── Attendance Calendar Widget ────────────────────────── */}
      <div className="calendar-widget">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{currentMonthName}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--color-border-strong)',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              ‹
            </button>
            <button
              onClick={nextMonth}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--color-border-strong)',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              ›
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {weekdays.map((w) => (
            <div key={w} className="calendar-weekday">
              {w}
            </div>
          ))}

          {calendarCells.map((cell, idx) => (
            <div
              key={idx}
              className={`calendar-day ${
                cell.isToday
                  ? 'calendar-day--active'
                  : !cell.isCurrentMonth
                  ? 'calendar-day--muted'
                  : ''
              }`}
            >
              {String(cell.day).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
