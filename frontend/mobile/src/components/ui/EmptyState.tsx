import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, themedStyles } from '../../theme';
import { useT } from '../../i18n';

/** Centred icon and message for an empty list. */
export default function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  const t = useT();
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.text}>{t(text)}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
}));
