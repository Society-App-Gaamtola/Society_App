import { API_KEY, API_URL } from '../config';
import { getAppLanguage } from '../i18n';

const TIMEOUT_MS = 20000;

// `code` values in the backend's response (backend/config/status_codes.js).
export const ApiCode = {
  invalidToken: -1,
  error: 0,
  success: 1,
  missingFields: 2,
  profilePending: 5,
} as const;

export type ApiResponse<T> = { code: number; message: string; data: T };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly data?: unknown,
  ) {
    super(message);
  }

  /** Seconds left when a new OTP was requested too soon. */
  get resendAfter(): number | undefined {
    return (this.data as { resend_after_seconds?: number } | undefined)?.resend_after_seconds;
  }

  /** Per-field messages when the backend rejected the input. */
  get fieldErrors(): Record<string, string> {
    return this.code === ApiCode.missingFields && this.data ? (this.data as Record<string, string>) : {};
  }
}

let authToken: string | null = null;
let onSessionExpired: ((message: string) => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setSessionExpiredHandler = (handler: ((message: string) => void) | null) => {
  onSessionExpired = handler;
};

type RequestOptions = { body?: object; form?: FormData };

/** Calls the backend. Resolves for `code` 1 and 5, throws ApiError for everything else. */
export async function request<T = undefined>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  { body, form }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'api-key': API_KEY,
    Accept: 'application/json',
    'Accept-Language': getAppLanguage(),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  // Multipart requests set their own Content-Type, with the boundary.
  if (body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (error) {
    // This also catches failures while preparing the request, so show the real cause in development.
    if (__DEV__) console.warn(`[api] ${method} ${API_URL}${path} failed:`, error);
    const detail = __DEV__ && error instanceof Error ? ` (${error.message})` : '';
    throw new ApiError(`Could not reach the server. Check your connection and try again.${detail}`, ApiCode.error);
  } finally {
    clearTimeout(timer);
  }

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError('The server sent an unexpected response. Please try again.', ApiCode.error);
  }

  if (json.code === ApiCode.success || json.code === ApiCode.profilePending) return json;

  if (json.code === ApiCode.invalidToken && authToken) onSessionExpired?.(json.message);
  throw new ApiError(json.message, json.code, json.data);
}
