import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Import each weight on its own path: the package root would add every weight to the app.
import { NotoSerifGujarati_400Regular } from '@expo-google-fonts/noto-serif-gujarati/400Regular';
import { NotoSerifGujarati_700Bold } from '@expo-google-fonts/noto-serif-gujarati/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import RootNavigator from './src/navigation/RootNavigator';
import { loadSavedLanguage } from './src/i18n';
import { restoreSession } from './src/services/session';
import type { AuthUser } from './src/types';
import { AuthProvider } from './src/context/AuthContext';
import { EventsProvider } from './src/context/EventsContext';
import { DonationsProvider } from './src/context/DonationsContext';
import { ReportsProvider } from './src/context/ReportsContext';
import { common } from './src/styles/common';

ExpoSplashScreen.preventAutoHideAsync();

const FONTS = {
  NotoSerifGujarati_400Regular,
  NotoSerifGujarati_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  const [savedDataReady, setSavedDataReady] = useState(false);
  const [savedUser, setSavedUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    Promise.all([loadSavedLanguage(), restoreSession()])
      .then(([, user]) => setSavedUser(user))
      .finally(() => setSavedDataReady(true));
  }, []);

  const ready = (fontsLoaded || !!fontError) && savedDataReady;

  const onLayout = useCallback(() => {
    if (ready) ExpoSplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <View style={common.screen} onLayout={onLayout}>
        <StatusBar style="dark" />
        <AuthProvider initialUser={savedUser}>
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
