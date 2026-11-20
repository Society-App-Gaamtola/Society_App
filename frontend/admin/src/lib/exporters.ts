import { formatDate, formatNumber, nowLocal, recordNo } from './utils';

/** One table to export: the same shape for Excel and PDF, on every screen */
export type ExportTable = { title: string; subtitle?: string; columns: string[]; rows: (string | number)[][] };
export type ExportFormat = 'excel' | 'pdf';

const SOCIETY = 'Shri Gamtola Yuvak Mitra Mandal';
const MAROON: [number, number, number] = [122, 16, 32];
/** More columns than this → the PDF page is turned sideways */
const PDF_PORTRAIT_MAX_COLUMNS = 6;

/** Excel file. The library is heavy, so it loads on the first export only. */
export async function exportExcel({ title, subtitle, columns, rows }: ExportTable, fileName: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([[title], ...(subtitle ? [[subtitle]] : []), [], columns, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${fileName}.xlsx`);
}

/**
 * PDF file: maroon header with the society name, the title and subtitle, then the table. Long tables continue on
 * new pages with the column header repeated, and every page gets "Page x of y". Built in the browser (no server work).
 * jsPDF's built-in font has no ₹ sign, so pass amounts as plain numbers (formatNumber).
 */
export async function exportPdf({ title, subtitle, columns, rows }: ExportTable, fileName: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: columns.length > PDF_PORTRAIT_MAX_COLUMNS ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(...MAROON);
  doc.rect(0, 0, width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(SOCIETY, width / 2, 11.5, { align: 'center' });
  doc.setTextColor(40, 26, 18);
  doc.setFontSize(14);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.setTextColor(122, 106, 94);
  doc.text([subtitle, `Exported ${nowLocal().replace('T', ' ')}`].filter(Boolean).join('  ·  '), 14, 34);

  autoTable(doc, {
    head: [columns],
    body: rows.map((row) => row.map((cell) => String(cell ?? ''))),
    startY: 39,
    margin: { left: 14, right: 14, bottom: 16 },
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [40, 26, 18], lineColor: [234, 223, 207], lineWidth: 0.1 },
    headStyles: { fillColor: MAROON, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [251, 245, 236] },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(122, 106, 94);
    doc.text(`Page ${page} of ${pages}`, width - 14, height - 8, { align: 'right' });
  }
  doc.save(`${fileName}.pdf`);
}

/** The one export function every screen calls: the same table, as Excel or PDF */
export const exportTable = (table: ExportTable, fileName: string, format: ExportFormat) =>
  format === 'pdf' ? exportPdf(table, fileName) : exportExcel(table, fileName);

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

/** One A5 page: maroon header (society + title), label / value lines, a footer line. Saved as `<no>.pdf` */
async function receiptPdf(societyName: string, title: string, no: string, lines: [string, string][], footer: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ format: 'a5' });
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, 148, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(societyName, 74, 11, { align: 'center' });
  doc.setFontSize(10);
  doc.text(title, 74, 18, { align: 'center' });
  doc.setFontSize(10);
  lines.forEach(([label, value], i) => {
    const y = 38 + i * 9;
    doc.setTextColor(122, 106, 94);
    doc.text(label, 16, y);
    doc.setTextColor(40, 26, 18);
    // Long text (a description) wraps inside the page instead of running off it
    doc.text(doc.splitTextToSize(value, 74)[0] ?? '', 60, y);
  });
  doc.setFontSize(8);
  doc.setTextColor(122, 106, 94);
  doc.text(footer, 74, 130, { align: 'center' });
  doc.save(`${no}.pdf`);
}

/** One-page donation receipt. jsPDF's built-in font has no ₹ sign, so amounts use "Rs.". */
export async function exportDonationReceipt(
  donation: ReceiptDonation,
  { societyName = SOCIETY, modeLabel = (m: string) => m, statusLabel = (s: string) => s } = {},
) {
  const no = recordNo('DON', donation.id);
  await receiptPdf(societyName, 'Donation Receipt', no, [
    ['Receipt No', no],
    ['Date', formatDate(donation.donated_on)],
    ['Received from', donation.donor_name],
    ['Member Code', donation.member_code || '-'],
    ['Amount', `Rs. ${formatNumber(donation.amount)}`],
    ['Payment mode', modeLabel(donation.method)],
    ['Reference', donation.reference_no || '-'],
    ['Purpose', donation.purpose || '-'],
    ['Status', statusLabel(donation.status)],
  ], 'Thank you for supporting the society.');
}

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

/** One-page expense (payment) voucher, the same layout as the donation receipt */
export async function exportExpenseVoucher(
  expense: ReceiptExpense,
  { societyName = SOCIETY, modeLabel = (m: string) => m, statusLabel = (s: string) => s } = {},
) {
  const no = recordNo('EXP', expense.id);
  await receiptPdf(societyName, 'Expense Voucher', no, [
    ['Voucher No', no],
    ['Date', formatDate(expense.txn_date)],
    ['Paid to', expense.paid_to || '-'],
    ['Description', expense.description],
    ['Category', expense.category || '-'],
    ['Amount', `Rs. ${formatNumber(expense.amount)}`],
    ['Payment mode', modeLabel(expense.mode)],
    ['Reference', expense.reference_no || '-'],
    ['Status', statusLabel(expense.status)],
  ], 'Paid from the society fund.');
}
