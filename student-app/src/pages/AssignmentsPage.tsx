import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FileText, ExternalLink, Send, CheckCircle, Clock, AlertCircle, Award } from 'lucide-react';

interface StudentSubmission {
  id: string;
  driveUrl: string;
  status: 'SUBMITTED' | 'GRADED' | 'SIGNED_OFF';
  marks: number | null;
  feedback: string | null;
  submittedAt: string;
}

interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  maxMarks: number;
  dueAt: string | null;
  createdAt: string;
  subject: { name: string; code: string };
  teacher: { user: { name: string } };
  submissions: StudentSubmission[];
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission state
  const [activeAssignment, setActiveAssignment] = useState<StudentAssignment | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/assignments/student');
      setAssignments(res.data.data || []);
    } catch (err: any) {
      setError('Could not load course assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const openSubmitModal = (asg: StudentAssignment) => {
    setActiveAssignment(asg);
    setDriveUrl(asg.submissions[0]?.driveUrl || '');
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;
    if (!driveUrl.trim()) {
      setSubmitError('Please provide a valid Google Drive link.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/assignments/${activeAssignment.id}/submit`, {
        driveUrl: driveUrl.trim(),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setActiveAssignment(null);
        loadAssignments();
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Submission failed. Please check the URL.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: '90px' }}>
      {/* Title */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={22} color="var(--color-accent)" />
          <span>Assignments & Submissions</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
          Submit Google Drive PDF links and track marks
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          Loading your assignments...
        </div>
      ) : error ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-danger-light)',
          color: 'var(--color-danger-text)',
          border: '1px solid #FECACA',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : assignments.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          color: 'var(--color-text-muted)'
        }}>
          <FileText size={40} style={{ opacity: 0.3, margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>No pending assignments</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Great job! You are all caught up.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {assignments.map((asg) => {
            const submission = asg.submissions?.[0];
            const isSubmitted = !!submission;
            const isGraded = submission?.status === 'GRADED' || submission?.status === 'SIGNED_OFF';

            return (
              <div
                key={asg.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  padding: '18px',
                  boxShadow: 'var(--shadow-card)'
                }}
              >
                {/* Header: Subject & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-accent-text)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {asg.subject?.name} {asg.subject?.code ? `(${asg.subject.code})` : ''}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-pill)',
                    background: isGraded ? 'var(--color-success-light)' : isSubmitted ? '#EFF6FF' : 'var(--color-warning-light)',
                    color: isGraded ? 'var(--color-success-text)' : isSubmitted ? '#1E40AF' : 'var(--color-warning-text)',
                    border: `1px solid ${isGraded ? '#A7F3D0' : isSubmitted ? '#BFDBFE' : '#FDE68A'}`
                  }}>
                    {isGraded ? 'GRADED' : isSubmitted ? 'SUBMITTED' : 'PENDING'}
                  </span>
                </div>

                {/* Assignment Title */}
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '6px' }}>
                  {asg.title}
                </h3>

                {/* Description */}
                {asg.description && (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
                    {asg.description}
                  </p>
                )}

                {/* Faculty & Max Marks */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-text-faint)', marginBottom: '14px', fontWeight: 600 }}>
                  <span>Max Score: <strong style={{ color: 'var(--color-primary)' }}>{asg.maxMarks}</strong></span>
                  {asg.dueAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>Due: {new Date(asg.dueAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Graded Feedback if any */}
                {isGraded && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-light)',
                    border: '1px solid #A7F3D0',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={16} color="var(--color-success)" />
                      <span style={{ fontSize: '12px', color: 'var(--color-success-text)', fontWeight: 600 }}>
                        Evaluated by {asg.teacher?.user?.name || 'Faculty'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--color-success-text)' }}>
                      {submission.marks} / {asg.maxMarks}
                    </div>
                  </div>
                )}

                {/* Actions: View Link & Submit/Resubmit button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {submission?.driveUrl && (
                    <a
                      href={submission.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: '700',
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>View PDF</span>
                    </a>
                  )}

                  <button
                    onClick={() => openSubmitModal(asg)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      borderRadius: 'var(--radius-pill)',
                      background: isSubmitted ? 'var(--color-surface-hover)' : 'var(--color-primary)',
                      color: isSubmitted ? 'var(--color-primary)' : '#FFFFFF',
                      border: isSubmitted ? '1px solid var(--color-border)' : 'none',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: isSubmitted ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.2)'
                    }}
                  >
                    <Send size={13} />
                    <span>{isSubmitted ? 'Update Submission' : 'Submit Assignment'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {activeAssignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: '24px 20px',
            boxShadow: 'var(--shadow-float)'
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '4px' }}>
              Submit: {activeAssignment.title}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Paste your shared Google Drive PDF link. Ensure link access is set to <em>"Anyone with the link can view"</em>.
            </p>

            {submitError && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-danger-light)',
                border: '1px solid #FECACA',
                color: 'var(--color-danger-text)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '12px'
              }}>
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-success-light)',
                border: '1px solid #A7F3D0',
                color: 'var(--color-success-text)',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle size={16} />
                <span>Assignment submitted successfully!</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '5px' }}>
                  Google Drive PDF Link *
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F8FAFC',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveAssignment(null)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || submitSuccess}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Verifying Link...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
