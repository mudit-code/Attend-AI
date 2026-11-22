import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface FeedbackItem {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'STUDENT' | 'TEACHER';
  senderIdentifier: string;
  category: 'ACADEMIC' | 'INFRASTRUCTURE' | 'HOSTEL_MESS' | 'ATTENDANCE_TECH' | 'GENERAL';
  title: string;
  description: string;
  status: 'NEW' | 'IN_REVIEW' | 'RESOLVED';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export default function InstitutionalFeedbackManager() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reply Modal
  const [replyTarget, setReplyTarget] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    loadFeedbackInbox();
  }, []);

  async function loadFeedbackInbox() {
    setLoading(true);
    try {
      const res = await api.get('/feedback/admin/inbox');
      setFeedbacks(res.data?.data ?? []);
    } catch (error: any) {
      setFeedbacks([]);
      setError(error.response?.data?.error?.message || 'Could not load feedback.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTarget || !replyText.trim()) {
      alert('Please enter an official administrative reply');
      return;
    }

    setSubmittingReply(true);
    try {
      await api.post(`/feedback/admin/${replyTarget.id}/reply`, {
        reply: replyText.trim(),
      });
    } catch (error: any) {
      setError(error.response?.data?.error?.message || 'Could not submit the reply.');
      setSubmittingReply(false);
      return;
    }

    setFeedbacks((prev) =>
      prev.map((fb) =>
        fb.id === replyTarget.id
          ? {
              ...fb,
              status: 'RESOLVED',
              adminReply: replyText.trim(),
              repliedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            }
          : fb
      )
    );

    setSubmittingReply(false);
    setReplyTarget(null);
    setReplyText('');
  }

  // Filter logic
  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedCategory !== 'ALL' && fb.category !== selectedCategory) return false;
    if (selectedRole !== 'ALL' && fb.senderRole !== selectedRole) return false;
    if (selectedStatus !== 'ALL' && fb.status !== selectedStatus) return false;
    return true;
  });

  const openTicketsCount = feedbacks.filter((fb) => fb.status !== 'RESOLVED').length;

  return (
    <div>
      {error && <p role="alert" className="alert alert--error">{error}</p>}
      {/* Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #FFF0EE 0%, #FFFFFF 100%)',
          border: '1px solid var(--color-border-strong)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>
             2-Way Institutional Feedback & Grievance Desk
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Direct communication channel connecting students, faculty, and administration with transparent resolution tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Updating inbox...</span>
          )}
          <span
            className="badge"
            style={{
              background: openTicketsCount > 0 ? '#FEF2F2' : '#ECFDF5',
              color: openTicketsCount > 0 ? '#DC2626' : '#059669',
              border: `1px solid ${openTicketsCount > 0 ? '#FECACA' : '#A7F3D0'}`,
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              fontSize: '0.82rem',
            }}
          >
            {openTicketsCount} Unresolved Feedback Tickets
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          padding: '1rem',
          background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.82rem',
              background: 'var(--color-surface)',
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="ACADEMIC">Academic Curriculum</option>
            <option value="ATTENDANCE_TECH">Attendance Tech & QR</option>
            <option value="INFRASTRUCTURE">Campus Infrastructure</option>
            <option value="HOSTEL_MESS">Hostel & Mess</option>
            <option value="GENERAL">General Suggestion</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Submitted By
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.82rem',
              background: 'var(--color-surface)',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students Only</option>
            <option value="TEACHER">Faculty Members Only</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Resolution Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.82rem',
              background: 'var(--color-surface)',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New / Open</option>
            <option value="RESOLVED">Resolved / Replied</option>
          </select>
        </div>
      </div>

      {/* Ticket List */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredFeedbacks.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            No feedback submissions found matching your filter selection.
          </div>
        ) : (
          filteredFeedbacks.map((item) => {
            const isResolved = item.status === 'RESOLVED';
            const roleColor = item.senderRole === 'TEACHER' ? { bg: '#EFF6FF', text: '#2563EB' } : { bg: '#ECFDF5', text: '#059669' };

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  borderLeft: `4px solid ${isResolved ? 'var(--color-success)' : 'var(--color-primary)'}`,
                }}
              >
                {/* Top Meta Line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="badge"
                      style={{
                        background: roleColor.bg,
                        color: roleColor.text,
                        fontWeight: 700,
                        fontSize: '0.72rem',
                      }}
                    >
                      {item.senderRole}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                      {item.senderName}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ({item.senderIdentifier})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-pill)',
                        background: isResolved ? '#ECFDF5' : '#FEF2F2',
                        color: isResolved ? '#059669' : '#DC2626',
                        border: `1px solid ${isResolved ? '#A7F3D0' : '#FECACA'}`,
                      }}
                    >
                      {isResolved ? '✓ RESOLVED' : '● ACTION REQUIRED'}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>
                      {item.createdAt}
                    </span>
                  </div>
                </div>

                {/* Title & Body */}
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--color-text)' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                  {item.description}
                </p>

                {/* Category Pill */}
                <div style={{ marginBottom: '1rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: 'var(--color-surface-2)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                     Category: {item.category.replace('_', ' ')}
                  </span>
                </div>

                {/* Reply section */}
                {isResolved && item.adminReply ? (
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.875rem 1rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                         Official Institutional Reply
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {item.repliedAt}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.45 }}>
                      {item.adminReply}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setReplyTarget(item);
                        setReplyText('');
                      }}
                      className="btn btn--primary btn--sm"
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                       Direct Reply & Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply Modal */}
      {replyTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReplyTarget(null);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-float)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                 Post Institutional Reply
              </h3>
              <button
                onClick={() => setReplyTarget(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <strong style={{ display: 'block', color: 'var(--color-text)' }}>
                {replyTarget.title}
              </strong>
              <div style={{ color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                From: {replyTarget.senderName} ({replyTarget.senderRole}) • {replyTarget.senderEmail}
              </div>
            </div>

            <form onSubmit={handleSendReply}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Official Resolution Remarks (Sent to applicant portal & email)
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="e.g. IT Department has serviced the laboratory access point. Bandwidth increased to 1 Gbps."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                >
                  {submittingReply ? 'Dispatching...' : 'Dispatch Reply & Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
