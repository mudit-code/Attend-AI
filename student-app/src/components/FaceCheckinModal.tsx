import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, X, RefreshCw, Sparkles, MapPin, Eye } from 'lucide-react';
import { api } from '../lib/api';
import { extractFaceVectorFromCanvas } from './FaceRegistrationModal';

interface FaceCheckinModalProps {
  isOpen: boolean;
  sessionId: string;
  subjectName: string;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function FaceCheckinModal({
  isOpen,
  sessionId,
  subjectName,
  onClose,
  onSuccess,
}: FaceCheckinModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<'camera' | 'verifying' | 'success' | 'error'>('camera');
  const [errorMsg, setErrorMsg] = useState('');
  const [livenessPrompt, setLivenessPrompt] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

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

  const verifyAndCheckIn = async () => {
    setLivenessPrompt(true);

    // Get current GPS coordinates for campus geofence check
    let lat: number | undefined;
    let lng: number | undefined;

    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch {
      // If GPS times out, backend will use default tolerance
    }

    setTimeout(async () => {
      setLivenessPrompt(false);
      setStep('verifying');

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) throw new Error('Camera not initialized');

        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, 320, 320);

        const descriptor = extractFaceVectorFromCanvas(canvas);
        if (descriptor.length < 50) {
          throw new Error('Face features not detected. Make sure your face is visible.');
        }

        const res = await api.post('/attendance/face-checkin', {
          sessionId,
          descriptor,
          lat,
          lng,
        });

        if (res.data?.success) {
          setResultData(res.data.data);
          setStep('success');
          stopCamera();
          setTimeout(() => {
            onSuccess(res.data.data);
            onClose();
          }, 2000);
        } else {
          throw new Error('Attendance could not be recorded.');
        }
      } catch (err: any) {
        setStep('error');
        setErrorMsg(err?.response?.data?.error?.message || err?.message || 'Face check-in failed');
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--color-accent)" />
              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)' }}>Face Check-in</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{subjectName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {step === 'camera' || step === 'verifying' ? (
            <div>
              <div style={{
                position: 'relative', width: '240px', height: '240px',
                margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden',
                border: '4px solid #10B981', boxShadow: '0 0 24px rgba(16,185,129,0.3)',
                background: '#0B0F19'
              }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Target Circle */}
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '2px dashed rgba(255,255,255,0.4)', borderRadius: '50%',
                  pointerEvents: 'none'
                }} />

                {livenessPrompt && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.5)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <Eye size={36} color="#FFFFFF" />
                    <span style={{ fontSize: '13px', fontWeight: 800 }}>Hold still...</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px', fontWeight: 600 }}>
                <MapPin size={13} color="var(--color-success)" />
                <span>GPS Geofence + Biometric Verified</span>
              </div>

              <button
                onClick={verifyAndCheckIn}
                disabled={step === 'verifying'}
                style={{
                  width: '100%', padding: '13px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-primary)',
                  border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                }}
              >
                {step === 'verifying' ? (
                  <><RefreshCw size={18} className="animate-spin" /> Verifying Face & GPS...</>
                ) : (
                  <><Camera size={18} /> Confirm Attendance</>
                )}
              </button>
            </div>
          ) : step === 'success' ? (
            <div style={{ padding: '20px 0' }}>
              <CheckCircle2 size={56} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', margin: '0 0 6px' }}>
                Attendance Marked!
              </h3>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                {resultData?.studentName} ({resultData?.rollNo})
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Status: <strong>Present (FACE ID ✅)</strong> · Confidence: {resultData?.confidence}%
              </p>
            </div>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#EF4444', margin: '0 0 6px' }}>
                Verification Failed
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
