import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface StudentMarkRow {
  studentId: number;
  rollNo: string;
  name: string;
  marks: string; // string for input control
}

const EXAM_TYPES = [
  { key: "ASSIGNMENT_1", label: "Assignment 1", max: 25 },
  { key: "ASSIGNMENT_2", label: "Assignment 2", max: 25 },
  { key: "SESSIONAL_1", label: "Sessional 1 (Mid-Term)", max: 25 },
  { key: "SESSIONAL_2", label: "Sessional 2", max: 25 },
  { key: "VIVA", label: "Viva Voce", max: 20 },
  { key: "PRACTICAL", label: "Lab Practical", max: 30 },
] as const;

export default function MarksEntryTab({
  sections = [],
  subjects = [],
}: {
  sections?: { id: number; name: string }[];
  subjects?: { id: number; name: string; code: string }[];
}) {
  const [selectedSection, setSelectedSection] = useState<number | ''>(sections[0]?.id ?? '');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>(subjects[0]?.id ?? '');
  const [selectedExam, setSelectedExam] = useState<typeof EXAM_TYPES[number]["key"]>("SESSIONAL_1");
  const [students, setStudents] = useState<StudentMarkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);

  const currentExamInfo = EXAM_TYPES.find((e) => e.key === selectedExam) ?? EXAM_TYPES[0];

  useEffect(() => {
    setSelectedSection(sections[0]?.id ?? '');
  }, [sections]);

  useEffect(() => {
    setSelectedSubject(subjects[0]?.id ?? '');
  }, [subjects]);

  useEffect(() => {
    if (!selectedSection || !selectedSubject) {
      setStudents([]);
      return;
    }

    let active = true;
    setLoading(true);
    setMessage(null);
    api.get(`/marks/section/${selectedSection}?subjectId=${selectedSubject}`)
      .then(({ data }) => {
        if (!active) return;
        const rows: StudentMarkRow[] = (data.data || []).map((student: any) => {
          const currentMark = student.marks?.find((mark: any) => mark.markType === selectedExam);
          return {
            studentId: student.studentId,
            rollNo: student.rollNo,
            name: student.name,
            marks: currentMark ? String(currentMark.marks) : '',
          };
        });
        setStudents(rows);
      })
      .catch((error: any) => {
        if (active) {
          setStudents([]);
          setMessageIsError(true);
          setMessage(error.response?.data?.error?.message || 'Could not load the enrolled students for this class.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [selectedSection, selectedSubject, selectedExam]);

  function handleMarkChange(studentId: number, value: string) {
    const num = Number(value);
    if (value !== "" && (isNaN(num) || num < 0 || num > currentExamInfo.max)) {
      return; // prevent invalid marks
    }
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, marks: value } : s))
    );
  }

  function handleFillAll(fillVal: string) {
    setStudents((prev) => prev.map((s) => ({ ...s, marks: fillVal })));
  }

  async function handleSaveMarks(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSection || !selectedSubject || students.length === 0) {
      setMessageIsError(true);
      setMessage("Select an assigned class and subject with enrolled students before saving.");
      return;
    }
    setSaving(true);
    setMessage(null);
    setMessageIsError(false);

    const payload = {
      sectionId: selectedSection,
      subjectId: selectedSubject,
      markType: selectedExam,
      maxMarks: currentExamInfo.max,
      marks: students.map((s) => ({
        studentId: s.studentId,
        marks: Number(s.marks) || 0,
      })),
    };

    try {
      await api.post("/marks/bulk", payload);
      setMessage("✓ Marks saved and submitted for HOD approval!");
    } catch (error: any) {
      setMessageIsError(true);
      setMessage(error.response?.data?.error?.message || "Could not save marks. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>
               Internal & Sessional Marks Entry
            </h2>
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
              Enter evaluation marks for assignments, sessionals, and lab practicals.
            </p>
          </div>
          <span className="badge" style={{ background: "#EEF2FF", color: "#4F46E5", fontWeight: 700 }}>
            Max: {currentExamInfo.max} Marks
          </span>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: 10,
                border: "1.5px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontWeight: 600,
              }}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: 10,
                border: "1.5px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontWeight: 600,
              }}
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Assessment / Exam Type
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: 10,
                border: "1.5px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontWeight: 600,
              }}
            >
              {EXAM_TYPES.map((ex) => (
                <option key={ex.key} value={ex.key}>
                  {ex.label} (Max {ex.max})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Fill Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--color-surface-2)",
            padding: "0.6rem 0.875rem",
            borderRadius: 10,
            fontSize: "0.8rem",
          }}
        >
          <span className="text-muted">Quick Actions:</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => handleFillAll(String(currentExamInfo.max))}
              style={{ fontSize: "0.75rem", padding: "3px 8px" }}
            >
              Set All Full ({currentExamInfo.max})
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => handleFillAll("20")}
              style={{ fontSize: "0.75rem", padding: "3px 8px" }}
            >
              Set All 20
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => handleFillAll("")}
              style={{ fontSize: "0.75rem", padding: "3px 8px", color: "var(--color-danger)" }}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Marks Table */}
      <form onSubmit={handleSaveMarks}>
        {loading && <p className="text-muted">Loading enrolled students and saved marks...</p>}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1.5px solid var(--color-border)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, width: "70px" }}>#</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Roll Number</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>Student Name</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, width: "140px", textAlign: "right" }}>
                  Marks (/ {currentExamInfo.max})
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && students.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center' }}>No enrolled students found for this class and subject.</td></tr>
              )}
              {students.map((st, idx) => (
                <tr
                  key={st.studentId}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem", color: "var(--color-muted)", fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontWeight: 600 }}>{st.rollNo}</td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{st.name}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <input
                      type="number"
                      min={0}
                      max={currentExamInfo.max}
                      value={st.marks}
                      onChange={(e) => handleMarkChange(st.studentId, e.target.value)}
                      placeholder="0"
                      style={{
                        width: 70,
                        padding: "0.4rem 0.5rem",
                        borderRadius: 8,
                        border: "1.5px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {message && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 10,
              background: messageIsError ? "#FEF2F2" : "#ECFDF5",
              color: messageIsError ? "#B42318" : "#059669",
              border: `1px solid ${messageIsError ? "#FECACA" : "#A7F3D0"}`,
              fontWeight: 700,
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || loading || students.length === 0}
            style={{ padding: "0.75rem 2rem", fontWeight: 800 }}
          >
            {saving ? "Saving..." : " Submit Marks to HOD"}
          </button>
        </div>
      </form>
    </div>
  );
}
