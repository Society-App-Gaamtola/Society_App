import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import SplashScreen from '../screens/SplashScreen';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.textDark,
    border: colors.border,
  },
};

// Screens load the first time they open (getComponent), which keeps app start fast on low-end phones.
export default function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" getComponent={() => require('../screens/OnboardingScreen').default} />
        <Stack.Screen name="LanguageSelect" getComponent={() => require('../screens/LanguageSelectScreen').default} />
        <Stack.Screen name="Login" getComponent={() => require('../screens/LoginScreen').default} />
        <Stack.Screen name="Register" getComponent={() => require('../screens/RegisterScreen').default} />
        <Stack.Screen name="Otp" getComponent={() => require('../screens/OtpScreen').default} />
        <Stack.Screen name="ProfileSetup" getComponent={() => require('../screens/ProfileSetupScreen').default} />
        <Stack.Screen name="Main" getComponent={() => require('./MainTabs').default} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
