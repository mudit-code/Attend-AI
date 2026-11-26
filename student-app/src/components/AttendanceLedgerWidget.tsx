import { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';

export interface LedgerRecord {
  id: string | number;
  sessionId: string | number;
  date: string;
  period: number;
  subject: string;
  teacher?: string;
  status: string; // 'P' | 'A' | 'L' | 'OD' | 'LV'
  method?: string; // 'QR' | 'FACE' | 'MANUAL'
}

interface AttendanceLedgerWidgetProps {
  records?: LedgerRecord[];
  onRaiseCorrection: (record: LedgerRecord) => void;
}

export default function AttendanceLedgerWidget({
  records = [],
  onRaiseCorrection,
}: AttendanceLedgerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'7D' | '30D' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'P' | 'A' | 'LV'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // Unique subjects
  const subjects = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set);
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    const now = new Date();
    return records.filter((r) => {
      if (selectedSubject !== 'ALL' && r.subject !== selectedSubject) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'P' && r.status !== 'P' && r.status !== 'OD') return false;
        if (statusFilter === 'A' && r.status !== 'A') return false;
        if (statusFilter === 'LV' && r.status !== 'LV' && r.status !== 'L') return false;
      }
      if (dateFilter !== 'ALL') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - (dateFilter === '7D' ? 7 : 30));
        try {
          if (new Date(r.date) < cutoff) return false;
        } catch {
          return true;
        }
      }
      return true;
    });
  }, [records, selectedSubject, statusFilter, dateFilter]);

  const handleExportCsv = () => {
    let csv = 'Date,Day,Period,Subject,Faculty,Status,Verification_Method\n';
    filtered.forEach((r) => {
      const dayName = new Date(r.date).toLocaleDateString(undefined, { weekday: 'short' });
      const statusText =
        r.status === 'P' ? 'PRESENT' : r.status === 'A' ? 'ABSENT' : r.status === 'OD' ? 'ON_DUTY' : 'LEAVE';
      const methodText = r.method === 'FACE' ? 'FACE_BIOMETRIC' : r.method === 'QR' ? 'DYNAMIC_QR' : 'MANUAL_ROSTER';
      csv += `${r.date.slice(0, 10)},${dayName},Period ${r.period},"${r.subject}","${r.teacher || 'Faculty'}",${statusText},${methodText}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AttendAI_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case 'P':
      case 'OD':
        return { label: '✓ Present', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' };
      case 'A':
        return { label: '✗ Absent', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' };
      case 'L':
        return { label: 'Late', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' };
      default:
        return { label: 'Leave', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl, 20px)',
        border: '1px solid var(--color-border, #E2E8F0)',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header with Accordion Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#F1F5F9',
              color: 'var(--color-primary, #0F172A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              Attendance Audit Ledger
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
              {records.length} lecture records • 1-click dispute claim & CSV export
            </div>
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted, #64748B)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border, #E2E8F0)' }}>
          {/* Controls: Preset Filters & CSV Export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['7D', '30D', 'ALL'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setDateFilter(p)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: dateFilter === p ? 'var(--color-primary, #0F172A)' : 'var(--color-border, #E2E8F0)',
                    background: dateFilter === p ? 'var(--color-primary, #0F172A)' : '#FFFFFF',
                    color: dateFilter === p ? '#FFFFFF' : 'var(--color-text-muted, #64748B)',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '8px',
                background: '#F1F5F9',
                border: '1px solid var(--color-border, #E2E8F0)',
                color: 'var(--color-primary, #0F172A)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {(['ALL', 'P', 'A', 'LV'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: statusFilter === st ? '#F59E0B' : 'var(--color-border, #E2E8F0)',
                  background: statusFilter === st ? '#FEF3C7' : '#FFFFFF',
                  color: statusFilter === st ? '#92400E' : 'var(--color-text-muted, #64748B)',
                  cursor: 'pointer',
                }}
              >
                {st === 'ALL' ? 'All Status' : st === 'P' ? 'Present' : st === 'A' ? 'Absent' : 'Leave'}
              </button>
            ))}
          </div>

          {/* Subject Filter Dropdown if multiple */}
          {subjects.length > 1 && (
            <div style={{ marginBottom: '12px' }}>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-primary, #0F172A)',
                  background: '#FFFFFF',
                }}
              >
                <option value="ALL">All Enrolled Subjects ({records.length})</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* List of Sessions */}
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted, #64748B)', fontSize: '12px' }}>
              No attendance records found for this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {filtered.map((r, i) => {
                const conf = statusConfig(r.status);
                const isAbsent = r.status === 'A';
                return (
                  <div
                    key={r.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--color-surface-2, #F8FAFC)',
                      border: `1px solid ${isAbsent ? '#FECACA' : 'var(--color-border, #E2E8F0)'}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
                        {r.subject}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted, #64748B)', marginTop: '2px', fontWeight: 600 }}>
                        Period {r.period} • {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {r.teacher ? ` • ${r.teacher}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                        }}
                      >
                        {conf.label}
                      </span>

                      {isAbsent && (
                        <button
                          onClick={() => onRaiseCorrection(r)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#DC2626',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '10px',
                            fontWeight: '800',
                            cursor: 'pointer',
                          }}
                        >
                          Dispute ⚡
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
