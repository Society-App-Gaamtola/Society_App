import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: { DEFAULT: '#7A1020', dark: '#5E0B17' },
        cream: '#FFF8EE',
        gold: '#C9A24A',
        border: '#EADFCF',
        input: '#EADFCF',
        ring: '#7A1020',
        background: '#FFF8EE',
        foreground: '#2B1A12',
        primary: { DEFAULT: '#7A1020', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#F5EEE4', foreground: '#2B1A12' },
        destructive: { DEFAULT: '#C62828', foreground: '#FFFFFF' },
        muted: { DEFAULT: '#F5EEE4', foreground: '#7A6A5E' },
        accent: { DEFAULT: '#FBEFEF', foreground: '#7A1020' },
        popover: { DEFAULT: '#FFFFFF', foreground: '#2B1A12' },
        card: { DEFAULT: '#FFFFFF', foreground: '#2B1A12' },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
        gujarati: ['var(--font-gujarati)', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
