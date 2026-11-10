// The language picker: a list of buttons, and on the start screen a dropdown
// (the current language on a button; tap it to open the list). Shared by the
// start screen (boot.js) and the settings panel (main.js).
import { LANGUAGES, getLanguage } from '../core/i18n.js';

// Language list: one row per language. On the start screen it is a dropdown
// (the current language on a button; tap it to open the list below).
export function renderLangList(el, onPick) {
  el.innerHTML = '';
  for (const l of LANGUAGES) {
    const b = document.createElement('button');
    b.textContent = l.label;
    b.lang = l.code;
    if (l.rtl) b.dir = 'rtl';
    b.setAttribute('aria-pressed', String(l.code === getLanguage()));
    b.onclick = () => onPick(l.code);
    el.appendChild(b);
  }
}
export function renderLangDropdown(el, onPick) {
  const cur = LANGUAGES.find((l) => l.code === getLanguage()) || LANGUAGES.find((l) => l.code === 'en');
  el.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'lang-current';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span>🌐</span><span class="lang-name"></span><span class="lang-caret">▾</span>';
  btn.querySelector('.lang-name').textContent = cur.label;
  const list = document.createElement('div');
  list.className = 'lang-list';
  list.hidden = true;
  renderLangList(list, onPick);
  btn.onclick = () => {
    list.hidden = !list.hidden;
    btn.setAttribute('aria-expanded', String(!list.hidden));
  };
  el.append(btn, list);
}
