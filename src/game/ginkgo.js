// Ginkgo trees (은행나무) on the street (Yozi 2026-11-20). Their fallen nuts
// are famous in Seoul's autumn for their smell:
//   - Shake a ginkgo (E by its trunk): leaves come down, and sometimes a nut
//     falls into your hand (into the bag: it does nothing, it just stinks)
//     and a few more drop round the tree.
//   - Even unshaken, a few nuts lie under some ginkgos now and then.
//   - Step on one and you smell for a few minutes: the stink puffs round you,
//     and others nearby see them too (it rides on the perfume scent, main.js).
// The ginkgos themselves are street trees (core/world.js out.ginkgos). Only
// the trees near you are looked at; all the nuts are one small instanced
// mesh. Nothing here goes to the server: the nuts are each player's own.
import * as THREE from 'three';
import { SEASON, leafHash } from '../core/season.js';

export const STINK_ID = 'ginkgo-stink'; // (a scent like a perfume's, core/perfume.js)
export const STINK_MS = 150 * 1000; // two and a half minutes
export const STINK_FX = { e: ['🤢', '💨'], c: '#a7a53a', m: 'rise' };
const LEAVES_FX = { e: ['🍂', '🍁'], c: '#f2c230', m: 'fall' };
const REACH = 2.2; // how close to the trunk to shake it
const STEP = 0.4; // how close a foot has to come to squash a nut
const NEAR = 45; // nuts are laid out only under trees this close
const SLOT_MS = 10 * 60 * 1000; // fallen nuts change every 10 minutes
const LYING = 0.35; // share of ginkgos with nuts under them (unshaken)
const NUT_CHANCE = 0.4; // a shake that brings nuts down
const COOL_MS = 12 * 1000; // before the same tree can be shaken again
const DROPPED_MS = 5 * 60 * 1000; // nuts from a shake lie this long
const MAX = 160; // nuts drawn at once
export const NUT_MAX = 99; // nuts in one bag slot

// The nuts lying under tree i in slot (unshaken): [[x, z, key]] or [].
export function lyingNuts(tree, i, slot) {
  const [x, z] = tree;
  if (leafHash(i * 3.1 + 0.7, slot * 1.9) >= LYING) return [];
  const n = 2 + Math.floor(leafHash(i, slot + 0.5) * 3);
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = leafHash(i + k * 7.3, slot) * Math.PI * 2, r = 0.8 + leafHash(k * 5.1, i + slot) * 1.8;
    out.push([x + Math.cos(a) * r, z + Math.sin(a) * r, `${i}:${slot}:${k}`]);
  }
  return out;
}

// A bag entry's card (main.js describeEntry).
export function describeNuts(e, t) {
  return { emoji: '🌰', name: t('ginkgo.name'), desc: t('ginkgo.desc', { n: e.n || 1 }), canHold: false };
}

// game: { scene, trees ([x, z, s] ginkgos), bag, me, t, toast, sfx, puff(x, y, z, fx, big), stink() }
export function createGinkgo(game) {
  const trees = game.trees || [];
  const squashed = new Set(); // keys of lying nuts already stepped on
  const cool = new Map(); // tree index -> when it can be shaken again
  let dropped = []; // { x, z, until, t (s since it fell), key }
  let near = []; // indices of trees close by
  let lastLook = -1e9, lastX = 1e9, lastZ = 1e9, lastSlot = -1;
  let nuts = [], dirty = true, drawn = false; // (the nuts near you, worked out again only when something changes)

  const geo = new THREE.IcosahedronGeometry(0.1, 1).scale(1, 0.8, 1);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#e7b43c' }), MAX);
  mesh.count = 0;
  mesh.frustumCulled = false; // (the instances move with you; there are only a few)
  mesh.name = 'ginkgo-nuts';
  mesh.userData.noSnow = true;
  if (trees.length && SEASON === 'autumn') game.scene.add(mesh);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);

  const nearest = (p) => {
    let best = null, bd = REACH;
    for (const i of near) {
      const d = Math.hypot(trees[i][0] - p.x, trees[i][1] - p.z);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  function shake(i) {
    const [x, z, s = 1] = trees[i], now = Date.now();
    cool.set(i, now + COOL_MS);
    game.me?.play?.('clap');
    game.sfx?.pop?.();
    game.puff?.(x, 1.6 * s, z, LEAVES_FX, true);
    if (Math.random() >= NUT_CHANCE) { game.toast(game.t('ginkgo.leaves')); return 'leaves'; }
    // One into your hand (one slot holds them all), a few on the ground.
    const bag = game.bag, k = bag.items.findIndex((e) => e.kind === 'ginkgo');
    let got;
    if (k >= 0) { const had = bag.items[k].n || 1; got = had >= NUT_MAX || !!bag.swap(k, { kind: 'ginkgo', n: had + 1 }); } // (a full slot: it rolls away)
    else got = bag.add({ kind: 'ginkgo', n: 1 });
    game.toast(game.t(got ? 'ginkgo.nut' : 'ginkgo.nutFull'));
    const n = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const a = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 1.6;
      dropped.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, until: now + DROPPED_MS, t: -j * 0.15, key: 'd' + now + ':' + j });
    }
    if (dropped.length > 60) dropped = dropped.slice(-60);
    dirty = true;
    return got ? 'nut' : 'full';
  }

  // The nuts on the ground near you now: [x, z, key, y].
  function lying(now) {
    const out = [], slot = Math.floor(now / SLOT_MS);
    for (const i of near) for (const n of lyingNuts(trees[i], i, slot)) if (!squashed.has(n[2])) out.push([n[0], n[1], n[2], 0]);
    for (const d of dropped) { const f = Math.max(0, 1 - Math.max(0, d.t) / 0.55); out.push([d.x, d.z, d.key, 3.2 * f * f]); } // (falling from the crown for 0.55 s)
    return out;
  }

  return {
    // E by a ginkgo's trunk (not riding or sitting: main.js checks).
    act(p) {
      if (SEASON !== 'autumn' || !near.length) return null;
      const i = nearest(p);
      if (i == null || (cool.get(i) || 0) > Date.now()) return null;
      return { key: 'ginkgo:' + i, label: '🌳 ' + game.t('ginkgo.shake'), run: () => shake(i) };
    },
    shake,
    // Every frame on the street: lay the nuts out, squash the one under you.
    update(dt, p, street) {
      mesh.visible = street && SEASON === 'autumn';
      if (!mesh.visible || !trees.length) return;
      const now = Date.now();
      // Once a second (or after a long walk or a ride): which trees are near.
      if (now - lastLook > 1000 || Math.hypot(p.x - lastX, p.z - lastZ) > 10) {
        lastLook = now; lastX = p.x; lastZ = p.z;
        const was = near.join(','), slot = Math.floor(now / SLOT_MS);
        near = [];
        for (let i = 0; i < trees.length; i++) if (Math.abs(trees[i][0] - p.x) < NEAR && Math.abs(trees[i][1] - p.z) < NEAR) near.push(i);
        const n = dropped.length;
        dropped = dropped.filter((d) => d.until > now);
        if (near.join(',') !== was || slot !== lastSlot || dropped.length !== n) { lastSlot = slot; dirty = true; }
      }
      let falling = false;
      for (const d of dropped) { if (d.t < 0.6) falling = true; d.t += dt; }
      if (dirty || falling) { nuts = lying(now); dirty = false; drawn = false; }
      // The nut under your foot (only nuts on the ground).
      for (const [x, z, key, y] of nuts) {
        if (y > 0 || Math.abs(x - p.x) > STEP || Math.abs(z - p.z) > STEP || Math.hypot(x - p.x, z - p.z) >= STEP) continue;
        if (key[0] === 'd') dropped = dropped.filter((d) => d.key !== key); else squashed.add(key);
        nuts = lying(now); drawn = false;
        game.stink?.();
        break;
      }
      if (drawn) return; // (nothing moved: no upload this frame)
      let c = 0;
      for (const [x, z, , y] of nuts) {
        if (c >= MAX) break;
        q.setFromAxisAngle(v.set(0, 1, 0), (x * 7 + z * 3) % 6.3);
        mesh.setMatrixAt(c++, m4.compose(v.set(x, 0.08 + y, z), q, one));
      }
      mesh.count = c;
      mesh.instanceMatrix.needsUpdate = true;
      drawn = true;
    },
    get nuts() { return lying(Date.now()).map(([x, z, key, y]) => [+x.toFixed(2), +z.toFixed(2), key, +y.toFixed(2)]); }, // (tests)
    get near() { return near.slice(); },
    get trees() { return trees; },
    dropAt(x, z) { dropped.push({ x, z, until: Date.now() + DROPPED_MS, t: 1, key: 'd' + Date.now() + ':t' }); dirty = true; }, // (tests)
  };
}
