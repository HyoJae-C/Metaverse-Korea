// Bukhansan's wild animals (Yozi 2026-11-28: "now and then a squirrel or
// such running about on Bukhansan", then "and a water deer, a wild boar?").
// Only on the mountain, only now and then, one at a time: rare things are
// special where they really are. Part of game/bukhansan-park.js's chunk
// (loaded near the mountain), so nothing here is in the first download.
//
// The four are what really lives in Bukhansan National Park:
//   다람쥐 Korean chipmunk (Tamias sibiricus): striped, by day; it sleeps
//     through the winter, so not while snow lies.
//   청설모 Korean red squirrel (Sciurus vulgaris coreae): grey-brown, tufted
//     ears, a big tail; by day, all year; it runs up the nearest tree.
//   고라니 water deer (Hydropotes inermis): no antlers (the males have
//     tusks); in the lower woods, more at dusk and at night; it bounds away.
//   멧돼지 wild boar (Sus scrofa): the rarest here, in the lower woods, more
//     at night; it keeps its distance and trots off. What to do if you meet
//     one is on the notice at the Visitor Center and the hut (game/bukhansan-park.js).
// Sizes are the street's (people are 1.2 m chibis): the chipmunk and the
// squirrel are drawn about 1.5x (size) or you would miss them on a phone; the
// deer and the boar stand about at a person's waist.
//
//   const animals = createBukhanAnimals({ group, l, y, ok, trees, daylight, snow, toast, text });
//   animals.update(p, dt)   every frame the mountain is drawn
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ANIMALS = {
  every: [35, 70], // s between chances while you are on the mountain (the first a little sooner)
  first: [12, 35],
  far: 42, // m: past this an animal is gone
  lowBelow: 6, // m under the hut's yard: the lower woods (the deer and the boar)
  kinds: {
    chipmunk: { w: 0.45, size: 1.6, near: [6, 11], speed: 2.4, flee: 3.5, life: 16, day: true, sleeps: true, clear: 1.2 },
    squirrel: { w: 0.3, size: 1.5, near: [7, 12], speed: 2.8, flee: 4.5, life: 18, day: true, clear: 1.2 },
    deer: { w: 0.06, near: [13, 20], speed: 5, flee: 10, life: 20, low: true, night: 3, clear: 3 },
    boar: { w: 0.025, near: [17, 24], speed: 1.1, flee: 12, life: 18, low: true, night: 2, clear: 4 },
  },
};

// What turns up at a chance (or null): by day the small ones, and in the lower woods (low) now and then a deer or a boar.
// The weights are not shared out again when one can't come, so the rare stay rare.
export function pickKind(rnd, { day = 1, snow = 0, low = false } = {}) {
  let r = rnd();
  for (const [k, a] of Object.entries(ANIMALS.kinds)) {
    let w = a.w;
    if (a.day && day < 0.4) w = 0;
    if (a.sleeps && snow > 0.2) w = 0;
    if (a.low && !low) w = 0;
    if (a.night && day < 0.5) w *= a.night;
    if (r < w) return k;
    r -= w;
  }
  return null;
}

// ---- the shapes: low-poly blobs and boxes in one geometry each (one draw call), front +z, feet at y 0
const C = new THREE.Color();
function paint(g, hex) {
  g = g.index ? g.toNonIndexed() : g;
  C.set(hex);
  const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = C.r; c[i * 3 + 1] = C.g; c[i * 3 + 2] = C.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.deleteAttribute('uv');
  return g;
}
const blob = (hex, r, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => paint(new THREE.SphereGeometry(r, 7, 5).scale(sx, sy, sz).rotateX(rx).translate(x, y, z), hex);
const box = (hex, w, h, d, x, y, z, rx = 0) => paint(new THREE.BoxGeometry(w, h, d).rotateX(rx).translate(x, y, z), hex);
const cone = (hex, r, h, x, y, z, rx = 0, rz = 0) => paint(new THREE.ConeGeometry(r, h, 4).rotateX(rx).rotateZ(rz).translate(x, y, z), hex);

const SHAPES = {
  chipmunk() { // orange-brown, five dark stripes down the back, pale belly, a thin tail held up
    const fur = '#b8773f', dark = '#3b2a1d', pale = '#efe1c4';
    return [
      blob(fur, 0.09, 0, 0.09, 0, 0.85, 0.8, 1.35),
      blob(pale, 0.07, 0, 0.065, 0.02, 0.8, 0.6, 1.2),
      ...[-0.05, -0.025, 0, 0.025, 0.05].map((x) => box(dark, 0.012, 0.012, 0.2, x, 0.155 - Math.abs(x) * 0.8, -0.005)),
      box(pale, 0.012, 0.01, 0.17, -0.037, 0.145, 0), box(pale, 0.012, 0.01, 0.17, 0.037, 0.145, 0),
      blob(fur, 0.065, 0, 0.15, 0.12, 1, 0.95, 1.05),
      box(dark, 0.09, 0.008, 0.012, 0, 0.165, 0.18), // (the stripe through the eye)
      blob(pale, 0.035, 0, 0.13, 0.17, 1.1, 0.8, 1),
      blob(dark, 0.012, 0, 0.14, 0.2),
      cone(fur, 0.022, 0.04, -0.035, 0.215, 0.11), cone(fur, 0.022, 0.04, 0.035, 0.215, 0.11),
      blob('#8a5a33', 0.04, 0, 0.17, -0.17, 0.6, 1.9, 0.6, -0.35),
      box(dark, 0.025, 0.06, 0.025, -0.045, 0.03, 0.07), box(dark, 0.025, 0.06, 0.025, 0.045, 0.03, 0.07),
    ];
  },
  squirrel() { // grey-brown, white belly, tufted ears, a big bushy tail curled up over the back
    const fur = '#4d4038', dark = '#2f2722', pale = '#ddd5c8';
    return [
      blob(fur, 0.1, 0, 0.11, 0, 0.85, 0.85, 1.35),
      blob(pale, 0.075, 0, 0.085, 0.04, 0.75, 0.7, 1.1),
      blob(fur, 0.07, 0, 0.18, 0.13, 1, 0.95, 1.1),
      blob(dark, 0.013, 0, 0.17, 0.205),
      cone(dark, 0.022, 0.07, -0.035, 0.26, 0.12, 0, 0.25), cone(dark, 0.022, 0.07, 0.035, 0.26, 0.12, 0, -0.25),
      blob(fur, 0.075, 0, 0.17, -0.16, 0.85, 1.6, 0.8, -0.45),
      blob(fur, 0.07, 0, 0.32, -0.12, 0.9, 1, 1.1),
      box(dark, 0.028, 0.07, 0.028, -0.05, 0.035, 0.08), box(dark, 0.028, 0.07, 0.028, 0.05, 0.035, 0.08),
      box(dark, 0.034, 0.06, 0.05, -0.06, 0.03, -0.06), box(dark, 0.034, 0.06, 0.05, 0.06, 0.03, -0.06),
    ];
  },
  deer() { // tan-brown, slender legs, big round ears, black nose and eyes, no antlers; the little tusks of a male
    const fur = '#a7805a', dark = '#2b221c', pale = '#e6d8c0', leg = '#8b6a4a';
    return [
      blob(fur, 0.2, 0, 0.5, 0, 0.8, 0.75, 1.55),
      blob(pale, 0.14, 0, 0.42, 0.02, 0.7, 0.45, 1.3),
      blob(fur, 0.08, 0, 0.68, 0.26, 0.8, 1.3, 0.8, 0.5), // (the neck)
      blob(fur, 0.1, 0, 0.8, 0.36, 0.85, 0.85, 1.2),
      blob(fur, 0.05, 0, 0.77, 0.47, 0.9, 0.8, 1),
      blob(dark, 0.025, 0, 0.78, 0.52),
      blob(dark, 0.016, -0.06, 0.83, 0.42), blob(dark, 0.016, 0.06, 0.83, 0.42),
      blob(fur, 0.055, -0.08, 0.9, 0.31, 0.6, 1, 0.35), blob(fur, 0.055, 0.08, 0.9, 0.31, 0.6, 1, 0.35),
      cone('#f4efe3', 0.009, 0.05, -0.03, 0.72, 0.47, Math.PI), cone('#f4efe3', 0.009, 0.05, 0.03, 0.72, 0.47, Math.PI),
      ...[[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]].map(([x, z]) => box(leg, 0.045, 0.4, 0.045, x, 0.2, z)),
      blob(fur, 0.03, 0, 0.55, -0.31),
    ];
  },
  boar() { // dark brown-grey, a heavy front, the bristly ridge, a long snout with a pale disc, small tusks, short legs
    const fur = '#4a3c31', dark = '#2a211b', snout = '#6b5a4c';
    return [
      blob(fur, 0.27, 0, 0.42, 0, 0.8, 0.85, 1.45),
      blob(fur, 0.22, 0, 0.47, 0.17, 0.95, 1, 0.9),
      box(dark, 0.06, 0.08, 0.6, 0, 0.67, 0.04), // (the ridge of bristles)
      blob(fur, 0.14, 0, 0.42, 0.4, 0.95, 0.9, 1.1),
      blob(snout, 0.07, 0, 0.36, 0.55, 0.85, 0.75, 1.3),
      paint(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 7).rotateX(Math.PI / 2).translate(0, 0.36, 0.64), '#c9b2a0'),
      cone('#efe7d6', 0.012, 0.06, -0.06, 0.39, 0.55, 0, 0.5), cone('#efe7d6', 0.012, 0.06, 0.06, 0.39, 0.55, 0, -0.5),
      blob(dark, 0.017, -0.07, 0.48, 0.47), blob(dark, 0.017, 0.07, 0.48, 0.47),
      cone(fur, 0.04, 0.08, -0.09, 0.56, 0.36), cone(fur, 0.04, 0.08, 0.09, 0.56, 0.36),
      ...[[-0.11, 0.22], [0.11, 0.22], [-0.11, -0.22], [0.11, -0.22]].map(([x, z]) => box(dark, 0.07, 0.22, 0.07, x, 0.11, z)),
      box(dark, 0.02, 0.12, 0.02, 0, 0.42, -0.4),
    ];
  },
};
export function animalGeometry(kind) {
  const g = mergeGeometries(SHAPES[kind]());
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// ---- on the mountain
export function createBukhanAnimals({ group, l, y, ok = () => true, trees = [], daylight = () => 1, snow = () => 0, toast = null, text = (k) => k, rnd = Math.random }) {
  const A = ANIMALS;
  const hut = l.pads.find((q) => q.k === 'hut');
  const lowY = hut ? y(l.x + hut.at[0], l.z + hut.at[1]) - A.lowBelow : Infinity;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const meshes = {};
  const mesh = (k) => {
    if (!meshes[k]) { meshes[k] = new THREE.Mesh(animalGeometry(k), mat); meshes[k].name = `bukhansan-${k}`; meshes[k].userData.noSnow = true; meshes[k].visible = false; group.add(meshes[k]); }
    return meshes[k];
  };
  const seen = new Set(); // the kinds already named this visit (each once)
  let wait = A.first[0] + rnd() * (A.first[1] - A.first[0]);
  let one = null; // the animal out now: { k, m, x, z, ry, state, t, to, life, hop }
  let lx = null, lz = null, head = 0; // where you were, which way you are going
  const range = ([a, b]) => a + rnd() * (b - a);
  const ground = (x, z) => y(x, z) - 0.06;

  const spawn = (p, want = null) => {
    const k = want || pickKind(rnd, { day: daylight(), snow: snow(), low: y(p.x, p.z) < lowY });
    if (!k) return;
    const a = A.kinds[k];
    for (let i = 0; i < 14; i++) { // ahead of you, off the way, in the wood
      const ang = head + (rnd() - 0.5) * 2.4, d = range(a.near), x = p.x + Math.sin(ang) * d, z = p.z + Math.cos(ang) * d;
      if (!ok(x, z, a.clear) || y(x, z) < 0.3 || (a.low && !want && y(x, z) >= lowY)) continue;
      const m = mesh(k);
      one = { k, a, m, x, z, ry: rnd() * Math.PI * 2, state: 'idle', t: range([0.6, 2]), life: a.life, hop: 0, climb: null, gone: 0 };
      m.visible = true;
      m.scale.setScalar(a.size || 1);
      place();
      return;
    }
  };
  const place = () => {
    const o = one, m = o.m;
    let gy = ground(o.x, o.z), pitch = 0, lift = 0;
    if (o.climb) { gy = o.climb.y0 + o.climb.h; pitch = -Math.PI / 2; }
    else if (o.state === 'move' || o.state === 'flee') {
      const big = o.k === 'deer' ? 0.35 : o.k === 'boar' ? 0.03 : 0.08;
      lift = Math.abs(Math.sin(o.hop)) * big;
      if (o.k === 'deer') pitch = Math.cos(o.hop) * 0.25;
    } else if (o.state === 'sit') pitch = -0.7; // (sitting up on the haunches, looking about)
    m.position.set(o.x, gy + lift, o.z);
    m.rotation.set(pitch, o.ry, 0, 'YXZ');
  };
  const go = (o, tx, tz, state) => { o.to = [tx, tz]; o.state = state; o.ry = Math.atan2(tx - o.x, tz - o.z); };
  const end = () => { if (one) one.m.visible = false; one = null; wait = range(A.every); };

  return {
    get out() { return one?.k || null; },
    get at() { return one ? { x: one.x, z: one.z, y: one.m.position.y } : null; },
    // (?debug, screenshots and e2e: bring one out now, ahead of you)
    show(p, k) { end(); spawn(p, k); return one?.k || null; },
    update(p, dt) {
      if (lx != null) { const mx = p.x - lx, mz = p.z - lz; if (mx * mx + mz * mz > 0.0004) head = Math.atan2(mx, mz); }
      lx = p.x; lz = p.z;
      if (!one) {
        wait -= dt;
        if (wait <= 0) { wait = range(A.every); if (ok(p.x, p.z, -Infinity)) spawn(p); }
        return;
      }
      const o = one, a = o.a, dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
      if (d > A.far) { end(); return; }
      o.life -= dt;
      if (!seen.has(o.k) && d < a.near[1] + 3) { seen.add(o.k); toast?.(text(`bukhan.see.${o.k}`), 5000); }
      if (o.climb) { // up the trunk and into the leaves
        o.climb.h = Math.min(o.climb.top, o.climb.h + dt * 1.6);
        if (o.climb.h >= o.climb.top) { o.gone += dt; if (o.gone > 0.4) { end(); return; } }
        place();
        return;
      }
      if (o.state !== 'flee' && d < a.flee) { // you came too near: away it goes
        const k = 1 / (d || 1);
        if (o.k === 'squirrel') { // to the nearest tree not on your side
          let best = null, bd = 7;
          for (const tr of trees) { const tdx = tr[0] - o.x, tdz = tr[2] - o.z, td = Math.hypot(tdx, tdz); if (td < bd && tdx * dx + tdz * dz > -0.3 * td * d) { bd = td; best = tr; } }
          if (best) { go(o, best[0], best[2], 'flee'); o.tree = best; place(); return; }
        }
        const run = o.k === 'chipmunk' ? 5 : 30;
        go(o, o.x + dx * k * run, o.z + dz * k * run, 'flee');
      }
      if (o.state === 'idle' || o.state === 'sit') {
        o.t -= dt;
        if (o.k === 'boar' || o.k === 'deer') o.ry += Math.sin(o.life * 2) * dt * 0.3; // (looking about, nose down)
        if (o.t <= 0) {
          if (o.life <= 0) { o.state = 'flee'; const r = rnd() * Math.PI * 2; go(o, o.x + Math.sin(r) * 30, o.z + Math.cos(r) * 30, 'flee'); }
          else if (o.state === 'idle' && (o.k === 'chipmunk' || o.k === 'squirrel') && rnd() < 0.45) { o.state = 'sit'; o.t = range([1, 2.5]); }
          else {
            const r = rnd() * Math.PI * 2, s = o.k === 'boar' ? range([3, 6]) : o.k === 'deer' ? range([2, 4]) : range([1, 3]);
            const tx = o.x + Math.sin(r) * s, tz = o.z + Math.cos(r) * s;
            if (ok(tx, tz, 0.4)) go(o, tx, tz, 'move'); else o.t = 0.5;
          }
        }
      } else { // move or flee
        const [tx, tz] = o.to, mx = tx - o.x, mz = tz - o.z, md = Math.hypot(mx, mz);
        const sp = a.speed * (o.state === 'flee' ? (o.k === 'boar' ? 3.5 : 1.6) : 0.5);
        const stepLen = Math.min(md, sp * dt);
        o.hop += dt * (o.k === 'deer' ? 7 : o.k === 'boar' ? 9 : 16) * (o.state === 'flee' ? 1 : 0.7);
        if (md > 0.01) { o.x += (mx / md) * stepLen; o.z += (mz / md) * stepLen; }
        if (md - stepLen < 0.05) {
          if (o.tree) { const tr = o.tree; o.tree = null; o.x = tr[0] + Math.sin(o.ry + Math.PI) * 0.16; o.z = tr[2] + Math.cos(o.ry + Math.PI) * 0.16; o.climb = { y0: tr[1], h: 0.1, top: tr[3] }; }
          else if (o.state === 'flee') { end(); return; } // (into the undergrowth)
          else { o.state = 'idle'; o.t = range([0.8, 2.5]); }
        }
        if (o.state === 'flee' && o.k === 'chipmunk' && md - stepLen < 0.6) { o.m.scale.setScalar((a.size || 1) * Math.max(0.01, (md - stepLen) / 0.6)); } // (into a crack in the rocks)
      }
      place();
    },
  };
}
