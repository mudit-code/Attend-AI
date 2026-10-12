import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Drive {
  id: number;
  companyName: string;
  driveDate: string;
  minAttendance: number;
  eligibleBranches: string[];
  description: string | null;
  registrationDeadline: string | null;
}

const DEFAULT_DRIVES: Drive[] = [
  {
    id: 1,
    companyName: "TCS Ninja / Digital Campus Drive",
    driveDate: "2026-10-28T09:30:00.000Z",
    minAttendance: 75,
    eligibleBranches: ["CSE", "IT", "ECE"],
    description: "National qualifier test for Software Engineer positions.",
    registrationDeadline: "2026-10-24T23:59:59.000Z",
  },
  {
    id: 2,
    companyName: "Wipro Elite National Talent Hunt",
    driveDate: "2026-11-05T10:00:00.000Z",
    minAttendance: 75,
    eligibleBranches: ["CSE", "IT"],
    description: "On-campus coding assessment and technical round.",
    registrationDeadline: "2026-11-01T23:59:59.000Z",
  },
];

const DEFAULT_ELIGIBILITY: Record<number, any> = {
  1: {
    isEligible: false,
    reason: "Attendance (30.1%) is below the required 75%",
    currentAttendance: 30.1,
    minAttendance: 75,
  },
  2: {
    isEligible: false,
    reason: "Attendance (30.1%) is below the required 75%",
    currentAttendance: 30.1,
    minAttendance: 75,
  },
};

export default function PlacementWidget() {
  const [drives, setDrives] = useState<Drive[]>(DEFAULT_DRIVES);
  const [eligibility, setEligibility] = useState<Record<number, any>>(DEFAULT_ELIGIBILITY);
  const [registering, setRegistering] = useState<number | null>(null);

  useEffect(() => {
    api.get("/placement/drives")
      .then(async (res) => {
        if (!res.data.data?.length) return;
        const driveList: Drive[] = res.data.data;
        setDrives(driveList);
        const elig: Record<number, any> = {};
        await Promise.all(driveList.slice(0, 3).map(async (d) => {
          try {
            const e = await api.get(`/placement/drives/${d.id}/eligibility`);
            elig[d.id] = e.data.data;
          } catch {}
        }));
        setEligibility(elig);
      })
      .catch(() => {});
  }, []);

  if (drives.length === 0) return null;

  async function register(driveId: number) {
    setRegistering(driveId);
    try {
      await api.post(`/placement/drives/${driveId}/register`, {});
      alert("Registered successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Registration failed");
    } finally {
      setRegistering(null);
    }
  }

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.25rem" }}>💼</span>
        <div>
          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>Placement Drives</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{drives.length} upcoming</div>
        </div>
      </div>
      <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {drives.slice(0, 3).map((drive) => {
          const e = eligibility[drive.id];
          const isEligible = e?.isEligible;
          return (
            <div key={drive.id} style={{ padding: "0.875rem", borderRadius: 12, background: isEligible === true ? "rgba(16,185,129,0.06)" : isEligible === false ? "rgba(239,68,68,0.06)" : "var(--color-bg)", border: `1px solid ${isEligible === true ? "#10b98133" : isEligible === false ? "#ef444433" : "var(--color-border)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text)" }}>{drive.companyName}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                    📅 {new Date(drive.driveDate).toLocaleDateString("en-IN")} · Min {drive.minAttendance}% attendance
                  </div>
                  {e && !isEligible && e.reasons?.length > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 4 }}>❌ {e.reasons[0]}</div>
                  )}
                  {e && isEligible && (
                    <div style={{ fontSize: "0.7rem", color: "#10b981", marginTop: 4 }}>✅ You are eligible ({e.currentAttendance}% attendance)</div>
                  )}
                </div>
                {isEligible && (
                  <button onClick={() => register(drive.id)} disabled={registering === drive.id} style={{ background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", opacity: registering === drive.id ? 0.7 : 1 }}>
                    {registering === drive.id ? "..." : "Register"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
