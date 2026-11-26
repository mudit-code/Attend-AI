import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

interface ClearanceData {
  academic: boolean;
  accounts: boolean;
  library: boolean;
  discipline: boolean;
  examUnlocked: boolean;
  semester: string;
}

const PILLARS = [
  { key: 'academic', label: 'Academic Cell', desc: 'Attendance & Sessionals' },
  { key: 'accounts', label: 'Accounts Office', desc: 'College Tuition Fee' },
  { key: 'library', label: 'Central Library', desc: 'Books & Overdue Fines' },
  { key: 'discipline', label: 'DSW / Proctor', desc: 'Discipline Clearance' },
] as const;

export default function NoDuesWidget() {
  const [data, setData] = useState<ClearanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/clearance/my')
      .then((res) => setData(res.data?.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid var(--color-border, #E2E8F0)',
          height: '110px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted, #64748B)',
          fontSize: '12px',
        }}
      >
        Checking institutional clearance status...
      </div>
    );
  }

  const clearedCount = data ? PILLARS.filter((p) => data[p.key]).length : 0;
  const allCleared = clearedCount === 4;

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid var(--color-border, #E2E8F0)',
        padding: '16px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: allCleared ? '#ECFDF5' : '#FFFBEB',
              color: allCleared ? '#059669' : '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              No-Dues Clearance Desk
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
              4-Pillar digital exam hall pass status
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: '800',
            padding: '2px 8px',
            borderRadius: '999px',
            background: allCleared ? '#ECFDF5' : '#FFFBEB',
            color: allCleared ? '#047857' : '#B45309',
            border: `1px solid ${allCleared ? '#A7F3D0' : '#FDE68A'}`,
          }}
        >
          {clearedCount}/4 Cleared
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {PILLARS.map((p) => {
          const isCleared = data ? !!data[p.key] : false;
          return (
            <div
              key={p.key}
              style={{
                padding: '8px 10px',
                borderRadius: '10px',
                background: isCleared ? '#F0FDF4' : '#FFF7ED',
                border: `1px solid ${isCleared ? '#BBF7D0' : '#FFEDD5'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isCleared ? (
                <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
              ) : (
                <Clock size={16} color="#EA580C" style={{ flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary, #0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.label}
                </div>
                <div style={{ fontSize: '9px', color: isCleared ? '#15803D' : '#9A3412', fontWeight: 600 }}>
                  {isCleared ? 'Cleared ✓' : 'Pending ⚠️'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
