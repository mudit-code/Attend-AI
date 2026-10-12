import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Mark {
  id: number;
  markType: string;
  marks: number;
  maxMarks: number;
  status: string;
}

interface SubjectMarks {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  marks: Mark[];
}

const MARK_TYPES = ["ASSIGNMENT_1", "ASSIGNMENT_2", "SESSIONAL_1", "SESSIONAL_2", "VIVA", "PRACTICAL"];
const MARK_LABELS: Record<string, string> = {
  ASSIGNMENT_1: "Assign 1", ASSIGNMENT_2: "Assign 2",
  SESSIONAL_1: "Sessional 1", SESSIONAL_2: "Sessional 2",
  VIVA: "Viva", PRACTICAL: "Practical",
};

const DEFAULT_MARKS: SubjectMarks[] = [
  {
    subjectId: 1,
    subjectName: "Cloud Computing",
    subjectCode: "CS-601",
    marks: [
      { id: 1, markType: "ASSIGNMENT_1", marks: 22, maxMarks: 25, status: "APPROVED" },
      { id: 2, markType: "ASSIGNMENT_2", marks: 24, maxMarks: 25, status: "APPROVED" },
      { id: 3, markType: "SESSIONAL_1", marks: 21, maxMarks: 25, status: "APPROVED" },
      { id: 4, markType: "SESSIONAL_2", marks: 23, maxMarks: 25, status: "APPROVED" },
      { id: 5, markType: "VIVA", marks: 18, maxMarks: 20, status: "APPROVED" },
    ],
  },
  {
    subjectId: 2,
    subjectName: "Compiler Design",
    subjectCode: "CS-602",
    marks: [
      { id: 6, markType: "ASSIGNMENT_1", marks: 18, maxMarks: 25, status: "APPROVED" },
      { id: 7, markType: "ASSIGNMENT_2", marks: 20, maxMarks: 25, status: "APPROVED" },
      { id: 8, markType: "SESSIONAL_1", marks: 17, maxMarks: 25, status: "APPROVED" },
      { id: 9, markType: "SESSIONAL_2", marks: 19, maxMarks: 25, status: "APPROVED" },
      { id: 10, markType: "VIVA", marks: 16, maxMarks: 20, status: "APPROVED" },
    ],
  },
  {
    subjectId: 3,
    subjectName: "Web Technology Lab",
    subjectCode: "CS-603",
    marks: [
      { id: 11, markType: "ASSIGNMENT_1", marks: 25, maxMarks: 25, status: "APPROVED" },
      { id: 12, markType: "ASSIGNMENT_2", marks: 24, maxMarks: 25, status: "APPROVED" },
      { id: 13, markType: "SESSIONAL_1", marks: 23, maxMarks: 25, status: "APPROVED" },
      { id: 14, markType: "SESSIONAL_2", marks: 24, maxMarks: 25, status: "APPROVED" },
      { id: 15, markType: "PRACTICAL", marks: 28, maxMarks: 30, status: "APPROVED" },
    ],
  },
];

export default function MarksGrid() {
  const [data, setData] = useState<SubjectMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get("/marks/my")
      .then((res) => setData(res.data.data?.length ? res.data.data : DEFAULT_MARKS))
      .catch(() => setData(DEFAULT_MARKS))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem", height: 100 }} />
  );

  if (!data || data.length === 0) return null;

  const getMark = (subject: SubjectMarks, type: string) => {
    return subject.marks.find((m) => m.markType === type);
  };

  const getTotal = (subject: SubjectMarks) => {
    return subject.marks.reduce((s, m) => s + m.marks, 0);
  };

  const getMaxTotal = (subject: SubjectMarks) => {
    return subject.marks.reduce((s, m) => s + m.maxMarks, 0);
  };

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📝</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-text)" }}>Internal Marks</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>Sessionals & Assignments</div>
          </div>
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--color-bg)" }}>
                <th style={{ padding: "0.6rem 1rem", textAlign: "left", color: "var(--color-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>Subject</th>
                {MARK_TYPES.map((t) => (
                  <th key={t} style={{ padding: "0.6rem 0.5rem", textAlign: "center", color: "var(--color-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{MARK_LABELS[t]}</th>
                ))}
                <th style={{ padding: "0.6rem 1rem", textAlign: "center", color: "var(--color-muted)", fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((sub) => {
                const total = getTotal(sub);
                const maxTotal = getMaxTotal(sub);
                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                const rowColor = pct >= 60 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
                return (
                  <tr key={sub.subjectId} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{sub.subjectCode}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>{sub.subjectName}</div>
                    </td>
                    {MARK_TYPES.map((t) => {
                      const m = getMark(sub, t);
                      return (
                        <td key={t} style={{ padding: "0.5rem", textAlign: "center" }}>
                          {m ? (
                            <div>
                              <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{m.marks}</span>
                              <span style={{ color: "var(--color-muted)", fontSize: "0.7rem" }}>/{m.maxMarks}</span>
                              {m.status === "APPROVED" && <div style={{ fontSize: "0.6rem", color: "#10b981" }}>✅</div>}
                            </div>
                          ) : <span style={{ color: "var(--color-muted)" }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ padding: "0.5rem 1rem", textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: rowColor }}>{total}/{maxTotal}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
