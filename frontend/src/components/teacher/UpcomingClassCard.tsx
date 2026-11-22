import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

interface Slot {
  period: number;
  startTime: string;
  endTime: string;
  roomNo: string | null;
  subject: { id: number; name: string; code: string } | null;
  section: { id: number; name: string };
  sectionId: number;
}

interface TimetableData {
  currentPeriod: number | null;
  nextPeriod: number | null;
  currentTime: string;
  teacherId: number;
  slots: Slot[];
}

interface UpcomingClassCardProps {
  onStartQr?: (sectionId: number, subjectId: number, period: number, isLab: boolean) => void;
  onStartManualRollCall?: (sectionId: number, subjectId: number, period: number, isLab: boolean) => void;
}

export default function UpcomingClassCard({ onStartQr, onStartManualRollCall }: UpcomingClassCardProps = {}) {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/academic/timetable/teacher/today")
      .then((res) => setData(res.data.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem", height: 100 }} />
  );

  if (!data || data.slots.length === 0) return null;

  const currentSlot = data.slots.find((s) => s.period === data.currentPeriod);
  const nextSlot = data.slots.find((s) => s.period === data.nextPeriod);
  const focusSlot = currentSlot ?? nextSlot;

  if (!focusSlot) return null;

  const isCurrent = !!currentSlot;
  const isLab = !!(
    focusSlot.subject?.name?.toLowerCase().includes("lab") ||
    focusSlot.subject?.code?.toLowerCase().includes("lab") ||
    focusSlot.roomNo?.toLowerCase().includes("lab")
  );

  return (
    <div style={{
      background: isCurrent ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))" : "var(--color-surface)",
      borderRadius: 16,
      border: `1.5px solid ${isCurrent ? "#6366f1" : "var(--color-border)"}`,
      padding: "1.25rem",
      marginBottom: "1rem",
      boxShadow: isCurrent ? "0 8px 24px rgba(99,102,241,0.15)" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isCurrent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase" }}> Ongoing Scheduled Class</span>
            </div>
          ) : (
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}> Upcoming Scheduled Class</span>
          )}
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 600 }}>{focusSlot.startTime} – {focusSlot.endTime}</span>
      </div>

      <div style={{ marginBottom: "0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--color-text)" }}>
            {focusSlot.subject?.name ?? "—"}
          </span>
          {isLab && (
            <span
              style={{
                background: "#EEF2FF",
                color: "#4F46E5",
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid #C7D2FE",
              }}
            >
               2-Hour Practical Lab (Double Attendance Credit · 2x)
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: 4 }}>
          Section: <strong style={{ color: "var(--color-text)" }}>{focusSlot.section.name}</strong>
          {focusSlot.roomNo && <> ·  <strong style={{ color: "var(--color-text)" }}>Room {focusSlot.roomNo.replace(/^Room\s*/i, '')}</strong></>}
          · Period {focusSlot.period}
        </div>
      </div>

      {/* Direct 1-Click Action Launchers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
        <button
          type="button"
          id="btn-quick-manual-rollcall"
          onClick={() => {
            if (onStartManualRollCall) {
              onStartManualRollCall(focusSlot.sectionId, focusSlot.subject?.id || 1, focusSlot.period, isLab);
            } else {
              navigate(`/teacher?sectionId=${focusSlot.sectionId}&subjectId=${focusSlot.subject?.id}&period=${focusSlot.period}`);
            }
          }}
          style={{
            padding: "0.75rem 1rem",
            background: "#059669",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
            transition: "all 0.2s ease",
          }}
        >
           1-Click Manual Roll Call
        </button>

        <button
          type="button"
          id="btn-quick-dynamic-qr"
          onClick={() => {
            if (onStartQr) {
              onStartQr(focusSlot.sectionId, focusSlot.subject?.id || 1, focusSlot.period, isLab);
            } else {
              navigate(`/teacher?startQR=${focusSlot.sectionId}&subjectId=${focusSlot.subject?.id}`);
            }
          }}
          style={{
            padding: "0.75rem 1rem",
            background: "var(--color-primary)",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 4px 12px var(--color-primary-glow)",
            transition: "all 0.2s ease",
          }}
        >
           Launch Dynamic QR
        </button>
      </div>

      {data.slots.length > 1 && (
        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {data.slots.map((s) => (
            <div key={s.period} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6, background: s.period === focusSlot.period ? "var(--color-primary)" : "var(--color-border)", color: s.period === focusSlot.period ? "#fff" : "var(--color-muted)" }}>
              P{s.period}: {s.subject?.code ?? "—"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
