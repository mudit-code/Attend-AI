interface StudentMarksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  rollNo?: string;
}

export default function StudentMarksheetModal({
  isOpen,
  onClose,
  studentName = 'Aman Kumar',
  rollNo = '2101640100015',
}: StudentMarksheetModalProps) {
  if (!isOpen) return null;

  const marksData = [
    { code: 'KCS-601', title: 'Cloud Computing', credits: 4, internal: 42, external: 84, total: 126, max: 150, grade: 'A' },
    { code: 'KCS-602', title: 'Compiler Design', credits: 4, internal: 38, external: 79, total: 117, max: 150, grade: 'B+' },
    { code: 'KIT-CS31', title: 'Web Technology', credits: 3, internal: 45, external: 88, total: 133, max: 150, grade: 'A+' },
    { code: 'KCS-603', title: 'Software Engineering', credits: 4, internal: 40, external: 81, total: 121, max: 150, grade: 'A' },
    { code: 'KCS-651', title: 'Cloud Computing Lab', credits: 1, internal: 24, external: 23, total: 47, max: 50, grade: 'O' },
    { code: 'KCS-652', title: 'Compiler Design Lab', credits: 1, internal: 22, external: 22, total: 44, max: 50, grade: 'A+' },
  ];

  const totalCredits = marksData.reduce((acc, m) => acc + m.credits, 0);
  const totalMarks = marksData.reduce((acc, m) => acc + m.total, 0);
  const maxMarks = marksData.reduce((acc, m) => acc + m.max, 0);
  const percentage = ((totalMarks / maxMarks) * 100).toFixed(1);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card modal-responsive"
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-float)',
          padding: 'clamp(1rem, 2.5vw, 1.75rem)',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Institutional Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--color-border-strong)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '1px' }}>
            DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY, UTTAR PRADESH
          </div>
          <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0', fontWeight: 800, color: 'var(--color-text)' }}>
            KANPUR INSTITUTE OF TECHNOLOGY (KIT-0164)
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Statement of Marks • B.Tech Computer Science & Engineering (Semester VI)
          </p>
        </div>

        {/* Student Meta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
            background: 'var(--color-surface-2)',
            padding: '0.875rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>CANDIDATE NAME</span>
            <strong style={{ color: 'var(--color-text)' }}>{studentName}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>ROLL NUMBER</span>
            <strong style={{ color: 'var(--color-text)' }}>{rollNo}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>ACADEMIC SESSION</span>
            <strong style={{ color: 'var(--color-text)' }}>2025-2026 (Even Sem)</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>EXAMINATION STATUS</span>
            <strong style={{ color: 'var(--color-success)' }}>PASSED (REGULAR)</strong>
          </div>
        </div>

        {/* Marksheet Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.6rem 0.75rem' }}>Course Code</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Course Title</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Credits</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Internal (50)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>End-Sem (100)</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Total Marks</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {marksData.map((m) => (
                <tr key={m.code} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{m.code}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{m.title}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{m.credits}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{m.internal}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{m.external}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{m.total} / {m.max}</td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-pill)',
                        background: '#ECFDF5',
                        color: '#059669',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                      }}
                    >
                      {m.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Aggregate Score Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Marks</span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--color-text)' }}>{totalMarks} / {maxMarks}</strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#ECFDF5', borderRadius: 'var(--radius-sm)', border: '1px solid #A7F3D0' }}>
            <span style={{ fontSize: '0.7rem', color: '#047857', display: 'block' }}>Semester %</span>
            <strong style={{ fontSize: '1.15rem', color: '#065F46' }}>{percentage}%</strong>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Credits Earned</span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--color-text)' }}>{totalCredits} / {totalCredits}</strong>
          </div>
          <div style={{ padding: '0.75rem', background: '#EFF6FF', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: '0.7rem', color: '#1E40AF', display: 'block' }}>Semester SGPA</span>
            <strong style={{ fontSize: '1.15rem', color: '#1D4ED8' }}>8.42</strong>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn btn--ghost" style={{ flex: 1 }}>
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn--primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            🖨️ Print / Download Marksheet
          </button>
        </div>
      </div>
    </div>
  );
}
