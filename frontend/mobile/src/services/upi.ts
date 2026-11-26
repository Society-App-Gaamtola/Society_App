import { getSocietyInfo } from './appInfo';
import type { DonationSettings } from '../api/member';

/** The society's UPI details from the backend (upi_settings); null until the admin adds them. */
export type UpiDetails = DonationSettings['upi'];

/** The UPI note of a donation: its receipt number, which shows on the bank statement so the treasurer can match it. */
export const upiDonationNote = (receiptNo: string) => `Donation ${receiptNo}`;

/**
 * UPI payment link, e.g. upi://pay?pa=mandal@bank&pn=Shri%20Gamtola%20Yuvak%20Mitra%20Mandal&am=501.00&cu=INR&tn=Donation%20DON042
 * pa = the society's UPI ID and pn = the payee name (both from App Settings in the admin panel), am = the amount,
 * cu = INR, tn = the note. Any UPI app opens it, and the QR code holds the same link.
 * Null until the admin has added the real UPI ID: a made-up ID could send the money to a stranger.
 */
export const upiPayUrl = (upi: UpiDetails, amount: number, note: string) =>
  upi
    ? `upi://pay?pa=${encodeURIComponent(upi.upi_id)}&pn=${encodeURIComponent(upi.payee_name || getSocietyInfo().society_name)}` +
      `&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    : null;

/** A UPI transaction ID (UTR / RRN) is 12 digits. */
export const isUtr = (value: string) => /^\d{12}$/.test(value.trim());
