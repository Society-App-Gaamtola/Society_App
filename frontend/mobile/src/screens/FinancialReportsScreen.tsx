import { Fragment, useMemo, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { useDonations } from '../donations/DonationsContext';
import { useReports, type Report } from '../reports/ReportsContext';
import * as Sharing from 'expo-sharing';
import { reportMimeType } from '../reports/exportReport';
import { formatINR } from '../utils/format';
import { AppHeader, PermissionGate, PrimaryButton } from '../components';
import ActionSheet from '../components/ActionSheet';
import DateRangeSheet, { formatRange, type DateRange } from '../components/DateRangeSheet';
import { SectionHeader } from '../components/HomeSections';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FinancialReports'>;

const DEFAULT_RANGE: DateRange = { start: '2026-10-01', end: '2026-10-31' };
const BAR_COLOR = '#8E1426';
const MUTED_ICON = '#9A8F86';
const PADDING = 16;

// Dummy trend until monthly totals come from the API.
const TREND = [
  { label: 'May', value: 18000 },
  { label: 'Jun', value: 26000 },
  { label: 'Jul', value: 24000 },
  { label: 'Aug', value: 30000 },
  { label: 'Sep', value: 38000 },
  { label: 'Oct', value: 52000 },
];

const formatBadge: Record<Report['format'], { text: string; bg: string }> = {
  PDF: { text: '#C62828', bg: '#FDECEC' },
  Excel: { text: '#1E8E4E', bg: '#E6F6EC' },
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
    const inRange = donations.filter((d) => {
      const day = d.date.slice(0, 10);
      return day >= range.start && day <= range.end && d.status !== 'Draft';
    });
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
  const barWidth = 22;
  const spacing = Math.max(12, (chartWidth - barWidth * TREND.length) / TREND.length);

  // Generated reports open in the system share/preview sheet; seed entries have no file.
  const openReport = async (r: Report) => {
    if (!r.fileUri) {
      Alert.alert(r.title, 'This sample report has no file. Export a new report to open it.');
      return;
    }
    try {
      await Sharing.shareAsync(r.fileUri, { mimeType: reportMimeType(r.format), dialogTitle: r.title });
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
    <View style={styles.container}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Financial Reports</Text>
        <Text style={styles.subtext}>View donation summaries and reports.</Text>

        <Pressable style={styles.range} onPress={() => setRangeOpen(true)} accessibilityRole="button">
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.rangeText}>{formatRange(range)}</Text>
          <Ionicons name="chevron-forward" size={18} color={MUTED_ICON} />
        </Pressable>

        <View style={styles.grid}>
          <StatCard bg="#E6F6EC" color="#1E8E4E" icon="cash" value={formatINR(stats.total)} label="Total Donations" />
          <StatCard bg="#E8F0FC" color="#1E63C6" icon="check-circle-outline" value={String(stats.verified)} label="Verified Entries" />
          <StatCard bg="#FFF1E0" color="#E0700B" icon="clock-outline" value={String(stats.pending)} label="Pending Entries" />
          <StatCard bg="#FDECEC" color="#C62828" icon="chart-bar" value={formatINR(stats.thisMonth)} label="This Month Total" />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Donation Trend (Last 6 Months)</Text>
          <BarChart
            data={TREND.map((t) => ({ value: t.value / 1000, label: t.label }))}
            width={chartWidth}
            height={170}
            barWidth={barWidth}
            spacing={spacing}
            initialSpacing={spacing / 2}
            frontColor={BAR_COLOR}
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
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.reportRow}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="document-text-outline" size={20} color="#C62828" />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.reportTitle}>{r.title}</Text>
                    <Text style={styles.reportMeta}>{r.period}</Text>
                    <Text style={styles.reportMeta}>Generated on {r.generatedOn}</Text>
                  </View>
                  <View style={styles.reportRight}>
                    <View style={[styles.badge, { backgroundColor: formatBadge[r.format].bg }]}>
                      <Text style={[styles.badgeText, { color: formatBadge[r.format].text }]}>{r.format}</Text>
                    </View>
                    <Pressable onPress={() => setMenuFor(r)} hitSlop={10} accessibilityLabel="More options">
                      <Ionicons name="ellipsis-horizontal" size={18} color={MUTED_ICON} />
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

function StatCard({
  bg,
  color,
  icon,
  value,
  label,
}: {
  bg: string;
  color: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.flex}>
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
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: PADDING, paddingBottom: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  range: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.textDark },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },

  chartCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textDark, marginBottom: 12 },
  axisText: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },

  sectionHeader: { marginTop: 20, marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  divider: { height: 1, backgroundColor: colors.border },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textDark },
  reportMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  reportRight: { alignItems: 'flex-end', gap: 10 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
  empty: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  button: { marginTop: 18 },
});
