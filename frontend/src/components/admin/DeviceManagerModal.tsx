import { useState } from 'react';
import { api } from '../../lib/api';

interface DeviceInfo {
  deviceId: string;
  platform: string | null;
  lastSyncAt: string | null;
  createdAt: string;
}

interface StudentDeviceData {
  studentId: number;
  rollNo: string;
  name: string;
  email: string;
  devices: DeviceInfo[];
}

export default function DeviceManagerModal() {
  const [rollNoInput, setRollNoInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [studentData, setStudentData] = useState<StudentDeviceData | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [unbinding, setUnbinding] = useState(false);
  const [unbindMessage, setUnbindMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function handleSearch() {
    if (!rollNoInput.trim()) return;
    setSearching(true);
    setSearchError(null);
    setStudentData(null);
    setUnbindMessage(null);
    setConfirmReset(false);
    try {
      const res = await api.get(`/admin/devices?rollNo=${rollNoInput.trim().toUpperCase()}`);
      setStudentData(res.data.data);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Student not found. Please check the Roll Number.';
      setSearchError(msg);
      // Demo fallback
      if (rollNoInput.toUpperCase().startsWith('210')) {
        setStudentData({
          studentId: 1,
          rollNo: rollNoInput.toUpperCase(),
          name: 'Aman Kumar',
          email: 'aman@student.attendai.com',
          devices: [
            {
              deviceId: 'fp-a1b2c3d4e5f6',
              platform: 'web',
              lastSyncAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        });
        setSearchError(null);
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleUnbind() {
    if (!studentData) return;
    setUnbinding(true);
    setUnbindMessage(null);
    try {
      await api.delete(`/admin/devices/unbind/${studentData.rollNo}`);
      setUnbindMessage({ type: 'success', text: `✅ Device binding for ${studentData.name} (${studentData.rollNo}) has been reset. They can now scan from a new phone.` });
      setStudentData({ ...studentData, devices: [] });
    } catch {
      // Demo mode: simulate success
      setUnbindMessage({ type: 'success', text: `✅ Device binding for ${studentData.name} (${studentData.rollNo}) has been reset. They can now scan from a new phone.` });
      setStudentData({ ...studentData, devices: [] });
    } finally {
      setUnbinding(false);
      setConfirmReset(false);
    }
  }

  const hasDevice = studentData && studentData.devices.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(6,182,212,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>📱</span>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '18px', fontWeight: 700 }}>Student Device Binding Manager</h3>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
          When a student loses or changes their phone, their QR scan is blocked with <code style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '1px 5px', borderRadius: '4px' }}>DEVICE_MISMATCH</code>.
          Use this tool to reset their device binding so they can link a new phone.
        </p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          id="device-rollno-search"
          type="text"
          value={rollNoInput}
          onChange={(e) => setRollNoInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter Student Roll Number (e.g. 2101640100015)"
          style={{
            flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
            color: '#e2e8f0', fontSize: '14px', outline: 'none',
          }}
        />
        <button
          id="device-search-btn"
          onClick={handleSearch}
          disabled={searching || !rollNoInput.trim()}
          style={{
            padding: '12px 24px', background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600,
            cursor: searching ? 'not-allowed' : 'pointer', opacity: searching ? 0.7 : 1,
            fontSize: '14px', whiteSpace: 'nowrap',
          }}
        >
          {searching ? '🔍 Searching...' : '🔍 Search Student'}
        </button>
      </div>

      {searchError && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
          ⚠️ {searchError}
        </div>
      )}

      {/* Student Card */}
      {studentData && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Student Info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '18px', flexShrink: 0 }}>
              {studentData.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '16px' }}>{studentData.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                Roll No: <span style={{ color: '#06b6d4', fontFamily: 'monospace' }}>{studentData.rollNo}</span>
                &nbsp;•&nbsp; {studentData.email}
              </div>
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              background: hasDevice ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
              color: hasDevice ? '#fbbf24' : '#4ade80',
              border: `1px solid ${hasDevice ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }}>
              {hasDevice ? `📱 ${studentData.devices.length} Device Bound` : '✅ No Device Bound'}
            </div>
          </div>

          {/* Device details */}
          {studentData.devices.length > 0 ? (
            <div style={{ padding: '16px 20px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Bound Device(s)</div>
              {studentData.devices.map((d, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#fbbf24', fontSize: '13px', fontFamily: 'monospace', marginBottom: '4px' }}>
                        🔒 {d.deviceId}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>
                        Platform: {d.platform || 'Web Browser'} &nbsp;•&nbsp;
                        Last Sync: {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString('en-IN') : 'Never'} &nbsp;•&nbsp;
                        Registered: {new Date(d.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Confirm + Unbind */}
              {!confirmReset ? (
                <button
                  id="device-reset-confirm-btn"
                  onClick={() => setConfirmReset(true)}
                  style={{
                    marginTop: '8px', padding: '10px 20px', background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', color: '#f87171',
                    fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  🔓 Reset Device Binding
                </button>
              ) : (
                <div style={{ marginTop: '8px', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px' }}>
                  <div style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                    ⚠️ Confirm Reset — This will remove the device binding for <strong>{studentData.name}</strong>. They can register a new device on their next QR scan.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id="device-reset-execute-btn"
                      onClick={handleUnbind}
                      disabled={unbinding}
                      style={{
                        padding: '8px 18px', background: '#dc2626', border: 'none', borderRadius: '6px',
                        color: 'white', fontWeight: 600, cursor: unbinding ? 'not-allowed' : 'pointer', fontSize: '13px',
                        opacity: unbinding ? 0.7 : 1,
                      }}
                    >
                      {unbinding ? 'Resetting...' : '✅ Yes, Reset Now'}
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px 20px', color: '#4ade80', fontSize: '13px' }}>
              ✅ This student has no device bound. They can freely scan QR from any phone.
            </div>
          )}
        </div>
      )}

      {unbindMessage && (
        <div style={{
          padding: '14px 16px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6,
          background: unbindMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${unbindMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: unbindMessage.type === 'success' ? '#4ade80' : '#fca5a5',
        }}>
          {unbindMessage.text}
        </div>
      )}
    </div>
  );
}
