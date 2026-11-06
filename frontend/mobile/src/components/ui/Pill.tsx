import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, type Tone } from '../../theme';

type Props = { label: string; tone: Tone; style?: StyleProp<ViewStyle> };

/** Small coloured label. */
export default function Pill({ label, tone, style }: Props) {
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }, style]}>
      <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  text: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
});
