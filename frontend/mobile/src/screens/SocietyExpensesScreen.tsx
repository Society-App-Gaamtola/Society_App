import { Fragment, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { canViewExpenses, useAuth } from '../auth/AuthContext';
import { expenseBreakdown, financeSummary, transactions, type ExpenseCategory } from '../data/mock';
import { formatINR } from '../utils/format';
import { AppHeader } from '../components';

const MUTED_ICON = '#9A8F86';
const GREEN = '#1E8E4E';
const RED = '#C62828';
const BLUE = '#1E63C6';

export default function SocietyExpensesScreen() {
  const { user } = useAuth();
  const allowed = canViewExpenses(user);

  return (
    <View style={styles.container}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Society Expenses</Text>
        <Text style={styles.subtext}>
          Track income, expenses and financial details of our society. Accessible only to authorized members.
        </Text>

        {allowed ? <ExpensesContent /> : <Locked />}
      </ScrollView>
    </View>
  );
}

function Locked() {
  return (
    <View style={styles.locked}>
      <View style={styles.lockCircle}>
        <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.lockedText}>This section is visible to authorized members only.</Text>
    </View>
  );
}

function ExpensesContent() {
  return (
    <>
      <View style={styles.summaryRow}>
        <SummaryCard
          icon={<MaterialCommunityIcons name="currency-inr" size={18} color={GREEN} />}
          circle="#E6F6EC"
          label="Total Income"
          amount={financeSummary.totalIncome}
          color={GREEN}
          caption="This Month"
        />
        <SummaryCard
          icon={<Ionicons name="alert-circle-outline" size={18} color={RED} />}
          circle="#FDECEC"
          label="Total Expenses"
          amount={financeSummary.totalExpenses}
          color={RED}
          caption="This Month"
        />
        <SummaryCard
          icon={<Ionicons name="wallet-outline" size={18} color={BLUE} />}
          circle="#E8F0FC"
          label="Available Balance"
          amount={financeSummary.availableBalance}
          color={BLUE}
          caption="Current Balance"
        />
      </View>

      <SectionHeader title="Expense Breakdown" />
      <View style={styles.card}>
        {expenseBreakdown.map((item, i) => (
          <Fragment key={item.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <BreakdownRow item={item} />
          </Fragment>
        ))}
      </View>

      <SectionHeader title="Recent Transactions" />
      <View style={styles.card}>
        {transactions.map((t, i) => (
          <Fragment key={t.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.txRow}>
              <Text style={styles.txDate}>{t.date}</Text>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{t.title}</Text>
                <Text style={styles.txNote} numberOfLines={1}>
                  {t.note}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{formatINR(t.amount)}</Text>
                <View style={styles.completed}>
                  <Text style={styles.completedText}>{t.status}</Text>
                </View>
              </View>
            </View>
          </Fragment>
        ))}
      </View>

      <View style={styles.note}>
        <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.gold} />
        <Text style={styles.noteText}>
          Financial details visible to authorized members only. For any queries, contact the admin team.
        </Text>
      </View>
    </>
  );
}

function SummaryCard({
  icon,
  circle,
  label,
  amount,
  color,
  caption,
}: {
  icon: React.ReactNode;
  circle: string;
  label: string;
  amount: number;
  color: string;
  caption: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: circle }]}>{icon}</View>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.summaryAmount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatINR(amount)}
      </Text>
      <Text style={styles.summaryCaption}>{caption}</Text>
    </View>
  );
}

function BreakdownRow({ item }: { item: ExpenseCategory }) {
  const ratio = item.budget ? Math.min(item.spent / item.budget, 1) : 0;
  const percent = Math.round(ratio * 100);
  return (
    <Pressable style={styles.breakdownRow} accessibilityRole="button">
      <View style={styles.breakdownIcon}>
        <Ionicons name={item.icon as ComponentProps<typeof Ionicons>['name']} size={18} color={colors.primary} />
      </View>
      <View style={styles.breakdownInfo}>
        <Text style={styles.breakdownTitle}>{item.title}</Text>
        <View style={styles.track}>
          <LinearGradient
            colors={['#8E1426', '#6A0D1B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${percent}%` }]}
          />
        </View>
      </View>
      <View style={styles.breakdownRight}>
        <Text style={styles.breakdownAmount}>
          <Text style={styles.bold}>{formatINR(item.spent)}</Text> / {formatINR(item.budget)}
        </Text>
        <Text style={styles.breakdownPercent}>{percent}%</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED_ICON} />
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable hitSlop={8}>
        <Text style={styles.viewAll}>View All →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },

  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240 },

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 2,
  },
  summaryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  summaryAmount: { fontFamily: fonts.bold, fontSize: 16 },
  summaryCaption: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textDark },
  viewAll: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.primary },

  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  divider: { height: 1, backgroundColor: colors.border },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8E9E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownInfo: { flex: 1, gap: 6 },
  breakdownTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  track: { height: 6, borderRadius: 3, backgroundColor: '#F1E6DA', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  breakdownRight: { alignItems: 'flex-end' },
  breakdownAmount: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDark },
  bold: { fontFamily: fonts.bold },
  breakdownPercent: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  txDate: { width: 70, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  txInfo: { flex: 1 },
  txTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  txNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontFamily: fonts.bold, fontSize: 13, color: colors.textDark },
  completed: { backgroundColor: '#E6F6EC', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  completedText: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14, color: GREEN },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FDF3E4',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
});
