export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (s: string) => EMAIL_RE.test(s);

export const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** Accepts 10 digits, optionally prefixed with +91 / 91 / 0. */
export const isIndianMobile = (s: string) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(s.replace(/[\s-]/g, ''));

/** A mobile number without its country code. Same limits as the backend. */
export const isLocalMobile = (s: string) => /^\d{7,15}$/.test(digitsOnly(s));

export const INDIA_DIAL_CODE = '+91';

/** The 10-digit number from anything isIndianMobile accepts. */
export const localIndianNumber = (s: string) => digitsOnly(s).slice(-10);
