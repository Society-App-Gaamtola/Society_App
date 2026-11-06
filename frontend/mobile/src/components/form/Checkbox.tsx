import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '../../icons';
import { colors, fonts } from '../../theme';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Text or custom content shown to the right of the box. */
  label?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Checkbox({ checked, onChange, label, style }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.row, style]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
      {typeof label === 'string' ? <Text style={styles.label}>{label}</Text> : label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
});
