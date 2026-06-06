/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#FF3B30',
        accent: '#007AFF',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        pr: '#FFD700',
        'bg-primary-dark': '#000000',
        'bg-secondary-dark': '#1C1C1E',
        'bg-tertiary-dark': '#2C2C2E',
        'bg-elevated-dark': '#3A3A3C',
        'bg-primary-light': '#F2F2F7',
        'bg-secondary-light': '#FFFFFF',
        'label-primary-dark': '#FFFFFF',
        'label-secondary-dark': 'rgba(235,235,245,0.6)',
        'label-primary-light': '#000000',
        'label-secondary-light': 'rgba(60,60,67,0.6)',
        separator: '#38383A',
      },
      fontFamily: {
        mono: ['SpaceMono'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
