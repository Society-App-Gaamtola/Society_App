import { StyleSheet, View } from 'react-native';
import { colors, themedStyles } from '../../theme';
import OutlineButton from '../ui/OutlineButton';
import PrimaryButton from '../ui/PrimaryButton';
import type { IoniconName } from '../../icons';

type Props = {
  onSaveDraft: () => void;
  primaryTitle: string;
  onPrimary: () => void;
  /** Saving: both buttons wait, the main one shows a spinner */
  busy?: boolean;
  /** The second button's text and icon (default "Save Draft") */
  draftTitle?: string;
  draftIcon?: IoniconName;
};

/** "Save Draft" and a main action, fixed below a scrolling form. */
export default function FormActionBar({ onSaveDraft, primaryTitle, onPrimary, busy, draftTitle = 'Save Draft', draftIcon = 'save-outline' }: Props) {
  return (
    <View style={styles.bar}>
      <OutlineButton title={draftTitle} icon={draftIcon} onPress={busy ? () => {} : onSaveDraft} style={styles.button} />
      <PrimaryButton title={primaryTitle} onPress={onPrimary} loading={busy} style={styles.button} />
    </View>
  );
}

const styles = themedStyles(() => ({
  bar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: { flex: 1, width: 'auto' },
}));
