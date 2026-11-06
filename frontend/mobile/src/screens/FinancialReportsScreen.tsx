import { Fragment, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { common, surface } from '../styles/common';
import { colors, fonts, PRIMARY_GRADIENT, tones, type Tone } from '../theme';
import { REPORT_MIME_TYPES } from '../config';
import { useDonations } from '../context/DonationsContext';
import { useReports } from '../context/ReportsContext';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../icons';
import type { DateRange, Report } from '../types';
import { formatRange, isInRange } from '../utils/date';
import { formatINR } from '../utils/format';
import { ActionSheet, AppHeader, DateRangeButton, IconCircle, PermissionGate, Pill, PrimaryButton, SectionHeader } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FinancialReports'>;

const DEFAULT_RANGE: DateRange = { start: '2026-10-01', end: '2026-10-31' };
const PADDING = 16;
const BAR_WIDTH = 22;

// Dummy trend until monthly totals come from the API.
const TREND = [
  { value: 18, label: 'May' },
  { value: 26, label: 'Jun' },
  { value: 24, label: 'Jul' },
  { value: 30, label: 'Aug' },
  { value: 38, label: 'Sep' },
  { value: 52, label: 'Oct' },
];

const formatBadge: Record<Report['format'], Tone> = {
  PDF: tones.danger,
  Excel: tones.success,
};

export default function FinancialReportsScreen() {
  return (
    <PermissionGate permission="reports">
      <FinancialReports />
    </PermissionGate>
  );
}

function FinancialReports() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const { donations } = useDonations();
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [rangeOpen, setRangeOpen] = useState(false);
  const { reports, removeReport } = useReports();
  const [menuFor, setMenuFor] = useState<Report | null>(null);

  const stats = useMemo(() => {
    const inRange = donations.filter((d) => isInRange(d.date, range) && d.status !== 'Draft');
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return {
      total: inRange.reduce((sum, d) => sum + d.amount, 0),
      verified: inRange.filter((d) => d.status === 'Verified').length,
      pending: inRange.filter((d) => d.status === 'Pending').length,
      thisMonth: donations
        .filter((d) => d.status !== 'Draft' && d.date.startsWith(monthKey))
        .reduce((sum, d) => sum + d.amount, 0),
    };
  }, [donations, range]);

  // Chart width = screen minus page padding, card padding and the y-axis labels.
  const chartWidth = width - PADDING * 2 - 24 - 40;
  const barSpacing = Math.max(12, (chartWidth - BAR_WIDTH * TREND.length) / TREND.length);

  // Generated reports open in the system share/preview sheet; seed entries have no file.
  const openReport = async (r: Report) => {
    if (!r.fileUri) {
      Alert.alert(r.title, 'This sample report has no file. Export a new report to open it.');
      return;
    }
    try {
      await Sharing.shareAsync(r.fileUri, { mimeType: REPORT_MIME_TYPES[r.format], dialogTitle: r.title });
    } catch {
      Alert.alert('Could not open report', 'The report file may have been removed.');
    }
  };

  const deleteReport = (r: Report) =>
    Alert.alert('Delete Report', `Delete "${r.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeReport(r.id) },
    ]);

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>Financial Reports</Text>
        <Text style={common.subtext}>View donation summaries and reports.</Text>

        <DateRangeButton label={formatRange(range)} onPress={() => setRangeOpen(true)} style={styles.range} />

        <View style={styles.grid}>
          <StatCard tone={tones.success} icon="cash" value={formatINR(stats.total)} label="Total Donations" />
          <StatCard tone={tones.info} icon="check-circle-outline" value={String(stats.verified)} label="Verified Entries" />
          <StatCard tone={tones.warning} icon="clock-outline" value={String(stats.pending)} label="Pending Entries" />
          <StatCard tone={tones.danger} icon="chart-bar" value={formatINR(stats.thisMonth)} label="This Month Total" />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Donation Trend (Last 6 Months)</Text>
          <BarChart
            data={TREND}
            width={chartWidth}
            height={170}
            barWidth={BAR_WIDTH}
            spacing={barSpacing}
            initialSpacing={barSpacing / 2}
            frontColor={PRIMARY_GRADIENT[0]}
            barBorderTopLeftRadius={6}
            barBorderTopRightRadius={6}
            noOfSections={4}
            maxValue={60}
            yAxisLabelSuffix="k"
            yAxisLabelWidth={34}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.border}
            rulesColor="#F1E6DA"
            rulesType="solid"
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            isAnimated
          />
        </View>

        <SectionHeader title="Recent Reports" onViewAll={() => navigation.navigate('ExportReports')} style={styles.sectionHeader} />
        <View style={styles.card}>
          {reports.length ? (
            reports.map((r, i) => (
              <Fragment key={r.id}>
                {i > 0 ? <View style={common.divider} /> : null}
                <View style={styles.reportRow}>
                  <IconCircle size={40} radius={8} color={tones.danger.bg}>
                    <Ionicons name="document-text-outline" size={20} color={colors.danger} />
                  </IconCircle>
                  <View style={common.flex}>
                    <Text style={styles.reportTitle}>{r.title}</Text>
                    <Text style={styles.reportMeta}>{r.period}</Text>
                    <Text style={styles.reportMeta}>Generated on {r.generatedOn}</Text>
                  </View>
                  <View style={styles.reportRight}>
                    <Pill label={r.format} tone={formatBadge[r.format]} />
                    <Pressable onPress={() => setMenuFor(r)} hitSlop={10} accessibilityLabel="More options">
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.mutedIcon} />
                    </Pressable>
                  </View>
                </View>
              </Fragment>
            ))
          ) : (
            <Text style={styles.empty}>No reports yet.</Text>
          )}
        </View>

        <PrimaryButton
          title="View Detailed Report"
          icon="bar-chart-outline"
          onPress={() => navigation.navigate('ExportReports')}
          style={styles.button}
        />
      </ScrollView>

      <DateRangeSheet
        visible={rangeOpen}
        initial={range}
        defaultMonth={DEFAULT_RANGE.start}
        allowClear={false}
        onClose={() => setRangeOpen(false)}
        onApply={(r) => {
          if (r) setRange(r);
          setRangeOpen(false);
        }}
      />

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.title}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Open', icon: 'open-outline', onPress: () => openReport(menuFor) },
                { label: 'Share', icon: 'share-social-outline', onPress: () => openReport(menuFor) },
                { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => deleteReport(menuFor) },
              ]
            : []
        }
      />
    </View>
  );
}

function StatCard({ tone, icon, value, label }: { tone: Tone; icon: McIconName; value: string; label: string }) {
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
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: PADDING, paddingBottom: 32 },
  range: { marginTop: 14 },

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
  reportRight: { alignItems: 'flex-end', gap: 10 },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  button: { marginTop: 18 },
});
