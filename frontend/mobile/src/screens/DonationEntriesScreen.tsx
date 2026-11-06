import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, type Tone } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import { useDonations } from '../context/DonationsContext';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../icons';
import type { DateRange, Donation, DonationStatus, PaymentMode } from '../types';
import { formatDateTime, formatRange, isInRange } from '../utils/date';
import { formatINR } from '../utils/format';
import { ActionSheet, AppHeader, DateRangeButton, EmptyState, FilterChips, IconCircle, PermissionGate, Pill, SearchBar } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'DonationEntries'>;

const FILTERS = ['All', 'Cash', 'UPI', 'Bank Transfer', 'Pending Verification'] as const;
type Filter = (typeof FILTERS)[number];

const DEFAULT_MONTH = '2026-10-10';

const avatarColors: Tone[] = [
  { bg: colors.tint, text: colors.primary },
  tones.info,
  tones.success,
  { bg: '#FDEFE3', text: '#B45309' },
];

const modeIcon: Record<PaymentMode, McIconName> = {
  UPI: 'cellphone',
  Cash: 'cash',
  'Bank Transfer': 'bank-outline',
  Cheque: 'checkbook',
};

const statusTone: Record<DonationStatus, Tone> = {
  Verified: tones.success,
  Pending: tones.warning,
  Draft: tones.neutral,
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

const Separator = () => <View style={styles.separator} />;

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
  const [filter, setFilter] = useState<Filter>('All');
  // Start with all dates so newly added entries are always visible.
  const [range, setRange] = useState<DateRange | null>(null);
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
      .filter((d) => !range || isInRange(d.date, range))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [donations, query, filter, range]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const renderItem = useCallback(({ item }: { item: Donation }) => <DonationCard donation={item} onMenu={setMenuFor} />, []);

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
        <View style={common.flex}>
          <Text style={common.heading}>Donation Entries</Text>
          <Text style={common.subtext}>View and manage donation transactions.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddDonation')} accessibilityRole="button">
          <Text style={styles.addButtonText}>+ Add Entry</Text>
        </Pressable>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search by donor name, member ID..."
        autoCapitalize="none"
        actionIcon="options-outline"
        actionLabel="Filters"
        onActionPress={() => Alert.alert('Filters', 'More filters coming soon.')}
      />

      <DateRangeButton label={range ? formatRange(range) : 'All dates'} onPress={() => setRangeOpen(true)} style={styles.range} />

      <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
    </View>
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={data}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon={<MaterialCommunityIcons name="hand-coin-outline" size={40} color={colors.lightGold} />} text="No donations found" />
        }
        renderItem={renderItem}
      />

      <DateRangeSheet
        visible={rangeOpen}
        initial={range}
        defaultMonth={DEFAULT_MONTH}
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

const DonationCard = memo(function DonationCard({ donation, onMenu }: { donation: Donation; onMenu: (d: Donation) => void }) {
  const tone = colorFor(donation.donorName);
  return (
    <View style={styles.card}>
      <IconCircle size={40} color={tone.bg}>
        <Text style={[styles.avatarText, { color: tone.text }]}>{initials(donation.donorName)}</Text>
      </IconCircle>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {donation.donorName}
        </Text>
        <Text style={styles.meta}>Member ID: {donation.memberId}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedIcon} />
          <Text style={styles.meta}>{formatDateTime(new Date(donation.date))}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name={modeIcon[donation.mode]} size={13} color={colors.mutedIcon} />
          <Text style={styles.meta}>{donation.mode}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>{formatINR(donation.amount)}</Text>
          <Pressable onPress={() => onMenu(donation)} hitSlop={10} accessibilityLabel="More options">
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.mutedIcon} />
          </Pressable>
        </View>
        <Pill label={donation.status} tone={statusTone[donation.status]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },

  range: { marginTop: 10 },
  chips: { marginTop: 12, marginBottom: 14 },

  separator: { height: 10 },
  card: { ...surface, flexDirection: 'row', gap: 10, padding: 12 },
  avatarText: { fontFamily: fonts.bold, fontSize: 14 },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textDark },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark },
});
