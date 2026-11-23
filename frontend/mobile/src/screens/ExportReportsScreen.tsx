import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { common, surface } from '../styles/common';
import { colors, fonts, tones, themedStyles } from '../theme';
import { REPORT_MIME_TYPES } from '../config';
import { saveReportRecord } from '../api/executive';
import { Ionicons, MaterialCommunityIcons, type McIconName } from '../icons';
import { makeReport, REPORT_API_TYPE } from '../services/reportExport';
import type { DateRange, ReportFormat, ReportType } from '../types';
import { formatRange, toIsoDay } from '../utils/date';
import { AppHeader, DateRangeButton, FieldLabel, OrDivider, PermissionGate, PrimaryButton } from '../components';
import DateRangeSheet from '../components/sheets/DateRangeSheet';
import { useT } from '../i18n';

/** This month, the default period */
export const thisMonth = (): DateRange => {
  const now = new Date();
  return { start: toIsoDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: toIsoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
};

const REPORT_TYPES: { type: ReportType; icon: McIconName }[] = [
  { type: 'Donation Summary', icon: 'chart-pie' },
  { type: 'Transaction History', icon: 'format-list-bulleted' },
  { type: 'Member-wise Report', icon: 'account-group-outline' },
  { type: 'Expense Report', icon: 'receipt' },
  { type: 'Income & Expense Summary', icon: 'scale-balance' },
];

const FORMATS: { format: ReportFormat; label: string; icon: McIconName; color: string }[] = [
  { format: 'PDF', label: 'PDF (Recommended)', icon: 'file-pdf-box', get color() { return tones.danger.text; } },
  { format: 'Excel', label: 'Excel (Editable)', icon: 'file-excel-box', color: tones.success.text },
];

/** What each report contains (the "Report Includes" box) */
const INCLUDES: Record<ReportType, string[]> = {
  'Donation Summary': ['Total donation amount and count', 'Category-wise breakdown', 'Payment method-wise summary', 'Monthly trend and charts'],
  'Transaction History': ['Total donation amount and count', 'Every donation with donor, mode and status'],
  'Member-wise Report': ['Total donation amount and count', 'Donations per member'],
  'Expense Report': ['Verified expense total and count', 'Category-wise spending', 'Payment mode summary', 'Every expense with its status'],
  'Income & Expense Summary': ['Income, expenses and balance', 'Income and expenses by category', 'Month by month totals', 'Entries waiting for verification'],
};

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
  const t = useT();
  const [type, setType] = useState<ReportType>('Donation Summary');
  const [range, setRange] = useState<DateRange>(thisMonth);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [running, setRunning] = useState<Job | null>(null);
  const [success, setSuccess] = useState(false);

  const run = async (job: Job, reportRange: DateRange, reportFormat: ReportFormat) => {
    if (running) return;
    setRunning(job);
    setSuccess(false);
    try {
      // Built on the phone from the server's entries for the period
      const { uri } = await makeReport(type, reportRange, reportFormat);
      // Listed under "Recent Reports" (here and in the admin panel); the file is built again when opened
      saveReportRecord({ report_type: REPORT_API_TYPE[type], from_date: reportRange.start, to_date: reportRange.end }).catch(() => {});
      setSuccess(true);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: REPORT_MIME_TYPES[reportFormat], dialogTitle: t(type) });
      }
    } catch (e) {
      Alert.alert(t('Export failed'), e instanceof Error ? e.message : t('Could not generate the report. Please try again.'));
    } finally {
      setRunning(null);
    }
  };

  return (
    <View style={common.screen}>
      <AppHeader leftType="back" rightIcons={['bell', 'avatar']} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={common.heading}>{t('Export Reports')}</Text>
        <Text style={common.subtext}>{t('Generate and export donation and expense reports.')}</Text>

        <FieldLabel text="Report Type" style={styles.label} />
        <View style={styles.typeTiles}>
          {REPORT_TYPES.map((r) => {
            const active = r.type === type;
            return (
              <Pressable
                key={r.type}
                onPress={() => setType(r.type)}
                style={[styles.tile, styles.typeTile, active && styles.tileActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons name={r.icon} size={24} color={active ? colors.primary : colors.mutedIcon} />
                <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{t(r.type)}</Text>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel text="Date Range" style={styles.label} />
        <DateRangeButton label={formatRange(range)} onPress={() => setRangeOpen(true)} />

        <FieldLabel text="Export Format" style={styles.label} />
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
                <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{t(f.label)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.includes}>
          <View style={styles.includesHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.includesTitle}>{t('Report Includes')}</Text>
          </View>
          {INCLUDES[type].map((item) => (
            <View key={item} style={styles.includeRow}>
              <Ionicons name="checkmark-circle" size={12} color={tones.success.text} />
              <Text style={styles.includeText}>{t(item)}</Text>
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
            <Ionicons name="checkmark-circle" size={22} color={tones.success.text} />
            <View style={common.flex}>
              <Text style={styles.successTitle}>{t('Report exported successfully!')}</Text>
              <Text style={styles.successText}>{t('Your report has been generated and is ready to download.')}</Text>
            </View>
          </View>
        ) : null}

        <OrDivider style={styles.or} />

        <Text style={styles.quickTitle}>{t('Quick Download (Last 30 Days)')}</Text>
        <Text style={styles.quickHint}>{t('The report type picked above, for the last 30 days.')}</Text>
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
                    <Text style={[styles.quickText, { color: f.color }]}>{t('Download {format}', { format: f.format })}</Text>
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
        defaultMonth={range.start}
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

const styles = themedStyles(() => ({
  scroll: { padding: 16, paddingBottom: 32 },

  label: { marginTop: 18, marginBottom: 8 },

  tiles: { flexDirection: 'row', gap: 10 },
  // Five report types: three per row
  typeTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeTile: { flexGrow: 1, flexBasis: '30%' },
  tile: {
    ...surface,
    flex: 1,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  formatTile: { height: 72 },
  tileActive: { backgroundColor: colors.softTint, borderWidth: 1.5, borderColor: colors.primary },
  tileLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDark, textAlign: 'center' },
  tileLabelActive: { fontFamily: fonts.semiBold, color: colors.primary },

  includes: {
    marginTop: 18,
    padding: 12,
    gap: 6,
    backgroundColor: colors.goldTint,
    borderWidth: 1,
    borderColor: colors.goldBorder,
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
    backgroundColor: tones.success.bg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 10,
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 12, color: tones.success.text },
  successText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 1 },

  or: { marginVertical: 18 },

  quickTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.textDark },
  quickHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2, marginBottom: 10 },
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
}));
