// Han River parks laid straight on the street: no door, no room of their
// own. Their lawns, paths, trees and benches are the district's map; the
// riverside things (core/han-park.js: pier, kiosk, ramen machine, fish
// buyer, fishing spots, duck boats, food stalls) are built the first time
// you come near and set on the street at the park's `hanpark` landmark.
// You stay on the street the whole time: the same room, the same network,
// the map and everyone else see you where you are.
//
// What's built is turned into the street's metres (seats, the goods to look
// at, the fishing spots, the kiosk, the fish buyer, the ramen machine, the
// keep-out boxes), except the duck boats, which sail in the park's own
// metres (game/duck-boats.js uses `frame` to bring them out).
//
// game: { scene, landmarks, store(id), collision, makeNpc(name, opts),
// clerkName(), baitSeller(): { name, look } (the bait stall's old fisherman), me,
// signLang(), night(), greet(npcs, p), acts: { duck, mart, fish, sell, bait,
// ramen, look }, onVisit(store) } as getters where they change.

// (distances to the park's edge, its bounds: a long one like Yeouido's
// shore is drawn while you walk along it, not only near its middle)
const BUILD_NEAR = 200; // built from this far off (m)
const SHOW_NEAR = 260; // drawn within this many metres
const STAFF_NEAR = 80; // its clerk and stall sellers (about 20 meshes each) from close by (each)

export function createHanParks(game) {
  const parks = [];
  const seats = []; // its benches, steps and table stools, in the street's metres (main.js nearestSeat)
  for (const l of game.landmarks || []) {
    if (l.type !== 'hanpark') continue;
    const store = game.store(l.store);
    if (!store) continue;
    parks.push({ l, store, ox: l.x, oz: l.z, ry: l.ry || 0, c: Math.cos(l.ry || 0), s: Math.sin(l.ry || 0), built: null, loading: false, here: null });
  }
  // The park's metres to the street's and back.
  const toWorld = (o, x, z) => [o.ox + x * o.c + z * o.s, o.oz - x * o.s + z * o.c];
  const toLocal = (o, x, z) => { const dx = x - o.ox, dz = z - o.oz; return [dx * o.c - dz * o.s, dx * o.s + dz * o.c]; };
  const boundsOf = (o) => o.l.bounds || [-30, -45, 30, 20];
  const inBounds = (o, x, z) => {
    const [lx, lz] = toLocal(o, x, z), [x0, z0, x1, z1] = boundsOf(o);
    return lx > x0 && lx < x1 && lz > z0 && lz < z1;
  };
  // How far (x, z) is from the park (0 inside it).
  const away = (o, x, z) => {
    const [lx, lz] = toLocal(o, x, z), [x0, z0, x1, z1] = boundsOf(o);
    return Math.hypot(Math.max(x0 - lx, 0, lx - x1), Math.max(z0 - lz, 0, lz - z1));
  };
  const near = (n, p, r) => Math.hypot(p.x - n.ch.root.position.x, p.z - n.ch.root.position.z) < r;

  function build(o, m) {
    const b = m.buildHanPark(o.store, o.l.layout || {});
    b.group.position.set(o.ox, 0, o.oz);
    b.group.rotation.y = o.ry;
    game.scene.add(b.group);
    const W = (p) => p.map(([x, z]) => toWorld(o, x, z));
    // (the pier first: the river under it stops counting, its own fence still does)
    for (const d of b.decks) game.collision.addDeck(W(d));
    game.collision.add(b.colliders.map((c) => ({ p: W(c.p), low: !c.tall }))); // (the camera sees over railings, benches and stalls; not through the kiosk)
    for (const s of b.seats) {
      const [x, z] = toWorld(o, s.x, s.z);
      seats.push({ ...s, x, z, ry: s.ry + o.ry, stand: s.stand && toWorld(o, ...s.stand), street: true, hanpark: o.store.id });
    }
    const products = b.products.map((pr) => { const [x, z] = toWorld(o, pr.pos.x, pr.pos.z); return { ...pr, pos: pr.pos.clone().set(x, 0, z) }; });
    const fishing = b.fishing.map((f) => { const [x, z] = toWorld(o, f.x, f.z); return { x, z, get lucky() { return !!f.lucky; } }; });
    const spot = (q) => { if (!q) return null; const [x, z] = toWorld(o, q.x, q.z); return { x, z }; };
    // The staff stand on the street itself (in its metres), like everyone else.
    const staff = (at, name, hideTag, look) => {
      const n = game.makeNpc(name, look);
      const [x, z] = toWorld(o, at.x, at.z);
      n.ch.root.position.set(x, 0, z);
      n.ch.root.rotation.y = at.ry + o.ry;
      if (hideTag) n.tag.style.visibility = 'hidden';
      n.tag.style.display = 'none';
      game.scene.add(n.ch.root);
      return n;
    };
    const clerkNpc = b.clerk ? staff(b.clerk, game.clerkName()) : null;
    const vendorNpcs = b.vendors.map((v) => staff(v, '', true));
    const baitWho = b.baitSeller && game.baitSeller?.();
    const baitNpc = baitWho ? staff(b.baitSeller, baitWho.name, false, baitWho.look) : null;
    o.built = {
      b, clerkNpc, vendorNpcs, baitNpc, lang: undefined,
      // What the rest of the game sees while you're in it (main.js hanPark()).
      here: {
        store: o.store, hanRiver: true, street: true,
        fishing, fishBuy: spot(b.fishBuy), bait: spot(b.bait), ramen: spot(b.ramen), products,
        clerkNpc, vendors: b.vendors, vendorNpcs, baitNpc,
        ducks: b.ducks.length ? b.ducks : null, duckArea: b.duckArea, scene: b.group,
        river: { position: { y: 0.03 } }, // (the street's water, world.js)
        show: b.show, // (Ttukseom's drone show, or null)
        frame: { ry: o.ry, toWorld: (x, z) => toWorld(o, x, z), toLocal: (x, z) => toLocal(o, x, z) },
      },
    };
  }

  // Each frame on the street: build what's near, draw it from close by, keep
  // its clerk and sellers going.
  function update(dt, p) {
    for (const o of parks) {
      const d = away(o, p.x, p.z);
      if (!o.built) {
        if (d < BUILD_NEAR && !o.loading) {
          o.loading = true;
          import('../core/han-park.js').then((m) => build(o, m)).catch(() => { o.loading = false; }); // (offline: try again later)
        }
        continue;
      }
      const B = o.built, shown = d < SHOW_NEAR;
      B.b.group.visible = shown;
      for (const n of [B.clerkNpc, B.baitNpc, ...B.vendorNpcs]) if (n) {
        const close = d < STAFF_NEAR && near(n, p, STAFF_NEAR);
        n.ch.root.visible = close;
        if (close) n.ch.animate(dt, 0); else n.tag.style.display = 'none';
      }
      if (!shown) continue;
      const lang = game.signLang();
      if (lang !== B.lang) { B.lang = lang; B.b.setSignLang(lang); }
      B.b.setNight(game.night());
      B.b.tick(dt);
      if (d < STAFF_NEAR && B.vendorNpcs.length) game.greet(B.vendorNpcs, p);
    }
    // Walking into one counts as a visit (quests, the daily list), once each time.
    const h = here(p), id = h?.store.id || null;
    if (id !== visiting) { visiting = id; if (h) game.onVisit?.(h.store); }
  }
  let visiting = null;
  // The park I'm standing in (or out on its water), as main.js sees it, or null.
  function here(p = game.me.root.position) {
    for (const o of parks) if (o.built && inBounds(o, p.x, p.z)) return o.built.here;
    return null;
  }
  // What there is to do where I stand, nearest kind first (game.acts makes
  // each action: the duck boats, the kiosk's counter, fishing, the fish
  // buyer, the ramen machine, the goods on the counters).
  function actions(p) {
    const h = here(p);
    if (!h) return [];
    const A = game.acts, out = [], at = (q, r) => q && Math.hypot(p.x - q.x, p.z - q.z) < r;
    const push = (a) => { if (a) out.push(a); };
    push(A.duck(p));
    if (h.store.kiosk && h.clerkNpc && near(h.clerkNpc, p, 3)) push(A.mart());
    if (h.fishing.some((f) => at(f, 1.8))) push(A.fish());
    if (at(h.fishBuy, 1.6)) push(A.sell());
    if (at(h.bait, 1.6)) push(A.bait?.());
    if (at(h.ramen, 1.8)) push(A.ramen());
    const goods = h.products.map((pr) => ({ pr, d: Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z) })).filter((o) => o.d < 1.9).sort((a, b) => a.d - b.d);
    for (const { pr } of goods.slice(0, 3)) push(A.look(pr, h.store));
    return out;
  }
  // Its clerk and sellers' name tags and bubbles (main.js placeLabels).
  function staffNear(p) {
    const out = [];
    for (const o of parks) if (o.built) for (const n of [o.built.clerkNpc, o.built.baitNpc, ...o.built.vendorNpcs]) if (n && near(n, p, STAFF_NEAR)) out.push(n);
    return out;
  }
  // Where the parks are (the map, a taxi): store id → [x, z] of its middle.
  const spots = () => parks.map((o) => ({ id: o.store.id, x: o.ox, z: o.oz }));
  // How far (x, z) is from that park's edge (Infinity if there's none).
  const awayFrom = (id, p) => { const o = parks.find((q) => q.store.id === id); return o ? away(o, p.x, p.z) : Infinity; };
  return { parks, seats, update, here, actions, staffNear, spots, awayFrom, toWorld, toLocal };
}
