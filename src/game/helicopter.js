// The operators' helicopter: "/헬기" (/heli) in the chat calls it, and it
// flies in from far away, high up, and lands slowly on a clear spot next to
// the operator; "/헬기보내기" (/helioff) sends it off again. The flight
// itself is core/helicopter.js. Operator accounts only (am_operator,
// supabase/009_admin.sql); for anyone else the codes read like any unknown
// command. Downloaded at an operator's first call, or when an operator near
// us has one ("he" in their state).
//
//   the model   white with a navy belly and a yellow band, open sides with
//               seats inside, a windscreen, skids, a tail boom with a fin:
//               one baked mesh, plus the glass, the two rotors and the blur
//               of the blades (about 7 draw calls)
//   the wind    near the ground the blades blow rings of dust out across
//               it, hair flies on everyone close by, and whoever stands on
//               the spot is pushed off it before the skids touch
//   the sound   the chop of the blades, louder the closer it is
//
// Everyone who sees the operator sees the same flight: the spot and the
// times are in the operator's state, and each screen works out where the
// helicopter is from its own clock. Only a name the server says is an
// operator's is believed (is_operator, supabase/005_operators.sql).
//
// Flying it: once it has landed the operator stands next to it and taps 🚁
// to get in. Move as usual; Space or R goes up, C or F down (▲ ▼ on a
// phone), Shift goes faster. ⬇ lands it on the nearest clear ground and
// everyone gets out. With the operator aboard the helicopter is simply
// where the operator is ("F" in their state).
//
// Passengers: on the ground, 🫴 asks the people standing next to it aboard,
// two at most (the bench behind the pilot). They accept on their own screen
// and ride along ("hr" in their state) until it lands or they get out (🪂,
// on the ground only).
import * as THREE from 'three';
import { matCache, addBox } from '../core/three-kit.js';
import { bakeColors } from '../core/merge-static.js';
import { L } from '../ui/pocha-ui.js';
import { t as tr } from '../core/i18n.js';
import {
  HELI, LANDED_AT, FLY, SEATS, heliCode, heliPose, encodeHeli, parseHeli, findPad,
  seatAt, craftUnder, encodeCrewed, encodeRider, parseRider, heliMsg, parseHeliMsg,
} from '../core/helicopter.js';

const TEXT = {
  coming: { en: '🚁 The helicopter is on its way (about 40 s). /헬기보내기 sends it off.', ko: '🚁 헬기가 오고 있어 (약 40초). /헬기보내기 로 돌려보내.' },
  here: { en: '🚁 It is already here. /헬기보내기 sends it off.', ko: '🚁 이미 와 있어. /헬기보내기 로 돌려보내.' },
  wait: { en: '🚁 It is still landing. Send it off once it is down.', ko: '🚁 아직 착륙 중이야. 내린 뒤에 보낼 수 있어.' },
  off: { en: '🚁 The helicopter is leaving.', ko: '🚁 헬기가 떠나.' },
  none: { en: 'No helicopter here.', ko: '부른 헬기가 없어.' },
  street: { en: 'Call it outside, on the street.', ko: '밖(거리)에서 불러 줘.' },
  room: { en: 'No room to land here. Try a wider street or a square.', ko: '여기는 내릴 자리가 없어. 넓은 길이나 광장에서 불러 줘.' },
  aboard: { en: '🚁 Space / C or ▲ ▼ to go up and down, Shift is faster, ⬇ lands. 🫴 asks people aboard.', ko: '🚁 Space / C 또는 ▲ ▼ 로 위아래, Shift 로 빠르게, ⬇ 로 착륙. 🫴 로 옆 사람 태우기.' },
  getOut: { en: 'Land it first (⬇).', ko: '먼저 착륙해 줘 (⬇).' },
  nobody: { en: 'Nobody next to the helicopter (within 7 m).', ko: '헬기 옆(7m 안)에 태울 사람이 없어.' },
  full: { en: 'Both seats are taken.', ko: '두 자리가 다 찼어.' },
  ground: { en: 'Land first, then ask them aboard.', ko: '땅에 내린 뒤에 태울 수 있어.' },
  sent: { en: 'Asked {name}', ko: '{name}님에게 물어봤어' },
  joined: { en: '{name} is aboard', ko: '{name}님이 탔어' },
  declined: { en: '{name} said no', ko: '{name}님이 거절했어' },
  left: { en: '{name} got out', ko: '{name}님이 내렸어' },
  landed: { en: '🚁 Landed.', ko: '🚁 착륙했어.' },
};
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const BTN_BG = 'rgba(20,30,50,.55)';
const BTN = 'width:52px;height:52px;border-radius:50%;border:0;font-size:22px;background:' + BTN_BG + ';color:#fff;touch-action:none';
const PANEL = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:40;background:rgba(255,255,255,.96);border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.2);font:600 15px system-ui,sans-serif;color:#2b2230;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
const CHOICE = 'border:0;border-radius:12px;padding:10px 14px;font:600 15px system-ui,sans-serif;background:#ffe3d9;color:#2b2230;cursor:pointer';

const WIND_R = 13; // m: hair flies this close to the spot
const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toDeg = (rad) => rad * 180 / Math.PI;

// The helicopter, nose to +z, skids on y = 0. About 8.5 m long. The cabin is
// open at the sides, so you can see who is aboard (core/helicopter.js SEATS).
function buildModel() {
  const g = new THREE.Group();
  const W = '#f4f6f8', N = '#1d3b6e', Y = '#f2b824', D = '#2a2f3a', S = '#3d5a80';
  box(g, 1.8, 0.3, 3.0, 0, 0.83, 0.5, W); // the cabin floor
  box(g, 1.82, 0.26, 3.02, 0, 0.62, 0.5, N); // its navy belly
  box(g, 1.84, 0.1, 3.04, 0, 0.9, 0.5, Y); // the yellow band
  box(g, 1.8, 0.14, 3.0, 0, 2.6, 0.5, W); // the roof
  box(g, 1.8, 1.6, 0.12, 0, 1.8, -0.94, W); // the back wall
  for (const sx of [-1, 1]) {
    box(g, 0.1, 1.56, 0.1, sx * 0.85, 1.76, 1.95, W); // the windscreen posts
    box(g, 0.06, 0.42, 1.5, sx * 0.87, 1.2, -0.2, W); // a low door panel by the back seats
    box(g, 0.06, 0.42, 0.7, sx * 0.87, 1.2, 1.6, W); // and by the front ones
    box(g, 0.1, 0.1, 3.2, sx * 0.95, 0.05, 0.5, D); // a skid
    for (const z of [-0.4, 1.4]) box(g, 0.07, 0.5, 0.07, sx * 0.92, 0.3, z, D); // its struts
  }
  box(g, 0.5, 0.36, 0.5, SEATS.pilot[0], 1.16, SEATS.pilot[2] - 0.05, S); // the pilot's seat
  box(g, 0.5, 0.36, 0.5, -SEATS.pilot[0], 1.16, SEATS.pilot[2] - 0.05, S);
  box(g, 1.5, 0.36, 0.5, 0, 1.16, SEATS.riders[0][2] - 0.05, S); // the bench behind
  box(g, 1.5, 0.5, 0.8, 0, 1.05, 2.35, W); // the nose
  box(g, 1.3, 0.3, 0.5, 0, 1.36, 2.2, D); // the instrument panel
  box(g, 1.1, 0.4, 2.0, 0, 2.86, -0.1, W); // the engine cover
  box(g, 0.5, 0.3, 0.6, 0, 2.82, -1.2, D); // the exhaust
  box(g, 0.42, 0.42, 3.9, 0, 2.2, -2.9, W); // the tail boom
  box(g, 0.44, 0.14, 3.92, 0, 2.2, -2.9, N);
  box(g, 0.14, 1.3, 0.8, 0, 2.75, -4.6, N).rotation.x = -0.3; // the fin
  box(g, 1.6, 0.08, 0.45, 0, 2.25, -4.1, W); // the tail plane
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), mat(D));
  mast.position.set(0, 3.26, 0);
  g.add(mast);
  bakeColors(g);
  for (const m of g.children) m.castShadow = true;

  // The windscreen: glass you can see the pilot through.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 0.05), new THREE.MeshBasicMaterial({ color: '#9fc6e0', transparent: true, opacity: 0.32, depthWrite: false }));
  glass.position.set(0, 1.92, 2.0);
  glass.rotation.x = -0.12;
  // The rotors turn on their own, so they are not baked in.
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.5, 0);
  for (const a of [0, Math.PI / 2]) box(rotor, 8.4, 0.05, 0.3, 0, 0, 0, D).rotation.y = a;
  const blur = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshBasicMaterial({ color: '#3a4250', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  blur.rotation.x = -Math.PI / 2;
  blur.position.y = 3.51;
  const tail = new THREE.Group();
  tail.position.set(0.3, 2.75, -4.7);
  for (const a of [0, Math.PI / 2]) box(tail, 0.04, 1.4, 0.14, 0, 0, 0, D).rotation.x = a;
  // A red beacon under the belly, blinking (seen at night too).
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  beacon.position.set(0, 0.44, 0.3);
  g.add(glass, rotor, blur, tail, beacon);
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
  const known = new Map(); // a player's id → { name, ok } (is that name an operator's?)
  let mine = null; // called, landing, landed or leaving by itself: { x, z, y, dir, t0, t1 }
  let crew = null; // I am flying it: { pos, vel, yaw, pitch, roll, rotor, ground, phase: 'up' | 'fly' | 'down', t, land }
  const riders = new Map(); // seat (0, 1) → the player's id: who rides with me
  const offers = new Map(); // id → { slot, until }: seats I offered
  let riding = null; // I am a passenger: { pilot, slot, lost }
  let invite = null; // { from, slot, until }: someone offered me a seat
  let pad = null, panel = null, climbBtn = 0, savedFog = null, roofs = null;
  let opOk = false, trustAll = !!import.meta.env?.DEV, windOn = false, sound = null, time = 0;
  const vel1 = new THREE.Vector3();
  const now = () => Date.now() / 1000;
  const toast = (o, vars) => game.shop.toast(fmt(L(o), vars || {}));
  const nameOf = (id) => game.others?.nameOf?.(id) || '?';
  const send = (verb, target, slot) => game.net?.sendEmote?.(heliMsg(verb, target, slot));
  const groundAt = (x, z) => game.groundY?.(x, z) || 0;
  const free = (x, z, r) => !game.blocked(x, z, r);

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
      c = { ...buildModel(), wash: buildWash(), spin: 0, pose: null };
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

  // One helicopter, this frame: p = where it is, how the blades turn, the
  // ground under it.
  function draw(id, p, dt, show) {
    const c = craftFor(id);
    c.pose = p;
    c.g.visible = c.wash.g.visible = show;
    if (!show) return;
    const sway = p.phase !== 'crew' && p.y - p.ground > 0.3 ? 1 : 0; // (still once the skids are down, steady with people aboard)
    c.g.position.set(p.x, p.y + sway * Math.sin(time * 1.7) * 0.12, p.z);
    c.g.rotation.set(p.pitch + sway * Math.sin(time * 1.1) * 0.015, p.yaw, (p.roll || 0) + sway * Math.sin(time * 0.9) * 0.03, 'YXZ');
    c.spin += dt * p.rotor * 26;
    c.rotor.rotation.y = c.spin;
    c.tail.rotation.x = c.spin * 1.7;
    c.blur.material.opacity = 0.28 * clamp01((p.rotor - 0.45) / 0.4);
    for (const b of c.blades) b.visible = p.rotor < 0.85; // (at full speed only the blur)
    c.beacon.visible = (time * 1.4) % 1 < 0.35;
    // The wind on the ground under it.
    const w = c.wash, k = p.wash;
    w.g.position.set(p.x, p.ground, p.z);
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

  // ---------- Buttons and panels ----------
  function button(label, aria, onDown, onUp) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-label', aria);
    b.style.cssText = BTN;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
    if (onUp) for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, onUp);
    return b;
  }
  function makePad() {
    pad = document.createElement('div');
    pad.id = 'heli-pad';
    pad.style.cssText = 'position:fixed;right:84px;top:30%;display:flex;flex-direction:column;gap:10px;z-index:30';
    pad.board = button('🚁', 'Get in the helicopter', () => board());
    pad.up = button('▲', 'Fly up', () => { climbBtn = 1; }, () => { if (climbBtn === 1) climbBtn = 0; });
    pad.down = button('▼', 'Fly down', () => { climbBtn = -1; }, () => { if (climbBtn === -1) climbBtn = 0; });
    pad.ask = button('🫴', 'Ask people aboard', () => ask());
    pad.land = button('⬇', 'Land and get out', () => land());
    pad.off = button('🪂', 'Get out', () => getOut());
    pad.append(pad.board, pad.up, pad.down, pad.ask, pad.land, pad.off);
    document.body.append(pad);
  }
  function canBoard() {
    if (!mine || mine.t1 || crew || riding || !opOk || game.mode !== 'street' || game.occupied) return false;
    const c = crafts.get('me'), me = game.me.root.position;
    return c?.pose?.phase === 'landed' && Math.hypot(me.x - mine.x, me.z - mine.z) < FLY.board;
  }
  function refreshPad() {
    const boardable = canBoard(), flying = !!crew && crew.phase !== 'down';
    const any = boardable || !!crew || !!riding;
    if (!pad && !any) return;
    if (!pad) makePad();
    pad.hidden = !any;
    pad.board.hidden = !boardable;
    pad.up.hidden = pad.down.hidden = pad.land.hidden = !flying;
    pad.ask.hidden = !(flying && crew.pos.y - crew.ground < 0.5 && riders.size < 2);
    pad.off.hidden = !riding;
    if (!flying) climbBtn = 0;
  }
  function closePanel() { panel?.remove(); panel = null; }
  function showPanel(title, choices) {
    closePanel();
    panel = document.createElement('div');
    panel.id = 'heli-panel';
    panel.style.cssText = PANEL;
    const h = document.createElement('div');
    h.textContent = title;
    panel.append(h);
    for (const [label, run] of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = CHOICE;
      b.onclick = () => { closePanel(); run(); };
      panel.append(b);
    }
    document.body.append(panel);
  }

  // Up high the fog moves out, so the city shows (as in game/sky-flight.js).
  function fogFor(y) {
    const fog = game.scene.fog;
    if (!fog) return;
    savedFog ||= { near: fog.near, far: fog.far };
    const k = clamp01(y / 80);
    fog.near = savedFog.near + (500 - savedFog.near) * k;
    fog.far = savedFog.far + (1700 - savedFog.far) * k;
  }
  function fogBack() {
    if (savedFog && game.scene.fog) Object.assign(game.scene.fog, savedFog);
    savedFog = null;
  }

  // A place to stand next to a helicopter at p: beside the door (side: -1
  // its right, 1 its left), or anywhere free round it.
  function besides(p, side, seat) {
    for (const r of [2.4, 3.2, 4.2]) {
      for (const s of [side, -side]) {
        const [x, , z] = seatAt([s * r, 0, seat[2]], p.x, 0, p.z, p.yaw);
        if (free(x, z, 0.35)) return [x, z];
      }
    }
    for (let a = 0; a < 12; a++) {
      const x = p.x + Math.cos(a * Math.PI / 6) * 5, z = p.z + Math.sin(a * Math.PI / 6) * 5;
      if (free(x, z, 0.35)) return [x, z];
    }
    return [p.x, p.z];
  }
  function standAt(x, z) {
    const me = game.me.root;
    me.position.set(x, groundAt(x, z), z);
    me.rotation.set(0, me.rotation.y, 0);
    fogBack();
    game.resend?.();
  }

  // ---------- Flying it (the operator) ----------
  function board() {
    if (!canBoard()) return;
    const p = crafts.get('me').pose;
    crew = { pos: new THREE.Vector3(p.x, p.y, p.z), vel: new THREE.Vector3(), yaw: p.yaw, pitch: 0, roll: 0, rotor: p.rotor, ground: p.ground, phase: 'up', t: 0, land: null };
    mine = null;
    if (!roofs) import('./sky-flight.js').then(({ Roofs }) => { roofs = new Roofs(game.buildings); }, () => {}); // (rooftops to stay over)
    if (game.cam) game.cam.dist = Math.max(game.cam.dist, 16);
    game.resend?.();
    toast(TEXT.aboard);
  }
  // Everyone out, the helicopter gone from under us (a warp, a door).
  function endCrew() {
    if (!crew) return;
    for (const id of riders.values()) send('end', id);
    riders.clear(); offers.clear();
    crew = null;
    fogBack();
    game.resend?.();
  }
  // ⬇: down onto the nearest clear ground, then everyone gets out.
  function land() {
    if (!crew || crew.phase === 'down') return;
    const { x, z } = crew.pos;
    const spot = free(x, z, HELI.pad) && !roofs?.at(x, z) ? { x, z } : findPad(x, z, crew.yaw, (px, pz, r) => free(px, pz, r) && !roofs?.at(px, pz));
    if (!spot) { toast(TEXT.room); return; }
    crew.land = { ...spot, y: groundAt(spot.x, spot.z) };
    crew.phase = 'down';
  }
  function touchDown() {
    const p = { x: crew.pos.x, z: crew.pos.z, yaw: crew.yaw };
    for (const id of riders.values()) send('end', id);
    riders.clear(); offers.clear();
    // It stands there as if it had just landed by itself: the blades run down.
    mine = { x: p.x, z: p.z, y: crew.land.y, dir: Math.round(toDeg(crew.yaw) - 180), t0: now() - LANDED_AT, t1: null };
    crew = null;
    standAt(...besides(p, 1, SEATS.pilot));
    toast(TEXT.landed);
  }
  // Each frame while aboard, in place of walking (main.js). → the walk speed
  // for the body's clip (seated: 0).
  function fly(dt, p, mx, my, camYaw, fast) {
    if (game.mode !== 'street') { // a warp or a door: back on foot
      endCrew();
      if (riding) { send('leave', riding.pilot); riding = null; fogBack(); }
      return 0;
    }
    if (!crew) return 0; // a passenger: seated in update()
    const c = crew, H = c.pos;
    c.t += dt;
    const k = game.input?.keys;
    const climb = climbBtn || ((k?.has('Space') || k?.has('KeyR') ? 1 : 0) - (k?.has('KeyC') || k?.has('KeyF') ? 1 : 0));
    const roof = roofs?.at(H.x, H.z);
    const floor = Math.max(groundAt(H.x, H.z), roof ? roof.h : 0);
    c.ground = floor;
    if (c.phase === 'up') {
      c.rotor = Math.min(1, c.rotor + dt / HELI.spinUp);
      if (c.rotor >= 1) c.phase = 'fly';
      c.vel.set(0, 0, 0);
    } else if (c.phase === 'down') {
      const L0 = c.land, dx = L0.x - H.x, dz = L0.z - H.z, d = Math.hypot(dx, dz);
      const step = Math.min(d, 10 * dt);
      if (d > 0.01) { H.x += (dx / d) * step; H.z += (dz / d) * step; }
      const low = Math.max(L0.y, floor) + (d > 3 ? 5 : 0); // (over the roofs until it is above the spot)
      H.y = Math.max(low, H.y - THREE.MathUtils.clamp((H.y - L0.y) * 0.45, 1.3, 7) * dt);
      c.vel.set(d > 0.01 ? (dx / d) * step / dt : 0, 0, d > 0.01 ? (dz / d) * step / dt : 0);
      if (climb > 0 || Math.hypot(mx, my) > 0.3) { c.phase = 'fly'; c.land = null; } // the pilot took over again
      else if (d < 0.05 && H.y <= L0.y + 0.02) { H.y = L0.y; touchDown(); return 0; }
    } else {
      const sp = fast ? FLY.fast : FLY.speed;
      const fx0 = -Math.sin(camYaw), fz0 = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const down = H.y <= floor + 0.05; // on its skids: straight up first
      vel1.set(down ? 0 : (fx0 * my + rx * mx) * sp, climb * FLY.climb * (fast ? 2 : 1), down ? 0 : (fz0 * my + rz * mx) * sp);
      c.vel.lerp(vel1, 1 - Math.exp(-dt * 1.8));
      H.addScaledVector(c.vel, dt);
      H.y = Math.min(FLY.top, Math.max(floor, H.y));
      if (H.y <= floor && c.vel.y < 0) c.vel.y = 0;
      const b = game.bounds;
      if (b) {
        H.x = Math.min(b.maxX + 150, Math.max(b.minX - 150, H.x));
        H.z = Math.min(b.maxZ + 150, Math.max(b.minZ - 150, H.z));
      }
    }
    // The nose follows where it flies, banking into turns.
    const across = Math.hypot(c.vel.x, c.vel.z);
    let turn = 0;
    if (across > 1.5) {
      let d = Math.atan2(c.vel.x, c.vel.z) - c.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      turn = d * Math.min(1, dt * 2.2);
      c.yaw += turn;
    }
    c.pitch += (0.14 * clamp01(across / FLY.speed) - c.pitch) * Math.min(1, dt * 2);
    c.roll += (THREE.MathUtils.clamp(-turn / Math.max(dt, 1e-3) * 0.3, -0.25, 0.25) - c.roll) * Math.min(1, dt * 3);
    const [sx, sy, sz] = seatAt(SEATS.pilot, H.x, H.y, H.z, c.yaw);
    p.set(sx, sy, sz);
    game.me.root.rotation.y = c.yaw;
    fogFor(H.y);
    return 0;
  }

  // ---------- Passengers ----------
  // 🫴: ask the people standing next to it aboard.
  function ask() {
    if (!crew) return;
    if (crew.pos.y - crew.ground > 0.5) { toast(TEXT.ground); return; }
    const t0 = performance.now();
    const open = [0, 1].filter((s) => !riders.has(s) && ![...offers.values()].some((o) => o.slot === s && o.until > t0));
    if (!open.length) { toast(TEXT.full); return; }
    const near = [];
    for (const [id, q] of game.others?.players || []) {
      if (q.hidden || !q.target || q.target.hr || q.target.fl || q.target.cr || q.target.bk || [...riders.values()].includes(id)) continue;
      const d = Math.hypot(q.ch.root.position.x - crew.pos.x, q.ch.root.position.z - crew.pos.z);
      if (d < FLY.ask) near.push([d, id]);
    }
    const who = near.sort((a, b) => a[0] - b[0]).slice(0, open.length).map((e) => e[1]);
    if (!who.length) { toast(TEXT.nobody); return; }
    who.forEach((id, i) => { offers.set(id, { slot: open[i], until: t0 + 20000 }); send('invite', id, open[i]); });
    toast(TEXT.sent, { name: who.map(nameOf).join(', ') });
  }
  const canRide = () => game.mode === 'street' && !crew && !riding && !game.occupied;
  function accept() {
    const inv = invite;
    invite = null;
    if (!inv || inv.until < performance.now() || !canRide()) return;
    riding = { pilot: inv.from, slot: inv.slot, lost: 0 };
    if (game.cam) game.cam.dist = Math.max(game.cam.dist, 16);
    send('join', inv.from, inv.slot);
    game.resend?.();
  }
  // Out of someone's helicopter, onto the ground beside it.
  function leave(tell) {
    if (!riding) return;
    const r = riding, p = crafts.get(r.pilot)?.pose, me = game.me.root.position;
    riding = null;
    if (tell) send('leave', r.pilot);
    standAt(...(p ? besides(p, r.slot ? -1 : 1, SEATS.riders[r.slot]) : [me.x, me.z]));
  }
  // 🪂 (a passenger): only once it is down.
  function getOut() {
    const p = riding && crafts.get(riding.pilot)?.pose;
    if (!riding) return;
    if (p && p.y - p.ground > 0.6) { game.shop.toast(tr('heli.landFirst')); return; }
    leave(true);
  }
  function onMsg(from, e) {
    const m = parseHeliMsg(e);
    if (!m) return false;
    if (m.target !== game.myId || game.isBlocked?.(from)) return true;
    const name = nameOf(from);
    if (m.verb === 'invite' && m.slot != null) {
      const p = crafts.get(from)?.pose; // (only a helicopter we believe in, on the ground)
      if (!canRide() || p?.phase !== 'crew' || p.y - p.ground > 1) { send('no', from); return true; }
      invite = { from, slot: m.slot, until: performance.now() + 20000 };
      showPanel(tr('heli.ask', { name }), [
        ['🚁 ' + tr('heli.yes'), accept],
        [tr('heli.no'), () => { invite = null; send('no', from); }],
      ]);
    } else if (m.verb === 'join') {
      const o = offers.get(from);
      offers.delete(from);
      if (crew && o && o.until > performance.now() && o.slot === m.slot && !riders.has(m.slot)) { riders.set(m.slot, from); toast(TEXT.joined, { name }); }
      else send('end', from);
    } else if (m.verb === 'no') {
      if (offers.delete(from)) toast(TEXT.declined, { name });
    } else if (m.verb === 'leave') {
      for (const [s, id] of riders) if (id === from) { riders.delete(s); toast(TEXT.left, { name }); }
    } else if (m.verb === 'end' && riding?.pilot === from) {
      leave(false);
    }
    return true;
  }

  // The chat code: true when it was ours (and we are an operator).
  async function command(code) {
    const k = code === 'call' || code === 'off' ? code : heliCode(code);
    if (!k || !(await isOperator())) return false;
    if (crew) { toast(k === 'off' ? TEXT.getOut : TEXT.here); return true; }
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
    const spot = findPad(p.x, p.z, game.me.root.rotation.y, free);
    if (!spot) { toast(TEXT.room); return true; }
    drop('me'); // (one still flying away)
    const dir = Math.round(toDeg(game.me.root.rotation.y) + (Math.random() - 0.5) * 70); // from ahead of the operator, so they see it come
    mine = { ...spot, y: Math.round(p.y * 10) / 10, dir, t0: now(), t1: null };
    game.resend?.();
    toast(TEXT.coming);
    return true;
  }

  // Someone else's, from their state: only an operator's name is believed.
  function theirs(q) {
    const s = q.target?.he;
    if (!s) { known.delete(q.id); return null; }
    let a = known.get(q.id);
    if (!a || a.name !== q.name) {
      a = { name: q.name, ok: trustAll };
      known.set(q.id, a);
      if (!a.ok) Promise.resolve(game.isOperatorName?.(q.name)).then((yes) => { a.ok = yes === true; }, () => {});
    }
    return a.ok ? parseHeli(s) : null;
  }
  const washOf = (rotor, y, ground) => rotor * clamp01(1 - (y - ground) / 16);
  const timed = (h) => { const p = heliPose(h, now()); return p && { ...p, ground: h.y }; };

  return {
    command,
    isOperator,
    fly,
    onMsg,
    // Our state for others: where it lands and when it was called; or that
    // we are flying it; or whose we ride in.
    state(st) {
      const y = Math.round(game.me.root.position.y * 100) / 100;
      if (crew) { st.he = encodeCrewed(crew.rotor, crew.ground); st.y = y; st.sit = 1; }
      else if (riding) { st.hr = encodeRider(riding.pilot, riding.slot); st.y = y; st.sit = 1; }
      else if (mine && game.mode === 'street') st.he = encodeHeli(mine);
    },
    gone(id) {
      known.delete(id); offers.delete(id); drop(id);
      for (const [s, pid] of riders) if (pid === id) riders.delete(s);
      if (riding?.pilot === id) leave(false);
      if (invite?.from === id) { invite = null; closePanel(); }
    },
    // Every frame, after everyone has been moved (core/players.js): every
    // helicopter in sight, the people in them, the wind and the sound.
    update(dt) {
      time += dt;
      const street = game.mode === 'street';
      const me = game.me.root.position;
      const seen = new Set();
      let wind = 0, loud = 0, rotor = 0;
      const each = (id, p, show) => {
        seen.add(id);
        draw(id, p, dt, show);
        if (!show) return;
        const aboard = (id === 'me' && crew) || riding?.pilot === id;
        const flat = Math.hypot(me.x - p.x, me.z - p.z), far = Math.hypot(me.x - p.x, p.y - me.y, me.z - p.z);
        if (!aboard) wind = Math.max(wind, p.wash * clamp01(1 - flat / WIND_R));
        const l = p.rotor * 0.3 / (1 + (far / 22) ** 2);
        if (l > loud) { loud = l; rotor = p.rotor; }
        // Standing where it comes down (or in it, once it has): step aside.
        const low = p.y - p.ground, r = p.phase === 'landed' || p.phase === 'spinup' || (p.phase === 'crew' && low < 0.3) ? 1.7 : low < 9 ? 3.2 : 0;
        if (r && flat < r && !aboard && !game.occupied && Math.abs(me.y - p.ground) < 2) {
          const a = flat > 0.05 ? Math.atan2(me.x - p.x, me.z - p.z) : p.yaw + Math.PI / 2;
          const step = Math.min(r - flat, dt * 3), nx = me.x + Math.sin(a) * step, nz = me.z + Math.cos(a) * step;
          if (free(nx, nz, 0.35)) { me.x = nx; me.z = nz; }
        }
        // Hair flies on the people around it too.
        if (p.wash > 0.02) for (const o of game.others?.players?.values() || []) {
          if (o.hidden || !o.target || o.target.cs || o.target.hr || o.target.he?.[0] === 'F') continue;
          const d = Math.hypot(o.ch.root.position.x - p.x, o.ch.root.position.z - p.z);
          if (d < WIND_R + 2) o.ch.setWind?.(p.wash * clamp01(1 - d / WIND_R));
        }
      };
      if (crew) {
        const H = crew.pos;
        each('me', { x: H.x, y: H.y, z: H.z, yaw: crew.yaw, pitch: crew.pitch, roll: crew.roll, rotor: crew.rotor, ground: crew.ground, wash: washOf(crew.rotor, H.y, crew.ground), phase: 'crew' }, street);
      } else if (mine) {
        const p = timed(mine);
        if (p) each('me', p, street); else mine = null;
      }
      for (const q of game.others?.players?.values() || []) {
        const h = !q.hidden && theirs(q);
        if (!h) continue;
        if (h.crewed) {
          const r = q.ch.root, [x, y, z] = craftUnder(r.position.x, r.position.y, r.position.z, r.rotation.y);
          each(q.id, { x, y, z, yaw: r.rotation.y, pitch: 0, rotor: h.rotor, ground: h.ground, wash: washOf(h.rotor, y, h.ground), phase: 'crew' }, street);
        } else {
          const p = timed(h);
          if (p) each(q.id, p, street);
        }
      }
      for (const id of [...crafts.keys()]) if (!seen.has(id)) drop(id);
      // The passengers, each on their seat (me too, in someone else's).
      const seat = (root, pilot, slot) => {
        const p = crafts.get(pilot === game.myId ? 'me' : pilot)?.pose;
        if (p?.phase !== 'crew') return false;
        const [x, y, z] = seatAt(SEATS.riders[slot], p.x, p.y, p.z, p.yaw);
        root.position.set(x, y, z);
        root.rotation.y = p.yaw;
        return true;
      };
      for (const q of game.others?.players?.values() || []) {
        const r = !q.hidden && parseRider(q.target?.hr);
        if (r) seat(q.ch.root, r.pilot, r.slot);
      }
      if (riding) {
        if (seat(game.me.root, riding.pilot, riding.slot)) { riding.lost = 0; fogFor(me.y); }
        else if ((riding.lost += dt) > 2.5) leave(false); // the pilot has gone
      }
      if (wind > 0.02 && !game.occupied) { game.me.setWind?.(wind); windOn = true; }
      else if (windOn) { game.me.setWind?.(0); windOn = false; }
      chop(loud, rotor);
      if (!crafts.size && sound) quiet();
      const t0 = performance.now();
      for (const [id, o] of offers) if (o.until < t0) offers.delete(id);
      if (invite && invite.until < t0) { invite = null; closePanel(); }
      refreshPad();
    },
    board, land, ask, accept, getOut,
    get busy() { return !!(crew || riding); },
    get mine() { return mine; },
    get crew() { return crew; },
    get riding() { return riding; },
    get riders() { return [...riders]; },
    get count() { return crafts.size; },
    craft: (id = 'me') => crafts.get(id) || null,
    spots: () => [...crafts].map(([id, c]) => ({ id, x: c.g.position.x, y: c.g.position.y, z: c.g.position.z, dust: c.wash.dust.material.opacity, shown: c.g.visible })), // (tests/e2e)
    trustAll() { trustAll = true; known.clear(); }, // (tests/e2e: no server to ask about names)
    HELI,
  };
}
