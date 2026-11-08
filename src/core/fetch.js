// One frisbee throw played out (core/frisbee.js): the disc's flight, the pet
// racing after it, the catch or the miss, and the trot back to its owner.
// The same code runs for my own pet (game/frisbee.js) and, from the short
// "fb" note in another player's state, for their pet as everyone sees it.
import { flightTime, discAt, chaseSpeed, canCatch, fetches, makeDisc, FRISBEE_COLORS, DISC_R, makeFace, CATCH_FACES, MISS_FACES, THROW_MAX } from './frisbee.js';

// A throw as sent to others: "seq,fx,fz,tx,tz,lucky,colour,react".
export function encodeThrow(f) {
  const r = (v) => Math.round(v * 10) / 10;
  return [f.seq | 0, r(f.from.x), r(f.from.z), r(f.to.x), r(f.to.z), f.lucky ? 1 : 0, f.c | 0, Math.round(f.react * 100) / 100].join(',');
}
export function parseThrow(v) {
  if (typeof v !== 'string' || v.length > 64) return null;
  const n = v.split(',').map(Number);
  if (n.length !== 8 || !n.every(Number.isFinite)) return null;
  const [seq, fx, fz, tx, tz, lucky, c, react] = n;
  const d = Math.hypot(tx - fx, tz - fz);
  if (d > THROW_MAX + 1 || c < 0 || c >= FRISBEE_COLORS.length || c % 1 || react < 0 || react > 1) return null;
  return { seq, from: { x: fx, z: fz }, to: { x: tx, z: tz }, d, lucky: lucky === 1, c, react };
}

/**
 * pet: a Companion; scene: where the disc flies; owner(): { x, y, z, ry };
 * throw: { from, to, d, lucky, c, react }; on(event): 'caught' | 'missed' |
 * 'landed' (a pet that doesn't fetch: it lies there) | 'fetching' (a cat
 * that, this once, goes to get it after it lands) | 'home' (dropped at
 * your feet). tick(dt) returns false once it's over.
 */
export function playFetch(pet, scene, owner, thr, on = () => {}) {
  const kind = pet.def.kind, fetcher = fetches(kind), catFetch = kind === 'cat' && thr.lucky, scale = pet.def.scale || 1;
  const ground = owner().y || 0;
  const T = flightTime(thr.d ?? Math.hypot(thr.to.x - thr.from.x, thr.to.z - thr.from.z));
  const disc = makeDisc(FRISBEE_COLORS[thr.c | 0]);
  scene.add(disc);
  pet.playing = true;
  let phase = 'fly', t = 0, hop = 0, lost = 0, waited = 0, face = null;

  function showFace(faces) {
    face?.s.removeFromParent();
    const s = makeFace(faces[Math.floor(Math.random() * faces.length)]);
    pet.root.add(s);
    face = { s, t: 0, emoji: s.material.map.userData?.emoji, y: 0.75 * scale + (kind === 'monkey' ? 0.35 : 0.1) };
  }
  function tickFace(dt) {
    if (!face) return;
    face.t += dt;
    face.s.scale.setScalar(0.5 * Math.min(1, face.t / 0.15) * (1 + 0.15 * Math.sin(Math.min(1, face.t / 0.3) * Math.PI)));
    face.s.position.y = face.y + face.t * 0.15;
    face.s.material.opacity = face.t < 1.4 ? 1 : Math.max(0, 1 - (face.t - 1.4) / 0.4);
    if (face.t > 1.8) { face.s.removeFromParent(); face = null; }
  }
  // Into the dog's mouth, flat and gripped by its edge (the face stays in
  // view), or upright in a monkey's hand. (They're scaled with the body.)
  function grab() {
    disc.scale.setScalar(1 / scale);
    if (kind === 'monkey') { pet.body.add(disc); disc.position.set(-0.24, 0.17, 0.06 + DISC_R / scale); disc.rotation.set(Math.PI / 2, 0, 0); } else { pet.head.add(disc); disc.position.set(0, -0.09, 0.19 + DISC_R / scale); disc.rotation.set(0, 0, 0); }
    hop = 0; lost = 0; waited = 0;
  }
  function stop() {
    disc.removeFromParent();
    pet.playing = false;
    pet.body.position.y = 0;
    phase = 'done';
  }

  function tick(dt) {
    tickFace(dt);
    if (phase === 'done') return !!face;
    t += dt;
    const pr = pet.root.position;
    if (phase === 'fly') {
      const s = Math.min(1, t / T);
      const at = discAt(thr.from, thr.to, s, ground);
      disc.position.set(at.x, at.y, at.z);
      disc.rotation.y += dt * 18; // spinning
      disc.rotation.z = Math.sin(t * 3) * 0.08;
      if (fetcher) {
        if (t > thr.react) { if (pet.run(dt, thr.to.x, thr.to.z, chaseSpeed(kind, scale), hop) < 0.1) pet.watch(dt, at.x, at.z, 18); } else pet.watch(dt, at.x, at.z, 18);
        const dx = at.x - pr.x, dz = at.z - pr.z;
        if (Math.hypot(dx, dz) < 1.6 && s > 0.5 && s < 1) hop = kind === 'monkey' ? 0.4 : 0.25 + 0.1 * scale; // close under it: leap
        if (s < 1 && thr.lucky && canCatch(dx, dz, at.y - ground, scale, kind)) { grab(); showFace(CATCH_FACES); phase = 'back'; on('caught'); return true; }
      } else pet.watch(dt, at.x, at.z, 3);
      if (s >= 1) {
        disc.position.y = ground + 0.03;
        disc.rotation.z = 0;
        if (fetcher) { phase = 'fetch'; showFace(MISS_FACES); on('missed'); } else if (catFetch) { phase = 'fetch'; on('fetching'); } else { phase = 'lie'; pet.playing = false; on('landed'); }
      }
      return true;
    }
    if (phase === 'fetch') {
      if (pet.run(dt, disc.position.x, disc.position.z, chaseSpeed(kind, scale)) < 0.35) { grab(); phase = 'back'; }
      return true;
    }
    if (phase === 'back') { // trot back to just in front of the owner and drop it at their feet
      const o = owner();
      const left = pet.run(dt, o.x + Math.sin(o.ry) * 0.9, o.z + Math.cos(o.ry) * 0.9, chaseSpeed(kind, scale) * 0.8);
      lost += dt;
      if (left < 0.15 || lost > 15) {
        pet.watch(dt, o.x, o.z);
        if ((waited += dt) > 0.3) { stop(); on('home'); }
      }
      return true;
    }
    return true; // 'lie': waits on the grass until stop()
  }

  return {
    tick, stop,
    get phase() { return phase; },
    get face() { return face && face.s.parent ? face.emoji : null; },
    get disc() { return disc; },
  };
}
