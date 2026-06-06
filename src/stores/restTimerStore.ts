import { create } from 'zustand';

type TimerState = 'idle' | 'counting' | 'alert' | 'dismissed';

interface TimerContext {
  exerciseName?: string;
  nextSetDescription?: string;
}

interface RestTimerState {
  state: TimerState;
  targetSeconds: number;
  remainingSeconds: number;
  exerciseName: string | null;
  nextSetDescription: string | null;
}

interface RestTimerActions {
  startTimer: (seconds: number, context?: TimerContext) => void;
  addTime: (seconds: number) => void;
  tick: () => void;
  alert: () => void;
  dismiss: () => void;
  reset: () => void;
}

type RestTimerStore = RestTimerState & RestTimerActions;

const initialState: RestTimerState = {
  state: 'idle',
  targetSeconds: 0,
  remainingSeconds: 0,
  exerciseName: null,
  nextSetDescription: null,
};

export const useRestTimerStore = create<RestTimerStore>((set) => ({
  ...initialState,

  startTimer: (seconds, context) =>
    set({
      state: 'counting',
      targetSeconds: seconds,
      remainingSeconds: seconds,
      exerciseName: context?.exerciseName ?? null,
      nextSetDescription: context?.nextSetDescription ?? null,
    }),

  addTime: (seconds) =>
    set((state) => ({
      remainingSeconds: state.remainingSeconds + seconds,
      targetSeconds: state.targetSeconds + seconds,
    })),

  tick: () =>
    set((state) => {
      if (state.state !== 'counting') return state;
      const next = state.remainingSeconds - 1;
      if (next <= 0) {
        return { remainingSeconds: 0, state: 'alert' as TimerState };
      }
      return { remainingSeconds: next };
    }),

  alert: () => set({ state: 'alert' }),

  dismiss: () => set({ state: 'dismissed' }),

  reset: () => set({ ...initialState }),
}));
