import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { MAX_PAGE_SIZE } from '../config';
import { getEventCategories, getEvents, toSocietyEvent, type ApiCategory } from '../api/user';
import { Ionicons, MaterialCommunityIcons } from '../icons';
import type { SocietyEvent } from '../types';
import { formatDate, fromIsoDay, MONTHS, MONTH_NAMES, toIsoDay } from '../utils/date';
import { AppHeader, MetaRow, Pill, SectionHeader } from '../components';

const CALENDAR_THEME = {
  calendarBackground: colors.card,
  textSectionTitleColor: colors.textMuted,
  textDayHeaderFontFamily: fonts.regular,
  textDayHeaderFontSize: 11,
  arrowColor: colors.primary,
};

/** First and last day (yyyy-mm-dd) of the month that `day` is in. */
const monthRange = (day: string) => {
  const d = fromIsoDay(day);
  return {
    start: toIsoDay(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: toIsoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
};

/** Every day an event runs on, so multi-day events mark each of their days. */
const eventDays = (events: SocietyEvent[]) => {
  const days = new Set<string>();
  for (const e of events) {
    for (let d = fromIsoDay(e.startDay); toIsoDay(d) <= e.endDay; d.setDate(d.getDate() + 1)) {
      days.add(toIsoDay(d));
    }
  }
  return days;
};

/** Category colour from the database, as a badge: the colour on a light tint of itself. */
const categoryTone = (color: string) => ({ text: color, bg: `${color}1F` });

const renderArrow = (direction: 'left' | 'right') => (
  <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.primary} />
);

const renderMonthTitle = (date?: unknown) => {
  // XDate exposes getMonth/getFullYear like Date.
  const d = date as Date | undefined;
  return d ? (
    <Text style={styles.monthTitle}>
      {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
    </Text>
  ) : null;
};

// Read from context so selecting a day or loading a month redraws only the day cells.
const DayContext = createContext<{ selectedDate: string | null; eventDates: Set<string> }>({
  selectedDate: null,
  eventDates: new Set(),
});

type DayProps = {
  date?: DateData;
  state?: string;
  onPress?: (date: DateData) => void;
};

function Day({ date, state, onPress }: DayProps) {
  const { selectedDate, eventDates } = useContext(DayContext);
  if (!date) return <View style={styles.day} />;
  const hasEvent = eventDates.has(date.dateString);
  const otherMonth = state === 'disabled';
  const selected = selectedDate === date.dateString;

  return (
    <Pressable
      onPress={() => onPress?.(date)}
      style={styles.day}
      accessibilityRole="button"
      accessibilityLabel={`${date.day} ${MONTH_NAMES[date.month - 1]}${hasEvent ? ', has events' : ''}`}
    >
      <View style={[styles.dayCircle, hasEvent && !otherMonth && styles.dayEvent, selected && styles.daySelected]}>
        <Text style={[styles.dayText, otherMonth && styles.dayTextOther, hasEvent && !otherMonth && styles.dayTextEvent]}>
          {date.day}
        </Text>
      </View>
    </Pressable>
  );
}

export default function EventCalendarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [today] = useState(() => toIsoDay(new Date()));
  const [month, setMonth] = useState(() => monthRange(today));
  const [events, setEvents] = useState<SocietyEvent[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    getEventCategories()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  // Every event that runs on any day of the shown month
  useEffect(() => {
    let active = true;
    setLoading(true);
    getEvents(1, { from_date: month.start, to_date: month.end, limit: MAX_PAGE_SIZE })
      .then(({ data }) => {
        if (!active) return;
        setEvents(data.events.map(toSocietyEvent));
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load events.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [month]);

  const dayContext = useMemo(() => ({ selectedDate, eventDates: eventDays(events) }), [selectedDate, events]);

  const list = useMemo(
    () => (selectedDate ? events.filter((e) => e.startDay <= selectedDate && selectedDate <= e.endDay) : events),
    [selectedDate, events],
  );

  const onDayPress = useCallback((date: DateData) => {
    setSelectedDate((current) => (current === date.dateString ? null : date.dateString));
  }, []);

  const onMonthChange = useCallback((date: DateData) => {
    setSelectedDate(null);
    setMonth(monthRange(date.dateString));
  }, []);

  const shownMonth = fromIsoDay(month.start);
  const listTitle = selectedDate
    ? `Events on ${formatDate(fromIsoDay(selectedDate))}`
    : `Events in ${MONTH_NAMES[shownMonth.getMonth()]} ${shownMonth.getFullYear()}`;

  const enableNotifications = async () => {
    try {
      const current = await Notifications.getPermissionsAsync();
      const result = current.granted ? current : await Notifications.requestPermissionsAsync();
      Alert.alert(
        result.granted ? 'Notifications Enabled' : 'Permission Denied',
        result.granted
          ? 'You will now receive event reminders.'
          : 'You can enable notifications later from your phone settings.',
      );
    } catch {
      Alert.alert('Notifications', 'Could not request notification permission on this device.');
    }
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>Event Calendar</Text>
        <Text style={common.subtextRelaxed}>View all upcoming events and cultural activities of our society.</Text>

        <View style={styles.calendarCard}>
          <DayContext.Provider value={dayContext}>
            <Calendar
              current={today}
              onDayPress={onDayPress}
              onMonthChange={onMonthChange}
              firstDay={0}
              enableSwipeMonths
              renderArrow={renderArrow}
              renderHeader={renderMonthTitle}
              dayComponent={Day}
              theme={CALENDAR_THEME}
            />
          </DayContext.Provider>
        </View>

        <View style={styles.legend}>
          {categories.map((c) => (
            <View key={c.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.color }]} />
              <Text style={styles.legendText}>{c.name}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title={listTitle} onViewAll={() => setSelectedDate(null)} style={styles.sectionHeader} />

        <View style={styles.list}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : list.length ? (
            list.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onPress={() => navigation.navigate('EventDetails', { eventId: event.id, event })}
              />
            ))
          ) : (
            <Text style={styles.empty}>{selectedDate ? 'No events on this date.' : 'No events this month.'}</Text>
          )}
        </View>

        <View style={styles.notify}>
          <MaterialCommunityIcons name="shield-check-outline" size={28} color={colors.gold} />
          <View style={styles.notifyText}>
            <Text style={styles.notifyTitle}>Stay Updated</Text>
            <Text style={styles.notifySub}>Enable notifications to never miss important events and reminders.</Text>
          </View>
          <Pressable style={styles.notifyButton} onPress={enableNotifications}>
            <Text style={styles.notifyButtonText}>Enable Now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function EventRow({ event, onPress }: { event: SocietyEvent; onPress: () => void }) {
  const [, month, day] = event.startDay.split('-');

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.dateBlock}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{MONTHS[Number(month) - 1]}</Text>
      </View>
      <Image source={event.image} style={styles.rowImage} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {event.title}
        </Text>
        {event.time ? <MetaRow icon="time-outline" text={event.time} /> : null}
        <MetaRow icon="location-outline" text={event.venue} />
      </View>
      <Pill label={event.category} tone={categoryTone(event.categoryColor)} style={styles.badge} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },

  calendarCard: { ...surface, marginTop: 14, borderRadius: 14, padding: 12 },
  monthTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark },
  day: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayEvent: { backgroundColor: colors.primary },
  daySelected: { borderWidth: 2, borderColor: colors.gold },
  dayText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },
  dayTextOther: { color: '#CFC6BC' },
  dayTextEvent: { color: colors.white, fontFamily: fonts.semiBold },

  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textDark },

  sectionHeader: { marginTop: 20 },

  list: { gap: 10 },
  row: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  dateBlock: { width: 40, alignItems: 'center' },
  dateDay: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.primary },
  dateMonth: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  rowImage: { width: 56, height: 56, borderRadius: 8 },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  badge: { alignSelf: 'flex-start' },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  loading: { paddingVertical: 24 },

  notify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.noteBackground,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  notifyText: { flex: 1 },
  notifyTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.textDark },
  notifySub: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  notifyButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  notifyButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
});
