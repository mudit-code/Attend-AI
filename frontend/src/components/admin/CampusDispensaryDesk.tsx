import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface ConsultationRecord {
  id: number;
  studentRollNo: string;
  studentName: string;
  doctorName: string;
  diagnosis: string;
  medicinesPrescribed: string;
  visitDate: string;
}

interface MedicineItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  usageDirections: string;
  reorderThreshold: number;
}

const DEFAULT_CONSULTATIONS: ConsultationRecord[] = [
  {
    id: 1,
    studentRollNo: '2101640100015',
    studentName: 'Aman Kumar',
    doctorName: 'Dr. K. P. Singh (Campus CMO)',
    diagnosis: 'Acute Viral Pharyngitis & High Fever (102°F)',
    medicinesPrescribed: 'Paracetamol 650mg (1x3), Azithromycin 500mg (1xOD), ORS Electral',
    visitDate: '2026-10-11 10:15 AM',
  },
  {
    id: 2,
    studentRollNo: '2101640100018',
    studentName: 'Muskan Gupta',
    doctorName: 'Dr. Neha Saxena (Medical Officer)',
    diagnosis: 'Severe Migraine Headache & Visual Strain',
    medicinesPrescribed: 'Naproxen 250mg, Eye Lubricant Drops, Rest advisory',
    visitDate: '2026-10-09 02:40 PM',
  },
  {
    id: 3,
    studentRollNo: '2101640100019',
    studentName: 'Prashant Shukla',
    doctorName: 'Dr. K. P. Singh (Campus CMO)',
    diagnosis: 'Sports Injury: Right Ankle Ligament Sprain',
    medicinesPrescribed: 'Aceclofenac + Paracetamol, Crepe Bandage, Ice compress',
    visitDate: '2026-10-06 04:20 PM',
  },
];

const DEFAULT_MEDICINES: MedicineItem[] = [
  { id: 1, name: 'Paracetamol 650mg', quantity: 240, unit: 'Tablets', usageDirections: '1 tab after meals for fever/pain', reorderThreshold: 50 },
  { id: 2, name: 'Azithromycin 500mg', quantity: 60, unit: 'Tablets', usageDirections: '1 tab daily for 3 days post meal', reorderThreshold: 30 },
  { id: 3, name: 'ORS Sachet (Electral)', quantity: 18, unit: 'Packets', usageDirections: 'Dissolve in 1 liter clean water', reorderThreshold: 25 },
  { id: 4, name: 'Betadine Ointment 10%', quantity: 12, unit: 'Tubes', usageDirections: 'Apply topically on abrasions & wounds', reorderThreshold: 10 },
  { id: 5, name: 'Cetirizine 10mg', quantity: 150, unit: 'Tablets', usageDirections: '1 tab at night for allergy/cold', reorderThreshold: 40 },
  { id: 6, name: 'Crepe Bandage (10cm)', quantity: 8, unit: 'Rolls', usageDirections: 'Supportive dressing for sprains', reorderThreshold: 15 },
];

export default function CampusDispensaryDesk() {
  const [activeTab, setActiveTab] = useState<'consultations' | 'pharmacy' | 'emergency'>('consultations');
  const [consultations, setConsultations] = useState<ConsultationRecord[]>(DEFAULT_CONSULTATIONS);
  const [medicines, setMedicines] = useState<MedicineItem[]>(DEFAULT_MEDICINES);

  // New Consultation Form
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadDispensaryData();
  }, []);

  async function loadDispensaryData() {
    try {
      const res = await api.get('/dispensary/consultations');
      if (res.data?.data && res.data.data.length > 0) {
        setConsultations(res.data.data);
      }
      const stockRes = await api.get('/dispensary/stock');
      if (stockRes.data?.data && stockRes.data.data.length > 0) {
        setMedicines(stockRes.data.data);
      }
    } catch {
      // offline fallback
    }
  }

  function handleLogConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!rollNo || !diagnosis) {
      alert('Please fill in Roll No and Diagnosis');
      return;
    }

    const newRecord: ConsultationRecord = {
      id: Date.now(),
      studentRollNo: rollNo,
      studentName: studentName || 'Enrolled Student',
      doctorName: 'Dr. K. P. Singh (Campus CMO)',
      diagnosis,
      medicinesPrescribed: prescriptions || 'First Aid & Supportive Care',
      visitDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    setConsultations([newRecord, ...consultations]);
    setRollNo('');
    setStudentName('');
    setDiagnosis('');
    setPrescriptions('');
    setToast(`✓ Clinical consultation recorded for Roll No ${newRecord.studentRollNo}!`);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div>
      {/* Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #FFF0EE 0%, #FFFFFF 100%)',
          border: '1px solid var(--color-border-strong)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>
            🏥 Campus Medical Dispensary & Student Health Center
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Clinical consultation logs, institutional pharmacy inventory, and medical leave verification (Inspired by public_dispensary_system)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="badge"
            style={{
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              fontSize: '0.82rem',
            }}
          >
            ● CMO Dr. K. P. Singh on Campus Duty
          </span>
        </div>
      </div>

      {toast && (
        <div
          style={{
            background: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('consultations')}
          className={`btn btn--sm ${activeTab === 'consultations' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontWeight: 700 }}
        >
          📋 Clinical Consultation Ledger ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab('pharmacy')}
          className={`btn btn--sm ${activeTab === 'pharmacy' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontWeight: 700 }}
        >
          💊 Pharmacy & First-Aid Stock ({medicines.length})
        </button>
        <button
          onClick={() => setActiveTab('emergency')}
          className={`btn btn--sm ${activeTab === 'emergency' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontWeight: 700 }}
        >
          🚑 Emergency Referral Directory
        </button>
      </div>

      {/* TAB 1: CONSULTATIONS */}
      {activeTab === 'consultations' && (
        <div>
          {/* Quick Consultation Form */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>➕</span> Log Campus Patient Consultation
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Record diagnosis and medication. Generates institutional proof for student medical leave validation.
            </p>

            <form onSubmit={handleLogConsultation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Student Roll Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2101640100015"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Student Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aman Kumar"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acute Gastroenteritis, Dehydration"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Medicines Prescribed & Advice
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORS, Paracetamol, 2 days bed rest"
                  value={prescriptions}
                  onChange={(e) => setPrescriptions(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn--primary" style={{ width: '100%', padding: '0.65rem' }}>
                  Save Consultation Record
                </button>
              </div>
            </form>
          </div>

          {/* Consultation History Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.95rem' }}>Dispensary Patient Register</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                {consultations.length} total logged visits
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Visit Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Patient / Roll No</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Attending Physician</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Clinical Diagnosis</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Dispensed Medicines</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Leave Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                        {c.visitDate}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ display: 'block', color: 'var(--color-text)' }}>{c.studentName}</strong>
                        <span style={{ fontSize: '0.73rem', color: 'var(--color-primary)', fontWeight: 600 }}>{c.studentRollNo}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c.doctorName}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 220 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.diagnosis}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 260 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{c.medicinesPrescribed}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <span
                          className="badge"
                          style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: '0.72rem' }}
                        >
                          ✓ Clinic Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PHARMACY STOCK */}
      {activeTab === 'pharmacy' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem' }}>Campus Pharmacy Inventory</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Stock monitoring & depletion alerts
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Medicine Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Available Quantity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Usage / Directions</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reorder Threshold</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Stock Level</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const isLow = m.quantity <= m.reorderThreshold;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ color: 'var(--color-text)' }}>{m.name}</strong>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ fontSize: '1rem', color: isLow ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {m.quantity} {m.unit}
                        </strong>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                        {m.usageDirections}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        Min {m.reorderThreshold} {m.unit}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <span
                          className="badge"
                          style={{
                            background: isLow ? '#FEF2F2' : '#ECFDF5',
                            color: isLow ? '#DC2626' : '#059669',
                            border: `1px solid ${isLow ? '#FECACA' : '#A7F3D0'}`,
                            fontSize: '0.72rem',
                          }}
                        >
                          {isLow ? '⚠️ Low Stock (Reorder)' : '✓ In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY DIRECTORY */}
      {activeTab === 'emergency' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-danger)' }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.5rem' }}>🚑</span>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Campus 24x7 Ambulance</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
              Stationed at Main Administrative Block Porch for immediate hospital transfer.
            </p>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-danger)' }}>
              📞 +91 94150 00108
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.5rem' }}>🏥</span>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Campus Dispensary Emergency Cell</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
              Ground Floor, Boys Hostel Block C. Timings: 08:00 AM - 10:00 PM.
            </p>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              📞 0512-2580100
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.5rem' }}>🏨</span>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>Regency Hospital Kanpur</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
              Empanelled Super-Speciality Hospital (4.2 km from campus).
            </p>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>
              📞 0512-3081111
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563EB' }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.5rem' }}>❤️</span>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>LPS Institute of Cardiology</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
              Specialised Cardiac & ICU Care (6.8 km from campus).
            </p>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1D4ED8' }}>
              📞 0512-2534505
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
