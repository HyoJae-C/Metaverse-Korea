// The moktak (목탁, Yozi 2026-11-15): somewhere in Jogyesa and Bongeunsa a
// monk is chanting, and inside the grounds you hear the wooden fish being
// struck: a steady "tok tok tok", then a rest. Loudest by Daeungjeon, gone
// a little outside the wall. Made with Web Audio (no sound file), through
// core/music.js Sfx (its context and its sound on/off switch).
//   const moktak = createMoktak({ sfx, landmarks });
//   moktak.tick(p, dt, onStreet, inHall)  // inHall: inside a dharma hall (core/dharma-hall.js), heard softly all through it
export const MOKTAK = { gap: 0.55, knocks: 14, rest: 5, near: 18, far: 50, vol: 0.16 };

// Where it comes from: each temple's Daeungjeon (world metres).
export function moktakSources(landmarks = []) {
  const out = [];
  for (const l of landmarks) {
    if (l.type === 'jogyesa' && l.jg) out.push([l.x, l.z]); // (the landmark stands on Daeungjeon, data/jogyesa.js)
    if (l.type === 'bongeunsa') {
      const h = (l.halls || []).find((q) => q[6] === '大雄殿');
      if (h) out.push([l.x + h[0], l.z + h[1]]);
    }
  }
  return out;
}
// How loud at d metres from the source: 1 up to `near`, fading out by `far`.
export const moktakGain = (d) => (d <= MOKTAK.near ? 1 : d >= MOKTAK.far ? 0 : (1 - (d - MOKTAK.near) / (MOKTAK.far - MOKTAK.near)) ** 1.5);

export function createMoktak({ sfx, landmarks }) {
  let sources = null, t = 0;
  function knock(loud, accent) {
    const c = sfx._ctx();
    if (!c) return;
    const at = c.currentTime + 0.01, v = MOKTAK.vol * loud * (accent ? 1.15 : 1);
    // A hollow wooden body: a low ring with a quick, slightly bent pitch,
    // a higher partial that dies fast, and the click of the stick.
    for (const [hz, k, len] of [[560, 1, 0.2], [1390, 0.35, 0.06]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(hz * 1.04, at);
      o.frequency.exponentialRampToValueAtTime(hz, at + 0.03);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(v * k, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g).connect(c.destination);
      o.start(at);
      o.stop(at + len + 0.02);
    }
  }
  return {
    tick(p, dt, onStreet, inHall = false) {
      t += dt;
      const cycle = MOKTAK.knocks * MOKTAK.gap + MOKTAK.rest;
      const before = t - dt;
      if (!(onStreet || inHall) || !sfx.on) return;
      sources ||= moktakSources(landmarks);
      let loud = inHall ? 0.7 : 0;
      if (onStreet) for (const [x, z] of sources) loud = Math.max(loud, moktakGain(Math.hypot(p.x - x, p.z - z)));
      if (loud <= 0.02) return;
      // A knock each time the clock passes a beat in the knocking part of the cycle.
      const beat = (s) => Math.floor((s % cycle) / MOKTAK.gap);
      const k = beat(t);
      if (k < MOKTAK.knocks && (Math.floor(before / cycle) !== Math.floor(t / cycle) || beat(before) !== k)) knock(loud, k === 0);
    },
  };
}
