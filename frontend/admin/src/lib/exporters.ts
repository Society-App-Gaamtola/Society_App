import type { Donation } from '@/types';
import { formatDate, formatNumber, recordNo } from './utils';

export type ExportTable = { title: string; subtitle?: string; columns: string[]; rows: (string | number)[][] };

const SOCIETY = 'Shri Gamtola Yuvak Mitra Mandal';
const MAROON: [number, number, number] = [122, 16, 32];

/** Lists and reports export to Excel only. The library is heavy, so it loads on first export. */
export async function exportExcel({ title, subtitle, columns, rows }: ExportTable, fileName: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([[title], ...(subtitle ? [[subtitle]] : []), [], columns, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${fileName}.xlsx`);
}

/** One-page donation receipt. jsPDF's built-in font has no ₹ sign, so amounts use "Rs.". */
export async function exportDonationReceipt(donation: Donation, societyName = SOCIETY) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ format: 'a5' });
  const no = recordNo('DON', donation.id);
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, 148, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(societyName, 74, 11, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Donation Receipt', 74, 18, { align: 'center' });
  doc.setTextColor(40, 26, 18);
  doc.setFontSize(10);
  const lines: [string, string][] = [
    ['Receipt No', no],
    ['Date', formatDate(donation.date)],
    ['Received from', donation.donorName],
    ['Member ID', donation.memberId || '-'],
    ['Amount', `Rs. ${formatNumber(donation.amount)}`],
    ['Payment mode', donation.mode],
    ['Reference', donation.reference || '-'],
    ['Purpose', donation.purpose],
    ['Status', donation.status],
  ];
  lines.forEach(([label, value], i) => {
    const y = 38 + i * 9;
    doc.setTextColor(122, 106, 94);
    doc.text(label, 16, y);
    doc.setTextColor(40, 26, 18);
    doc.text(value, 60, y);
  });
  doc.setFontSize(8);
  doc.setTextColor(122, 106, 94);
  doc.text('Thank you for supporting the society.', 74, 130, { align: 'center' });
  doc.save(`${no}.pdf`);
}
