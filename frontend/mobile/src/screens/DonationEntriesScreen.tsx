import { memo, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, type Tone, themedStyles } from '../theme';
import { LIST_PERFORMANCE_PROPS } from '../config/list';
import {
  deleteDonationEntry,
  getDonationEntries,
  MODE_FILTER,
  setDonationEntryStatus,
  toDonation,
  type ApiEntryStatus,
  type EntryFilters,
  type EntrySummary,
} from '../api/executive';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePagedList } from '../hooks/usePagedList';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../icons';
import type { DateRange, Donation, DonationStatus, PaymentMode } from '../types';
import { formatDate, formatRange, fromIsoDay, toIsoDay } from '../utils/date';
import { formatINR } from '../utils/format';
import { showToast } from '../utils/toast';
import { ActionSheet, AppHeader, DateRangeButton, EmptyState, FilterChips, IconCircle, PermissionGate, Pill, SearchBar } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'DonationEntries'>;

const FILTERS = ['All', 'Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Pending Verification'] as const;
type Filter = (typeof FILTERS)[number];

const avatarColors: Tone[] = [
  { get bg() { return colors.tint; }, get text() { return colors.primary; } },
  tones.info,
  tones.success,
  { get bg() { return colors.peachTint; }, get text() { return colors.peachText; } },
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
  Rejected: tones.danger,
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

// Donations recorded by the society (GET /admin/donations, the Donations section): members' app donations and
// entries added here. Pending ones wait for verification; only verified ones count in totals and reports
export default function DonationEntriesScreen() {
  return (
    <PermissionGate permission="donations">
      <DonationEntries />
    </PermissionGate>
  );
}

function DonationEntries() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());
  const [filter, setFilter] = useState<Filter>('All');
  const [range, setRange] = useState<DateRange | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Donation | null>(null);
  const [summary, setSummary] = useState<EntrySummary | null>(null);

  const fetchPage = useCallback(
    async (page: number) => {
      const filters: EntryFilters = { search, from_date: range?.start, to_date: range?.end };
      if (filter === 'Pending Verification') filters.status = 'pending';
      else if (filter !== 'All') filters.mode = MODE_FILTER[filter];
      const { data } = await getDonationEntries(page, filters);
      if (page === 1) setSummary(data.summary);
      return { items: data.donations.map(toDonation), pagination: data.pagination };
    },
    [search, filter, range],
  );
  const { items, loading, loadingMore, refreshing, error, loadMore, refresh } = usePagedList(fetchPage);

  // Back from Add / Edit: show the saved entry
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) refresh();
      focusedBefore.current = true;
    }, [refresh]),
  );

  const renderItem = useCallback(({ item }: { item: Donation }) => <DonationCard donation={item} onMenu={setMenuFor} />, []);

  const viewDonation = (d: Donation) =>
    Alert.alert(
      d.donorName,
      [
        `${t('Member ID')}: ${d.memberId}`,
        `${t('Amount')}: ${formatINR(d.amount)}`,
        `${t('Date')}: ${formatDate(fromIsoDay(d.date))}`,
        `${t('Mode')}: ${t(d.mode)}`,
        `${t('Status')}: ${t(d.status)}`,
        d.reference ? `${t('Reference')}: ${d.reference}` : null,
        d.purpose ? `${t('Purpose')}: ${d.purpose}` : null,
        d.note ? `${t('Notes')}: ${d.note}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      d.proofUrl
        ? [
            { text: t('Open proof'), onPress: () => Linking.openURL(d.proofUrl!).catch(() => {}) },
            { text: t('Close'), style: 'cancel' },
          ]
        : undefined,
    );

  const setStatus = (d: Donation, status: ApiEntryStatus) =>
    setDonationEntryStatus(Number(d.id), status)
      .then(({ message }) => {
        showToast(message);
        refresh();
      })
      .catch((e) => Alert.alert(t('Could not update'), e instanceof Error ? e.message : t('Please try again.')));

  const deleteDonation = (d: Donation) =>
    Alert.alert(t('Delete Entry'), t('Delete the donation of {amount} by {name}?', { amount: formatINR(d.amount), name: d.donorName }), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () =>
          deleteDonationEntry(Number(d.id))
            .then(({ message }) => {
              showToast(message);
              refresh();
            })
            .catch((e) => Alert.alert(t('Could not delete'), e instanceof Error ? e.message : t('Please try again.'))),
      },
    ]);

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={common.flex}>
          <Text style={common.heading}>{t('Donation Entries')}</Text>
          <Text style={common.subtext}>{t('View and manage donation transactions.')}</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddDonation')} accessibilityRole="button">
          <Text style={styles.addButtonText}>{t('+ Add Entry')}</Text>
        </Pressable>
      </View>

      {summary ? (
        <View style={styles.summary}>
          <View style={common.flex}>
            <Text style={styles.summaryValue}>{formatINR(summary.verified_total)}</Text>
            <Text style={styles.summaryLabel}>{t('Verified total')}</Text>
          </View>
          <View style={common.flex}>
            <Text style={styles.summaryValue}>{summary.count}</Text>
            <Text style={styles.summaryLabel}>{t('Entries')}</Text>
          </View>
        </View>
      ) : null}

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search by donor name, member ID..." autoCapitalize="none" />

      <DateRangeButton label={range ? formatRange(range) : 'All dates'} onPress={() => setRangeOpen(true)} style={styles.range} />

      <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} style={styles.chips} />
    </View>
  );

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <FlatList
        {...LIST_PERFORMANCE_PROPS}
        data={items}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <EmptyState
              icon={<MaterialCommunityIcons name={error ? 'cloud-off-outline' : 'hand-coin-outline'} size={40} color={colors.lightGold} />}
              text={error ? "Couldn't load donations. Pull down to try again." : 'No donations found'}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : undefined}
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

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.donorName}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'View', icon: 'eye-outline', onPress: () => viewDonation(menuFor) },
                ...(menuFor.status !== 'Verified'
                  ? [{ label: 'Mark Verified', icon: 'checkmark-circle-outline' as const, onPress: () => setStatus(menuFor, 'success') }]
                  : []),
                ...(menuFor.status === 'Pending'
                  ? [{ label: 'Reject', icon: 'close-circle-outline' as const, danger: true, onPress: () => setStatus(menuFor, 'rejected') }]
                  : []),
                { label: 'Edit', icon: 'create-outline', onPress: () => navigation.navigate('AddDonation', { donationId: Number(menuFor.id) }) },
                { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => deleteDonation(menuFor) },
              ]
            : []
        }
      />
    </View>
  );
}

const DonationCard = memo(function DonationCard({ donation, onMenu }: { donation: Donation; onMenu: (d: Donation) => void }) {
  const t = useT();
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
        <Text style={styles.meta}>{t('Member ID: {id}', { id: donation.memberId })}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedIcon} />
          <Text style={styles.meta}>{formatDate(fromIsoDay(donation.date))}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name={modeIcon[donation.mode]} size={13} color={colors.mutedIcon} />
          <Text style={styles.meta}>{`${t(donation.mode)}${donation.purpose ? ` · ${donation.purpose}` : ''}`}</Text>
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

const styles = themedStyles(() => ({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  loading: { marginVertical: 24 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },

  summary: { ...surface, flexDirection: 'row', gap: 12, padding: 12, marginTop: 12 },
  summaryValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.primary },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },

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
}));
