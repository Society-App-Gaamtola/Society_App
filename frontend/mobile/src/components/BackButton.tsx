import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

type Props = {
  /** Defaults to going back in the navigation stack. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function BackButton({ onPress, style }: Props) {
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={onPress ?? (() => navigation.canGoBack() && navigation.goBack())}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={[styles.button, style]}
    >
      <Ionicons name="arrow-back" size={24} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start', padding: 4 },
});
