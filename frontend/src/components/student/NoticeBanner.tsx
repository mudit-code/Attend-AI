import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Notice {
  id: number;
  title: string;
  body: string;
  category: string;
  pdfUrl: string | null;
  createdAt: string;
}

const CAT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  EXAM: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", icon: "" },
  FEE: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", icon: "" },
  HOLIDAY: { bg: "rgba(16,185,129,0.1)", text: "#10b981", icon: "" },
  EVENT: { bg: "rgba(99,102,241,0.1)", text: "#6366f1", icon: "" },
  DISCIPLINE: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", icon: "" },
  GENERAL: { bg: "rgba(107,114,128,0.1)", text: "#6b7280", icon: "" },
};

interface NoticeBannerProps {
  branchName?: string;
  sectionName?: string;
}

export default function NoticeBanner({ branchName, sectionName }: NoticeBannerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/notices")
      .then((res) => {
        const raw = res.data.data;
        if (Array.isArray(raw)) {
          const filtered = raw.filter((n: any) => {
            if (!n.audienceScope || n.audienceScope === 'CAMPUS') return true;
            if (n.audienceScope === 'BRANCH' && branchName) {
              return !n.targetDeptName || n.targetDeptName.toLowerCase().includes(branchName.toLowerCase()) || branchName.toLowerCase().includes(n.targetDeptName.toLowerCase());
            }
            if (n.audienceScope === 'SECTION' && sectionName) {
              return !n.targetSectionName || n.targetSectionName.toLowerCase().includes(sectionName.toLowerCase()) || sectionName.toLowerCase().includes(n.targetSectionName.toLowerCase());
            }
            return true;
          });
          setNotices(filtered.slice(0, 5));
          setCurrent(0);
        }
        setError(false);
      })
      .catch(() => {
        setNotices([]);
        setError(true);
      });
  }, [branchName, sectionName]);

  useEffect(() => {
    if (notices.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % notices.length), 5000);
    return () => clearInterval(timer);
  }, [notices]);

  if (notices.length === 0) {
    if (!error) return null;
    return <p className="alert alert--error" role="alert">Could not load notices from the server.</p>;
  }

  const notice = notices[current];
  const colors = CAT_COLORS[notice.category] ?? CAT_COLORS.GENERAL;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${colors.text}44`, marginBottom: "1rem", overflow: "hidden", background: colors.bg }}>
      <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>{colors.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {notice.title}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
              {notice.category} · {new Date(notice.createdAt).toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          {notices.length > 1 && (
            <div style={{ display: "flex", gap: 3 }}>
              {notices.map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === current ? colors.text : `${colors.text}44`, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setCurrent(i); }} />
              ))}
            </div>
          )}
          <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0.75rem 1rem", borderTop: `1px solid ${colors.text}22` }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text)", lineHeight: 1.5 }}>{notice.body}</p>
          {notice.pdfUrl && (
            <a href={notice.pdfUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: "0.8rem", color: colors.text, fontWeight: 600, textDecoration: "none" }}>
               Download PDF →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
