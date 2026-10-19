import { useState, useEffect, useCallback } from 'react';

interface Props {
  sessionId: string | null;
  qrToken: string;
  secondsLeft: number;
  scannedCount: number;
  totalStudents: number;
  subjectName: string;
  subjectCode: string;
  sectionName: string;
  period: number;
  date: string;
  onExit: () => void;
}

// Simple QR code display using data URI (qrcode.js would be used in production)
// We display the token prominently for classroom use
export default function ProjectorQRMode({
  sessionId,
  qrToken,
  secondsLeft,
  scannedCount,
  totalStudents,
  subjectName,
  subjectCode,
  sectionName,
  period,
  date,
  onExit,
}: Props) {
  const [showExitHint, setShowExitHint] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Hide exit hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowExitHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Show hint briefly on mouse move
  const handleMouseMove = useCallback(() => {
    setShowExitHint(true);
    const t = setTimeout(() => setShowExitHint(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // Escape key exits fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onExit]);

  // Generate QR code using qrserver API (free, no install needed)
  useEffect(() => {
    if (!qrToken || !sessionId) return;
    const qrContent = JSON.stringify({ s: sessionId, t: qrToken });
    const encoded = encodeURIComponent(qrContent);
    setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encoded}&bgcolor=0A0E1A&color=06B6D4&margin=20`);
  }, [qrToken, sessionId]);

  const progressPercent = totalStudents > 0 ? (scannedCount / totalStudents) * 100 : 0;

  const periodLabels: Record<number, string> = {
    1: '08:00 – 08:55 AM', 2: '09:00 – 09:55 AM', 3: '10:00 – 10:55 AM',
    4: '11:00 – 11:55 AM', 5: '12:00 – 12:55 PM', 6: '01:00 – 01:55 PM',
    7: '02:00 – 02:55 PM', 8: '03:00 – 03:55 PM',
  };

  return (
    <div
      id="projector-fullscreen-view"
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: 'linear-gradient(135deg, #0A0E1A 0%, #0D1530 50%, #0A0E1A 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: showExitHint ? 'default' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Exit hint */}
      <div style={{
        position: 'fixed', top: 16, right: 20, zIndex: 10000,
        opacity: showExitHint ? 1 : 0, transition: 'opacity 0.5s ease',
        display: 'flex', gap: '8px',
      }}>
        <button
          id="projector-exit-btn"
          onClick={onExit}
          style={{
            padding: '8px 16px', background: 'rgba(239,68,68,0.8)', border: 'none',
            borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
            backdropFilter: 'blur(8px)',
          }}
        >
          ✕ Exit Fullscreen (Esc)
        </button>
      </div>

      {/* Top: Class metadata */}
      <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '14px', color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
          📡 LIVE ATTENDANCE SESSION — SCAN TO MARK PRESENT
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', marginBottom: '6px' }}>
          {subjectName}
          <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 400, marginLeft: '12px' }}>({subjectCode})</span>
        </div>
        <div style={{ fontSize: '16px', color: '#94a3b8' }}>
          {sectionName} &nbsp;•&nbsp; Period {period}: {periodLabels[period] || ''} &nbsp;•&nbsp; {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Center: QR + Timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 'clamp(1.5rem, 4vw, 3.75rem)', position: 'relative', zIndex: 1, maxWidth: '94vw' }}>
        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '20px',
            border: '2px solid rgba(6,182,212,0.4)', boxShadow: '0 0 60px rgba(6,182,212,0.2)',
            maxWidth: 'min(86vw, 320px)',
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" style={{ width: '100%', height: 'auto', maxWidth: 280, borderRadius: '8px', display: 'block' }} />
            ) : (
              <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,182,212,0.05)', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>⟳</div>
                  <div style={{ color: '#06b6d4', fontSize: '14px' }}>Generating QR...</div>
                </div>
              </div>
            )}
          </div>
          {/* Token display as fallback */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Or Enter Token Manually</div>
            <div style={{
              fontSize: '36px', fontWeight: 800, letterSpacing: '0.3em', color: '#06b6d4',
              fontFamily: 'monospace', background: 'rgba(6,182,212,0.08)', padding: '10px 24px',
              borderRadius: '10px', border: '1px solid rgba(6,182,212,0.25)',
            }}>
              {qrToken || '------'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '300px', background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.3), transparent)' }} />

        {/* Right: Timer + Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          {/* Circular countdown */}
          <div style={{ position: 'relative', width: 160, height: 160 }}>
            <svg width="160" height="160" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              {/* Progress */}
              <circle
                cx="80" cy="80" r="70" fill="none"
                stroke={secondsLeft <= 3 ? '#ef4444' : secondsLeft <= 5 ? '#f59e0b' : '#06b6d4'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - secondsLeft / 10)}`}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                fontSize: '52px', fontWeight: 800, fontFamily: 'monospace',
                color: secondsLeft <= 3 ? '#ef4444' : secondsLeft <= 5 ? '#f59e0b' : '#06b6d4',
                lineHeight: 1,
              }}>
                {secondsLeft}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>seconds</div>
            </div>
          </div>

          {/* Present counter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '64px', fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {scannedCount}
            </div>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>of {totalStudents} students</div>
            <div style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
              {totalStudents > 0 ? `${Math.round(progressPercent)}% Present` : ''}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: 200 }}>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPercent}%`, borderRadius: '4px',
                background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: AttendAI branding */}
      <div style={{ position: 'fixed', bottom: 20, textAlign: 'center', color: '#1e293b', fontSize: '13px', letterSpacing: '0.08em' }}>
        AttendAI • Offline-First Smart Attendance Platform
      </div>
    </div>
  );
}
