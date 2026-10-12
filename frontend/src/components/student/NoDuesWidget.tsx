import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface ClearanceData {
  academic: boolean;
  accounts: boolean;
  library: boolean;
  discipline: boolean;
  examUnlocked: boolean;
  semester: string;
}

const PILLARS = [
  { key: "academic", label: "Academic Cell", icon: "🎓", desc: "Attendance & Sessionals" },
  { key: "accounts", label: "Accounts Office", icon: "💳", desc: "Fees Payment" },
  { key: "library", label: "Central Library", icon: "📚", desc: "Books & Fines" },
  { key: "discipline", label: "DSW / Proctor", icon: "🛡️", desc: "Discipline Record" },
] as const;

const DEFAULT_CLEARANCE: ClearanceData = {
  academic: false,
  accounts: true,
  library: true,
  discipline: true,
  examUnlocked: false,
  semester: "ODD-2026",
};

export default function NoDuesWidget() {
  const [data, setData] = useState<ClearanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/clearance/my")
      .then((res) => setData(res.data.data || DEFAULT_CLEARANCE))
      .catch(() => setData(DEFAULT_CLEARANCE))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem", height: 120 }} />
  );

  if (!data) return null;

  const cleared = PILLARS.filter((p) => data[p.key]).length;

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-text)" }}>No-Dues Clearance</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{data.semester}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: "1.25rem", color: cleared === 4 ? "#10b981" : "#f59e0b" }}>{cleared}/4</div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>Cleared</div>
        </div>
      </div>
      <div style={{ padding: "0.75rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {PILLARS.map((p) => {
          const ok = data[p.key];
          return (
            <div key={p.key} style={{ background: ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.06)", borderRadius: 10, padding: "0.6rem 0.75rem", border: `1px solid ${ok ? "#10b98133" : "#ef444433"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: 2 }}>
                <span style={{ fontSize: "1rem" }}>{p.icon}</span>
                <span style={{ fontWeight: 600, fontSize: "0.8rem", color: ok ? "#10b981" : "#ef4444" }}>{ok ? "✅" : "⏳"} {p.label}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-muted)", paddingLeft: "1.4rem" }}>{p.desc}</div>
            </div>
          );
        })}
      </div>
      {data.examUnlocked ? (
        <div style={{ margin: "0 1.25rem 1rem", padding: "0.75rem", background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", borderRadius: 12, textAlign: "center", fontWeight: 700, color: "#10b981" }}>
          🎉 Exam Admit Card Unlocked!
        </div>
      ) : (
        <div style={{ margin: "0 1.25rem 1rem", padding: "0.6rem", background: "rgba(239,68,68,0.06)", border: "1px solid #ef444433", borderRadius: 12, textAlign: "center", fontSize: "0.8rem", color: "var(--color-muted)" }}>
          {4 - cleared} clearance{4 - cleared !== 1 ? "s" : ""} pending for exam admission
        </div>
      )}
    </div>
  );
}
