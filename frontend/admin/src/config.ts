/** The backend. Every screen calls it with the Super Admin's token. */
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5020/api/v1';
export const BACKEND_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY ?? '';
/** A backend call that takes longer than this fails with a "try again" message instead of loading forever */
export const BACKEND_TIMEOUT_MS = 20_000;

/**
 * How long a loaded page of an admin list stays fresh in the browser. Coming back to a page within this time shows
 * it from memory with no API call; saving a change refreshes it at once.
 */
export const LIST_CACHE_MS = 5 * 60_000;

/** Exports read the list page by page with this page size (the backend's MAX_PAGE_SIZE). */
export const EXPORT_PAGE_SIZE = 50;

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Cloudinary, for files the backend keeps (event posters): the same unsigned preset as the mobile app, so no secret
 * is needed here. ENV_FOLDER must match the backend (production on the live server, development locally).
 */
export const CLOUDINARY = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '',
  rootFolder: 'society_app',
  envFolder: process.env.NEXT_PUBLIC_CLOUDINARY_ENV_FOLDER ?? 'development',
};

/** Map pin for new events until a venue picker exists (society premises, Vadodara). */
export const DEFAULT_LOCATION = { latitude: 22.3072, longitude: 73.1812 };

