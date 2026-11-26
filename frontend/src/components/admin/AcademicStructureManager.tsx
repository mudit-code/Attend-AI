import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Section {
  id: number;
  name: string;
  year: number;
  course: { name: string; code: string };
  isFaceAttendanceEnabled?: boolean;
}

interface Teacher {
  id: number;
  employeeCode: string;
  departmentId: number;
  user: { name: string; email: string };
}

interface SubjectAllocation {
  teacherId: number;
  sectionId: number;
  teacher: { id: number; user: { name: string } };
  section: { id: number; name: string };
}

interface Subject {
  id: number;
  name: string;
  code: string;
  teacherSubjects: SubjectAllocation[];
}

interface PromotionLog {
  id: number;
  promotedCount: number;
  promotedAt: string;
  sourceSection: { id: number; name: string; year: number; course?: { name: string; code: string } };
  targetSection: { id: number; name: string; year: number; course?: { name: string; code: string } };
  academicYear?: { id: number; name: string } | null;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

export default function AcademicStructureManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherDepartmentId, setTeacherDepartmentId] = useState<number | ''>('');

  const [allocationTeacherId, setAllocationTeacherId] = useState<number | ''>('');
  const [allocationSectionId, setAllocationSectionId] = useState<number | ''>('');
  const [allocationSubjectId, setAllocationSubjectId] = useState<number | ''>('');

  // Batch Promotion state
  const [promotionLogs, setPromotionLogs] = useState<PromotionLog[]>([]);
  const [sourceSectionId, setSourceSectionId] = useState<number | ''>('');
  const [targetSectionId, setTargetSectionId] = useState<number | ''>('');
  const [targetSemester, setTargetSemester] = useState<number>(2);
  const [archiveSource, setArchiveSource] = useState<boolean>(true);
  const [promoting, setPromoting] = useState<boolean>(false);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  async function loadPromotionLogs() {
    try {
      const res = await api.get('/academic/batch-promotion/logs');
      setPromotionLogs(res.data?.data || []);
    } catch {
      setPromotionLogs([]);
    }
  }

  async function handlePromoteBatch(e: FormEvent) {
    e.preventDefault();
    if (!sourceSectionId || !targetSectionId) {
      setPromotionError('Please select both source section and target section.');
      return;
    }
    if (sourceSectionId === targetSectionId) {
      setPromotionError('Source section and target section cannot be the same.');
      return;
    }
    const confirmMsg = `Are you sure you want to promote all students from the source section to the target section (Semester ${targetSemester})? Historical attendance and facial biometrics will be safely preserved.`;
    if (!window.confirm(confirmMsg)) return;

    setPromoting(true);
    setPromotionError(null);
    setPromotionMessage(null);

    try {
      const res = await api.post('/academic/batch-promotion', {
        sourceSectionId: Number(sourceSectionId),
        targetSectionId: Number(targetSectionId),
        newSemester: Number(targetSemester),
        archiveSource,
      });

      setPromotionMessage(res.data?.message || 'Batch promoted successfully with zero data loss!');
      await loadData();
      await loadPromotionLogs();
    } catch (err) {
      setPromotionError(getErrorMessage(err));
    } finally {
      setPromoting(false);
    }
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [departmentResponse, sectionResponse, subjectResponse, teacherResponse] = await Promise.all([
        api.get('/academic/departments'),
        api.get('/academic/sections'),
        api.get('/academic/subjects'),
        api.get('/users/teachers'),
      ]);
      const departmentData: Department[] = departmentResponse.data.data;
      const sectionData: Section[] = sectionResponse.data.data;
      const subjectData: Subject[] = subjectResponse.data.data;
      const teacherData: Teacher[] = teacherResponse.data.data;

      setDepartments(departmentData);
      setSections(sectionData);
      setSubjects(subjectData);
      setTeachers(teacherData);
      setTeacherDepartmentId((current) =>
        departmentData.some((department) => department.id === current)
          ? current
          : departmentData[0]?.id ?? ''
      );
      setAllocationTeacherId((current) =>
        teacherData.some((teacher) => teacher.id === current) ? current : teacherData[0]?.id ?? ''
      );
      setAllocationSectionId((current) =>
        sectionData.some((section) => section.id === current) ? current : sectionData[0]?.id ?? ''
      );
      setAllocationSubjectId((current) =>
        subjectData.some((subject) => subject.id === current) ? current : subjectData[0]?.id ?? ''
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDepartments([]);
      setSections([]);
      setSubjects([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    void loadPromotionLogs();
  }, []);

  async function createSubject(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/academic/subjects', {
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
      });
      setSubjectName('');
      setSubjectCode('');
      setMessage('Subject added to the database.');
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function createTeacher(event: FormEvent) {
    event.preventDefault();
    if (!teacherDepartmentId) {
      setError('Create a department before adding a teacher.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/users/teachers', {
        name: teacherName.trim(),
        email: teacherEmail.trim(),
        phone: teacherPhone.trim() || undefined,
        employeeCode: employeeCode.trim(),
        departmentId: teacherDepartmentId,
        password: teacherPassword,
      });
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPhone('');
      setEmployeeCode('');
      setTeacherPassword('');
      setMessage('Teacher account created. Share the temporary password with them securely.');
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function createAllocation(event: FormEvent) {
    event.preventDefault();
    if (!allocationTeacherId || !allocationSectionId || !allocationSubjectId) {
      setError('Add a teacher, section, and subject before creating an allocation.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/academic/teacher-subjects', {
        teacherId: allocationTeacherId,
        sectionId: allocationSectionId,
        subjectId: allocationSubjectId,
      });
      setMessage('Subject and section assigned to the teacher.');
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const allocations = subjects.flatMap((subject) =>
    subject.teacherSubjects.map((allocation) => ({
      id: `${allocation.teacherId}-${subject.id}-${allocation.sectionId}`,
      subject,
      allocation,
    }))
  );

  const toggleFace = async (sectionId: number, enable: boolean) => {
    try {
      await api.patch(`/academic/sections/${sectionId}/face-toggle`, {
        isFaceAttendanceEnabled: enable,
      });
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, isFaceAttendanceEnabled: enable } : s))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section>
      <header className="card" style={{ marginBottom: '1rem' }}>
        <h2>Teacher accounts and subject assignments</h2>
        <p className="text-sm text-muted">
          Records and choices on this page come from the database.
        </p>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => void loadData()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {error && <p className="assignment-error" role="alert">{error}</p>}
      {message && <p className="alert alert--success" role="status">{message}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <form className="card" onSubmit={createTeacher}>
          <h3>Create teacher account</h3>
          <label className="form-group">
            <span className="form-label">Name</span>
            <input className="input" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} minLength={2} required />
          </label>
          <label className="form-group">
            <span className="form-label">Email</span>
            <input className="input" type="email" value={teacherEmail} onChange={(event) => setTeacherEmail(event.target.value)} required />
          </label>
          <label className="form-group">
            <span className="form-label">Employee code</span>
            <input className="input" value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} minLength={2} required />
          </label>
          <label className="form-group">
            <span className="form-label">Department</span>
            <select
              className="input"
              value={teacherDepartmentId}
              onChange={(event) => setTeacherDepartmentId(event.target.value ? Number(event.target.value) : '')}
              required
              disabled={loading || departments.length === 0}
            >
              <option value="" disabled>Select a database department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name} ({department.code})</option>
              ))}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Temporary password</span>
            <input className="input" type="password" value={teacherPassword} onChange={(event) => setTeacherPassword(event.target.value)} minLength={8} required />
          </label>
          <label className="form-group">
            <span className="form-label">Phone (optional)</span>
            <input className="input" type="tel" value={teacherPhone} onChange={(event) => setTeacherPhone(event.target.value)} />
          </label>
          <button className="btn btn--primary" type="submit" disabled={saving || loading || departments.length === 0}>
            Create teacher
          </button>
        </form>

        <form className="card" onSubmit={createSubject}>
          <h3>Add subject</h3>
          <label className="form-group">
            <span className="form-label">Subject name</span>
            <input className="input" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} minLength={2} required />
          </label>
          <label className="form-group">
            <span className="form-label">Subject code</span>
            <input className="input" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} minLength={2} maxLength={15} required />
          </label>
          <button className="btn btn--primary" type="submit" disabled={saving || loading}>
            Add subject
          </button>
        </form>

        <form className="card" onSubmit={createAllocation}>
          <h3>Assign teacher to subject and section</h3>
          <label className="form-group">
            <span className="form-label">Teacher</span>
            <select className="input" value={allocationTeacherId} onChange={(event) => setAllocationTeacherId(event.target.value ? Number(event.target.value) : '')} required disabled={loading || teachers.length === 0}>
              <option value="" disabled>Select a teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.user.name} ({teacher.employeeCode})</option>
              ))}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Subject</span>
            <select className="input" value={allocationSubjectId} onChange={(event) => setAllocationSubjectId(event.target.value ? Number(event.target.value) : '')} required disabled={loading || subjects.length === 0}>
              <option value="" disabled>Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name} ({subject.code})</option>
              ))}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Section</span>
            <select className="input" value={allocationSectionId} onChange={(event) => setAllocationSectionId(event.target.value ? Number(event.target.value) : '')} required disabled={loading || sections.length === 0}>
              <option value="" disabled>Select a section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} · {section.course.name} ({section.course.code})
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn--primary" type="submit" disabled={saving || loading || !teachers.length || !subjects.length || !sections.length}>
            Save assignment
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Current teacher subject assignments</h3>
        {loading ? (
          <p className="text-sm text-muted">Loading assignments…</p>
        ) : allocations.length === 0 ? (
          <p className="text-sm text-muted">No teacher subject assignments are configured.</p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Subject</th>
                  <th>Section</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(({ id, subject, allocation }) => (
                  <tr key={id}>
                    <td>{allocation.teacher.user.name}</td>
                    <td>{subject.name} ({subject.code})</td>
                    <td>{allocation.section.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Class-wise Face Attendance Governance</h3>
          <span className="text-xs text-muted">Admin toggle for AI Face Attendance per section</span>
        </div>
        {loading ? (
          <p className="text-sm text-muted">Loading classes…</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-muted">No sections configured.</p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <tr key={sec.id}>
                    <td style={{ fontWeight: 600 }}>{sec.name}</td>
                    <td>{sec.course.name} ({sec.course.code})</td>
                    <td>Year {sec.year}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                        background: sec.isFaceAttendanceEnabled !== false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: sec.isFaceAttendanceEnabled !== false ? '#10B981' : '#EF4444'
                      }}>
                        {sec.isFaceAttendanceEnabled !== false ? '🟢 Active' : '🔴 Disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn--sm ${sec.isFaceAttendanceEnabled !== false ? 'btn--ghost' : 'btn--primary'}`}
                        onClick={() => toggleFace(sec.id, sec.isFaceAttendanceEnabled === false)}
                      >
                        {sec.isFaceAttendanceEnabled !== false ? 'Disable Face AI' : 'Enable Face AI'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── BATCH PROMOTION & SEMESTER ROLL-OVER (Zero Re-registration Engine) ── */}
      <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎓</span> Semester Roll-Over & Batch Promotion Engine
            </h3>
            <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>
              Promote an entire section to the next semester in 1-click without students re-registering. Biometric face embeddings, credentials, roll numbers, and historical attendance logs are automatically preserved.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '999px', fontWeight: 700 }}>
            Zero-Data-Loss Guaranteed
          </span>
        </div>

        {promotionError && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.875rem' }}>
            ⚠️ {promotionError}
          </div>
        )}

        {promotionMessage && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.875rem' }}>
            ✅ {promotionMessage}
          </div>
        )}

        <form onSubmit={handlePromoteBatch} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>Source Section (Current Semester)</span>
              <select
                className="input"
                value={sourceSectionId}
                onChange={(e) => setSourceSectionId(e.target.value ? Number(e.target.value) : '')}
                required
                disabled={loading || sections.length === 0}
              >
                <option value="" disabled>Select current section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} · {sec.course?.code || ''} (Year {sec.year})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600, color: '#10b981' }}>Target Section (Next Semester)</span>
              <select
                className="input"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value ? Number(e.target.value) : '')}
                required
                disabled={loading || sections.length === 0}
              >
                <option value="" disabled>Select target section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} · {sec.course?.code || ''} (Year {sec.year})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label" style={{ fontWeight: 600 }}>New Semester Number</span>
              <input
                type="number"
                className="input"
                min={1}
                max={10}
                value={targetSemester}
                onChange={(e) => setTargetSemester(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={archiveSource}
                onChange={(e) => setArchiveSource(e.target.checked)}
              />
              <span>Archive source section after promotion (prevent new attendance marking in old semester)</span>
            </label>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={promoting || loading || !sourceSectionId || !targetSectionId}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
            >
              {promoting ? 'Promoting Batch...' : '🚀 Execute Batch Promotion'}
            </button>
          </div>
        </form>

        {/* Promotion History Logs */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>Recent Batch Promotion Audit Logs</h4>
          {promotionLogs.length === 0 ? (
            <p className="text-xs text-muted">No semester promotions logged yet.</p>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.5rem' }}>Date & Time</th>
                    <th style={{ padding: '0.5rem' }}>Source Section</th>
                    <th style={{ padding: '0.5rem' }}>Target Section</th>
                    <th style={{ padding: '0.5rem' }}>Students Promoted</th>
                    <th style={{ padding: '0.5rem' }}>Academic Year</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>{new Date(log.promotedAt).toLocaleString()}</td>
                      <td style={{ padding: '0.5rem' }}>{log.sourceSection?.name} (Year {log.sourceSection?.year})</td>
                      <td style={{ padding: '0.5rem', color: '#10b981', fontWeight: 600 }}>{log.targetSection?.name} (Year {log.targetSection?.year})</td>
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>{log.promotedCount} students</td>
                      <td style={{ padding: '0.5rem' }}>{log.academicYear?.name || 'Current'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
