import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Briefcase, Calendar, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Drive {
  id: number;
  companyName: string;
  driveDate: string;
  minAttendance: number;
  eligibleBranches: string[];
  description: string | null;
  registrationDeadline: string | null;
}

interface EligibilityData {
  isEligible: boolean;
  currentAttendance?: number;
  reasons?: string[];
}

export default function PlacementWidget() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [eligibility, setEligibility] = useState<Record<number, EligibilityData>>({});
  const [registering, setRegistering] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    api
      .get('/placement/drives')
      .then(async (res) => {
        const driveList: Drive[] = res.data.data ?? [];
        setDrives(driveList);
        const elig: Record<number, EligibilityData> = {};
        await Promise.all(
          driveList.slice(0, 5).map(async (d) => {
            try {
              const e = await api.get(`/placement/drives/${d.id}/eligibility`);
              elig[d.id] = e.data.data;
            } catch {
              // ignore
            }
          })
        );
        setEligibility(elig);
      })
      .catch(() => {
        setDrives([]);
        setEligibility({});
      });
  }, []);

  if (drives.length === 0) return null;

  async function handleRegister(driveId: number) {
    setRegistering(driveId);
    try {
      await api.post(`/placement/drives/${driveId}/register`, {});
      alert('Application submitted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setRegistering(null);
    }
  }

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
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Briefcase size={18} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)' }}>
              Campus Placement & Drives
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
              {drives.length} recruitment drive{drives.length !== 1 ? 's' : ''} active
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
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border, #E2E8F0)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {drives.slice(0, 4).map((drive) => {
            const e = eligibility[drive.id];
            const isEligible = e?.isEligible;

            return (
              <div
                key={drive.id}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: isEligible === true ? '#F0FDF4' : isEligible === false ? '#FEF2F2' : '#F8FAFC',
                  border: `1px solid ${isEligible === true ? '#BBF7D0' : isEligible === false ? '#FECACA' : '#E2E8F0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-primary, #0F172A)' }}>
                      {drive.companyName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} />
                      <span>{new Date(drive.driveDate).toLocaleDateString('en-IN')}</span>
                      <span>• Min {drive.minAttendance}% attendance</span>
                    </div>

                    {e && isEligible && (
                      <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} />
                        <span>Eligible ({e.currentAttendance}% attendance)</span>
                      </div>
                    )}
                    {e && !isEligible && e.reasons && e.reasons.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        <span>{e.reasons[0]}</span>
                      </div>
                    )}
                  </div>

                  {isEligible && (
                    <button
                      onClick={() => handleRegister(drive.id)}
                      disabled={registering === drive.id}
                      style={{
                        background: 'var(--color-primary, #0F172A)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {registering === drive.id ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
