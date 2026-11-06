import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';

type LabelProps = { text: string; required?: boolean; style?: StyleProp<TextStyle> };

export function FieldLabel({ text, required = true, style }: LabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {text}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

type Props = {
  label: string;
  error?: string | null;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  children: ReactNode;
};

/** Label, the input passed as children, and an error message under it. */
export default function FormField({ label, error, required, style, labelStyle, children }: Props) {
  return (
    <View style={[styles.field, style]}>
      <FieldLabel text={label} required={required} style={labelStyle} />
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark, marginBottom: 6 },
  required: { color: colors.danger },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: 4 },
});
