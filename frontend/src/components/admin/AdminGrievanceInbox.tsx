import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Ticket {
  id: string;
  studentName: string;
  rollNo: string;
  category: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  resolution?: string;
}

export default function AdminGrievanceInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/grievances/all')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          const mapped: Ticket[] = res.data.data.map((t: any) => ({
            id: String(t.id),
            studentName: t.isAnonymous ? 'Anonymous' : (t.student?.user?.name || ''),
            rollNo: t.isAnonymous ? '—' : (t.student?.rollNo || ''),
            category: t.category,
            title: t.title,
            description: t.description,
            isAnonymous: t.isAnonymous,
            status: t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'RESOLVED' : 'OPEN',
            createdAt: t.createdAt,
            resolution: t.resolution,
          }));
          setTickets(mapped);
        }
      })
      .catch((error) => {
        setTickets([]);
        setLoadError(error.response?.data?.error?.message || 'Could not load grievances.');
      });
  }, []);

  async function handleResolve(ticketId: string) {
    if (!resolutionText.trim()) return;
    setSubmitting(true);

    try {
      await api.patch(`/grievances/${ticketId}/resolve`, { resolution: resolutionText });
    } catch (error: any) {
      setLoadError(error.response?.data?.error?.message || 'Could not resolve this grievance.');
      setSubmitting(false);
      return;
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: "RESOLVED", resolution: resolutionText }
          : t
      )
    );
    setActiveReplyId(null);
    setResolutionText("");
    setSubmitting(false);
  }

  const filtered = tickets.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "OPEN") return t.status === "OPEN";
    if (filter === "RESOLVED") return t.status === "RESOLVED";
    return t.category === filter;
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: "1rem" }}>
        {loadError && <p role="alert" className="alert alert--error">{loadError}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>
               Student Grievance Redressal Inbox
            </h2>
            <p className="text-xs text-muted" style={{ marginTop: 2 }}>
              Review, address, and resolve issues submitted by students.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["ALL", "OPEN", "RESOLVED", "ATTENDANCE", "MARKS", "FACILITIES"].map((f) => (
              <button
                key={f}
                className={`btn btn--sm ${filter === f ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setFilter(f)}
                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.length === 0 && !loadError && <p className="text-muted">No grievances match this filter.</p>}
        {filtered.map((t) => (
          <div
            key={t.id}
            className="card"
            style={{
              padding: "1.25rem",
              border: t.status === "OPEN" ? "1px solid var(--color-border)" : "1px solid #A7F3D0",
              background: t.status === "RESOLVED" ? "#F0FDF4" : "var(--color-surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                  <span className="badge" style={{ background: "#EEF2FF", color: "#4F46E5", fontWeight: 700, fontSize: "0.7rem" }}>
                    {t.category}
                  </span>
                  {t.isAnonymous ? (
                    <span className="badge" style={{ background: "#FEF3C7", color: "#D97706", fontWeight: 700, fontSize: "0.7rem" }}>
                       Anonymous Student
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-text)" }}>
                      {t.studentName} ({t.rollNo})
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 style={{ margin: "4px 0", fontSize: "1rem", fontWeight: 800 }}>
                  {t.title}
                </h4>
              </div>

              <span className={`badge ${t.status === "RESOLVED" ? "badge--online" : "badge--offline"}`} style={{ fontWeight: 700 }}>
                {t.status}
              </span>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.5, margin: "0.5rem 0" }}>
              {t.description}
            </p>

            {t.resolution && (
              <div style={{ background: "rgba(16,185,129,0.1)", padding: "0.75rem 1rem", borderRadius: 8, marginTop: "0.75rem", borderLeft: "3px solid #10b981" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669" }}>Official Resolution:</div>
                <p style={{ fontSize: "0.85rem", margin: "2px 0 0 0", color: "var(--color-text)" }}>{t.resolution}</p>
              </div>
            )}

            {t.status === "OPEN" && (
              <div style={{ marginTop: "1rem" }}>
                {activeReplyId === t.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <textarea
                      rows={2}
                      placeholder="Write official resolution or action taken..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        fontSize: "0.85rem",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => { setActiveReplyId(null); setResolutionText(""); }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn--primary btn--sm"
                        disabled={submitting || !resolutionText.trim()}
                        onClick={() => handleResolve(t.id)}
                        style={{ fontWeight: 700 }}
                      >
                        {submitting ? "Resolving..." : "✓ Mark as Resolved"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => { setActiveReplyId(t.id); setResolutionText(""); }}
                    style={{ fontWeight: 700, fontSize: "0.8rem" }}
                  >
                     Reply & Resolve Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
