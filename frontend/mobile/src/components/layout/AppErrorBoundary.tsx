import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { colors, fonts, radius, spacing, themedStyles } from '../../theme';
import { t } from '../../i18n';
import PrimaryButton from '../ui/PrimaryButton';

type State = { error: Error | null; componentStack: string };

// Set while the boundary is on screen: shows a fatal error the global handler caught
let showError: ((error: Error) => void) | null = null;

/**
 * In a built app (APK) a JavaScript error closes the app with no message. This keeps it open and shows the error on
 * the screen below, so a tester can send a screenshot. In Expo Go / development the usual red error screen stays.
 */
export function installCrashHandler() {
  if (__DEV__) return;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal && showError) return showError(error instanceof Error ? error : new Error(String(error)));
    previous(error, isFatal);
  });
}

/** Wraps the whole app: an error while drawing a screen (or a fatal one from installCrashHandler) shows this screen. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  componentDidMount() {
    showError = (error) => this.setState({ error, componentStack: '' });
  }

  componentWillUnmount() {
    showError = null;
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    // The error may come before the first screen hid the start-up splash image
    ExpoSplashScreen.hideAsync().catch(() => {});

    const detail = `${error.name}: ${error.message}\n\n${componentStack.trim()}\n\n${error.stack ?? ''}`.slice(0, 4000);
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.title}>{t('Something went wrong')}</Text>
        <Text style={styles.note}>{t('Please send a screenshot of this screen to the team.')}</Text>
        <ScrollView style={styles.box}>
          <Text selectable style={styles.detail}>{detail}</Text>
        </ScrollView>
        <PrimaryButton title="Try Again" onPress={() => this.setState({ error: null, componentStack: '' })} />
      </SafeAreaView>
    );
  }
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDark },
  box: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  detail: { fontSize: 12, color: colors.textMuted },
}));
