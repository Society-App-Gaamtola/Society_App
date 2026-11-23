import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatINR = (amount: number) => `${amount < 0 ? '-' : ''}₹${inr.format(Math.abs(amount))}`;
export const formatNumber = (amount: number) => inr.format(amount);

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
/** 0–999 in words */
const hundreds = (n: number) => {
  const words: string[] = [];
  if (n >= 100) words.push(ONES[Math.floor(n / 100)], 'Hundred');
  const rest = n % 100;
  if (rest >= 20) words.push(TENS[Math.floor(rest / 10)], ONES[rest % 10]);
  else if (rest) words.push(ONES[rest]);
  return words.filter(Boolean).join(' ');
};
/** Receipts: 1001 → "Rupees One Thousand One Only", 150000.5 → "Rupees One Lakh Fifty Thousand and Fifty Paise Only" (Indian grouping) */
export function amountInWords(amount: number) {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  if (crore) parts.push(`${crore >= 1000 ? String(crore) : hundreds(crore)} Crore`);
  if (lakh) parts.push(`${hundreds(lakh)} Lakh`);
  if (thousand) parts.push(`${hundreds(thousand)} Thousand`);
  if (rupees % 1000) parts.push(hundreds(rupees % 1000));
  const words = parts.join(' ') || 'Zero';
  return `Rupees ${words}${paise ? ` and ${hundreds(paise)} Paise` : ''} Only`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (index: number) => MONTHS[index];

/** "2026-10-05" or "2026-10-05T10:30:00" → "05 Oct 2026". Dates are read as written, without time zones. */
export function formatDate(value?: string | null) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Adds the time when the value has one: "05 Oct 2026 10:30 AM". */
export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const time = value.slice(11, 16);
  if (!time) return formatDate(value);
  const [h, min] = time.split(':').map(Number);
  return `${formatDate(value)} ${String(h % 12 || 12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Backend timestamps are UTC ("…Z"). This gives the local time without a zone, for formatDate / formatDateTime */
export function fromUtc(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

export const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Local date and time without a zone, e.g. "2026-11-14T15:20:05", so it displays as the admin saw it. */
export const nowLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
};

/** DON001, EXP014 … built from the record id. */
export const recordNo = (prefix: string, id: string | number) => `${prefix}${String(id).padStart(3, '0')}`;

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const isImageUrl = (url: string) => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || url.startsWith('blob:') || url.startsWith('data:image/');

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2026-11" → "November 2026" */
export const monthLabelLong = (key: string) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/** Every month from `start` to `end` ("YYYY-MM"), both included. */
export function monthKeys(start: string, end: string) {
  const keys: string[] = [];
  let [y, m] = start.split('-').map(Number);
  const [endY, endM] = end.split('-').map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

/** First and last day of a month, as "YYYY-MM-DD". month is 1–12 */
export const monthBounds = (year: number, month: number) => {
  const mm = String(month).padStart(2, '0');
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` };
};

export const periodLabel = (from?: string | null, to?: string | null) =>
  from || to ? `${from ? formatDate(from) : 'Start'} - ${to ? formatDate(to) : 'Today'}` : 'All time';
