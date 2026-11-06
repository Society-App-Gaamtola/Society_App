import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import OutlineButton from '../ui/OutlineButton';
import PrimaryButton from '../ui/PrimaryButton';

type Props = { onSaveDraft: () => void; primaryTitle: string; onPrimary: () => void };

/** "Save Draft" and a main action, fixed below a scrolling form. */
export default function FormActionBar({ onSaveDraft, primaryTitle, onPrimary }: Props) {
  return (
    <View style={styles.bar}>
      <OutlineButton title="Save Draft" icon="save-outline" onPress={onSaveDraft} style={styles.button} />
      <PrimaryButton title={primaryTitle} onPress={onPrimary} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: { flex: 1, width: 'auto' },
});
