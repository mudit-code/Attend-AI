import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface Section {
  id: number;
  name: string;
  year: number;
  course: { name: string; code: string };
  department?: { id: number; name: string; code: string };
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Teacher {
  id: number;
  employeeCode: string;
  departmentId: number;
  user: { name: string; email: string };
}

interface ClassAdjustment {
  id: number;
  date: string;
  period: number;
  sectionId: number;
  subjectId: number;
  originalTeacherId: number;
  substituteTeacherId: number;
  status: string;
  reason?: string | null;
  assignedBy?: number | null;
  section: {
    id: number;
    name: string;
    course: { name: string; code: string };
  };
  subject: {
    id: number;
    name: string;
    code: string;
  };
  originalTeacher: {
    id: number;
    user: { name: string; email: string };
  };
  substituteTeacher: {
    id: number;
    user: { name: string; email: string };
  };
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return error instanceof Error ? error.message : 'Action failed. Please try again.';
}

export default function FacultyAdjustmentHODDesk() {
  const [adjustments, setAdjustments] = useState<ClassAdjustment[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState(1);
  const [sectionId, setSectionId] = useState<number | ''>('');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [originalTeacherId, setOriginalTeacherId] = useState<number | ''>('');
  const [substituteTeacherId, setSubstituteTeacherId] = useState<number | ''>('');
  const [reason, setReason] = useState('Medical Leave / On Duty');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [adjRes, secRes, subRes, teachRes] = await Promise.all([
        api.get('/academic/adjustments/department'),
        api.get('/academic/sections'),
        api.get('/academic/subjects'),
        api.get('/users/teachers'),
      ]);

      const adjData: ClassAdjustment[] = adjRes.data?.data || [];
      const secData: Section[] = secRes.data?.data || [];
      const subData: Subject[] = subRes.data?.data || [];
      const teachData: Teacher[] = teachRes.data?.data || [];

      setAdjustments(adjData);
      setSections(secData);
      setSubjects(subData);
      setTeachers(teachData);

      if (secData[0]) setSectionId(secData[0].id);
      if (subData[0]) setSubjectId(subData[0].id);
      if (teachData[0]) setOriginalTeacherId(teachData[0].id);
      if (teachData[1]) setSubstituteTeacherId(teachData[1].id);
      else if (teachData[0]) setSubstituteTeacherId(teachData[0].id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdjustment(e: FormEvent) {
    e.preventDefault();
    if (!sectionId || !subjectId || !originalTeacherId || !substituteTeacherId) {
      setError('Please select section, subject, absent faculty, and substitute faculty.');
      return;
    }
    if (originalTeacherId === substituteTeacherId) {
      setError('Absent faculty and substitute faculty cannot be the same person.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.post('/academic/adjustments', {
        date,
        period: Number(period),
        sectionId: Number(sectionId),
        subjectId: Number(subjectId),
        originalTeacherId: Number(originalTeacherId),
        substituteTeacherId: Number(substituteTeacherId),
        reason,
      });

      setSuccessMessage('Proxy faculty adjustment assigned successfully!');
      // Refresh list
      const updatedAdj = await api.get('/academic/adjustments/department');
      setAdjustments(updatedAdj.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAdjustment(id: number) {
    if (!window.confirm('Are you sure you want to cancel this proxy adjustment?')) return;
    try {
      await api.delete(`/academic/adjustments/${id}`);
      setAdjustments((prev) => prev.filter((a) => a.id !== id));
      setSuccessMessage('Adjustment cancelled successfully.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header card */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-primary, #6366f1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔄</span> Faculty Substitution & Proxy Lecture Desk
            </h2>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              HOD / Dean portal to assign substitute faculty when regular teachers are absent. The substitute is instantly authorized for Manual, QR, and AI Face roll calls.
            </p>
          </div>
          <button className="btn btn--sm btn--ghost" onClick={loadAll} disabled={loading}>
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.875rem' }}>
            ✅ {successMessage}
          </div>
        )}
      </div>

      {/* Assignment Form Card */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem 0' }}>Assign Substitute Faculty (Proxy Lecture)</h3>
        <form onSubmit={handleCreateAdjustment} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>Lecture Date</span>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>Period</span>
              <select
                className="input"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>Section / Class</span>
              <select
                className="input"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="" disabled>Select section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} · {sec.course?.code || 'Course'} (Year {sec.year})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>Subject</span>
              <select
                className="input"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="" disabled>Select subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600, color: '#ef4444' }}>
                ❌ Absent Regular Faculty
              </span>
              <select
                className="input"
                value={originalTeacherId}
                onChange={(e) => setOriginalTeacherId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="" disabled>Select absent teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name} ({t.employeeCode || t.user.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600, color: '#10b981' }}>
                ✅ Appointed Substitute Faculty
              </span>
              <select
                className="input"
                value={substituteTeacherId}
                onChange={(e) => setSubstituteTeacherId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="" disabled>Select substitute teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name} ({t.employeeCode || t.user.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>Reason / Note</span>
              <input
                type="text"
                className="input"
                placeholder="e.g. Medical leave, emergency, official duty"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || loading}
              style={{ minWidth: '180px' }}
            >
              {submitting ? 'Assigning...' : '⚡ Assign Proxy Lecture'}
            </button>
          </div>
        </form>
      </div>

      {/* Adjustments Table */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem 0' }}>Active & Scheduled Proxy Adjustments</h3>
        {loading ? (
          <p className="text-sm text-muted">Loading proxy adjustments...</p>
        ) : adjustments.length === 0 ? (
          <p className="text-sm text-muted">No faculty adjustments scheduled.</p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date & Period</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Class & Subject</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Absent Faculty</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Substitute Faculty</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Reason</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => {
                  const dateStr = new Date(adj.date).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <tr key={adj.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{dateStr}</div>
                        <span style={{ fontSize: '0.75rem', background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                          Period {adj.period}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{adj.section?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {adj.subject?.name} ({adj.subject?.code})
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                          {adj.originalTeacher?.user?.name || `Teacher #${adj.originalTeacherId}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          {adj.substituteTeacher?.user?.name || `Teacher #${adj.substituteTeacherId}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)' }}>
                        {adj.reason || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: adj.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: adj.status === 'APPROVED' ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {adj.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteAdjustment(adj.id)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
