import React, { useState } from 'react';
import { api } from '../lib/api';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';

const CATEGORIES = ['ATTENDANCE', 'MARKS', 'BEHAVIOR', 'FACILITIES', 'OTHER'] as const;

interface GrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GrievanceModal({ isOpen, onClose }: GrievanceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('ATTENDANCE');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/grievances', {
        title: title.trim(),
        description: description.trim(),
        category,
        isAnonymous,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setTitle('');
        setDescription('');
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl, 20px)',
          padding: '20px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-modal, 0 20px 25px -5px rgba(0, 0, 0, 0.2))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
                Confidential Grievance Desk
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)' }}>
                Protected under Proctorial Redressal Policy
              </div>
            </div>
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
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <CheckCircle2 size={40} color="#047857" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              Grievance Filed Confidentially
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748B)', marginTop: '4px' }}>
              Your case ID has been routed directly to the HOD / Proctor Cell.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
                Classification Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-primary, #0F172A)',
                  background: '#FFFFFF',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
                Subject / Core Issue
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Absent wrongly marked in Digital Electronics on Oct 12"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
                Factual Narrative
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Provide specific lecture timing, faculty name or event context..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '12px',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--color-primary, #0F172A)', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span>Submit anonymously (Hide Student ID & Name from report)</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '4px',
                padding: '10px',
                background: 'var(--color-primary, #0F172A)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting to Proctor...' : 'Submit Grievance'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
