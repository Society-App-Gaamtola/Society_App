import type { ReportFormat } from '../types';

/** Minimum donation (in ₹) required before an executive membership request can be approved. */
export const MIN_EXECUTIVE_DONATION = 10000;

// Set in frontend/mobile/.env (see .env.example).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5020/api/v1';
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

/** Defaults until App Settings' names arrive (services/appInfo.ts → useAppInfo / getSocietyInfo) */
export const SOCIETY_NAME = 'Shri Gamtola Yuvak Mitra Mandal';
export const SOCIETY_NAME_GU = 'શ્રી ગામટોળા યુવક મિત્ર મંડળ';

export const LOGO = require('../../assets/logo.png');

/** Steps shown on the Change Email and OTP screens. */
export const EMAIL_CHANGE_STEPS = ['New Email', 'Verify OTP', 'Updated'];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Cloudinary account the app uploads to (unsigned upload preset, so no secret is needed in the app).
 * The backend only accepts links that start with https://res.cloudinary.com/<cloudName>/ (MEDIA_URL_PREFIX).
 */
export const CLOUDINARY = {
  cloudName: 'ggrljuty',
  uploadPreset: 'society_app_unsigned',
  rootFolder: 'society_app',
  /** Uploads made while the app talks to a local backend go to a separate folder, so tests never mix with real files. */
  envFolder: API_URL.startsWith('https://') ? 'production' : 'development',
} as const;

/** Photos and videos (Cloudinary Free plan limits per file). */
export const MEDIA = {
  maxBytes: { image: 10 * 1024 * 1024, video: 100 * 1024 * 1024 },
  /** Photos are shrunk to this many pixels on the longest side before upload: the full-screen viewer never shows more. */
  maxImageSide: 1600,
  /** JPEG quality after shrinking: a phone photo ends up around 300–600KB. */
  imageQuality: 0.7,
  /** How many gallery files can be picked at once. */
  maxPick: 10,
} as const;

export const APP_VERSION = '1.0.0';

/** Amounts offered as one-tap choices on the Donate screen. */
export const DONATION_PRESETS = [501, 1001, 2501, 5001, 11000];

/** Most items the backend sends in one page (MAX_PAGE_SIZE in backend/config/constant.js). */
export const MAX_PAGE_SIZE = 50;

export const STORAGE_KEYS = {
  language: 'app_language',
  appInfo: 'app_info', // the society's details from App Settings (services/appInfo.ts)
  deviceId: 'device_id',
} as const;

export const REPORT_MIME_TYPES: Record<ReportFormat, string> = {
  PDF: 'application/pdf',
  Excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
