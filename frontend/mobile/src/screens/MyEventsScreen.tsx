import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, type Tone } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { LOGO } from '../config';
import { useExecEvents } from '../context/EventsContext';
import { Ionicons, type IoniconName } from '../icons';
import type { ExecEvent, ExecEventStatus } from '../types';
import { AppHeader, EmptyState, FilterChips, MetaRow, PermissionGate, Pill, SearchBar } from '../components';
import ModalSheet from '../components/sheets/ModalSheet';

// Chip → the status it shows
const FILTERS = ['All', 'Drafts', 'Posted', 'Scheduled', 'Needs Approval'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_STATUS: Record<Filter, ExecEventStatus | null> = {
  All: null,
  Drafts: 'Draft',
  Posted: 'Posted',
  Scheduled: 'Scheduled',
  'Needs Approval': 'Needs Approval',
};

const STATUS_TONE: Record<ExecEventStatus, Tone> = {
  Draft: tones.neutral,
  Posted: tones.success,
  Scheduled: tones.info,
  'Needs Approval': tones.warning,
};

const dateText = (e: ExecEvent) => [e.endDate ? `${e.date} - ${e.endDate}` : e.date, e.time].filter(Boolean).join(', ');

const Separator = () => <View style={styles.separator} />;

// Events this executive created (saved on the phone until the events API takes new events).
export default function MyEventsScreen() {
  return (
    <PermissionGate permission="events">
      <MyEvents />
    </PermissionGate>
  );
}

function MyEvents() {
  const insets = useSafeAreaInsets();
  const { myEvents, addEvent } = useExecEvents();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState<ExecEvent | null>(null);

  const data = useMemo(() => {
    const status = FILTER_STATUS[filter];
    const q = query.trim().toLowerCase();
    return myEvents.filter((e) => (!status || e.status === status) && (!q || e.title.toLowerCase().includes(q)));
  }, [myEvents, filter, query]);

  const duplicate = useCallback(
    (e: ExecEvent) => {
      // A copy always starts as a draft, so it can't go live without being posted again.
      const { id: _id, ownerId: _owner, createdAt: _created, scheduledAt: _scheduled, ...rest } = e;
      addEvent({ ...rest, title: `${e.title} (Copy)`, status: 'Draft' });
      setFilter('All');
    },
    [addEvent],
  );

  const renderItem = useCallback(
    ({ item }: { item: ExecEvent }) => <EventCard event={item} onView={setViewing} onDuplicate={duplicate} />,
    [duplicate],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>My Events</Text>
            <Text style={common.subtextRelaxed}>View and manage events created by you.</Text>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search events..." />
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon={<Ionicons name="calendar-outline" size={40} color={colors.lightGold} />} text="No events found" />
        }
        renderItem={renderItem}
      />

      <ModalSheet
        visible={!!viewing}
        animationType="slide"
        onClose={() => setViewing(null)}
        style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}
      >
        <View style={styles.handle} />
        {viewing ? (
          <ScrollView contentContainerStyle={styles.sheetBody}>
            <Image source={viewing.imageUri ? { uri: viewing.imageUri } : LOGO} style={styles.sheetImage} />
            <View style={styles.titleRow}>
              <Text style={styles.sheetTitle}>{viewing.title}</Text>
              <Pill label={viewing.status} tone={STATUS_TONE[viewing.status]} />
            </View>
            <MetaRow icon="calendar-outline" text={dateText(viewing)} />
            <MetaRow icon="location-outline" text={viewing.venue} />
            <MetaRow icon="pricetag-outline" text={viewing.category} />
            {viewing.organizer ? <MetaRow icon="person-outline" text={viewing.organizer} /> : null}
            {viewing.contact ? <MetaRow icon="call-outline" text={viewing.contact} /> : null}
            {viewing.description ? <Text style={styles.sheetDesc}>{viewing.description}</Text> : null}
          </ScrollView>
        ) : null}
      </ModalSheet>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress} hitSlop={6} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={colors.textDark} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

type CardProps = { event: ExecEvent; onView: (e: ExecEvent) => void; onDuplicate: (e: ExecEvent) => void };

const EventCard = memo(function EventCard({ event, onView, onDuplicate }: CardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Image source={event.imageUri ? { uri: event.imageUri } : LOGO} style={styles.image} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>
            <Pill label={event.status} tone={STATUS_TONE[event.status]} />
          </View>
          <MetaRow icon="calendar-outline" text={dateText(event)} />
          <MetaRow icon="location-outline" text={event.venue} />
        </View>
      </View>
      <View style={styles.actions}>
        <Action icon="eye-outline" label="View" onPress={() => onView(event)} />
        <Action icon="create-outline" label="Edit" onPress={() => Alert.alert('Edit Event', 'Editing events is coming soon.')} />
        <Action icon="copy-outline" label="Duplicate" onPress={() => onDuplicate(event)} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 12 },
  card: { ...surface, padding: 10 },
  cardTop: { flexDirection: 'row', gap: 12 },
  image: { width: 84, height: 84, borderRadius: 10 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetBody: { gap: 8, paddingBottom: 8 },
  sheetImage: { width: '100%', height: 170, borderRadius: 12 },
  sheetTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.primary },
  sheetDesc: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted, marginTop: 4 },
});
