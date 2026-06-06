import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitPreference = 'kg' | 'lb';

interface SettingsState {
  unitPreference: UnitPreference;
  defaultBarWeightKg: number;
  availablePlatesKg: number[];
}

interface SettingsActions {
  setUnitPreference: (unit: UnitPreference) => void;
  setDefaultBarWeight: (kg: number) => void;
  setAvailablePlates: (platesKg: number[]) => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      unitPreference: 'kg',
      defaultBarWeightKg: 20,
      availablePlatesKg: [25, 20, 15, 10, 5, 2.5, 1.25],

      setUnitPreference: (unitPreference) => set({ unitPreference }),
      setDefaultBarWeight: (defaultBarWeightKg) => set({ defaultBarWeightKg }),
      setAvailablePlates: (availablePlatesKg) => set({ availablePlatesKg }),
    }),
    {
      name: 'gym-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
