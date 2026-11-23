const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Formats a rupee amount with Indian digit grouping, e.g. 125000 -> "₹1,25,000". */
export const formatINR = (amount: number) => `₹${inrFormatter.format(amount)}`;

/** Receipts: 1001 → "Rs. 1,001.00" (two decimals, Indian grouping) */
export const formatRs = (amount: number) =>
  `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
/** Receipts: 1001 → "Rupees One Thousand One Only" (Indian grouping: thousand, lakh, crore; same as the admin panel) */
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
  return `Rupees ${parts.join(' ') || 'Zero'}${paise ? ` and ${hundreds(paise)} Paise` : ''} Only`;
}

/** A unique id for a record created on this device, e.g. "d-1762233000000-a1b2c". */
export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
