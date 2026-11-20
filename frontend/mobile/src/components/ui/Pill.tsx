import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, type Tone, themedStyles } from '../../theme';
import { useT } from '../../i18n';

type Props = { label: string; tone: Tone; style?: StyleProp<ViewStyle> };

/** Small coloured label. */
export default function Pill({ label, tone, style }: Props) {
  const t = useT();
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }, style]}>
      <Text style={[styles.text, { color: tone.text }]}>{t(label)}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  pill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  text: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
}));
