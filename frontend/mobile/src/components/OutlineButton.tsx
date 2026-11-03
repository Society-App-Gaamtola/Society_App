import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fontFamily?: string;
  /** Optional icon shown before the title. */
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export default function OutlineButton({ title, onPress, disabled, style, fontFamily, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={[styles.text, fontFamily ? { fontFamily } : null]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 52,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: { backgroundColor: colors.background },
  disabled: { opacity: 0.5 },
  text: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.primary },
});
