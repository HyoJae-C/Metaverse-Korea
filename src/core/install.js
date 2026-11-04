// "Add to Home Screen": which way of installing fits this browser.
// Pure helpers (tested in tests/install.test.mjs); the panel lives in
// ui/install-ui.js.

// In-app browsers (KakaoTalk, LINE, Instagram, Facebook, WeChat, Naver,
// Daum, TikTok…) cannot add a page to the home screen: open Safari/Chrome.
const IN_APP = /KAKAOTALK|\bLine\/|Instagram|FBAN|FBAV|FB_IAB|MicroMessenger|NAVER\(inapp|DaumApps|Snapchat|musical_ly|TikTok|Twitter|\bwv\)/i;

export function isIOS(ua = '', platform = '', touchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ says it is a Mac; a Mac with a touch screen is an iPad.
  return /Mac/i.test(platform || ua) && touchPoints > 1;
}

// One of:
//  'installed' - already opened from the home screen
//  'prompt'    - the browser offers its own install dialog (Chrome, Edge, Samsung Internet…)
//  'inapp'     - inside another app's browser: open in Safari/Chrome first
//  'ios'       - Safari (or Chrome/Edge on iOS 16.4+): Share → Add to Home Screen
//  'android'   - Android browser without the dialog: menu → Add to Home screen
//  'desktop'   - a computer: install icon in the address bar, or the menu
export function installMode({ ua = '', platform = '', touchPoints = 0, standalone = false, canPrompt = false } = {}) {
  if (standalone) return 'installed';
  if (IN_APP.test(ua)) return 'inapp';
  if (canPrompt) return 'prompt';
  if (isIOS(ua, platform, touchPoints)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// The small "add to home screen" nudge: on phones and tablets only, after a
// few minutes of play, at most twice and never again once dismissed or used.
export const NUDGE_AFTER_MS = 3 * 60 * 1000;
export const NUDGE_MAX = 2;
export const NUDGE_GAP_MS = 20 * 60 * 60 * 1000; // not again the same day
export function shouldNudge({ mode, touch, shown = 0, lastAt = 0, done = false, now = Date.now() }) {
  if (done || !touch) return false;
  if (mode === 'installed' || mode === 'desktop') return false;
  if (shown >= NUDGE_MAX) return false;
  return !lastAt || now - lastAt >= NUDGE_GAP_MS;
}
