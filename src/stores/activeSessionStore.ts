import { create } from 'zustand';

interface SessionExerciseState {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  setIds: string[];
}

interface ActiveSessionState {
  sessionId: string | null;
  sessionName: string;
  startedAt: Date | null;
  elapsedSeconds: number;
  exercises: SessionExerciseState[];
  activeSetId: string | null;
  completedSetIds: Set<string>;
  prSetIds: Set<string>;
}

interface ActiveSessionActions {
  startSession: (params: { sessionId: string; name: string }) => void;
  endSession: () => void;
  addExercise: (exercise: SessionExerciseState) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (from: number, to: number) => void;
  addSetId: (exerciseId: string, setId: string) => void;
  removeSetId: (exerciseId: string, setId: string) => void;
  markSetComplete: (setId: string) => void;
  rollbackSetComplete: (setId: string) => void;
  markSetAsPR: (setId: string) => void;
  setActiveSetId: (setId: string | null) => void;
  tickElapsed: () => void;
  reset: () => void;
}

type ActiveSessionStore = ActiveSessionState & ActiveSessionActions;

const initialState: ActiveSessionState = {
  sessionId: null,
  sessionName: '',
  startedAt: null,
  elapsedSeconds: 0,
  exercises: [],
  activeSetId: null,
  completedSetIds: new Set(),
  prSetIds: new Set(),
};

export const useActiveSessionStore = create<ActiveSessionStore>((set) => ({
  ...initialState,

  startSession: ({ sessionId, name }) =>
    set({
      sessionId,
      sessionName: name,
      startedAt: new Date(),
      elapsedSeconds: 0,
      exercises: [],
      activeSetId: null,
      completedSetIds: new Set(),
      prSetIds: new Set(),
    }),

  endSession: () =>
    set({
      sessionId: null,
      sessionName: '',
      startedAt: null,
    }),

  addExercise: (exercise) =>
    set((state) => ({
      exercises: [...state.exercises, exercise],
    })),

  removeExercise: (exerciseId) =>
    set((state) => ({
      exercises: state.exercises.filter((e) => e.exerciseId !== exerciseId),
    })),

  reorderExercises: (from, to) =>
    set((state) => {
      const exercises = [...state.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
      return {
        exercises: exercises.map((e, i) => ({ ...e, orderIndex: i })),
      };
    }),

  addSetId: (exerciseId, setId) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, setIds: [...e.setIds, setId] }
          : e,
      ),
    })),

  removeSetId: (exerciseId, setId) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, setIds: e.setIds.filter((id) => id !== setId) }
          : e,
      ),
    })),

  markSetComplete: (setId) =>
    set((state) => {
      const next = new Set(state.completedSetIds);
      next.add(setId);
      return { completedSetIds: next };
    }),

  rollbackSetComplete: (setId) =>
    set((state) => {
      const next = new Set(state.completedSetIds);
      next.delete(setId);
      return { completedSetIds: next };
    }),

  markSetAsPR: (setId) =>
    set((state) => {
      const next = new Set(state.prSetIds);
      next.add(setId);
      return { prSetIds: next };
    }),

  setActiveSetId: (setId) => set({ activeSetId: setId }),

  tickElapsed: () =>
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  reset: () => set({ ...initialState, completedSetIds: new Set(), prSetIds: new Set() }),
}));
