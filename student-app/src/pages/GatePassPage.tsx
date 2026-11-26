import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, PlusCircle, Clock, CheckCircle,
  XCircle, AlertCircle, MapPin, ExternalLink, ChevronDown,
  Loader2, QrCode
} from 'lucide-react';
import { api } from '../lib/api';
import QRCode from 'qrcode';

// ─── Types ──────────────────────────────────────────────────────────
interface GatePass {
  id: string;
  reason: string;
  reasonOther?: string;
  destination: string;
  additionalNote?: string;
  documentUrl?: string;
  outTime: string;
  expectedInTime: string;
  mentorStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  hodStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  mentorNote?: string;
  hodNote?: string;
  qrExpiresAt?: string;
  qrConsumedAt?: string;
  createdAt: string;
  mentor?: { user: { name: string } };
}

const REASONS = [
  { value: 'MEDICAL_EMERGENCY', label: '🚑 Medical Emergency' },
  { value: 'DOCTOR_APPOINTMENT', label: '🏥 Doctor Appointment' },
  { value: 'FAMILY_EMERGENCY', label: '👨‍👩‍👧 Family Emergency' },
  { value: 'BANK_WORK', label: '🏦 Bank Work' },
  { value: 'COURT_LEGAL', label: '⚖️ Court / Legal' },
  { value: 'TRAVEL', label: '✈️ Travel' },
  { value: 'PERSONAL', label: '👤 Personal' },
  { value: 'OTHER', label: '📝 Other' },
];

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', icon: <Clock size={12} /> },
    APPROVED: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', icon: <CheckCircle size={12} /> },
    REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', icon: <XCircle size={12} /> },
  };
  const s = styles[status] ?? styles.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '20px',
      background: s.bg, color: s.color, fontSize: '11px', fontWeight: 600,
    }}>
      {s.icon} {label}: {status}
    </span>
  );
}

// ─── QR Modal ───────────────────────────────────────────────────────
function QRModal({ pass, rawToken, onClose }: { pass: GatePass; rawToken: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (canvasRef.current && rawToken) {
      QRCode.toCanvas(canvasRef.current, rawToken, { width: 260, margin: 2, color: { dark: '#000', light: '#fff' } });
    }
  }, [rawToken]);

  useEffect(() => {
    if (!pass.qrExpiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(pass.qrExpiresAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('EXPIRED'); clearInterval(interval); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [pass.qrExpiresAt]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '28px 24px',
        maxWidth: '320px', width: '100%', textAlign: 'center'
      }}>
        <p style={{ color: '#1F2937', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Show to Guard</p>
        <p style={{ color: '#6B7280', fontSize: '12px', marginBottom: '16px' }}>Single-use QR Code</p>
        <canvas ref={canvasRef} style={{ borderRadius: '12px', maxWidth: '100%' }} />
        {timeLeft && (
          <div style={{
            marginTop: '14px', padding: '10px', borderRadius: '10px',
            background: timeLeft === 'EXPIRED' ? '#FEE2E2' : '#EFF6FF',
            color: timeLeft === 'EXPIRED' ? '#EF4444' : '#3B82F6',
            fontWeight: 700, fontSize: '18px'
          }}>
            {timeLeft === 'EXPIRED' ? '⏰ Expired' : `⏱ Valid: ${timeLeft}`}
          </div>
        )}
        <div style={{ marginTop: '12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', lineHeight: 1.6 }}>
          <p>📍 {pass.destination}</p>
          <p>🕐 Return by: {new Date(pass.expectedInTime).toLocaleString()}</p>
        </div>
      </div>
      <button onClick={onClose} style={{
        marginTop: '20px', padding: '12px 36px', background: 'var(--color-primary)',
        color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', fontSize: '15px',
        fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.3)'
      }}>
        Close
      </button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function GatePassPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'apply' | 'mypasses'>('mypasses');
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // QR display state
  const [qrPass, setQrPass] = useState<GatePass | null>(null);
  const [qrToken, setQrToken] = useState<string>('');

  // Form fields
  const [form, setForm] = useState({
    reason: '',
    reasonOther: '',
    destination: '',
    additionalNote: '',
    documentUrl: '',
    outTime: '',
    expectedInTime: '',
  });

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gatepass/my');
      setPasses(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPasses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason || !form.destination || !form.outTime || !form.expectedInTime) {
      setError('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/gatepass', {
        reason: form.reason,
        reasonOther: form.reason === 'OTHER' ? form.reasonOther : undefined,
        destination: form.destination,
        additionalNote: form.additionalNote || undefined,
        documentUrl: form.documentUrl || undefined,
        outTime: new Date(form.outTime).toISOString(),
        expectedInTime: new Date(form.expectedInTime).toISOString(),
      });
      setSuccess('Gate pass application submitted! Your mentor has been notified.');
      setForm({ reason: '', reasonOther: '', destination: '', additionalNote: '', documentUrl: '', outTime: '', expectedInTime: '' });
      setTab('mypasses');
      fetchPasses();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Load QR token from local storage or auto-fetch from server
  const openQR = async (pass: GatePass) => {
    const stored = localStorage.getItem(`gp_token_${pass.id}`);
    if (stored) {
      setQrPass(pass);
      setQrToken(stored);
      return;
    }

    try {
      const res = await api.get(`/gatepass/my/qr/${pass.id}`);
      const token = res.data?.data?.token;
      if (token) {
        localStorage.setItem(`gp_token_${pass.id}`, token);
        setQrPass(pass);
        setQrToken(token);
      } else {
        alert('Could not retrieve QR pass token.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message ?? 'Failed to load QR code. Please check your connection.');
    }
  };

  const isQrReady = (pass: GatePass) =>
    pass.mentorStatus === 'APPROVED' &&
    pass.hodStatus === 'APPROVED' &&
    !pass.qrConsumedAt &&
    (!pass.qrExpiresAt || new Date(pass.qrExpiresAt) > new Date());

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: '10px', padding: '10px 12px', color: 'var(--color-text)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Gate Pass</h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-faint)', margin: 0 }}>Apply & track your exit permits</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '0 16px 16px', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '4px', boxShadow: 'var(--shadow-card)' }}>
        {[
          { key: 'mypasses', label: 'My Passes', icon: <ClipboardList size={15} /> },
          { key: 'apply', label: 'Apply New', icon: <PlusCircle size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '9px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              background: tab === t.key ? 'var(--color-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Success / Error alerts */}
      {success && (
        <div style={{ margin: '0 16px 12px', padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ color: '#10B981', fontSize: '13px', margin: 0 }}>{success}</p>
        </div>
      )}
      {error && (
        <div style={{ margin: '0 16px 12px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ color: '#EF4444', fontSize: '13px', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── TAB: MY PASSES ── */}
      {tab === 'mypasses' && (
        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={28} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : passes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faint)' }}>
              <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: 600 }}>No gate pass applications yet</p>
              <button onClick={() => setTab('apply')} style={{
                marginTop: '12px', padding: '10px 24px', background: 'var(--color-primary)',
                color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600
              }}>
                Apply Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {passes.map((pass) => (
                <div key={pass.id} style={{
                  background: 'var(--color-surface)', borderRadius: '14px',
                  border: '1px solid var(--color-border)', overflow: 'hidden'
                }}>
                  {/* Card header */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
                        {REASONS.find(r => r.value === pass.reason)?.label ?? pass.reason}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                        {new Date(pass.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <StatusBadge status={pass.mentorStatus} label="Mentor" />
                      <StatusBadge status={pass.hodStatus} label="HOD" />
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-faint)', lineHeight: 1.7 }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <MapPin size={13} /> {pass.destination}
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Clock size={13} />
                      Out: {new Date(pass.outTime).toLocaleString()} · Return: {new Date(pass.expectedInTime).toLocaleString()}
                    </p>
                    {pass.mentor && (
                      <p style={{ margin: 0, fontSize: '12px' }}>
                        Mentor: {pass.mentor.user.name}
                      </p>
                    )}
                    {pass.mentorNote && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#10B981' }}>
                        💬 Mentor note: "{pass.mentorNote}"
                      </p>
                    )}
                    {pass.hodNote && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#3B82F6' }}>
                        💬 HOD note: "{pass.hodNote}"
                      </p>
                    )}
                    {pass.documentUrl && (
                      <a href={pass.documentUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3B82F6', textDecoration: 'none' }}>
                        <ExternalLink size={12} /> View Document
                      </a>
                    )}
                  </div>

                  {/* QR Button */}
                  {isQrReady(pass) && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <button
                        onClick={() => openQR(pass)}
                        style={{
                          width: '100%', padding: '12px', background: 'linear-gradient(135deg,#10B981,#059669)',
                          color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700,
                          fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <QrCode size={18} /> Show QR to Guard
                      </button>
                    </div>
                  )}
                  {pass.qrConsumedAt && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '12px', margin: 0 }}>
                        ✅ QR used at {new Date(pass.qrConsumedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: APPLY ── */}
      {tab === 'apply' && (
        <form onSubmit={handleSubmit} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Reason <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                style={{ ...inp, appearance: 'none', paddingRight: '36px' }}
                required
              >
                <option value="">Select reason...</option>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} />
            </div>
          </div>

          {form.reason === 'OTHER' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Specify Reason <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={form.reasonOther}
                onChange={(e) => setForm((f) => ({ ...f, reasonOther: e.target.value }))}
                placeholder="Please specify..."
                style={inp}
                required
              />
            </div>
          )}

          {/* Destination */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Destination <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              placeholder="e.g. City Hospital, Canara Bank Palasia"
              style={inp}
              minLength={5}
              required
            />
          </div>

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Leave at <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={form.outTime}
                onChange={(e) => setForm((f) => ({ ...f, outTime: e.target.value }))}
                style={inp}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Return by <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={form.expectedInTime}
                onChange={(e) => setForm((f) => ({ ...f, expectedInTime: e.target.value }))}
                style={inp}
                required
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Additional Note
            </label>
            <textarea
              rows={3}
              value={form.additionalNote}
              onChange={(e) => setForm((f) => ({ ...f, additionalNote: e.target.value }))}
              placeholder="Any extra info for teacher/HOD..."
              style={{ ...inp, resize: 'none' }}
            />
          </div>

          {/* Document URL */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
              Document Link (optional)
            </label>
            <input
              type="url"
              value={form.documentUrl}
              onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
              placeholder="Drive/photo link of prescription, etc."
              style={inp}
            />
          </div>

          {/* Info box */}
          <div style={{
            padding: '12px', background: 'rgba(59,130,246,0.08)', borderRadius: '10px',
            border: '1px solid rgba(59,130,246,0.2)', fontSize: '12px', color: 'var(--color-text-faint)'
          }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#3B82F6' }}>How it works:</p>
            <p style={{ margin: 0 }}>1. Your current class teacher is auto-assigned as Mentor.</p>
            <p style={{ margin: 0 }}>2. Mentor gives Level 1 approval.</p>
            <p style={{ margin: 0 }}>3. HOD gives final approval & generates QR.</p>
            <p style={{ margin: 0 }}>4. Show QR to guard at gate (single-use).</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '13px', background: submitting ? '#6B7280' : 'var(--color-primary)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', fontWeight: 800,
              fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
            }}
          >
            {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : '📤 Submit Application'}
          </button>
        </form>
      )}

      {/* QR Modal */}
      {qrPass && qrToken && (
        <QRModal pass={qrPass} rawToken={qrToken} onClose={() => { setQrPass(null); setQrToken(''); }} />
      )}
    </div>
  );
}
