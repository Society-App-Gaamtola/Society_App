import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, themedStyles } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';
import { useT } from '../../i18n';

type Props = {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Optional icon shown before the title. */
  icon?: IoniconName;
};

export default function OutlineButton({ title, onPress, style, icon }: Props) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={styles.text}>{t(title)}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
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
  text: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.primary },
}));
