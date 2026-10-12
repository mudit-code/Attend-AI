import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface LeaveRequest {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  documentUrl: string | null;
  status: string;
  createdAt: string;
  student?: { user: { name: string; email: string }; section: { name: string } };
}

export default function LeaveInbox() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);

  useEffect(() => {
    loadLeaves();
  }, []);

  async function loadLeaves() {
    try {
      const res = await api.get("/leaves?status=PENDING");
      setLeaves(res.data.data ?? []);
    } catch { } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setDeciding(id);
    try {
      await api.patch(`/leaves/${id}/decision`, { decision, note: decision === "APPROVED" ? "Approved by teacher" : "Rejected" });
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed");
    } finally {
      setDeciding(null);
    }
  }

  if (loading) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem", height: 80 }} />
  );

  if (leaves.length === 0) return null;

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid #f59e0b44", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>📋</span>
        <div>
          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>Leave Requests</div>
          <div style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600 }}>{leaves.length} pending approval</div>
        </div>
      </div>
      <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {leaves.slice(0, 5).map((leave) => (
          <div key={leave.id} style={{ background: "var(--color-bg)", borderRadius: 12, padding: "0.875rem", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>{leave.student?.user.name ?? "Student"}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{leave.student?.section?.name} · {leave.type}</div>
              </div>
              <span style={{ fontSize: "0.7rem", background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>PENDING</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.6rem" }}>
              📅 {new Date(leave.fromDate).toLocaleDateString("en-IN")} – {new Date(leave.toDate).toLocaleDateString("en-IN")}
              <br />📝 {leave.reason}
            </div>
            {leave.documentUrl && (
              <a href={leave.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>📄 View Document</a>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
              <button onClick={() => decide(leave.id, "APPROVED")} disabled={deciding === leave.id} style={{ flex: 1, padding: "0.5rem", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid #10b98133", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
                ✅ Approve
              </button>
              <button onClick={() => decide(leave.id, "REJECTED")} disabled={deciding === leave.id} style={{ flex: 1, padding: "0.5rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
