const KEY = 'admin_session';

export type Session = { email: string; name: string; role: 'Super Admin' };

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export const setSession = (email: string) =>
  localStorage.setItem(KEY, JSON.stringify({ email, name: 'Admin', role: 'Super Admin' } satisfies Session));

export const clearSession = () => localStorage.removeItem(KEY);
