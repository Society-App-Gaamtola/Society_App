import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { Ionicons, type IoniconName } from '../../icons';
import ModalSheet from './ModalSheet';

type SheetAction = {
  label: string;
  icon: IoniconName;
  danger?: boolean;
  onPress: () => void;
};

type Props = { visible: boolean; title?: string; actions: SheetAction[]; onClose: () => void };

/** Bottom sheet of actions, used for "⋯" menus. */
export default function ActionSheet({ visible, title, actions, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ModalSheet visible={visible} animationType="fade" onClose={onClose} style={[styles.menu, { paddingBottom: 12 + insets.bottom }]}>
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
          <Ionicons name={action.icon} size={20} color={action.danger ? colors.danger : colors.textDark} />
          <Text style={[styles.text, action.danger && styles.danger]}>{action.label}</Text>
        </Pressable>
      ))}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  menu: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 8,
  },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.textDark, paddingHorizontal: 12, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 8 },
  pressed: { backgroundColor: colors.tint },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDark },
  danger: { color: colors.danger },
});
