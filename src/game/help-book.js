// The game guide (❓ at the top right, next to ⚙️): how to move, earn money,
// get around, fish, decorate your home… Only the button is in the first
// download. The panel and the text in the player's language (src/help/<lang>.js,
// one file per language) come the first time it is tapped; a language
// without its own guide yet shows the English one.
import { getLanguage, onLanguageChange } from '../core/i18n.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { s2t } from '../i18n/hant.js';

// Vite makes one small file per language from this pattern.
const loadBook = (code) => import(`../help/${code}.js`).then((m) => m.HELP);
export const HELP_LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'id', 'vi', 'th', 'ar', 'pt'];
export const helpFileFor = (lang) => {
  const code = lang === 'zht' ? 'zh' : lang;
  return HELP_LANGS.includes(code) ? code : 'en';
};

export function createHelpBook({ $ }) {
  let shownLang = null;
  const ui = lazyPanel(() => import('../ui/help-ui.js').then(({ HelpUI }) => new HelpUI({ root: $('help-panel') })));
  async function fill(lang) {
    const book = await loadBook(helpFileFor(lang)).catch(() => loadBook('en'));
    if (getLanguage() !== lang) return; // changed again meanwhile
    const panel = await ui.ready();
    panel.conv = lang === 'zht' ? s2t : (s) => s;
    panel.setBook(book);
    shownLang = lang;
  }
  async function toggle() {
    if (ui.open) { ui.close(); return; }
    const lang = getLanguage();
    try {
      if (shownLang !== lang) await fill(lang);
      (await ui.ready()).show();
    } catch (e) {
      console.warn('guide failed to load', e); // offline for a moment: tap again
    }
  }
  $('help-btn').onclick = toggle;
  onLanguageChange((lang) => { if (ui.loaded && shownLang && shownLang !== lang) fill(lang); });
  return {
    get open() { return ui.open; },
    close: () => ui.close(),
    toggle,
  };
}
