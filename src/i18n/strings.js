// Every language's UI strings in one object, for tests and build scripts.
// The game itself does not import this: it loads only the language in use
// (core/i18n.js, i18n/languages.js). Add a key in en.js first, then in each
// language file. Missing keys fall back to English.
import { EN } from './en.js';
import { KO } from './ko.js';
import { JA } from './ja.js';
import { ZH } from './zh.js';
import { ES } from './es.js';
import { ID } from './id.js';
import { AR } from './ar.js';
import { VI } from './vi.js';
import { HI } from './hi.js';
import { FR } from './fr.js';
import { TH } from './th.js';

export { LANGUAGES, REGION_NAMES } from './languages.js';

export const STRINGS = { en: EN, ko: KO, ja: JA, zh: ZH, es: ES, id: ID, ar: AR, vi: VI, hi: HI, fr: FR, th: TH };
