import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { useDonations } from '../donations/DonationsContext';
import { useReports, type ReportFormat } from '../reports/ReportsContext';
import { buildReportData, generateReportFile, reportMimeType, type ReportType } from '../reports/exportReport';
import { formatDateTime } from '../utils/date';
import { AppHeader, PermissionGate, PrimaryButton } from '../components';
import DateRangeSheet, { formatRange, type DateRange } from '../components/DateRangeSheet';

type McIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

const DEFAULT_RANGE: DateRange = { start: '2026-10-01', end: '2026-10-31' };
const MUTED_ICON = '#9A8F86';
const PDF_RED = '#C62828';
const EXCEL_GREEN = '#1E8E4E';

const REPORT_TYPES: { type: ReportType; icon: McIcon }[] = [
  { type: 'Donation Summary', icon: 'chart-pie' },
  { type: 'Transaction History', icon: 'format-list-bulleted' },
  { type: 'Member-wise Report', icon: 'account-group-outline' },
];

const FORMATS: { format: ReportFormat; label: string; icon: McIcon; color: string }[] = [
  { format: 'PDF', label: 'PDF (Recommended)', icon: 'file-pdf-box', color: PDF_RED },
  { format: 'Excel', label: 'Excel (Editable)', icon: 'file-excel-box', color: EXCEL_GREEN },
];

const INCLUDES = [
  'Total donation amount and count',
  'Category-wise breakdown',
  'Payment method-wise summary',
  'Monthly trend and charts',
];

const toIsoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const last30Days = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: toIsoDay(start), end: toIsoDay(end) };
};

type Job = 'main' | 'quick-PDF' | 'quick-Excel';

export default function ExportReportsScreen() {
  return (
    <PermissionGate permission="reports">
      <ExportReports />
    </PermissionGate>
  );
}

function ExportReports() {
  const { donations } = useDonations();
  const { addReport } = useReports();
  const [type, setType] = useState<ReportType>('Donation Summary');
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [running, setRunning] = useState<Job | null>(null);
  const [success, setSuccess] = useState(false);

  const run = async (job: Job, reportRange: DateRange, reportFormat: ReportFormat) => {
    if (running) return;
    setRunning(job);
    setSuccess(false);
    try {
      const data = buildReportData(donations, type, reportRange);
      const uri = await generateReportFile(data, reportFormat);
      addReport({
        title: `${type} - ${data.period}`,
        period: data.period,
        generatedOn: formatDateTime(new Date()),
        format: reportFormat,
        fileUri: uri,
      });
      setSuccess(true);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: reportMimeType(reportFormat), dialogTitle: type });
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not generate the report. Please try again.');
    } finally {
      setRunning(null);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Export Reports</Text>
        <Text style={styles.subtext}>Generate and export donation reports.</Text>

        <Label text="Report Type" />
        <View style={styles.tiles}>
          {REPORT_TYPES.map((t) => {
            const active = t.type === type;
            return (
              <Pressable
                key={t.type}
                onPress={() => setType(t.type)}
                style={[styles.tile, active && styles.tileActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons name={t.icon} size={24} color={active ? colors.primary : MUTED_ICON} />
                <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{t.type}</Text>
              </Pressable>
            );
          })}
        </View>

        <Label text="Date Range" />
        <Pressable style={styles.range} onPress={() => setRangeOpen(true)} accessibilityRole="button">
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.rangeText}>{formatRange(range)}</Text>
          <Ionicons name="chevron-forward" size={18} color={MUTED_ICON} />
        </Pressable>

        <Label text="Export Format" />
        <View style={styles.tiles}>
          {FORMATS.map((f) => {
            const active = f.format === format;
            return (
              <Pressable
                key={f.format}
                onPress={() => setFormat(f.format)}
                style={[styles.tile, styles.formatTile, active && styles.tileActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons name={f.icon} size={26} color={f.color} />
                <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.includes}>
          <View style={styles.includesHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#E0700B" />
            <Text style={styles.includesTitle}>Report Includes</Text>
          </View>
          {INCLUDES.map((item) => (
            <View key={item} style={styles.includeRow}>
              <Ionicons name="checkmark-circle" size={12} color={EXCEL_GREEN} />
              <Text style={styles.includeText}>{item}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          title="Export Report"
          icon="download-outline"
          onPress={() => run('main', range, format)}
          loading={running === 'main'}
          disabled={!!running}
          style={styles.exportButton}
        />

        {success ? (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={22} color={EXCEL_GREEN} />
            <View style={styles.flex}>
              <Text style={styles.successTitle}>Report exported successfully!</Text>
              <Text style={styles.successText}>Your report has been generated and is ready to download.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <Text style={styles.quickTitle}>Quick Download (Last 30 Days)</Text>
        <View style={styles.quickRow}>
          {FORMATS.map((f) => {
            const job: Job = `quick-${f.format}`;
            return (
              <Pressable
                key={f.format}
                onPress={() => run(job, last30Days(), f.format)}
                disabled={!!running}
                style={({ pressed }) => [
                  styles.quickButton,
                  { borderColor: f.color },
                  pressed && styles.quickPressed,
                  !!running && running !== job && styles.faded,
                ]}
                accessibilityRole="button"
              >
                {running === job ? (
                  <ActivityIndicator color={f.color} />
                ) : (
                  <>
                    <MaterialCommunityIcons name={f.icon} size={20} color={f.color} />
                    <Text style={[styles.quickText, { color: f.color }]}>Download {f.format}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
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
    </View>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Text style={styles.label}>
      {text}
      <Text style={styles.required}> *</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.textDark },
  subtext: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  label: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textDark, marginTop: 18, marginBottom: 8 },
  required: { color: '#C62828' },

  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formatTile: { height: 72 },
  tileActive: { backgroundColor: '#FBEFEF', borderWidth: 1.5, borderColor: colors.primary },
  tileLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDark, textAlign: 'center' },
  tileLabelActive: { fontFamily: fonts.semiBold, color: colors.primary },

  range: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDark },

  includes: {
    marginTop: 18,
    padding: 12,
    gap: 6,
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#F1DFA0',
    borderRadius: 12,
  },
  includesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  includesTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.textDark },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  includeText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDark },

  exportButton: { marginTop: 18 },

  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E6F6EC',
    borderWidth: 1,
    borderColor: '#BFE5CC',
    borderRadius: 10,
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 12, color: EXCEL_GREEN },
  successText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 1 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },

  quickTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.textDark, marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.card,
  },
  quickPressed: { backgroundColor: colors.background },
  quickText: { fontFamily: fonts.semiBold, fontSize: 13 },
  faded: { opacity: 0.5 },
});
