import { mediaFolder, uploadMedia } from '../services/media';
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

// A new photo goes straight to Cloudinary (society_app/<env>/profiles/user_<id>); the backend only stores its link
const withPhoto = async <T extends object>(fields: T, image?: ImageFile | null, userId?: string) => {
  if (!image) return fields;
  const photo = await uploadMedia({ uri: image.uri, kind: 'image', mimeType: image.type }, mediaFolder('profile', userId));
  return { ...fields, profile_image_url: photo.url };
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
export const completeProfile = async (fields: { username: string; address: string }, image?: ImageFile | null, userId?: string) =>
  request<{ userData: ApiUser }>('PUT', '/auth/complete-profile', {
    body: await withPhoto({ ...fields, accept_terms: true }, image, userId),
  });

/** The logged-in user's current details from the server. */
export const getProfile = () => request<{ userData: ApiUser }>('GET', '/auth/profile');

/** Only the fields passed are changed. A new email is saved after verifyEmailChange. */
export const editProfile = async (
  fields: { username?: string; address?: string; email?: string },
  image?: ImageFile | null,
  userId?: string,
) =>
  request<{ userData: ApiUser; new_email?: string; resend_after_seconds?: number }>('PUT', '/auth/edit-profile', {
    body: await withPhoto(fields, image, userId),
  });

export const verifyEmailChange = (email: string, otp: string) =>
  request<{ userData: ApiUser }>('POST', '/auth/verify-email-change', { body: { email, otp } });

export const changePassword = (fields: { old_password: string; new_password: string; confirm_password: string }) =>
  request('PUT', '/auth/change-password', { body: fields });

export const logout = () => request('DELETE', '/auth/logout');
