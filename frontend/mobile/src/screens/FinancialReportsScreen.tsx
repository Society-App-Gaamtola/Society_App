import { Fragment, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, PRIMARY_GRADIENT, tones, type Tone, themedStyles } from '../theme';
import { deleteReportRecord, getFinance, getSavedReports, type ApiFinance } from '../api/executive';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../icons';
import { makeReport, reportTypeOf } from '../services/reportExport';
import { shareFile } from '../services/receipt';
import type { DateRange, Report, ReportFormat } from '../types';
import { MONTHS, formatDateTime, formatRange, fromIsoDay } from '../utils/date';
import { formatINR } from '../utils/format';
import { showToast } from '../utils/toast';
import { ActionSheet, AppHeader, DateRangeButton, IconCircle, PermissionGate, PrimaryButton, SectionHeader } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';
import { thisMonth } from './ExportReportsScreen';
import { useT } from '../i18n';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FinancialReports'>;

const PADDING = 16;
const RECENT_REPORTS = 5;

/** Chart label: the day ("5") for a month picked, else the month ("Oct") */
const barLabel = (key: string) => (key.length === 10 ? String(Number(key.slice(8, 10))) : MONTHS[Number(key.slice(5, 7)) - 1]?.slice(0, 3) ?? key);

const toReport = (r: { id: number; report_type: string; from_date: string | null; to_date: string | null; created_at: string; generated_by_name?: string | null }): Report => {
  const range = r.from_date && r.to_date ? { start: r.from_date, end: r.to_date } : null;
  return {
    id: r.id,
    type: reportTypeOf(r.report_type),
    range,
    period: range ? formatRange(range) : 'All dates',
    generatedOn: formatDateTime(new Date(r.created_at)),
    generatedBy: r.generated_by_name,
  };
};

export default function FinancialReportsScreen() {
  return (
    <PermissionGate permission="reports">
      <FinancialReports />
    </PermissionGate>
  );
}

// The Financial Overview (GET /admin/finance: verified donations and expenses only) for the picked period, its
// chart (per day for a month), and the latest generated reports (GET /admin/reports), which open again on tap
function FinancialReports() {
  const t = useT();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<DateRange>(thisMonth);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [finance, setFinance] = useState<ApiFinance | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuFor, setMenuFor] = useState<Report | null>(null);
  const [opening, setOpening] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, saved] = await Promise.all([getFinance({ from_date: range.start, to_date: range.end }), getSavedReports(1)]);
      setFinance(overview.data);
      setReports(saved.data.reports.slice(0, RECENT_REPORTS).map(toReport));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Could not load the report.'));
    }
  }, [range, t]);

  // On open, on a new period, and back from Export Reports (a new report in the list)
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

  // A saved report is built again from today's data for its period and opened in the share sheet
  const openReport = async (r: Report, format: ReportFormat) => {
    setOpening(r.id);
    try {
      const { uri } = await makeReport(r.type, r.range ?? range, format);
      await shareFile(uri, format, r.type);
    } catch (e) {
      Alert.alert(t('Could not open report'), e instanceof Error ? e.message : t('Please try again.'));
    } finally {
      setOpening(null);
    }
  };

  const deleteReport = (r: Report) =>
    Alert.alert(t('Delete Report'), t('Delete "{title}"?', { title: `${t(r.type)} - ${r.period}` }), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () =>
          deleteReportRecord(r.id)
            .then(({ message }) => {
              showToast(message);
              load();
            })
            .catch((e) => Alert.alert(t('Could not delete'), e instanceof Error ? e.message : t('Please try again.'))),
      },
    ]);

  const totals = finance?.totals;
  const rows = finance?.monthly ?? [];
  const daily = rows[0]?.month.length === 10;
  // ₹ in thousands on the axis
  const bars = rows.map((r) => ({ value: r.donations / 1000, label: barLabel(r.month) }));
  const top = Math.max(1, ...bars.map((b) => b.value));
  const maxValue = Math.ceil(top / 4) * 4 || 4;
  const chartWidth = width - PADDING * 2 - 24 - 40;
  const barWidth = daily ? 8 : 22;
  const spacing = daily ? 6 : Math.max(12, (chartWidth - barWidth * Math.max(bars.length, 1)) / Math.max(bars.length, 1));

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <Text style={common.heading}>{t('Financial Reports')}</Text>
        <Text style={common.subtext}>{t('Verified donations and expenses for the period.')}</Text>

        <DateRangeButton label={formatRange(range)} onPress={() => setRangeOpen(true)} style={styles.range} />

        {error && !finance ? <Text style={styles.error}>{t(error)}</Text> : null}
        {!finance && !error ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}

        {totals ? (
          <View style={styles.grid}>
            <StatCard tone={tones.success} icon="cash" value={formatINR(totals.donations)} label="Total Donations" />
            <StatCard tone={tones.danger} icon="cash-minus" value={formatINR(totals.expenses)} label="Total Expenses" />
            <StatCard tone={tones.info} icon="wallet-outline" value={formatINR(totals.balance)} label="Balance" />
            <StatCard tone={tones.warning} icon="swap-vertical" value={String(totals.transactions)} label="Transactions" />
          </View>
        ) : null}

        {finance ? (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>{t(daily ? 'Donations per day' : 'Donations per month')}</Text>
            {bars.some((b) => b.value > 0) ? (
              <BarChart
                data={bars}
                width={chartWidth}
                height={170}
                barWidth={barWidth}
                spacing={spacing}
                initialSpacing={spacing / 2}
                frontColor={PRIMARY_GRADIENT[0]}
                barBorderTopLeftRadius={4}
                barBorderTopRightRadius={4}
                noOfSections={4}
                maxValue={maxValue}
                yAxisLabelSuffix="k"
                yAxisLabelWidth={34}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.border}
                rulesColor={colors.sand}
                rulesType="solid"
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                isAnimated
              />
            ) : (
              <Text style={styles.empty}>{t('No verified donations in this period.')}</Text>
            )}
          </View>
        ) : null}

        <SectionHeader title="Recent Reports" onViewAll={() => navigation.navigate('ExportReports')} style={styles.sectionHeader} />
        <View style={styles.card}>
          {reports.length ? (
            reports.map((r, i) => (
              <Fragment key={r.id}>
                {i > 0 ? <View style={common.divider} /> : null}
                <Pressable style={styles.reportRow} onPress={() => openReport(r, 'PDF')} accessibilityRole="button">
                  <IconCircle size={40} radius={8} color={tones.danger.bg}>
                    {opening === r.id ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="document-text-outline" size={20} color={colors.danger} />}
                  </IconCircle>
                  <View style={common.flex}>
                    <Text style={styles.reportTitle}>{t(r.type)}</Text>
                    <Text style={styles.reportMeta}>{r.period}</Text>
                    <Text style={styles.reportMeta}>{t('Generated on {date}', { date: r.generatedOn })}</Text>
                  </View>
                  <Pressable onPress={() => setMenuFor(r)} hitSlop={10} accessibilityLabel="More options">
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.mutedIcon} />
                  </Pressable>
                </Pressable>
              </Fragment>
            ))
          ) : (
            <Text style={styles.empty}>{t('No reports yet.')}</Text>
          )}
        </View>

        <PrimaryButton title="View Detailed Report" icon="bar-chart-outline" onPress={() => navigation.navigate('ExportReports')} style={styles.button} />
      </ScrollView>

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

      <ActionSheet
        visible={!!menuFor}
        title={menuFor ? `${t(menuFor.type)} - ${menuFor.period}` : undefined}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Open PDF', icon: 'document-outline', onPress: () => openReport(menuFor, 'PDF') },
                { label: 'Open Excel', icon: 'grid-outline', onPress: () => openReport(menuFor, 'Excel') },
                { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => deleteReport(menuFor) },
              ]
            : []
        }
      />
    </View>
  );
}

function StatCard({ tone, icon, value, label }: { tone: Tone; icon: McIconName; value: string; label: string }) {
  const t = useT();
  return (
    <View style={styles.stat}>
      <IconCircle size={40} radius={10} color={tone.bg}>
        <MaterialCommunityIcons name={icon} size={22} color={tone.text} />
      </IconCircle>
      <View style={common.flex}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.statLabel} numberOfLines={1}>
          {t(label)}
        </Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  scroll: { padding: PADDING, paddingBottom: 32 },
  range: { marginTop: 14 },
  loading: { marginVertical: 24 },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger, textAlign: 'center', marginTop: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: {
    ...surface,
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.textDark },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },

  chartCard: { ...surface, marginTop: 16, padding: 12, overflow: 'hidden' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textDark, marginBottom: 12 },
  axisText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  sectionHeader: { marginTop: 20, marginBottom: 10 },
  card: { ...surface, paddingHorizontal: 12 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  reportTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  reportMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  button: { marginTop: 18 },
}));
