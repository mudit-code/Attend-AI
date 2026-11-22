import { db } from '../lib/db';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';
import { flushOfflineErrors } from '../lib/errorLogger';

const BATCH_SIZE = 50;

// ─── Network check ───────────────────────────────────────────────
async function isServerReachable(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/health', { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Update pending count ─────────────────────────────────────────
async function updatePendingCount(): Promise<void> {
  const count = await db.outbox.where('status').equals('pending').count();
  useSyncStore.getState().setPendingCount(count);
}

// ─── Push outbox to server ────────────────────────────────────────
async function pushOutbox(): Promise<void> {
  const pending = await db.outbox
    .where('status')
    .equals('pending')
    .sortBy('createdAt');

  if (pending.length === 0) return;

  const batches = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const batchId = crypto.randomUUID();
    try {
      const { data } = await api.post('/sync/push', {
        batchId,
        items: batch.map((item) => ({
          clientMutationId: item.id,
          entity: item.type === 'attendance_session' || item.type === 'attendance_record' ? 'attendance' : item.type === 'leave_request' ? 'leave' : 'correction',
          action: 'create',
          payload: item.payload,
        })),
      });

      // Process results
      for (const result of (data.results || [])) {
        const mutationId = result.clientMutationId || result.id;
        const resStatus = result.status || result.result;
        if (resStatus === 'accepted' || resStatus === 'duplicate') {
          await db.outbox.update(mutationId, { status: 'done' });
        } else if (resStatus === 'rejected') {
          await db.outbox.update(mutationId, {
            status: 'failed',
            error: result.error || result.reason,
            attempts: (batch.find((b) => b.id === mutationId)?.attempts ?? 0) + 1,
          });
        } else if (resStatus === 'conflict') {
          await db.outbox.update(mutationId, { status: 'conflict', error: 'Conflict detected' });
        }
      }
    } catch (err) {
      // Network error — increment attempts, exponential backoff handled by caller
      for (const item of batch) {
        const attempts = (item.attempts ?? 0) + 1;
        if (attempts >= 8) {
          await db.outbox.update(item.id, { status: 'failed', attempts, error: 'Max retries exceeded' });
        } else {
          await db.outbox.update(item.id, { attempts, updatedAt: new Date().toISOString() });
        }
      }
      throw err; // Re-throw to trigger retry
    }
  }
}

// ─── Pull changes from server ─────────────────────────────────────
async function pullChanges(): Promise<void> {
  const meta = await db.syncMeta.get('cursor');
  const cursor = meta?.value ?? 0;

  let hasMore = true;
  let currentCursor = cursor;

  while (hasMore) {
    const { data } = await api.get(`/sync/pull?cursor=${currentCursor}`);

    await db.transaction('rw', [db.students, db.sections, db.subjects, db.timetableSlots, db.syncMeta], async () => {
      for (const change of data.changes) {
        if (change.op === 'upsert' && change.data) {
          switch (change.entity) {
            case 'student':
              await db.students.put(change.data);
              break;
            case 'section':
              await db.sections.put(change.data);
              break;
            case 'subject':
              await db.subjects.put(change.data);
              break;
            case 'timetable':
              await db.timetableSlots.put(change.data);
              break;
          }
        } else if (change.op === 'delete' && (change.id || change.entityId)) {
          switch (change.entity) {
            case 'student':
              await db.students.delete(Number(change.id || change.entityId));
              break;
          }
        }
      }

      const nextCursorVal = data.nextCursor || data.cursor || '0';
      await db.syncMeta.put({ key: 'cursor', value: nextCursorVal });
    });

    currentCursor = data.nextCursor || data.cursor;
    hasMore = data.hasMore;
  }
}

// ─── Main sync function ───────────────────────────────────────────
let syncLock = false;

export async function runSync(): Promise<void> {
  if (syncLock) return; // Only one sync at a time
  if (!useAuthStore.getState().accessToken) return;
  if (!(await isServerReachable())) return;

  syncLock = true;
  const { setSyncing, setLastSyncAt, setSyncError } = useSyncStore.getState();

  setSyncing(true);
  setSyncError(null);

  try {
    await flushOfflineErrors(); // Send any queued errors to Sentry first
    await pushOutbox();
    await pullChanges();
    await updatePendingCount();
    setLastSyncAt(new Date().toISOString());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    setSyncError(msg);
    console.error('[Sync Error]', err);
  } finally {
    setSyncing(false);
    syncLock = false;
  }
}

// ─── Initialize sync listeners ────────────────────────────────────
export function initSyncListeners(): () => void {
  const { setOnline } = useSyncStore.getState();

  const onOnline = () => {
    setOnline(true);
    void runSync();
  };
  const onOffline = () => setOnline(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Sync on visibility change (app comes to foreground)
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void runSync();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Initial pending count
  void updatePendingCount();

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
