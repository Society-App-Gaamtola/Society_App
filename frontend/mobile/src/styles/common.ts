import { StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

/** Card look shared by most list rows and panels; spread it into a style. */
export const surface = {
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  subtextRelaxed: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
});
