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

interface EmergencyContact {
  name: string;
  type: string;
  phone: string;
  available?: string;
}

export default function CampusDispensaryDesk() {
  const [activeTab, setActiveTab] = useState<'consultations' | 'pharmacy' | 'emergency'>('consultations');
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  // New Consultation Form
  const [rollNo, setRollNo] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDispensaryData();
  }, []);

  async function loadDispensaryData() {
    try {
      const res = await api.get('/dispensary/consultations');
      setConsultations(res.data?.data ?? []);
      const stockRes = await api.get('/dispensary/stock');
      setMedicines(stockRes.data?.data ?? []);
      const contactsRes = await api.get('/dispensary/emergency-directory');
      setEmergencyContacts(contactsRes.data?.data ?? []);
      setError('');
    } catch (requestError: any) {
      setConsultations([]);
      setMedicines([]);
      setEmergencyContacts([]);
      setError(requestError.response?.data?.error?.message || 'Could not load dispensary data.');
    }
  }

  async function handleLogConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!rollNo.trim() || !doctorName.trim() || !diagnosis.trim()) {
      setError('Student roll number, attending clinician, and diagnosis are required.');
      return;
    }

    try {
      const { data } = await api.post('/dispensary/consultation/log', {
        studentRollNo: rollNo.trim(),
        doctorName: doctorName.trim(),
        diagnosis: diagnosis.trim(),
        medicinesPrescribed: prescriptions.trim(),
      });
      setConsultations((previous) => [data.data, ...previous]);
      setRollNo('');
      setDoctorName('');
      setDiagnosis('');
      setPrescriptions('');
      setError('');
      setToast(`Consultation recorded for roll number ${data.data.studentRollNo}.`);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error?.message || 'Could not record this consultation.');
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
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
             Campus Medical Dispensary & Student Health Center
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
            Campus dispensary
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
      {error && <p role="alert" className="alert alert--error">{error}</p>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('consultations')}
          className={`btn btn--sm ${activeTab === 'consultations' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontWeight: 700 }}
        >
           Clinical Consultation Ledger ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab('pharmacy')}
          className={`btn btn--sm ${activeTab === 'pharmacy' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontWeight: 700 }}
        >
           Pharmacy & First-Aid Stock ({medicines.length})
        </button>
        <button
          onClick={() => setActiveTab('emergency')}
          className={`btn btn--sm ${activeTab === 'emergency' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontWeight: 700 }}
        >
           Emergency Referral Directory
        </button>
      </div>

      {/* TAB 1: CONSULTATIONS */}
      {activeTab === 'consultations' && (
        <div>
          {/* Quick Consultation Form */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
               Log Campus Patient Consultation
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
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Attending Clinician *
                </label>
                <input
                  type="text"
                  placeholder="Clinician name"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
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
                  required
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
                          {isLow ? ' Low Stock (Reorder)' : '✓ In Stock'}
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
        <div>
          {emergencyContacts.length === 0 ? (
            <p className="text-muted">No verified emergency contacts have been configured.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {emergencyContacts.map((contact) => (
                <div key={`${contact.type}-${contact.name}-${contact.phone}`} className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{contact.name}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{contact.type}{contact.available ? ` · ${contact.available}` : ''}</p>
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
