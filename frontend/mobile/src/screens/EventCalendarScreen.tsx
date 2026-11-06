import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, type Tone } from '../theme';
import { calendarEvents, events } from '../data/mock';
import { Ionicons, MaterialCommunityIcons } from '../icons';
import type { CalendarEntry, EventCategory } from '../types';
import { MONTHS, MONTH_NAMES } from '../utils/date';
import { AppHeader, MetaRow, Pill, SectionHeader } from '../components';

const INITIAL_MONTH = '2026-10-01';

const CALENDAR_THEME = {
  calendarBackground: colors.card,
  textSectionTitleColor: colors.textMuted,
  textDayHeaderFontFamily: fonts.regular,
  textDayHeaderFontSize: 11,
  arrowColor: colors.primary,
};

const legend: { label: EventCategory; color: string }[] = [
  { label: 'Aarti', color: '#F59E0B' },
  { label: 'Festival', color: '#D32F2F' },
  { label: 'Cultural', color: '#7C3AED' },
  { label: 'Meeting', color: '#16A34A' },
];

const categoryBadge: Record<EventCategory, Tone> = {
  Festival: tones.warning,
  Cultural: { text: '#7C3AED', bg: '#F1EAFE' },
  Meeting: tones.info,
  Aarti: { text: '#B45309', bg: '#FEF3C7' },
};

const eventDates = new Set(calendarEvents.map((e) => e.date));

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

// Read from context so selecting a day redraws only the day cells that use it.
const SelectedDateContext = createContext<string | null>(null);

type DayProps = {
  date?: DateData;
  state?: string;
  onPress?: (date: DateData) => void;
};

function Day({ date, state, onPress }: DayProps) {
  const selectedDate = useContext(SelectedDateContext);
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const list = useMemo(
    () => (selectedDate ? calendarEvents.filter((e) => e.date === selectedDate) : calendarEvents),
    [selectedDate],
  );

  const onDayPress = useCallback((date: DateData) => {
    setSelectedDate((current) => (current === date.dateString ? null : date.dateString));
  }, []);

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
          <SelectedDateContext.Provider value={selectedDate}>
            <Calendar
              current={INITIAL_MONTH}
              onDayPress={onDayPress}
              firstDay={0}
              enableSwipeMonths
              renderArrow={renderArrow}
              renderHeader={renderMonthTitle}
              dayComponent={Day}
              theme={CALENDAR_THEME}
            />
          </SelectedDateContext.Provider>
        </View>

        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Upcoming Events" onViewAll={() => setSelectedDate(null)} style={styles.sectionHeader} />

        <View style={styles.list}>
          {list.length ? (
            list.map((entry) => (
              <EventRow
                key={entry.date + entry.title}
                entry={entry}
                onPress={() => navigation.navigate('EventDetails', { eventId: entry.eventId })}
              />
            ))
          ) : (
            <Text style={styles.empty}>No events on this date.</Text>
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

function EventRow({ entry, onPress }: { entry: CalendarEntry; onPress: () => void }) {
  const [, month, day] = entry.date.split('-');
  const image = events.find((e) => e.id === entry.eventId)?.image;

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.dateBlock}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{MONTHS[Number(month) - 1]}</Text>
      </View>
      {image ? <Image source={image} style={styles.rowImage} /> : null}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <MetaRow icon="time-outline" text={entry.time} />
        <MetaRow icon="location-outline" text={entry.venue} />
      </View>
      <Pill label={entry.category} tone={categoryBadge[entry.category]} style={styles.badge} />
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
