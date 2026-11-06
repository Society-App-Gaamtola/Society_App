import { Image, StyleSheet, Text, View } from 'react-native';
import { LOGO, SOCIETY_NAME_GU_TWO_LINES } from '../../config';
import { colors, fonts, spacing } from '../../theme';

type Props = { logoSize: number; fontSize: number; lineHeight: number };

/** Society logo with its name underneath. */
export default function BrandBlock({ logoSize, fontSize, lineHeight }: Props) {
  return (
    <View style={styles.container}>
      <Image source={LOGO} style={[styles.logo, { width: logoSize, height: logoSize }]} resizeMode="contain" />
      <Text style={[styles.title, { fontSize, lineHeight }]}>{SOCIETY_NAME_GU_TWO_LINES}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { marginBottom: spacing.sm },
  title: { fontFamily: fonts.gujaratiHeading, color: colors.primary, textAlign: 'center' },
});
