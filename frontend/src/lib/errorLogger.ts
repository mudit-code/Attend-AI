import { db, type OfflineError } from './db';

// Log errors — online goes to Sentry, offline goes to IndexedDB
export async function logError(error: Error, context?: Record<string, unknown>): Promise<void> {
  const entry: OfflineError = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  if (navigator.onLine) {
    // TODO: Sentry.captureException(error, { extra: context });
    console.error('[Sentry]', entry);
  } else {
    // Queue for later
    await db.offlineErrors.add(entry);
  }

  // Prune if > 100 entries
  const count = await db.offlineErrors.count();
  if (count > 100) {
    const oldest = await db.offlineErrors.orderBy('timestamp').first();
    if (oldest?.id) await db.offlineErrors.delete(oldest.id);
  }
}

// Called at start of each sync cycle
export async function flushOfflineErrors(): Promise<void> {
  const errors = await db.offlineErrors.toArray();
  for (const err of errors) {
    // TODO: Sentry.captureMessage(err.message, { extra: err });
    console.log('[Sentry flush]', err);
    if (err.id) await db.offlineErrors.delete(err.id);
  }
}
