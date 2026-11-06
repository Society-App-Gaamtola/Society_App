import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

/** Centred icon and message for an empty list. */
export default function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
});
