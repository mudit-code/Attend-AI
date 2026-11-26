import { useState, useEffect } from 'react';
import { Calculator, FileText, X, Sparkles } from 'lucide-react';

export default function QuickAcademicUtilityDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calc' | 'notes'>('calc');

  // Quick Calculator State
  const [held, setHeld] = useState<number>(0);
  const [attended, setAttended] = useState<number>(0);
  const [target, setTarget] = useState<number>(75);

  // Auto-saving Scratchpad State
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem('attendai_student_pwa_notes') || '';
  });

  useEffect(() => {
    localStorage.setItem('attendai_student_pwa_notes', notes);
  }, [notes]);

  const currentPercent = held > 0 && attended <= held ? (attended / held) * 100 : null;
  const needed = currentPercent === null ? 0 : Math.max(0, Math.ceil((target * held) / 100) - attended);
  const canBunk =
    currentPercent === null ? 0 : Math.max(0, Math.floor((attended - (target * held) / 100) / (target / 100)));
  const meetsTarget = currentPercent !== null && currentPercent >= target;

  return (
    <>
      {/* Floating Action Button Docked above Mobile Bottom Nav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '76px',
          right: '16px',
          zIndex: 80,
          background: 'var(--color-primary, #0F172A)',
          color: '#FFFFFF',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50px',
          padding: '8px 14px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.3)',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
        }}
        title="Quick Academic Utilities & Scratchpad"
      >
        <Sparkles size={14} color="#F59E0B" />
        <span>{isOpen ? 'Close' : 'Quick Utility'}</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '124px',
            right: '16px',
            width: 'calc(100vw - 32px)',
            maxWidth: '340px',
            zIndex: 85,
            background: '#FFFFFF',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
            padding: '16px',
            borderRadius: 'var(--radius-xl, 20px)',
            border: '1px solid var(--color-border, #E2E8F0)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calculator size={16} color="var(--color-accent, #F59E0B)" />
              <span>Academic Utilities</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #64748B)' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('calc')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 700,
                background: activeTab === 'calc' ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: activeTab === 'calc' ? 'var(--color-primary, #0F172A)' : 'var(--color-text-muted, #64748B)',
                boxShadow: activeTab === 'calc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Calculator size={13} />
              <span>Bunk Goal Calc</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 700,
                background: activeTab === 'notes' ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: activeTab === 'notes' ? 'var(--color-primary, #0F172A)' : 'var(--color-text-muted, #64748B)',
                boxShadow: activeTab === 'notes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <FileText size={13} />
              <span>Memo Scratchpad</span>
            </button>
          </div>

          {/* TAB 1: CALCULATOR */}
          {activeTab === 'calc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--color-text-muted, #64748B)', display: 'block', fontWeight: 700, marginBottom: '2px' }}>
                    Total Held
                  </label>
                  <input
                    type="number"
                    value={held || ''}
                    min={0}
                    placeholder="e.g. 40"
                    onChange={(e) => setHeld(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border, #E2E8F0)', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--color-text-muted, #64748B)', display: 'block', fontWeight: 700, marginBottom: '2px' }}>
                    Attended
                  </label>
                  <input
                    type="number"
                    value={attended || ''}
                    min={0}
                    max={held || undefined}
                    placeholder="e.g. 32"
                    onChange={(e) => setAttended(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border, #E2E8F0)', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted, #64748B)', fontWeight: 700, marginBottom: '2px' }}>
                  <span>Target Threshold</span>
                  <span>{target}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary, #0F172A)' }}
                />
              </div>

              {currentPercent !== null && (
                <div
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: meetsTarget ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${meetsTarget ? '#BBF7D0' : '#FECACA'}`,
                    fontSize: '11px',
                    lineHeight: '1.4',
                  }}
                >
                  <div style={{ fontWeight: 800, color: meetsTarget ? '#047857' : '#DC2626', marginBottom: '2px' }}>
                    Current: {currentPercent.toFixed(1)}% {meetsTarget ? '✓ Safe' : '⚠ Below Target'}
                  </div>
                  <div style={{ color: meetsTarget ? '#15803D' : '#B91C1C' }}>
                    {meetsTarget
                      ? `You can safely bunk ${canBunk} lecture${canBunk !== 1 ? 's' : ''} and still maintain ${target}%.`
                      : `Must attend next ${needed} consecutive lecture${needed !== 1 ? 's' : ''} to recover.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCRATCHPAD */}
          {activeTab === 'notes' && (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Draft lecture notes, questions for faculty, or to-dos (auto-saved locally)..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #E2E8F0)',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted, #64748B)', marginTop: '4px', textAlign: 'right', fontWeight: 600 }}>
                Saved locally to browser
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
