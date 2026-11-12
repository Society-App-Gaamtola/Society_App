import { memo, useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EventsStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { getEventCategories, getEvents, toSocietyEvent, type ApiCategory } from '../api/user';
import { usePagedList } from '../hooks/usePagedList';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Ionicons } from '../icons';
import type { DateRange, SocietyEvent } from '../types';
import { formatRange, toIsoDay } from '../utils/date';
import { AppHeader, DateRangeButton, EmptyState, FilterChips, MetaRow, SearchBar, StatusBadge } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';

const ALL = 'All';

const Separator = () => <View style={styles.separator} />;

export default function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<DateRange | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const search = useDebouncedValue(query.trim());

  // Without categories the chips show only "All"; the list itself still works.
  useEffect(() => {
    getEventCategories()
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  const categoryId = categories.find((c) => c.name === category)?.id;
  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getEvents(page, {
        search,
        category_id: categoryId,
        from_date: range?.start,
        to_date: range?.end,
      });
      return { items: data.events.map(toSocietyEvent), pagination: data.pagination };
    },
    [search, categoryId, range],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  const openEvent = useCallback(
    (event: SocietyEvent) => navigation.navigate('EventDetails', { eventId: event.id, event }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: { item: SocietyEvent }) => <EventCard event={item} onOpen={openEvent} />,
    [openEvent],
  );

  const header = (
    <View>
      <Text style={common.heading}>Events & Cultural Programmes</Text>
      <Text style={common.subtextRelaxed}>Stay updated with our upcoming events and cultural activities.</Text>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search events..."
        inputRef={searchRef}
        actionIcon="calendar-outline"
        actionLabel="Calendar view"
        onActionPress={() => navigation.navigate('EventCalendar')}
      />

      <DateRangeButton label={range ? formatRange(range) : 'All dates'} onPress={() => setRangeOpen(true)} style={styles.range} />

      <FilterChips
        options={[ALL, ...categories.map((c) => c.name)]}
        selected={category}
        onSelect={setCategory}
        style={styles.chips}
      />
    </View>
  );

  return (
    <View style={common.screen}>
      <AppHeader
        leftType="menu"
        rightIcons={['search', 'bell']}
        onRightPress={(icon) => icon === 'search' && searchRef.current?.focus()}
      />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'calendar-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load events. Pull down to try again." : 'No events found'}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={styles.footer} />
          ) : error && items.length > 0 ? (
            <Text style={styles.footerError}>Couldn't load more events. Scroll down to try again.</Text>
          ) : undefined
        }
        renderItem={renderItem}
      />

      <DateRangeSheet
        visible={rangeOpen}
        initial={range}
        defaultMonth={toIsoDay(new Date())}
        onClose={() => setRangeOpen(false)}
        onApply={(r) => {
          setRange(r);
          setRangeOpen(false);
        }}
      />
    </View>
  );
}

const EventCard = memo(function EventCard({ event, onOpen }: { event: SocietyEvent; onOpen: (event: SocietyEvent) => void }) {
  return (
    <Pressable style={styles.card} onPress={() => onOpen(event)} accessibilityRole="button">
      <Image source={event.image} style={styles.image} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <StatusBadge status={event.status} />
        </View>
        <MetaRow icon="calendar-outline" text={event.date} />
        <MetaRow icon="location-outline" text={event.venue} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedIcon} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  range: { marginTop: 10 },
  chips: { marginTop: 12, marginBottom: 14 },
  loading: { marginTop: 40 },
  footer: { marginVertical: 16 },
  footerError: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginVertical: 16 },
  separator: { height: 12 },
  card: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  image: { width: 90, height: 80, borderRadius: 10 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
});
