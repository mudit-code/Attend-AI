import { useState, useMemo, useEffect } from 'react';
import { api } from '../../lib/api';

interface LedgerRecord {
  id: string;
  date: string;
  day: string;
  period: string;
  subjectCode: string;
  subjectName: string;
  faculty: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE' | 'OD';
  verificationMethod: 'DYNAMIC_QR' | 'MANUAL_ROSTER' | 'BIOMETRIC_SYNC';
}

export default function AttendanceLedgerWidget() {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [dateFilterPreset, setDateFilterPreset] = useState<'7D' | '30D' | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LEAVE'>('ALL');

  // Discrepancy modal state
  const [disputeRecord, setDisputeRecord] = useState<LedgerRecord | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/reports/my-report')
      .then(({ data }) => {
        if (!active) return;
        const report = data.data;
        const subjectByName = new Map((report.subjects || []).map((subject: any) => [subject.subjectName, subject]));
        const mapped: LedgerRecord[] = (report.history || []).map((record: any) => {
          const subject = subjectByName.get(record.subject) as any;
          return {
            id: String(record.sessionId),
            date: new Date(record.date).toISOString().slice(0, 10),
            day: new Date(record.date).toLocaleDateString(undefined, { weekday: 'long' }),
            period: `Period ${record.period}`,
            subjectCode: subject?.subjectCode || '',
            subjectName: record.subject,
            faculty: record.teacher,
            status: record.status === 'P' ? 'PRESENT'
              : record.status === 'A' ? 'ABSENT'
              : record.status === 'OD' ? 'OD'
              : record.status === 'L' ? 'LATE'
              : 'LEAVE',
            verificationMethod: record.method === 'QR' ? 'DYNAMIC_QR'
              : record.method === 'FACE' ? 'BIOMETRIC_SYNC'
              : 'MANUAL_ROSTER',
          };
        });
        setRecords(mapped);
        setLoadError('');
      })
      .catch((error: any) => {
        if (!active) return;
        setRecords([]);
        setLoadError(error.response?.data?.error?.message || 'Could not load your attendance history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return records.filter((r) => {
      if (selectedSubject !== 'ALL' && r.subjectCode !== selectedSubject) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'LEAVE' && r.status !== 'LEAVE' && r.status !== 'OD') return false;
        if (statusFilter !== 'LEAVE' && r.status !== statusFilter) return false;
      }
      if (dateFilterPreset !== 'ALL') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - (dateFilterPreset === '7D' ? 7 : 30));
        if (new Date(r.date) < cutoff) return false;
      }
      return true;
    });
  }, [records, selectedSubject, statusFilter, dateFilterPreset]);

  // Statistics
  const totalInFilter = filteredRecords.length;
  const presentCount = filteredRecords.filter((r) => r.status === 'PRESENT' || r.status === 'OD').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'ABSENT').length;
  const leaveCount = filteredRecords.filter((r) => r.status === 'LEAVE').length;
  const percentage = totalInFilter > 0 ? Math.round((presentCount / totalInFilter) * 100) : null;

  function handleExportCsv() {
    let csv = 'Date,Day,Period,Subject Code,Subject Name,Faculty,Attendance Status,Verification Type\n';
    filteredRecords.forEach((r) => {
      csv += `${r.date},${r.day},"${r.period}","${r.subjectCode}","${r.subjectName}","${r.faculty}",${r.status},${r.verificationMethod}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AttendAI_Attendance_Ledger_${selectedSubject}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeReason.trim()) {
      alert('Please state the discrepancy reason');
      return;
    }
    try {
      if (!disputeRecord) return;
      await api.post('/correction-requests', {
        sessionId: Number(disputeRecord.id),
        requestedStatus: 'P',
        reason: disputeReason.trim(),
      });
    } catch (error: any) {
      setLoadError(error.response?.data?.error?.message || 'Could not submit the correction request.');
      return;
    }
    setDisputeSuccess(true);
    setTimeout(() => {
      setDisputeSuccess(false);
      setDisputeRecord(null);
      setDisputeReason('');
    }, 2000);
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
      {/* Header */}
      {loadError && <p role="alert" className="alert alert--error">{loadError}</p>}
      {loading && <p className="text-muted">Loading attendance history...</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
             Date-Range Attendance Audit Ledger
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>
            Day-by-day institutional lecture record with time-stamped QR & biometric verification logs
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="btn btn--ghost btn--sm"
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
           Download CSV Ledger
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          padding: '0.875rem',
          background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Filter by Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.82rem',
              background: 'var(--color-surface)',
            }}
          >
            <option value="ALL">All Subjects</option>
            {[...new Map(records.map((record) => [record.subjectCode, record.subjectName])).entries()].map(([code, name]) => (
              <option key={code} value={code}>{name} ({code})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Attendance Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              width: '100%',
              padding: '0.5rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.82rem',
              background: 'var(--color-surface)',
            }}
          >
            <option value="ALL">All Records</option>
            <option value="PRESENT">Only Present (P / OD)</option>
            <option value="ABSENT">Only Absent (A)</option>
            <option value="LEAVE">Leaves & On-Duty</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Date Range Preset
          </label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setDateFilterPreset('7D')}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: dateFilterPreset === '7D' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: dateFilterPreset === '7D' ? '#FFF' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              7D
            </button>
            <button
              onClick={() => setDateFilterPreset('30D')}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: dateFilterPreset === '30D' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: dateFilterPreset === '30D' ? '#FFF' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              30D
            </button>
            <button
              onClick={() => setDateFilterPreset('ALL')}
              style={{
                flex: 1,
                padding: '0.45rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: dateFilterPreset === 'ALL' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: dateFilterPreset === 'ALL' ? '#FFF' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              Semester
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Total In Range</span>
          <strong style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>{totalInFilter} Classes</strong>
        </div>
        <div style={{ padding: '0.75rem', background: '#ECFDF5', borderRadius: 'var(--radius-sm)', border: '1px solid #A7F3D0' }}>
          <span style={{ fontSize: '0.7rem', color: '#047857', display: 'block' }}>Attended</span>
          <strong style={{ fontSize: '1.25rem', color: '#065F46' }}>{presentCount} Classes</strong>
        </div>
        <div style={{ padding: '0.75rem', background: '#FEF2F2', borderRadius: 'var(--radius-sm)', border: '1px solid #FECACA' }}>
          <span style={{ fontSize: '0.7rem', color: '#B91C1C', display: 'block' }}>Missed / Absent</span>
          <strong style={{ fontSize: '1.25rem', color: '#991B1B' }}>{absentCount} Classes</strong>
        </div>
        <div style={{ padding: '0.75rem', background: '#FFFBEB', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A' }}>
          <span style={{ fontSize: '0.7rem', color: '#B45309', display: 'block' }}>Leaves / OD</span>
          <strong style={{ fontSize: '1.25rem', color: '#92400E' }}>{leaveCount} Days</strong>
        </div>
        <div style={{ padding: '0.75rem', background: percentage !== null && percentage >= 75 ? '#ECFDF5' : '#FEF2F2', borderRadius: 'var(--radius-sm)', border: `1px solid ${percentage !== null && percentage >= 75 ? '#A7F3D0' : '#FECACA'}` }}>
          <span style={{ fontSize: '0.7rem', color: percentage !== null && percentage >= 75 ? '#047857' : '#B91C1C', display: 'block' }}>Filtered Attendance</span>
          <strong style={{ fontSize: '1.25rem', color: percentage !== null && percentage >= 75 ? '#065F46' : '#991B1B' }}>{percentage === null ? '—' : `${percentage}%`}</strong>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Date & Day</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Slot / Period</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Subject & Faculty</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Mode</th>
              <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Correction</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No attendance entries found for the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const isP = r.status === 'PRESENT' || r.status === 'OD';
                const isA = r.status === 'ABSENT';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <strong style={{ display: 'block', color: 'var(--color-text)' }}>{r.date}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{r.day}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{ color: 'var(--color-text)' }}>{r.period}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {r.subjectName} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({r.subjectCode})</span>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>{r.faculty}</div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-pill)',
                          background: isP ? '#ECFDF5' : isA ? '#FEF2F2' : '#FFFBEB',
                          color: isP ? '#059669' : isA ? '#DC2626' : '#D97706',
                          border: `1px solid ${isP ? '#A7F3D0' : isA ? '#FECACA' : '#FDE68A'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {r.status === 'PRESENT' && '✓ Present'}
                        {r.status === 'ABSENT' && '✗ Absent'}
                        {r.status === 'OD' && '★ On-Duty'}
                        {r.status === 'LEAVE' && ' Leave'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        {r.verificationMethod === 'DYNAMIC_QR' ? ' 10s Live QR' : ' Faculty Roster'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      {r.status === 'ABSENT' ? (
                        <button
                          onClick={() => {
                            setDisputeRecord(r);
                            setDisputeReason('');
                          }}
                          className="btn btn--ghost btn--sm"
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-primary)',
                            padding: '0.2rem 0.45rem',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          Dispute
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>Verified</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Discrepancy Correction Modal */}
      {disputeRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDisputeRecord(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 450,
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-float)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}> Report Attendance Discrepancy</h3>
              <button
                onClick={() => setDisputeRecord(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            {disputeSuccess ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: '#ECFDF5', borderRadius: 'var(--radius-md)', color: '#065F46' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>✓</span>
                <strong>Discrepancy Ticket Submitted!</strong>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#047857' }}>
                  Forwarded to {disputeRecord.faculty} for biometric & audit log reconciliation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitDispute}>
                <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                    {disputeRecord.subjectName} ({disputeRecord.subjectCode})
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    {disputeRecord.date} • {disputeRecord.period}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Faculty: {disputeRecord.faculty}</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Reason for Discrepancy Correction
                  </label>
                  <textarea
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g. My camera had glare during QR scan, but I was present and submitted physical lab assignment."
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setDisputeRecord(null)}
                    className="btn btn--ghost"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ flex: 1 }}
                  >
                    Submit Dispute
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
