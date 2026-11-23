import { getSocietyInfo } from './appInfo';
import type { DonationSettings } from '../api/member';

/** The society's UPI details from the backend (upi_settings); null until the admin adds them. */
export type UpiDetails = DonationSettings['upi'];

/**
 * UPI payment link with the amount filled in. Any UPI app opens it, and the QR code holds the same link.
 * Null until the admin has added the real UPI ID: a made-up ID could send the money to a stranger.
 */
export const upiPayUrl = (upi: UpiDetails, amount: number, note: string) =>
  upi
    ? `upi://pay?pa=${encodeURIComponent(upi.upi_id)}&pn=${encodeURIComponent(upi.payee_name || getSocietyInfo().society_name)}` +
      `&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
    : null;

/** A UPI transaction ID (UTR / RRN) is 12 digits. */
export const isUtr = (value: string) => /^\d{12}$/.test(value.trim());
