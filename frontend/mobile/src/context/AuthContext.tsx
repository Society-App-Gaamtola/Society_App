import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import * as authApi from '../api/auth';
import type { ApiUser, AuthData } from '../api/auth';
import { mediaUrl, setSessionExpiredHandler } from '../api/client';
import { resetToLogin } from '../navigation/navigationRef';
import { refreshAppInfo } from '../services/appInfo';
import { endSession, startSession, updateSessionUser } from '../services/session';
import type { AuthUser, Permission, Permissions } from '../types';

const NO_PERMISSIONS: Permissions = { events: false, notices: false, donations: false, expenses: false, reports: false, media: false };

// The sections the backend sent (login / profile): an executive's, as set in the admin panel
const toPermissions = (sections: string[] = []): Permissions => ({
  events: sections.includes('events'),
  notices: sections.includes('notices'),
  donations: sections.includes('donations'),
  expenses: sections.includes('expenses'),
  reports: sections.includes('reports'),
  media: sections.includes('media'),
});

// Everyone logs in the same way; the role comes from the backend (users.role_id). A member the admin makes an
// executive gets the executive screens with the same email and password, after the next profile reload.
// The Super Admin uses the executive screens in the app too (and the admin panel for the rest).
const ROLE_LABEL: Record<ApiUser['role'], string> = {
  member: 'Normal Member',
  executive: 'Executive Member',
  super_admin: 'Super Admin',
};

const toAuthUser = (u: ApiUser): AuthUser => {
  const isMember = u.role === 'member';
  return {
    id: String(u.id),
    name: u.username,
    memberId: u.member_code ?? '',
    role: isMember ? 'member' : 'executive',
    roleLabel: ROLE_LABEL[u.role] ?? 'Normal Member',
    permissions: isMember ? NO_PERMISSIONS : toPermissions(u.permissions?.sections),
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

type AuthContextValue = {
  user: AuthUser | null;
  /** Saves the login returned by the backend and returns the signed-in user. */
  completeLogin: (data: AuthData, remember?: boolean) => Promise<AuthUser>;
  /** Applies the user returned after a profile change. */
  updateUser: (user: ApiUser) => Promise<void>;
  /** Reloads the user from the server. Keeps the saved copy if the server can't be reached. */
  refreshUser: () => Promise<void>;
  /** Logs out on the backend and on this device. */
  signOut: () => Promise<void>;
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

  // Password login, OTP login and sign-up all end here. The account's role decides which screens open
  const completeLogin = useCallback(async (data: AuthData, remember = true) => {
    const signedIn = toAuthUser(data.userData);
    await startSession(data.token, signedIn, remember);
    setUser(signedIn);
    refreshAppInfo(); // the society's names and notice categories (App Settings)
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
    refreshAppInfo();
  }, [updateUser]);

  // The saved copy may be out of date (changed on another device, or the admin changed the role), so reload it on
  // start and whenever the app comes back to the foreground: a member made executive gets the new screens then
  useEffect(() => {
    if (initialUser) refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshUser().catch(() => {});
    });
    return () => subscription.remove();
  }, [user?.id, refreshUser]); // eslint-disable-line react-hooks/exhaustive-deps

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
      refreshUser,
      signOut,
    }),
    [user, completeLogin, updateUser, refreshUser, signOut],
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
