import * as SecureStore from 'expo-secure-store';
import { setAuthToken } from '../api/client';
import type { AuthUser } from '../types';

// Encrypted on the device: holds a long-lived login token and personal details.
const SESSION_KEY = 'auth_session';

/** Loads the saved login on app start. */
export async function restoreSession(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const { token, user } = JSON.parse(raw) as { token: string; user: AuthUser };
    setAuthToken(token);
    return user;
  } catch {
    return null;
  }
}

/** With `remember` off the login lasts until the app is closed. */
export async function startSession(token: string, user: AuthUser, remember: boolean) {
  setAuthToken(token);
  if (remember) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, user }));
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

/** Keeps the saved copy of the user current, if the login is saved. */
export async function updateSessionUser(user: AuthUser) {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return;
  const { token } = JSON.parse(raw) as { token: string };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, user }));
}

export async function endSession() {
  setAuthToken(null);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
