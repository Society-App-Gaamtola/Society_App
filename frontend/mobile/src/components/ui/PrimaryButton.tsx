import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, PRIMARY_GRADIENT, radius } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional icon shown before the title. */
  icon?: IoniconName;
};

export default function PrimaryButton({ title, onPress, disabled, loading, style, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.wrap, (pressed || disabled) && styles.dimmed, style]}
    >
      <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon} size={18} color={colors.white} /> : null}
            <Text style={styles.text}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: 52, borderRadius: radius.button, overflow: 'hidden' },
  dimmed: { opacity: 0.85 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.white },
});
