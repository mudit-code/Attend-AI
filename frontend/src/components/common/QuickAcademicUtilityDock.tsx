import { useState, useEffect } from 'react';

export default function QuickAcademicUtilityDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calc' | 'notes'>('calc');

  // Quick Calculator
  const [held, setHeld] = useState<number>(44);
  const [attended, setAttended] = useState<number>(33);
  const [target, setTarget] = useState<number>(75);

  // Scratchpad
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem('attendai_academic_notes') || '• Submit internal marks by Friday\n• Verify medical leave certificate for roll 2101640100015\n• Extra lecture on Cloud Computing scheduled for Monday 10 AM';
  });

  useEffect(() => {
    localStorage.setItem('attendai_academic_notes', notes);
  }, [notes]);

  const currentPercent = held > 0 ? ((attended / held) * 100).toFixed(1) : '100.0';
  const needed = Math.max(0, Math.ceil((target * held) / 100) - attended);
  const canBunk = Math.max(0, Math.floor((attended - (target * held) / 100) / (target / 100)));

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="quick-dock-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9000,
          background: 'var(--color-primary)',
          color: '#FFF',
          border: 'none',
          borderRadius: '50px',
          padding: '0.65rem 1.1rem',
          boxShadow: '0 8px 24px var(--color-primary-glow)',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          transition: 'all 0.2s ease',
        }}
        title="Open Academic Quick Calculator & Scratchpad (Inspired by University-Management-System)"
      >
        <span>🧮</span>
        <span>{isOpen ? 'Close Utility' : 'Quick Utility'}</span>
      </button>

      {/* Popover Window */}
      {isOpen && (
        <div
          className="card"
          style={{
            position: 'fixed',
            bottom: '4.75rem',
            right: '1.5rem',
            width: 340,
            zIndex: 9001,
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-float)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-strong)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>🛠️</span> Academic Utilities
            </strong>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          </div>

          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem', background: 'var(--color-surface-2)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('calc')}
              style={{
                flex: 1,
                padding: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: activeTab === 'calc' ? '#FFF' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: activeTab === 'calc' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              🧮 Calculator
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                flex: 1,
                padding: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: activeTab === 'notes' ? '#FFF' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: activeTab === 'notes' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              📝 Scratchpad
            </button>
          </div>

          {/* TAB 1: CALCULATOR */}
          {activeTab === 'calc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 600 }}>Total Held</label>
                  <input
                    type="number"
                    value={held}
                    onChange={(e) => setHeld(Math.max(1, Number(e.target.value)))}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 600 }}>Attended</label>
                  <input
                    type="number"
                    value={attended}
                    onChange={(e) => setAttended(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 600 }}>Target Threshold: {target}%</label>
                <input
                  type="range"
                  min={50}
                  max={90}
                  step={5}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                />
              </div>

              {/* Result Pill */}
              <div
                style={{
                  background: Number(currentPercent) >= target ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${Number(currentPercent) >= target ? '#A7F3D0' : '#FECACA'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Current Status:</div>
                <strong style={{ fontSize: '1.25rem', color: Number(currentPercent) >= target ? '#065F46' : '#991B1B' }}>
                  {currentPercent}%
                </strong>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: Number(currentPercent) >= target ? '#047857' : '#B91C1C' }}>
                  {Number(currentPercent) >= target
                    ? `Safe! You can safely miss ${canBunk} classes.`
                    : `Shortage! Attend next ${needed} classes to reach ${target}%.`}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCRATCHPAD */}
          {activeTab === 'notes' && (
            <div>
              <textarea
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type quick memos, room changes, or student notes..."
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  resize: 'none',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.35rem' }}>
                ✓ Auto-saved to browser local storage.
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
