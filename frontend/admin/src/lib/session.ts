const KEY = 'admin_session';
const DEVICE_KEY = 'admin_device_uid';

/** The logged-in Super Admin. `token` is sent to the backend on every call. */
export type Session = { id: number; email: string; name: string; role: 'Super Admin'; token: string };

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    // A saved session without a token can't call the backend: treat it as logged out
    return session?.token ? session : null;
  } catch {
    return null;
  }
}

export const setSession = (session: Omit<Session, 'role'>) =>
  localStorage.setItem(KEY, JSON.stringify({ ...session, role: 'Super Admin' } satisfies Session));

export const clearSession = () => localStorage.removeItem(KEY);

/** One id per browser, so logging in again reuses this browser's session row on the backend. */
export function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
