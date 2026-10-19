import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';

interface StudentQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (sessionId: string, token: string) => void;
}

export default function StudentQRScannerModal({
  isOpen,
  onClose,
  onScan,
}: StudentQRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

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

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings or use manual code entry.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setHasCamera(false);
        setCameraError('No camera found on this device. You can enter the code manually below.');
      } else {
        setCameraError('Could not start camera. Please verify device permissions or enter code manually.');
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Frame processing loop with jsQR
  useEffect(() => {
    if (!isScanning) return;

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
                parsedToken = (parsed.t || parsed.token || '').toUpperCase();
              } catch {
                // If QR is encoded as query or plain string e.g. "SES-1-1-P1:6422DB9E"
                if (code.data.includes(':')) {
                  const parts = code.data.split(':');
                  parsedSessionId = parts[0];
                  parsedToken = (parts[1] || '').toUpperCase();
                } else {
                  parsedToken = code.data.trim().toUpperCase();
                }
              }

              if (parsedToken) {
                // Optional haptic vibration feedback
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate?.([80, 40, 80]);
                }
                stopCamera();
                onScan(parsedSessionId, parsedToken);
                return;
              }
            } catch (parseErr) {
              console.warn('QR parse error:', parseErr);
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
  }, [isScanning, onScan, stopCamera]);

  // Fallback image upload scanner
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            try {
              const parsed = JSON.parse(code.data);
              stopCamera();
              onScan(parsed.s || '', (parsed.t || '').toUpperCase());
            } catch {
              stopCamera();
              onScan('', code.data.trim().toUpperCase());
            }
          } else {
            alert('No QR code detected in this photo. Please try a clearer screenshot or enter code manually.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--color-surface)',
          borderRadius: 24,
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📷</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Scan Classroom QR
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--color-surface-2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: '1rem',
              fontWeight: 800,
            }}
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>

        {/* Viewfinder Window */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 280,
            borderRadius: 16,
            overflow: 'hidden',
            background: '#090D16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cameraError ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#F87171' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.4, margin: '0 0 1rem' }}>{cameraError}</p>
              <label
                className="btn btn--primary btn--sm"
                style={{ cursor: 'pointer', display: 'inline-block' }}
              >
                📁 Upload QR Screenshot
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Target Aiming Box */}
              <div
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: 16,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  pointerEvents: 'none',
                }}
              >
                {/* 4 Corner Markers */}
                <span style={{ position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTop: '4px solid #6366F1', borderLeft: '4px solid #6366F1', borderTopLeftRadius: 10 }} />
                <span style={{ position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTop: '4px solid #6366F1', borderRight: '4px solid #6366F1', borderTopRightRadius: 10 }} />
                <span style={{ position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottom: '4px solid #6366F1', borderLeft: '4px solid #6366F1', borderBottomLeftRadius: 10 }} />
                <span style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottom: '4px solid #6366F1', borderRight: '4px solid #6366F1', borderBottomRightRadius: 10 }} />

                {/* Laser animation line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #EC4899, #8B5CF6, transparent)',
                    boxShadow: '0 0 12px #EC4899',
                    animation: 'scanLaser 2s infinite ease-in-out',
                  }}
                />
              </div>

              {/* Scanning status banner */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  background: 'rgba(0, 0, 0, 0.65)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                }}
              >
                Align teacher's QR inside the frame
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ width: '100%', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {hasCamera && !cameraError && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
              style={{ fontSize: '0.8rem', fontWeight: 700 }}
            >
              🔄 Flip Camera
            </button>
          )}

          <label
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0.4rem 0.5rem',
            }}
          >
            Upload Photo
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>

          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            style={{ fontSize: '0.8rem', fontWeight: 700 }}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 8%; opacity: 0.3; }
          50% { top: 92%; opacity: 1; }
          100% { top: 8%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
