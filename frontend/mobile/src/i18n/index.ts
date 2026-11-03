import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '../theme';
import { strings } from './strings';

export const LANGUAGE_STORAGE_KEY = 'app_language';
const supported: Language[] = ['gu', 'hi', 'en'];

const resources = Object.fromEntries(
  supported.map((lang) => [
    lang,
    {
      translation: Object.fromEntries(
        Object.entries(strings).map(([key, value]) => [key, value[lang]]),
      ),
    },
  ]),
);

i18n.use(initReactI18next).init({
  resources,
  lng: 'gu',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Applies the language saved on a previous launch, if any. */
export async function loadSavedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && supported.includes(saved as Language)) await i18n.changeLanguage(saved);
  } catch {
    // Keep the default language if storage is unavailable.
  }
}

export async function setAppLanguage(lang: Language) {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export default i18n;
