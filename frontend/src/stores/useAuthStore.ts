import { create } from 'zustand';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'HOD';
  teacher?: { id: number; departmentId: number } | null;
  student?: { id: number; sectionId: number; rollNo: string } | null;
}

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  isOfflineMode: boolean;
  isLocked: boolean;

  setToken: (token: string) => void;
  setUser: (user: UserInfo) => void;
  setOfflineMode: (val: boolean) => void;
  lockApp: () => void;
  unlockApp: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isOfflineMode: false,
  isLocked: false,

  setToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setOfflineMode: (val) => set({ isOfflineMode: val }),
  lockApp: () => set({ isLocked: true, accessToken: null }),
  unlockApp: () => set({ isLocked: false }),
  logout: () => set({ accessToken: null, user: null, isLocked: false }),
}));
