import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type ModalProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';

type Props = {
  visible: boolean;
  animationType: ModalProps['animationType'];
  onClose: () => void;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Panel at the bottom of the screen; tapping the dimmed area above it closes it. */
export default function ModalSheet({ visible, animationType, onClose, style, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={style}>{children}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
});
