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

const DEFAULT_TEACHER_TIMETABLE: TimetableData = {
  currentPeriod: 2,
  nextPeriod: 3,
  currentTime: "10:15",
  teacherId: 1,
  slots: [
    {
      period: 1,
      startTime: "09:00",
      endTime: "09:55",
      roomNo: "Room 302",
      subject: { id: 1, name: "Cloud Computing", code: "CS-601" },
      section: { id: 1, name: "CSE-3A" },
      sectionId: 1,
    },
    {
      period: 2,
      startTime: "10:00",
      endTime: "10:55",
      roomNo: "Room 302",
      subject: { id: 1, name: "Cloud Computing", code: "CS-601" },
      section: { id: 2, name: "CSE-3B" },
      sectionId: 2,
    },
    {
      period: 3,
      startTime: "11:00",
      endTime: "11:55",
      roomNo: "Lab-B",
      subject: { id: 3, name: "Compiler Design", code: "CS-602" },
      section: { id: 1, name: "CSE-3A" },
      sectionId: 1,
    },
  ],
};

interface UpcomingClassCardProps {
  onStartQr?: (sectionId: number, subjectId: number, period: number) => void;
}

export default function UpcomingClassCard({ onStartQr }: UpcomingClassCardProps = {}) {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/academic/timetable/teacher/today")
      .then((res) => setData(res.data.data || DEFAULT_TEACHER_TIMETABLE))
      .catch(() => setData(DEFAULT_TEACHER_TIMETABLE))
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

  return (
    <div style={{
      background: isCurrent ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))" : "var(--color-surface)",
      borderRadius: 16,
      border: `1px solid ${isCurrent ? "#6366f1" : "var(--color-border)"}`,
      padding: "1rem 1.25rem",
      marginBottom: "1rem",
      boxShadow: isCurrent ? "0 0 24px rgba(99,102,241,0.2)" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isCurrent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>Ongoing Class</span>
            </div>
          ) : (
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>⏰ Upcoming Class</span>
          )}
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>{focusSlot.startTime} – {focusSlot.endTime}</span>
      </div>

      <div style={{ marginBottom: "0.875rem" }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--color-text)" }}>{focusSlot.subject?.name ?? "—"}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 2 }}>
          {focusSlot.section.name}
          {focusSlot.roomNo && <> · <span style={{ fontWeight: 600, color: "var(--color-text)" }}>🚪 Room {focusSlot.roomNo.replace(/^Room\s*/i, '')}</span></>}
          · Period {focusSlot.period}
        </div>
      </div>

      <button
        onClick={() => {
          if (onStartQr) {
            onStartQr(focusSlot.sectionId, focusSlot.subject?.id || 1, focusSlot.period);
          } else {
            navigate(`/teacher?startQR=${focusSlot.sectionId}&subjectId=${focusSlot.subject?.id}`);
          }
        }}
        style={{
          width: "100%",
          padding: "0.7rem",
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: "0.9rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        📱 Start QR Attendance
      </button>

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
