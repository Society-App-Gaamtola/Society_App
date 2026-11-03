export type DataMode = 'mock' | 'local-server' | 'supabase';

export const DATA_MODE = 'local-server' as DataMode;

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const DEFAULT_PAGE_SIZE = 10;
