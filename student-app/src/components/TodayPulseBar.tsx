import { AlertTriangle } from 'lucide-react';

interface TodayRecord {
  id: string | number;
  sessionId: string | number;
  date: string;
  period: number;
  subject: string;
  teacher?: string;
  status: string;
}

interface TodayPulseBarProps {
  history?: TodayRecord[];
  onClaimCorrection: (record: TodayRecord) => void;
}

export default function TodayPulseBar({ history = [], onClaimCorrection }: TodayPulseBarProps) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayRecords = history.filter((h) => {
    try {
      return new Date(h.date).toISOString().slice(0, 10) === todayISO;
    } catch {
      return false;
    }
  });

  const todayCount = todayRecords.length;
  const presentCount = todayRecords.filter((r) => r.status === 'P' || r.status === 'OD').length;
  const absentCount = todayRecords.filter((r) => r.status === 'A').length;
  const pct = todayCount > 0 ? Math.round((presentCount / todayCount) * 100) : null;
  const absentItem = todayRecords.find((r) => r.status === 'A');

  if (todayCount === 0) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid var(--color-border, #E2E8F0)',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
            Today's Attendance Pulse
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
          Roll call not yet recorded today
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid var(--color-border, #E2E8F0)',
        padding: '14px 16px',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
            Today's Live Pulse
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '1px 6px',
              borderRadius: '999px',
              background: 'var(--color-success-light, #ECFDF5)',
              color: 'var(--color-success-text, #047857)',
              border: '1px solid #A7F3D0',
            }}
          >
            LIVE MONITOR
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', fontSize: '11px', fontWeight: '700' }}>
          <span style={{ color: '#047857', background: '#ECFDF5', padding: '2px 7px', borderRadius: '6px' }}>
            ✓ {presentCount} Present
          </span>
          {absentCount > 0 && (
            <span style={{ color: '#B91C1C', background: '#FEF2F2', padding: '2px 7px', borderRadius: '6px' }}>
              ✗ {absentCount} Absent
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
        <div
          style={{
            width: `${pct ?? 0}%`,
            height: '100%',
            background: (pct ?? 0) >= 75 ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #EF4444, #DC2626)',
            borderRadius: '999px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
        <span>{todayCount} lectures recorded today</span>
        <span>{pct !== null ? `${pct}% attendance today` : ''}</span>
      </div>

      {/* Absent Dispute Action Prompt if any absent today */}
      {absentItem && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#B91C1C', fontWeight: 600 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>Marked Absent in Period {absentItem.period} ({absentItem.subject})</span>
          </div>
          <button
            onClick={() => onClaimCorrection(absentItem)}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#DC2626',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
            }}
          >
            Claim Fix ⚡
          </button>
        </div>
      )}
    </div>
  );
}
