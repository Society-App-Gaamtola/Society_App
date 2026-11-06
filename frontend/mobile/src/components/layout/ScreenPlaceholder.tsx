import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../theme';
import AppHeader, { type HeaderRightIcon } from './AppHeader';

type Props = {
  title: string;
  leftType?: 'menu' | 'back';
  rightIcons?: HeaderRightIcon[];
  children?: ReactNode;
};

/** Header plus a "coming soon" body, for screens that are not designed yet. */
export default function ScreenPlaceholder({ title, leftType = 'menu', rightIcons = ['bell', 'avatar'], children }: Props) {
  return (
    <View style={styles.container}>
      <AppHeader leftType={leftType} rightIcons={rightIcons} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
