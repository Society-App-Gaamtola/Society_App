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

  /** The grey Note panel and the dotted line under it. Returns its bottom */
  const notePanel = (top: number, noteText: string, thanks: string, details: [string, string][] = []) => {
    const note = wrap(noteText, 8.5, W - 38);
    const noteTop = details.length ? top + 12 + Math.ceil(details.length / 2) * 7.5 + 2 : top + 3;
    const bandEnd = noteTop + 10 + note.length * 4.2;
    doc.setFillColor(...PANEL);
    doc.rect(10, top, W - 20, bandEnd - top, 'F');
    if (details.length) {
      pill('Payment Details', top + 3);
      details.forEach(([label, value], i) => {
        const x = i % 2 ? W / 2 + 5 : 20;
        const at = top + 16 + Math.floor(i / 2) * 7.5;
        write(`${label}:`, x, at, { size: 9.5, style: 'bold' });
        write(value || '-', x + 27, at, { size: 9.5 });
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

  return { doc, W, H, name, phones, write, width, wrap, dashed, band, header, notePanel, footer };
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

type Tone = 'ok' | 'wait' | 'no';
type ReceiptLayout = {
  society: ReceiptSociety;
  title: string;
  fileName: string;
  noLabel: string;
  no: string;
  greeting: string | null;
  intro: string;
  partyLabel: string;
  party: string;
  idLabel: string;
  idValue: string;
  date: string;
  status: string;
  tone: Tone;
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
  const top = y;
  doc.setFillColor(...PANEL);
  doc.setDrawColor(222, 222, 222);
  doc.roundedRect(14, top, 182, 36, 3, 3, 'FD');
  write(k.name, 20, top + 8.5, { size: 10, style: 'bold' });
  write(`${r.noLabel} - ${r.no}`, 190, top + 8.5, { size: 10, color: GREY, align: 'right' });
  dashed(top + 12.5);
  const partyLabel = `${r.partyLabel} -`;
  write(partyLabel, 20, top + 20.5, { size: 10, style: 'bold' });
  write(r.party, 21.5 + width(partyLabel, 10, 'bold'), top + 20.5, { size: 10 });
  write(`${r.idLabel} - ${r.idValue}`, 190, top + 20.5, { size: 10, color: GREY, align: 'right' });
  dashed(top + 24.5);
  write('Date - ', 20, top + 31.5, { size: 10, color: GREY });
  write(r.date, 20 + width('Date - ', 10), top + 31.5, { size: 10, style: 'bold' });
  write(r.status, 190, top + 31.5, { size: 10, style: 'bold', color: STATUS_COLOR[r.tone], align: 'right' });
  write('Status - ', 188 - width(r.status, 10, 'bold'), top + 31.5, { size: 10, color: GREY, align: 'right' });
  y = top + 36 + 10;

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
