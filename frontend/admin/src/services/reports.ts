import { exportExcel, type ExportTable } from '@/lib/exporters';
import { formatDate, formatNumber, monthName, nowLocal, periodLabel, recordNo } from '@/lib/utils';
import type { NewRecord, Report, ReportType } from '@/types';
import { createResource } from './core/resource';
import { inRange, loadFinanceRows, summarize, toTransactions } from './finance';

const resource = createResource<Report>('reports', 'report', (r) => r.title);

export const REPORT_TYPES: { type: ReportType; label: string; hint: string }[] = [
  { type: 'summary', label: 'Summary Report', hint: 'Overview of income, expenses and balance' },
  { type: 'donation', label: 'Donation Report', hint: 'All donation entries' },
  { type: 'expense', label: 'Expense Report', hint: 'All expense entries' },
  { type: 'category', label: 'Category Wise Report', hint: 'Breakdown by category' },
  { type: 'monthly', label: 'Monthly Report', hint: 'Month wise summary' },
  { type: 'custom', label: 'Custom Report', hint: 'All transactions, filtered' },
];

export type ReportInput = Pick<Report, 'type' | 'from' | 'to' | 'category' | 'mode'>;

const labelOf = (type: ReportType) => REPORT_TYPES.find((t) => t.type === type)?.label ?? 'Report';
const money = (amount: number) => formatNumber(amount);

/** Builds the table for a report from the current data. Category and mode filters narrow the entries. */
export async function buildReportTable({ type, from, to, category, mode }: ReportInput): Promise<ExportTable> {
  const range = { from: from ?? undefined, to: to ?? undefined };
  const all = await loadFinanceRows();
  const keep = <T extends { date: string; mode: string }>(row: T, cat: string) =>
    inRange(row.date, range) && (!category || cat === category) && (!mode || row.mode === mode);
  const donations = all.donations.filter((d) => keep(d, d.purpose));
  const expenses = all.expenses.filter((e) => keep(e, e.category));
  const verifiedD = donations.filter((d) => d.status === 'Verified');
  const verifiedE = expenses.filter((e) => e.status === 'Verified');
  const filters = [category && `Category: ${category}`, mode && `Mode: ${mode}`].filter(Boolean).join(' · ');
  const subtitle = [periodLabel(from, to), filters].filter(Boolean).join(' · ');
  const title = labelOf(type);

  switch (type) {
    case 'summary': {
      const s = summarize(donations, expenses, range);
      return {
        title,
        subtitle,
        columns: ['Item', 'Value'],
        rows: [
          ['Total donations (verified)', money(s.totalDonations)],
          ['Total expenses (verified)', money(s.totalExpenses)],
          ['Balance', money(s.balance)],
          ['Verified transactions', s.transactions],
          ['Pending donations', donations.filter((d) => d.status === 'Pending').length],
          ['Pending expenses', expenses.filter((e) => e.status === 'Pending').length],
        ],
      };
    }
    case 'donation':
      return {
        title,
        subtitle,
        columns: ['Receipt No', 'Date', 'Donor', 'Member ID', 'Purpose', 'Mode', 'Reference', 'Status', 'Amount'],
        rows: donations.map((d) => [recordNo('DON', d.id), formatDate(d.date), d.donorName, d.memberId, d.purpose, d.mode, d.reference, d.status, money(d.amount)]),
      };
    case 'expense':
      return {
        title,
        subtitle,
        columns: ['Expense No', 'Date', 'Description', 'Vendor', 'Category', 'Mode', 'Status', 'Amount'],
        rows: expenses.map((e) => [recordNo('EXP', e.id), formatDate(e.date), e.description, e.vendor, e.category, e.mode, e.status, money(e.amount)]),
      };
    case 'category': {
      const groups = new Map<string, { kind: string; count: number; amount: number }>();
      const add = (kind: string, name: string, amount: number) => {
        const key = `${kind}:${name}`;
        const g = groups.get(key) ?? { kind, count: 0, amount: 0 };
        groups.set(key, { kind, count: g.count + 1, amount: g.amount + amount });
      };
      verifiedD.forEach((d) => add('Donation', d.purpose, d.amount));
      verifiedE.forEach((e) => add('Expense', e.category, e.amount));
      return {
        title,
        subtitle,
        columns: ['Type', 'Category', 'Entries', 'Amount'],
        rows: [...groups.entries()].map(([key, g]) => [g.kind, key.split(':')[1], g.count, money(g.amount)]),
      };
    }
    case 'monthly': {
      const months = new Map<string, { d: number; e: number }>();
      const add = (date: string, field: 'd' | 'e', amount: number) => {
        const key = date.slice(0, 7);
        const m = months.get(key) ?? { d: 0, e: 0 };
        months.set(key, { ...m, [field]: m[field] + amount });
      };
      verifiedD.forEach((d) => add(d.date, 'd', d.amount));
      verifiedE.forEach((e) => add(e.date, 'e', e.amount));
      return {
        title,
        subtitle,
        columns: ['Month', 'Donations', 'Expenses', 'Balance'],
        rows: [...months.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, m]) => [`${monthName(Number(key.slice(5)) - 1)} ${key.slice(0, 4)}`, money(m.d), money(m.e), money(m.d - m.e)]),
      };
    }
    case 'custom':
      return {
        title,
        subtitle,
        columns: ['Date', 'Type', 'Description', 'Category', 'Mode', 'Status', 'Amount'],
        rows: toTransactions(donations, expenses).map((t) => [formatDate(t.date), t.kind, t.description, t.category, t.mode, t.status, money(t.amount)]),
      };
  }
}

const fileNameOf = (input: ReportInput) =>
  `${labelOf(input.type).replace(/\s+/g, '-')}-${input.from || input.to ? `${input.from ?? 'start'}-${input.to ?? 'today'}` : 'all-time'}`;

export const reportsService = {
  ...resource,
  /** Builds the file, downloads it and keeps a record so it can be downloaded again later. */
  async generateReport(input: ReportInput) {
    await exportExcel(await buildReportTable(input), fileNameOf(input));
    const body: NewRecord<Report> = {
      ...input,
      title: labelOf(input.type),
      period: periodLabel(input.from, input.to),
      generatedOn: nowLocal(),
    };
    return resource.create(body);
  },
  /** Rebuilds the file from today's data with the saved settings. */
  downloadReport: async (report: Report) => exportExcel(await buildReportTable(report), fileNameOf(report)),
};
