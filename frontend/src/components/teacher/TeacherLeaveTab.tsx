import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface LeaveItem {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionNote?: string;
  createdAt: string;
}

export function TeacherLeaveTab() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [duration, setDuration] = useState('FULL_DAY');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    api
      .get('/teacher-leaves/teacher/my')
      .then((res) => {
        const fetched = res.data?.leaves || res.data?.data;
        if (isMounted && Array.isArray(fetched)) {
          const formatted = fetched.map((item: any) => ({
            id: String(item.id),
            type: item.type || 'CASUAL',
            fromDate: item.fromDate ? new Date(item.fromDate).toISOString().split('T')[0] : '',
            toDate: item.toDate ? new Date(item.toDate).toISOString().split('T')[0] : '',
            reason: item.reason || '',
            status: item.status || 'PENDING',
            decisionNote: item.decisionNote,
            createdAt: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '',
          }));
          setLeaves(formatted);
        }
      })
      .catch((error: any) => {
        if (isMounted) {
          setLeaves([]);
          setLoadError(error.response?.data?.error?.message || 'Could not load leave requests.');
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      alert('Please fill in all leave fields');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      const { data } = await api.post('/teacher-leaves/teacher/apply', {
        fromDate,
        toDate,
        type: leaveType,
        reason,
      });
      if (data?.data) {
        const created = data.data;
        setLeaves((previous) => [{
          id: String(created.id),
          type: created.type,
          fromDate: String(created.fromDate).slice(0, 10),
          toDate: String(created.toDate).slice(0, 10),
          reason: created.reason,
          status: created.status,
          createdAt: String(created.createdAt).slice(0, 10),
        }, ...previous]);
      }
      setLoadError('');
      setMsg('✓ Leave application submitted to Dean Office!');
      setFromDate('');
      setToDate('');
      setReason('');
    } catch (error: any) {
      setMsg(error.response?.data?.error?.message || 'Could not submit the leave application.');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 4000);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {loadError && <p role="alert" className="alert alert--error">{loadError}</p>}
      {/* ─── Leave Balance Summary ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
            border: '1.5px solid #DBEAFE',
            padding: '1.25rem',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1E40AF' }}>Casual Leave (CL)</span>

          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E3A8A', marginTop: '0.35rem' }}>
            Not configured
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Personal & urgent work</div>
        </div>

        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
            border: '1.5px solid #D1FAE5',
            padding: '1.25rem',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#065F46' }}>Medical Leave (ML)</span>

          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#064E3B', marginTop: '0.35rem' }}>
            Not configured
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Requires medical certificate</div>
        </div>

        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
            border: '1.5px solid #FFEDD5',
            padding: '1.25rem',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#9A3412' }}>Duty Leave (OD)</span>

          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7C2D12', marginTop: '0.35rem' }}>
            Not configured
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Conferences, FDP & Exam duties</div>
        </div>
      </div>

      {/* ─── Apply for Leave Form ─── */}
      <div
        className="card"
        style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          padding: '1.5rem',
          border: '1.5px solid #FFE4E0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1C1C26', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           Apply for Faculty Leave
        </h3>

        {msg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontWeight: 700,
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            {msg}
          </div>
        )}

        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4B5563', marginBottom: '0.35rem' }}>
                Leave Type
              </label>
              <select
                className="input"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                style={{ height: 44, width: '100%', borderRadius: '10px' }}
              >
                <option value="CASUAL"> Casual Leave (CL)</option>
                <option value="MEDICAL"> Medical Leave (ML)</option>
                <option value="DUTY"> Duty Leave / On-Duty (OD)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4B5563', marginBottom: '0.35rem' }}>
                Leave Duration
              </label>
              <select
                className="input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{ height: 44, width: '100%', borderRadius: '10px' }}
              >
                <option value="FULL_DAY">Full Day (1.0 Day)</option>
                <option value="FIRST_HALF">First Half (0.5 Day)</option>
                <option value="SECOND_HALF">Second Half (0.5 Day)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4B5563', marginBottom: '0.35rem' }}>
                Start Date
              </label>
              <input
                type="date"
                className="input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                style={{ height: 44, width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4B5563', marginBottom: '0.35rem' }}>
                End Date
              </label>
              <input
                type="date"
                className="input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                style={{ height: 44, width: '100%', borderRadius: '10px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#4B5563', marginBottom: '0.35rem' }}>
              Reason for Absence & Lecture Adjustments
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="Specify purpose of leave and faculty covering your classes during absence..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={{ width: '100%', borderRadius: '10px', padding: '0.75rem', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
              style={{
                height: 44,
                padding: '0 1.75rem',
                fontSize: '0.925rem',
                fontWeight: 800,
                borderRadius: '10px',
              }}
            >
              {loading ? 'Submitting...' : 'Submit Application to Dean →'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Historical Applications Ledger ─── */}
      <div
        className="card"
        style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          padding: '1.5rem',
          border: '1.5px solid #F1F5F9',
        }}
      >
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1C26', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           Leave Application History & Approvals
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Dates</th>
                <th style={{ padding: '0.75rem 1rem' }}>Reason & Lecture Plan</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Admin Remarks</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: l.type === 'DUTY' ? '#FEF3C7' : l.type === 'MEDICAL' ? '#E0E7FF' : '#F3E8FF',
                        color: l.type === 'DUTY' ? '#92400E' : l.type === 'MEDICAL' ? '#3730A3' : '#6B21A8',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      {l.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>
                    {l.fromDate} to {l.toDate}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569', maxWidth: 260 }}>
                    {l.reason}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background:
                          l.status === 'APPROVED' ? '#DCFCE7' : l.status === 'REJECTED' ? '#FEE2E2' : '#FEF9C3',
                        color:
                          l.status === 'APPROVED' ? '#15803D' : l.status === 'REJECTED' ? '#B91C1C' : '#854D0E',
                      }}
                    >
                      {l.status === 'APPROVED' ? '✓ APPROVED' : l.status === 'REJECTED' ? '✕ REJECTED' : ' PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    {l.decisionNote || 'Awaiting Dean review'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
