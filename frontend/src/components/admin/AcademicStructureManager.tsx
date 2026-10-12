import { useState } from 'react';

interface AllocationItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  department: string;
  facultyName: string;
  facultyId: string;
  section: string;
  credits: number;
  enrolledStudents: number;
}

const DEFAULT_ALLOCATIONS: AllocationItem[] = [
  {
    id: 'alloc-1',
    subjectCode: 'KCS-601',
    subjectName: 'Cloud Computing',
    department: 'CSE',
    facultyName: 'Prof. Rajesh Sharma',
    facultyId: 'EMP-KIT-104',
    section: 'CSE-3A',
    credits: 4,
    enrolledStudents: 58,
  },
  {
    id: 'alloc-2',
    subjectCode: 'KCS-602',
    subjectName: 'Compiler Design',
    department: 'CSE',
    facultyName: 'Dr. Sunita Verma',
    facultyId: 'EMP-KIT-109',
    section: 'CSE-3A',
    credits: 4,
    enrolledStudents: 58,
  },
  {
    id: 'alloc-3',
    subjectCode: 'KIT-CS31',
    subjectName: 'Web Technology',
    department: 'IT',
    facultyName: 'Er. Vivek Kumar',
    facultyId: 'EMP-KIT-118',
    section: 'CSE-3A',
    credits: 3,
    enrolledStudents: 62,
  },
  {
    id: 'alloc-4',
    subjectCode: 'KCS-603',
    subjectName: 'Software Engineering',
    department: 'CSE',
    facultyName: 'Prof. Amit Srivastava',
    facultyId: 'EMP-KIT-112',
    section: 'CSE-3B',
    credits: 4,
    enrolledStudents: 55,
  },
];

export default function AcademicStructureManager() {
  const [allocations, setAllocations] = useState<AllocationItem[]>(DEFAULT_ALLOCATIONS);

  // New Subject form state
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [credits, setCredits] = useState('4');

  // Allocation form state
  const [allocSubject, setAllocSubject] = useState('KCS-601');
  const [allocFaculty, setAllocFaculty] = useState('Prof. Rajesh Sharma');
  const [allocSection, setAllocSection] = useState('CSE-3B');

  const [toast, setToast] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim()) {
      alert('Please fill in Subject Name and Code');
      return;
    }

    triggerToast(`Subject ${subjectCode} (${subjectName}) registered into Academic Master!`);
    setSubjectName('');
    setSubjectCode('');
  }

  function handleCreateAllocation(e: React.FormEvent) {
    e.preventDefault();
    const newAlloc: AllocationItem = {
      id: 'alloc-' + Date.now(),
      subjectCode: allocSubject,
      subjectName:
        allocSubject === 'KCS-601'
          ? 'Cloud Computing'
          : allocSubject === 'KCS-602'
          ? 'Compiler Design'
          : allocSubject === 'KIT-CS31'
          ? 'Web Technology'
          : 'Software Engineering',
      department: 'CSE',
      facultyName: allocFaculty,
      facultyId: 'EMP-KIT-' + Math.floor(100 + Math.random() * 90),
      section: allocSection,
      credits: 4,
      enrolledStudents: 60,
    };

    setAllocations((prev) => [newAlloc, ...prev]);
    triggerToast(`Successfully assigned ${allocSubject} to ${allocFaculty} for ${allocSection}!`);
  }

  function handleRemoveAllocation(id: string) {
    if (confirm('Are you sure you want to unassign this course from faculty?')) {
      setAllocations((prev) => prev.filter((a) => a.id !== id));
      triggerToast('Allocation unassigned successfully.');
    }
  }

  return (
    <div>
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
            📚 Faculty Subject Allocation & Academic Desk
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Map semester courses, credit weights, and teaching loads to authorized faculty members & student sections
          </p>
        </div>

        <span
          className="badge"
          style={{
            background: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
            fontWeight: 700,
            padding: '0.35rem 0.75rem',
            fontSize: '0.82rem',
          }}
        >
          {allocations.length} Active Teaching Allocations
        </span>
      </div>

      {toast && (
        <div
          style={{
            background: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Two Column Layout for Creation & Allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Form 1: Add Course */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>➕</span> Register New Curriculum Subject
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Define AKTU subject codes, syllabus syllabus unit credits, and department affiliation
          </p>

          <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Subject Name
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Operating Systems"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Subject Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. KCS-702"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    background: 'var(--color-surface)',
                  }}
                >
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="IT">Information Tech (IT)</option>
                  <option value="ECE">Electronics (ECE)</option>
                  <option value="ME">Mechanical (ME)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Academic Credits
              </label>
              <select
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="4">4 Credits (Lecture + Tutorial)</option>
                <option value="3">3 Credits (Theory Lecture)</option>
                <option value="2">2 Credits (Lab / Practical)</option>
                <option value="1">1 Credit (Seminar / Mini Project)</option>
              </select>
            </div>

            <button type="submit" className="btn btn--secondary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Save Subject to Catalog
            </button>
          </form>
        </div>

        {/* Form 2: Assign Faculty */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🔗</span> Allocate Subject to Faculty & Section
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Assign teacher ownership for live attendance marking & AKTU marks entry
          </p>

          <form onSubmit={handleCreateAllocation} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Select Subject
              </label>
              <select
                value={allocSubject}
                onChange={(e) => setAllocSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="KCS-601">Cloud Computing (KCS-601)</option>
                <option value="KCS-602">Compiler Design (KCS-602)</option>
                <option value="KIT-CS31">Web Technology (KIT-CS31)</option>
                <option value="KCS-603">Software Engineering (KCS-603)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Assign Faculty Member
              </label>
              <select
                value={allocFaculty}
                onChange={(e) => setAllocFaculty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="Prof. Rajesh Sharma">Prof. Rajesh Sharma (EMP-KIT-104)</option>
                <option value="Dr. Sunita Verma">Dr. Sunita Verma (EMP-KIT-109)</option>
                <option value="Er. Vivek Kumar">Er. Vivek Kumar (EMP-KIT-118)</option>
                <option value="Prof. Amit Srivastava">Prof. Amit Srivastava (EMP-KIT-112)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Student Section Roster
              </label>
              <select
                value={allocSection}
                onChange={(e) => setAllocSection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="CSE-3A">Section CSE-3A (6th Sem)</option>
                <option value="CSE-3B">Section CSE-3B (6th Sem)</option>
                <option value="IT-2A">Section IT-2A (4th Sem)</option>
                <option value="ECE-4A">Section ECE-4A (8th Sem)</option>
              </select>
            </div>

            <button type="submit" className="btn btn--primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Allocate Subject & Section
            </button>
          </form>
        </div>
      </div>

      {/* Allocation Directory Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.95rem' }}>Active Faculty Subject Assignments</strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {allocations.length} total mapped courses
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Subject Code & Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Assigned Faculty</th>
                <th style={{ padding: '0.75rem 1rem' }}>Target Section</th>
                <th style={{ padding: '0.75rem 1rem' }}>Credits</th>
                <th style={{ padding: '0.75rem 1rem' }}>Enrolled Students</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <strong style={{ display: 'block', color: 'var(--color-text)' }}>{a.subjectName}</strong>
                    <span style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>
                      Code: {a.subjectCode} • Dept: {a.department}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{a.facultyName}</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{a.facultyId}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      className="badge"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-primary)', fontWeight: 700 }}
                    >
                      {a.section}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{a.credits} Credits</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{a.enrolledStudents} Students</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleRemoveAllocation(a.id)}
                      className="btn btn--ghost btn--sm"
                      style={{ color: 'var(--color-danger)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      Unassign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
