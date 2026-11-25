import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface NoticeItem {
  id: number;
  title: string;
  body: string;
  category: "EXAM" | "FEE" | "HOLIDAY" | "EVENT" | "DISCIPLINE" | "GENERAL";
  targetRole: string | null;
  targetDeptId?: number | null;
  targetDeptName?: string | null;
  targetSectionId?: number | null;
  targetSectionName?: string | null;
  audienceScope?: "CAMPUS" | "BRANCH" | "SECTION";
  pdfUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function NoticePublisher() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<NoticeItem["category"]>("EXAM");
  const [targetRole, setTargetRole] = useState<string>("ALL");
  const [audienceScope, setAudienceScope] = useState<"CAMPUS" | "BRANCH" | "SECTION">("CAMPUS");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/notices")
      .then((res) => {
        const list = res.data?.data || res.data;
        if (isMounted && Array.isArray(list)) {
          setNotices(list);
        }
      })
      .catch((error) => {
        if (isMounted) setMsg(error.response?.data?.error?.message || 'Could not load notices.');
      });

    // Load academic structures
    Promise.allSettled([api.get("/academic/departments"), api.get("/academic/sections")])
      .then(([dRes, sRes]) => {
        if (!isMounted) return;
        if (dRes.status === "fulfilled" && dRes.value.data.data?.length) {
          setDepartments(dRes.value.data.data);
          setSelectedDeptId(dRes.value.data.data[0].id);
        }
        if (sRes.status === "fulfilled" && sRes.value.data.data?.length) {
          setSections(sRes.value.data.data);
          setSelectedSectionId(sRes.value.data.data[0].id);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPublishing(true);
    setMsg(null);

    try {
      const { data } = await api.post("/notices", {
      title,
      body,
      category,
      targetRole: targetRole === "ALL" ? null : targetRole,
      pdfUrl: pdfUrl.trim() || null,
      });
      setNotices((prev) => [data.data, ...prev]);
      setTitle("");
      setBody("");
      setPdfUrl("");
      setMsg("Notice published.");
    } catch (error: any) {
      setMsg(error.response?.data?.error?.message || "Could not publish the notice.");
    } finally {
      setPublishing(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  function handleToggle(id: number) {
    void handleDelete(id);
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/notices/${id}`);
    } catch (error: any) {
      setMsg(error.response?.data?.error?.message || 'Could not deactivate the notice.');
      return;
    }
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div style={{ maxWidth: 950, margin: "0 auto" }}>
      {/* Compose Form */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.25rem" }}>
           Post Official Circular / Notice
        </h2>
        <p className="text-xs text-muted" style={{ marginBottom: "1rem" }}>
          This notice will immediately appear on Student & Faculty dashboard announcement banners.
        </p>

        <form onSubmit={handlePublish}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                }}
              >
                <option value="EXAM"> Examination</option>
                <option value="FEE"> Fees & Accounts</option>
                <option value="HOLIDAY"> Holiday / Break</option>
                <option value="EVENT"> Event / Placement</option>
                <option value="DISCIPLINE"> Discipline / Proctor</option>
                <option value="GENERAL"> General Circular</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Target Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 600,
                }}
              >
                <option value="ALL">Everyone (All Students &amp; Faculty)</option>
                <option value="STUDENT">Students Only</option>
                <option value="TEACHER">Faculty Only</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                Audience Scope (Branch / Section)
              </label>
              <select
                value={audienceScope}
                onChange={(e) => setAudienceScope(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontWeight: 700,
                }}
              >
                <option value="CAMPUS"> Campus Wide (All Departments)</option>
                <option value="BRANCH"> Specific Branch (Department Only)</option>
                <option value="SECTION"> Specific Section Only</option>
              </select>
            </div>

            {audienceScope === "BRANCH" && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                  Select Target Branch
                </label>
                <select
                  value={selectedDeptId || ""}
                  onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: 8,
                    border: "1.5px solid var(--color-border)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                    fontWeight: 600,
                  }}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audienceScope === "SECTION" && (
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                  Select Target Section
                </label>
                <select
                  value={selectedSectionId || ""}
                  onChange={(e) => setSelectedSectionId(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: 8,
                    border: "1.5px solid var(--color-border)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                    fontWeight: 600,
                  }}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.course?.code || "Course"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
                PDF Circular Attachment URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://college.edu/circular.pdf"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Notice Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Schedule of Sessional-II Odd Semester 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>
              Notice Body / Instructions
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detailed instructions or description..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
              {publishing ? "Publishing..." : " Publish Notice Now"}
            </button>
          </div>
        </form>
      </div>

      {/* Published Notices List */}
      <div className="card">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>
           Published Circulars & Notices ({notices.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {notices.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "1rem",
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4, flexWrap: "wrap" }}>
                  <span className="badge" style={{ background: "#FFE4E6", color: "#E11D48", fontWeight: 800 }}>
                    {n.category}
                  </span>
                  <span className="badge" style={{ background: "var(--color-border)", color: "var(--color-text)", fontSize: "0.7rem" }}>
                    Role: {n.targetRole || "ALL"}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: n.audienceScope === "BRANCH" ? "#FEF3C7" : n.audienceScope === "SECTION" ? "#E0E7FF" : "#F3F4F6",
                      color: n.audienceScope === "BRANCH" ? "#92400E" : n.audienceScope === "SECTION" ? "#3730A3" : "#374151",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    {n.audienceScope === "BRANCH"
                      ? ` ${n.targetDeptName || "Branch"}`
                      : n.audienceScope === "SECTION"
                      ? ` ${n.targetSectionName || "Section"}`
                      : " Campus Wide"}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 style={{ margin: "4px 0", fontSize: "0.95rem", fontWeight: 800, color: "var(--color-text)" }}>
                  {n.title}
                </h4>
                <p className="text-xs text-muted" style={{ margin: "2px 0 0 0" }}>
                  {n.body}
                </p>
                {n.pdfUrl && (
                  <a
                    href={n.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 700, textDecoration: "none", display: "inline-block", marginTop: 4 }}
                  >
                     View PDF Attachment →
                  </a>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                <button
                  className={`btn btn--sm ${n.isActive ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => handleToggle(n.id)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "3px 8px",
                    background: n.isActive ? "var(--color-success)" : undefined,
                  }}
                >
                  {n.isActive ? "Active ✓" : "Hidden"}
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleDelete(n.id)}
                  style={{ fontSize: "0.75rem", padding: "3px 8px", color: "var(--color-danger)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
