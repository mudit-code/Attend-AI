import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Clock, LogIn, List, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import jsQR from 'jsqr';

const GUARD_TOKEN = import.meta.env.VITE_GUARD_TOKEN ?? '';
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1/gatepass';
const GATEPASS_SECRET = import.meta.env.VITE_GATEPASS_SECRET || import.meta.env.VITE_GUARD_TOKEN || 'attendai_gatepass_secure_offline_key_2026';

interface ScanResult {
  passId: string | number;
  studentName: string;
  rollNo: string;
  section: string;
  branch: string;
  destination: string;
  outTime: string;
  expectedInTime: string;
  reason: string;
  isOfflineVerified?: boolean;
}

interface LogEntry {
  id: string | number;
  student: { user: { name: string }; rollNo: string; section: { name: string } };
  destination: string;
  actualOutTime: string;
  actualInTime?: string;
  expectedInTime: string;
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error' | 'entry_marked';

// ─── Native Web Crypto HMAC-SHA256 Verifier (Pure Browser, Zero Libs) ───
async function verifyOfflineToken(signedToken: string): Promise<{
  valid: boolean;
  error?: string;
  data?: ScanResult;
  nonce?: string;
}> {
  if (!signedToken || !signedToken.includes('.')) {
    return { valid: false, error: 'Cannot verify unformatted token offline' };
  }

  const [payloadB64, signature] = signedToken.split('.');
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Malformed token structure' };
  }

  try {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(GATEPASS_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isSigValid = await window.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payloadB64)
    );

    if (!isSigValid) {
      return { valid: false, error: 'Digital signature invalid! Fake or tampered QR.' };
    }

    // Decode base64url
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decodedStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(decodedStr);

    // Check expiration
    if (new Date() > new Date(payload.validUntil)) {
      return { valid: false, error: 'QR Pass has expired!' };
    }

    // Anti-Replay: Check local burned nonces
    const burnedNonces: string[] = JSON.parse(localStorage.getItem('gp_burned_nonces') || '[]');
    if (burnedNonces.includes(payload.nonce)) {
      return { valid: false, error: 'This QR code has already been scanned/used offline!' };
    }

    return {
      valid: true,
      nonce: payload.nonce,
      data: {
        passId: payload.pid,
        studentName: payload.name,
        rollNo: payload.roll,
        section: payload.sec,
        branch: payload.dept,
        destination: payload.dest,
        outTime: payload.out,
        expectedInTime: payload.exp,
        reason: 'OFFLINE VERIFIED PASS',
        isOfflineVerified: true,
      },
    };
  } catch (err: any) {
    return { valid: false, error: `Offline verification failed: ${err.message}` };
  }
}

export default function GuardGateDesk() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => {
    return JSON.parse(localStorage.getItem('gp_pending_sync') || '[]').length;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const syncPendingOfflineLogs = useCallback(async () => {
    const pending = JSON.parse(localStorage.getItem('gp_pending_sync') || '[]');
    if (pending.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/guard/batch-sync?token=${GUARD_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans: pending }),
      });
      if (res.ok) {
        localStorage.removeItem('gp_pending_sync');
        setPendingSyncCount(0);
        fetchLogs();
      }
    } catch {
      // network still down, will retry
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/guard/logs?token=${GUARD_TOKEN}`);
      const data = await res.json();
      setLogs(data.data ?? []);
    } catch {
      // offline or silent
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    syncPendingOfflineLogs();

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOfflineLogs();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      stopCamera();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchLogs, syncPendingOfflineLogs]);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setScanState('scanning');
      scanLoop();
    } catch {
      setErrorMsg('Camera access denied');
      setScanState('error');
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      stopCamera();
      processToken(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  const processToken = async (rawToken: string) => {
    setScanState('scanning');

    // ── 1. Try Online Scan First (with 3.5s timeout) ──────────────────
    let isNetworkFailure = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/guard/scan?token=${GUARD_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message ?? 'Invalid or expired QR');
        setScanState('error');
        return;
      }
      setScanResult(data.data);
      setScanState('success');
      fetchLogs();
      return;
    } catch {
      // Network failure, aborted, or offline
      isNetworkFailure = true;
    }

    // ── 2. Offline Cryptographic Fallback Verification ──────────────
    if (isNetworkFailure) {
      const offlineCheck = await verifyOfflineToken(rawToken);
      if (!offlineCheck.valid || !offlineCheck.data) {
        setErrorMsg(offlineCheck.error || 'Verification failed (Offline)');
        setScanState('error');
        return;
      }

      // Burn nonce locally (Anti-Replay)
      if (offlineCheck.nonce) {
        const burned: string[] = JSON.parse(localStorage.getItem('gp_burned_nonces') || '[]');
        burned.push(offlineCheck.nonce);
        localStorage.setItem('gp_burned_nonces', JSON.stringify(burned));
      }

      // Add to pending sync queue
      const pending: any[] = JSON.parse(localStorage.getItem('gp_pending_sync') || '[]');
      pending.push({
        passId: offlineCheck.data.passId,
        actualOutTime: new Date().toISOString(),
      });
      localStorage.setItem('gp_pending_sync', JSON.stringify(pending));
      setPendingSyncCount(pending.length);

      setScanResult(offlineCheck.data);
      setScanState('success');
    }
  };

  const markEntry = async (passId: string | number) => {
    try {
      await fetch(`${API_BASE}/guard/entry/${passId}?token=${GUARD_TOKEN}`, { method: 'POST' });
      setScanState('entry_marked');
      fetchLogs();
    } catch {
      alert('Entry recorded locally or network unavailable');
      setScanState('entry_marked');
    }
  };

  const reset = () => {
    setScanState('idle');
    setScanResult(null);
    setErrorMsg('');
    setManualToken('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            🛡️ Guard Gate Desk
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
              isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </h1>
          <p className="text-sm text-gray-400">AttendAI Security Station</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingSyncCount > 0 && (
            <button
              onClick={syncPendingOfflineLogs}
              title="Sync pending offline scans"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
            >
              <RefreshCw size={12} /> Sync ({pendingSyncCount})
            </button>
          )}
          <button onClick={fetchLogs} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* Scan Panel */}
        {scanState === 'idle' && (
          <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-center">Scan Gate Pass QR</h2>
            <button
              onClick={startCamera}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-3 font-medium text-lg"
            >
              <Camera size={24} /> Start Camera Scan
            </button>
            <div className="relative flex items-center">
              <div className="flex-1 border-t border-gray-600"></div>
              <span className="px-3 text-gray-500 text-sm">or enter token manually</span>
              <div className="flex-1 border-t border-gray-600"></div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste raw token..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => processToken(manualToken.trim())}
                disabled={!manualToken.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-medium"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Camera View */}
        {cameraActive && scanState === 'scanning' && (
          <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full rounded-xl" muted playsInline />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-4 border-blue-400 rounded-2xl opacity-80 animate-pulse" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button onClick={() => { stopCamera(); reset(); }} className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        )}

        {/* Not scanning but canvas needed */}
        {!cameraActive && <canvas ref={canvasRef} className="hidden" />}

        {/* SUCCESS Result */}
        {scanState === 'success' && scanResult && (
          <div className="bg-emerald-900 border-2 border-emerald-500 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <CheckCircle size={56} className="mx-auto text-emerald-400 mb-2" />
              <h2 className="text-2xl font-bold text-emerald-300">
                EXIT GRANTED ✅
              </h2>
              {scanResult.isOfflineVerified && (
                <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600">
                  ⚡ Cryptographically Verified Offline
                </span>
              )}
            </div>
            <div className="bg-emerald-800/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-emerald-400 text-sm">Student</span>
                <span className="font-semibold">{scanResult.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400 text-sm">Roll No.</span>
                <span>{scanResult.rollNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400 text-sm">Section</span>
                <span>{scanResult.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400 text-sm">Destination</span>
                <span className="text-right max-w-[60%]">{scanResult.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400 text-sm">Expected Return</span>
                <span>{new Date(scanResult.expectedInTime).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => markEntry(scanResult.passId)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 font-medium"
              >
                <LogIn size={18} /> Mark Re-Entry
              </button>
              <button onClick={reset} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Entry Marked */}
        {scanState === 'entry_marked' && (
          <div className="bg-blue-900 border-2 border-blue-500 rounded-2xl p-6 text-center space-y-3">
            <LogIn size={48} className="mx-auto text-blue-400" />
            <h2 className="text-xl font-bold text-blue-300">Re-Entry Recorded ✅</h2>
            <p className="text-blue-400 text-sm">Student has returned to campus</p>
            <button onClick={reset} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium">
              Scan Next
            </button>
          </div>
        )}

        {/* ERROR */}
        {scanState === 'error' && (
          <div className="bg-red-900 border-2 border-red-500 rounded-2xl p-6 text-center space-y-3">
            <XCircle size={56} className="mx-auto text-red-400" />
            <h2 className="text-2xl font-bold text-red-300">ACCESS DENIED ❌</h2>
            <p className="text-red-400">{errorMsg}</p>
            <button onClick={reset} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium">
              Scan Again
            </button>
          </div>
        )}

        {/* Today's Log */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <List size={16} className="text-gray-400" />
            Today's Gate Log
            {logsLoading && <div className="w-4 h-4 border-2 border-t-transparent border-blue-400 rounded-full animate-spin ml-2" />}
          </h3>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No exits recorded today</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between bg-gray-700/60 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="font-medium text-sm">{log.student.user.name}</p>
                    <p className="text-xs text-gray-400">{log.student.rollNo} · {log.destination}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock size={11} className="text-gray-400" />
                      <span className="text-gray-300">{new Date(log.actualOutTime).toLocaleTimeString()}</span>
                    </div>
                    {log.actualInTime ? (
                      <div className="flex items-center gap-1 text-xs text-emerald-400 mt-0.5">
                        <CheckCircle size={11} /> Back {new Date(log.actualInTime).toLocaleTimeString()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-orange-400 mt-0.5">
                        <AlertCircle size={11} /> Still out
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
