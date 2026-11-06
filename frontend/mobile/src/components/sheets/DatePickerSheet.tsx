import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts } from '../../theme';
import ModalSheet from './ModalSheet';

type Props = {
  mode: 'date' | 'time' | 'datetime';
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  doneLabel?: string;
  onChange: (value: Date) => void;
  onCancel: () => void;
  onDone: () => void;
};

/** iOS date and time picker in a bottom sheet; Android uses its native dialog instead. */
export default function DatePickerSheet({ mode, value, minimumDate, maximumDate, doneLabel = 'Done', onChange, onCancel, onDone }: Props) {
  return (
    <ModalSheet visible animationType="slide" onClose={onCancel} style={styles.sheet}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onDone} hitSlop={8}>
          <Text style={styles.done}>{doneLabel}</Text>
        </Pressable>
      </View>
      <DateTimePicker
        mode={mode}
        display="spinner"
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(_, picked) => picked && onChange(picked)}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.white, paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  done: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
});
