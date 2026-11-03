import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EventsStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { events, type SocietyEvent } from '../data/mock';
import { AppHeader, FilterChips, StatusBadge } from '../components';

const FILTERS = ['All', 'Festival', 'Aarti', 'Cultural', 'Meeting'] as const;
type Filter = (typeof FILTERS)[number];

const PADDING = 16;
const MUTED_ICON = '#9A8F86';
const PLACEHOLDER = '#A89E94';

export default function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) => (filter === 'All' || e.category === filter) && (!q || e.title.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const onRefresh = useCallback(() => {
    // TODO: reload events from the API.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const header = (
    <View>
      <Text style={styles.heading}>Events & Cultural Programmes</Text>
      <Text style={styles.subtext}>Stay updated with our upcoming events and cultural activities.</Text>

      <View style={styles.searchRow}>
        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <Ionicons name="search-outline" size={18} color={MUTED_ICON} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search events..."
            placeholderTextColor={PLACEHOLDER}
            style={styles.searchInput}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={MUTED_ICON} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={styles.filterButton}
          onPress={() => navigation.navigate('EventCalendar')}
          accessibilityRole="button"
          accessibilityLabel="Calendar view"
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textDark} />
        </Pressable>
      </View>

      <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        leftType="menu"
        rightIcons={['search', 'bell']}
        onRightPress={(icon) => icon === 'search' && searchRef.current?.focus()}
      />
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={colors.lightGold} />
            <Text style={styles.emptyText}>No events found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => navigation.navigate('EventDetails', { eventId: item.id })} />
        )}
      />
    </View>
  );
}

function EventCard({ event, onPress }: { event: SocietyEvent; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <Image source={event.image} style={styles.image} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <StatusBadge status={event.status} />
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta} numberOfLines={1}>
            {event.date}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">
            {event.venue}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={MUTED_ICON} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: PADDING, paddingBottom: 32, flexGrow: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  search: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchFocused: { borderColor: colors.primary },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.regular, fontSize: 13, color: colors.textDark, padding: 0 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: 90, height: 80, borderRadius: 10 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
});
