// Making cooked dishes tastier (음식 강화 in the code, "더 맛있는 음식 만들기"
// to players; core/dish-upgrade.js): at the little kitchen in any cooking
// class (core/interior.js tastierKitchen), pick a dish from the food bag; a try uses
// seasoning (정성 양념) and a daily try. Seasoning: 10 to start, 3 for the
// day's missions, 1 a day for each kind of dish you cook. Not sold for now.
// Small on purpose: this is in the first download; the rules, the store and
// the panel load the first time they're needed.
//
// game: { root (the panel's element), cloud, bag, toast(m), me, sfx,
// myName(), describe(entry), onChange() (the bag panel redraws) } as getters
// where they change.
import { t } from '../core/i18n.js';
import { lazyPanel } from '../core/lazy-panel.js';

export function createDishUpgrade(game) {
  let mod = null, store = null, n = null, asking = null;
  const load = () => (mod ? Promise.resolve(mod) : import('../core/dish-upgrade-store.js').then((m) => (mod = m)));
  // In Supabase when signed in, else in this browser.
  const pick = () => {
    const live = game.cloud.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(store instanceof mod.SupabaseUpgradeStore)) store = new mod.SupabaseUpgradeStore(game.cloud);
    if (!live && !(store instanceof mod.LocalUpgradeStore)) store = new mod.LocalUpgradeStore();
    return store;
  };
  const getStore = async () => { await load(); return pick(); };
  const setN = (v) => { if (Number.isFinite(v) && v !== n) { n = v; game.onChange?.(); } };

  // The seasoning count (null until known; asks the store once in the background).
  function seasoning() {
    if (n === null && !asking) asking = getStore().then((s) => s.info()).then((r) => { if (!r.error) setN(r.n); }).catch(() => {}).finally(() => { asking = null; });
    return n;
  }

  // Seasoning for the day's missions, or for cooking a kind of dish (once a day each).
  async function claim(kind, dish) {
    try {
      const s = await getStore();
      const r = await s.claim(kind, dish);
      if (r.error || !r.granted) return;
      setN(r.n);
      setTimeout(() => game.toast(t('upgrade.got', { n: r.granted, total: r.n })), kind === 'mission' ? 3000 : 1800); // (after the cooking or mission toast)
    } catch { /* offline: claimed another time */ }
  }
  const cooked = (e) => load().then((m) => { const k = m.dishKind(e); if (k) claim('class', k); }).catch(() => {});

  const ui = lazyPanel(() => Promise.all([load(), import('../ui/dish-upgrade-ui.js')]).then(([, { DishUpgradeUI }]) => new DishUpgradeUI({
    root: game.root, store: pick, bag: game.bag, toast: game.toast, describe: game.describe, myName: game.myName,
    onSeasoning: setN,
    onStart: () => game.me.play('clap'), // (in the shop too: hands together, waiting)
    onResult: (ok) => { game.me.play(ok ? 'cheer' : 'wave'); (ok ? game.sfx.cheer : game.sfx.tock)?.call(game.sfx); game.onChange?.(); },
  })), { busy: false });

  return {
    ui, seasoning, cooked,
    mission: () => claim('mission'),
    // 1 seasoning for the first dish cooked with someone each day (core/together.js).
    together: () => claim('together'),
    // 5 seasoning with the day's check-in (once a day; also on opening the game if you checked in already).
    daily: () => claim('daily'),
    // The action at a cooking class's kitchen.
    action: (clerk) => ({ key: 'dish-upgrade', label: '✨ ' + t('upgrade.open'), run: () => { clerk?.ch.wave(); ui.show(); } }),
  };
}
