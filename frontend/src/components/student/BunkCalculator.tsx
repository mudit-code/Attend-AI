import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface SubjectStat {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  attended: number;
  total: number;
  percentage: number;
  target: number;
  status: "SAFE" | "WARNING" | "DANGER";
  lecturesNeededToRecover: number;
  safeBunksAllowed: number;
}

interface RecoveryData {
  studentName: string;
  target: number;
  subjectWise: SubjectStat[];
  overall: {
    attended: number;
    total: number;
    percentage: number;
    safeBunksAllowed: number;
    lecturesNeededToRecover: number;
    status: "SAFE" | "WARNING" | "DANGER";
  };
}

const STATUS_COLORS = {
  SAFE: { bg: "rgba(16,185,129,0.1)", border: "#10b981", text: "#10b981", label: "SAFE ZONE" },
  WARNING: { bg: "rgba(245,158,11,0.1)", border: "#f59e0b", text: "#f59e0b", label: "CAUTION" },
  DANGER: { bg: "rgba(239,68,68,0.1)", border: "#ef4444", text: "#ef4444", label: "DANGER" },
};

export default function BunkCalculator() {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get("/reports/recovery-stats")
      .then((res) => setData(res.data.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem" }}>
      <div style={{ height: 20, background: "var(--color-border)", borderRadius: 8, animation: "pulse 1.5s infinite", width: "60%" }} />
    </div>
  );

  if (!data || data.subjectWise.length === 0) return null;

  const overall = data.overall;
  const c = STATUS_COLORS[overall.status];

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: `1px solid ${c.border}`, marginBottom: "1rem", overflow: "hidden", boxShadow: `0 0 20px ${c.border}22` }}>
      {/* Header */}
      <div style={{ background: c.bg, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={`bunk-status bunk-status--${overall.status.toLowerCase()}`}>{overall.status}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)" }}>
              Bunk / Recovery Calculator
              <span style={{ marginLeft: 8, fontSize: "0.7rem", fontWeight: 700, color: c.text, background: c.bg, padding: "2px 8px", borderRadius: 20, border: `1px solid ${c.border}` }}>
                {c.label}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 2 }}>
              Overall: {overall.percentage}% | Target: {data.target}%
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {overall.status === "DANGER" ? (
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.9rem" }}>
              Need <span style={{ fontSize: "1.3rem" }}>{overall.lecturesNeededToRecover}</span> more classes
            </div>
          ) : (
            <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.9rem" }}>
              Can bunk <span style={{ fontSize: "1.3rem" }}>{overall.safeBunksAllowed}</span> more
            </div>
          )}
          <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 2 }}>{expanded ? "▲ Hide details" : "▼ View subject-wise"}</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div style={{ padding: "0.5rem 1.25rem", background: "var(--color-bg)" }}>
        <div style={{ height: 8, background: "var(--color-border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(overall.percentage, 100)}%`, background: c.border, borderRadius: 4, transition: "width 1s ease" }} />
        </div>
        {/* Target marker */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: `${data.target}%`, top: -12, width: 2, height: 8, background: "#6b7280" }} />
          <div style={{ position: "absolute", left: `calc(${data.target}% - 10px)`, top: -4, fontSize: "0.6rem", color: "#6b7280" }}>{data.target}%</div>
        </div>
      </div>

      {/* Subject-wise breakdown */}
      {expanded && (
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data.subjectWise.map((sub) => {
            const sc = STATUS_COLORS[sub.status];
            return (
              <div key={sub.subjectId} style={{ background: sc.bg, borderRadius: 12, padding: "0.875rem", border: `1px solid ${sc.border}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>{sub.subjectName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{sub.subjectCode} · {sub.attended}/{sub.total} classes</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: sc.text }}>{sub.percentage}%</div>
                    {sub.status === "DANGER" ? (
                      <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 600 }}>Need {sub.lecturesNeededToRecover} more</div>
                    ) : (
                      <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>{sub.safeBunksAllowed} safe bunks</div>
                    )}
                  </div>
                </div>
                <div style={{ height: 6, background: "rgba(0,0,0,0.1)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(sub.percentage, 100)}%`, background: sc.border, borderRadius: 3, transition: "width 0.8s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
