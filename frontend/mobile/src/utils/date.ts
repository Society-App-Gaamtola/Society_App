import type { DateRange } from '../types';
import { t } from '../i18n';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "10 Oct 2026" (the month in the app's language) */
export const formatDate = (d: Date) => `${pad2(d.getDate())} ${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;

/** "October 2026"-style month name in the app's language */
export const monthName = (monthIndex: number) => t(MONTH_NAMES[monthIndex]);

/** "7:00 PM" */
export const formatTime = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  return `${h}:${pad2(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
};

/** "25 Sep 2026, 10:30 AM" */
export const formatDateTime = (d: Date) => `${formatDate(d)}, ${formatTime(d)}`;

/** "01:05", for countdowns. */
export const formatCountdown = (seconds: number) => `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;

/** Parses a date made by formatDate back into a Date (its month in English or the app's language). */
const parseDisplayDate = (s?: string) => {
  const m = s?.match(/^(\d{1,2}) (\S+) (\d{4})$/);
  if (!m) return null;
  const month = MONTHS.findIndex((name) => name === m[2] || t(name) === m[2]);
  return month < 0 ? null : new Date(Number(m[3]), month, Number(m[1]));
};

/** Inclusive number of days between two yyyy-mm-dd dates. */
export const isoDayCount = (start: string, end: string) =>
  Math.round((fromIsoDay(end).getTime() - fromIsoDay(start).getTime()) / 86400000) + 1;

/** Inclusive number of days between two display dates, or null if either is missing. */
export const dayCount = (start?: string, end?: string) => {
  const a = parseDisplayDate(start);
  const b = parseDisplayDate(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Local date as yyyy-mm-dd. */
export const toIsoDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const fromIsoDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Whether an ISO date-time falls on a day inside the range. */
export const isInRange = (isoDateTime: string, range: DateRange) => {
  const day = isoDateTime.slice(0, 10);
  return day >= range.start && day <= range.end;
};

/** "01 Oct 2026 - 31 Oct 2026", or a single date when start and end match. */
export const formatRange = (range: DateRange) =>
  range.start === range.end
    ? formatDate(fromIsoDay(range.start))
    : `${formatDate(fromIsoDay(range.start))} - ${formatDate(fromIsoDay(range.end))}`;

/** "5 min ago", "2 hours ago", "3 days ago". */
export const timeAgo = (timestamp: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return t('Just now');
  if (minutes < 60) return t('{n} min ago', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(hours > 1 ? '{n} hours ago' : '{n} hour ago', { n: hours });
  const days = Math.floor(hours / 24);
  return t(days > 1 ? '{n} days ago' : '{n} day ago', { n: days });
};
