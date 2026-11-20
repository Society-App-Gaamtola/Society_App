import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, themedStyles } from '../../theme';
import { useT } from '../../i18n';

/** Horizontal lines with "OR" between them. */
export default function OrDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useT();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <Text style={styles.text}>{t('OR')}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  text: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
}));
