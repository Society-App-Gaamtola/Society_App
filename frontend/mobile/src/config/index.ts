/** Minimum donation (in ₹) required before an executive membership request can be approved. */
export const MIN_EXECUTIVE_DONATION = 10000;

export const STORAGE_KEYS = {
  executiveRequestStatus: 'executive_request_status',
  executiveEvents: 'executive_events',
  donations: 'donations',
  reports: 'reports',
} as const;
