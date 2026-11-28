import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { LOGO } from '../config';
import { getSocietyInfo, refreshAppInfo } from './appInfo';
import {
  getReportCategories,
  getReportDonations,
  getReportExpenses,
  getReportMonths,
  getReportTotals,
  toDonation,
  type ApiExpense,
  type ApiReportCategory,
  type ApiReportMonth,
  type ApiReportTotal,
} from '../api/executive';
import type { DateRange, Donation, ReportFormat, ReportType } from '../types';
import { MONTHS, formatDate, formatDateTime, formatRange, fromIsoDay, isInRange } from '../utils/date';
import { formatRs } from '../utils/format';
import { t } from '../i18n';
import { amountLine, escapeHtml, pdfPage, queriesLine, societyRow } from './pdfLayout';

type Group = { label: string; count: number; amount: number };

type ReportData = {
  type: ReportType;
  period: string;
  generatedOn: string;
  totalAmount: number;
  totalCount: number;
  byPurpose: Group[];
  byMode: Group[];
  byMonth: Group[];
  byMember: (Group & { memberId: string })[];
  transactions: Donation[];
};

/** "2026-11" → "Nov 2026" */
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

const groupBy = <T extends { amount: number }>(items: T[], key: (item: T) => string): Group[] => {
  const map = new Map<string, Group>();
  for (const item of items) {
    const label = key(item);
    const g = map.get(label) ?? { label, count: 0, amount: 0 };
    g.count += 1;
    g.amount += item.amount;
    map.set(label, g);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
};

export function buildReportData(donations: Donation[], type: ReportType, range: DateRange): ReportData {
  // Rejected entries were never received
  const items = donations
    .filter((d) => d.status !== 'Rejected')
    .filter((d) => isInRange(d.date, range))
    .sort((a, b) => a.date.localeCompare(b.date));

  const members = new Map<string, Group & { memberId: string }>();
  for (const d of items) {
    const m = members.get(d.memberId) ?? { memberId: d.memberId, label: d.donorName, count: 0, amount: 0 };
    m.count += 1;
    m.amount += d.amount;
    members.set(d.memberId, m);
  }

  const byMonth = groupBy(items, (d) => d.date.slice(0, 7)).sort((a, b) => a.label.localeCompare(b.label));
  for (const g of byMonth) g.label = monthLabel(g.label);

  return {
    type,
    period: formatRange(range),
    generatedOn: formatDateTime(new Date()),
    totalAmount: items.reduce((s, d) => s + d.amount, 0),
    totalCount: items.length,
    byPurpose: groupBy(items, (d) => d.purpose ?? 'Unspecified'),
    byMode: groupBy(items, (d) => d.mode),
    byMonth,
    byMember: [...members.values()].sort((a, b) => b.amount - a.amount),
    transactions: items,
  };
}

const groupTable = (title: string, rows: Group[]) =>
  rows.length
    ? `<h3>${title}</h3>
<table><tr><th>Name</th><th class="num">Entries</th><th class="num">Amount</th></tr>
${rows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td class="num">${r.count}</td><td class="num">${formatRs(r.amount)}</td></tr>`).join('')}
</table>`
    : '';

const trendBars = (rows: Group[]) => {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return rows.length
    ? `<h3>Monthly Trend</h3><div class="bars">${rows
        .map(
          (r) =>
            `<div class="bar"><div class="fill" style="height:${Math.round((r.amount / max) * 120)}px"></div><span>${r.label}</span></div>`,
        )
        .join('')}</div>`
    : '';
};

/** A logo link as a data URL (a PDF can't wait for a picture to load); null when it can't be read */
async function remoteImage(url: string) {
  try {
    // Cloudinary sends it as a small PNG, so the PDF stays small
    const small = url.includes('res.cloudinary.com/') && url.includes('/upload/') ? url.replace('/upload/', '/upload/f_png,c_limit,w_300/') : url;
    const res = await fetch(small);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Call first in every PDF: reloads the society details (name, address, phone, logo) from App Settings, so a change
 * in the panel shows in the next PDF, then returns the logo: App Settings' logo, else the app's own (offline too)
 */
export async function logoDataUri() {
  await refreshAppInfo();
  const url = getSocietyInfo().logo_url;
  const saved = url ? await remoteImage(url) : null;
  if (saved) return saved;
  try {
    const asset = Asset.fromModule(LOGO);
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    return `data:image/png;base64,${await new File(asset.localUri).base64()}`;
  } catch {
    return null;
  }
}

/**
 * The page every report shares, in the receipt design (pdfLayout): society header, a box with the report / period /
 * entries / date, the total lines, then the report's own tables and a Note
 */
function pageHtml({ type, period, generatedOn, entries, totals, body, note, logo }: {
  type: ReportType;
  period: string;
  generatedOn: string;
  entries: number;
  totals: [string, string][];
  body: string;
  note?: string;
  logo: string | null;
}) {
  const society = escapeHtml(getSocietyInfo().society_name);
  return pdfPage({
    logo,
    title: type,
    box: [
      societyRow('Report', type),
      [`<b>Period -</b> ${escapeHtml(period)}`, `<span class="grey">Entries - ${entries}</span>`],
      [`<span class="grey">Date -</span> <b>${escapeHtml(generatedOn)}</b>`, `<span class="grey">Format - PDF</span>`],
    ],
    body: `<div class="item">
  ${totals.map(([value, label], i) => amountLine(escapeHtml(label), escapeHtml(value), { big: true, tone: i === 0 ? 'ok' : '' })).join('')}
  ${body}
</div>`,
    note:
      `This is a computer-generated ${escapeHtml(type.toLowerCase())} issued by ${society} for ${escapeHtml(period)}. ` +
      `${note ?? 'Only verified entries are counted in the totals.'}${queriesLine()}`,
    thanks: 'Thank you for supporting the society.',
  });
}

function toHtml(data: ReportData, logo: string | null) {
  let body = '';
  if (data.type === 'Donation Summary') {
    body = groupTable('Category-wise Breakdown', data.byPurpose) + groupTable('Payment Method Summary', data.byMode) + trendBars(data.byMonth);
  } else if (data.type === 'Member-wise Report') {
    body = `<h3>Member-wise Donations</h3>
<table><tr><th>Member ID</th><th>Name</th><th class="num">Entries</th><th class="num">Amount</th></tr>
${data.byMember.map((m) => `<tr><td>${escapeHtml(m.memberId)}</td><td>${escapeHtml(m.label)}</td><td class="num">${m.count}</td><td class="num">${formatRs(m.amount)}</td></tr>`).join('')}
</table>`;
  } else {
    body = `<h3>Transactions</h3>
<table><tr><th>Date</th><th>Donor</th><th>Member ID</th><th>Mode</th><th>Status</th><th class="num">Amount</th></tr>
${data.transactions.map((d) => `<tr><td>${formatDate(fromIsoDay(d.date))}</td><td>${escapeHtml(d.donorName)}</td><td>${escapeHtml(d.memberId)}</td><td>${d.mode}</td><td>${d.status}</td><td class="num">${formatRs(d.amount)}</td></tr>`).join('')}
</table>`;
  }
  return pageHtml({
    type: data.type,
    period: data.period,
    generatedOn: data.generatedOn,
    entries: data.totalCount,
    totals: [[formatRs(data.totalAmount), 'Total Donations'], [String(data.totalCount), 'Total Entries']],
    note: 'Verified and pending donations are listed and counted; rejected ones are left out.',
    body: data.totalCount ? body : '<p class="empty">No donations in this period.</p>',
    logo,
  });
}

async function toWorkbookBase64(data: ReportData) {
  // Only loaded when someone exports to Excel: this library is large.
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summary: (string | number)[][] = [
    [getSocietyInfo().society_name],
    [data.type],
    ['Period', data.period],
    ['Generated on', data.generatedOn],
    [],
    ['Total amount (₹)', data.totalAmount],
    ['Total entries', data.totalCount],
    [],
    ['Category', 'Entries', 'Amount (₹)'],
    ...data.byPurpose.map((g) => [g.label, g.count, g.amount]),
    [],
    ['Payment method', 'Entries', 'Amount (₹)'],
    ...data.byMode.map((g) => [g.label, g.count, g.amount]),
    [],
    ['Month', 'Entries', 'Amount (₹)'],
    ...data.byMonth.map((g) => [g.label, g.count, g.amount]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  const transactions = XLSX.utils.json_to_sheet(
    data.transactions.map((d) => ({
      Date: formatDate(fromIsoDay(d.date)),
      Donor: d.donorName,
      'Member ID': d.memberId,
      Mode: d.mode,
      Purpose: d.purpose ?? '',
      Reference: d.reference ?? '',
      Status: d.status,
      'Amount (₹)': d.amount,
    })),
  );
  XLSX.utils.book_append_sheet(wb, transactions, 'Transactions');

  if (data.type === 'Member-wise Report') {
    const members = XLSX.utils.json_to_sheet(
      data.byMember.map((m) => ({ 'Member ID': m.memberId, Name: m.label, Entries: m.count, 'Amount (₹)': m.amount })),
    );
    XLSX.utils.book_append_sheet(wb, members, 'Members');
  }

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
}

const fileSafe = (s: string) => s.replace(/[^\w-]+/g, '_');

/**
 * Prints the HTML to a PDF and saves it in the app's documents folder as `name`.pdf; returns its URI for sharing.
 * The PDF comes back as base64 and is written here: the file expo-print saves itself sits outside the folders the app
 * may read in Expo Go, so moving or sharing that file is refused ("Missing 'READ' permission", "Not allowed to read
 * file under given URL"). size: the page in points (left out = the printer's default).
 */
export async function savePdf(html: string, name: string, size?: { width: number; height: number }) {
  const { printToFileAsync } = await import('expo-print');
  const { base64 } = await printToFileAsync({ html, base64: true, ...size });
  if (!base64) throw new Error(t('Please try again.'));
  const target = new File(Paths.document, `${name}.pdf`);
  if (target.exists) target.delete();
  await target.write(base64, { encoding: 'base64' });
  return target.uri;
}

/** Saves a report as PDF (from its HTML) or Excel (from its workbook) in the app's documents folder; returns the URI */
async function saveReportFile(
  type: ReportType,
  format: ReportFormat,
  html: (logo: string | null) => string,
  workbook: () => Promise<string>,
) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const baseName = `${fileSafe(type)}_${stamp}`;

  if (format === 'PDF') return savePdf(html(await logoDataUri()), baseName);

  const target = new File(Paths.document, `${baseName}.xlsx`);
  await target.write(await workbook(), { encoding: 'base64' });
  return target.uri;
}

/** Generates a donation report file and returns its URI. */
export const generateReportFile = (data: ReportData, format: ReportFormat) =>
  saveReportFile(data.type, format, (logo) => toHtml(data, logo), () => toWorkbookBase64(data));

// ---------- Expense Report (GET /admin/reports/data/expense) ----------

const MODE_LABEL: Record<ApiExpense['mode'], string> = { cash: 'Cash', upi: 'UPI', bank: 'Bank Transfer', cheque: 'Cheque' };
const STATUS_LABEL: Record<ApiExpense['status'], string> = { verified: 'Verified', pending: 'Pending', rejected: 'Rejected' };

async function makeExpenseReport(range: DateRange, format: ReportFormat) {
  const rows: ApiExpense[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await getReportExpenses(page, { from_date: range.start, to_date: range.end });
    rows.push(...data.rows);
    if (!data.pagination.has_more) break;
  }
  // Rejected bills were never paid; verified and pending are listed (only verified count in the totals)
  const items = rows.filter((e) => e.status !== 'rejected').sort((a, b) => a.txn_date.localeCompare(b.txn_date));
  const verified = items.filter((e) => e.status === 'verified');
  const pending = items.filter((e) => e.status === 'pending');
  const byCategory = groupBy(verified, (e) => e.category || 'Other');
  const byMode = groupBy(verified, (e) => MODE_LABEL[e.mode] ?? e.mode);
  const period = formatRange(range);
  const generatedOn = formatDateTime(new Date());
  const total = verified.reduce((s, e) => s + e.amount, 0);
  const type: ReportType = 'Expense Report';

  const html = (logo: string | null) =>
    pageHtml({
      type,
      period,
      generatedOn,
      entries: items.length,
      note: 'Only verified expenses are counted in the totals; pending ones are listed for reference.',
      totals: [
        [formatRs(total), 'Verified Expenses'],
        [String(verified.length), 'Verified Entries'],
        [String(pending.length), 'Pending Verification'],
      ],
      body: items.length
        ? groupTable('Category-wise Spending', byCategory) +
          groupTable('Payment Mode Summary', byMode) +
          `<h3>Expenses</h3>
<table><tr><th>Date</th><th>Description</th><th>Paid To</th><th>Category</th><th>Mode</th><th>Status</th><th class="num">Amount</th></tr>
${items.map((e) => `<tr><td>${formatDate(fromIsoDay(e.txn_date))}</td><td>${escapeHtml(e.description)}</td><td>${escapeHtml(e.paid_to ?? '')}</td><td>${escapeHtml(e.category ?? '')}</td><td>${MODE_LABEL[e.mode] ?? e.mode}</td><td>${STATUS_LABEL[e.status]}</td><td class="num">${formatRs(e.amount)}</td></tr>`).join('')}
</table>`
        : '<p class="empty">No expenses in this period.</p>',
      logo,
    });

  const workbook = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const summary: (string | number)[][] = [
      [getSocietyInfo().society_name],
      [type],
      ['Period', period],
      ['Generated on', generatedOn],
      [],
      ['Verified expenses (₹)', total],
      ['Verified entries', verified.length],
      ['Pending verification', pending.length],
      [],
      ['Category', 'Entries', 'Amount (₹)'],
      ...byCategory.map((g) => [g.label, g.count, g.amount]),
      [],
      ['Payment mode', 'Entries', 'Amount (₹)'],
      ...byMode.map((g) => [g.label, g.count, g.amount]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
    const list = XLSX.utils.json_to_sheet(
      items.map((e) => ({
        Date: formatDate(fromIsoDay(e.txn_date)),
        Description: e.description,
        'Paid To': e.paid_to ?? '',
        Category: e.category ?? '',
        Mode: MODE_LABEL[e.mode] ?? e.mode,
        Reference: e.reference_no ?? '',
        Status: STATUS_LABEL[e.status],
        'Amount (₹)': e.amount,
      })),
    );
    XLSX.utils.book_append_sheet(wb, list, 'Expenses');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
  };

  return { uri: await saveReportFile(type, format, html, workbook), period };
}

// ---------- Income & Expense Summary (GET /admin/reports/data/summary, category, monthly) ----------

async function makeIncomeExpenseSummary(range: DateRange, format: ReportFormat) {
  const filters = { from_date: range.start, to_date: range.end };
  const [totalsRes, categoriesRes, monthsRes] = await Promise.all([getReportTotals(filters), getReportCategories(filters), getReportMonths(filters)]);
  const total = (item: ApiReportTotal['item']) => totalsRes.data.rows.find((r) => r.item === item)?.value ?? 0;
  const categories = (kind: ApiReportCategory['kind']): Group[] =>
    categoriesRes.data.rows.filter((r) => r.kind === kind).map((r) => ({ label: r.category || 'Other', count: Number(r.entries), amount: r.amount }));
  const months: ApiReportMonth[] = monthsRes.data.rows;
  const income = categories('donation');
  const spending = categories('expense');
  const period = formatRange(range);
  const generatedOn = formatDateTime(new Date());
  const type: ReportType = 'Income & Expense Summary';

  const html = (logo: string | null) =>
    pageHtml({
      type,
      period,
      generatedOn,
      entries: income.reduce((n, g) => n + g.count, 0) + spending.reduce((n, g) => n + g.count, 0),
      totals: [
        [formatRs(total('total_donations')), 'Income (Donations)'],
        [formatRs(total('total_expenses')), 'Expenses'],
        [formatRs(total('balance')), 'Balance'],
      ],
      body:
        groupTable('Income by Category', income) +
        groupTable('Expenses by Category', spending) +
        (months.length
          ? `<h3>Month by Month</h3>
<table><tr><th>Month</th><th class="num">Income</th><th class="num">Expenses</th><th class="num">Balance</th></tr>
${months.map((m) => `<tr><td>${monthLabel(m.month)}</td><td class="num">${formatRs(m.donations)}</td><td class="num">${formatRs(m.expenses)}</td><td class="num">${formatRs(m.balance)}</td></tr>`).join('')}
</table>`
          : ''),
      note: `Only verified entries are counted. Waiting for verification: ${total('pending_donations')} donations, ${total('pending_expenses')} expenses.`,
      logo,
    });

  const workbook = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const summary: (string | number)[][] = [
      [getSocietyInfo().society_name],
      [type],
      ['Period', period],
      ['Generated on', generatedOn],
      [],
      ['Income (donations, ₹)', total('total_donations')],
      ['Expenses (₹)', total('total_expenses')],
      ['Balance (₹)', total('balance')],
      ['Pending donations', total('pending_donations')],
      ['Pending expenses', total('pending_expenses')],
      [],
      ['Income category', 'Entries', 'Amount (₹)'],
      ...income.map((g) => [g.label, g.count, g.amount]),
      [],
      ['Expense category', 'Entries', 'Amount (₹)'],
      ...spending.map((g) => [g.label, g.count, g.amount]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
    const monthly = XLSX.utils.json_to_sheet(
      months.map((m) => ({ Month: monthLabel(m.month), 'Income (₹)': m.donations, 'Expenses (₹)': m.expenses, 'Balance (₹)': m.balance })),
    );
    XLSX.utils.book_append_sheet(wb, monthly, 'Monthly');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
  };

  return { uri: await saveReportFile(type, format, html, workbook), period };
}

/** The app's report types as the saved-report history (generated_reports.report_type) names them */
export const REPORT_API_TYPE: Record<ReportType, string> = {
  'Donation Summary': 'category',
  'Transaction History': 'donation',
  'Member-wise Report': 'custom',
  'Expense Report': 'expense',
  'Income & Expense Summary': 'summary',
};
/** A saved report's type in the app (a monthly report from the panel opens as the Income & Expense Summary) */
export const reportTypeOf = (apiType: string): ReportType =>
  apiType === 'monthly'
    ? 'Income & Expense Summary'
    : ((Object.keys(REPORT_API_TYPE) as ReportType[]).find((type) => REPORT_API_TYPE[type] === apiType) ?? 'Donation Summary');

/**
 * Builds a donation report for the period from the server's rows (GET /admin/reports/data/donation, page by page:
 * verified and pending entries; rejected ones are left out) and saves the file on the phone. Returns its URI.
 */
export async function makeDonationReport(type: ReportType, range: DateRange, format: ReportFormat) {
  const donations: Donation[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await getReportDonations(page, { from_date: range.start, to_date: range.end });
    donations.push(...data.rows.map(toDonation));
    if (!data.pagination.has_more) break;
  }
  const data = buildReportData(donations, type, range);
  return { uri: await generateReportFile(data, format), period: data.period };
}

/** Any report type for the period, saved on the phone (Export Reports, Recent Reports, Quick Download) */
export function makeReport(type: ReportType, range: DateRange, format: ReportFormat) {
  if (type === 'Expense Report') return makeExpenseReport(range, format);
  if (type === 'Income & Expense Summary') return makeIncomeExpenseSummary(range, format);
  return makeDonationReport(type, range, format);
}
