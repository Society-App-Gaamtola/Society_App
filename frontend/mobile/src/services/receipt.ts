import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { REPORT_MIME_TYPES } from '../config';
import { getSocietyInfo } from './appInfo';
import { t } from '../i18n';
import type { MyDonation, ReportFormat } from '../types';
import { formatDateTime } from '../utils/date';
import { amountInWords, formatRs } from '../utils/format';
import { logoDataUri, savePdf } from './reportExport';
import { A4, amountLine, escapeHtml, longDay, pdfPage, queriesLine, shortDay, societyRow } from './pdfLayout';

/** Who the receipt is for (the signed-in member) */
export type Donor = { name: string; memberId?: string };

/** Same numbering as the admin panel's receipts: DON001, DON042 … */
export const receiptNo = (id: string) => `DON${id.padStart(3, '0')}`;

/** The phone's share sheet for a file: WhatsApp, email, Drive, Save … */
export async function shareFile(uri: string, format: ReportFormat, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error(t('Sharing is not available on this device.'));
  await Sharing.shareAsync(uri, { mimeType: REPORT_MIME_TYPES[format], dialogTitle: title, UTI: format === 'PDF' ? 'com.adobe.pdf' : undefined });
}

/** "UPI App" / "QR Code" → "UPI" (the receipt's payment mode) */
const modeOf = (method: string) => (method === 'UPI App' || method === 'QR Code' ? 'UPI' : method);

/**
 * One verified donation as a one-page receipt PDF, in the client's receipt design (the same as the admin panel's:
 * society header with contact, greeting, receipt box, totals, amount in words, Payment Details, Note, footer).
 * Returns the file URI
 */
export async function donationReceiptPdf(donation: MyDonation, donor: Donor) {
  const logo = await logoDataUri(); // first: it reloads App Settings' society details
  const no = receiptNo(donation.id);
  const name = escapeHtml(getSocietyInfo().society_name);
  const day = new Date(donation.date);
  const mode = escapeHtml(modeOf(donation.method));
  const isUpi = mode === 'UPI';
  const ref = donation.reference ? escapeHtml(donation.reference) : '';
  const amount = formatRs(donation.amount);
  const purpose = escapeHtml(donation.title);
  const donorName = escapeHtml(donor.name);

  const html = pdfPage({
    logo,
    title: 'Donation Receipt',
    greeting: [`Dear ${donorName} ,`, 'Thank you for supporting the society. Your donation has been received and the details are below.'],
    box: [
      societyRow('Receipt No', no),
      [`<b>Received From -</b> ${donorName}`, `<span class="grey">Member ID - ${escapeHtml(donor.memberId || '-')}</span>`],
      [`<span class="grey">Date -</span> <b>${longDay(day)}</b>`, `<span class="grey">Status - </span>&nbsp;<span class="ok">Verified</span>`],
    ],
    body: `<div class="item">
    <div><b>Donation 1</b> - ${purpose}</div>
    <div class="sub">Payment Mode - ${mode}</div>
    ${ref ? `<div class="sub">Reference${isUpi ? ' (UTR)' : ''} - ${ref}</div>` : ''}
    <div class="line dash grey" style="margin-top: 8px">${shortDay(day)}<span style="color: #333">${amount}</span></div>
    ${amountLine('Total', amount)}
    <div style="margin-top: 8px">${amountLine('Sub Total', amount, { bold: true })}</div>
    <div class="grey">${amountLine('Taxes and Fees', formatRs(0), { dash: true })}</div>
    ${amountLine('Grand Total', amount, { big: true })}
    ${amountLine('You Paid', amount, { big: true, tone: 'ok' })}
    ${amountLine('Remaining Balance', formatRs(0), { big: true })}
    <div class="words">Amount in words: ${amountInWords(donation.amount)}</div>
  </div>`,
    details: [
      ['Payment mode', mode],
      ['Reference', ref || '-'],
      ['Purpose', purpose],
      ['Status', 'Verified'],
    ],
    note:
      `This is a computer-generated donation receipt issued by ${name} against the amount received via ${mode}. ` +
      `Please quote the Receipt No.${isUpi ? ' and UTR reference' : ''} for any correspondence.${queriesLine()}`,
    thanks: 'Thank you for supporting the society.',
  });
  return savePdf(html, `Receipt_${no}`, A4);
}

/** Every donation of the member as a summary sheet (PDF or Excel); returns the file URI */
export async function donationSummaryFile(donations: MyDonation[], donor: Donor, totals: { total: number; thisYear: number }, format: ReportFormat) {
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `My_Donations_${stamp}`;

  if (format === 'Excel') {
    const header = [t('Receipt No'), t('Date'), t('Purpose'), t('Payment mode'), t('Reference'), t('Amount'), t('Status')];
    const rows = donations.map((d) => [receiptNo(d.id), formatDateTime(new Date(d.date)), t(d.title), t(d.method), d.reference ?? '-', d.amount, t(d.status)]);
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const info = [
      [getSocietyInfo().society_name],
      [t('My Donations')],
      [t('Member'), `${donor.name}${donor.memberId ? ` (${donor.memberId})` : ''}`],
      [t('Total Donated'), totals.total],
      [t('This Year'), totals.thisYear],
      [],
      header,
      ...rows,
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Donations');
    const target = new File(Paths.document, `${fileName}.xlsx`);
    if (target.exists) target.delete();
    target.write(XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string, { encoding: 'base64' });
    return target.uri;
  }

  // The PDF is in English, like the receipt: the receipt's design with one line per donation
  const logo = await logoDataUri(); // first: it reloads App Settings' society details
  const name = escapeHtml(getSocietyInfo().society_name);
  const donorName = escapeHtml(donor.name);
  const html = pdfPage({
    logo,
    title: 'Donation Summary',
    greeting: [`Dear ${donorName} ,`, 'Thank you for supporting the society. Here is a summary of your donations.'],
    box: [
      societyRow('Donations', String(donations.length)),
      [`<b>Member -</b> ${donorName}`, `<span class="grey">Member ID - ${escapeHtml(donor.memberId || '-')}</span>`],
      [`<span class="grey">Date -</span> <b>${longDay(new Date())}</b>`, `<span class="grey">This Year - </span>&nbsp;<b>${formatRs(totals.thisYear)}</b>`],
    ],
    body: `<div class="item">
    ${
      donations.length
        ? `<table>
      <tr><th>Receipt No</th><th>Date</th><th>Purpose</th><th>Payment Mode</th><th>Reference</th><th>Status</th><th class="num">Amount</th></tr>
      ${donations
        .map(
          (d) =>
            `<tr><td>${receiptNo(d.id)}</td><td>${longDay(new Date(d.date))}</td><td>${escapeHtml(d.title)}</td><td>${escapeHtml(modeOf(d.method))}</td>` +
            `<td>${escapeHtml(d.reference ?? '-')}</td><td>${escapeHtml(d.status)}</td><td class="num">${formatRs(d.amount)}</td></tr>`,
        )
        .join('')}
    </table>`
        : '<p class="empty">No donations yet.</p>'
    }
    ${amountLine('Total Donated', formatRs(totals.total), { big: true, tone: 'ok' })}
    ${amountLine('This Year', formatRs(totals.thisYear), { big: true })}
    <div class="words">Amount in words: ${amountInWords(totals.total)}</div>
  </div>`,
    note:
      `This is a computer-generated donation summary issued by ${name} on ${longDay(new Date())}. ` +
      `Totals count verified donations only; please quote the Receipt No. for any correspondence.${queriesLine()}`,
    thanks: 'Thank you for supporting the society.',
  });
  return savePdf(html, fileName, A4);
}
