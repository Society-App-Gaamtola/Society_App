import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';
import { Lotus } from './Ornaments';

type Props = { style?: StyleProp<ViewStyle> };

/** Faded lotus with thin gold lines either side; place at the bottom of a screen. */
export default function LotusFooter({ style }: Props) {
  return (
    <View style={[styles.row, style]} pointerEvents="none">
      <View style={styles.line} />
      <Lotus width={72} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  line: {
    width: 64,
    height: 1,
    backgroundColor: colors.gold,
    opacity: 0.5,
    marginBottom: 4,
  },
});
