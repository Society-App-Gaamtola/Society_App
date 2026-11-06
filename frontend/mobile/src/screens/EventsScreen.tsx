import { memo, useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EventsStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { CATEGORY_FILTERS, type CategoryFilter } from '../config/filters';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { events } from '../data/mock';
import { useSimulatedRefresh } from '../hooks/useSimulatedRefresh';
import { Ionicons } from '../icons';
import type { SocietyEvent } from '../types';
import { AppHeader, EmptyState, FilterChips, MetaRow, SearchBar, StatusBadge } from '../components';

const Separator = () => <View style={styles.separator} />;

export default function EventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [query, setQuery] = useState('');
  const { refreshing, onRefresh } = useSimulatedRefresh();

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) => (filter === 'All' || e.category === filter) && (!q || e.title.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const openEvent = useCallback((eventId: string) => navigation.navigate('EventDetails', { eventId }), [navigation]);
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

      <FilterChips options={CATEGORY_FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
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
        data={data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon={<Ionicons name="calendar-outline" size={40} color={colors.lightGold} />} text="No events found" />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const EventCard = memo(function EventCard({ event, onOpen }: { event: SocietyEvent; onOpen: (id: string) => void }) {
  return (
    <Pressable style={styles.card} onPress={() => onOpen(event.id)} accessibilityRole="button">
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
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 12 },
  card: { ...surface, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  image: { width: 90, height: 80, borderRadius: 10 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
});
