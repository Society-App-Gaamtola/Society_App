import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatINR = (amount: number) => `${amount < 0 ? '-' : ''}₹${inr.format(Math.abs(amount))}`;
export const formatNumber = (amount: number) => inr.format(amount);

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

export const isImageUrl = (url: string) => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || url.startsWith('blob:');

export const periodLabel = (from?: string | null, to?: string | null) =>
  from || to ? `${from ? formatDate(from) : 'Start'} - ${to ? formatDate(to) : 'Today'}` : 'All time';
