import { Pressable, ScrollView, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';

type Props<T extends string> = {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
  style,
  contentContainerStyle,
}: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  textActive: { color: colors.white },
});
