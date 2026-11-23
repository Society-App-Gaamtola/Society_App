import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { LOGO } from '../../config';
import { twoLines, useAppInfo } from '../../services/appInfo';
import { colors, fonts, setThemeMode, themedStyles, useThemeMode } from '../../theme';
import { Ionicons } from '../../icons';
import { useSideDrawer } from './SideDrawer';

export type HeaderRightIcon = 'search' | 'bell' | 'avatar' | 'more' | 'refresh';

type Props = {
  leftType?: 'menu' | 'back';
  rightIcons?: HeaderRightIcon[];
  onRightPress?: (icon: HeaderRightIcon) => void;
};

const HEADER_HEIGHT = 64;

const iconNames = {
  search: 'search-outline',
  bell: 'notifications-outline',
  more: 'ellipsis-vertical',
  refresh: 'refresh',
} as const;

export default function AppHeader({ leftType = 'menu', rightIcons = [], onRightPress }: Props) {
  // App Settings' Gujarati name (saved on the phone, refreshed from the server)
  const { society_name_gu: societyName } = useAppInfo();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const drawer = useSideDrawer();
  const mode = useThemeMode();
  const dark = mode === 'dark';

  const handleLeft = leftType === 'back' ? () => navigation.canGoBack() && navigation.goBack() : drawer?.open;

  // The bell and the avatar work the same on every screen; other icons are up to the screen.
  const handleRight = (icon: HeaderRightIcon) => {
    if (icon === 'bell') navigation.navigate('Main', { screen: 'Home', params: { screen: 'Notifications' } });
    else if (icon === 'avatar') navigation.navigate('Main', { screen: 'Profile', params: { screen: 'ProfileMain' } });
    else onRightPress?.(icon);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isFocused ? <StatusBar style="light" /> : null}
      <View style={styles.bar}>
        {/* Left: menu / back, then the logo and the society name */}
        <View style={styles.left}>
          <Pressable
            onPress={handleLeft}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={leftType === 'back' ? 'Go back' : 'Open menu'}
          >
            <Ionicons name={leftType === 'back' ? 'arrow-back' : 'menu'} size={24} color={colors.white} />
          </Pressable>
          <View style={styles.logoCircle}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {twoLines(societyName)}
          </Text>
        </View>

        <View style={styles.right}>
          {/* Light / dark theme, saved on the phone; the whole app redraws in the new colors */}
          <Pressable
            onPress={() => setThemeMode(dark ? 'light' : 'dark').catch(() => {})}
            hitSlop={8}
            style={styles.themeButton}
            accessibilityRole="switch"
            accessibilityState={{ checked: dark }}
            accessibilityLabel={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={16} color={colors.white} />
          </Pressable>
          {rightIcons.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => handleRight(icon)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={icon}
            >
              {icon === 'avatar' ? (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={16} color={colors.white} />
                </View>
              ) : (
                <Ionicons name={iconNames[icon]} size={22} color={colors.white} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { backgroundColor: colors.header },
  bar: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // The logo needs a white circle in both themes
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 34, height: 34 },
  themeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flexShrink: 1, fontFamily: fonts.gujaratiHeading, fontSize: 14, lineHeight: 20, color: colors.white },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
}));
