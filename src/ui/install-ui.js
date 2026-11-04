// "Add to Home Screen": a settings row, a guide sheet that fits the browser
// (Android/desktop install dialog, iPhone/iPad Safari steps, or "open in
// Safari/Chrome" inside KakaoTalk, Instagram…), and a small one-off nudge on
// phones after a few minutes of play. The service worker is registered here.
import { installMode, isIOS, shouldNudge, NUDGE_AFTER_MS } from '../core/install.js';

let deferred = null; // the browser's install dialog, saved for our button
const waiting = new Set();
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we show our own button instead of the mini bar
  deferred = e;
  waiting.forEach((f) => f());
});
addEventListener('appinstalled', () => {
  deferred = null;
  try { localStorage.setItem('as.installDone', '1'); } catch { /* ignore */ }
  waiting.forEach((f) => f());
});

// Offline cache + "installable" for Chrome. Only in the built site (not in
// `vite` dev, where it would cache files that keep changing).
if (import.meta.env?.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.info('[sw] not registered:', e.message));
  });
}

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches
  || matchMedia('(display-mode: fullscreen)').matches
  || navigator.standalone === true;

const mode = () => installMode({
  ua: navigator.userAgent,
  platform: navigator.platform,
  touchPoints: navigator.maxTouchPoints || 0,
  standalone: isStandalone(),
  canPrompt: !!deferred,
});

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export function initInstall({ $, t, onLanguageChange, isTouch, cloud, toast }) {
  const row = $('install-btn');
  const panel = $('install-panel');
  const card = panel.querySelector('.install-card');
  const nudge = $('install-nudge');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const steps = (keys) => {
    const ol = el('ol', 'install-steps');
    keys.forEach((k) => ol.append(el('li', null, t(k))));
    return ol;
  };

  function render() {
    const m = mode();
    const parts = [el('img', 'install-icon'), el('h2', null, t('install.title')), el('p', 'install-why', t('install.why'))];
    parts[0].src = './icon-192.png';
    parts[0].alt = '';
    if (m === 'installed') {
      parts.push(el('p', 'install-done', t('install.done')));
    } else if (m === 'prompt') {
      const b = el('button', 'primary', `📲 ${t('install.button')}`);
      b.onclick = async () => {
        const ev = deferred;
        if (!ev) return render();
        deferred = null;
        ev.prompt();
        const { outcome } = await ev.userChoice.catch(() => ({}));
        if (outcome === 'accepted') { store.set('as.installDone', '1'); close(); toast?.(t('install.thanks')); } else render();
      };
      parts.push(b);
    } else if (m === 'ios') {
      parts.push(steps(['install.ios1', 'install.ios2', 'install.ios3']));
      if (!/Safari/i.test(navigator.userAgent) || /CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent)) parts.push(el('p', 'fine', t('install.iosOther')));
    } else if (m === 'android') {
      parts.push(steps(['install.android1', 'install.android2', 'install.android3']));
    } else if (m === 'inapp') {
      parts.push(el('p', 'install-warn', t('install.inapp')));
      const b = el('button', 'primary', `🔗 ${t('install.copy')}`);
      b.onclick = async () => {
        const url = location.origin + location.pathname;
        try { await navigator.clipboard.writeText(url); toast?.(t('install.copied')); } catch { prompt(t('install.copy'), url); }
      };
      parts.push(b);
    } else {
      parts.push(el('p', 'install-desktop', t('install.desktop')));
    }
    // On iPhone/iPad the home screen app keeps its own save, separate from
    // Safari: a guest should link Google first, then sign in in the app.
    const iosLike = isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints || 0);
    if (iosLike && m !== 'installed' && cloud?.guest) parts.push(el('p', 'install-note', t('install.iosSave')));
    const done = el('button', 'chip install-close', t('settings.done'));
    done.onclick = close;
    card.replaceChildren(...parts, done);
  }

  function open() {
    $('settings-panel').hidden = true;
    hideNudge(true);
    render();
    panel.hidden = false;
  }
  function close() { panel.hidden = true; }

  const refreshRow = () => {
    row.hidden = mode() === 'installed';
    row.querySelector('.setting-label').textContent = t('install.row');
    nudge.querySelector('span').textContent = t('install.nudge');
    if (!panel.hidden) render();
  };

  // Nudge: shown once in a while on phones; tapping it or ✕ counts.
  let nudgeTimer = 0;
  function hideNudge(done) {
    nudge.hidden = true;
    if (done) store.set('as.installNudgeDone', '1');
  }
  function maybeNudge() {
    const shown = Number(store.get('as.installNudgeN')) || 0;
    const ok = shouldNudge({
      mode: mode(), touch: isTouch, shown,
      lastAt: Number(store.get('as.installNudgeAt')) || 0,
      done: !!store.get('as.installNudgeDone') || !!store.get('as.installDone'),
    });
    if (!ok) return;
    store.set('as.installNudgeN', String(shown + 1));
    store.set('as.installNudgeAt', String(Date.now()));
    nudge.hidden = false;
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => hideNudge(false), 15000);
  }

  row.onclick = open;
  nudge.querySelector('.install-go').onclick = open;
  nudge.querySelector('.install-x').onclick = () => hideNudge(true);
  panel.onclick = (e) => { if (e.target === panel) close(); };
  waiting.add(refreshRow);
  onLanguageChange(refreshRow);
  refreshRow();
  setTimeout(maybeNudge, NUDGE_AFTER_MS);
  return { open };
}
