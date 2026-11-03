import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { colors, fonts } from '../theme';
import { formatDate } from '../utils/date';

/** Inclusive ISO date range (yyyy-mm-dd). */
export type DateRange = { start: string; end: string };

export const fromIsoDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toIsoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "01 Oct 2026 - 31 Oct 2026", or a single date when start and end match. */
export const formatRange = (range: DateRange) =>
  range.start === range.end
    ? formatDate(fromIsoDay(range.start))
    : `${formatDate(fromIsoDay(range.start))} - ${formatDate(fromIsoDay(range.end))}`;

type Props = {
  visible: boolean;
  initial: DateRange | null;
  /** Month to show when no range is selected (yyyy-mm-dd). */
  defaultMonth?: string;
  /** Show a "Show All" button that clears the range. */
  allowClear?: boolean;
  onClose: () => void;
  onApply: (range: DateRange | null) => void;
};

export default function DateRangeSheet({ visible, initial, defaultMonth, allowClear = true, onClose, onApply }: Props) {
  const [start, setStart] = useState<string | null>(initial?.start ?? null);
  const [end, setEnd] = useState<string | null>(initial?.end ?? null);

  const onDayPress = (day: DateData) => {
    // First tap (or a tap after a complete range) starts a new range; the second closes it.
    if (!start || end) {
      setStart(day.dateString);
      setEnd(null);
    } else if (day.dateString < start) {
      setEnd(start);
      setStart(day.dateString);
    } else {
      setEnd(day.dateString);
    }
  };

  const marked = useMemo(() => {
    if (!start) return {};
    const last = end ?? start;
    const result: Record<string, object> = {};
    for (let d = fromIsoDay(start); d <= fromIsoDay(last); d.setDate(d.getDate() + 1)) {
      const key = toIsoDay(d);
      const edge = key === start || key === last;
      result[key] = {
        color: edge ? colors.primary : '#F8E9E9',
        textColor: edge ? colors.white : colors.textDark,
        startingDay: key === start,
        endingDay: key === last,
      };
    }
    return result;
  }, [start, end]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Select Date Range</Text>
        <Calendar
          current={start ?? defaultMonth}
          markingType="period"
          markedDates={marked}
          onDayPress={onDayPress}
          enableSwipeMonths
          theme={{
            arrowColor: colors.primary,
            todayTextColor: colors.primary,
            textDayFontFamily: fonts.regular,
            textMonthFontFamily: fonts.bold,
            textDayHeaderFontFamily: fonts.regular,
          }}
        />
        <View style={styles.actions}>
          {allowClear ? (
            <Pressable
              style={styles.clear}
              onPress={() => {
                setStart(null);
                setEnd(null);
                onApply(null);
              }}
            >
              <Text style={styles.clearText}>Show All</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.apply, !start && styles.faded]}
            disabled={!start}
            onPress={() => start && onApply({ start, end: end ?? start })}
          >
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
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
    padding: 16,
    paddingBottom: 28,
  },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  clear: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
  apply: { flex: 1, height: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },
  faded: { opacity: 0.5 },
});
