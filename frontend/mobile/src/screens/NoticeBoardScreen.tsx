import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { getNotices, toNotice, type ApiNotice } from '../api/user';
import { usePagedList } from '../hooks/usePagedList';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Ionicons } from '../icons';
import type { DateRange, Notice } from '../types';
import { formatRange, toIsoDay } from '../utils/date';
import { AppHeader, DateRangeButton, EmptyState, FilterChips, IconCircle, SearchBar, StatusBadge } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';

// Chip → the notice tag the API filters on
const FILTERS = ['All', 'Important', 'General', 'Event'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_TAG: Record<Filter, ApiNotice['tag'] | undefined> = {
  All: undefined,
  Important: 'important',
  General: 'general',
  Event: 'event',
};

const Separator = () => <View style={styles.separator} />;

export default function NoticeBoardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<DateRange | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const search = useDebouncedValue(query.trim());

  const fetchPage = useCallback(
    async (page: number) => {
      const { data } = await getNotices(page, {
        search,
        tag: FILTER_TAG[filter],
        from_date: range?.start,
        to_date: range?.end,
      });
      return { items: data.notices.map(toNotice), pagination: data.pagination };
    },
    [search, filter, range],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  const openNotice = useCallback(
    (notice: Notice) => navigation.navigate('NoticeDetails', { noticeId: notice.id, notice }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: { item: Notice }) => <NoticeCard notice={item} onOpen={openNotice} />,
    [openNotice],
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['more']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <Text style={common.heading}>Notice Board</Text>
            <Text style={common.subtextRelaxed}>Stay informed with important notices, updates and announcements.</Text>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search notices..." />
            <DateRangeButton
              label={range ? formatRange(range) : 'All dates'}
              onPress={() => setRangeOpen(true)}
              style={styles.range}
            />
            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<Ionicons name={error ? 'cloud-offline-outline' : 'megaphone-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load notices. Pull down to try again." : 'No notices found'}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={styles.footer} />
          ) : error && items.length > 0 ? (
            <Text style={styles.footerError}>Couldn't load more notices. Scroll down to try again.</Text>
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

const NoticeCard = memo(function NoticeCard({ notice, onOpen }: { notice: Notice; onOpen: (notice: Notice) => void }) {
  const important = notice.tag === 'Important';
  return (
    <Pressable style={styles.card} onPress={() => onOpen(notice)} accessibilityRole="button">
      <IconCircle size={40}>
        <Ionicons name={notice.icon} size={20} color={colors.primary} />
      </IconCircle>
      <View style={styles.info}>
        <Text style={[styles.title, important && styles.titleImportant]}>{notice.title}</Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedIcon} />
          <Text style={styles.date}>{notice.date}</Text>
        </View>
        <Text style={styles.desc} numberOfLines={2} ellipsizeMode="tail">
          {notice.description}
        </Text>
      </View>
      <StatusBadge status={notice.tag} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  range: { marginTop: 10 },
  chips: { marginTop: 12, marginBottom: 14 },
  separator: { height: 10 },
  loading: { marginTop: 40 },
  footer: { marginVertical: 16 },
  footerError: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginVertical: 16 },
  card: { ...surface, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.textDark },
  titleImportant: { fontFamily: fonts.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  desc: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});
