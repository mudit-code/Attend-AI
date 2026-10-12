import { useState } from "react";
import { api } from "../../lib/api";

const CATEGORIES = ["ATTENDANCE", "MARKS", "BEHAVIOR", "FACILITIES", "OTHER"] as const;

export default function GrievanceButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("ATTENDANCE");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) return;
    setSubmitting(true);
    try {
      await api.post("/grievances", { title, description, category, isAnonymous });
      setSuccess(true);
      setTimeout(() => { setOpen(false); setSuccess(false); setTitle(""); setDescription(""); }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1rem", background: "rgba(107,114,128,0.1)", border: "1px solid var(--color-border)", borderRadius: 10, cursor: "pointer", color: "var(--color-text)", fontSize: "0.85rem", fontWeight: 600, width: "100%" }}>
        <span>📮</span> File Grievance
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 20, padding: "1.5rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-text)" }}>📮 File a Grievance</div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1.25rem" }}>✕</button>
            </div>
            {success ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#10b981" }}>
                <div style={{ fontSize: "2rem" }}>✅</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>Grievance Submitted!</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 4 }}>HOD will review it shortly.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: "0.9rem" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>Subject</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wrong absent on 10th Oct AI lecture" style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: "0.9rem", boxSizing: "border-box" }} required />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", display: "block", marginBottom: 4 }}>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe your issue in detail..." style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }} required />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer", color: "var(--color-text)" }}>
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  Submit anonymously
                </label>
                <button type="submit" disabled={submitting} style={{ padding: "0.75rem", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Submitting..." : "Submit Grievance"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
