import { memo, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, type Tone, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { LOGO } from '../config';
import { deleteEvent, getMyEvents, type ApiEventStatus, type ApiExecEvent } from '../api/executive';
import { mediaUrl } from '../api/client';
import { cdnImage } from '../services/media';
import { toEventDraft } from '../services/eventSubmit';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons, type IoniconName } from '../icons';
import { formatDate, fromIsoDay } from '../utils/date';
import { showToast } from '../utils/toast';
import { AppHeader, EmptyState, FilterChips, MetaRow, PermissionGate, Pill, SearchBar } from '../components';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'MyEvents'>;

// Chip → the status the API filters on
const FILTERS = ['All', 'Drafts', 'Scheduled', 'Posted', 'Cancelled'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_STATUS: Record<Filter, ApiEventStatus | undefined> = {
  All: undefined,
  Drafts: 'draft',
  Scheduled: 'scheduled',
  Posted: 'posted',
  Cancelled: 'cancelled',
};

export const EVENT_STATUS_LABEL: Record<ApiEventStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  posted: 'Posted',
  cancelled: 'Cancelled',
};
const STATUS_TONE: Record<ApiEventStatus, Tone> = {
  draft: tones.neutral,
  scheduled: tones.info,
  posted: tones.success,
  cancelled: tones.neutral,
};

const dateText = (e: ApiExecEvent) => {
  const start = formatDate(fromIsoDay(e.event_date));
  const day = e.end_date && e.end_date !== e.event_date ? `${start} - ${formatDate(fromIsoDay(e.end_date))}` : start;
  return `${day}, ${e.start_time.slice(0, 5)}`;
};

const Separator = () => <View style={styles.separator} />;

// Events this user created, any status (GET /user/events?mine=true). Drafts and rejected events can be edited
// and posted again; a copy starts as a new event
export default function MyEventsScreen() {
  return (
    <PermissionGate permission="events">
      <MyEvents />
    </PermissionGate>
  );
}

function MyEvents() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());

  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getMyEvents(page, { status: FILTER_STATUS[filter], search });
      return { items: data.events, pagination: data.pagination };
    },
    [filter, search],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  // Back from Create / Edit: show the saved event (the first load is usePagedList's own)
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) refresh();
      focusedBefore.current = true;
    }, [refresh]),
  );

  const onView = useCallback((e: ApiExecEvent) => navigation.navigate('EventDetails', { eventId: String(e.id) }), [navigation]);
  const onEdit = useCallback((e: ApiExecEvent) => navigation.navigate('CreateEvent', { draft: toEventDraft(e), editId: e.id }), [navigation]);
  const onDuplicate = useCallback(
    (e: ApiExecEvent) => navigation.navigate('CreateEvent', { draft: { ...toEventDraft(e), title: `${e.title} (${t('Copy')})` } }),
    [navigation, t],
  );
  const onDelete = useCallback(
    (e: ApiExecEvent) =>
      Alert.alert(t('Delete Event'), t('Delete "{title}"?', { title: e.title }), [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () =>
            deleteEvent(e.id)
              .then(({ message }) => {
                showToast(message);
                refresh();
              })
              .catch((err) => Alert.alert(t('Could not delete'), err instanceof Error ? err.message : t('Please try again.'))),
        },
      ]),
    [refresh, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiExecEvent }) => <EventCard event={item} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />,
    [onView, onEdit, onDuplicate, onDelete],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View style={common.flex}>
                <Text style={common.heading}>{t('My Events')}</Text>
                <Text style={common.subtextRelaxed}>{t('View and manage events created by you.')}</Text>
              </View>
              <Pressable style={styles.addButton} onPress={() => navigation.navigate('CreateEvent')} accessibilityRole="button">
                <Text style={styles.addButtonText}>{t('+ New')}</Text>
              </Pressable>
            </View>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search events..." />
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'calendar-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load your events. Pull down to try again." : 'No events found'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
        renderItem={renderItem}
      />
    </View>
  );
}

function Action({ icon, label, onPress, danger }: { icon: IoniconName; label: string; onPress: () => void; danger?: boolean }) {
  const t = useT();
  return (
    <Pressable style={styles.action} onPress={onPress} hitSlop={6} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.textDark} />
      <Text style={[styles.actionText, danger && styles.danger]}>{t(label)}</Text>
    </Pressable>
  );
}

type CardProps = {
  event: ApiExecEvent;
  onView: (e: ApiExecEvent) => void;
  onEdit: (e: ApiExecEvent) => void;
  onDuplicate: (e: ApiExecEvent) => void;
  onDelete: (e: ApiExecEvent) => void;
};

const EventCard = memo(function EventCard({ event, onView, onEdit, onDuplicate, onDelete }: CardProps) {
  const t = useT();
  const poster = cdnImage(mediaUrl(event.poster_url ?? event.images[0] ?? null), 168);
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardTop} onPress={() => onView(event)} accessibilityRole="button">
        <Image source={poster ? { uri: poster } : LOGO} style={styles.image} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>
            <Pill label={EVENT_STATUS_LABEL[event.status]} tone={STATUS_TONE[event.status]} />
          </View>
          <MetaRow icon="calendar-outline" text={dateText(event)} />
          <MetaRow icon="location-outline" text={event.venue_name} />
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Action icon="eye-outline" label="View" onPress={() => onView(event)} />
        <Action icon="create-outline" label="Edit" onPress={() => onEdit(event)} />
        <Action icon="copy-outline" label="Duplicate" onPress={() => onDuplicate(event)} />
        <Action icon="trash-outline" label="Delete" danger onPress={() => onDelete(event)} />
      </View>
    </View>
  );
});

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addButton: { height: 34, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', marginTop: 4 },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  chips: { marginTop: 12, marginBottom: 14 },
  loading: { marginVertical: 24 },
  separator: { height: 12 },
  card: { ...surface, padding: 10 },
  cardTop: { flexDirection: 'row', gap: 12 },
  image: { width: 84, height: 84, borderRadius: 10, backgroundColor: colors.border },
  info: { flex: 1, gap: 4 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  rejected: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDark },
  danger: { color: colors.danger },
}));
