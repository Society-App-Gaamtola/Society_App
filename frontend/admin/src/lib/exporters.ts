export type ExportTable = { title: string; columns: string[]; rows: (string | number)[][] };

/** The export libraries are heavy, so they load only when someone actually exports. */
export async function exportPdf({ title, columns, rows }: ExportTable, fileName: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Shri Gamtola Yuvak Mitra Mandal', 14, 16);
  doc.setFontSize(11);
  doc.text(title, 14, 24);
  autoTable(doc, { startY: 30, head: [columns], body: rows, headStyles: { fillColor: [122, 16, 32] } });
  doc.save(`${fileName}.pdf`);
}

export async function exportExcel({ title, columns, rows }: ExportTable, fileName: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([[title], [], columns, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${fileName}.xlsx`);
}
