import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';

interface LeaveRequest {
  id: string | number;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  appliedAt?: string;
}

export default function LeavesPage() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [leaveType, setLeaveType] = useState<'MEDICAL' | 'PERSONAL' | 'EVENT' | 'OD'>('MEDICAL');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data.data || []);
    } catch {
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      setMessage({ text: 'Please complete all required fields.', isError: true });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/leaves', {
        fromDate,
        toDate,
        type: leaveType,
        reason: reason.trim(),
      });
      setMessage({ text: 'Leave application submitted for HOD review.', isError: false });
      setReason('');
      setFromDate('');
      setToDate('');
      await fetchLeaves();
    } catch (err: any) {
      const errText = err.response?.data?.error?.message || 'Could not submit leave request.';
      setMessage({ text: errText, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#F0FDF4', color: '#047857', border: '1px solid #BBF7D0', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
            <Clock size={12} /> Under Review
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Header with Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: '10px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-primary, #0F172A)',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary, #0F172A)', margin: 0 }}>
            Leave Management Desk
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', margin: 0, fontWeight: 600 }}>
            Official student absence, OD & medical leaves
          </p>
        </div>
      </div>

      {/* Leave Application Form */}
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
        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} color="var(--color-accent, #F59E0B)" />
          <span>Apply for New Leave</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '3px' }}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '3px' }}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '3px' }}>
              Leave Classification
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as any)}
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
              <option value="MEDICAL">Medical Leave (Dispensary Verified)</option>
              <option value="PERSONAL">Personal / Family Emergency</option>
              <option value="EVENT">Technical Fest / Hackathon</option>
              <option value="OD">On Duty (OD) / Sports Event</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted, #64748B)', display: 'block', marginBottom: '3px' }}>
              Detailed Reason / Reference
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason and medical / event details..."
              rows={3}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #E2E8F0)',
                fontSize: '12px',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: message.isError ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${message.isError ? '#FECACA' : '#BBF7D0'}`,
                color: message.isError ? '#DC2626' : '#047857',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {message.text}
            </div>
          )}

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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <Send size={14} />
            <span>{submitting ? 'Submitting Application...' : 'Submit Leave Request'}</span>
          </button>
        </form>
      </div>

      {/* Previous Leaves Tracker */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)', margin: 0 }}>
            Application History ({leaves.length})
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
            Real-time Tracker
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted, #64748B)', fontSize: '12px' }}>
            Loading application history...
          </div>
        ) : leaves.length === 0 ? (
          <div
            style={{
              padding: '24px',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl, 20px)',
              border: '1px solid var(--color-border, #E2E8F0)',
              textAlign: 'center',
              color: 'var(--color-text-muted, #64748B)',
              fontSize: '12px',
            }}
          >
            No leave applications submitted yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leaves.map((l) => (
              <div
                key={l.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  padding: '12px',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary, #0F172A)' }}>
                      {l.type} Leave
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} />
                      <span>{new Date(l.fromDate).toLocaleDateString('en-IN')} to {new Date(l.toDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  {getStatusBadge(l.status)}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-primary, #0F172A)', background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', marginTop: '6px' }}>
                  {l.reason}
                </div>

                {l.rejectionReason && (
                  <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '6px', fontWeight: 600 }}>
                    Remark: {l.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
