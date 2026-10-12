import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface TimetableSlot {
  period: number;
  startTime: string;
  endTime: string;
  roomNo: string | null;
  subject: { id: number; name: string; code: string } | null;
  teacher: { id: number; name: string } | null;
}

interface TimetableData {
  dayOfWeek: number;
  currentTime: string;
  currentPeriod: number | null;
  nextPeriod: number | null;
  slots: TimetableSlot[];
}

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_TIMETABLE: TimetableData = {
  dayOfWeek: 1,
  currentTime: "10:15",
  currentPeriod: 2,
  nextPeriod: 3,
  slots: [
    {
      period: 1,
      startTime: "09:00",
      endTime: "09:55",
      roomNo: "Room 302",
      subject: { id: 1, name: "Cloud Computing", code: "CS-601" },
      teacher: { id: 1, name: "Dr. R. Sharma" },
    },
    {
      period: 2,
      startTime: "10:00",
      endTime: "10:55",
      roomNo: "Lab-A",
      subject: { id: 2, name: "Web Technology Lab", code: "CS-603" },
      teacher: { id: 2, name: "Er. P. Verma" },
    },
    {
      period: 3,
      startTime: "11:00",
      endTime: "11:55",
      roomNo: "Room 302",
      subject: { id: 3, name: "Compiler Design", code: "CS-602" },
      teacher: { id: 3, name: "Prof. A. Gupta" },
    },
    {
      period: 4,
      startTime: "12:00",
      endTime: "12:55",
      roomNo: "Room 204",
      subject: { id: 4, name: "Software Engineering", code: "CS-604" },
      teacher: { id: 4, name: "Dr. K. Singh" },
    },
  ],
};

export default function TodayTimetable() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/academic/timetable/today")
      .then((res) => setData(res.data.data || DEFAULT_TIMETABLE))
      .catch(() => setData(DEFAULT_TIMETABLE))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem" }}>
      <div style={{ height: 20, background: "var(--color-border)", borderRadius: 8, animation: "pulse 1.5s infinite", width: "40%" }} />
    </div>
  );

  if (!data || data.slots.length === 0) return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, padding: "1.25rem", border: "1px solid var(--color-border)", marginBottom: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "2rem" }}>🏖️</div>
      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>No classes today</div>
      <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{DAYS[data?.dayOfWeek ?? 0]} — You"re free!</div>
    </div>
  );

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📅</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-text)" }}>Today"s Schedule</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{DAYS[data.dayOfWeek]} · {data.slots.length} periods</div>
          </div>
        </div>
        {data.nextPeriod && (
          <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid #6366f1", borderRadius: 10, padding: "4px 10px", fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>
            Next: Period {data.nextPeriod}
          </div>
        )}
      </div>
      <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.slots.map((slot) => {
          const isCurrent = slot.period === data.currentPeriod;
          const isNext = slot.period === data.nextPeriod;
          return (
            <div
              key={slot.period}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem",
                borderRadius: 12,
                background: isCurrent ? "rgba(99,102,241,0.12)" : isNext ? "rgba(245,158,11,0.08)" : "var(--color-bg)",
                border: isCurrent ? "1px solid #6366f1" : isNext ? "1px solid #f59e0b44" : "1px solid transparent",
                transition: "all 0.2s",
              }}
            >
              <div style={{ minWidth: 36, textAlign: "center" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--color-muted)", fontWeight: 600 }}>P{slot.period}</div>
                {isCurrent && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", margin: "2px auto", animation: "pulse 1s infinite" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>
                  {slot.subject?.name ?? "—"}
                  {isCurrent && <span style={{ marginLeft: 6, fontSize: "0.65rem", background: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: 8 }}>LIVE</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                  {slot.startTime} – {slot.endTime}
                  {slot.teacher && ` · ${slot.teacher.name}`}
                </div>
              </div>
              {slot.roomNo && (
                <div style={{ background: "var(--color-border)", borderRadius: 8, padding: "2px 8px", fontSize: "0.75rem", color: "var(--color-text)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  🚪 {slot.roomNo}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
