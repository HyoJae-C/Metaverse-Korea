// The monks at Jogyesa and Bongeunsa (data/temple-monks.js), drawn: grey
// robes, shaved heads, no name tags. One stands in front of
// Daeungjeon and bows every so often; one walks slowly along the way in and
// back, stopping a moment at each end. Drawn only while you are close.
// Loaded by game/temple-monks-near.js.
import { createCharacter } from '../core/character.js';
import { MONK_LOOK } from '../data/temple-monks.js';

const SHOW = 80; // m: drawn closer than this
const SPEED = 0.8; // m/s, an unhurried walk
const REST = 4; // s at each end
const BOW_EVERY = 9; // s

// game: { scene, offsets }; sites: MONK_SITES with an offset.
export function createTempleMonks(game, sites) {
  const all = [];
  for (const s of sites) {
    const [ox, oz] = game.offsets[s.district];
    for (const [i, m] of s.monks.entries()) {
      const ch = createCharacter(MONK_LOOK);
      const o = { ch, site: [s.at[0] + ox, s.at[1] + oz], bowT: 2 + i * 3 };
      if (m.bow) {
        o.bow = true;
        ch.root.position.set(m.bow[0] + ox, 0, m.bow[1] + oz);
        ch.root.rotation.y = Math.atan2(m.face[0] - m.bow[0], m.face[1] - m.bow[1]);
      } else {
        o.path = m.walk.map(([x, z]) => [x + ox, z + oz]);
        o.leg = 0; o.dir = 1; o.u = 0; o.rest = i;
        ch.root.position.set(o.path[0][0], 0, o.path[0][1]);
      }
      ch.root.visible = false;
      game.scene.add(ch.root);
      all.push(o);
    }
  }
  // One step along the path: legs there and back, a rest at each end.
  const walk = (o, dt) => {
    const { path } = o;
    if (o.rest > 0) { o.rest -= dt; return 0; }
    const a = path[o.leg], b = path[o.leg + o.dir];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    o.u += (SPEED * dt) / len;
    if (o.u >= 1) {
      o.u = 0; o.leg += o.dir;
      if (o.leg + o.dir < 0 || o.leg + o.dir >= path.length) { o.dir = -o.dir; o.rest = REST; }
      const p = path[o.leg];
      o.ch.root.position.set(p[0], 0, p[1]);
      return 0;
    }
    o.ch.root.position.set(a[0] + (b[0] - a[0]) * o.u, 0, a[1] + (b[1] - a[1]) * o.u);
    o.ch.root.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    return 1;
  };
  return {
    update(p, dt) {
      for (const o of all) {
        const on = Math.hypot(p.x - o.site[0], p.z - o.site[1]) < SHOW;
        o.ch.root.visible = on;
        if (!on) continue;
        if (o.bow) {
          if ((o.bowT -= dt) <= 0) { o.bowT = BOW_EVERY; o.ch.play('bow'); }
          o.ch.animate(dt, 0);
        } else o.ch.animate(dt, walk(o, dt) ? SPEED / 12 : 0);
      }
    },
  };
}
