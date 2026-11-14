export type DataMode = 'mock' | 'local-server' | 'supabase';

export const DATA_MODE = 'local-server' as DataMode;

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const DEFAULT_PAGE_SIZE = 10;

/** Map pin for new events until a venue picker exists (society premises, Vadodara). */
export const DEFAULT_LOCATION = { latitude: 22.3072, longitude: 73.1812 };

/** Cards per page on Media Approval. */
export const MEDIA_PAGE_SIZE = 12;
