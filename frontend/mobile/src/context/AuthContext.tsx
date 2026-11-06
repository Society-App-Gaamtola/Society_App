import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import * as authApi from '../api/auth';
import type { ApiUser, AuthData } from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { API_URL } from '../config';
import { MOCK_USERS } from '../data/seeds';
import { resetToLogin } from '../navigation/navigationRef';
import { endSession, startSession, updateSessionUser } from '../services/session';
import type { AuthUser, Permission, Permissions } from '../types';

const NO_PERMISSIONS: Permissions = { events: false, notices: false, donations: false, expenses: false, reports: false, media: false };

// The login response has no permissions yet, so executives get these until it does.
const EXECUTIVE_PERMISSIONS: Permissions = { events: true, notices: true, donations: true, expenses: false, reports: true, media: true };

const API_ORIGIN = API_URL.replace(/\/api\/.*$/, '');

// Without BASE_URL set, the backend builds photo links with localhost, which a phone can't open.
const photoUrl = (url: string | null) => url?.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, API_ORIGIN) ?? null;

const toAuthUser = (u: ApiUser): AuthUser => {
  const isMember = u.role === 'member';
  return {
    id: String(u.id),
    name: u.username,
    memberId: '',
    role: isMember ? 'member' : 'executive',
    permissions: isMember ? NO_PERMISSIONS : EXECUTIVE_PERMISSIONS,
    eventsNeedApproval: !isMember,
    email: u.email,
    countryCode: u.country_code,
    mobile: u.mobile_number,
    address: u.address,
    photoUrl: photoUrl(u.profile_image),
    profileComplete: u.steps === 2,
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  /** Saves the login returned by the backend and returns the signed-in user. */
  completeLogin: (data: AuthData, remember?: boolean) => Promise<AuthUser>;
  /** Applies the user returned after a profile change. */
  updateUser: (user: ApiUser) => Promise<void>;
  /** Logs out on the backend and on this device. */
  signOut: () => Promise<void>;
  /** Dev only: view the app as a mock user. Does not change the backend login. */
  switchMockUser: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ initialUser = null, children }: { initialUser?: AuthUser | null; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  useEffect(() => {
    setSessionExpiredHandler((message) => {
      setUser(null);
      endSession().catch(() => {});
      Alert.alert('Please login again', message);
      resetToLogin();
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const completeLogin = useCallback(async (data: AuthData, remember = true) => {
    const signedIn = toAuthUser(data.userData);
    await startSession(data.token, signedIn, remember);
    setUser(signedIn);
    return signedIn;
  }, []);

  const updateUser = useCallback(async (next: ApiUser) => {
    const updated = toAuthUser(next);
    setUser(updated);
    await updateSessionUser(updated).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    // The device logs out even if the backend can't be reached.
    await authApi.logout().catch(() => {});
    await endSession().catch(() => {});
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      completeLogin,
      updateUser,
      signOut,
      switchMockUser: (id: string) => setUser(MOCK_USERS.find((u) => u.id === id) ?? null),
    }),
    [user, completeLogin, updateUser, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const hasPermission = (user: AuthUser | null, permission: Permission) => !!user?.permissions[permission];

export const canViewExpenses = (user: AuthUser | null) => hasPermission(user, 'expenses');
