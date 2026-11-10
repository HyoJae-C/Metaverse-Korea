// Zoo animals you can hear: when an animal near you starts a motion (a lion
// roars, the elephants lock trunks, a seal barks, the peacock fans its
// train), its call plays (core/zoo-voices.js), louder the nearer you are and
// from its side of the screen. Works for any Zoo: the street's and the Sea
// Animals hall's tanks (core/zoo-sea-hall.js).
//   game: { sfx (core/music.js Sfx), listener() -> { x, z, rx, rz } where
//   you are and the camera's right-hand direction }.
import { callFor, fallOff, playCall, LOUD } from '../core/zoo-voices.js';

export const COOLDOWN = 5; // s: one animal calls at most this often
export const GAP = 0.6; // s: at most one new call this often, all animals together

export function createZooSounds(game) {
  let lastAny = -Infinity;
  const now = () => performance.now() / 1000;
  // Where a sound at (x, z) sits for the listener: { gain, pan } or null.
  function placeOf(x, z) {
    const L = game.listener();
    if (!L) return null;
    const dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz);
    const gain = fallOff(d);
    if (gain <= 0.01) return null;
    const pan = d > 0.5 ? Math.max(-1, Math.min(1, (dx * L.rx + dz * L.rz) / d)) * 0.7 : 0;
    return { gain, pan };
  }
  function play(name, x, z) {
    const sfx = game.sfx;
    if (!sfx?.on) return false;
    const at = placeOf(x, z);
    if (!at) return false;
    const c = sfx._ctx?.();
    if (!c) return false;
    const g = c.createGain();
    g.gain.value = at.gain * (LOUD[name] || 0.25);
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = at.pan;
      g.connect(p).connect(c.destination);
    } else g.connect(c.destination);
    playCall(c, g, name);
    setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, 3000);
    return true;
  }
  // Hear a zoo's animals: ox, oz turn its pen coordinates into the
  // listener's (the street's are already world metres).
  function attach(zoo, ox = 0, oz = 0) {
    zoo.onSound = (a, motion) => {
      const name = callFor(a.kind, motion);
      if (!name) return;
      const t = now();
      if (t - (a.calledAt ?? -Infinity) < COOLDOWN || t - lastAny < GAP) return;
      const x = ox + a.pen.x + a.root.position.x, z = oz + a.pen.z + a.root.position.z;
      if (play(name, x, z)) { a.calledAt = t; lastAny = t; }
    };
  }
  return { attach, play, placeOf };
}
