import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { colors, fonts, themedStyles } from '../../theme';
import type { DateRange } from '../../types';
import { fromIsoDay, toIsoDay } from '../../utils/date';
import ModalSheet from './ModalSheet';

type Props = {
  visible: boolean;
  initial: DateRange | null;
  /** Month to show when no range is selected (yyyy-mm-dd). */
  defaultMonth?: string;
  /** Show a "Show All" button that clears the range. */
  allowClear?: boolean;
  onClose: () => void;
  onApply: (range: DateRange | null) => void;
  /**
   * Days to mark with a dot in the shown month (e.g. days that have notices), like the Event Calendar.
   * Called with the month's first and last day each time the sheet opens or the month changes.
   */
  loadMarkedDays?: (month: { start: string; end: string }) => Promise<string[]>;
};

/** First and last day (yyyy-mm-dd) of the month that contains `day` */
const monthOf = (day: string) => {
  const d = fromIsoDay(day);
  return { start: toIsoDay(new Date(d.getFullYear(), d.getMonth(), 1)), end: toIsoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
};

// A function, so the calendar gets the current theme's colors
const calendarTheme = () => ({
  arrowColor: colors.primary,
  todayTextColor: colors.primary,
  textDayFontFamily: fonts.regular,
  textMonthFontFamily: fonts.bold,
  textDayHeaderFontFamily: fonts.regular,
});

export default function DateRangeSheet({ visible, initial, defaultMonth, allowClear = true, onClose, onApply, loadMarkedDays }: Props) {
  const [start, setStart] = useState<string | null>(initial?.start ?? null);
  const [end, setEnd] = useState<string | null>(initial?.end ?? null);
  // The month on screen, and its days that have something (dots)
  const [shownMonth, setShownMonth] = useState(() => monthOf(initial?.start ?? defaultMonth ?? toIsoDay(new Date())));
  const [dotDays, setDotDays] = useState<string[]>([]);

  useEffect(() => {
    if (!visible || !loadMarkedDays) return;
    let active = true;
    loadMarkedDays(shownMonth)
      .then((days) => active && setDotDays(days))
      .catch(() => active && setDotDays([]));
    return () => {
      active = false;
    };
  }, [visible, shownMonth, loadMarkedDays]);

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
    const result: Record<string, object> = {};
    for (const day of dotDays) result[day] = { marked: true, dotColor: colors.gold };
    if (!start) return result;
    const last = end ?? start;
    for (let d = fromIsoDay(start); d <= fromIsoDay(last); d.setDate(d.getDate() + 1)) {
      const key = toIsoDay(d);
      const edge = key === start || key === last;
      result[key] = {
        ...result[key],
        color: edge ? colors.primary : colors.tint,
        textColor: edge ? colors.white : colors.textDark,
        startingDay: key === start,
        endingDay: key === last,
      };
    }
    return result;
  }, [start, end, dotDays]);

  return (
    <ModalSheet visible={visible} animationType="fade" onClose={onClose} style={styles.sheet}>
      <Text style={styles.title}>Select Date Range</Text>
      <Calendar
        current={start ?? defaultMonth}
        markingType="period"
        markedDates={marked}
        onDayPress={onDayPress}
        onMonthChange={(date: DateData) => setShownMonth(monthOf(date.dateString))}
        enableSwipeMonths
        theme={calendarTheme()}
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
    </ModalSheet>
  );
}

const styles = themedStyles(() => ({
  sheet: {
    backgroundColor: colors.card,
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
}));
