import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Bell, Download, ChevronRight, ChevronLeft } from 'lucide-react';

interface Notice {
  id: number;
  title: string;
  body: string;
  category: string;
  pdfUrl: string | null;
  createdAt: string;
}

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  EXAM: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  FEE: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  HOLIDAY: { bg: '#F0FDF4', text: '#047857', border: '#BBF7D0' },
  EVENT: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
  DISCIPLINE: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  GENERAL: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
};

interface NoticeBannerProps {
  branchName?: string;
  sectionName?: string;
}

export default function NoticeBanner({ branchName, sectionName }: NoticeBannerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api
      .get('/notices')
      .then((res) => {
        const raw = res.data.data;
        if (Array.isArray(raw)) {
          const filtered = raw.filter((n: any) => {
            if (!n.audienceScope || n.audienceScope === 'CAMPUS') return true;
            if (n.audienceScope === 'BRANCH' && branchName) {
              return (
                !n.targetDeptName ||
                n.targetDeptName.toLowerCase().includes(branchName.toLowerCase()) ||
                branchName.toLowerCase().includes(n.targetDeptName.toLowerCase())
              );
            }
            if (n.audienceScope === 'SECTION' && sectionName) {
              return (
                !n.targetSectionName ||
                n.targetSectionName.toLowerCase().includes(sectionName.toLowerCase()) ||
                sectionName.toLowerCase().includes(n.targetSectionName.toLowerCase())
              );
            }
            return true;
          });
          setNotices(filtered.slice(0, 6));
          setCurrent(0);
        }
      })
      .catch(() => {
        setNotices([]);
      });
  }, [branchName, sectionName]);

  useEffect(() => {
    if (notices.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % notices.length), 6000);
    return () => clearInterval(timer);
  }, [notices]);

  if (notices.length === 0) return null;

  const notice = notices[current];
  const colors = CAT_COLORS[notice.category] ?? CAT_COLORS.GENERAL;

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg, 16px)',
        border: `1.5px solid ${colors.border}`,
        marginBottom: '16px',
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: colors.bg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <Bell size={16} color={colors.text} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: '13px',
                color: 'var(--color-primary, #0F172A)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {notice.title}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', marginTop: '1px', fontWeight: 600 }}>
              <span style={{ color: colors.text, fontWeight: 700 }}>{notice.category}</span> •{' '}
              {new Date(notice.createdAt).toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
          {notices.length > 1 && (
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent((c) => (c - 1 + notices.length) % notices.length);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: colors.text }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent((c) => (c + 1) % notices.length);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: colors.text }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${colors.border}`, background: '#FFFFFF' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-primary, #0F172A)', lineHeight: '1.5' }}>
            {notice.body}
          </p>
          {notice.pdfUrl && (
            <a
              href={notice.pdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '10px',
                fontSize: '11px',
                color: '#4F46E5',
                fontWeight: 700,
                textDecoration: 'none',
                background: '#EEF2FF',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              <Download size={12} />
              <span>Download Official Notice PDF</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
