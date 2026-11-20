import { BACKEND_API_KEY, BACKEND_TIMEOUT_MS, BACKEND_URL, EXPORT_PAGE_SIZE } from '@/config';
import { clearSession, getSession } from '@/lib/session';

/** Backend pagination, the same on every list API */
export type Pagination = { page: number; limit: number; total: number; total_pages: number; has_more: boolean };

type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * Every row of a list, for exports: asks for one page at a time (EXPORT_PAGE_SIZE) until there are no more,
 * so the server never builds one huge reply. `loadPage` is the screen's normal list call.
 */
export async function fetchAllPages<T>(loadPage: (page: number, limit: number) => Promise<{ rows: T[]; pagination: Pagination }>) {
  const rows: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await loadPage(page, EXPORT_PAGE_SIZE);
    rows.push(...result.rows);
    if (!result.pagination.has_more) return rows;
  }
}

/** Error from the backend. `fields` holds the Joi message per field (code 2). */
export class ApiError extends Error {
  constructor(message: string, readonly code: number, readonly fields?: Record<string, string>) {
    super(message);
  }
}

const toQueryString = (query: Query = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
};

/**
 * Calls the backend with the api-key and the Super Admin's token. Every reply is { code, message, data }:
 * code 1 returns { data, message } (message is ready for a toast); anything else throws ApiError.
 * A refused token (HTTP 401) ends the session and goes back to the login page.
 */
export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  { query, body }: { query?: Query; body?: object } = {},
): Promise<{ data: T; message: string }> {
  const token = getSession()?.token;
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}${toQueryString(query)}`, {
      method,
      cache: 'no-store',
      headers: {
        'api-key': BACKEND_API_KEY,
        'Accept-Language': 'en',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // A server that never answers ends in an error with Retry, not an endless loader
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiError(
      timedOut ? 'The server is taking too long to answer. Please try again.' : "Can't reach the server. Check that it is running and your internet is on.",
      0,
    );
  }

  const reply = (await res.json().catch(() => null)) as { code: number; message: string; data?: unknown } | null;
  if (!reply) throw new ApiError(`Server error (${res.status})`, 0);

  if (res.status === 401 && token) {
    clearSession();
    window.location.replace('/login');
  }
  if (reply.code !== 1) {
    const fields = reply.code === 2 ? (reply.data as Record<string, string> | undefined) : undefined;
    throw new ApiError(fields ? Object.values(fields)[0] : reply.message, reply.code, fields);
  }
  return { data: reply.data as T, message: reply.message };
}
