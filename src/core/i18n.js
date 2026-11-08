import { LANGUAGES, PACKS } from '../i18n/languages.js';
import { EN } from '../i18n/en.js';
import { s2t } from '../i18n/hant.js';

const STORAGE_KEY = 'mk.lang';
let current = 'en';
const listeners = new Set();
// Loaded languages. English is built in; the others arrive with loadLanguage()
// (i18n/languages.js), so a player downloads only the language they use.
const STRINGS = { en: EN };
const loading = {};

/** Fetch a language's strings (once). Resolves when t() can use them. */
export function loadLanguage(code) {
  const key = code === 'zht' ? 'zh' : code;
  if (STRINGS[key] || !PACKS[code]) return Promise.resolve();
  return (loading[key] ??= PACKS[code]().then((s) => { STRINGS[key] = s; }).catch((e) => {
    delete loading[key]; // try again next time (offline for a moment)
    console.warn('language', code, e);
  }));
}
export const isLanguageLoaded = (code) => !!STRINGS[code === 'zht' ? 'zh' : code];

export function getSavedLanguage() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === v) ? v : null;
  } catch {
    return null;
  }
}

export function setLanguage(code) {
  if (!LANGUAGES.some((l) => l.code === code)) code = 'en';
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage unavailable: language just won't be remembered */
  }
  document.documentElement.lang = code === 'zh' ? 'zh-Hans' : code === 'zht' ? 'zh-Hant' : code;
  document.body?.classList.toggle('rtl', !!LANGUAGES.find((l) => l.code === code)?.rtl);
  applyTranslations(document);
  listeners.forEach((fn) => fn(code));
  // Not downloaded yet: English shows for a moment, then the page redraws in
  // the picked language. (main.js loads the saved language before start-up.)
  if (!isLanguageLoaded(code)) {
    loadLanguage(code).then(() => {
      if (current !== code || !isLanguageLoaded(code)) return;
      applyTranslations(document);
      listeners.forEach((fn) => fn(code));
    });
  }
}

export function getLanguage() {
  return current;
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, vars = {}) {
  const s = STRINGS[current]?.[key] ?? (current === 'zht' && STRINGS.zh[key] ? s2t(STRINGS.zh[key]) : null) ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Pick the best entry from a {en, ko, ...} name object for the current language.
// 繁體中文 (zht) is made from the simplified Chinese text when a name has
// no zht of its own; Spanish and anything else missing falls back to English.
export function localName(names, lang = current) {
  if (!names) return null;
  if (names[lang]) return names[lang];
  if (lang === 'zht' && names.zh) return s2t(names.zh);
  return names.en || names.ko || Object.values(names)[0];
}
export const pick = localName;
// Browser language → ours (zh-TW, zh-HK and zh-Hant → 繁體).
export function languageFromBrowser(tag = '') {
  const t2 = tag.toLowerCase();
  if (/^zh-(tw|hk|mo|hant)/.test(t2)) return 'zht';
  return t2.slice(0, 2);
}

// Fill every element that has data-i18n="key".
export function applyTranslations(root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

export { LANGUAGES };
