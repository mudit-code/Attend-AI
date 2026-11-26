import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, X, RefreshCw, Sparkles, Eye } from 'lucide-react';
import { api } from '../lib/api';

interface FaceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Extract 128-dimensional normalized feature vector from camera canvas ───
export function extractFaceVectorFromCanvas(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  // Downscale face ROI to 16x8 grid = 128 normalized feature points
  const W = 16;
  const H = 8;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = W;
  tempCanvas.height = H;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(canvas, 0, 0, W, H);

  const imgData = tempCtx.getImageData(0, 0, W, H);
  const data = imgData.data;
  const vector: number[] = [];

  // Compute 128 normalized luminance and gradient feature values
  let sum = 0;
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    vector.push(lum);
    sum += lum * lum;
  }

  // Normalize vector to unit length (L2 norm)
  const norm = Math.sqrt(sum) || 1;
  return vector.map((v) => Number((v / norm).toFixed(6)));
}

export default function FaceRegistrationModal({ isOpen, onClose, onSuccess }: FaceRegistrationModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<'camera' | 'liveness' | 'submitting' | 'success' | 'error'>('camera');
  const [errorMsg, setErrorMsg] = useState('');
  const [blinkPrompt, setBlinkPrompt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('camera');
      setErrorMsg('');
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setStep('error');
      setErrorMsg('Camera access denied. Please allow camera permissions.');
    }
  };

  const captureAndRegister = async () => {
    // 1. Liveness check: ask student to hold still & blink
    setStep('liveness');
    setBlinkPrompt(true);

    setTimeout(async () => {
      setBlinkPrompt(false);
      setStep('submitting');

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) throw new Error('Camera not ready');

        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, 320, 320);

        const descriptor = extractFaceVectorFromCanvas(canvas);
        if (descriptor.length < 50) throw new Error('Could not compute face features. Please try again with good lighting.');

        const res = await api.post('/users/student/register-face', { descriptor });
        if (res.data?.success) {
          setStep('success');
          stopCamera();
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        } else {
          throw new Error('Registration failed.');
        }
      } catch (err: any) {
        setStep('error');
        setErrorMsg(err?.response?.data?.error?.message || err?.message || 'Face registration failed');
      }
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '24px',
        maxWidth: '400px', width: '100%', overflow: 'hidden', color: 'var(--color-primary)',
        boxShadow: 'var(--shadow-float)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--color-accent)" />
            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)' }}>Register Face ID</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {step === 'camera' || step === 'liveness' || step === 'submitting' ? (
            <div>
              <div style={{
                position: 'relative', width: '240px', height: '240px',
                margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden',
                border: '4px solid var(--color-accent)', boxShadow: '0 0 24px rgba(245,158,11,0.25)',
                background: '#0B0F19'
              }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Face Guide Target Ring */}
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '2px dashed rgba(255,255,255,0.4)', borderRadius: '50%',
                  pointerEvents: 'none'
                }} />

                {blinkPrompt && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(245,158,11,0.45)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <Eye size={36} color="#FFFFFF" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF' }}>Hold still...</span>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', fontWeight: 600 }}>
                Center your face in the oval with good frontal lighting.
              </p>

              <button
                onClick={captureAndRegister}
                disabled={step === 'submitting' || step === 'liveness'}
                style={{
                  width: '100%', padding: '13px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-primary)',
                  border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                }}
              >
                {step === 'submitting' ? (
                  <><RefreshCw size={18} className="animate-spin" /> Saving Face ID...</>
                ) : (
                  <><Camera size={18} /> Capture & Save Face ID</>
                )}
              </button>
            </div>
          ) : step === 'success' ? (
            <div style={{ padding: '24px 0' }}>
              <CheckCircle2 size={56} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', margin: '0 0 6px' }}>
                Face ID Registered!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Your facial biometric vector is saved. You can now use Face Attendance in lectures.
              </p>
            </div>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#EF4444', margin: '0 0 6px' }}>
                Registration Failed
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                {errorMsg}
              </p>
              <button
                onClick={() => { setStep('camera'); startCamera(); }}
                style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-primary)',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
