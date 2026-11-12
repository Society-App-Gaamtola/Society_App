import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';

type Props = { name?: string; uri?: string | null; size?: number; style?: StyleProp<ViewStyle> };

/** Up to two letters from the name, e.g. "Ramesh Patel" → "RP". */
export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';

/** Round profile photo, or the user's initials when there is no photo. */
export default function ProfileAvatar({ name, uri, size = 88, style }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.ring, { borderRadius: size / 2 + 4 }, style]}>
      <View style={[styles.avatar, box]}>
        {uri ? (
          <Image source={{ uri }} style={box} accessibilityLabel={`${name ?? 'Profile'} photo`} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { padding: 3, backgroundColor: colors.lightGold },
  avatar: { backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: fonts.bold, color: colors.primary },
});
