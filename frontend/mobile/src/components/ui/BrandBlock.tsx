import { Image, StyleSheet, Text, View } from 'react-native';
import { LOGO } from '../../config';
import { twoLines, useAppInfo } from '../../services/appInfo';
import { colors, fonts, spacing, themedStyles } from '../../theme';

type Props = { logoSize: number; fontSize: number; lineHeight: number };

/** Society logo with its name underneath. */
export default function BrandBlock({ logoSize, fontSize, lineHeight }: Props) {
  const { society_name_gu } = useAppInfo();
  return (
    <View style={styles.container}>
      <Image source={LOGO} style={[styles.logo, { width: logoSize, height: logoSize }]} resizeMode="contain" />
      <Text style={[styles.title, { fontSize, lineHeight }]}>{twoLines(society_name_gu)}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { marginBottom: spacing.sm },
  title: { fontFamily: fonts.gujaratiHeading, color: colors.primary, textAlign: 'center' },
}));
