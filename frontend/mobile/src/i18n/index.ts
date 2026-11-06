import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import type { Language } from '../theme';

const SUPPORTED: Language[] = ['gu', 'hi', 'en'];

let currentLanguage: Language = 'gu';

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

export async function setAppLanguage(lang: Language) {
  currentLanguage = lang;
  await AsyncStorage.setItem(STORAGE_KEYS.language, lang);
}
