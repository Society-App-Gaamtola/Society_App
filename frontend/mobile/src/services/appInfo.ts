import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppInfo, type ApiAppInfo } from '../api/user';
import { SOCIETY_NAME, SOCIETY_NAME_GU, STORAGE_KEYS } from '../config';

/**
 * The society's details from App Settings (GET /user/app-info): the English and Gujarati names, the notice
 * categories, contact details and social pages. Saved on the phone, so the header and splash show the right name
 * before the first call (and offline); refreshed after login and whenever the app comes back to the front.
 */
export type AppInfo = Omit<ApiAppInfo, 'society_name_gu' | 'show_gujarati_name' | 'notice_tags'> & {
  society_name_gu: string;
  show_gujarati_name: boolean;
  notice_tags: string[];
};

const DEFAULT_INFO: AppInfo = {
  society_name: SOCIETY_NAME,
  society_name_gu: SOCIETY_NAME_GU,
  show_gujarati_name: true,
  notice_tags: ['important', 'general', 'event'],
  contact_email: '',
  phone: '',
  address: '',
  logo_url: null,
  social_links: [],
};

let info: AppInfo = DEFAULT_INFO;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const publish = (next: AppInfo) => {
  info = next;
  listeners.forEach((listener) => listener());
};

/** The details as last saved (for code outside components: receipts, reports, share text) */
export const getSocietyInfo = () => info;

/** Re-renders when the details change */
export const useAppInfo = () => useSyncExternalStore(subscribe, getSocietyInfo);

/** On start: the details saved on a previous launch, if any */
export async function loadSavedAppInfo() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.appInfo);
    if (saved) info = { ...DEFAULT_INFO, ...JSON.parse(saved) };
  } catch {
    // Keep the defaults when storage is unavailable
  }
}

/** Reads the details from the server (logged-in users only) and saves them. Never throws */
export async function refreshAppInfo() {
  try {
    const { data } = await getAppInfo();
    const next: AppInfo = {
      ...DEFAULT_INFO,
      ...data,
      society_name: data.society_name || SOCIETY_NAME,
      society_name_gu: data.society_name_gu || SOCIETY_NAME_GU,
      show_gujarati_name: data.show_gujarati_name !== false,
      notice_tags: data.notice_tags?.length ? data.notice_tags : DEFAULT_INFO.notice_tags,
    };
    publish(next);
    await AsyncStorage.setItem(STORAGE_KEYS.appInfo, JSON.stringify(next));
  } catch {
    // Offline or logged out: keep the saved details
  }
}

/** A name on two lines (header, splash): broken at the space nearest the middle */
export function twoLines(name: string) {
  const middle = name.length / 2;
  let best = -1;
  for (let i = 0; i < name.length; i += 1) {
    if (name[i] === ' ' && (best < 0 || Math.abs(i - middle) < Math.abs(best - middle))) best = i;
  }
  return best < 0 ? name : `${name.slice(0, best)}\n${name.slice(best + 1)}`;
}

/** A notice category as shown: "garba prasad" → "Garba Prasad" (translated by the caller with t()) */
export const noticeTagLabel = (tag: string) => tag.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
