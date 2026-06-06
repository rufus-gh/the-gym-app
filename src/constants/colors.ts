export const colors = {
  background: {
    primary: { dark: '#000000', oled: '#000000', light: '#F2F2F7' },
    secondary: { dark: '#1C1C1E', oled: '#111111', light: '#FFFFFF' },
    tertiary: { dark: '#2C2C2E', oled: '#1A1A1A', light: '#F2F2F7' },
    elevated: { dark: '#3A3A3C', oled: '#222222', light: '#FFFFFF' },
  },
  label: {
    primary: { dark: '#FFFFFF', light: '#000000' },
    secondary: { dark: 'rgba(235,235,245,0.6)', light: 'rgba(60,60,67,0.6)' },
    tertiary: { dark: 'rgba(235,235,245,0.3)', light: 'rgba(60,60,67,0.3)' },
    disabled: { dark: 'rgba(235,235,245,0.19)', light: 'rgba(60,60,67,0.19)' },
  },
  system: {
    blue: '#007AFF',
    green: '#34C759',
    orange: '#FF9500',
    red: '#FF3B30',
    purple: '#AF52DE',
    yellow: '#FFCC00',
    pink: '#FF2D55',
    teal: '#5AC8FA',
  },
  semantic: {
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
    pr: '#FFD700',
    plateau: '#FF9500',
  },
  separator: { dark: '#38383A', light: '#C6C6C8' },
} as const;

export type ColorScheme = 'dark' | 'oled' | 'light';
