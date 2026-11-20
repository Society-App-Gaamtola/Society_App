import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { REPORT_MIME_TYPES, SOCIETY_NAME } from '../config';
import { t } from '../i18n';
import type { MyDonation, ReportFormat } from '../types';
import { formatDateTime } from '../utils/date';
import { formatINR } from '../utils/format';
import { logoDataUri } from './reportExport';

/** Who the receipt is for (the signed-in member) */
export type Donor = { name: string; memberId?: string };

/** Same numbering as the admin panel's receipts: DON001, DON042 … */
export const receiptNo = (id: string) => `DON${id.padStart(3, '0')}`;

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (logo: string | null, title: string, body: string) => `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, sans-serif; color: #2B1A12; margin: 0; padding: 28px; }
  .head { background: #7A1020; color: #fff; border-radius: 12px; padding: 18px; display: flex; align-items: center; gap: 14px; }
  .head img { width: 54px; height: 54px; border-radius: 27px; background: #fff; }
  .head h1 { margin: 0; font-size: 18px; } .head p { margin: 4px 0 0; color: #F5D58A; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
  td, th { padding: 9px 10px; border-bottom: 1px solid #EADFCF; text-align: left; }
  th { background: #FBF5EC; color: #7A1020; }
  .label { color: #7A6A5E; width: 38%; } .amount { font-size: 22px; font-weight: 700; color: #7A1020; }
  .right { text-align: right; } .foot { margin-top: 22px; font-size: 11px; color: #7A6A5E; text-align: center; }
</style></head>
<body>
  <div class="head">${logo ? `<img src="${logo}" />` : ''}<div><h1>${escape(SOCIETY_NAME)}</h1><p>${escape(title)}</p></div></div>
  ${body}
  <div class="foot">${escape(t('Generated on {date}', { date: formatDateTime(new Date()) }))}</div>
</body></html>`;

/** Saves the HTML as a PDF in the app's documents folder (named `name`.pdf) and returns its URI */
async function savePdf(html: string, name: string) {
  const { printToFileAsync } = await import('expo-print');
  const { uri } = await printToFileAsync({ html });
  const target = new File(Paths.document, `${name}.pdf`);
  if (target.exists) target.delete();
  await new File(uri).move(target);
  return target.uri;
}

/** The phone's share sheet for a file: WhatsApp, email, Drive, Save … */
export async function shareFile(uri: string, format: ReportFormat, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error(t('Sharing is not available on this device.'));
  await Sharing.shareAsync(uri, { mimeType: REPORT_MIME_TYPES[format], dialogTitle: title, UTI: format === 'PDF' ? 'com.adobe.pdf' : undefined });
}

/** One verified donation as a one-page receipt PDF; returns the file URI */
export async function donationReceiptPdf(donation: MyDonation, donor: Donor) {
  const no = receiptNo(donation.id);
  const rows: [string, string][] = [
    [t('Receipt No'), no],
    [t('Date'), formatDateTime(new Date(donation.date))],
    [t('Received from'), donor.name],
    [t('Member ID'), donor.memberId || '-'],
    [t('Purpose'), t(donation.title)],
    [t('Payment mode'), t(donation.method)],
    [t('Reference'), donation.reference ?? '-'],
    [t('Status'), t('Verified')],
  ];
  const body = `
    <p class="amount">${escape(formatINR(donation.amount))}</p>
    <table>${rows.map(([label, value]) => `<tr><td class="label">${escape(label)}</td><td>${escape(value)}</td></tr>`).join('')}</table>
    <p class="foot">${escape(t('Thank you for supporting the society.'))}</p>`;
  return savePdf(page(await logoDataUri(), t('Donation Receipt'), body), `Receipt_${no}`);
}

/** Every donation of the member as a summary sheet (PDF or Excel); returns the file URI */
export async function donationSummaryFile(donations: MyDonation[], donor: Donor, totals: { total: number; thisYear: number }, format: ReportFormat) {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `My_Donations_${stamp}`;
  const header = [t('Receipt No'), t('Date'), t('Purpose'), t('Payment mode'), t('Reference'), t('Amount'), t('Status')];
  const rows = donations.map((d) => [receiptNo(d.id), formatDateTime(new Date(d.date)), t(d.title), t(d.method), d.reference ?? '-', d.amount, t(d.status)]);

  if (format === 'Excel') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const info = [
      [SOCIETY_NAME],
      [t('My Donations')],
      [t('Member'), `${donor.name}${donor.memberId ? ` (${donor.memberId})` : ''}`],
      [t('Total Donated'), totals.total],
      [t('This Year'), totals.thisYear],
      [],
      header,
      ...rows,
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Donations');
    const target = new File(Paths.document, `${name}.xlsx`);
    if (target.exists) target.delete();
    target.write(XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string, { encoding: 'base64' });
    return target.uri;
  }

  const body = `
    <table>
      <tr><td class="label">${escape(t('Member'))}</td><td>${escape(donor.name)}${donor.memberId ? ` (${escape(donor.memberId)})` : ''}</td></tr>
      <tr><td class="label">${escape(t('Total Donated'))}</td><td><b>${escape(formatINR(totals.total))}</b></td></tr>
      <tr><td class="label">${escape(t('This Year'))}</td><td>${escape(formatINR(totals.thisYear))}</td></tr>
    </table>
    <table>
      <tr>${header.map((h, i) => `<th class="${i === 5 ? 'right' : ''}">${escape(h)}</th>`).join('')}</tr>
      ${rows
        .map((r) => `<tr>${r.map((c, i) => `<td class="${i === 5 ? 'right' : ''}">${escape(i === 5 ? formatINR(Number(c)) : String(c))}</td>`).join('')}</tr>`)
        .join('')}
    </table>
    <p class="foot">${escape(t('Totals count verified donations only.'))}</p>`;
  return savePdf(page(await logoDataUri(), t('Donation Summary'), body), name);
}
