import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface StudentSubmission {
  id: string;
  driveUrl: string;
  status: 'SUBMITTED' | 'GRADED' | 'SIGNED_OFF';
  marks: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  signedOffAt: string | null;
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

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'No deadline';
}

function StudentAssignmentCard({
  assignment,
  onSubmitted,
}: {
  assignment: StudentAssignment;
  onSubmitted: () => void;
}) {
  const submission = assignment.submissions[0];
  const [driveUrl, setDriveUrl] = useState(submission?.driveUrl ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignedOff = submission?.status === 'SIGNED_OFF';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/assignments/${assignment.id}/submission`, { driveUrl });
      onSubmitted();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="card assignment-card">
      <header className="assignment-card__header">
        <div>
          <p className="eyebrow">{assignment.subject.code} · {assignment.subject.name}</p>
          <h3>{assignment.title}</h3>
        </div>
        <span className="badge">{assignment.maxMarks} marks</span>
      </header>
      <p className="assignment-card__description">{assignment.description}</p>
      <div className="assignment-card__meta">
        <span>Teacher: {assignment.teacher.user.name}</span>
        <span>Due {formatDate(assignment.dueAt)}</span>
      </div>

      {submission ? (
        <div className="assignment-result">
          <div className="assignment-result__header">
            <strong>
              {submission.status === 'SIGNED_OFF' ? 'Final result' : submission.status === 'GRADED' ? 'Grade published' : 'Submitted for review'}
            </strong>
            <span className={`assignment-status assignment-status--${submission.status.toLowerCase()}`}>
              {submission.status === 'SUBMITTED' ? 'Awaiting review' : submission.status === 'GRADED' ? 'Graded' : 'Signed off'}
            </span>
          </div>
          <a className="assignment-file-link" href={submission.driveUrl} target="_blank" rel="noopener noreferrer">
            View submitted PDF
          </a>
          {submission.marks !== null && (
            <p className="assignment-score">{submission.marks} <span>/ {assignment.maxMarks}</span></p>
          )}
          {submission.feedback && <p className="assignment-feedback">{submission.feedback}</p>}
          {submission.signedOffAt && (
            <p className="text-sm text-muted">Finalized {formatDate(submission.signedOffAt)}</p>
          )}
        </div>
      ) : null}

      {!isSignedOff && (
        <form className="assignment-submit-form" onSubmit={submit}>
          <label className="form-group">
            <span className="form-label">{submission ? 'Replace submission' : 'Google Drive PDF link'}</span>
            <input
              className="input"
              type="url"
              inputMode="url"
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(event) => setDriveUrl(event.target.value)}
              required
            />
          </label>
          <div className="assignment-form-footer">
            <span className="text-sm text-muted">The file must be a public PDF (“Anyone with the link”).</span>
            <button className="btn btn--primary" type="submit" disabled={submitting}>
              {submitting ? 'Checking file…' : submission ? 'Update submission' : 'Submit assignment'}
            </button>
          </div>
          {error && <p className="assignment-error" role="alert">{error}</p>}
        </form>
      )}
    </article>
  );
}

export default function StudentAssignmentsTab() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAssignments() {
    try {
      const { data } = await api.get('/assignments/mine');
      setAssignments(data.data);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.get('/assignments/mine')
      .then(({ data }) => {
        if (active) {
          setAssignments(data.data);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function refreshAssignments() {
    setLoading(true);
    void loadAssignments();
  }

  return (
    <section className="assignments-page">
      <header className="assignments-page__header">
        <div>
          <p className="eyebrow">Coursework</p>
          <h2>My assignments</h2>
          <p>Submit a public Google Drive PDF and check grades and teacher feedback here.</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button" onClick={refreshAssignments} disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <p className="assignment-error" role="alert">{error}</p>}
      {loading ? (
        <div className="card assignment-empty">Loading assignments…</div>
      ) : assignments.length === 0 ? (
        <div className="card assignment-empty">There are no assignments for your section yet.</div>
      ) : (
        <div className="assignment-list">
          {assignments.map((assignment) => (
            <StudentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onSubmitted={() => void loadAssignments()}
            />
          ))}
        </div>
      )}
    </section>
  );
}
