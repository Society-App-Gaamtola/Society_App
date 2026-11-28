import type { jsPDF as JsPdf } from 'jspdf';
import { amountInWords, formatDate, formatDateTime, monthName, nowLocal, recordNo } from './utils';

/** One table to export: the same shape for Excel and PDF, on every screen */
export type ExportTable = { title: string; subtitle?: string; columns: string[]; rows: (string | number)[][] };
export type ExportFormat = 'excel' | 'pdf';

const DEFAULT_SOCIETY = 'Shri Gamtola Yuvak Mitra Mandal';

/** The society on a PDF: App Settings' name, phone(s), address and logo */
export type ReceiptSociety = { name?: string | null; phone?: string | null; address?: string | null; logoUrl?: string | null };

/** The society on every PDF (header, contact, footer): App Settings, set by AdminShell once the settings load */
let currentSociety: ReceiptSociety = {};
export function setSociety(society: ReceiptSociety) {
  currentSociety = society;
}
/** A receipt's own society details, else App Settings' (AdminShell) */
const societyOf = (society: ReceiptSociety = {}): ReceiptSociety => ({
  name: society.name?.trim() || currentSociety.name?.trim() || DEFAULT_SOCIETY,
  phone: society.phone ?? currentSociety.phone,
  address: society.address ?? currentSociety.address,
  logoUrl: society.logoUrl ?? currentSociety.logoUrl,
});

type Rgb = [number, number, number];
const MAROON: Rgb = [122, 16, 32];
const DARK: Rgb = [51, 51, 51];
const GREY: Rgb = [120, 120, 120];
const LINE: Rgb = [205, 205, 205];
const PANEL: Rgb = [240, 240, 239];
const STATUS_COLOR: Record<'ok' | 'wait' | 'no', Rgb> = { ok: [22, 163, 74], wait: [217, 119, 6], no: [198, 40, 40] };
/** More columns than this → the PDF page is turned sideways */
const PDF_PORTRAIT_MAX_COLUMNS = 6;
/** Room kept at the bottom of every page for the footer (society, address, telephone, page number) */
const FOOTER_SPACE = 26;

/** Excel file. The library is heavy, so it loads on the first export only. */
export async function exportExcel({ title, subtitle, columns, rows }: ExportTable, fileName: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([[title], ...(subtitle ? [[subtitle]] : []), [], columns, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${fileName}.xlsx`);
}

// ---------- The client's receipt design (2026-11-23), shared by every PDF ----------

/** jsPDF's built-in font has no ₹ sign: "Rs. 1,001.00" */
const rs = (amount: number) => `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** "2026-10-25" → "Oct 25, 2026" (the item line) */
const shortDay = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return `${monthName(m - 1)} ${d}, ${y}`;
};
/** "+91 76007 60370 / +91 7600 767 475" → both numbers */
const phonesOf = (phone?: string | null) =>
  (phone ?? '')
    .split(/[/,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

/** An image redrawn at most LOGO_PX wide (a full-size logo would make every PDF megabytes); as it is without a canvas */
const LOGO_PX = 300;
async function shrinkImage(data: string) {
  if (typeof document === 'undefined') return data;
  const img = new Image();
  img.src = data;
  await img.decode();
  const scale = Math.min(1, LOGO_PX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** The logo as a data URL for jsPDF (App Settings' logo, else the panel's own); null when it can't be loaded */
async function logoData(url?: string | null) {
  for (const src of [url, '/logo.png']) {
    if (!src) continue;
    try {
      const blob = await (await fetch(src)).blob();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return await shrinkImage(data);
    } catch {
      // try the next one
    }
  }
  return null;
}

/** A long name on two lines: broken at the last space before the middle ("Shri Gamtoda / Yuvak Mitra Mandal") */
const twoLines = (text: string) => {
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index ?? 0);
  if (!spaces.length) return [text];
  const at = spaces.filter((i) => i <= text.length / 2).pop() ?? spaces[0];
  return [text.slice(0, at), text.slice(at + 1)];
};

type TextStyle = { size?: number; color?: Rgb; style?: string; align?: 'left' | 'right' | 'center' };

type Tone = 'ok' | 'wait' | 'no';
/** The receipt's grey box: number, party, id, date and status (each "label - value") */
type InfoBox = { noLabel: string; no: string; partyLabel: string; party: string; idLabel: string; idValue: string; date: string; status: string; tone: Tone };

/** Drawing helpers on one jsPDF page set (portrait or landscape: W / H are the page size) */
function pdfKit(doc: JsPdf, society: ReceiptSociety) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const name = society.name || DEFAULT_SOCIETY;
  const phones = phonesOf(society.phone);
  const address = society.address?.trim() ?? '';

  const write = (value: string | string[], x: number, y: number, { size = 10, color = DARK, style = 'normal', align = 'left' }: TextStyle = {}) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  };
  const width = (value: string, size: number, style = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    return doc.getTextWidth(value);
  };
  const wrap = (value: string, size: number, maxWidth: number, style = 'normal'): string[] => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    return doc.splitTextToSize(value, maxWidth);
  };
  const dashed = (y: number, from = 20, to = W - 20) => {
    doc.setDrawColor(...LINE);
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.line(from, y, to, y);
    doc.setLineDashPattern([], 0);
  };
  /** The grey band at the top of every page */
  const band = () => {
    doc.setFillColor(158, 158, 158);
    doc.rect(10, 8, W - 20, 5, 'F');
  };
  /** A small grey label on a panel ("Payment Details", "Note") */
  const pill = (label: string, at: number) => {
    doc.setFillColor(214, 214, 214);
    doc.roundedRect(14, at, width(label, 8, 'bold') + 10, 7, 1.5, 1.5, 'F');
    write(label, 19, at + 4.8, { size: 8, style: 'bold', color: [255, 255, 255] });
  };

  /** Band, logo, society name (maroon, two lines when long) + the title, contact on the right, a line. Returns its bottom */
  const header = (title: string, logo: string | null) => {
    band();
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 14, 18, 28, 28, undefined, 'FAST');
      } catch {
        // a logo jsPDF can't read: the PDF is still made
      }
    }
    const nameLines = width(name, 17, 'bold') > 74 ? twoLines(name) : [name];
    nameLines.forEach((line, i) => write(line, 46, 27 + i * 7, { size: 17, style: 'bold', color: MAROON }));
    const titleY = 27 + (nameLines.length - 1) * 7 + 6;
    write(title, 46, titleY, { size: 9.5, color: GREY });

    let right = 22;
    if (phones.length || address) {
      write('Contact', W - 14, right, { size: 9, style: 'bold', align: 'right' });
      for (const phone of phones) write(phone, W - 14, (right += 4.5), { size: 9, color: GREY, align: 'right' });
      right += 2;
      for (const line of address ? wrap(address, 8.5, 72) : []) write(line, W - 14, (right += 4.2), { size: 8.5, color: GREY, align: 'right' });
    }
    const y = Math.max(titleY + 6, 50, right + 5);
    doc.setDrawColor(220, 220, 220);
    doc.line(10, y, W - 10, y);
    return y;
  };

  /** The grey box (society / number, party / id, date / status). Returns its bottom */
  const infoBox = (top: number, b: InfoBox) => {
    doc.setFillColor(...PANEL);
    doc.setDrawColor(222, 222, 222);
    doc.roundedRect(14, top, W - 28, 36, 3, 3, 'FD');
    write(name, 20, top + 8.5, { size: 10, style: 'bold' });
    write(`${b.noLabel} - ${b.no}`, W - 20, top + 8.5, { size: 10, color: GREY, align: 'right' });
    dashed(top + 12.5);
    const partyLabel = `${b.partyLabel} -`;
    const idText = `${b.idLabel} - ${b.idValue}`;
    // A long party (an event title) is cut to the room left of the id
    const room = W - 46 - width(partyLabel, 10, 'bold') - width(idText, 10);
    const party = wrap(b.party, 10, Math.max(room, 30));
    write(partyLabel, 20, top + 20.5, { size: 10, style: 'bold' });
    write(party.length > 1 ? `${party[0]}…` : party[0] ?? '', 21.5 + width(partyLabel, 10, 'bold'), top + 20.5, { size: 10 });
    write(idText, W - 20, top + 20.5, { size: 10, color: GREY, align: 'right' });
    dashed(top + 24.5);
    write('Date - ', 20, top + 31.5, { size: 10, color: GREY });
    write(b.date, 20 + width('Date - ', 10), top + 31.5, { size: 10, style: 'bold' });
    write(b.status, W - 20, top + 31.5, { size: 10, style: 'bold', color: STATUS_COLOR[b.tone], align: 'right' });
    write('Status - ', W - 22 - width(b.status, 10, 'bold'), top + 31.5, { size: 10, color: GREY, align: 'right' });
    return top + 36;
  };

  /** y, or the top of a new page (with the grey band) when `need` mm don't fit above the footer */
  const ensure = (y: number, need: number) => {
    if (y + need <= H - FOOTER_SPACE) return y;
    doc.addPage();
    band();
    return 22;
  };

  /** The grey Note panel and the dotted line under it. Returns its bottom */
  const notePanel = (top: number, noteText: string, thanks: string, details: [string, string][] = [], detailsLabel = 'Payment Details') => {
    const note = wrap(noteText, 8.5, W - 38);
    const noteTop = details.length ? top + 12 + Math.ceil(details.length / 2) * 7.5 + 2 : top + 3;
    const bandEnd = noteTop + 10 + note.length * 4.2;
    doc.setFillColor(...PANEL);
    doc.rect(10, top, W - 20, bandEnd - top, 'F');
    if (details.length) {
      pill(detailsLabel, top + 3);
      details.forEach(([label, value], i) => {
        const x = i % 2 ? W / 2 + 5 : 20;
        const at = top + 16 + Math.floor(i / 2) * 7.5;
        const fit = wrap(value || '-', 9.5, W / 2 - 40);
        write(`${label}:`, x, at, { size: 9.5, style: 'bold' });
        write(fit.length > 1 ? `${fit[0]}…` : fit[0], x + 27, at, { size: 9.5 });
      });
    }
    pill('Note', noteTop);
    write(note, 20, noteTop + 11, { size: 8.5, color: GREY });

    const y = bandEnd + 5;
    doc.setDrawColor(190, 190, 190);
    doc.setLineDashPattern([0.6, 0.8], 0);
    doc.rect(16, y, W - 32, 10);
    doc.setLineDashPattern([], 0);
    write(thanks, W / 2, y + 6.5, { size: 10, align: 'center' });
    return y + 10;
  };

  /** Society and address on the left, telephone (and the page number) on the right, at the bottom of the page */
  const footer = (at = H - 20, pageText?: string) => {
    write(name, 10, at, { size: 10, style: 'bold' });
    if (pageText) write(pageText, W - 10, at, { size: 8.5, color: GREY, align: 'right' });
    if (address) write(wrap(address, 8.5, W / 2), 10, at + 4.5, { size: 8.5, color: GREY });
    if (phones.length) write(`Tel: ${phones.join(' / ')}`, W - 10, at + 4.5, { size: 8.5, color: GREY, align: 'right' });
  };

  return { doc, W, H, name, phones, write, width, wrap, dashed, band, header, infoBox, ensure, notePanel, footer };
}

/**
 * Every table export as a PDF in the receipt design: grey band, logo + society name + the report's title, contact,
 * a box with the society / report / filters / record count / export date, then the table. Long tables continue on new
 * pages (grey band, column header repeated); the Note panel ends the report, and every page has the society footer
 * and "Page x of y". Built in the browser (no server work).
 * jsPDF's built-in font has no ₹ sign, so pass amounts as plain numbers (formatNumber).
 */
export async function exportPdf({ title, subtitle, columns, rows }: ExportTable, fileName: string) {
  const society = societyOf();
  const [{ jsPDF }, { autoTable }, logo] = await Promise.all([import('jspdf'), import('jspdf-autotable'), logoData(society.logoUrl)]);
  const doc = new jsPDF({ orientation: columns.length > PDF_PORTRAIT_MAX_COLUMNS ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const k = pdfKit(doc, society);
  const { W, H, write, width, wrap, dashed } = k;
  const exported = formatDateTime(nowLocal());

  let y = k.header(title, logo) + 8;

  // Box: society / report, filters / records, date / pages (filled in at the end)
  const filtersLabel = 'Filters -';
  const filters = wrap(subtitle || 'All records', 10, W - 100 - width(filtersLabel, 10, 'bold'));
  const boxTop = y;
  const boxHeight = 30 + filters.length * 4.6;
  doc.setFillColor(...PANEL);
  doc.setDrawColor(222, 222, 222);
  doc.roundedRect(14, boxTop, W - 28, boxHeight, 3, 3, 'FD');
  write(k.name, 20, boxTop + 8.5, { size: 10, style: 'bold' });
  write(`Report - ${title}`, W - 20, boxTop + 8.5, { size: 10, color: GREY, align: 'right' });
  dashed(boxTop + 12.5);
  write(filtersLabel, 20, boxTop + 20.5, { size: 10, style: 'bold' });
  write(filters, 21.5 + width(filtersLabel, 10, 'bold'), boxTop + 20.5, { size: 10 });
  write(`Records - ${rows.length}`, W - 20, boxTop + 20.5, { size: 10, color: GREY, align: 'right' });
  const dateRow = boxTop + 20.5 + filters.length * 4.6 + 6.5;
  dashed(dateRow - 6.5);
  write('Date - ', 20, dateRow, { size: 10, color: GREY });
  write(exported, 20 + width('Date - ', 10), dateRow, { size: 10, style: 'bold' });
  y = boxTop + boxHeight + 8;

  autoTable(doc, {
    head: [columns],
    body: rows.map((row) => row.map((cell) => String(cell ?? ''))),
    startY: y,
    theme: 'plain',
    margin: { top: 20, left: 14, right: 14, bottom: FOOTER_SPACE },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, textColor: DARK, lineColor: LINE, lineWidth: { bottom: 0.15 } },
    headStyles: { fillColor: PANEL, textColor: DARK, fontStyle: 'bold', lineWidth: { bottom: 0.3 } },
    // Every page after the first starts with the grey band
    didDrawPage: (data) => {
      if (data.pageNumber > 1) k.band();
    },
  });

  // Note panel after the table (on a new page when it doesn't fit)
  const tableEnd = (doc as JsPdf & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  let noteTop = tableEnd + 8;
  if (noteTop + 40 > H - FOOTER_SPACE) {
    doc.addPage();
    k.band();
    noteTop = 22;
  }
  k.notePanel(
    noteTop,
    `This is a computer-generated report issued by ${k.name} on ${exported}. It lists the ${rows.length} record${rows.length === 1 ? '' : 's'} ` +
      `that matched the filters above when it was exported.${k.phones.length ? ` For queries, contact ${k.phones.join(' or ')}.` : ''}`,
    'End of report',
  );

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    k.footer(H - 20, `Page ${page} of ${pages}`);
  }
  doc.setPage(1);
  write(`Pages - ${pages}`, W - 20, dateRow, { size: 10, color: GREY, align: 'right' });
  doc.save(`${fileName}.pdf`);
}

/** The one export function every screen calls: the same table, as Excel or PDF */
export const exportTable = (table: ExportTable, fileName: string, format: ExportFormat) =>
  format === 'pdf' ? exportPdf(table, fileName) : exportExcel(table, fileName);

// ---------- Donation receipt and expense voucher ----------

/** What a donation receipt needs (services/finance Donation fits) */
export type ReceiptDonation = {
  id: number;
  donor_name: string;
  member_code: string | null;
  amount: number;
  donated_on: string;
  method: string;
  reference_no: string | null;
  purpose: string | null;
  status: string;
};

/** What an expense voucher needs (services/finance Expense fits) */
export type ReceiptExpense = {
  id: number;
  description: string;
  paid_to: string | null;
  category: string | null;
  amount: number;
  mode: string;
  reference_no: string | null;
  txn_date: string;
  status: string;
};

type ReceiptLayout = InfoBox & {
  society: ReceiptSociety;
  title: string;
  fileName: string;
  greeting: string | null;
  intro: string;
  item: { heading: string; what: string; lines: string[]; day: string; amount: number };
  paidLabel: string;
  paid: number;
  details: [string, string][];
  note: string;
  thanks: string;
};

/**
 * One A4 page in the client's receipt design: grey band, logo + society name + contact, greeting, a box with the
 * receipt number / party / date / status, the item with totals and the amount in words, the Payment Details and
 * Note panels, a thank-you line and the society's address at the bottom. Built in the browser and downloaded
 */
async function receiptPdf(r: ReceiptLayout) {
  const society = societyOf(r.society);
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), logoData(society.logoUrl)]);
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const k = pdfKit(doc, society);
  const { write, width, wrap, dashed } = k;

  /** A label on the left and an amount on the right */
  const row = (
    label: string,
    value: string,
    y: number,
    opts: { size?: number; style?: string; color?: Rgb; valueStyle?: string; valueColor?: Rgb } = {},
  ) => {
    const { size = 10, style = 'normal', color = DARK } = opts;
    write(label, 20, y, { size, style, color });
    write(value, 190, y, { size, style: opts.valueStyle ?? style, color: opts.valueColor ?? color, align: 'right' });
  };

  let y = k.header(r.title, logo);

  // Greeting
  y += 10;
  if (r.greeting) {
    write(r.greeting, 20, y, { size: 10.5 });
    y += 8;
  }
  const intro = wrap(r.intro, 10, 170);
  write(intro, 20, y, { size: 10 });
  y += intro.length * 5 + 5;

  // Box: society / receipt no, party / id, date / status
  y = k.infoBox(y, r) + 10;

  // The item, the totals and the amount in words
  write(r.item.heading, 20, y, { size: 10.5, style: 'bold' });
  write(` - ${r.item.what}`, 20 + width(r.item.heading, 10.5, 'bold'), y, { size: 10.5 });
  for (const line of r.item.lines) write(line, 20, (y += 4.8), { size: 9, color: GREY });
  y += 7;
  row(r.item.day, rs(r.item.amount), y, { size: 9, color: GREY, valueColor: DARK });
  dashed((y += 4));
  row('Total', rs(r.item.amount), (y += 6));
  row('Sub Total', rs(r.item.amount), (y += 9), { size: 9.5, style: 'bold', valueStyle: 'normal' });
  row('Taxes and Fees', rs(0), (y += 6), { size: 9.5, color: GREY });
  dashed((y += 4));
  row('Grand Total', rs(r.item.amount), (y += 8), { size: 13, valueStyle: 'bold' });
  row(r.paidLabel, rs(r.paid), (y += 7), { size: 13, valueStyle: 'bold', valueColor: r.paid ? STATUS_COLOR.ok : DARK });
  row('Remaining Balance', rs(r.item.amount - r.paid), (y += 7), { size: 13, valueStyle: 'bold' });
  write(`Amount in words: ${amountInWords(r.item.amount)}`, 20, (y += 5.5), { size: 9, style: 'italic', color: GREY });

  // Payment Details and Note panels (one grey band), the thank-you line
  y = k.notePanel((y += 7), r.note, r.thanks, r.details);

  // Footer at the bottom of the page (a long note pushes it down, never off the page)
  k.footer(Math.min(Math.max(y + 8, 272), 284));

  doc.save(`${r.fileName}.pdf`);
}

type ReceiptOptions = { society?: ReceiptSociety; modeLabel?: (mode: string) => string; statusLabel?: (status: string) => string };
const toneOf = (status: string): Tone => (status === 'success' || status === 'verified' ? 'ok' : status === 'pending' ? 'wait' : 'no');
const queries = (phones: string[]) => (phones.length ? ` For queries, contact ${phones.join(' or ')}.` : '');

/** One-page donation receipt (Donations → Receipt) */
export async function exportDonationReceipt(donation: ReceiptDonation, { society = {}, modeLabel = (m) => m, statusLabel = (s) => s }: ReceiptOptions = {}) {
  const no = recordNo('DON', donation.id);
  const mode = modeLabel(donation.method);
  const isUpi = donation.method.startsWith('upi');
  const s = societyOf(society);
  await receiptPdf({
    society: s,
    title: 'Donation Receipt',
    fileName: no,
    noLabel: 'Receipt No',
    no,
    greeting: `Dear ${donation.donor_name} ,`,
    intro: 'Thank you for supporting the society. Your donation has been received and the details are below.',
    partyLabel: 'Received From',
    party: donation.donor_name,
    idLabel: 'Member ID',
    idValue: donation.member_code || '-',
    date: formatDate(donation.donated_on),
    status: statusLabel(donation.status),
    tone: toneOf(donation.status),
    item: {
      heading: 'Donation 1',
      what: donation.purpose || 'Donation',
      lines: [`Payment Mode - ${mode}`, ...(donation.reference_no ? [`Reference${isUpi ? ' (UTR)' : ''} - ${donation.reference_no}`] : [])],
      day: shortDay(donation.donated_on),
      amount: donation.amount,
    },
    paidLabel: 'You Paid',
    paid: donation.status === 'success' ? donation.amount : 0,
    details: [
      ['Payment mode', mode],
      ['Reference', donation.reference_no || '-'],
      ['Purpose', donation.purpose || '-'],
      ['Status', statusLabel(donation.status)],
    ],
    note:
      `This is a computer-generated donation receipt issued by ${s.name} against the amount received via ${mode}. ` +
      `Please quote the Receipt No.${isUpi ? ' and UTR reference' : ''} for any correspondence.${queries(phonesOf(s.phone))}`,
    thanks: 'Thank you for supporting the society.',
  });
}

/** One-page expense (payment) voucher in the same design (Expenses → Voucher) */
export async function exportExpenseVoucher(expense: ReceiptExpense, { society = {}, modeLabel = (m) => m, statusLabel = (s) => s }: ReceiptOptions = {}) {
  const no = recordNo('EXP', expense.id);
  const mode = modeLabel(expense.mode);
  const s = societyOf(society);
  await receiptPdf({
    society: s,
    title: 'Expense Voucher',
    fileName: no,
    noLabel: 'Voucher No',
    no,
    greeting: null,
    intro: 'Payment voucher for the expense below, paid from the society fund.',
    partyLabel: 'Paid To',
    party: expense.paid_to || '-',
    idLabel: 'Category',
    idValue: expense.category || '-',
    date: formatDate(expense.txn_date),
    status: statusLabel(expense.status),
    tone: toneOf(expense.status),
    item: {
      heading: 'Expense 1',
      what: expense.category || 'Expense',
      lines: [expense.description, `Payment Mode - ${mode}`, ...(expense.reference_no ? [`Reference - ${expense.reference_no}`] : [])],
      day: shortDay(expense.txn_date),
      amount: expense.amount,
    },
    paidLabel: 'Paid',
    paid: expense.status === 'verified' ? expense.amount : 0,
    details: [
      ['Payment mode', mode],
      ['Reference', expense.reference_no || '-'],
      ['Category', expense.category || '-'],
      ['Status', statusLabel(expense.status)],
    ],
    note:
      `This is a computer-generated payment voucher issued by ${s.name} for the amount paid via ${mode}. ` +
      `Please quote the Voucher No. for any correspondence.${queries(phonesOf(s.phone))}`,
    thanks: 'Paid from the society fund.',
  });
}

// ---------- Event and notice PDFs (Events & Notices → PDF), in the same design ----------

type DocumentLayout = InfoBox & {
  title: string;
  fileName: string;
  greeting: string;
  intro: string;
  /** "Navratri Garba Night" - "Festival": the item line, like "Donation 1 - Festival" */
  heading: string;
  what: string;
  /** Grey lines under the heading (time, venue …) */
  lines: string[];
  /** The text typed by the creator (description / notice body); several pages when long */
  text: string;
  details: [string, string][];
  /** The details panel's label: "Event Details" / "Notice Details" */
  detailsLabel: string;
  note: string;
  thanks: string;
};

/** An event or notice on A4: the receipt's header, greeting and box, the item with its text, Details + Note, footer */
async function documentPdf(d: DocumentLayout) {
  const society = societyOf();
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), logoData(society.logoUrl)]);
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const k = pdfKit(doc, society);
  const { W, H, write, width, wrap, dashed } = k;

  let y = k.header(d.title, logo) + 10;
  write(d.greeting, 20, y, { size: 10.5 });
  const intro = wrap(d.intro, 10, W - 40);
  write(intro, 20, (y += 8), { size: 10 });
  y = k.infoBox(y + intro.length * 5 + 5, d) + 10;

  // The item: heading - what, the grey lines, then the text
  const heading = wrap(d.heading, 11, W - 60 - width(d.what, 10.5), 'bold');
  heading.forEach((line, i) => write(line, 20, y + i * 5.5, { size: 11, style: 'bold' }));
  write(` - ${d.what}`, 20 + width(heading[heading.length - 1], 11, 'bold'), y + (heading.length - 1) * 5.5, { size: 10.5 });
  y += (heading.length - 1) * 5.5;
  for (const line of d.lines) {
    for (const part of wrap(line, 9, W - 40)) {
      y = k.ensure(y + 4.8, 0);
      write(part, 20, y, { size: 9, color: GREY });
    }
  }
  if (d.text.trim()) {
    dashed((y += 5));
    y += 2;
    for (const paragraph of d.text.trim().split(/\n/)) {
      for (const line of paragraph.trim() ? wrap(paragraph, 10, W - 40) : ['']) {
        y = k.ensure(y + 5.2, 0);
        write(line, 20, y, { size: 10 });
      }
    }
  }

  // Details + Note panel and the dotted line (on a new page when they don't fit)
  const panelHeight = 12 + Math.ceil(d.details.length / 2) * 7.5 + 12 + wrap(d.note, 8.5, W - 38).length * 4.2 + 15;
  y = k.ensure(y + 8, panelHeight);
  k.notePanel(y, d.note, d.thanks, d.details, d.detailsLabel);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    k.footer(H - 20, pages > 1 ? `Page ${page} of ${pages}` : undefined);
  }
  doc.save(`${d.fileName}.pdf`);
}

const toneOfContent = (status: string): Tone => (status === 'posted' || status === 'published' ? 'ok' : status === 'cancelled' ? 'no' : 'wait');

/** What an event PDF needs, as the panel shows it (dates and times already formatted) */
export type PdfEvent = {
  id: number;
  title: string;
  category: string;
  dates: string;
  times: string;
  venue: string;
  address: string | null;
  organizer: string | null;
  contact: string | null;
  mapLink: string | null;
  description: string | null;
  status: string;
  statusLabel: string;
};

/** One event as a PDF (EVT012.pdf) */
export async function exportEventPdf(e: PdfEvent) {
  const no = recordNo('EVT', e.id);
  const name = societyOf().name;
  const phones = phonesOf(societyOf().phone);
  const where = [e.venue, e.address].filter(Boolean).join(', ');
  await documentPdf({
    title: 'Event Details',
    fileName: no,
    greeting: 'Dear Members ,',
    intro:
      e.status === 'cancelled'
        ? 'Please note that the event below has been cancelled.'
        : `${name} invites you and your family to the event below. The details are below.`,
    noLabel: 'Event No',
    no,
    partyLabel: 'Event',
    party: e.title,
    idLabel: 'Category',
    idValue: e.category,
    date: e.dates,
    status: e.statusLabel,
    tone: toneOfContent(e.status),
    heading: e.title,
    what: e.category,
    lines: [
      e.times ? `Time - ${e.times}` : '',
      where ? `Venue - ${where}` : '',
      e.organizer ? `Organizer - ${e.organizer}` : '',
      e.contact ? `Contact - ${e.contact}` : '',
      e.mapLink ? `Map - ${e.mapLink}` : '',
    ].filter(Boolean),
    text: e.description ?? '',
    details: [
      ['Date', e.dates],
      ['Time', e.times || '-'],
      ['Venue', e.venue || '-'],
      ['Category', e.category],
      ['Organizer', e.organizer || '-'],
      ['Contact', e.contact || '-'],
    ],
    detailsLabel: 'Event Details',
    note:
      `This is a computer-generated copy of the event issued by ${name}. Timings and venue may change; please check the ` +
      `society app for the latest details and quote the Event No. for any correspondence.${queries(phones)}`,
    thanks: e.status === 'cancelled' ? 'Thank you for your understanding.' : 'We look forward to seeing you.',
  });
}

/** What a notice PDF needs, as the panel shows it */
export type PdfNotice = {
  id: number;
  title: string;
  body: string;
  category: string;
  date: string;
  audience: string;
  issuedBy: string | null;
  status: string;
  statusLabel: string;
};

/** One notice as a PDF (NOT005.pdf) */
export async function exportNoticePdf(n: PdfNotice) {
  const no = recordNo('NOT', n.id);
  const name = societyOf().name;
  await documentPdf({
    title: 'Notice',
    fileName: no,
    greeting: 'Dear Members ,',
    intro: 'Please read the notice below from the society.',
    noLabel: 'Notice No',
    no,
    partyLabel: 'Notice',
    party: n.title,
    idLabel: 'Category',
    idValue: n.category,
    date: n.date,
    status: n.statusLabel,
    tone: toneOfContent(n.status),
    heading: n.title,
    what: n.category,
    lines: [`Sent to - ${n.audience}`, ...(n.issuedBy ? [`Issued by - ${n.issuedBy}`] : [])],
    text: n.body,
    details: [
      ['Category', n.category],
      ['Date', n.date],
      ['Sent to', n.audience],
      ['Status', n.statusLabel],
    ],
    detailsLabel: 'Notice Details',
    note:
      `This is a computer-generated copy of the notice issued by ${name}. Please quote the Notice No. for any ` +
      `correspondence.${queries(phonesOf(societyOf().phone))}`,
    thanks: 'Thank you for reading.',
  });
}
