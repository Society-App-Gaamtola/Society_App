import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '../../icons';
import { colors, fonts, spacing } from '../../theme';

const AVATAR_SIZE = 110;

type Props = { uri?: string | null; error?: string | null; onPress: () => void };

/** Round profile photo with an add badge, plus the upload hint and any error under it. */
export default function AvatarPicker({ uri, error, onPress }: Props) {
  return (
    <View style={styles.section}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Upload profile photo">
        <View style={styles.avatar}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} />
          ) : (
            <Ionicons name="camera-outline" size={36} color={colors.mutedIcon} />
          )}
        </View>
        <View style={styles.badge}>
          <Ionicons name="add" size={18} color={colors.white} />
        </View>
      </Pressable>
      <Text style={styles.title}>Upload Profile Photo</Text>
      <Text style={styles.hint}>JPG, PNG (Max 2MB)</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignItems: 'center', marginVertical: spacing.lg },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#EFE6DC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark, marginTop: spacing.sm },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginTop: 4 },
});
