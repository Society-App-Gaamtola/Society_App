import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';

type Props = {
  /** Icon before the text. */
  icon?: IoniconName;
  /** Icon after the text, e.g. a dropdown arrow. */
  trailingIcon?: IoniconName;
  placeholder?: string;
  value?: string | null;
  error?: boolean;
  onPress: () => void;
};

/** Looks like an input but opens a picker or sheet when tapped. */
export default function PickerField({ icon, trailingIcon, placeholder, value, error, onPress }: Props) {
  return (
    <Pressable style={[styles.picker, error && styles.error]} onPress={onPress} accessibilityRole="button">
      {icon ? <Ionicons name={icon} size={18} color={colors.mutedIcon} /> : null}
      <Text style={[styles.text, !value && styles.placeholder]} numberOfLines={1}>
        {value ?? placeholder}
      </Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={18} color={colors.mutedIcon} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  error: { borderColor: colors.danger },
  text: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDark },
  placeholder: { color: colors.placeholder },
});
