// Seoul Botanic Park (서울식물원, Magok: scripts/build-magok.mjs, the map's
// "botanic" landmark). The greenhouse is an open building on the street: no
// door to a room, you walk in through its doorways. What it looks like, its
// plants and the park's trees (game/botanic-site.js) are downloaded when you
// come near; this small part is in the first download.
//
// Its shop (stores.json "seoul-botanic-greenhouse", products of model
// "furniture": core/house-plants.js) sells pot plants for your home from
// stands inside, the way the night food carts sell from theirs: stand by a
// pot and the button looks at it (the shop's usual buy sheet and receipt).
//
//   const botanic = createBotanicNear({ scene, landmarks, store, collision, seats, makeNpc, greet, look });
//   botanic.update(p, dt)   every frame on the street
//   botanic.actions(p)      the pots I'm standing at
//   botanic.staffNear()     the gardeners in sight (their name tags)
//   botanic.group           what loaded (main.js FarCull), or null
export const BOTANIC_NEAR = 480; // m: past the fog, so it is there before you see it
const STAFF_NEAR = 34; // m: the gardeners are drawn from this close
const LOOK_NEAR = 1.5; // m: close enough to a pot stand to look at it
// What a gardener says when you come by: [Korean, how it sounds, English].
export const GARDENER_HI = [['어서 오세요!', 'eoseo oseyo!', 'Welcome!'], ['화분 구경하고 가세요!', 'hwabun gugyeonghago gaseyo!', 'Have a look at the pot plants!'], ['집에 놓기 좋은 식물이에요.', 'jibe noki joeun singmurieyo.', 'These are lovely at home.'], ['희귀 식물은 온실 안쪽에 있어요.', 'huigwi singmureun onsil anjjoge isseoyo.', 'The rare plants are deeper inside.']];

export function createBotanicNear(game) {
  const l = (game.landmarks || []).find((q) => q.type === 'botanic');
  let site = null, loading = false, npcs = [];
  const store = l ? game.store(l.store) : null;
  const inside = (p) => !!l && Math.hypot(p.x - l.x, p.z - l.z) < l.r;
  return {
    landmark: l || null,
    inside,
    update(p, dt) {
      if (!l || !game.scene) return;
      const d = Math.hypot(p.x - l.x, p.z - l.z);
      if (!site) {
        if (loading || d > BOTANIC_NEAR) return;
        loading = true;
        import('./botanic-site.js')
          .then(({ buildBotanicSite }) => {
            site = buildBotanicSite(l, store);
            game.scene.add(site.group);
            game.collision?.add(site.colliders.map((q) => ({ p: q, low: true }))); // (low: the camera sees through the glass)
            game.seats?.push(...site.seats);
            npcs = site.clerks.map((c) => {
              const n = game.makeNpc('');
              n.ch.root.position.set(c.x, 0, c.z);
              n.ch.root.rotation.y = c.ry;
              n.ch.root.visible = false;
              n.tag.style.display = 'none';
              game.scene.add(n.ch.root);
              return n;
            });
          })
          .catch((e) => { loading = false; console.warn('botanic', e); });
        return;
      }
      const close = d < l.r + STAFF_NEAR;
      for (const n of npcs) {
        n.ch.root.visible = close;
        if (close) n.ch.animate(dt, 0); else n.tag.style.display = 'none';
      }
      if (close) game.greet(npcs, p, GARDENER_HI);
    },
    // The pot stands I'm at (nearest first).
    actions(p) {
      if (!site || !store || !inside(p)) return [];
      return site.products.map((pr) => ({ pr, d: Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z) })).filter((q) => q.d < LOOK_NEAR).sort((a, b) => a.d - b.d).slice(0, 2).map(({ pr }) => game.look(pr, store));
    },
    staffNear: () => npcs.filter((n) => n.ch.root.visible),
    get group() { return site?.group || null; },
    get site() { return site; },
  };
}
