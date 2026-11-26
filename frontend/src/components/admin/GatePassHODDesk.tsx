import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, User, MapPin, ShieldCheck,
  RefreshCw, AlertCircle, MessageSquare, LogIn, FileText, ExternalLink
} from 'lucide-react';
import api from '../../lib/api';

interface GatePass {
  id: number;
  reason: string;
  reasonOther?: string;
  destination: string;
  additionalNote?: string;
  documentUrl?: string;
  outTime: string;
  expectedInTime: string;
  mentorStatus: string;
  hodStatus: string;
  mentorNote?: string;
  hodNote?: string;
  actualOutTime?: string;
  actualInTime?: string;
  appliedAt: string;
  student: {
    rollNo: string;
    user: { name: string };
    section: { name: string; branch?: { name: string } };
  };
  mentor?: { user: { name: string } };
}

const REASON_LABELS: Record<string, string> = {
  MEDICAL_EMERGENCY: '🚑 Medical Emergency',
  DOCTOR_APPOINTMENT: '🏥 Doctor Appointment',
  FAMILY_EMERGENCY: '👨‍👩‍👧 Family Emergency',
  BANK_WORK: '🏦 Bank Work',
  COURT_LEGAL: '⚖️ Court / Legal',
  TRAVEL: '✈️ Travel',
  PERSONAL: '👤 Personal',
  OTHER: '📝 Other',
};

export default function GatePassHODDesk() {
  const [queue, setQueue] = useState<GatePass[]>([]);
  const [currentlyOut, setCurrentlyOut] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [approvedTokens, setApprovedTokens] = useState<Record<number, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueRes, logsRes] = await Promise.all([
        api.get('/gatepass/hod-queue'),
        api.get('/gatepass/guard/logs'),
      ]);
      setQueue(queueRes.data.data);
      setCurrentlyOut(logsRes.data.data.filter((p: GatePass) => !p.actualInTime));
    } catch {
      setError('Failed to load gate pass data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const decide = async (passId: number, status: 'APPROVED' | 'REJECTED') => {
    setProcessing((p) => ({ ...p, [passId]: true }));
    try {
      const res = await api.patch(`/gatepass/${passId}/hod-decision`, {
        status,
        note: notes[passId] || undefined,
      });
      if (status === 'APPROVED' && res.data.data.rawToken) {
        setApprovedTokens((t) => ({ ...t, [passId]: res.data.data.rawToken }));
      }
      setQueue((prev) => prev.filter((p) => p.id !== passId));
    } catch (err: any) {
      alert(err?.response?.data?.error?.message ?? 'Action failed');
    } finally {
      setProcessing((p) => ({ ...p, [passId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="text-red-500" size={40} />
        <p className="text-red-600">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck size={22} className="text-purple-600" />
            HOD Gate Pass Clearance
          </h2>
          <p className="text-sm text-gray-500">{queue.length} pending final approval</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Pending Queue */}
      {queue.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl">
          <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
          <p>No pending HOD approvals</p>
        </div>
      ) : (
        queue.map((pass) => (
          <div key={pass.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-purple-50 border-b border-purple-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-purple-800">Level 2: HOD Final Approval</span>
              <span className="text-xs text-gray-500">{new Date(pass.appliedAt).toLocaleString()}</span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{pass.student.user.name}</p>
                  <p className="text-sm text-gray-500">
                    {pass.student.rollNo} · {pass.student.section.name}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-gray-400" />
                  <span className="text-gray-700">{REASON_LABELS[pass.reason] ?? pass.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-gray-400" />
                  <span className="text-gray-700">{pass.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-gray-400" />
                  <span>{new Date(pass.outTime).toLocaleString()} → {new Date(pass.expectedInTime).toLocaleString()}</span>
                </div>
                {pass.documentUrl && (
                  <a href={pass.documentUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline pl-4">
                    <ExternalLink size={12} /> View Document
                  </a>
                )}
              </div>

              {/* Mentor approval note */}
              {pass.mentorNote && (
                <div className="flex items-start gap-2 bg-emerald-50 rounded-lg p-2 text-sm">
                  <MessageSquare size={13} className="text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-emerald-700">
                      Mentor ({pass.mentor?.user?.name}) note:
                    </span>
                    <span className="text-emerald-600 ml-1">"{pass.mentorNote}"</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Note (optional)</label>
                <textarea
                  rows={2}
                  value={notes[pass.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [pass.id]: e.target.value }))}
                  placeholder="Reason for approval/rejection..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => decide(pass.id, 'APPROVED')}
                  disabled={processing[pass.id]}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
                >
                  <CheckCircle size={16} />
                  {processing[pass.id] ? 'Processing...' : 'Final Approve & Generate QR'}
                </button>
                <button
                  onClick={() => decide(pass.id, 'REJECTED')}
                  disabled={processing[pass.id]}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>

              {/* Show raw token after approval */}
              {approvedTokens[pass.id] && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium text-emerald-700 mb-1">✅ QR Generated — Share token with student</p>
                  <code className="text-xs break-all text-emerald-800 bg-emerald-100 p-2 rounded block">
                    {approvedTokens[pass.id]}
                  </code>
                  <p className="text-xs text-emerald-600 mt-1">Student will receive this in their app automatically.</p>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Currently Outside */}
      {currentlyOut.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <LogIn size={16} className="text-orange-500" />
            Currently Outside Campus ({currentlyOut.length})
          </h3>
          <div className="space-y-2">
            {currentlyOut.map((pass) => (
              <div key={pass.id} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-4 py-2.5">
                <div>
                  <p className="font-medium text-sm text-gray-800">{pass.student.user.name}</p>
                  <p className="text-xs text-gray-500">{pass.student.rollNo} · Out: {new Date(pass.actualOutTime!).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-orange-600 font-medium">{pass.destination}</p>
                  <p className="text-xs text-gray-400">Return by {new Date(pass.expectedInTime).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
