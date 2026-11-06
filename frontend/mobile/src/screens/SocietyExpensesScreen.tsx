import { Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { common, surface } from '../styles/common';
import { colors, fonts, PRIMARY_GRADIENT, tones } from '../theme';
import { canViewExpenses, useAuth } from '../context/AuthContext';
import { expenseBreakdown, financeSummary, transactions } from '../data/mock';
import { Ionicons, MaterialCommunityIcons } from '../icons';
import type { ExpenseCategory } from '../types';
import { formatINR } from '../utils/format';
import { AppHeader, IconCircle, Pill, SectionHeader } from '../components';

const noop = () => {};

export default function SocietyExpensesScreen() {
  const { user } = useAuth();
  const allowed = canViewExpenses(user);

  return (
    <View style={common.screen}>
      <AppHeader leftType="menu" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>Society Expenses</Text>
        <Text style={common.subtextRelaxed}>
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
      <IconCircle size={72}>
        <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
      </IconCircle>
      <Text style={styles.lockedText}>This section is visible to authorized members only.</Text>
    </View>
  );
}

function ExpensesContent() {
  return (
    <>
      <View style={styles.summaryRow}>
        <SummaryCard
          icon={<MaterialCommunityIcons name="currency-inr" size={18} color={tones.success.text} />}
          tone={tones.success}
          label="Total Income"
          amount={financeSummary.totalIncome}
          caption="This Month"
        />
        <SummaryCard
          icon={<Ionicons name="alert-circle-outline" size={18} color={tones.danger.text} />}
          tone={tones.danger}
          label="Total Expenses"
          amount={financeSummary.totalExpenses}
          caption="This Month"
        />
        <SummaryCard
          icon={<Ionicons name="wallet-outline" size={18} color={tones.info.text} />}
          tone={tones.info}
          label="Available Balance"
          amount={financeSummary.availableBalance}
          caption="Current Balance"
        />
      </View>

      <SectionHeader title="Expense Breakdown" onViewAll={noop} style={styles.sectionHeader} titleStyle={styles.sectionTitle} />
      <View style={styles.card}>
        {expenseBreakdown.map((item, i) => (
          <Fragment key={item.id}>
            {i > 0 ? <View style={common.divider} /> : null}
            <BreakdownRow item={item} />
          </Fragment>
        ))}
      </View>

      <SectionHeader title="Recent Transactions" onViewAll={noop} style={styles.sectionHeader} titleStyle={styles.sectionTitle} />
      <View style={styles.card}>
        {transactions.map((t, i) => (
          <Fragment key={t.id}>
            {i > 0 ? <View style={common.divider} /> : null}
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
                <Pill label={t.status} tone={tones.success} style={styles.completed} />
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
  tone,
  label,
  amount,
  caption,
}: {
  icon: ReactNode;
  tone: { text: string; bg: string };
  label: string;
  amount: number;
  caption: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <IconCircle size={32} color={tone.bg} style={styles.summaryIcon}>
        {icon}
      </IconCircle>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.summaryAmount, { color: tone.text }]} numberOfLines={1} adjustsFontSizeToFit>
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
      <IconCircle size={36}>
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </IconCircle>
      <View style={styles.breakdownInfo}>
        <Text style={styles.breakdownTitle}>{item.title}</Text>
        <View style={styles.track}>
          <LinearGradient
            colors={PRIMARY_GRADIENT}
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
      <Ionicons name="chevron-forward" size={16} color={colors.mutedIcon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32, flexGrow: 1 },

  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  lockedText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240 },

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  summaryCard: { ...surface, flex: 1, padding: 10, gap: 2 },
  summaryIcon: { marginBottom: 4 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  summaryAmount: { fontFamily: fonts.bold, fontSize: 16 },
  summaryCaption: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  sectionHeader: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15 },

  card: { ...surface, paddingHorizontal: 12 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
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
  completed: { paddingVertical: 2 },

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
});
