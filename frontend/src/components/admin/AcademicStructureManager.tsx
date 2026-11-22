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
    </section>
  );
}
