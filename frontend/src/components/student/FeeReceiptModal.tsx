interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  rollNo?: string;
}

export default function FeeReceiptModal({
  isOpen,
  onClose,
  studentName = 'Aman Kumar',
  rollNo = '2101640100015',
}: FeeReceiptModalProps) {
  if (!isOpen) return null;

  const feeItems = [
    { head: 'Semester Academic Tuition Fee (Even Sem)', amount: 48500, status: 'PAID' },
    { head: 'AKTU Examination & Enrollment Fee', amount: 7500, status: 'PAID' },
    { head: 'High-Performance Computer Lab Consumables', amount: 3000, status: 'PAID' },
    { head: 'Digital Library & IEEE E-Journals Access', amount: 2000, status: 'PAID' },
    { head: 'Hostel & Mess Maintenance Clearance', amount: 24000, status: 'PAID' },
    { head: 'Late Submission Fine (Condonation Granted)', amount: 0, status: 'WAIVED' },
  ];

  const totalPaid = feeItems.reduce((acc, f) => acc + f.amount, 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card modal-responsive"
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-float)',
          padding: 'clamp(1rem, 2.5vw, 1.75rem)',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Receipt Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--color-border-strong)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '1px' }}>
            KANPUR INSTITUTE OF TECHNOLOGY • FINANCE & ACCOUNTS DEPARTMENT
          </div>
          <h2 style={{ fontSize: '1.35rem', margin: '0.25rem 0', fontWeight: 800, color: 'var(--color-text)' }}>
            Official Institutional Fee Payment Receipt
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Receipt No: <strong style={{ color: 'var(--color-text)' }}>KIT/REC/2026/08914</strong> • Date: 12-Oct-2026
          </p>
        </div>

        {/* Student & Payment Meta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
            background: 'var(--color-surface-2)',
            padding: '0.875rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>STUDENT NAME</span>
            <strong style={{ color: 'var(--color-text)' }}>{studentName}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>ROLL NUMBER</span>
            <strong style={{ color: 'var(--color-text)' }}>{rollNo}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>PAYMENT REFERENCE</span>
            <strong style={{ color: 'var(--color-text)' }}>UPI/KIT/9981240182</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>CLEARANCE STATUS</span>
            <strong style={{ color: 'var(--color-success)' }}>✓ FULLY CLEARED (NIL DUES)</strong>
          </div>
        </div>

        {/* Fee Heads Breakdown */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.65rem 0.75rem' }}>Fee Description / Account Head</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Amount (INR)</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {feeItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.65rem 0.75rem' }}>{item.head}</td>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>
                    ₹ {item.amount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-pill)',
                        background: item.status === 'PAID' ? '#ECFDF5' : '#EFF6FF',
                        color: item.status === 'PAID' ? '#059669' : '#2563EB',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--color-surface-2)', fontWeight: 800 }}>
                <td style={{ padding: '0.75rem' }}>Total Amount Paid</td>
                <td style={{ padding: '0.75rem', fontSize: '1rem', color: 'var(--color-text)' }}>
                  ₹ {totalPaid.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-success)' }}>
                  ✓ PAID IN FULL
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verification Footer */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
            marginBottom: '1.25rem',
            fontSize: '0.78rem',
            color: '#166534',
            lineHeight: 1.45,
          }}
        >
          🔒 This e-receipt is cryptographically authenticated by KIT Accounts Office. It grants unconditional clearance for AKTU End-Semester Admit Card release and No-Dues certification.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn btn--ghost" style={{ flex: 1 }}>
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn--primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            🖨️ Print / Download Paid Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
