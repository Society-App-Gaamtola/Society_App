import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import * as authApi from '../api/auth';
import type { ApiUser, AuthData } from '../api/auth';
import { ApiCode, ApiError, mediaUrl, setAuthToken, setSessionExpiredHandler } from '../api/client';
import { MOCK_USERS } from '../data/seeds';
import { resetToLogin } from '../navigation/navigationRef';
import { endSession, startSession, updateSessionUser } from '../services/session';
import type { AuthUser, Permission, Permissions } from '../types';

const NO_PERMISSIONS: Permissions = { events: false, notices: false, donations: false, expenses: false, reports: false, media: false };

// The login response has no permissions yet, so executives get these until it does.
const EXECUTIVE_PERMISSIONS: Permissions = { events: true, notices: true, donations: true, expenses: false, reports: true, media: true };

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
    photoUrl: mediaUrl(u.profile_image),
    profileComplete: u.steps === 2,
    emailVerified: u.is_verified === 1,
    memberSince: u.created_at ?? null,
  };
};

export type LoginAs = AuthUser['role'];

const WRONG_LOGIN_TAB: Record<LoginAs, string> = {
  executive: 'This is not an executive account. Please use Member login.',
  member: 'This is an executive account. Please use Executive login.',
};

type AuthContextValue = {
  user: AuthUser | null;
  /** The tab chosen on the login screen. completeLogin refuses an account of the other role. */
  setLoginAs: (role: LoginAs | null) => void;
  /** Saves the login returned by the backend and returns the signed-in user. */
  completeLogin: (data: AuthData, remember?: boolean) => Promise<AuthUser>;
  /** Applies the user returned after a profile change. */
  updateUser: (user: ApiUser) => Promise<void>;
  /** Reloads the user from the server. Keeps the saved copy if the server can't be reached. */
  refreshUser: () => Promise<void>;
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

  const loginAs = useRef<LoginAs | null>(null);
  const setLoginAs = useCallback((role: LoginAs | null) => {
    loginAs.current = role;
  }, []);

  // Password login, OTP login and sign-up all end here, so the role check covers all of them.
  const completeLogin = useCallback(async (data: AuthData, remember = true) => {
    const signedIn = toAuthUser(data.userData);
    const expected = loginAs.current;
    if (expected && signedIn.role !== expected) {
      // Close the session the backend just opened, so the refused login leaves nothing behind.
      setAuthToken(data.token);
      await authApi.logout().catch(() => {});
      setAuthToken(null);
      throw new ApiError(WRONG_LOGIN_TAB[expected], ApiCode.error);
    }
    await startSession(data.token, signedIn, remember);
    setUser(signedIn);
    return signedIn;
  }, []);

  const updateUser = useCallback(async (next: ApiUser) => {
    const updated = toAuthUser(next);
    setUser(updated);
    await updateSessionUser(updated).catch(() => {});
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.getProfile();
    await updateUser(data.userData);
  }, [updateUser]);

  // The saved copy may be out of date (changed on another device or by an admin), so reload it once on start.
  useEffect(() => {
    if (initialUser) refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setLoginAs,
      completeLogin,
      updateUser,
      refreshUser,
      signOut,
      switchMockUser: (id: string) => setUser(MOCK_USERS.find((u) => u.id === id) ?? null),
    }),
    [user, setLoginAs, completeLogin, updateUser, refreshUser, signOut],
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
