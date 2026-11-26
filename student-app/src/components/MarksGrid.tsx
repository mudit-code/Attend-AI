import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';

interface Mark {
  id: number;
  markType: string;
  marks: number;
  maxMarks: number;
  status: string;
}

interface SubjectMarks {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  marks: Mark[];
}

const MARK_TYPES = ['ASSIGNMENT_1', 'ASSIGNMENT_2', 'SESSIONAL_1', 'SESSIONAL_2', 'VIVA', 'PRACTICAL'];
const MARK_LABELS: Record<string, string> = {
  ASSIGNMENT_1: 'A1',
  ASSIGNMENT_2: 'A2',
  SESSIONAL_1: 'S1',
  SESSIONAL_2: 'S2',
  VIVA: 'Viva',
  PRACTICAL: 'Prac',
};

export default function MarksGrid() {
  const [data, setData] = useState<SubjectMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('/marks/my')
      .then((res) => setData(res.data.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error || data.length === 0) return null;

  const getMark = (subject: SubjectMarks, type: string) => {
    return subject.marks.find((m) => m.markType === type);
  };

  const getTotal = (subject: SubjectMarks) => {
    return subject.marks.reduce((s, m) => s + m.marks, 0);
  };

  const getMaxTotal = (subject: SubjectMarks) => {
    return subject.marks.reduce((s, m) => s + m.maxMarks, 0);
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl, 20px)',
        border: '1px solid var(--color-border, #E2E8F0)',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              Internal & Sessional Marks
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
              {data.length} enrolled course{data.length !== 1 ? 's' : ''} assessed
            </div>
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted, #64748B)',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border, #E2E8F0)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--color-text-muted, #64748B)', fontWeight: 700, borderRadius: '6px 0 0 6px' }}>Subject</th>
                {MARK_TYPES.map((t) => (
                  <th key={t} style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>
                    {MARK_LABELS[t]}
                  </th>
                ))}
                <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-muted, #64748B)', fontWeight: 700, borderRadius: '0 6px 6px 0' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((sub) => {
                const total = getTotal(sub);
                const maxTotal = getMaxTotal(sub);
                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                const rowColor = pct >= 60 ? '#047857' : pct >= 40 ? '#B45309' : '#DC2626';

                return (
                  <tr key={sub.subjectId} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary, #0F172A)' }}>{sub.subjectCode}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted, #64748B)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sub.subjectName}
                      </div>
                    </td>
                    {MARK_TYPES.map((t) => {
                      const m = getMark(sub, t);
                      return (
                        <td key={t} style={{ padding: '6px 4px', textAlign: 'center' }}>
                          {m ? (
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--color-primary, #0F172A)' }}>{m.marks}</span>
                              <span style={{ color: 'var(--color-text-muted, #64748B)', fontSize: '9px' }}>/{m.maxMarks}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, color: rowColor }}>
                        {total}/{maxTotal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
