import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

type Props<T extends string> = {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected?: T | null;
  onSelect: (option: T) => void;
  onClose: () => void;
};

/** Bottom sheet with a single-choice list, used for dropdown fields. */
export default function SelectSheet<T extends string>({ visible, title, options, selected, onSelect, onClose }: Props<T>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.optionText, active && styles.optionActive]}>{option}</Text>
              {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43, 26, 18, 0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 10 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, paddingHorizontal: 12, marginBottom: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  pressed: { backgroundColor: '#F8E9E9' },
  optionText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textDark },
  optionActive: { fontFamily: fonts.semiBold, color: colors.primary },
});
