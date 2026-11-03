import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { calendarEvents, events, type CalendarEntry, type EventCategory } from '../data/mock';
import { AppHeader } from '../components';

const INITIAL_MONTH = '2026-10-01';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MUTED_ICON = '#9A8F86';

const legend: { label: EventCategory; color: string }[] = [
  { label: 'Aarti', color: '#F59E0B' },
  { label: 'Festival', color: '#D32F2F' },
  { label: 'Cultural', color: '#7C3AED' },
  { label: 'Meeting', color: '#16A34A' },
];

const categoryBadge: Record<EventCategory, { text: string; bg: string }> = {
  Festival: { text: '#E0700B', bg: '#FFF1E0' },
  Cultural: { text: '#7C3AED', bg: '#F1EAFE' },
  Meeting: { text: '#1E63C6', bg: '#E8F0FC' },
  Aarti: { text: '#B45309', bg: '#FEF3C7' },
};

const eventDates = new Set(calendarEvents.map((e) => e.date));

type DayProps = {
  date?: DateData;
  state?: string;
  onPress?: (date: DateData) => void;
  selectedDate: string | null;
};

function Day({ date, state, onPress, selectedDate }: DayProps) {
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
      <View
        style={[
          styles.dayCircle,
          hasEvent && !otherMonth && styles.dayEvent,
          selected && styles.daySelected,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            otherMonth && styles.dayTextOther,
            hasEvent && !otherMonth && styles.dayTextEvent,
          ]}
        >
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

  const onDayPress = (date: DateData) => {
    setSelectedDate((current) => (current === date.dateString ? null : date.dateString));
  };

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
    <View style={styles.container}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Event Calendar</Text>
        <Text style={styles.subtext}>View all upcoming events and cultural activities of our society.</Text>

        <View style={styles.calendarCard}>
          <Calendar
            current={INITIAL_MONTH}
            onDayPress={onDayPress}
            firstDay={0}
            enableSwipeMonths
            renderArrow={(direction) => (
              <Ionicons
                name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={colors.primary}
              />
            )}
            renderHeader={(date) => {
              // XDate exposes getMonth/getFullYear like Date.
              const d = date as unknown as Date | undefined;
              return d ? (
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                </Text>
              ) : null;
            }}
            dayComponent={(props) => <Day {...props} selectedDate={selectedDate} />}
            theme={{
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textMuted,
              textDayHeaderFontFamily: fonts.regular,
              textDayHeaderFontSize: 11,
              arrowColor: colors.primary,
            }}
          />
        </View>

        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <Pressable onPress={() => setSelectedDate(null)} hitSlop={8}>
            <Text style={styles.viewAll}>View All →</Text>
          </Pressable>
        </View>

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
  const badge = categoryBadge[entry.category];
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
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta} numberOfLines={1}>
            {entry.time}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta} numberOfLines={1}>
            {entry.venue}
          </Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.text }]}>{entry.category}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },

  calendarCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
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

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textDark },
  viewAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },

  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBlock: { width: 40, alignItems: 'center' },
  dateDay: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.primary },
  dateMonth: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  rowImage: { width: 56, height: 56, borderRadius: 8 },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  badge: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },

  notify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF3E4',
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
