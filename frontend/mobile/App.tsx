import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  NotoSerifGujarati_400Regular,
  NotoSerifGujarati_700Bold,
} from '@expo-google-fonts/noto-serif-gujarati';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { loadSavedLanguage } from './src/i18n';
import { AuthProvider } from './src/auth/AuthContext';
import { EventsProvider } from './src/events/EventsContext';
import { DonationsProvider } from './src/donations/DonationsContext';
import { ReportsProvider } from './src/reports/ReportsContext';

ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSerifGujarati_400Regular,
    NotoSerifGujarati_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    loadSavedLanguage().finally(() => setLanguageReady(true));
  }, []);

  const ready = (fontsLoaded || !!fontError) && languageReady;

  const onLayout = useCallback(() => {
    if (ready) ExpoSplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayout}>
        <StatusBar style="dark" />
        <AuthProvider>
          <EventsProvider>
            <DonationsProvider>
              <ReportsProvider>
                <RootNavigator />
              </ReportsProvider>
            </DonationsProvider>
          </EventsProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
