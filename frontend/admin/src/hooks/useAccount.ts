import { accountApi, type ProfileChanges } from '@/services/account';
import { useBackendAction, useBackendOne } from './useBackend';

/** Cache name for the admin's own profile (the top bar name and the Profile page share it) */
const KEY = 'myProfile';

export const useMyProfile = () => useBackendOne(KEY, 'me', () => accountApi.get());

export const useEditProfile = () => useBackendAction([KEY], (changes: ProfileChanges) => accountApi.edit(changes));

export const useVerifyEmail = () =>
  useBackendAction([KEY], ({ email, otp }: { email: string; otp: string }) => accountApi.verifyEmail(email, otp));

export const useChangePassword = () =>
  useBackendAction([], (body: { old_password: string; new_password: string; confirm_password: string }) => accountApi.changePassword(body));
