import { File } from 'expo-file-system';
import { getDeviceFields } from '../services/device';
import { getAppLanguage } from '../i18n';
import { request } from './client';

/** The user object the backend returns (`sanitizeUser` in backend/config/common.js). */
export type ApiUser = {
  id: number;
  role: 'super_admin' | 'executive' | 'member';
  username: string;
  email: string;
  country_code: string;
  mobile_number: string;
  profile_image: string | null;
  address: string | null;
  language: string;
  is_verified: 0 | 1;
  /** 1 = profile still to complete, 2 = completed. */
  steps: number;
  created_at?: string;
};

export type AuthData = { userData: ApiUser; token: string };
export type ImageFile = { uri: string; name: string; type: string };
type ResendData = { resend_after_seconds: number };

type MobileNumber = { country_code: string; mobile_number: string };
type SignupDetails = MobileNumber & { email: string; password: string };

// Expo's fetch can't send React Native's usual { uri, name, type } file: it throws before sending.
// It reads the file through bytes() instead; the type is passed on because the backend checks it.
const toUploadPart = ({ uri, name, type }: ImageFile) => ({
  name,
  type,
  bytes: async () => new Uint8Array(await new File(uri).arrayBuffer()),
});

const toForm = (fields: Record<string, string | undefined>, image?: ImageFile | null) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  if (image) form.append('profile_image', toUploadPart(image) as unknown as Blob);
  return form;
};

/** Sign-up step 1: mails the OTP. Nothing is saved until verifyOtp succeeds. */
export const signUp = (details: SignupDetails & { confirm_password: string }) =>
  request<ResendData>('POST', '/auth/signup', { body: { ...details, language: getAppLanguage() } });

export const login = async (credentials: { password: string } & ({ email: string } | MobileNumber)) =>
  request<AuthData>('POST', '/auth/login', { body: { ...credentials, ...(await getDeviceFields()) } });

/** Sends the "Login with OTP" code, and resends either kind of code. */
export const sendOtp = (target: { otp_purpose: 'signup'; email: string } | ({ otp_purpose: 'login' } & MobileNumber)) =>
  request<ResendData>('POST', '/auth/send-otp', { body: target });

export const verifySignupOtp = async (otp: string, details: SignupDetails) =>
  request<AuthData>('POST', '/auth/verify-otp', {
    body: { ...details, otp, otp_purpose: 'signup', language: getAppLanguage(), ...(await getDeviceFields()) },
  });

export const verifyLoginOtp = async (otp: string, mobile: MobileNumber) =>
  request<AuthData>('POST', '/auth/verify-otp', {
    body: { ...mobile, otp, otp_purpose: 'login', ...(await getDeviceFields()) },
  });

/** Sign-up final step. */
export const completeProfile = (fields: { username: string; address: string }, image?: ImageFile | null) =>
  request<{ userData: ApiUser }>('PUT', '/auth/complete-profile', {
    form: toForm({ ...fields, accept_terms: '1' }, image),
  });

/** The logged-in user's current details from the server. */
export const getProfile = () => request<{ userData: ApiUser }>('GET', '/auth/profile');

/** Only the fields passed are changed. A new email is saved after verifyEmailChange. */
export const editProfile = (fields: { username?: string; address?: string; email?: string }, image?: ImageFile | null) =>
  request<{ userData: ApiUser; new_email?: string; resend_after_seconds?: number }>('PUT', '/auth/edit-profile', {
    form: toForm(fields, image),
  });

export const verifyEmailChange = (email: string, otp: string) =>
  request<{ userData: ApiUser }>('POST', '/auth/verify-email-change', { body: { email, otp } });

export const changePassword = (fields: { old_password: string; new_password: string; confirm_password: string }) =>
  request('PUT', '/auth/change-password', { body: fields });

export const logout = () => request('DELETE', '/auth/logout');
