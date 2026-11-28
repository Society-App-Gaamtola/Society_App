import { getSocietyInfo } from './appInfo';

/**
 * The client's receipt design (DON receipt, 2026-11-23) as one HTML page shell, used by every PDF the app makes:
 * the donation receipt, the executive reports and the My Donations summary. Grey band, logo + society name (maroon)
 * + the PDF's title, contact on the right, an optional greeting, the grey box (society / number, party / id,
 * date / status), the PDF's own body, the grey Payment Details / Note panel, a dotted thank-you line and the
 * society's address + telephone at the bottom. The PDFs are in English, like the admin panel's.
 */

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "25 Oct 2026" */
export const longDay = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** "Oct 25, 2026" */
export const shortDay = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/** "+91 76007 60370 / +91 7600 767 475" (App Settings' phone) → both numbers */
export const phonesOf = (phone?: string) =>
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

/** A4 in points (iOS prints Letter by default) */
export const A4 = { width: 595, height: 842 };

/** "For queries, contact …" for a Note, from App Settings' phone */
export const queriesLine = () => {
  const phones = phonesOf(getSocietyInfo().phone);
  return phones.length ? ` For queries, contact ${phones.map(escapeHtml).join(' or ')}.` : '';
};

/** One row of the grey box: HTML on the left and on the right (already escaped) */
export type BoxRow = [left: string, right: string];

/** A label on the left and an amount on the right (the receipt's total lines); big = Grand Total size */
export const amountLine = (label: string, value: string, { big = false, bold = false, dash = false, tone = '' } = {}) =>
  `<div class="line${big ? ' big' : ''}${dash ? ' dash' : ''}">${bold ? `<b>${label}</b>` : label}${big ? `<b class="${tone}">${value}</b>` : `<span class="${tone}">${value}</span>`}</div>`;

const STYLE = `
  @page { size: A4; margin: 16px 0 20px; }
  @page :first { margin-top: 0; }
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
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; }
  .row + .row { border-top: 1px dashed #CDCDCD; }
  .grey { color: #787878; } .ok { color: #16A34A; font-weight: bold; } .wait { color: #D97706; font-weight: bold; }
  .item { padding: 16px 22px 0; } .item .sub { color: #787878; font-size: 12px; margin-top: 3px; }
  .line { display: flex; justify-content: space-between; padding: 6px 0; }
  .dash { border-bottom: 1px dashed #CDCDCD; }
  .big { font-size: 18px; } .big b { font-size: 18px; }
  .words { color: #787878; font-style: italic; font-size: 12px; }
  h3 { margin: 20px 0 6px; font-size: 14px; color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { background: #F0F0EF; color: #333; text-align: left; padding: 7px 8px; border-bottom: 1px solid #CDCDCD; }
  td { padding: 7px 8px; border-bottom: 1px dashed #CDCDCD; }
  .num { text-align: right; white-space: nowrap; }
  .empty { color: #787878; font-style: italic; margin-top: 14px; }
  .bars { display: flex; align-items: flex-end; gap: 12px; height: 150px; margin-top: 8px; }
  .bar { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #787878; }
  .fill { width: 28px; background: #7A1020; border-radius: 4px 4px 0 0; margin-bottom: 4px; }
  .panel { background: #F0F0EF; margin: 18px -34px 0; padding: 8px 56px 12px; page-break-inside: avoid; }
  .pill { display: inline-block; background: #D6D6D6; color: #fff; font-weight: bold; font-size: 11px; padding: 4px 12px; border-radius: 4px; margin: 6px 0 10px -22px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 8px; }
  .grid b { display: inline-block; width: 110px; }
  .note { color: #787878; font-size: 11.5px; line-height: 1.5; }
  .thanks { margin: 12px 8px 0; border: 1px dashed #BEBEBE; padding: 12px; text-align: center; page-break-inside: avoid; }
  .foot { display: flex; justify-content: space-between; gap: 20px; margin-top: 14px; color: #787878; font-size: 11.5px; page-break-inside: avoid; }
  .foot b { color: #333; font-size: 13px; }
`;

/**
 * A whole PDF page in the receipt design. Every text value must already be escaped (escapeHtml); body is the PDF's
 * own part between the box and the Note panel (an .item block, tables …)
 */
export function pdfPage({
  logo,
  title,
  greeting = [],
  box,
  body,
  details = [],
  detailsLabel = 'Payment Details',
  note,
  thanks,
}: {
  logo: string | null;
  title: string;
  greeting?: string[];
  box: BoxRow[];
  body: string;
  details?: [string, string][];
  /** The details panel's label ("Event Details" …) */
  detailsLabel?: string;
  note: string;
  thanks: string;
}) {
  const info = getSocietyInfo();
  const name = escapeHtml(info.society_name);
  const phones = phonesOf(info.phone).map(escapeHtml);
  const address = escapeHtml(info.address ?? '');
  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>${STYLE}</style></head>
<body>
  <div class="band"></div>
  <div class="head">
    ${logo ? `<img src="${logo}" />` : ''}
    <div class="title"><h1>${twoLines(info.society_name).map(escapeHtml).join('<br />')}</h1><p>${escapeHtml(title)}</p></div>
    ${phones.length || address ? `<div class="contact"><b>Contact</b><br />${phones.join('<br />')}${address ? `<br /><br />${address}` : ''}</div>` : ''}
  </div>
  ${greeting.length ? `<div class="greet">${greeting.map((p) => `<p>${p}</p>`).join('')}</div>` : ''}
  <div class="box">${box.map(([left, right]) => `<div class="row"><span>${left}</span><span>${right}</span></div>`).join('')}</div>
  ${body}
  <div class="panel">
    ${
      details.length
        ? `<div class="pill">${detailsLabel}</div>
    <div class="grid">${details.map(([label, value]) => `<div><b>${label}:</b> ${value || '-'}</div>`).join('')}</div>
    <div class="pill" style="margin-top: 12px">Note</div>`
        : '<div class="pill">Note</div>'
    }
    <div class="note">${note}</div>
  </div>
  <div class="thanks">${thanks}</div>
  <div class="foot">
    <div><b>${name}</b>${address ? `<br />${address}` : ''}</div>
    ${phones.length ? `<div style="text-align: right; white-space: nowrap">Tel: ${phones.join(' / ')}</div>` : ''}
  </div>
</body></html>`;
}

/** The box's first row on every report: the society on the left, "<label> - <value>" in grey on the right */
export const societyRow = (rightLabel: string, rightValue: string): BoxRow => [
  `<b>${escapeHtml(getSocietyInfo().society_name)}</b>`,
  `<span class="grey">${escapeHtml(rightLabel)} - ${escapeHtml(rightValue)}</span>`,
];
