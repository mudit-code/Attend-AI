import { useSyncStore } from '../stores/useSyncStore';

export default function SyncBadge() {
  const { isOnline, pendingCount, isSyncing, lastSyncAt } = useSyncStore();

  return (
    <div className="flex items-center gap-1">
      {/* Online/Offline status */}
      <span className={`badge badge--${isOnline ? 'online' : 'offline'}`}>
        <span className={`dot dot--${isOnline ? 'online' : 'offline'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </span>

      {/* Pending sync count */}
      {pendingCount > 0 && (
        <span className="badge badge--pending">
          {isSyncing ? '⟳' : '⏳'} {pendingCount} pending
        </span>
      )}

      {/* Synced */}
      {pendingCount === 0 && lastSyncAt && isOnline && (
        <span className="badge badge--synced">✓ Synced</span>
      )}
    </div>
  );
}
