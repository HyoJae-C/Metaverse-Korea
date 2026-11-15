// Phone preview for operators (admin.html's 📱 Phone tab, Yozi 2026-11-15):
// the game inside an iframe with ?phone=ios|android plays as a phone would,
// on a computer. Only switched on inside a frame, so a shared link does
// nothing.
//
// - It is a touch device: (pointer: coarse) matches, in script and in CSS,
//   with a phone's user agent and screen size. The mouse works the joystick
//   (input.js uses pointer events).
// - It is its own guest: its saved data (and sign-in) live under their own
//   key prefix and its tab channels have their own names, so it never takes
//   the save or the game from the operator's real game tab ("other tab" /
//   "other device", #718/#719).
// - It sends no numbers for the operator page (cloud-save.js checks
//   PHONE_PREVIEW), so it is not counted as a player there.
//
// Imported first by boot.js: everything after it already sees the phone.

const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};
export const PREFIX = 'phonepreview:';

// Media query text as a phone reads it: true pointer/hover tests become a
// test that always matches, false ones a test that never does.
const YES = '(min-width: 0px)', NO = '(max-width: 0px)';
export function phoneMedia(q) {
  return String(q)
    .replace(/\((any-)?pointer:\s*coarse\)/g, YES).replace(/\((any-)?pointer:\s*fine\)/g, NO)
    .replace(/\((any-)?hover:\s*none\)/g, YES).replace(/\((any-)?hover:\s*hover\)/g, NO);
}

// localStorage under a prefix (key()/length only see our own keys).
export function prefixedStorage(real, prefix = PREFIX) {
  const own = () => {
    const out = [];
    for (let i = 0; i < real.length; i++) { const k = real.key(i); if (k?.startsWith(prefix)) out.push(k.slice(prefix.length)); }
    return out;
  };
  return {
    get length() { return own().length; },
    key: (i) => own()[i] ?? null,
    getItem: (k) => real.getItem(prefix + k),
    setItem: (k, v) => real.setItem(prefix + k, String(v)),
    removeItem: (k) => real.removeItem(prefix + k),
    clear: () => { for (const k of own()) real.removeItem(prefix + k); },
  };
}

function framed() { try { return window.top !== window; } catch { return true; } }

export const PHONE_PREVIEW = (() => {
  if (typeof window === 'undefined' || !framed()) return null;
  const q = new URLSearchParams(location.search);
  const kind = q.get('phone');
  if (!UA[kind]) return null;
  const define = (obj, key, value) => { try { Object.defineProperty(obj, key, { configurable: true, get: () => value }); } catch { /* left as is */ } };
  define(navigator, 'userAgent', UA[kind]);
  define(navigator, 'platform', kind === 'ios' ? 'iPhone' : 'Linux armv81');
  define(navigator, 'maxTouchPoints', 5);
  const w = Number(q.get('w')) || 390, h = Number(q.get('h')) || 844;
  for (const [k, v] of [['width', w], ['height', h], ['availWidth', w], ['availHeight', h]]) define(screen, k, v);
  if (!('ontouchstart' in window)) window.ontouchstart = null;
  if (!('ontouchend' in document)) document.ontouchend = null;

  const mm = window.matchMedia.bind(window);
  window.matchMedia = (query) => mm(phoneMedia(query));
  const fixSheets = () => {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // another origin's sheet
      const walk = (list) => {
        for (const r of list) {
          if (r.media && r.cssRules) { const m = phoneMedia(r.media.mediaText); if (m !== r.media.mediaText) r.media.mediaText = m; }
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(rules);
    }
  };
  fixSheets();
  addEventListener('DOMContentLoaded', fixSheets);
  addEventListener('load', fixSheets);
  // CSS that arrives later (lazy chunks) gets the same treatment.
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.tagName === 'STYLE') fixSheets();
      else if (n.tagName === 'LINK') n.addEventListener('load', fixSheets, { once: true });
    }
  }).observe(document.head || document.documentElement, { childList: true });

  try { define(window, 'localStorage', prefixedStorage(window.localStorage)); } catch { /* storage blocked */ }
  try { define(window, 'sessionStorage', prefixedStorage(window.sessionStorage)); } catch { /* storage blocked */ }
  // Sign-in locks (supabase-js) by their own names too, so the two never wait on each other.
  const locks = navigator.locks;
  if (locks?.request) { const req = locks.request.bind(locks); try { locks.request = (name, ...rest) => req(PREFIX + name, ...rest); } catch { /* left as is */ } }
  const BC = window.BroadcastChannel;
  if (BC) window.BroadcastChannel = class extends BC { constructor(name) { super(PREFIX + name); } };
  document.documentElement.classList.add('phone-preview');
  return { kind };
})();
