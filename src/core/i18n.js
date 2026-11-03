import { LANGUAGES, STRINGS } from '../i18n/strings.js';
import { s2t } from '../i18n/hant.js';

const STORAGE_KEY = 'mk.lang';
let current = 'en';
const listeners = new Set();

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
  applyTranslations(document);
  listeners.forEach((fn) => fn(code));
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
