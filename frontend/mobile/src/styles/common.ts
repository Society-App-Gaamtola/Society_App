import { StyleSheet } from 'react-native';
import { colors, fonts, themedStyles } from '../theme';

/** Card look shared by most list rows and panels; spread it into a style. */
// Getters, so spreading it inside themedStyles() picks up the current theme's colors
export const surface = {
  get backgroundColor() {
    return colors.card;
  },
  borderRadius: 12,
  borderWidth: 1,
  get borderColor() {
    return colors.border;
  },
};

export const common = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  subtextRelaxed: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
}));
