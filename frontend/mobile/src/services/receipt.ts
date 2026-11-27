import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { REPORT_MIME_TYPES } from '../config';
import { getSocietyInfo } from './appInfo';
import { t } from '../i18n';
import type { MyDonation, ReportFormat } from '../types';
import { formatDateTime } from '../utils/date';
import { amountInWords, formatINR, formatRs } from '../utils/format';
import { logoDataUri, savePdf } from './reportExport';

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
  <div class="head">${logo ? `<img src="${logo}" />` : ''}<div><h1>${escape(getSocietyInfo().society_name)}</h1><p>${escape(title)}</p></div></div>
  ${body}
  <div class="foot">${escape(t('Generated on {date}', { date: formatDateTime(new Date()) }))}</div>
</body></html>`;

/** A4 in points (iOS prints Letter by default) */
const A4 = { width: 595, height: 842 };

/** The phone's share sheet for a file: WhatsApp, email, Drive, Save … */
export async function shareFile(uri: string, format: ReportFormat, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error(t('Sharing is not available on this device.'));
  await Sharing.shareAsync(uri, { mimeType: REPORT_MIME_TYPES[format], dialogTitle: title, UTI: format === 'PDF' ? 'com.adobe.pdf' : undefined });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "25 Oct 2026" and "Oct 25, 2026" (the receipt is in English, like the admin panel's) */
const longDay = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const shortDay = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
/** "+91 76007 60370 / +91 7600 767 475" (App Settings' phone) → both numbers */
const phonesOf = (phone?: string) =>
  (phone ?? '')
    .split(/[/,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

/** A long name on two lines: broken at the last space before the middle ("Shri Gamtoda / Yuvak Mitra Mandal") */
const twoLines = (text: string) => {
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index ?? 0);
  if (text.length < 20 || !spaces.length) return [text];
  const at = spaces.filter((i) => i <= text.length / 2).pop() ?? spaces[0];
  return [text.slice(0, at), text.slice(at + 1)];
};

/**
 * One verified donation as a one-page receipt PDF, in the client's receipt design (the same as the admin panel's:
 * society header with contact, greeting, receipt box, totals, amount in words, Payment Details, Note, footer).
 * Returns the file URI
 */
export async function donationReceiptPdf(donation: MyDonation, donor: Donor) {
  const no = receiptNo(donation.id);
  const info = getSocietyInfo();
  const name = escape(info.society_name);
  const phones = phonesOf(info.phone).map(escape);
  const address = escape(info.address ?? '');
  const day = new Date(donation.date);
  const mode = escape(donation.method === 'UPI App' || donation.method === 'QR Code' ? 'UPI' : donation.method);
  const isUpi = mode === 'UPI';
  const ref = donation.reference ? escape(donation.reference) : '';
  const amount = formatRs(donation.amount);
  const purpose = escape(donation.title);
  const donorName = escape(donor.name);
  const logo = await logoDataUri();

  const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  body { font-family: Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 22px 34px; font-size: 13px; }
  .band { height: 14px; background: #9E9E9E; }
  .head { display: flex; align-items: center; gap: 16px; padding: 16px 0 14px; border-bottom: 1px solid #DDD; }
  .head img { width: 96px; height: 96px; }
  .title { flex: 1; } .title h1 { margin: 0; font-size: 26px; line-height: 1.15; color: #7A1020; }
  .title p { margin: 4px 0 0; color: #787878; font-size: 13px; }
  .contact { text-align: right; color: #787878; font-size: 12px; line-height: 1.5; max-width: 260px; }
  .contact b { color: #333; }
  .greet { padding: 0 22px; } .greet p { margin: 12px 0 0; }
  .box { margin: 16px 8px 0; background: #F0F0EF; border: 1px solid #DEDEDE; border-radius: 10px; padding: 4px 22px; }
  .row { display: flex; justify-content: space-between; padding: 9px 0; }
  .row + .row { border-top: 1px dashed #CDCDCD; }
  .grey { color: #787878; } .ok { color: #16A34A; font-weight: bold; }
  .item { padding: 16px 22px 0; } .item .sub { color: #787878; font-size: 12px; margin-top: 3px; }
  .line { display: flex; justify-content: space-between; padding: 6px 0; }
  .dash { border-bottom: 1px dashed #CDCDCD; }
  .big { font-size: 18px; } .big b { font-size: 18px; }
  .words { color: #787878; font-style: italic; font-size: 12px; }
  .panel { background: #F0F0EF; margin: 16px -34px 0; padding: 8px 56px 12px; }
  .pill { display: inline-block; background: #D6D6D6; color: #fff; font-weight: bold; font-size: 11px; padding: 4px 12px; border-radius: 4px; margin: 6px 0 10px -22px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 8px; }
  .grid b { display: inline-block; width: 110px; }
  .note { color: #787878; font-size: 11.5px; line-height: 1.5; }
  .thanks { margin: 12px 8px 0; border: 1px dashed #BEBEBE; padding: 12px; text-align: center; }
  .foot { display: flex; justify-content: space-between; gap: 20px; margin-top: 14px; color: #787878; font-size: 11.5px; }
  .foot b { color: #333; font-size: 13px; }
</style></head>
<body>
  <div class="band"></div>
  <div class="head">
    ${logo ? `<img src="${logo}" />` : ''}
    <div class="title"><h1>${twoLines(info.society_name).map(escape).join('<br />')}</h1><p>Donation Receipt</p></div>
    ${phones.length || address ? `<div class="contact"><b>Contact</b><br />${phones.join('<br />')}${address ? `<br /><br />${address}` : ''}</div>` : ''}
  </div>
  <div class="greet">
    <p>Dear ${donorName} ,</p>
    <p>Thank you for supporting the society. Your donation has been received and the details are below.</p>
  </div>
  <div class="box">
    <div class="row"><b>${name}</b><span class="grey">Receipt No - ${no}</span></div>
    <div class="row"><span><b>Received From -</b> ${donorName}</span><span class="grey">Member ID - ${escape(donor.memberId || '-')}</span></div>
    <div class="row"><span><span class="grey">Date -</span> <b>${longDay(day)}</b></span><span><span class="grey">Status - </span>&nbsp;<span class="ok">Verified</span></span></div>
  </div>
  <div class="item">
    <div><b>Donation 1</b> - ${purpose}</div>
    <div class="sub">Payment Mode - ${mode}</div>
    ${ref ? `<div class="sub">Reference${isUpi ? ' (UTR)' : ''} - ${ref}</div>` : ''}
    <div class="line dash" style="margin-top: 8px"><span class="grey">${shortDay(day)}</span><span>${amount}</span></div>
    <div class="line">Total<span>${amount}</span></div>
    <div class="line" style="margin-top: 8px"><b>Sub Total</b><span>${amount}</span></div>
    <div class="line dash grey">Taxes and Fees<span>Rs. 0.00</span></div>
    <div class="line big">Grand Total<b>${amount}</b></div>
    <div class="line big">You Paid<b class="ok">${amount}</b></div>
    <div class="line big">Remaining Balance<b>Rs. 0.00</b></div>
    <div class="words">Amount in words: ${amountInWords(donation.amount)}</div>
  </div>
  <div class="panel">
    <div class="pill">Payment Details</div>
    <div class="grid">
      <div><b>Payment mode:</b> ${mode}</div><div><b>Reference:</b> ${ref || '-'}</div>
      <div><b>Purpose:</b> ${purpose}</div><div><b>Status:</b> Verified</div>
    </div>
    <div class="pill" style="margin-top: 12px">Note</div>
    <div class="note">This is a computer-generated donation receipt issued by ${name} against the amount received via ${mode}.
      Please quote the Receipt No.${isUpi ? ' and UTR reference' : ''} for any correspondence.${phones.length ? ` For queries, contact ${phones.join(' or ')}.` : ''}</div>
  </div>
  <div class="thanks">Thank you for supporting the society.</div>
  <div class="foot">
    <div><b>${name}</b>${address ? `<br />${address}` : ''}</div>
    ${phones.length ? `<div style="text-align: right; white-space: nowrap">Tel: ${phones.join(' / ')}</div>` : ''}
  </div>
</body></html>`;
  return savePdf(html, `Receipt_${no}`, A4);
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
  return savePdf(page(await logoDataUri(), t('Donation Summary'), body), name, A4);
}
