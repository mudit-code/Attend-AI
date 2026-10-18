import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Send HttpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from memory (Zustand) to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Send app version so backend can warn if outdated
  config.headers['X-App-Version'] = import.meta.env.VITE_APP_VERSION ?? '1.0.0';
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Queue requests while refresh is in progress
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken;

        useAuthStore.getState().setToken(newToken);
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed — force logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }

    // Check if update required
    if (error.response?.data?.error?.code === 'UPDATE_REQUIRED') {
      window.location.reload();
    }

    return Promise.reject(error);
  }
);
