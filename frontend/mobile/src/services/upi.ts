import { SOCIETY_NAME, SOCIETY_UPI_ID } from '../config';

/** True once the admin has given the society's UPI ID (config/index.ts). */
export const upiReady = () => SOCIETY_UPI_ID.length > 0;

/**
 * UPI payment link with the amount filled in. Any UPI app opens it, and the QR code holds the same link.
 * Null until the real UPI ID is set: a made-up ID could send the money to a stranger.
 */
export const upiPayUrl = (amount: number, note: string) =>
  upiReady()
    ? `upi://pay?pa=${encodeURIComponent(SOCIETY_UPI_ID)}&pn=${encodeURIComponent(SOCIETY_NAME)}` +
      `&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
    : null;

/** A UPI transaction ID (UTR / RRN) is 12 digits. */
export const isUtr = (value: string) => /^\d{12}$/.test(value.trim());
