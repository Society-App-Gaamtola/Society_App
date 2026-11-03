import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme';
import { useSideDrawer } from './SideDrawer';

export type HeaderRightIcon = 'search' | 'bell' | 'avatar' | 'more' | 'refresh';

type Props = {
  leftType?: 'menu' | 'back';
  onLeftPress?: () => void;
  rightIcons?: HeaderRightIcon[];
  onRightPress?: (icon: HeaderRightIcon) => void;
  avatarUri?: string;
};

const HEADER_HEIGHT = 64;

const iconNames = {
  search: 'search-outline',
  bell: 'notifications-outline',
  more: 'ellipsis-vertical',
  refresh: 'refresh',
} as const;

export default function AppHeader({ leftType = 'menu', onLeftPress, rightIcons = [], onRightPress, avatarUri }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const drawer = useSideDrawer();

  const handleLeft =
    onLeftPress ?? (leftType === 'back' ? () => navigation.canGoBack() && navigation.goBack() : drawer?.open);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isFocused ? <StatusBar style="light" /> : null}
      <View style={styles.bar}>
        <View style={styles.side}>
          <Pressable
            onPress={handleLeft}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={leftType === 'back' ? 'Go back' : 'Open menu'}
          >
            <Ionicons name={leftType === 'back' ? 'arrow-back' : 'menu'} size={24} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {'શ્રી ગામટોળા\nયુવક મિત્ર મંડળ'}
          </Text>
        </View>

        <View style={[styles.side, styles.right]}>
          {rightIcons.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => onRightPress?.(icon)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={icon}
            >
              {icon === 'avatar' ? (
                <View style={styles.avatar}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={16} color={colors.white} />
                  )}
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

const styles = StyleSheet.create({
  container: { backgroundColor: colors.primary },
  bar: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  side: { width: 96, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end', gap: 14 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 34, height: 34 },
  title: { fontFamily: fonts.gujaratiHeading, fontSize: 14, lineHeight: 20, color: colors.white },
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
  avatarImage: { width: '100%', height: '100%' },
});
