// My lantern on Jogyesa's canopy (core/temple-lanterns.js), wired into the
// street: under the canopy you can hang a lantern or see the ones hanging;
// near the temple the hung lanterns are painted onto the canopy with their
// names (game/temple-lanterns.js). Small on purpose: this is in the first
// download; the panel, the rules and the painter load when first needed.
import { t } from '../core/i18n.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { JOGYESA as J } from '../data/jogyesa.js';

const PRICE = 5000; // (shown on the button; the panel asks the server for the real one)
const PAINT_NEAR = 70; // m from the yard's middle: the hung lanterns are drawn
const REFRESH = 60; // s between looks at the server while near

// game: { scene, off (the Gyeongbokgung district's offset), labels (the name
// tags' layer), root (the panel's element), cloud, wallet, name(), toast(m),
// onHung() }.
export function createTempleLanterns(game) {
  const ok = !!game.off;
  const c = J.canopy;
  const local = (p) => [p.x - game.off[0], p.z - game.off[1]];
  const underCanopy = (p) => { if (!ok) return false; const [x, z] = local(p); return x > c.x0 - 0.5 && x < c.x1 + 0.5 && z > c.z0 - 1.5 && z < c.z1 + 1; };
  const near = (p) => { if (!ok) return false; const [x, z] = local(p); return Math.hypot(x - (c.x0 + c.x1) / 2, z - (c.z0 + c.z1) / 2) < PAINT_NEAR; };

  // The backend (both kinds load with the panel): in Supabase when signed in.
  let mod = null, backend = null;
  const store = () => {
    const live = game.cloud.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(backend instanceof mod.SupabaseTempleLanterns)) backend = new mod.SupabaseTempleLanterns(game.cloud, game.wallet);
    if (!live && !backend) backend = new mod.LocalTempleLanterns(game.wallet);
    return backend;
  };
  const loadCore = () => (mod ? Promise.resolve(mod) : import('../core/temple-lanterns.js').then((m) => (mod = m)));

  let painter = null, painting = null, refreshT = 0;
  const refresh = async () => {
    await loadCore();
    const r = await store().active();
    if (!r.error && painter) painter.set(r.rows);
  };
  const ui = lazyPanel(() => Promise.all([loadCore(), import('../ui/temple-lantern-ui.js')]).then(([, { TempleLanternUI }]) => new TempleLanternUI({
    root: game.root, store, wallet: game.wallet, name: game.name, toast: game.toast,
    onHung: (l) => { game.onHung?.(l); if (painter) painter.set([...painter.rows.filter((r) => r.id !== l.id), l]); },
  })), { busy: false });

  return {
    ui,
    acts(p) {
      if (!underCanopy(p)) return [];
      return [
        { key: 'temple-hang', label: `🏮 ${t('temple.hang')} · 🪙 ${PRICE.toLocaleString('en-US')}`, run: () => ui.show('hang') },
        { key: 'temple-see', label: '📜 ' + t('temple.see'), run: () => ui.show('list') },
      ];
    },
    // Every frame on the street.
    update(p, dt, camera, w, h) {
      if (ui.open && !ui.busy && !underCanopy(p)) ui.close(); // walked away
      if (!near(p)) { painter?.hideTags(); return; }
      if (!painter) {
        painting ||= import('./temple-lanterns.js').then(({ createLanternPainter }) => { painter = createLanternPainter(game); refreshT = 0; })
          .catch((e) => { painting = null; console.warn('temple lanterns', e); });
        return;
      }
      if ((refreshT -= dt) <= 0) { refreshT = REFRESH; refresh().catch(() => {}); }
      painter.update(p, camera, w, h);
    },
    get painter() { return painter; },
  };
}
