import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, PRIMARY_GRADIENT, tones, type Tone, themedStyles } from '../theme';
import { deleteExpense, getExpenses, setExpenseStatus, type ApiExpense, type ApiExpenseStatus, type ExpenseSummary } from '../api/executive';
import { Ionicons, MaterialCommunityIcons } from '../icons';
import type { DateRange } from '../types';
import { formatDate, formatRange, fromIsoDay } from '../utils/date';
import { formatINR } from '../utils/format';
import { showToast } from '../utils/toast';
import { ActionSheet, AppHeader, DateRangeButton, IconCircle, OutlineButton, PermissionGate, Pill, SectionHeader } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';
import { thisMonth } from './ExportReportsScreen';
import { useT } from '../i18n';

const STATUS: Record<ApiExpenseStatus, { label: string; tone: () => Tone }> = {
  verified: { label: 'Verified', tone: () => tones.success },
  pending: { label: 'Pending', tone: () => tones.warning },
  rejected: { label: 'Rejected', tone: () => tones.danger },
};

export default function SocietyExpensesScreen() {
  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <PermissionGate permission="expenses">
        <SocietyExpenses />
      </PermissionGate>
    </View>
  );
}

// The society's spending for the picked period (GET /admin/expenses): income / expenses / balance cards, verified
// spending per category, and the period's expenses (any status), newest first, a page at a time.
// Add opens Add Expense; tapping an expense offers Edit / Verify / Reject / Delete
function SocietyExpenses() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'SocietyExpenses'>>();
  const [categories, setCategories] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<ApiExpense | null>(null);
  const [range, setRange] = useState<DateRange>(thisMonth);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dates = { from_date: range.start, to_date: range.end };

  const load = useCallback(async () => {
    try {
      const { data } = await getExpenses(1, { from_date: range.start, to_date: range.end });
      setSummary(data.summary);
      setExpenses(data.expenses);
      setCategories(data.expense_categories ?? []);
      setPage(1);
      setHasMore(data.pagination.has_more);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load expenses.'));
    }
  }, [range, t]);

  // On open, on a new period, and when coming back to the screen
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await getExpenses(page + 1, dates);
      setExpenses((list) => [...list, ...data.expenses]);
      setPage(page + 1);
      setHasMore(data.pagination.has_more);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load expenses.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const spent = summary?.verified_total ?? 0;

  const fail = (e: unknown) => Alert.alert(t('Something went wrong'), e instanceof Error ? e.message : t('Please try again.'));
  const changeStatus = (e: ApiExpense, status: ApiExpenseStatus) =>
    setExpenseStatus(e.id, status)
      .then(({ message }) => {
        showToast(message);
        load();
      })
      .catch(fail);
  const remove = (e: ApiExpense) =>
    Alert.alert(t('Delete Expense'), t('Delete "{title}"?', { title: e.description }), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () =>
          deleteExpense(e.id)
            .then(({ message }) => {
              showToast(message);
              load();
            })
            .catch(fail),
      },
    ]);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.titleRow}>
          <View style={common.flex}>
            <Text style={common.heading}>{t('Society Expenses')}</Text>
            <Text style={common.subtextRelaxed}>{t('Track income, expenses and financial details of our society.')}</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddExpense', { categories })} accessibilityRole="button">
            <Text style={styles.addButtonText}>{t('+ Add')}</Text>
          </Pressable>
        </View>

        <DateRangeButton label={formatRange(range)} onPress={() => setRangeOpen(true)} style={styles.range} />

        {error && !summary ? <Text style={styles.error}>{t(error)}</Text> : null}
        {!summary && !error ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}

        {summary ? (
          <>
            <View style={styles.summaryRow}>
              <SummaryCard
                icon={<MaterialCommunityIcons name="currency-inr" size={18} color={tones.success.text} />}
                tone={tones.success}
                label="Total Income"
                amount={summary.income}
                caption="This Period"
              />
              <SummaryCard
                icon={<Ionicons name="alert-circle-outline" size={18} color={tones.danger.text} />}
                tone={tones.danger}
                label="Total Expenses"
                amount={spent}
                caption="This Period"
              />
              <SummaryCard
                icon={<Ionicons name="wallet-outline" size={18} color={tones.info.text} />}
                tone={tones.info}
                label="Available Balance"
                amount={summary.balance}
                caption="Current Balance"
              />
            </View>

            <SectionHeader title="Expense Breakdown" style={styles.sectionHeader} titleStyle={styles.sectionTitle} />
            <View style={styles.card}>
              {summary.categories.length ? (
                summary.categories.map((c, i) => (
                  <Fragment key={c.category}>
                    {i > 0 ? <View style={common.divider} /> : null}
                    <BreakdownRow title={c.category} amount={c.amount} total={spent} />
                  </Fragment>
                ))
              ) : (
                <Text style={styles.empty}>{t('No verified expenses in this period.')}</Text>
              )}
            </View>

            <SectionHeader title="Recent Transactions" style={styles.sectionHeader} titleStyle={styles.sectionTitle} />
            <View style={styles.card}>
              {expenses.length ? (
                expenses.map((e, i) => (
                  <Fragment key={e.id}>
                    {i > 0 ? <View style={common.divider} /> : null}
                    <ExpenseRow expense={e} onPress={() => setMenuFor(e)} />
                  </Fragment>
                ))
              ) : (
                <Text style={styles.empty}>{t('No expenses in this period.')}</Text>
              )}
            </View>
            {hasMore ? (
              <OutlineButton title={loadingMore ? 'Loading...' : 'Load More'} onPress={loadingMore ? () => {} : loadMore} style={styles.more} />
            ) : null}
          </>
        ) : null}

        <View style={styles.note}>
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.gold} />
          <Text style={styles.noteText}>
            {t('Financial details visible to authorized members only. For any queries, contact the admin team.')}
          </Text>
        </View>
      </ScrollView>

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.description}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Edit', icon: 'create-outline', onPress: () => navigation.navigate('AddExpense', { expenseId: menuFor.id, categories }) },
                ...(menuFor.status !== 'verified'
                  ? [{ label: 'Verify', icon: 'checkmark-circle-outline' as const, onPress: () => changeStatus(menuFor, 'verified') }]
                  : []),
                ...(menuFor.status !== 'rejected'
                  ? [{ label: 'Reject', icon: 'close-circle-outline' as const, onPress: () => changeStatus(menuFor, 'rejected') }]
                  : []),
                { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => remove(menuFor) },
              ]
            : []
        }
      />

      <DateRangeSheet
        visible={rangeOpen}
        initial={range}
        defaultMonth={range.start}
        allowClear={false}
        onClose={() => setRangeOpen(false)}
        onApply={(r) => {
          if (r) setRange(r);
          setRangeOpen(false);
        }}
      />
    </>
  );
}

function SummaryCard({ icon, tone, label, amount, caption }: { icon: ReactNode; tone: Tone; label: string; amount: number; caption: string }) {
  const t = useT();
  return (
    <View style={styles.summaryCard}>
      <IconCircle size={32} color={tone.bg} style={styles.summaryIcon}>
        {icon}
      </IconCircle>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {t(label)}
      </Text>
      <Text style={[styles.summaryAmount, { color: tone.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatINR(amount)}
      </Text>
      <Text style={styles.summaryCaption}>{t(caption)}</Text>
    </View>
  );
}

/** One category: its verified spending and its share of the period's total */
function BreakdownRow({ title, amount, total }: { title: string; amount: number; total: number }) {
  const percent = total ? Math.round((amount / total) * 100) : 0;
  return (
    <View style={styles.breakdownRow}>
      <IconCircle size={36}>
        <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
      </IconCircle>
      <View style={styles.breakdownInfo}>
        <Text style={styles.breakdownTitle}>{title}</Text>
        <View style={styles.track}>
          <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      </View>
      <View style={styles.breakdownRight}>
        <Text style={styles.breakdownAmount}>{formatINR(amount)}</Text>
        <Text style={styles.breakdownPercent}>{percent}%</Text>
      </View>
    </View>
  );
}

function ExpenseRow({ expense: e, onPress }: { expense: ApiExpense; onPress: () => void }) {
  const status = STATUS[e.status] ?? STATUS.pending;
  return (
    <Pressable style={styles.txRow} onPress={onPress} accessibilityRole="button">
      <Text style={styles.txDate}>{formatDate(fromIsoDay(e.txn_date))}</Text>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {e.category}
        </Text>
        <Text style={styles.txNote} numberOfLines={1}>
          {e.description} · {e.paid_to}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{formatINR(e.amount)}</Text>
        <Pill label={status.label} tone={status.tone()} style={styles.status} />
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addButton: { height: 34, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', marginTop: 4 },
  addButtonText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.white },
  range: { marginTop: 14 },
  loading: { marginTop: 40 },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center', marginTop: 30 },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 18 },

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  summaryCard: { ...surface, flex: 1, padding: 10, gap: 2 },
  summaryIcon: { marginBottom: 4 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  summaryAmount: { fontFamily: fonts.bold, fontSize: 16 },
  summaryCaption: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  sectionHeader: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15 },

  card: { ...surface, paddingHorizontal: 12 },
  more: { marginTop: 12 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  breakdownInfo: { flex: 1, gap: 6 },
  breakdownTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.sand, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  breakdownRight: { alignItems: 'flex-end' },
  breakdownAmount: { fontFamily: fonts.bold, fontSize: 12, color: colors.textDark },
  breakdownPercent: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  txDate: { width: 70, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  txInfo: { flex: 1 },
  txTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  txNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontFamily: fonts.bold, fontSize: 13, color: colors.textDark },
  status: { paddingVertical: 2 },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.noteBackground,
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
}));
