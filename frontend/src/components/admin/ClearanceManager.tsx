import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface StudentClearance {
  studentId: number;
  rollNo: string;
  name: string;
  branch: string;
  academic: boolean;
  accounts: boolean;
  library: boolean;
  discipline: boolean;
  examUnlocked: boolean;
}

export default function ClearanceManager() {
  const [list, setList] = useState<StudentClearance[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/clearance/all')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          const mapped: StudentClearance[] = res.data.data.map((c: any) => ({
            studentId: c.studentId,
            rollNo: c.student?.rollNo || '',
            name: c.student?.user?.name || '',
            branch: c.student?.section?.name || '',
            academic: Boolean(c.academic),
            accounts: Boolean(c.accounts),
            library: Boolean(c.library),
            discipline: Boolean(c.discipline),
            examUnlocked: Boolean(c.examUnlocked),
          }));
          setList(mapped);
        }
      })
      .catch(() => setList([]));
  }, []);

  async function toggleStatus(studentId: number, field: "accounts" | "library" | "discipline") {
    setUpdating(studentId);
    const student = list.find((s) => s.studentId === studentId);
    if (!student) return;

    const newVal = !student[field];
    try {
      await api.patch(`/clearance/${studentId}`, { [field]: newVal });
    } catch (error: any) {
      setBulkMsg(error.response?.data?.error?.message || 'Could not update this clearance status.');
      setUpdating(null);
      return;
    }

    setList((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const updated = { ...s, [field]: newVal };
        // If all 4 are true, examUnlocked can be true
        const allCleared = updated.academic && updated.accounts && updated.library && updated.discipline;
        return { ...updated, examUnlocked: allCleared };
      })
    );
    setUpdating(null);
  }

  function handleBulkUnlock() {
    setBulkMsg('Bulk admit-card release is not available in the backend yet.');
  }

  const filtered = list.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNo.includes(searchTerm);
    if (!matchesSearch) return false;
    if (filter === "CLEARED") return s.examUnlocked;
    if (filter === "PENDING") return !s.examUnlocked;
    return true;
  });

  const totalCleared = list.filter((s) => s.examUnlocked).length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <div className="text-xs text-muted">Total Students</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{list.length}</div>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div className="text-xs text-muted">Admit Cards Released</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981" }}>{totalCleared}</div>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <div className="text-xs text-muted">Clearance Pending</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ef4444" }}>{list.length - totalCleared}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flex: 1, minWidth: 260 }}>
          <input
            type="text"
            placeholder="Search by student name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              width: "100%",
            }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Students</option>
            <option value="CLEARED">Cleared Only</option>
            <option value="PENDING">Pending Only</option>
          </select>
        </div>

        <button
          className="btn btn--primary btn--sm"
          onClick={handleBulkUnlock}
          style={{ fontWeight: 700 }}
        >
           Bulk Unlock Admit Cards
        </button>
      </div>

      {bulkMsg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: 8, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", fontWeight: 700, marginBottom: "1rem" }}>
          {bulkMsg}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--color-surface-2)", borderBottom: "1.5px solid var(--color-border)" }}>
              <th style={{ padding: "0.75rem 1rem" }}>Roll No</th>
              <th style={{ padding: "0.75rem 1rem" }}>Student</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Academic (&ge;75%)</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Accounts (Fees)</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Library</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Discipline</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Admit Card</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.studentId} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontWeight: 600 }}>{s.rollNo}</td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div className="text-xs text-muted">{s.branch}</div>
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  <span className={`badge ${s.academic ? "badge--online" : "badge--offline"}`}>
                    {s.academic ? "Cleared" : "Defaulter"}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  <button
                    className={`btn btn--sm ${s.accounts ? "btn--primary" : "btn--ghost"}`}
                    onClick={() => toggleStatus(s.studentId, "accounts")}
                    disabled={updating === s.studentId}
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      background: s.accounts ? "var(--color-success)" : undefined,
                    }}
                  >
                    {s.accounts ? "Paid ✓" : "Pending"}
                  </button>
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  <button
                    className={`btn btn--sm ${s.library ? "btn--primary" : "btn--ghost"}`}
                    onClick={() => toggleStatus(s.studentId, "library")}
                    disabled={updating === s.studentId}
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      background: s.library ? "var(--color-success)" : undefined,
                    }}
                  >
                    {s.library ? "Clear ✓" : "Overdue"}
                  </button>
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  <button
                    className={`btn btn--sm ${s.discipline ? "btn--primary" : "btn--ghost"}`}
                    onClick={() => toggleStatus(s.studentId, "discipline")}
                    disabled={updating === s.studentId}
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      background: s.discipline ? "var(--color-success)" : undefined,
                    }}
                  >
                    {s.discipline ? "Clean ✓" : "Flagged"}
                  </button>
                </td>
                <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                  <span
                    className="badge"
                    style={{
                      background: s.examUnlocked ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      color: s.examUnlocked ? "#10b981" : "#ef4444",
                      fontWeight: 800,
                    }}
                  >
                    {s.examUnlocked ? "UNLOCKED " : "LOCKED "}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
