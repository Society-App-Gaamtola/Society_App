import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

export type SheetAction = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
  onPress: () => void;
};

type Props = { visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void };

/** Bottom sheet of actions, used for "⋯" menus. */
export default function ActionSheet({ visible, title, actions, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.menu, { paddingBottom: 12 + insets.bottom }]}>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {actions.map((action) => (
          <Pressable
            key={action.label}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={() => {
              onClose();
              action.onPress();
            }}
          >
            <Ionicons name={action.icon} size={20} color={action.danger ? '#C62828' : colors.textDark} />
            <Text style={[styles.text, action.danger && styles.danger]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43, 26, 18, 0.35)' },
  menu: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 8,
  },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.textDark, paddingHorizontal: 12, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 8 },
  pressed: { backgroundColor: '#F8E9E9' },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  danger: { color: '#C62828' },
});
