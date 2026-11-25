import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Drive {
  id: number;
  companyName: string;
  driveDate: string;
  minAttendance: number;
  eligibleBranches: string[];
  description: string;
  registrationDeadline: string;
  registeredCount: number;
}

export default function PlacementManager() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [driveDate, setDriveDate] = useState("");
  const [minAttendance, setMinAttendance] = useState<number>(75);
  const [branches, setBranches] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/placement/drives')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          const mapped: Drive[] = res.data.data.map((d: any) => ({
            id: d.id,
            companyName: d.companyName,
            driveDate: d.driveDate?.slice(0, 10) || '',
            minAttendance: d.minAttendance,
            eligibleBranches: d.eligibleBranches ?? [],
            description: d.description || '',
            registrationDeadline: d.registrationDeadline?.slice(0, 10) || '',
            registeredCount: d._count?.registrations ?? 0,
          }));
          setDrives(mapped);
        }
      })
      .catch((error) => {
        setDrives([]);
        setMsg(error.response?.data?.error?.message || 'Could not load placement drives.');
      });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !driveDate) return;
    setPublishing(true);
    setMsg(null);

    try {
      const { data } = await api.post("/placement/drives", {
        companyName,
        driveDate,
        minAttendance,
        eligibleBranches: branches.split(",").map((b) => b.trim().toUpperCase()).filter(Boolean),
        description,
        registrationDeadline: deadline || undefined,
      });
      setDrives((prev) => [data.data, ...prev]);
      setCompanyName("");
      setDriveDate("");
      setDescription("");
      setDeadline("");
      setMsg("Placement drive published.");
    } catch (error: any) {
      setMsg(error.response?.data?.error?.message || "Could not publish the placement drive.");
    } finally {
      setPublishing(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div style={{ maxWidth: 950, margin: "0 auto" }}>
      {/* Create Drive Form */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.25rem" }}>
           Training & Placement (T&P) Drive Publisher
        </h2>
        <p className="text-xs text-muted" style={{ marginBottom: "1rem" }}>
          AttendAI automatically validates each student's attendance against the cutoff before allowing drive registration.
        </p>

        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Company Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Google / Microsoft / TCS"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Drive / Test Date
              </label>
              <input
                type="date"
                required
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Minimum Attendance Cutoff (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={minAttendance}
                onChange={(e) => setMinAttendance(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 800,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Eligible Branches (comma separated)
              </label>
              <input
                type="text"
                value={branches}
                onChange={(e) => setBranches(e.target.value)}
                placeholder="CSE, IT, ECE"
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Job Description / Drive Details
            </label>
            <input
              type="text"
              placeholder="e.g. Package 7.5 LPA, Role: Graduate Software Engineer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: 8,
                border: "1.5px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                fontSize: "0.875rem",
              }}
            />
          </div>

          {msg && (
            <div style={{ padding: "0.6rem 0.875rem", borderRadius: 8, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.875rem" }}>
              {msg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn--primary" disabled={publishing} style={{ fontWeight: 800 }}>
              {publishing ? "Posting..." : " Post Recruitment Drive"}
            </button>
          </div>
        </form>
      </div>

      {/* Drives List */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>
           Active Campus Recruitment Drives ({drives.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {drives.map((d) => (
            <div
              key={d.id}
              style={{
                padding: "1rem",
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                  <span className="badge" style={{ background: "#EEF2FF", color: "#4F46E5", fontWeight: 800 }}>
                    Cutoff: &ge; {d.minAttendance}% Attendance
                  </span>
                  <span className="badge" style={{ background: "var(--color-border)", color: "var(--color-text)", fontSize: "0.7rem" }}>
                    {d.eligibleBranches.join(", ")}
                  </span>
                </div>
                <h4 style={{ margin: "4px 0", fontSize: "1rem", fontWeight: 800 }}>
                  {d.companyName}
                </h4>
                <p className="text-xs text-muted" style={{ margin: "2px 0 0 0" }}>
                   Drive Date: {d.driveDate} · {d.description}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)" }}>
                  {d.registeredCount}
                </div>
                <div className="text-xs text-muted">Eligible Candidates</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
