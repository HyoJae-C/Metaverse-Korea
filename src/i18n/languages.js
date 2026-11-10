// The languages the game speaks, and how to load each one. English is built
// in; every other language is a separate file fetched only when it is picked,
// so a player downloads one language, not twelve.

// Shown in this order on the start screen and in settings (Yozi's order).
export const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'zht', label: '繁體中文' }, // made from the simplified text (core/i18n.js)
  { code: 'zh', label: '简体中文' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'fr', label: 'Français' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

// Language files by code. 繁體中文 (zht) is made from the simplified text.
export const PACKS = {
  ko: () => import('./ko.js').then((m) => m.KO),
  ja: () => import('./ja.js').then((m) => m.JA),
  zh: () => import('./zh.js').then((m) => m.ZH),
  zht: () => import('./zh.js').then((m) => m.ZH),
  id: () => import('./id.js').then((m) => m.ID),
  fr: () => import('./fr.js').then((m) => m.FR),
  vi: () => import('./vi.js').then((m) => m.VI),
  th: () => import('./th.js').then((m) => m.TH),
  hi: () => import('./hi.js').then((m) => m.HI),
  ar: () => import('./ar.js').then((m) => m.AR),
  es: () => import('./es.js').then((m) => m.ES),
};

// Place names that OSM may not carry in every language. Only verified,
// widely used names go here.
export const REGION_NAMES = {
  'another-seoul': { // the first stop: Seongsu-dong
    en: 'Seongsu-dong', ko: '성수동', ja: '聖水洞', zh: '圣水洞', zht: '聖水洞', es: 'Seongsu-dong',
  },
  seoul: { en: 'Seoul', ko: '서울', ja: 'ソウル', zh: '首尔', zht: '首爾', es: 'Seúl' },
};
