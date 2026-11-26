import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { BookOpen, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface Book {
  id: number;
  bookTitle: string;
  bookCode: string;
  issuedAt: string;
  dueDate: string;
  returnedAt: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  fine: number;
}

interface LibraryData {
  activeBooks: number;
  totalFine: number;
  books: Book[];
}

export default function LibraryWidget() {
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    api
      .get('/library/my')
      .then((res) => setData(res.data.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.books.length === 0) return null;

  const activeBooks = data.books.filter((b) => !b.returnedAt);

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl, 20px)',
        border: `1.5px solid ${data.totalFine > 0 ? '#FECACA' : 'var(--color-border, #E2E8F0)'}`,
        padding: '16px',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
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
              background: data.totalFine > 0 ? '#FEF2F2' : '#F8FAFC',
              color: data.totalFine > 0 ? '#DC2626' : 'var(--color-primary, #0F172A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              Central Library Desk
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
              {data.activeBooks} active book{data.activeBooks !== 1 ? 's' : ''} issued
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {data.totalFine > 0 && (
            <span
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '3px 8px',
                fontSize: '11px',
                color: '#DC2626',
                fontWeight: 700,
              }}
            >
              ₹{data.totalFine.toFixed(0)} Fine
            </span>
          )}
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted, #64748B)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border, #E2E8F0)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeBooks.map((book) => (
            <div
              key={book.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: book.isOverdue ? '#FEF2F2' : '#F8FAFC',
                borderRadius: '10px',
                border: `1px solid ${book.isOverdue ? '#FECACA' : '#E2E8F0'}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary, #0F172A)' }}>
                  {book.bookTitle}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', marginTop: '2px', fontWeight: 500 }}>
                  Code: {book.bookCode} • Due: {new Date(book.dueDate).toLocaleDateString('en-IN')}
                </div>
              </div>

              {book.isOverdue ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <AlertCircle size={12} />
                    <span>{book.daysOverdue}d overdue</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>
                    ₹{book.fine.toFixed(0)} fine
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                  <CheckCircle2 size={13} />
                  <span>On time</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
