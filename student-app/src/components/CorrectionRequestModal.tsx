import { useState } from 'react';
import { api } from '../lib/api';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface CorrectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionInfo?: {
    sessionId: string | number;
    period: number;
    subject: string;
    date: string;
    teacher?: string;
  } | null;
  record?: any;
  onSuccess?: () => void;
}

export default function CorrectionRequestModal({
  isOpen,
  onClose,
  sessionInfo,
  record,
  onSuccess,
}: CorrectionRequestModalProps) {
  const activeSession = sessionInfo || record;
  const [reason, setReason] = useState('Present in lecture, missed digital scan on back bench');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !activeSession) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for this attendance dispute');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/correction-requests', {
        sessionId: Number(activeSession.sessionId),
        requestedStatus: 'P',
        reason: reason.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1400);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not submit correction request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl, 20px)',
          border: '1px solid var(--color-border, #E2E8F0)',
          maxWidth: '460px',
          width: '100%',
          padding: '24px 20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
                Attendance Dispute Claim
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748B)', marginTop: '2px' }}>
              Submit a 1-click rectification request directly to your subject faculty
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted, #64748B)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Session Card Info */}
        <div
          style={{
            background: 'var(--color-surface-2, #F8FAFC)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              {activeSession.subject}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '999px',
                background: '#FEE2E2',
                color: '#B91C1C',
                border: '1px solid #FECACA',
              }}
            >
              Marked Absent
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
            Period {activeSession.period} • {new Date(activeSession.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            {activeSession.teacher ? ` • Prof. ${activeSession.teacher}` : ''}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--color-danger-light, #FEF2F2)',
              border: '1px solid #FECACA',
              color: 'var(--color-danger-text, #B91C1C)',
              fontSize: '12px',
              marginBottom: '14px',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 10px',
              color: 'var(--color-success-text, #047857)',
              background: 'var(--color-success-light, #ECFDF5)',
              borderRadius: '12px',
              border: '1px solid #A7F3D0',
            }}
          >
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: '#10B981' }} />
            <div style={{ fontSize: '14px', fontWeight: '800' }}>Correction Request Submitted!</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748B)', marginTop: '4px' }}>
              Your subject faculty will review and update your attendance status.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--color-text, #0F172A)',
                  marginBottom: '6px',
                }}
              >
                Dispute Reason / Justification *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Present physically on second row bench, was not able to scan projected token code"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '9px 16px',
                  borderRadius: '999px',
                  background: 'var(--color-surface-2, #F8FAFC)',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  color: 'var(--color-text, #0F172A)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '999px',
                  background: 'var(--color-primary, #0F172A)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Claim →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
