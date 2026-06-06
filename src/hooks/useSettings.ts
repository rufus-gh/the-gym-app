import { useState, useEffect, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

type Theme = 'dark' | 'light' | 'system';
type OneRmFormula = 'epley' | 'brzycki' | 'lombardi' | 'oconner';
type UnitPreference = 'kg' | 'lb';

const SETTINGS_KEYS = {
  UNIT_PREFERENCE: 'SETTINGS_unit_preference',
  BAR_WEIGHT_KG: 'SETTINGS_bar_weight_kg',
  AVAILABLE_PLATES: 'SETTINGS_available_plates',
  REST_TIMER_AUTO_START: 'SETTINGS_rest_timer_auto_start',
  DEFAULT_REST_SECONDS: 'SETTINGS_default_rest_seconds',
  THEME: 'SETTINGS_theme',
  ONE_RM_FORMULA: 'SETTINGS_one_rm_formula',
  HAPTICS_ENABLED: 'SETTINGS_haptics_enabled',
  SOUND_ALERTS_ENABLED: 'SETTINGS_sound_alerts_enabled',
  WARMUP_PR_EXCLUSION: 'SETTINGS_warmup_pr_exclusion',
} as const;

const DEFAULTS = {
  unitPreference: 'kg' as UnitPreference,
  barWeightKg: 20,
  availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25],
  restTimerAutoStart: true,
  defaultRestSeconds: 120,
  theme: 'dark' as Theme,
  oneRmFormula: 'epley' as OneRmFormula,
  hapticsEnabled: true,
  soundAlertsEnabled: true,
  warmupPrExclusion: true,
};

interface Settings {
  unitPreference: UnitPreference;
  barWeightKg: number;
  availablePlates: number[];
  restTimerAutoStart: boolean;
  defaultRestSeconds: number;
  theme: Theme;
  oneRmFormula: OneRmFormula;
  hapticsEnabled: boolean;
  soundAlertsEnabled: boolean;
  warmupPrExclusion: boolean;
}

interface SettingsActions {
  setUnitPreference: (value: UnitPreference) => void;
  setBarWeightKg: (value: number) => void;
  setAvailablePlates: (value: number[]) => void;
  setRestTimerAutoStart: (value: boolean) => void;
  setDefaultRestSeconds: (value: number) => void;
  setTheme: (value: Theme) => void;
  setOneRmFormula: (value: OneRmFormula) => void;
  setHapticsEnabled: (value: boolean) => void;
  setSoundAlertsEnabled: (value: boolean) => void;
  setWarmupPrExclusion: (value: boolean) => void;
}

type UseSettingsReturn = Settings & SettingsActions;

function readSettings(): Settings {
  const unitRaw = storage.getString(SETTINGS_KEYS.UNIT_PREFERENCE);
  const barWeightRaw = storage.getNumber(SETTINGS_KEYS.BAR_WEIGHT_KG);
  const platesRaw = storage.getString(SETTINGS_KEYS.AVAILABLE_PLATES);
  const autoStartRaw = storage.getBoolean(SETTINGS_KEYS.REST_TIMER_AUTO_START);
  const restSecondsRaw = storage.getNumber(SETTINGS_KEYS.DEFAULT_REST_SECONDS);
  const themeRaw = storage.getString(SETTINGS_KEYS.THEME);
  const formulaRaw = storage.getString(SETTINGS_KEYS.ONE_RM_FORMULA);
  const hapticsRaw = storage.getBoolean(SETTINGS_KEYS.HAPTICS_ENABLED);
  const soundRaw = storage.getBoolean(SETTINGS_KEYS.SOUND_ALERTS_ENABLED);
  const warmupRaw = storage.getBoolean(SETTINGS_KEYS.WARMUP_PR_EXCLUSION);

  let availablePlates = DEFAULTS.availablePlates;
  if (platesRaw !== undefined) {
    try {
      const parsed: unknown = JSON.parse(platesRaw);
      if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'number')) {
        availablePlates = parsed as number[];
      }
    } catch {
      // malformed JSON — fall back to defaults
    }
  }

  return {
    unitPreference: (unitRaw as UnitPreference | undefined) ?? DEFAULTS.unitPreference,
    barWeightKg: barWeightRaw ?? DEFAULTS.barWeightKg,
    availablePlates,
    restTimerAutoStart: autoStartRaw ?? DEFAULTS.restTimerAutoStart,
    defaultRestSeconds: restSecondsRaw ?? DEFAULTS.defaultRestSeconds,
    theme: (themeRaw as Theme | undefined) ?? DEFAULTS.theme,
    oneRmFormula: (formulaRaw as OneRmFormula | undefined) ?? DEFAULTS.oneRmFormula,
    hapticsEnabled: hapticsRaw ?? DEFAULTS.hapticsEnabled,
    soundAlertsEnabled: soundRaw ?? DEFAULTS.soundAlertsEnabled,
    warmupPrExclusion: warmupRaw ?? DEFAULTS.warmupPrExclusion,
  };
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(readSettings);

  useEffect(() => {
    const listener = storage.addOnValueChangedListener(() => {
      setSettings(readSettings());
    });
    return () => listener.remove();
  }, []);

  const setUnitPreference = useCallback((value: UnitPreference) => {
    storage.set(SETTINGS_KEYS.UNIT_PREFERENCE, value);
  }, []);

  const setBarWeightKg = useCallback((value: number) => {
    storage.set(SETTINGS_KEYS.BAR_WEIGHT_KG, value);
  }, []);

  const setAvailablePlates = useCallback((value: number[]) => {
    storage.set(SETTINGS_KEYS.AVAILABLE_PLATES, JSON.stringify(value));
  }, []);

  const setRestTimerAutoStart = useCallback((value: boolean) => {
    storage.set(SETTINGS_KEYS.REST_TIMER_AUTO_START, value);
  }, []);

  const setDefaultRestSeconds = useCallback((value: number) => {
    storage.set(SETTINGS_KEYS.DEFAULT_REST_SECONDS, value);
  }, []);

  const setTheme = useCallback((value: Theme) => {
    storage.set(SETTINGS_KEYS.THEME, value);
  }, []);

  const setOneRmFormula = useCallback((value: OneRmFormula) => {
    storage.set(SETTINGS_KEYS.ONE_RM_FORMULA, value);
  }, []);

  const setHapticsEnabled = useCallback((value: boolean) => {
    storage.set(SETTINGS_KEYS.HAPTICS_ENABLED, value);
  }, []);

  const setSoundAlertsEnabled = useCallback((value: boolean) => {
    storage.set(SETTINGS_KEYS.SOUND_ALERTS_ENABLED, value);
  }, []);

  const setWarmupPrExclusion = useCallback((value: boolean) => {
    storage.set(SETTINGS_KEYS.WARMUP_PR_EXCLUSION, value);
  }, []);

  return {
    ...settings,
    setUnitPreference,
    setBarWeightKg,
    setAvailablePlates,
    setRestTimerAutoStart,
    setDefaultRestSeconds,
    setTheme,
    setOneRmFormula,
    setHapticsEnabled,
    setSoundAlertsEnabled,
    setWarmupPrExclusion,
  };
}
