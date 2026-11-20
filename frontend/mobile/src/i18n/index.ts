import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import type { Language } from '../theme';
import { translations } from './translations';

const SUPPORTED: Language[] = ['gu', 'hi', 'en'];

let currentLanguage: Language = 'gu';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAppLanguage = () => currentLanguage;

/** Applies the language saved on a previous launch, if any. */
export async function loadSavedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.language);
    if (saved && SUPPORTED.includes(saved as Language)) currentLanguage = saved as Language;
  } catch {
    // Keep the default language if storage is unavailable.
  }
}

/** Changes the app language at once (every screen using useT re-renders) and remembers it. */
export async function setAppLanguage(lang: Language) {
  currentLanguage = lang;
  listeners.forEach((listener) => listener());
  await AsyncStorage.setItem(STORAGE_KEYS.language, lang);
}

type Vars = Record<string, string | number>;

/**
 * The app's text in the current language. The key is the English text itself:
 *   t('Upload Photos / Videos')               → "ફોટા / વિડિઓ અપલોડ કરો" in Gujarati
 *   t('Uploading {done} of {total}', { done: 1, total: 3 })
 * Text with no translation (names, event titles typed by people) is returned as it is, so t() is safe on any string.
 * Backend messages and category names already arrive translated (the app sends Accept-Language).
 */
export function t(text: string, vars?: Vars): string {
  const entry = currentLanguage === 'en' ? undefined : translations[text];
  let out = entry?.[currentLanguage as 'gu' | 'hi'] ?? text;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

/** The current language; the component re-renders when it changes. */
export function useLanguage() {
  return useSyncExternalStore(subscribe, getAppLanguage);
}

/** t() for a component: also re-renders the component when the language changes. */
export function useT() {
  useLanguage();
  return t;
}
