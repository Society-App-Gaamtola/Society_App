import { useSyncExternalStore } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Light and dark palettes ----------
// Every screen reads `colors.x` / `tones.x`: they always return the active theme's value.
// Dark theme: black background, near-black cards, warm off-white text and brighter accents, so text stays readable
// (body text and accents are well above the 4.5:1 contrast guideline on black).

const light = {
  primary: '#7A1020',
  primaryDark: '#5E0B17',
  background: '#FFF8EE',
  card: '#FFFFFF',
  gold: '#C9A24A',
  whatsapp: '#1FA855',
  lightGold: '#E8D4A2',
  textDark: '#2B1A12',
  textMuted: '#7A6A5E',
  border: '#EADFCF',
  /** Text and icons on maroon / photos. A white surface is `card`. */
  white: '#FFFFFF',
  danger: '#C62828',
  warning: '#E0700B',
  mutedIcon: '#9A8F86',
  placeholder: '#A89E94',
  tint: '#F8E9E9',
  softTint: '#FBEFEF',
  dashedBorder: '#D9CBB8',
  noteBackground: '#FDF3E4',
  backdrop: 'rgba(43, 26, 18, 0.35)',
  backdropStrong: 'rgba(43, 26, 18, 0.45)',
  /** Top bar behind the logo and white icons */
  header: '#7A1020',
  // Soft backgrounds and borders that were hard-coded in screens
  goldTint: '#FBF1D6',
  goldBorder: '#F1DFA0',
  goldText: '#8A6A12',
  peachTint: '#FDEFE3',
  peachText: '#B45309',
  /** Inactive chips, tracks and segmented controls */
  sand: '#EFEAE4',
  disabledText: '#CFC6BC',
  dangerBorder: '#F1D9D9',
  orangeBorder: '#F6D3AE',
  successBorder: '#BFE5CC',
  /** QR codes are always black on white (in both themes): scanners need dark dots on a light background */
  qrDots: '#000000',
  qrBackground: '#FFFFFF',
};

export type Palette = typeof light;

const dark: Palette = {
  primary: '#D94A62',
  primaryDark: '#B33A50',
  background: '#000000',
  card: '#141414',
  gold: '#D8B25C',
  whatsapp: '#25D366',
  lightGold: '#8C7845',
  textDark: '#F2ECE4',
  textMuted: '#A99F94',
  border: '#2A2A2A',
  white: '#FFFFFF',
  danger: '#FF6B6B',
  warning: '#FFA94D',
  mutedIcon: '#8A837C',
  placeholder: '#6F6A64',
  tint: '#2A1419',
  softTint: '#1F1215',
  dashedBorder: '#3D3A36',
  noteBackground: '#1E1A14',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  backdropStrong: 'rgba(0, 0, 0, 0.7)',
  header: '#16080B',
  goldTint: '#2E2614',
  goldBorder: '#5A4A22',
  goldText: '#E2C46E',
  peachTint: '#2A1E16',
  peachText: '#F59E5B',
  sand: '#262320',
  disabledText: '#5C554F',
  dangerBorder: '#5A2A2A',
  orangeBorder: '#5A3D22',
  successBorder: '#22523A',
  qrDots: '#000000',
  qrBackground: '#FFFFFF',
};

type ToneName = 'success' | 'danger' | 'info' | 'warning' | 'neutral' | 'sky';
export type Tone = { text: string; bg: string };

/** Text and background pairs for badges and icon circles. */
const lightTones: Record<ToneName, Tone> = {
  success: { text: '#1E8E4E', bg: '#E6F6EC' },
  danger: { text: '#C62828', bg: '#FDECEC' },
  info: { text: '#1E63C6', bg: '#E8F0FC' },
  warning: { text: '#E0700B', bg: '#FFF1E0' },
  neutral: { text: '#6B6B6B', bg: '#F0EEEC' },
  sky: { text: '#0A84B5', bg: '#E5F5FB' },
};
const darkTones: Record<ToneName, Tone> = {
  success: { text: '#5BD68D', bg: '#12301F' },
  danger: { text: '#FF8A8A', bg: '#3A1616' },
  info: { text: '#7FB2FF', bg: '#132540' },
  warning: { text: '#FFB25C', bg: '#3A2A12' },
  neutral: { text: '#C4C4C4', bg: '#2A2A2A' },
  sky: { text: '#5CC8F0', bg: '#10303D' },
};

// ---------- Theme mode (saved on the phone) ----------
export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'theme_mode';
let mode: ThemeMode = 'light';
const listeners = new Set<() => void>();

export const getThemeMode = () => mode;

/** Applies the theme saved on a previous launch, before the first screen is drawn. */
export async function loadSavedTheme() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') mode = saved;
  } catch {
    // Keep the light theme if storage is unavailable.
  }
}

/** Switches the theme at once (the app redraws in the new colors) and remembers it. */
export async function setThemeMode(next: ThemeMode) {
  mode = next;
  listeners.forEach((listener) => listener());
  await AsyncStorage.setItem(STORAGE_KEY, next);
}

/** The current theme; the component re-renders when it changes. */
export function useThemeMode() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getThemeMode,
  );
}

// `colors.primary` etc. read the active palette every time, so styles built at render time follow the theme.
export const colors = Object.defineProperties(
  {},
  Object.fromEntries(Object.keys(light).map((key) => [key, { get: () => (mode === 'dark' ? dark : light)[key as keyof Palette], enumerable: true }])),
) as Palette;

// tones.success stays the same object; its text / bg follow the theme (safe to keep in module-level maps)
export const tones = Object.fromEntries(
  (Object.keys(lightTones) as ToneName[]).map((name) => [
    name,
    Object.defineProperties({} as Tone, {
      text: { get: () => (mode === 'dark' ? darkTones : lightTones)[name].text, enumerable: true },
      bg: { get: () => (mode === 'dark' ? darkTones : lightTones)[name].bg, enumerable: true },
    }),
  ]),
) as Record<ToneName, Tone>;

/**
 * StyleSheet.create for theme-aware styles: `const styles = themedStyles(() => ({ ... }))`.
 * The styles are built on first use for each theme (so colors.x inside them follow the theme) and then cached.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function themedStyles<T extends NamedStyles<T>>(factory: () => T): T {
  const cache: Partial<Record<ThemeMode, T>> = {};
  return new Proxy({} as T, {
    get: (_, prop) => {
      const sheet = (cache[mode] ??= StyleSheet.create(factory() as NamedStyles<T>) as T);
      return sheet[prop as keyof T];
    },
  });
}

export const PRIMARY_GRADIENT = ['#8E1426', '#6A0D1B'] as const;

export const radius = {
  card: 12,
  button: 12,
  image: 20,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Font family names as registered in App.tsx via useFonts.
export const fonts = {
  gujaratiHeading: 'NotoSerifGujarati_700Bold',
  gujaratiRegular: 'NotoSerifGujarati_400Regular',
  hindi: 'NotoSansDevanagari_400Regular',
  hindiBold: 'NotoSansDevanagari_700Bold',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type Language = 'gu' | 'hi' | 'en';

/** Picks a font that can render the given language's script. */
export const fontFor = (lang: Language, weight: 'regular' | 'bold' = 'regular') => {
  if (lang === 'gu') return weight === 'bold' ? fonts.gujaratiHeading : fonts.gujaratiRegular;
  if (lang === 'hi') return weight === 'bold' ? fonts.hindiBold : fonts.hindi;
  return weight === 'bold' ? fonts.semiBold : fonts.regular;
};
