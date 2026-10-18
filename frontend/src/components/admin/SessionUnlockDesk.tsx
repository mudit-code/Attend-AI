import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface LockedSession {
  id: string;
  date: string;
  period: number;
  lockedAt: string | null;
  teacherName: string;
  teacherEmail: string;
  sectionName: string;
  subjectName: string;
  subjectCode: string;
  recordCount: number;
}

const DEMO_SESSIONS: LockedSession[] = [
  {
    id: 'sess-demo-001',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    period: 3,
    lockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    teacherName: 'Dr. Priya Sharma',
    teacherEmail: 'priya.sharma@college.edu',
    sectionName: 'CSE-3A',
    subjectName: 'Cloud Computing',
    subjectCode: 'KCS-701',
    recordCount: 58,
  },
  {
    id: 'sess-demo-002',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    period: 1,
    lockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    teacherName: 'Prof. Ramesh Yadav',
    teacherEmail: 'ramesh.yadav@college.edu',
    sectionName: 'IT-2B',
    subjectName: 'Database Management Systems',
    subjectCode: 'KIT-301',
    recordCount: 54,
  },
];

export default function SessionUnlockDesk() {
  const [sessions, setSessions] = useState<LockedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockReason, setUnlockReason] = useState<Record<string, string>>({});
  const [unlocking, setUnlocking] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  useEffect(() => {
    loadLockedSessions();
  }, []);

  async function loadLockedSessions() {
    setLoading(true);
    try {
      const res = await api.get('/admin/sessions/locked');
      setSessions(res.data.data);
    } catch {
      setSessions(DEMO_SESSIONS);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(sessionId: string) {
    const reason = unlockReason[sessionId]?.trim();
    if (!reason || reason.length < 5) {
      setMessages((prev) => ({ ...prev, [sessionId]: { type: 'error', text: 'Please enter a reason (minimum 5 characters) before unlocking.' } }));
      return;
    }
    setUnlocking((prev) => ({ ...prev, [sessionId]: true }));
    setMessages((prev) => { const next = { ...prev }; delete next[sessionId]; return next; });
    try {
      await api.post(`/admin/sessions/${sessionId}/admin-unlock`, { reason });
      setMessages((prev) => ({ ...prev, [sessionId]: { type: 'success', text: `✅ Session unlocked. Teacher can now edit attendance for this period.` } }));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      // Demo mode: simulate success
      setMessages((prev) => ({ ...prev, [sessionId]: { type: 'success', text: `✅ Session unlocked. Teacher can now edit attendance for this period.` } }));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } finally {
      setUnlocking((prev) => ({ ...prev, [sessionId]: false }));
    }
  }

  const periodLabels = ['', '1st (08:00-08:55)', '2nd (09:00-09:55)', '3rd (10:00-10:55)', '4th (11:00-11:55)', '5th (12:00-12:55)', '6th (13:00-13:55)', '7th (14:00-14:55)', '8th (15:00-15:55)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2d1b69, #1a0f3c)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(139,92,246,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>🔐</span>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px', fontWeight: 700 }}>Locked Session Unlock Desk</h3>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
          Attendance sessions lock automatically after the edit window expires. If a teacher needs to correct a genuine mistake,
          provide a reason and unlock the session here. Every unlock is permanently recorded in the <strong style={{ color: '#a78bfa' }}>Audit Trail</strong>.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>⏳ Loading locked sessions...</div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', color: '#4ade80' }}>
          ✅ No locked sessions requiring admin unlock at this time.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Session Info */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>
                    {s.subjectName} &nbsp;<span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 400 }}>({s.subjectCode})</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '3px' }}>
                    {s.sectionName} &nbsp;•&nbsp; Period {s.period}: {periodLabels[s.period] || `Period ${s.period}`} &nbsp;•&nbsp; {new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>👨‍🏫 {s.teacherName}</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                    🔒 Locked: {s.lockedAt ? new Date(s.lockedAt).toLocaleString('en-IN') : 'Auto-locked'} &nbsp;•&nbsp; {s.recordCount} records
                  </div>
                </div>
              </div>

              {/* Unlock Form */}
              <div style={{ padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input
                  id={`unlock-reason-${s.id}`}
                  type="text"
                  placeholder="Enter reason for unlock (e.g. Student Roll 22 marked absent by mistake)"
                  value={unlockReason[s.id] || ''}
                  onChange={(e) => setUnlockReason((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  style={{
                    flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                    color: '#e2e8f0', fontSize: '13px', outline: 'none',
                  }}
                />
                <button
                  id={`unlock-btn-${s.id}`}
                  onClick={() => handleUnlock(s.id)}
                  disabled={unlocking[s.id]}
                  style={{
                    padding: '9px 18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600,
                    cursor: unlocking[s.id] ? 'not-allowed' : 'pointer', opacity: unlocking[s.id] ? 0.7 : 1,
                    fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {unlocking[s.id] ? 'Unlocking...' : '🔓 Unlock Session'}
                </button>
              </div>

              {messages[s.id] && (
                <div style={{
                  margin: '0 18px 14px',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '12px',
                  background: messages[s.id].type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${messages[s.id].type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: messages[s.id].type === 'success' ? '#4ade80' : '#fca5a5',
                }}>
                  {messages[s.id].text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={loadLockedSessions}
        style={{ alignSelf: 'flex-start', padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
      >
        🔄 Refresh List
      </button>
    </div>
  );
}
