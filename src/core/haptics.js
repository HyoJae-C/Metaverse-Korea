// Vibration and screen shake, both behind one setting (Settings → Vibration).
// Phones that can vibrate (Android) buzz; everyone else gets the shake.
const KEY = 'mk.haptics';
let on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch { /* ignore */ }
export const haptics = {
  get on() { return on; },
  set on(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ } },
};
export function buzz(pattern) {
  if (on) try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
// Shake these elements once (CSS class .shake-big / .shake-small).
export function shake(els, big = true) {
  if (!on || matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const cls = big ? 'shake-big' : 'shake-small';
  for (const e of els) {
    if (!e) continue;
    e.classList.remove(cls);
    void e.offsetWidth; // restart the animation
    e.classList.add(cls);
    e.addEventListener('animationend', () => e.classList.remove(cls), { once: true });
  }
}
