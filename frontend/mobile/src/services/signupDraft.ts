// /verify-otp needs the sign-up details again. They include the password, so they stay in
// memory only (not in navigation params or storage) and are cleared once verified.

export type SignupDraft = { email: string; country_code: string; mobile_number: string; password: string };

let draft: SignupDraft | null = null;

export const setSignupDraft = (details: SignupDraft) => {
  draft = details;
};

export const getSignupDraft = () => draft;

export const clearSignupDraft = () => {
  draft = null;
};
