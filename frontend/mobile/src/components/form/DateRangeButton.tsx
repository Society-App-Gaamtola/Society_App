import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { surface } from '../../styles/common';
import { colors, fonts, themedStyles } from '../../theme';
import { Ionicons } from '../../icons';
import { useT } from '../../i18n';

type Props = { label: string; onPress: () => void; style?: StyleProp<ViewStyle> };

/** Shows the selected date range and opens the range picker. */
export default function DateRangeButton({ label, onPress, style }: Props) {
  const t = useT();
  return (
    <Pressable style={[styles.button, style]} onPress={onPress} accessibilityRole="button">
      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
      <Text style={styles.text}>{t(label)}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  button: {
    ...surface,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },
}));
