// The operators' helicopter: "/헬기" (/heli) in the chat calls it, and it
// flies in from far away, high up, and lands slowly on a clear spot next to
// the operator; "/헬기보내기" (/helioff) sends it off again. The flight
// itself is core/helicopter.js. Operator accounts only (am_operator,
// supabase/009_admin.sql); for anyone else the codes read like any unknown
// command. Downloaded at an operator's first call, or when an operator near
// us has one ("he" in their state).
//
//   the model   white with a navy belly and a yellow band, a glass nose,
//               skids, a tail boom with a fin: one baked mesh, plus the two
//               rotors and the blur of the blades (about 6 draw calls)
//   the wind    near the ground the blades blow rings of dust out across
//               it, hair flies on everyone close by, and whoever stands on
//               the spot is pushed off it before the skids touch
//   the sound   the chop of the blades, louder the closer it is
//
// Everyone who sees the operator sees the same flight: the spot and the
// times are in the operator's state, and each screen works out where the
// helicopter is from its own clock. Only a name the server says is an
// operator's is believed (is_operator, supabase/005_operators.sql).
import * as THREE from 'three';
import { matCache, addBox } from '../core/three-kit.js';
import { bakeColors } from '../core/merge-static.js';
import { L } from '../ui/pocha-ui.js';
import { HELI, LANDED_AT, heliCode, heliPose, encodeHeli, parseHeli, findPad } from '../core/helicopter.js';

const TEXT = {
  coming: { en: '🚁 The helicopter is on its way (about 40 s). /헬기보내기 sends it off.', ko: '🚁 헬기가 오고 있어 (약 40초). /헬기보내기 로 돌려보내.' },
  here: { en: '🚁 It is already here. /헬기보내기 sends it off.', ko: '🚁 이미 와 있어. /헬기보내기 로 돌려보내.' },
  wait: { en: '🚁 It is still landing. Send it off once it is down.', ko: '🚁 아직 착륙 중이야. 내린 뒤에 보낼 수 있어.' },
  off: { en: '🚁 The helicopter is leaving.', ko: '🚁 헬기가 떠나.' },
  none: { en: 'No helicopter here.', ko: '부른 헬기가 없어.' },
  street: { en: 'Call it outside, on the street.', ko: '밖(거리)에서 불러 줘.' },
  room: { en: 'No room to land here. Try a wider street or a square.', ko: '여기는 내릴 자리가 없어. 넓은 길이나 광장에서 불러 줘.' },
};

const WIND_R = 13; // m: hair flies this close to the spot
const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toDeg = (rad) => rad * 180 / Math.PI;

// The helicopter, nose to +z, skids on y = 0. About 8.5 m long.
function buildModel() {
  const g = new THREE.Group();
  const W = '#f4f6f8', N = '#1d3b6e', Y = '#f2b824', D = '#2a2f3a', GL = '#27425e';
  box(g, 1.8, 1.0, 3.0, 0, 1.25, 0.5, W); // the cabin, lower half
  box(g, 1.82, 0.3, 3.02, 0, 0.72, 0.5, N); // its navy belly
  box(g, 1.84, 0.16, 3.04, 0, 1.3, 0.5, Y); // the yellow band
  box(g, 1.7, 0.75, 2.0, 0, 2.1, 0.1, W); // the cabin, upper half
  box(g, 1.72, 0.5, 1.2, 0, 2.05, 0.2, GL); // side windows
  box(g, 1.6, 0.8, 0.9, 0, 1.95, 1.55, GL); // the windscreen
  box(g, 1.5, 0.7, 0.8, 0, 1.2, 2.3, W); // the nose
  box(g, 1.3, 0.35, 0.5, 0, 1.55, 2.2, GL); // the glass over it
  box(g, 1.1, 0.4, 2.0, 0, 2.65, -0.1, W); // the engine cover
  box(g, 0.5, 0.3, 0.6, 0, 2.6, -1.2, D); // the exhaust
  box(g, 0.42, 0.42, 3.9, 0, 1.95, -2.9, W); // the tail boom
  box(g, 0.44, 0.14, 3.92, 0, 1.95, -2.9, N);
  box(g, 0.14, 1.3, 0.8, 0, 2.5, -4.6, N).rotation.x = -0.3; // the fin
  box(g, 1.6, 0.08, 0.45, 0, 2.0, -4.1, W); // the tail plane
  for (const sx of [-1, 1]) {
    box(g, 0.1, 0.1, 3.2, sx * 0.95, 0.05, 0.5, D); // a skid
    for (const z of [-0.4, 1.4]) box(g, 0.07, 0.7, 0.07, sx * 0.9, 0.4, z, D).rotation.z = sx * -0.15; // its struts
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), mat(D));
  mast.position.set(0, 3.05, 0);
  g.add(mast);
  bakeColors(g);
  for (const m of g.children) m.castShadow = true;

  // The rotors turn on their own, so they are not baked in.
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.3, 0);
  for (const a of [0, Math.PI / 2]) box(rotor, 8.4, 0.05, 0.3, 0, 0, 0, D).rotation.y = a;
  const blur = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshBasicMaterial({ color: '#3a4250', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  blur.rotation.x = -Math.PI / 2;
  blur.position.y = 3.31;
  const tail = new THREE.Group();
  tail.position.set(0.3, 2.5, -4.7);
  for (const a of [0, Math.PI / 2]) box(tail, 0.04, 1.4, 0.14, 0, 0, 0, D).rotation.x = a;
  // A red beacon under the belly, blinking (seen at night too).
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  beacon.position.set(0, 0.5, 0.3);
  g.add(rotor, blur, tail, beacon);
  return { g, rotor, blur, tail, beacon, blades: [...rotor.children] };
}

// The wind on the ground: three rings running out from under it and a
// scatter of dust carried along.
const RINGS = 3, DUST = 36;
function buildWash() {
  const g = new THREE.Group();
  const rings = [];
  const geo = new THREE.RingGeometry(0.86, 1, 40);
  geo.rotateX(-Math.PI / 2);
  for (let i = 0; i < RINGS; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#efe9dc', transparent: true, opacity: 0, depthWrite: false }));
    m.position.y = 0.06 + i * 0.01;
    rings.push(m);
    g.add(m);
  }
  const pos = new Float32Array(DUST * 3);
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#e6dfcf', size: 0.36, transparent: true, opacity: 0, depthWrite: false }));
  dust.frustumCulled = false;
  g.add(dust);
  const seeds = Array.from({ length: DUST }, (_, i) => ({ a: (i / DUST) * Math.PI * 2 + Math.random(), k: Math.random(), sp: 0.5 + Math.random() * 0.5, h: 0.2 + Math.random() * 0.9 }));
  return { g, rings, dust, pos, seeds, geo };
}

export function createHelicopter(game) {
  const crafts = new Map(); // id ('me' or a player's) → craft
  const asked = new Map(); // a player's id → { name, ok } (is that name an operator's?)
  let mine = null; // { x, z, y, dir, t0, t1 }
  let opOk = false, trustAll = !!import.meta.env?.DEV, windOn = false, sound = null, time = 0;
  const now = () => Date.now() / 1000;
  const toast = (o) => game.shop.toast(L(o));

  async function isOperator() {
    if (opOk) return true;
    if (import.meta.env?.DEV) return (opOk = true); // the local dev server (npm run dev)
    const client = game.cloud?.client;
    if (!client) return false;
    try {
      const { data, error } = await client.rpc('am_operator');
      opOk = !error && data === true;
    } catch { opOk = false; }
    return opOk;
  }

  function craftFor(id) {
    let c = crafts.get(id);
    if (!c) {
      c = { ...buildModel(), wash: buildWash(), spin: 0 };
      game.scene.add(c.g, c.wash.g);
      crafts.set(id, c);
    }
    return c;
  }
  function drop(id) {
    const c = crafts.get(id);
    if (!c) return;
    game.scene.remove(c.g, c.wash.g);
    c.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material.transparent || o.material.isMeshBasicMaterial) o.material.dispose(); } });
    c.wash.geo.dispose();
    for (const r of c.wash.rings) r.material.dispose();
    c.wash.dust.geometry.dispose();
    c.wash.dust.material.dispose();
    crafts.delete(id);
  }

  // One helicopter, this frame. → its pose, or null when it has gone.
  function draw(id, h, dt, show) {
    const p = heliPose(h, now());
    if (!p) { drop(id); return null; }
    const c = craftFor(id);
    c.g.visible = c.wash.g.visible = show;
    if (!show) return p;
    const sway = p.y - h.y > 0.3 ? 1 : 0; // (still once the skids are down)
    c.g.position.set(p.x, p.y + sway * Math.sin(time * 1.7) * 0.12, p.z);
    c.g.rotation.set(p.pitch + sway * Math.sin(time * 1.1) * 0.015, p.yaw, sway * Math.sin(time * 0.9) * 0.03, 'YXZ');
    c.spin += dt * p.rotor * 26;
    c.rotor.rotation.y = c.spin;
    c.tail.rotation.x = c.spin * 1.7;
    c.blur.material.opacity = 0.28 * clamp01((p.rotor - 0.45) / 0.4);
    for (const b of c.blades) b.visible = p.rotor < 0.85; // (at full speed only the blur)
    c.beacon.visible = (time * 1.4) % 1 < 0.35;
    // The wind on the ground under it.
    const w = c.wash, k = p.wash;
    w.g.position.set(p.x, h.y, p.z);
    for (let i = 0; i < RINGS; i++) {
      const f = (time * 0.75 + i / RINGS) % 1, r = 2 + f * 9;
      w.rings[i].scale.set(r, 1, r);
      w.rings[i].material.opacity = 0.34 * k * (1 - f) * Math.min(1, f * 6);
    }
    w.dust.material.opacity = 0.6 * k;
    if (k > 0.01) {
      for (let i = 0; i < DUST; i++) {
        const s = w.seeds[i], f = (time * s.sp * 0.6 + s.k) % 1, r = 2 + f * 10, a = s.a + f * 0.9;
        w.pos[i * 3] = Math.cos(a) * r;
        w.pos[i * 3 + 1] = 0.15 + s.h * Math.sin(f * Math.PI);
        w.pos[i * 3 + 2] = Math.sin(a) * r;
      }
      w.dust.geometry.attributes.position.needsUpdate = true;
    }
    return p;
  }

  // The chop of the blades: filtered noise, cut up 13 times a second.
  function chop(loud, rotor) {
    const sfx = game.sfx;
    if (!sfx?.on || loud < 0.004) { if (sound) sound.gain.gain.setTargetAtTime(0, sound.ctx.currentTime, 0.2); return; }
    if (!sound) {
      const ctx = sfx._ctx?.();
      if (!ctx) return;
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      const cut = ctx.createGain(), gain = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      cut.gain.value = 0.55; depth.gain.value = 0.45; gain.gain.value = 0;
      lfo.type = 'sawtooth'; lfo.frequency.value = 13;
      lfo.connect(depth).connect(cut.gain);
      src.connect(lp).connect(cut).connect(gain).connect(ctx.destination);
      src.start(); lfo.start();
      sound = { ctx, src, lfo, gain };
    }
    sound.lfo.frequency.setTargetAtTime(3 + rotor * 10, sound.ctx.currentTime, 0.2);
    sound.gain.gain.setTargetAtTime(Math.min(0.3, loud), sound.ctx.currentTime, 0.15);
  }
  function quiet() {
    if (!sound) return;
    try { sound.src.stop(); sound.lfo.stop(); } catch { /* already stopped */ }
    sound.gain.disconnect();
    sound = null;
  }

  // The chat code: true when it was ours (and we are an operator).
  async function command(code) {
    const k = code === 'call' || code === 'off' ? code : heliCode(code);
    if (!k || !(await isOperator())) return false;
    const age = mine ? now() - mine.t0 : 0;
    if (k === 'off') {
      if (!mine || mine.t1) toast(TEXT.none);
      else if (age < LANDED_AT) toast(TEXT.wait);
      else { mine.t1 = now(); game.resend?.(); toast(TEXT.off); }
      return true;
    }
    if (mine && !mine.t1) { toast(TEXT.here); return true; }
    if (game.mode !== 'street') { toast(TEXT.street); return true; }
    const p = game.me.root.position;
    const pad = findPad(p.x, p.z, game.me.root.rotation.y, (x, z, r) => !game.blocked(x, z, r));
    if (!pad) { toast(TEXT.room); return true; }
    drop('me'); // (one still flying away)
    const dir = Math.round(toDeg(game.me.root.rotation.y) + (Math.random() - 0.5) * 70); // from ahead of the operator, so they see it come
    mine = { ...pad, y: Math.round(p.y * 10) / 10, dir, t0: now(), t1: null };
    game.resend?.();
    toast(TEXT.coming);
    return true;
  }

  // Someone else's, from their state: only an operator's name is believed.
  function theirs(q) {
    const s = q.target?.he;
    if (!s) { asked.delete(q.id); return null; }
    let a = asked.get(q.id);
    if (!a || a.name !== q.name) {
      a = { name: q.name, ok: trustAll };
      asked.set(q.id, a);
      if (!a.ok) Promise.resolve(game.isOperatorName?.(q.name)).then((yes) => { a.ok = yes === true; }, () => {});
    }
    return a.ok ? parseHeli(s) : null;
  }

  return {
    command,
    isOperator,
    // Our state for others: where it lands and when it was called.
    state(st) { if (mine && game.mode === 'street') st.he = encodeHeli(mine); },
    gone(id) { asked.delete(id); drop(id); },
    // Every frame: every helicopter in sight, the wind and the sound.
    update(dt) {
      time += dt;
      const street = game.mode === 'street';
      const me = game.me.root.position;
      const seen = new Set();
      let wind = 0, loud = 0, rotor = 0;
      const each = (id, h, show) => {
        const p = draw(id, h, dt, show);
        if (!p) return false;
        seen.add(id);
        if (!show) return true;
        const flat = Math.hypot(me.x - h.x, me.z - h.z), far = Math.hypot(me.x - p.x, p.y - me.y, me.z - p.z);
        wind = Math.max(wind, p.wash * clamp01(1 - flat / WIND_R));
        const l = p.rotor * 0.3 / (1 + (far / 22) ** 2);
        if (l > loud) { loud = l; rotor = p.rotor; }
        // Standing where it comes down (or in it, once it has): step aside.
        const low = p.y - h.y, r = p.phase === 'landed' || p.phase === 'spinup' ? 1.7 : low < 9 ? 3.2 : 0;
        if (r && flat < r && !game.busy && Math.abs(me.y - h.y) < 2) {
          const a = flat > 0.05 ? Math.atan2(me.x - h.x, me.z - h.z) : p.yaw + Math.PI / 2;
          const step = Math.min(r - flat, dt * 3), nx = me.x + Math.sin(a) * step, nz = me.z + Math.cos(a) * step;
          if (!game.blocked(nx, nz, 0.35)) { me.x = nx; me.z = nz; }
        }
        // Hair flies on the people around it too.
        if (p.wash > 0.02) for (const o of game.others?.players?.values() || []) {
          if (o.hidden || !o.target || o.target.cs) continue;
          const d = Math.hypot(o.ch.root.position.x - h.x, o.ch.root.position.z - h.z);
          if (d < WIND_R + 2) o.ch.setWind?.(p.wash * clamp01(1 - d / WIND_R));
        }
        return true;
      };
      if (mine && !each('me', mine, street)) mine = null;
      for (const q of game.others?.players?.values() || []) {
        const h = !q.hidden && theirs(q);
        if (h) each(q.id, h, street);
      }
      for (const id of [...crafts.keys()]) if (!seen.has(id)) drop(id);
      if (wind > 0.02 && !game.busy) { game.me.setWind?.(wind); windOn = true; }
      else if (windOn) { game.me.setWind?.(0); windOn = false; }
      chop(loud, rotor);
      if (!crafts.size && sound) quiet();
    },
    get mine() { return mine; },
    get count() { return crafts.size; },
    craft: (id = 'me') => crafts.get(id) || null,
    spots: () => [...crafts].map(([id, c]) => ({ id, x: c.g.position.x, y: c.g.position.y, z: c.g.position.z, dust: c.wash.dust.material.opacity, shown: c.g.visible })), // (tests/e2e)
    trustAll() { trustAll = true; asked.clear(); }, // (tests/e2e: no server to ask about names)
    HELI,
  };
}
