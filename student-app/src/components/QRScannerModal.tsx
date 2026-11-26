import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { api } from '../lib/api';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttendanceMarked?: () => void;
}

export default function QRScannerModal({ isOpen, onClose, onAttendanceMarked }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual fallback inputs
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualToken, setManualToken] = useState('');

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setStatusMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported on this browser. Please use manual code entry.');
        setMode('manual');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Camera permission denied or camera unavailable. Please use manual code entry below.');
      setMode('manual');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'camera') {
        void startCamera();
      }
    } else {
      stopCamera();
      setStatusMessage(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera]);

  // Frame processing loop with jsQR
  useEffect(() => {
    if (!isScanning || mode !== 'camera') return;

    let active = true;

    const scanFrame = () => {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            try {
              let parsedSessionId = '';
              let parsedToken = '';

              try {
                const parsed = JSON.parse(code.data);
                parsedSessionId = parsed.s || parsed.sessionId || '';
                parsedToken = parsed.t || parsed.token || '';
              } catch {
                if (code.data.includes(':')) {
                  const parts = code.data.split(':');
                  parsedSessionId = parts[0];
                  parsedToken = parts[1];
                }
              }

              if (parsedSessionId && parsedToken) {
                active = false;
                stopCamera();
                void markAttendance(parsedSessionId, parsedToken);
                return;
              }
            } catch (parseErr) {
              console.warn('QR parse issue:', parseErr);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, mode, stopCamera]);

  const markAttendance = async (sessionId: string, token: string) => {
    setSubmitting(true);
    setStatusMessage(null);

    let clientDeviceId = localStorage.getItem('attendai_student_device_id');
    if (!clientDeviceId) {
      clientDeviceId = 'DEV-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12));
      localStorage.setItem('attendai_student_device_id', clientDeviceId);
    }

    try {
      const res = await api.post('/qr/mark', {
        sessionId: sessionId.trim(),
        token: token.trim().toUpperCase(),
        deviceId: clientDeviceId,
      });

      const message = res.data.message || res.data.data?.message || 'Attendance verified and marked!';
      setStatusMessage({ type: 'success', text: message });

      if (onAttendanceMarked) {
        onAttendanceMarked();
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message || err.message;

      let humanMsg = `Attendance Failed: ${msg || 'Could not verify lecture'}`;
      if (errCode === 'WRONG_SECTION' || msg?.toLowerCase().includes('section')) {
        humanMsg = 'Access Denied: You are not enrolled in this section.';
      } else if (errCode === 'SESSION_LOCKED' || msg?.toLowerCase().includes('locked')) {
        humanMsg = 'Session Locked: Faculty has already finalized this roll call.';
      } else if (errCode === 'INVALID_TOKEN' || msg?.toLowerCase().includes('token')) {
        humanMsg = 'Expired Token: Enter the current 8-char code from the classroom projector.';
      } else if (errCode === 'DEVICE_MISMATCH') {
        humanMsg = 'Device Mismatch: Your account is registered on another device.';
      }

      setStatusMessage({ type: 'error', text: humanMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSessionId.trim() || !manualToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both Session ID and Token' });
      return;
    }
    void markAttendance(manualSessionId, manualToken);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--color-surface-2)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Title */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>
            Mark Lecture Attendance
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Scan the rotating QR code projected in class
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          background: 'var(--color-surface-2)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={() => { setMode('camera'); setStatusMessage(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: mode === 'camera' ? '#3B82F6' : 'transparent',
              color: mode === 'camera' ? '#FFFFFF' : 'var(--color-text-muted)',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Camera size={16} />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('manual'); stopCamera(); setStatusMessage(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: mode === 'manual' ? '#3B82F6' : 'transparent',
              color: mode === 'manual' ? '#FFFFFF' : 'var(--color-text-muted)',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <KeyRound size={16} />
            <span>Manual Code</span>
          </button>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: statusMessage.type === 'success' ? '#6EE7B7' : '#FCA5A5',
            fontSize: '13px',
            marginBottom: '14px'
          }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Camera View Mode */}
        {mode === 'camera' ? (
          <div>
            {cameraError ? (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: '13px', color: '#FCA5A5', marginBottom: '12px' }}>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  style={{
                    background: '#3B82F6',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Switch to Manual Entry
                </button>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Reticle Overlay */}
                <div style={{
                  position: 'absolute',
                  width: '160px',
                  height: '160px',
                  border: '2px solid #3B82F6',
                  borderRadius: '16px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)'
                }} />

                {submitting && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}>
                    <RefreshCw size={24} className="animate-spin" />
                    <span>Verifying attendance...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Manual Code Mode */
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Session ID
              </label>
              <input
                type="text"
                placeholder="e.g. LEC-CS4-01"
                value={manualSessionId}
                onChange={(e) => setManualSessionId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                8-Character Token
              </label>
              <input
                type="text"
                placeholder="e.g. 7K2A9X01"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                maxLength={12}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  letterSpacing: '2px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '6px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Verifying Token...' : 'Confirm Attendance'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
