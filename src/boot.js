// First thing the page runs: show the language step of the start screen
// right away, and download the game (main.js, about 1 MB) behind it.
//
// main.js is big, and a phone needs seconds to download and start it. This
// file is tiny, so the start screen is usable almost at once and the game
// arrives while the player picks a language. "Next" stays disabled until
// main.js has set up the following steps (it enables the button).
import { setLanguage, getSavedLanguage, loadLanguage } from './core/i18n.js';
import { renderLangDropdown } from './ui/lang-picker.js';

const $ = (id) => document.getElementById(id);

const game = import('./main.js'); // start downloading now; main.js takes over when it runs
$('next-btn').disabled = true;

const code = getSavedLanguage() || 'en'; // English until you pick one
await loadLanguage(code);
// main.js may already be running on a fast connection: then it drew the picker.
if (!document.body.dataset.gameUp) {
  setLanguage(code);
  const pick = (c) => {
    setLanguage(c);
    if (!document.body.dataset.gameUp) renderLangDropdown($('lang-grid'), pick);
  };
  renderLangDropdown($('lang-grid'), pick);
}
game.catch((e) => console.error('game failed to load', e)); // index.html offers a reload
