import type { Language } from '../theme';

const strings = {
  continue: { gu: 'આગળ વધો', hi: 'आगे बढ़ें', en: 'Continue' },
  selectLanguage: { gu: 'તમારી ભાષા પસંદ કરો', hi: 'अपनी भाषा चुनें', en: 'Select Your Language' },
  selectLanguageHint: {
    gu: 'આગળ વધવા માટે તમારી પસંદગીની ભાષા પસંદ કરો.',
    hi: 'आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।',
    en: 'Choose your preferred language to continue.',
  },
  changeLanguageInfo: {
    gu: 'તમે સેટિંગ્સમાં ગમે ત્યારે ભાષા બદલી શકો છો.',
    hi: 'आप सेटिंग्स में कभी भी भाषा बदल सकते हैं।',
    en: 'You can change your language anytime in Settings.',
  },
  loading: { gu: 'લોડ થઈ રહ્યું છે...', hi: 'लोड हो रहा है...', en: 'Loading...' },
} satisfies Record<string, Record<Language, string>>;

export const languages: { code: Language; label: string; native: string; badge: string }[] = [
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', badge: 'ગ' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', badge: 'हि' },
  { code: 'en', label: 'English', native: 'English', badge: 'A' },
];

export const t = (key: keyof typeof strings, lang: Language) => strings[key][lang];
