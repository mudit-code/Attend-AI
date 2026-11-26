import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StudentProfile {
  id: number;
  rollNo: string;
  sectionId: number;
  section?: {
    id: number;
    name: string;
    branch?: {
      id: number;
      name: string;
      code: string;
    };
  };
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: 'STUDENT';
  student?: StudentProfile | null;
}

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: UserInfo) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'attendai_student_portal_auth',
    }
  )
);
