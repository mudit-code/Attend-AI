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

export interface TodayAttendanceRecord {
  period: number;
  status: 'P' | 'A' | 'L' | 'OD' | 'LV';
  subject?: string;
  teacher?: string;
  time?: string;
  sessionId?: string;
}

interface TodayTimetableProps {
  onMarkLiveClass?: () => void;
  todayRecords?: TodayAttendanceRecord[];
  onRaiseCorrection?: (record: any) => void;
}

export default function TodayTimetable({ onMarkLiveClass, todayRecords = [], onRaiseCorrection }: TodayTimetableProps) {
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
      <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{DAYS[data?.dayOfWeek ?? 0]} — You're free!</div>
    </div>
  );

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📅</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--color-text)" }}>Today's Live Schedule</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{DAYS[data.dayOfWeek]} · {data.slots.length} periods today</div>
          </div>
        </div>
        {data.nextPeriod && (
          <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid #6366f1", borderRadius: 10, padding: "4px 10px", fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>
            Next: Period {data.nextPeriod}
          </div>
        )}
      </div>

      <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {data.slots.map((slot) => {
          const isCurrent = slot.period === data.currentPeriod;
          const isNext = slot.period === data.nextPeriod;
          const record = todayRecords.find((r) => r.period === slot.period);
          const isLab = slot.subject?.name?.toLowerCase().includes("lab") || slot.subject?.code?.toLowerCase().includes("lab");

          return (
            <div
              key={slot.period}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: 12,
                background: record?.status === "P"
                  ? "rgba(16, 185, 129, 0.05)"
                  : record?.status === "A"
                  ? "rgba(239, 68, 68, 0.06)"
                  : isCurrent
                  ? "rgba(99, 102, 241, 0.12)"
                  : isNext
                  ? "rgba(245, 158, 11, 0.06)"
                  : "var(--color-bg)",
                border: record?.status === "P"
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : record?.status === "A"
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : isCurrent
                  ? "1.5px solid #6366f1"
                  : isNext
                  ? "1px solid rgba(245, 158, 11, 0.3)"
                  : "1px solid var(--color-border)",
                transition: "all 0.2s",
              }}
            >
              {/* Period Indicator */}
              <div style={{ minWidth: 36, textAlign: "center" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--color-muted)", fontWeight: 700 }}>P{slot.period}</div>
                {isCurrent && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", margin: "3px auto", animation: "pulse 1s infinite" }} />}
              </div>

              {/* Subject & Instructor Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-text)" }}>
                    {slot.subject?.name ?? "—"}
                  </span>
                  {isLab && (
                    <span style={{ fontSize: "0.62rem", background: "#EEF2FF", color: "#4F46E5", padding: "1px 6px", borderRadius: 6, fontWeight: 700, border: "1px solid #C7D2FE" }}>
                      🧪 2-Hour Lab (2x Credits)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.73rem", color: "var(--color-muted)", marginTop: "2px" }}>
                  {slot.startTime} – {slot.endTime}
                  {slot.teacher && ` · ${slot.teacher.name}`}
                  {slot.roomNo && ` · 🚪 ${slot.roomNo}`}
                </div>
              </div>

              {/* Attendance Status & Quick Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                {record ? (
                  record.status === "P" ? (
                    <span
                      style={{
                        background: "#DCFCE7",
                        color: "#15803D",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        padding: "0.25rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #86EFAC",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                      title="Attendance marked Present by faculty"
                    >
                      ✓ PRESENT
                    </span>
                  ) : record.status === "A" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span
                        style={{
                          background: "#FEE2E2",
                          color: "#B91C1C",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "0.25rem 0.65rem",
                          borderRadius: "8px",
                          border: "1px solid #FCA5A5",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                        title="You were marked Absent by faculty"
                      >
                        ✗ ABSENT
                      </span>
                      {onRaiseCorrection && (
                        <button
                          onClick={() =>
                            onRaiseCorrection({
                              period: slot.period,
                              subject: slot.subject?.name || "Class",
                              teacher: slot.teacher?.name || "Faculty",
                              sessionId: record.sessionId || `ses-${slot.period}`,
                              date: new Date().toISOString().slice(0, 10),
                            })
                          }
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "0.25rem 0.5rem",
                            borderRadius: "6px",
                            background: "#FFF1F2",
                            color: "#BE123C",
                            border: "1px solid #FDA4AF",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                          title="If you were present, click to claim correction"
                        >
                          🔔 Raise Claim
                        </button>
                      )}
                    </div>
                  ) : record.status === "OD" ? (
                    <span style={{ background: "#F3E8FF", color: "#7E22CE", fontSize: "0.72rem", fontWeight: 800, padding: "0.25rem 0.65rem", borderRadius: "8px", border: "1px solid #D8B4FE" }}>
                      ★ ON DUTY
                    </span>
                  ) : (
                    <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: "0.72rem", fontWeight: 800, padding: "0.25rem 0.65rem", borderRadius: "8px" }}>
                      ⚠ LATE
                    </span>
                  )
                ) : isCurrent ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "0.7rem", fontWeight: 800, padding: "0.2rem 0.5rem", borderRadius: "6px", border: "1px solid #C7D2FE" }}>
                      ⚡ LIVE
                    </span>
                    {onMarkLiveClass && (
                      <button
                        onClick={onMarkLiveClass}
                        style={{
                          background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Mark Now
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: "0.7rem", color: "var(--color-muted)", fontWeight: 600 }}>
                    {data.currentPeriod && slot.period < data.currentPeriod ? "—" : `Starts ${slot.startTime}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
