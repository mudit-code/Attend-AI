import { create } from 'zustand';

interface SyncState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  isOnline: boolean;
  syncError: string | null;

  setPendingCount: (n: number) => void;
  incrementPending: (by?: number) => void;
  setSyncing: (val: boolean) => void;
  setLastSyncAt: (ts: string) => void;
  setOnline: (val: boolean) => void;
  setSyncError: (msg: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  isOnline: navigator.onLine,
  syncError: null,

  setPendingCount: (n) => set({ pendingCount: n }),
  incrementPending: (by = 1) => set((s) => ({ pendingCount: s.pendingCount + by })),
  setSyncing: (val) => set({ isSyncing: val }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
  setOnline: (val) => set({ isOnline: val }),
  setSyncError: (msg) => set({ syncError: msg }),
}));
