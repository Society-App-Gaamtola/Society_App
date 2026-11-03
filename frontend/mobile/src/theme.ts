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
} as const;

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

export const theme = { colors, radius, spacing, fonts };
export default theme;
