export const colors = {
  primary: '#7A1020',
  primaryDark: '#5E0B17',
  background: '#FFF8EE',
  card: '#FFFFFF',
  gold: '#C9A24A',
  lightGold: '#E8D4A2',
  textDark: '#2B1A12',
  textMuted: '#7A6A5E',
  border: '#EADFCF',
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
} as const;

/** Text and background pairs for badges and icon circles. */
export const tones = {
  success: { text: '#1E8E4E', bg: '#E6F6EC' },
  danger: { text: '#C62828', bg: '#FDECEC' },
  info: { text: '#1E63C6', bg: '#E8F0FC' },
  warning: { text: '#E0700B', bg: '#FFF1E0' },
  neutral: { text: '#6B6B6B', bg: '#F0EEEC' },
  sky: { text: '#0A84B5', bg: '#E5F5FB' },
} as const;

export type Tone = { text: string; bg: string };

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
