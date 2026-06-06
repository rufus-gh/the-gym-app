import { create } from 'zustand';

export type BottomSheetContent =
  | 'setEditor'
  | 'exercisePicker'
  | 'restTimer'
  | 'plateCalculator'
  | null;

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
}

type ToastInput = Omit<Toast, 'id'>;

const MAX_TOASTS = 2;

interface UIState {
  activeTab: string;
  bottomSheetContent: BottomSheetContent;
  bottomSheetSetId: string | null;
  toasts: Toast[];
  isOffline: boolean;
  syncStatus: SyncStatus;
}

interface UIActions {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
  setBottomSheet: (content: BottomSheetContent, setId?: string) => void;
  closeBottomSheet: () => void;
  setOffline: (isOffline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

type UIStore = UIState & UIActions;

let toastCounter = 0;

function generateToastId(): string {
  toastCounter += 1;
  return `toast_${Date.now()}_${toastCounter}`;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'index',
  bottomSheetContent: null,
  bottomSheetSetId: null,
  toasts: [],
  isOffline: false,
  syncStatus: 'idle',

  showToast: (toastInput) =>
    set((state) => {
      const newToast: Toast = { ...toastInput, id: generateToastId() };
      let toasts = [...state.toasts, newToast];
      // Drop the oldest toast if already at MAX_TOASTS
      if (toasts.length > MAX_TOASTS) {
        toasts = toasts.slice(toasts.length - MAX_TOASTS);
      }
      return { toasts };
    }),

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setBottomSheet: (content, setId) =>
    set({
      bottomSheetContent: content,
      bottomSheetSetId: setId ?? null,
    }),

  closeBottomSheet: () =>
    set({
      bottomSheetContent: null,
      bottomSheetSetId: null,
    }),

  setOffline: (isOffline) => set({ isOffline }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),
}));
