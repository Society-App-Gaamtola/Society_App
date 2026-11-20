import { fromUtc } from '@/lib/utils';
import { api } from './core/backend';

/**
 * The logged-in Super Admin's own account. These are the app's shared auth APIs (/auth/profile, /auth/edit-profile,
 * /auth/verify-email-change, /auth/change-password, /auth/logout): the same ones members use, open to every role.
 */
export type MyProfile = {
  id: number;
  role: string;
  username: string | null;
  email: string;
  country_code: string;
  mobile_number: string;
  profile_image: string | null;
  address: string | null;
  is_verified: 0 | 1;
  created_at: string;
};

export type ProfileChanges = Partial<{ username: string; address: string; email: string }>;

type EditReply = { userData: MyProfile; new_email?: string; resend_after_seconds?: number };

const local = (p: MyProfile): MyProfile => ({ ...p, created_at: fromUtc(p.created_at) ?? p.created_at });

export const accountApi = {
  get: async () => local((await api<{ userData: MyProfile }>('GET', '/auth/profile')).data.userData),

  /** A new email isn't saved yet: an OTP goes to it (new_email in the reply), then verifyEmail() saves it */
  edit: (changes: ProfileChanges) => api<EditReply>('PUT', '/auth/edit-profile', { body: changes }),

  verifyEmail: (email: string, otp: string) =>
    api<{ userData: MyProfile }>('POST', '/auth/verify-email-change', { body: { email, otp: Number(otp) } }),

  /** Logs out every other device of this account; this browser stays logged in */
  changePassword: (body: { old_password: string; new_password: string; confirm_password: string }) =>
    api<undefined>('PUT', '/auth/change-password', { body }),

  logout: () => api<undefined>('DELETE', '/auth/logout'),
};
