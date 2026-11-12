import type { ReportFormat } from '../types';

/** Minimum donation (in ₹) required before an executive membership request can be approved. */
export const MIN_EXECUTIVE_DONATION = 10000;

// Set in frontend/mobile/.env (see .env.example).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5020/api/v1';
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

export const SOCIETY_NAME = 'Shri Gamtola Yuvak Mitra Mandal';
export const SOCIETY_NAME_GU = 'શ્રી ગામટોળા યુવક મિત્ર મંડળ';
export const SOCIETY_NAME_GU_TWO_LINES = 'શ્રી ગામટોળા\nયુવક મિત્ર મંડળ';

export const LOGO = require('../../assets/logo.png');

/** Steps shown on the Change Email and OTP screens. */
export const EMAIL_CHANGE_STEPS = ['New Email', 'Verify OTP', 'Updated'];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const APP_VERSION = '1.0.0';

/**
 * The society's UPI ID for donations. Left empty until the admin gives the real one:
 * paying to a made-up ID could send money to a stranger, so the Donate screen won't open UPI without it.
 */
export const SOCIETY_UPI_ID: string = '';

/** Amounts offered as one-tap choices on the Donate screen. */
export const DONATION_PRESETS = [501, 1001, 2501, 5001, 11000];

/** Most items the backend sends in one page (MAX_PAGE_SIZE in backend/config/constant.js). */
export const MAX_PAGE_SIZE = 50;

export const STORAGE_KEYS = {
  language: 'app_language',
  deviceId: 'device_id',
  executiveRequestStatus: 'executive_request_status',
  executiveEvents: 'executive_events',
  donations: 'donations',
  reports: 'reports',
  myDonations: 'my_donations',
} as const;

export const REPORT_MIME_TYPES: Record<ReportFormat, string> = {
  PDF: 'application/pdf',
  Excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
