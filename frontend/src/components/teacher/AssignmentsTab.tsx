import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface TeachingClass {
  sectionId: number;
  sectionName: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
}

interface AssignmentSubmission {
  id: string;
  driveUrl: string;
  status: 'SUBMITTED' | 'GRADED' | 'SIGNED_OFF';
  marks: number | null;
  feedback: string | null;
  student: { rollNo: string; user: { name: string } };
}

interface AssignmentRecord {
  id: string;
  title: string;
  description: string;
  maxMarks: number;
  dueAt: string | null;
  createdAt: string;
  section: { id: number; name: string };
  subject: { id: number; name: string; code: string };
  submissions: AssignmentSubmission[];
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

function SubmissionReview({
  submission,
  maxMarks,
  onUpdated,
}: {
  submission: AssignmentSubmission;
  maxMarks: number;
  onUpdated: () => void;
}) {
  const [marks, setMarks] = useState(submission.marks?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveGrade(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/assignments/submissions/${submission.id}/review`, {
        marks: Number(marks),
        feedback,
      });
      onUpdated();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function signOff() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/assignments/submissions/${submission.id}/sign-off`);
      onUpdated();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const isSignedOff = submission.status === 'SIGNED_OFF';

  return (
    <article className="assignment-submission">
      <div className="assignment-submission__header">
        <div>
          <strong>{submission.student.user.name}</strong>
          <span className="text-sm text-muted">Roll no. {submission.student.rollNo}</span>
        </div>
        <span className={`assignment-status assignment-status--${submission.status.toLowerCase()}`}>
          {submission.status === 'SUBMITTED' ? 'Awaiting review' : submission.status === 'GRADED' ? 'Graded' : 'Signed off'}
        </span>
      </div>

      <a className="assignment-file-link" href={submission.driveUrl} target="_blank" rel="noopener noreferrer">
        Open submitted PDF
      </a>

      <form className="assignment-review-form" onSubmit={saveGrade}>
        <label className="form-group">
          <span className="form-label">Marks (out of {maxMarks})</span>
          <input
            className="input"
            type="number"
            min="0"
            max={maxMarks}
            step="0.5"
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            required
            disabled={isSignedOff || saving}
          />
        </label>
        <label className="form-group assignment-review-form__feedback">
          <span className="form-label">Feedback</span>
          <textarea
            className="input assignment-textarea"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            maxLength={2000}
            disabled={isSignedOff || saving}
          />
        </label>
        {!isSignedOff && (
          <div className="assignment-review-form__actions">
            <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save grade'}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={signOff}
              disabled={saving || submission.status !== 'GRADED'}
            >
              Sign off
            </button>
          </div>
        )}
      </form>
      {error && <p className="assignment-error" role="alert">{error}</p>}
    </article>
  );
}

export default function AssignmentsTab({
  classes,
  classesError,
  classesLoading,
}: {
  classes: TeachingClass[];
  classesError: string | null;
  classesLoading: boolean;
}) {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [dueAt, setDueAt] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const selectedClassValue = selectedClass || (classes[0] ? `${classes[0].sectionId}:${classes[0].subjectId}` : '');

  async function loadAssignments() {
    try {
      const { data } = await api.get('/assignments/teacher');
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
    api.get('/assignments/teacher')
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

  async function createAssignment(event: FormEvent) {
    event.preventDefault();
    const [sectionId, subjectId] = selectedClassValue.split(':').map(Number);
    setSaving(true);
    setError(null);
    try {
      await api.post('/assignments', {
        title,
        description,
        sectionId,
        subjectId,
        maxMarks: Number(maxMarks),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      setTitle('');
      setDescription('');
      setDueAt('');
      await loadAssignments();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="assignments-page">
      <header className="assignments-page__header">
        <div>
          <p className="eyebrow">Coursework</p>
          <h2>Assignments</h2>
          <p>Create coursework, review PDF submissions, and publish final marks.</p>
        </div>
        <button className="btn btn--ghost btn--sm" type="button" onClick={refreshAssignments} disabled={loading}>
          Refresh
        </button>
      </header>

      <form className="card assignment-create-form" onSubmit={createAssignment}>
        <div className="assignment-section-heading">
          <div>
            <h3>Create an assignment</h3>
            <p className="text-sm text-muted">Students submit a publicly accessible Google Drive PDF.</p>
          </div>
        </div>
        {classesLoading ? (
          <p className="assignment-empty">Loading your assigned classes…</p>
        ) : classes.length === 0 ? (
          <p className={classesError ? 'assignment-error' : 'assignment-empty'} role={classesError ? 'alert' : undefined}>
            {classesError || 'No subjects or sections are assigned to your teacher account. Ask an administrator to allocate them.'}
          </p>
        ) : (
          <>
            <div className="assignment-form-grid">
              <label className="form-group assignment-form-grid__wide">
                <span className="form-label">Title</span>
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={120} required />
              </label>
              <label className="form-group">
                <span className="form-label">Class and subject</span>
                <select className="input" value={selectedClassValue} onChange={(event) => setSelectedClass(event.target.value)} required>
                  {classes.map((item) => (
                    <option key={`${item.sectionId}:${item.subjectId}`} value={`${item.sectionId}:${item.subjectId}`}>
                      {item.sectionName} · {item.subjectName} ({item.subjectCode})
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Maximum marks</span>
                <input className="input" type="number" min="0.5" max="1000" step="0.5" value={maxMarks} onChange={(event) => setMaxMarks(event.target.value)} required />
              </label>
              <label className="form-group">
                <span className="form-label">Due date (optional)</span>
                <input className="input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
              <label className="form-group assignment-form-grid__wide">
                <span className="form-label">Instructions</span>
                <textarea className="input assignment-textarea" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} required />
              </label>
            </div>
            <div className="assignment-form-footer">
              <span className="text-sm text-muted">Only classes assigned to you can be selected.</span>
              <button className="btn btn--primary" type="submit" disabled={saving || !selectedClassValue}>
                {saving ? 'Publishing…' : 'Publish assignment'}
              </button>
            </div>
          </>
        )}
        {error && <p className="assignment-error" role="alert">{error}</p>}
      </form>

      <div className="assignment-list">
        <div className="assignment-section-heading">
          <div>
            <h3>Published assignments</h3>
            <p className="text-sm text-muted">Review submitted files and finalize grades.</p>
          </div>
          <span className="badge">{assignments.length} total</span>
        </div>

        {loading ? (
          <div className="card assignment-empty">Loading assignments…</div>
        ) : assignments.length === 0 ? (
          <div className="card assignment-empty">No assignments have been published yet.</div>
        ) : (
          assignments.map((assignment) => (
            <article key={assignment.id} className="card assignment-card">
              <header className="assignment-card__header">
                <div>
                  <p className="eyebrow">{assignment.section.name} · {assignment.subject.code}</p>
                  <h3>{assignment.title}</h3>
                </div>
                <span className="badge">{assignment.maxMarks} marks</span>
              </header>
              <p className="assignment-card__description">{assignment.description}</p>
              <div className="assignment-card__meta">
                <span>{assignment.subject.name}</span>
                <span>Due {formatDate(assignment.dueAt)}</span>
                <span>{assignment.submissions.length} submission{assignment.submissions.length === 1 ? '' : 's'}</span>
              </div>
              <div className="assignment-submissions">
                {assignment.submissions.length === 0 ? (
                  <p className="assignment-empty">No submissions yet.</p>
                ) : (
                  assignment.submissions.map((submission) => (
                    <SubmissionReview
                      key={submission.id}
                      submission={submission}
                      maxMarks={assignment.maxMarks}
                      onUpdated={() => void loadAssignments()}
                    />
                  ))
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
