import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { common } from '../../styles/common';
import { spacing } from '../../theme';
import LotusFooter from '../ui/LotusFooter';
import KeyboardAvoid from './KeyboardAvoid';

type Props = {
  children: ReactNode;
  /** Keeps the scroll bar visible while scrolling. */
  showScrollIndicator?: boolean;
  /** Rendered outside the scrolling content, e.g. a loading overlay. */
  overlay?: ReactNode;
};

/** Scrolling form on the background colour with the lotus at the bottom, for login and sign-up. */
export default function AuthScreenLayout({ children, showScrollIndicator, overlay }: Props) {
  return (
    <SafeAreaView style={common.screen}>
      <KeyboardAvoid>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={showScrollIndicator ? undefined : false}
        >
          {children}
          <View style={styles.footer}>
            <LotusFooter />
          </View>
        </ScrollView>
      </KeyboardAvoid>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.lg },
  footer: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.md },
});
