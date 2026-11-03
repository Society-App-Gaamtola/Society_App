import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type UserRole = 'member' | 'executive';

export type Permission = 'events' | 'notices' | 'donations' | 'expenses' | 'reports' | 'media';
export type Permissions = Record<Permission, boolean>;

export type AuthUser = {
  id: string;
  name: string;
  memberId: string;
  role: UserRole;
  permissions: Permissions;
  /** When true, events this user posts go to the admin for approval first. */
  eventsNeedApproval: boolean;
};

const NO_PERMISSIONS: Permissions = {
  events: false,
  notices: false,
  donations: false,
  expenses: false,
  reports: false,
  media: false,
};

// Mock users until the login API is connected.
export const MOCK_USERS: AuthUser[] = [
  {
    id: 'm1',
    name: 'Ramesh Patel',
    memberId: 'GYMM-1024',
    role: 'member',
    permissions: NO_PERMISSIONS,
    eventsNeedApproval: false,
  },
  {
    id: 'm2',
    name: 'Dhaval Patel',
    memberId: 'GYMM-0042',
    role: 'executive',
    permissions: { events: true, notices: true, donations: true, expenses: false, reports: true, media: true },
    eventsNeedApproval: true,
  },
];

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  /** Signs in the default mock user; replace with the real login response later. */
  signInMock: () => void;
  /** Dev only: switch to another mock user by id. */
  switchMockUser: (id: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(MOCK_USERS[0]);
  const value = useMemo(
    () => ({
      user,
      setUser,
      signInMock: () => setUser(MOCK_USERS[0]),
      switchMockUser: (id: string) => setUser(MOCK_USERS.find((u) => u.id === id) ?? null),
    }),
    [user],
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
