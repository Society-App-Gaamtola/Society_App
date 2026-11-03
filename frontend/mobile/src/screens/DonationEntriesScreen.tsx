import { useCallback, useMemo, useState, type ComponentProps } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { useDonations, type Donation, type PaymentMode } from '../donations/DonationsContext';
import { formatINR } from '../utils/format';
import { formatDateTime } from '../utils/date';
import { AppHeader, FilterChips, PermissionGate } from '../components';
import ActionSheet from '../components/ActionSheet';
import DateRangeSheet, { formatRange, type DateRange as Range } from '../components/DateRangeSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'DonationEntries'>;

const FILTERS = ['All', 'Cash', 'UPI', 'Bank Transfer', 'Pending Verification'] as const;
type Filter = (typeof FILTERS)[number];

const DEFAULT_RANGE: Range = { start: '2026-10-10', end: '2026-10-14' };
const MUTED_ICON = '#9A8F86';
const PLACEHOLDER = '#A89E94';

const avatarColors = [
  { bg: '#F8E9E9', text: '#7A1020' },
  { bg: '#E8F0FC', text: '#1E63C6' },
  { bg: '#E6F6EC', text: '#1E8E4E' },
  { bg: '#FDEFE3', text: '#B45309' },
];

const modeIcon: Record<PaymentMode, ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  UPI: 'cellphone',
  Cash: 'cash',
  'Bank Transfer': 'bank-outline',
  Cheque: 'checkbook',
};

const statusTone: Record<Donation['status'], { text: string; bg: string }> = {
  Verified: { text: '#1E8E4E', bg: '#E6F6EC' },
  Pending: { text: '#E0700B', bg: '#FFF1E0' },
  Draft: { text: '#6B6B6B', bg: '#F0EEEC' },
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const colorFor = (name: string) => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return avatarColors[hash % avatarColors.length];
};

const isoDay = (iso: string) => iso.slice(0, 10);

export default function DonationEntriesScreen() {
  return (
    <PermissionGate permission="donations">
      <DonationEntries />
    </PermissionGate>
  );
}

function DonationEntries() {
  const navigation = useNavigation<Nav>();
  const { donations, removeDonation, reload } = useDonations();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  // Start with all dates so newly added entries are always visible.
  const [range, setRange] = useState<Range | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Donation | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return donations
      .filter((d) => !q || d.donorName.toLowerCase().includes(q) || d.memberId.toLowerCase().includes(q))
      .filter((d) => {
        if (filter === 'All') return true;
        if (filter === 'Pending Verification') return d.status === 'Pending';
        return d.mode === filter;
      })
      .filter((d) => !range || (isoDay(d.date) >= range.start && isoDay(d.date) <= range.end))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [donations, query, filter, range]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const rangeLabel = range ? formatRange(range) : 'All dates';

  const viewDonation = (d: Donation) =>
    Alert.alert(
      d.donorName,
      [
        `Member ID: ${d.memberId}`,
        `Amount: ${formatINR(d.amount)}`,
        `Date: ${formatDateTime(new Date(d.date))}`,
        `Mode: ${d.mode}`,
        `Status: ${d.status}`,
        d.reference ? `Reference: ${d.reference}` : null,
        d.purpose ? `Purpose: ${d.purpose}` : null,
        d.note ? `Notes: ${d.note}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );

  const deleteDonation = (d: Donation) =>
    Alert.alert('Delete Entry', `Delete the donation of ${formatINR(d.amount)} by ${d.donorName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeDonation(d.id) },
    ]);

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text style={styles.heading}>Donation Entries</Text>
          <Text style={styles.subtext}>View and manage donation transactions.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddDonation')} accessibilityRole="button">
          <Text style={styles.addButtonText}>+ Add Entry</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <Ionicons name="search-outline" size={18} color={MUTED_ICON} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by donor name, member ID..."
            placeholderTextColor={PLACEHOLDER}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
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
          onPress={() => Alert.alert('Filters', 'More filters coming soon.')}
          accessibilityRole="button"
          accessibilityLabel="Filters"
        >
          <Ionicons name="options-outline" size={20} color={colors.textDark} />
        </Pressable>
      </View>

      <Pressable style={styles.range} onPress={() => setRangeOpen(true)} accessibilityRole="button">
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.rangeText}>{rangeLabel}</Text>
        <Ionicons name="chevron-forward" size={18} color={MUTED_ICON} />
      </Pressable>

      <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <FlatList
        data={data}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="hand-coin-outline" size={40} color={colors.lightGold} />
            <Text style={styles.emptyText}>No donations found</Text>
          </View>
        }
        renderItem={({ item }) => <DonationCard donation={item} onMenu={() => setMenuFor(item)} />}
      />

      <DateRangeSheet
        visible={rangeOpen}
        initial={range}
        defaultMonth={DEFAULT_RANGE.start}
        onClose={() => setRangeOpen(false)}
        onApply={(r) => {
          setRange(r);
          setRangeOpen(false);
        }}
      />

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.donorName}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'View', icon: 'eye-outline', onPress: () => viewDonation(menuFor) },
                {
                  label: 'Edit',
                  icon: 'create-outline',
                  onPress: () => navigation.navigate('AddDonation', { donationId: menuFor.id }),
                },
                { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => deleteDonation(menuFor) },
              ]
            : []
        }
      />
    </View>
  );
}

function DonationCard({ donation, onMenu }: { donation: Donation; onMenu: () => void }) {
  const tone = colorFor(donation.donorName);
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
        <Text style={[styles.avatarText, { color: tone.text }]}>{initials(donation.donorName)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {donation.donorName}
        </Text>
        <Text style={styles.meta}>Member ID: {donation.memberId}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={MUTED_ICON} />
          <Text style={styles.meta}>{formatDateTime(new Date(donation.date))}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name={modeIcon[donation.mode]} size={13} color={MUTED_ICON} />
          <Text style={styles.meta}>{donation.mode}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>{formatINR(donation.amount)}</Text>
          <Pressable onPress={onMenu} hitSlop={10} accessibilityLabel="More options">
            <Ionicons name="ellipsis-horizontal" size={18} color={MUTED_ICON} />
          </Pressable>
        </View>
        <View style={[styles.badge, { backgroundColor: statusTone[donation.status].bg }]}>
          <Text style={[styles.badgeText, { color: statusTone[donation.status].text }]}>{donation.status}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },

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
  range: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },
  chips: { marginTop: 12, marginBottom: 14 },

  separator: { height: 10 },
  card: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 14 },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },

});
