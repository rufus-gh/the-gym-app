import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useRestTimerStore } from '@/stores/restTimerStore';
import { useSettings } from '@/hooks/useSettings';

export function useRestTimer() {
  const store = useRestTimerStore();
  const { hapticsEnabled } = useSettings();

  useEffect(() => {
    if (store.state === 'alert' && hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [store.state, hapticsEnabled]);

  return store;
}
