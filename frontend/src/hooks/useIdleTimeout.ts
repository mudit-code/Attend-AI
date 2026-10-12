import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 min warning

const EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];

export function useIdleTimeout() {
  const lockApp = useAuthStore((s) => s.lockApp);
  const user = useAuthStore((s) => s.user);
  const isLocked = useAuthStore((s) => s.isLocked);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only apply idle timeout when user is logged in and app is not already locked
    if (!user || isLocked) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lockApp();
      }, IDLE_TIMEOUT_MS);
    };

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // Start timer

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, isLocked, lockApp]);
}

export { IDLE_TIMEOUT_MS, WARNING_BEFORE_MS };
