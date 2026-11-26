import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, User, MapPin, FileText, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface GatePass {
  id: number;
  reason: string;
  reasonOther?: string;
  destination: string;
  additionalNote?: string;
  documentUrl?: string;
  outTime: string;
  expectedInTime: string;
  mentorStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  mentorNote?: string;
  appliedAt: string;
  student: {
    rollNo: string;
    user: { name: string };
    section: { name: string; branch?: { name: string } };
  };
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

export default function GatePassApprovalTab() {
  const [queue, setQueue] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/gatepass/mentor-queue');
      setQueue(res.data.data);
    } catch {
      setError('Failed to load gate pass queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const decide = async (passId: number, status: 'APPROVED' | 'REJECTED') => {
    setProcessing((p) => ({ ...p, [passId]: true }));
    try {
      await api.patch(`/gatepass/${passId}/mentor-decision`, {
        status,
        note: notes[passId] || undefined,
      });
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="text-red-500" size={40} />
        <p className="text-red-600">{error}</p>
        <button onClick={fetchQueue} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gate Pass Approvals</h2>
          <p className="text-sm text-gray-500">
            {queue.length} pending {queue.length === 1 ? 'request' : 'requests'} assigned to you
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pending gate pass requests</p>
        </div>
      ) : (
        queue.map((pass) => (
          <div key={pass.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Pending Your Approval</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(pass.appliedAt).toLocaleString()}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Student Info */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{pass.student.user.name}</p>
                  <p className="text-sm text-gray-500">
                    {pass.student.rollNo} · {pass.student.section.name}
                    {pass.student.section.branch && ` · ${pass.student.section.branch.name}`}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={14} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Reason:</span>
                  <span className="text-gray-600">{REASON_LABELS[pass.reason] ?? pass.reason}</span>
                </div>
                {pass.reasonOther && (
                  <p className="text-sm text-gray-600 pl-5">"{pass.reasonOther}"</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Destination:</span>
                  <span className="text-gray-600">{pass.destination}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Out:</span>
                  <span className="text-gray-600">{new Date(pass.outTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Return by:</span>
                  <span className="text-gray-600">{new Date(pass.expectedInTime).toLocaleString()}</span>
                </div>
                {pass.additionalNote && (
                  <p className="text-sm text-gray-600 italic pl-5">Note: {pass.additionalNote}</p>
                )}
                {pass.documentUrl && (
                  <a
                    href={pass.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline pl-5"
                  >
                    <ExternalLink size={12} /> View Document
                  </a>
                )}
              </div>

              {/* Mentor Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Note (optional)
                </label>
                <textarea
                  rows={2}
                  value={notes[pass.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [pass.id]: e.target.value }))}
                  placeholder="Add a note for the student or HOD..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => decide(pass.id, 'APPROVED')}
                  disabled={processing[pass.id]}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <CheckCircle size={16} />
                  {processing[pass.id] ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => decide(pass.id, 'REJECTED')}
                  disabled={processing[pass.id]}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <XCircle size={16} />
                  {processing[pass.id] ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
