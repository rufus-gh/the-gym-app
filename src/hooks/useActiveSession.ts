import { useEffect, useRef } from 'react';
import { useActiveSessionStore } from '@/stores/activeSessionStore';

export function useActiveSession() {
  const store = useActiveSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (store.sessionId !== null) {
      intervalRef.current = setInterval(() => {
        store.tickElapsed();
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [store.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return store;
}
