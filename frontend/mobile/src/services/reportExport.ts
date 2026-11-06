import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { LOGO, SOCIETY_NAME } from '../config';
import type { DateRange, Donation, ReportFormat, ReportType } from '../types';
import { MONTHS, formatDateTime, formatRange, isInRange } from '../utils/date';
import { formatINR } from '../utils/format';

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

const groupBy = (items: Donation[], key: (d: Donation) => string): Group[] => {
  const map = new Map<string, Group>();
  for (const d of items) {
    const label = key(d);
    const g = map.get(label) ?? { label, count: 0, amount: 0 };
    g.count += 1;
    g.amount += d.amount;
    map.set(label, g);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
};

export function buildReportData(donations: Donation[], type: ReportType, range: DateRange): ReportData {
  // Drafts are not real donations yet.
  const items = donations
    .filter((d) => d.status !== 'Draft')
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
  for (const g of byMonth) {
    const [y, m] = g.label.split('-').map(Number);
    g.label = `${MONTHS[m - 1]} ${y}`;
  }

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const groupTable = (title: string, rows: Group[]) =>
  rows.length
    ? `<h3>${title}</h3>
<table><tr><th>Name</th><th class="num">Entries</th><th class="num">Amount</th></tr>
${rows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td class="num">${r.count}</td><td class="num">${formatINR(r.amount)}</td></tr>`).join('')}
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

async function logoDataUri() {
  try {
    const asset = Asset.fromModule(LOGO);
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    return `data:image/png;base64,${await new File(asset.localUri).base64()}`;
  } catch {
    return null;
  }
}

function toHtml(data: ReportData, logo: string | null) {
  let body = '';
  if (data.type === 'Donation Summary') {
    body = groupTable('Category-wise Breakdown', data.byPurpose) + groupTable('Payment Method Summary', data.byMode) + trendBars(data.byMonth);
  } else if (data.type === 'Member-wise Report') {
    body = `<h3>Member-wise Donations</h3>
<table><tr><th>Member ID</th><th>Name</th><th class="num">Entries</th><th class="num">Amount</th></tr>
${data.byMember.map((m) => `<tr><td>${escapeHtml(m.memberId)}</td><td>${escapeHtml(m.label)}</td><td class="num">${m.count}</td><td class="num">${formatINR(m.amount)}</td></tr>`).join('')}
</table>`;
  } else {
    body = `<h3>Transactions</h3>
<table><tr><th>Date</th><th>Donor</th><th>Member ID</th><th>Mode</th><th>Status</th><th class="num">Amount</th></tr>
${data.transactions.map((d) => `<tr><td>${formatDateTime(new Date(d.date))}</td><td>${escapeHtml(d.donorName)}</td><td>${escapeHtml(d.memberId)}</td><td>${d.mode}</td><td>${d.status}</td><td class="num">${formatINR(d.amount)}</td></tr>`).join('')}
</table>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #2B1A12; padding: 24px; }
  header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #C9A24A; padding-bottom: 12px; }
  header img { width: 64px; height: 64px; }
  h1 { margin: 0; font-size: 20px; color: #7A1020; }
  h2 { margin: 2px 0 0; font-size: 14px; font-weight: normal; color: #7A6A5E; }
  h3 { color: #7A1020; font-size: 14px; margin: 22px 0 8px; }
  .meta { font-size: 12px; color: #7A6A5E; margin-top: 10px; }
  .totals { display: flex; gap: 12px; margin-top: 16px; }
  .total { flex: 1; border: 1px solid #EADFCF; border-radius: 8px; padding: 10px 12px; background: #FFF8EE; }
  .total b { display: block; font-size: 18px; color: #7A1020; }
  .total span { font-size: 11px; color: #7A6A5E; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #7A1020; color: #fff; text-align: left; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #EADFCF; }
  .num { text-align: right; }
  .bars { display: flex; align-items: flex-end; gap: 12px; height: 150px; }
  .bar { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #7A6A5E; }
  .fill { width: 28px; background: #8E1426; border-radius: 4px 4px 0 0; margin-bottom: 4px; }
  footer { margin-top: 28px; font-size: 10px; color: #7A6A5E; text-align: center; }
</style></head><body>
<header>
  ${logo ? `<img src="${logo}" />` : ''}
  <div><h1>${SOCIETY_NAME}</h1><h2>${data.type}</h2></div>
</header>
<div class="meta">Period: ${data.period} &nbsp;·&nbsp; Generated on ${data.generatedOn}</div>
<div class="totals">
  <div class="total"><b>${formatINR(data.totalAmount)}</b><span>Total Donations</span></div>
  <div class="total"><b>${data.totalCount}</b><span>Total Entries</span></div>
</div>
${data.totalCount ? body : '<p class="meta">No donations in this period.</p>'}
<footer>${SOCIETY_NAME} · Society Cultural Activity App</footer>
</body></html>`;
}

async function toWorkbookBase64(data: ReportData) {
  // Only loaded when someone exports to Excel: this library is large.
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summary: (string | number)[][] = [
    [SOCIETY_NAME],
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
      Date: formatDateTime(new Date(d.date)),
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

/** Generates the report file in the app's documents folder and returns its URI. */
export async function generateReportFile(data: ReportData, format: ReportFormat) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const baseName = `${fileSafe(data.type)}_${stamp}`;

  if (format === 'PDF') {
    const { printToFileAsync } = await import('expo-print');
    const { uri } = await printToFileAsync({ html: toHtml(data, await logoDataUri()) });
    const target = new File(Paths.document, `${baseName}.pdf`);
    await new File(uri).move(target);
    return target.uri;
  }

  const target = new File(Paths.document, `${baseName}.xlsx`);
  await target.write(await toWorkbookBase64(data), { encoding: 'base64' });
  return target.uri;
}
