import type { Language } from '../theme';

export const strings = {
  appName: {
    gu: 'શ્રી ગામટોળા યુવક મિત્ર મંડળ',
    hi: 'श्री गामटोला युवक मित्र मंडल',
    en: 'Shri Gamtola Yuvak Mitra Mandal',
  },
  tagline: {
    gu: 'સમાજ સાંસ્કૃતિક પ્રવૃત્તિ',
    hi: 'समाज सांस्कृतिक गतिविधि',
    en: 'Society Cultural Activity',
  },
  onboardingTitle: {
    gu: 'આપણી સંસ્કૃતિ, આપણું ગૌરવ',
    hi: 'हमारी संस्कृति, हमारा गौरव',
    en: 'Our Culture, Our Pride',
  },
  onboardingBody: {
    gu: 'ઉત્સવો, કાર્યક્રમો અને સમાજની પ્રવૃત્તિઓ સાથે જોડાયેલા રહો.',
    hi: 'त्योहारों, कार्यक्रमों और समाज की गतिविधियों से जुड़े रहें।',
    en: 'Stay connected with festivals, events and community activities.',
  },
  getStarted: { gu: 'શરૂ કરો', hi: 'शुरू करें', en: 'Get Started' },
  chooseLanguage: { gu: 'ભાષા પસંદ કરો', hi: 'भाषा चुनें', en: 'Choose Language' },
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
  login: { gu: 'લૉગિન', hi: 'लॉगिन', en: 'Login' },
  loading: { gu: 'લોડ થઈ રહ્યું છે...', hi: 'लोड हो रहा है...', en: 'Loading...' },
  comingSoon: { gu: 'ટૂંક સમયમાં', hi: 'जल्द आ रहा है', en: 'Coming soon' },
} satisfies Record<string, Record<Language, string>>;

export const languages: { code: Language; label: string; native: string; badge: string }[] = [
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', badge: 'ગ' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', badge: 'हि' },
  { code: 'en', label: 'English', native: 'English', badge: 'A' },
];

export const t = (key: keyof typeof strings, lang: Language) => strings[key][lang];
