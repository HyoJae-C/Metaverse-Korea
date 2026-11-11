// Night food carts on the street (map landmark "nightcarts", e.g. down the
// middle of Myeongdong's shopping street): out from sunset until morning,
// gone in the day (the game's three-hour day, core/show-clock.js). The carts
// themselves (core/night-carts-model.js) are downloaded the first time you
// come near them. Each has a seller and one kind of food to
// buy, the way the Han River market's stalls sell theirs (stores.json:
// the store's "market" stalls and its products' "stall").
//
// game: { scene, landmarks, store(id), collision, makeNpc(name), signLang(),
// night(), greet(npcs, p), look(pr, store) } as getters where they change.
import { gameHour } from '../core/show-clock.js';

const BUILD_NEAR = 160; // downloaded and built from this far off (m), in the day too
const SHOW_NEAR = 220; // drawn within this many metres
const STAFF_NEAR = 30; // a seller (about 20 meshes) from this close (each)
const STAFF_MAX = 6; // and no more than this many at once
const LOOK_NEAR = 1.6; // close enough to its counter to look at the food
// The game's sunset starts at 16:30 on its clock and the morning at 5:18
// (core/show-clock.js SKY_HOURS): the carts are out in between.
const OUT_FROM = 16.5, OUT_UNTIL = 5.3;
export const cartsOut = (now = Date.now()) => { const h = gameHour(now); return h >= OUT_FROM || h < OUT_UNTIL; };

export function createNightCarts(game) {
  const sites = [];
  for (const l of game.landmarks || []) {
    if (l.type !== 'nightcarts') continue;
    const store = game.store(l.store);
    if (store) sites.push({ l, store, spots: (l.carts || []).map(([x, z, ry]) => [l.x + x, l.z + z, ry]), built: null, loading: false, shown: false });
  }
  const far = (o, p) => Math.hypot(p.x - o.l.x, p.z - o.l.z);

  function build(o, m) {
    const b = m.buildNightCarts(o.store, o.spots);
    b.group.visible = false;
    game.scene.add(b.group);
    // (they block only while they're out: `off` in core/collision.js)
    game.collision.add(b.colliders.map((p) => ({ p, low: true, off: () => !o.shown })));
    const npcs = b.vendors.map((v) => {
      const n = game.makeNpc('');
      n.ch.root.position.set(v.x, 0, v.z);
      n.ch.root.rotation.y = v.ry;
      n.tag.style.visibility = 'hidden';
      n.tag.style.display = 'none';
      n.ch.root.visible = false;
      game.scene.add(n.ch.root);
      return n;
    });
    o.built = { b, npcs, lang: undefined };
  }

  // Each frame on the street.
  function update(dt, p) {
    const out = cartsOut();
    for (const o of sites) {
      const d = far(o, p);
      if (!o.built) {
        if (d < BUILD_NEAR && !o.loading) { // (day or night: built ahead, so they're there the moment the sun sets)
          o.loading = true;
          import('../core/night-carts-model.js').then((m) => build(o, m)).catch(() => { o.loading = false; }); // (offline: try again later)
        }
        continue;
      }
      const B = o.built;
      o.shown = out && d < SHOW_NEAR;
      B.b.group.visible = o.shown;
      // Only the nearest few sellers are drawn (each is about 20 meshes).
      const near = o.shown ? B.npcs.map((n) => [n, Math.hypot(p.x - n.ch.root.position.x, p.z - n.ch.root.position.z)]).filter(([, dd]) => dd < STAFF_NEAR).sort((a, b) => a[1] - b[1]).slice(0, STAFF_MAX).map(([n]) => n) : [];
      for (const n of B.npcs) {
        const close = near.includes(n);
        n.ch.root.visible = close;
        if (close) n.ch.animate(dt, 0); else n.tag.style.display = 'none';
      }
      if (!o.shown) continue;
      const lang = game.signLang();
      if (lang !== B.lang) { B.lang = lang; B.b.setSignLang(lang); }
      B.b.setNight(game.night());
      if (d < 90) game.greet(B.npcs.filter((n) => n.ch.root.visible), p);
    }
  }

  // The carts out around me, as main.js sees them (the seller who thanks
  // you: main.js sellerOf), or null.
  function here(p) {
    for (const o of sites) if (o.built && o.shown && far(o, p) < 120) return { store: o.store, vendors: o.built.b.vendors, vendorNpcs: o.built.npcs };
    return null;
  }

  // The food on the counters I'm standing at (nearest first).
  function actions(p) {
    const out = [];
    for (const o of sites) {
      if (!o.built || !o.shown) continue;
      const near = o.built.b.products.map((pr) => ({ pr, d: Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z) })).filter((q) => q.d < LOOK_NEAR).sort((a, b) => a.d - b.d);
      for (const { pr } of near.slice(0, 2)) out.push(game.look(pr, o.store));
    }
    return out;
  }

  // The sellers' bubbles (main.js placeLabels).
  const staffNear = () => sites.flatMap((o) => (o.built ? o.built.npcs.filter((n) => n.ch.root.visible) : []));

  return { sites, update, here, actions, staffNear };
}
