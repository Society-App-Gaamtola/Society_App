export type DataMode = 'mock' | 'local-server' | 'supabase';

/**
 * Where data comes from. Default `mock`: the demo data in src/services/seed.json is copied into each
 * browser, so the deployed panel needs no server. Set NEXT_PUBLIC_DATA_MODE=local-server to use ../mock-server.
 */
export const DATA_MODE = (process.env.NEXT_PUBLIC_DATA_MODE ?? 'mock') as DataMode;

/** Change this whenever seed.json changes, so browsers drop their old copy of the demo data. */
export const SEED_VERSION = '2026-11-14';

/** Demo uploads are stored inside the browser, which only holds a few MB in total. */
export const MOCK_UPLOAD_MAX_MB = 1;

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const DEFAULT_PAGE_SIZE = 10;

/** Map pin for new events until a venue picker exists (society premises, Vadodara). */
export const DEFAULT_LOCATION = { latitude: 22.3072, longitude: 73.1812 };

/** Cards per page on Media Approval. */
export const MEDIA_PAGE_SIZE = 12;
