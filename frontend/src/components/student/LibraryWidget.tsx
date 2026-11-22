import { useState, useEffect } from "react";
import { api } from "../../lib/api";

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

  useEffect(() => {
    api.get("/library/my")
      .then((res) => setData(res.data.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.books.length === 0) return null;

  const activeBooks = data.books.filter((b) => !b.returnedAt);

  return (
    <div style={{ background: "var(--color-surface)", borderRadius: 16, border: `1px solid ${data.totalFine > 0 ? "#ef4444" : "var(--color-border)"}`, marginBottom: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

          <div>
            <div style={{ fontWeight: 700, color: "var(--color-text)" }}>Library</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{data.activeBooks} book{data.activeBooks !== 1 ? "s" : ""} issued</div>
          </div>
        </div>
        {data.totalFine > 0 && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 10, padding: "4px 10px", fontSize: "0.8rem", color: "#ef4444", fontWeight: 700 }}>
            ₹{data.totalFine.toFixed(0)} fine
          </div>
        )}
      </div>
      <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {activeBooks.map((book) => (
          <div key={book.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: book.isOverdue ? "rgba(239,68,68,0.06)" : "var(--color-bg)", borderRadius: 8, border: book.isOverdue ? "1px solid #ef444433" : "none" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>{book.bookTitle}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>Due: {new Date(book.dueDate).toLocaleDateString("en-IN")}</div>
            </div>
            {book.isOverdue ? (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 700 }}>{book.daysOverdue} days overdue</div>
                <div style={{ fontSize: "0.7rem", color: "#ef4444" }}>₹{book.fine.toFixed(0)} fine</div>
              </div>
            ) : (
              <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 600 }}>On time ✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
