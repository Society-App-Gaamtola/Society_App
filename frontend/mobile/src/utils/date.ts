export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "10 Oct 2026" */
export const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** "7:00 PM" */
export const formatTime = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
};

/** "25 Sep 2026, 10:30 AM" */
export const formatDateTime = (d: Date) => `${formatDate(d)}, ${formatTime(d)}`;

/** Parses a date made by formatDate back into a Date. */
export const parseDisplayDate = (s?: string) => {
  const m = s?.match(/^(\d{1,2}) (\w{3}) (\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  return month < 0 ? null : new Date(Number(m[3]), month, Number(m[1]));
};

/** Inclusive number of days between two display dates, or null if either is missing. */
export const dayCount = (start?: string, end?: string) => {
  const a = parseDisplayDate(start);
  const b = parseDisplayDate(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
};
