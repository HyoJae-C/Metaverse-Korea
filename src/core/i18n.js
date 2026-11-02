import { LANGUAGES, STRINGS } from '../i18n/strings.js';

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
  document.documentElement.lang = code === 'zh' ? 'zh-Hans' : code;
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
  const s = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Pick the best entry from a {en, ko, ...} name object for the current language.
export function localName(names, lang = current) {
  if (!names) return null;
  return names[lang] || names.en || names.ko || Object.values(names)[0];
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
