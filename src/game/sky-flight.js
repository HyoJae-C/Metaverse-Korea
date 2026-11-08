// Sky view for operators: a chat code puts on a costume and the character
// flies over the city. Three costumes, each with its own transformation:
//   /서울맨 (/seoulman)    a green, blue and red hero suit with a red cape
//   /스카이슈트 (/skysuit)  armour pieces fly in and lock on, then the suit
//   /날개 (/wings)         huge feathered wings burst open and flap
// /착지 (/land), or the same code again, flies down and takes it off.
// Only operator accounts can use it: the server says who is one
// (am_operator, supabase/009_admin.sql); for anyone else the codes read like
// any unknown command. What the costumes look like is core/sky-costume.js.
//
// Flying: move as usual; Space or R goes up, C or F down (or the ▲ ▼
// buttons on a phone); Shift, the stick pushed all the way or ⚡ dashes.
// Others see us flying too ("fl" in our state, drawn by core/players.js).
//
// Carrying: flying low next to someone, 🫴 offers them a ride in one of
// three poses (one under each arm, under one arm, a princess carry). They
// accept on their own screen, then ride in our arms ("cr" in their state)
// until they let go or we land.
//
// Rooftops: landing over a building puts you on its roof. Walk around up
// there (not off the edge); ⬇ goes back down to the street.
import * as THREE from 'three';
import { L } from '../ui/pocha-ui.js';
import { ScentFx } from '../core/scent-fx.js';
import { pointInPoly } from '../core/collision.js';
import {
  COSTUMES, OFF_DUR, SKY_SPEED, CARRY_POSES, carrySeats, placeCarried, releaseCarried,
  encodeFlight, parseFlight, encodeCarried, parseCarried, SkyCostume,
} from '../core/sky-costume.js';

export { COSTUMES };

export const SKY_TEXT = {
  on: { en: 'Sky view! Space / C or ▲ ▼ to go up and down', ko: '스카이뷰! Space / C 또는 ▲ ▼ 로 위아래 이동', ja: 'スカイビュー！Space / C か ▲ ▼ で上下に移動', zh: '天空视角！Space / C 或 ▲ ▼ 上下移动' },
  off: { en: 'Landed', ko: '착지했어요', ja: '着地しました', zh: '已着陆' },
  roof: { en: 'On the rooftop! ⬇ to go back down', ko: '옥상에 내렸어요! ⬇ 로 내려가요', ja: '屋上に着きました！⬇ で下に戻ります', zh: '到屋顶了！⬇ 回到街上' },
  street: { en: 'Fly outside, on the street', ko: '밖에 나가서 날 수 있어요', ja: '外に出てから飛べます', zh: '请到街上再飞' },
  busy: { en: 'Get off first', ko: '먼저 내려 주세요', ja: '先に降りてください', zh: '请先下来' },
  none: { en: 'Not flying', ko: '지금 날고 있지 않아요', ja: '今は飛んでいません', zh: '现在没有在飞' },
  carry: { en: 'Carry someone', ko: '같이 날기', ja: '一緒に飛ぶ', zh: '带人飞' },
  arms2: { en: 'One under each arm', ko: '양쪽에 끼고 가기', ja: '両脇に抱える', zh: '两边各夹一个' },
  arm1: { en: 'Under one arm', ko: '한쪽에 끼고 가기', ja: '片脇に抱える', zh: '夹在一边' },
  princess: { en: 'Princess carry', ko: '공주님 안기', ja: 'お姫様抱っこ', zh: '公主抱' },
  nobody: { en: 'Fly down next to someone (within 4 m)', ko: '같이 날 사람 옆(4m 안)으로 내려가 주세요', ja: '一緒に飛ぶ人のそば（4m以内）に降りてください', zh: '请飞到对方旁边（4米内）' },
  full: { en: 'Your arms are full', ko: '이미 팔이 꽉 찼어요', ja: 'もう手がいっぱいです', zh: '手已经满了' },
  other: { en: 'Let go first to change the pose', ko: '자세를 바꾰려면 먼저 내려 주세요', ja: 'ポーズを変えるには先に降ろしてください', zh: '先放下再换姿势' },
  sent: { en: 'Asked {name}', ko: '{name}님에게 물어봤어요', ja: '{name}さんに聞きました', zh: '已邀请 {name}' },
  ask: { en: '{name} wants to fly with you ({pose})', ko: '{name}님이 같이 날자고 해요 ({pose})', ja: '{name}さんが一緒に飛ぼうと言っています（{pose}）', zh: '{name} 想带你一起飞（{pose}）' },
  yes: { en: 'Fly!', ko: '날기!', ja: '飛ぶ！', zh: '飞！' },
  no: { en: 'No thanks', ko: '괜찮아요', ja: '結構です', zh: '不用了' },
  joined: { en: '{name} is flying with you', ko: '{name}님과 같이 날아요', ja: '{name}さんと一緒に飛びます', zh: '{name} 和你一起飞' },
  declined: { en: '{name} said no', ko: '{name}님이 거절했어요', ja: '{name}さんに断られました', zh: '{name} 拒绝了' },
  left: { en: '{name} let go', ko: '{name}님이 내렸어요', ja: '{name}さんが降りました', zh: '{name} 下去了' },
  letGo: { en: 'Let go', ko: '내리기', ja: '降りる', zh: '下去' },
  drop: { en: 'Put them down', ko: '내려 주기', ja: '降ろす', zh: '放下' },
  down: { en: 'Back to the street', ko: '거리로 내려가기', ja: '通りに降りる', zh: '回到街上' },
};
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

// Chat codes (after "/"), upper or lower case.
export const SKY_CODES = {
  '서울맨': 'seoulman', seoulman: 'seoulman',
  '스카이슈트': 'suit', skysuit: 'suit',
  '날개': 'wings', wings: 'wings',
  '착지': 'off', land: 'off',
};
export const skyCode = (code) => SKY_CODES[String(code ?? '').trim().toLowerCase()] || null;

// Carry messages on the emote channel: 'sky:<verb>:<target>[:<pose>:<slot>]'.
export const skyMsg = (verb, target, pose, slot) => `sky:${verb}:${target}` + (pose ? `:${pose}:${slot ? 1 : 0}` : '');
export function parseSkyMsg(e) {
  const m = /^sky:(invite|join|no|leave|end):([\w-]{1,64})(?::(arms2|arm1|princess):([01]))?$/.exec(String(e));
  return m ? { verb: m[1], target: m[2], pose: m[3] || null, slot: Number(m[4] || 0) } : null;
}

// Rooftops you can land on: buildings by 25 m cell.
export class Roofs {
  constructor(buildings = []) {
    this.cells = new Map();
    for (const b of buildings) {
      if (!(b.h > 0) || b.m || !Array.isArray(b.p) || b.p.length < 3) continue;
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of b.p) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      const r = { p: b.p, h: b.h, minX, minZ, maxX, maxZ };
      for (let cx = Math.floor(minX / 25); cx <= Math.floor(maxX / 25); cx++) {
        for (let cz = Math.floor(minZ / 25); cz <= Math.floor(maxZ / 25); cz++) {
          const k = cx + ',' + cz;
          if (!this.cells.has(k)) this.cells.set(k, []);
          this.cells.get(k).push(r);
        }
      }
    }
  }
  // The highest roof over (x, z), or null.
  at(x, z) {
    let best = null;
    for (const r of this.cells.get(Math.floor(x / 25) + ',' + Math.floor(z / 25)) || []) {
      if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ || !pointInPoly(x, z, r.p)) continue;
      if (!best || r.h > best.h) best = r;
    }
    return best;
  }
  // Still on this roof with room around (x, z)? (no stepping off the edge)
  static inside(r, x, z, m = 0.3) {
    return pointInPoly(x, z, r.p) && pointInPoly(x + m, z, r.p) && pointInPoly(x - m, z, r.p) && pointInPoly(x, z + m, r.p) && pointInPoly(x, z - m, r.p);
  }
}

const FAST = 55; // m/s across, dashing (Shift, the stick pushed all the way, or ⚡)
const CLIMB = 10, FAST_CLIMB = 32; // m/s up and down
const TOP = 250; // highest (m)
const LIFT = 3; // how high the take-off goes (m)
const NEAR = 4; // how close to offer someone a ride (m)
const clamp01 = (u) => Math.min(1, Math.max(0, u));
const BTN = 'width:52px;height:52px;border-radius:50%;border:0;font-size:22px;background:rgba(20,30,50,.55);color:#fff;touch-action:none';
const PANEL = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:40;background:rgba(255,255,255,.96);border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.2);font:600 15px system-ui,sans-serif;color:#2b2230;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
const CHOICE = 'border:0;border-radius:12px;padding:10px 14px;font:600 15px system-ui,sans-serif;background:#ffe3d9;color:#2b2230;cursor:pointer';

// ---------- The flight ----------
export function createSkyFlight(game) {
  let kind = null; // the costume while flying
  let phase = null; // 'on' (transforming), 'fly', 'off' (landing and taking it off)
  let t = 0; // seconds into the phase
  let costume = null;
  let savedLook = null, swapped = false, savedFog = null;
  let opOk = false;
  let climbBtn = 0, dashBtn = false, fxT = 0, lastRy = 0, roll = 0, hf = 0, fist = 0, climb = 0;
  let landAt = null; // { x, z, y, roof } where to land
  let roof = null; // the rooftop we stand on
  const carriers = new Map(); // slot -> id: who we carry
  let carryPose = null;
  const asked = new Map(); // id -> { pose, slot, until }: rides we offered
  let carried = null; // { flyer, pose, slot }: we are being carried
  let invite = null; // { from, pose, slot, until }: someone offered us a ride
  const remotes = new Map(); // id -> { kind, costume, t, hf, px, pz }
  const vel = new THREE.Vector3(), v1 = new THREE.Vector3();
  const fx = new ScentFx();
  const roofs = new Roofs(game.buildings);
  let pad = null, panel = null;
  const nameOf = (id) => game.others?.nameOf(id) || '?';
  const send = (verb, target, pose, slot) => game.net?.sendEmote?.(skyMsg(verb, target, pose, slot));
  const toast = (o, vars) => game.shop.toast(fmt(L(o), vars || {}));

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
    pad.id = 'sky-pad';
    pad.style.cssText = 'position:fixed;right:84px;top:30%;display:flex;flex-direction:column;gap:10px;z-index:30';
    pad.up = button('▲', 'Fly up', () => { climbBtn = 1; }, () => { if (climbBtn === 1) climbBtn = 0; });
    pad.down = button('▼', 'Fly down', () => { climbBtn = -1; }, () => { if (climbBtn === -1) climbBtn = 0; });
    pad.dash = button('⚡', 'Dash', () => { dashBtn = true; }, () => { dashBtn = false; });
    pad.carry = button('🫴', 'Carry someone', () => carryMenu());
    pad.drop = button('🙌', 'Put them down', () => dropAll());
    pad.letGo = button('🪂', 'Let go', () => letGo());
    pad.street = button('⬇', 'Back to the street', () => toStreet());
    pad.append(pad.up, pad.down, pad.dash, pad.carry, pad.drop, pad.letGo, pad.street);
    document.body.append(pad);
  }
  function refreshPad() {
    const flying = !!kind && phase !== 'off';
    const any = flying || !!carried || !!roof;
    if (!pad && !any) return;
    if (!pad) makePad();
    pad.hidden = !any;
    pad.up.hidden = pad.down.hidden = pad.dash.hidden = !flying;
    pad.carry.hidden = !(flying && phase === 'fly');
    pad.drop.hidden = !(flying && carriers.size);
    pad.letGo.hidden = !carried;
    pad.street.hidden = !(roof && !kind && !carried);
    if (!flying) { climbBtn = 0; dashBtn = false; }
  }
  function closePanel() { panel?.remove(); panel = null; }
  function showPanel(title, choices) {
    closePanel();
    panel = document.createElement('div');
    panel.id = 'sky-panel';
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

  // ---------- Carrying ----------
  // People near enough to offer a ride, nearest first.
  function nearby() {
    const me = game.me.root.position, out = [];
    for (const [id, q] of game.others?.players || []) {
      if (q.hidden || !q.target || q.target.fl || q.target.cr || [...carriers.values()].includes(id)) continue;
      const r = q.ch.root.position;
      const d = Math.hypot(r.x - me.x, r.z - me.z);
      if (d < NEAR && Math.abs(r.y - me.y) < 3) out.push([d, id]);
    }
    return out.sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  }
  function carryMenu() {
    if (!kind || phase !== 'fly') return;
    showPanel('🫴 ' + L(SKY_TEXT.carry), [
      ['👐 ' + L(SKY_TEXT.arms2), () => offer('arms2')],
      ['💪 ' + L(SKY_TEXT.arm1), () => offer('arm1')],
      ['👸 ' + L(SKY_TEXT.princess), () => offer('princess')],
      ['✖', () => {}],
    ]);
  }
  function offer(pose) {
    if (carryPose && carryPose !== pose) { toast(SKY_TEXT.other); return; }
    const free = [0, 1].slice(0, carrySeats(pose)).filter((s) => !carriers.has(s) && ![...asked.values()].some((a) => a.slot === s && a.until > performance.now()));
    if (!free.length) { toast(SKY_TEXT.full); return; }
    const who = nearby().slice(0, free.length);
    if (!who.length) { toast(SKY_TEXT.nobody); return; }
    who.forEach((id, i) => {
      asked.set(id, { pose, slot: free[i], until: performance.now() + 20000 });
      send('invite', id, pose, free[i]);
    });
    toast(SKY_TEXT.sent, { name: who.map(nameOf).join(', ') });
  }
  function dropAll() {
    for (const id of carriers.values()) send('end', id);
    carriers.clear();
    carryPose = null;
  }
  function accept() {
    const inv = invite;
    invite = null;
    if (!inv || inv.until < performance.now() || !canRide()) return;
    carried = { flyer: inv.from, pose: inv.pose, slot: inv.slot };
    roof = null;
    send('join', inv.from, inv.pose, inv.slot);
  }
  const canRide = () => game.mode === 'street' && !kind && !carried && !game.busy;
  // Off someone's arms: down onto the roof below, or the street.
  function letGo(tell = true) {
    if (!carried) return;
    if (tell) send('leave', carried.flyer);
    carried = null;
    releaseCarried(game.me);
    settle();
  }
  // Stand on whatever is under us: a roof, or free ground.
  function settle() {
    const p = game.me.root.position;
    const r = roofs.at(p.x, p.z);
    if (r && p.y > 1) { roof = r; p.y = r.h; toast(SKY_TEXT.roof); return; }
    roof = null;
    const s = landingSpot(p.x, p.z);
    p.set(s.x, 0, s.z);
  }
  function toStreet() {
    if (!roof) return;
    const p = game.me.root.position;
    roof = null;
    const s = landingSpot(p.x, p.z);
    p.set(s.x, 0, s.z);
    puffAt(COSTUMES.wings.fx);
  }

  // ---------- Costume ----------
  function wear(on) {
    const C = COSTUMES[kind];
    if (on && !C.model && !Object.keys(C.look).some((k) => savedLook[k] != null)) return;
    const look = on ? { ...savedLook, ...C.look, ...(C.model ? { model: C.model } : {}) } : savedLook;
    game.setLook(look);
    swapped = on;
  }
  function puffAt(fxSpec, big = true) {
    const p = game.me.root.position;
    fx.attach(game.scene);
    fx.puff(p.x, p.y, p.z, fxSpec, big);
  }
  const puff = (big) => puffAt(COSTUMES[kind].fx, big);

  function start(k) {
    kind = k; phase = 'on'; t = 0;
    savedLook ||= game.currentLook;
    swapped = false;
    costume?.dispose();
    costume = new SkyCostume(k);
    costume.bind(game.me);
    vel.set(0, 0, 0);
    lastRy = game.me.root.rotation.y;
    if (!savedFog && game.scene.fog) savedFog = { near: game.scene.fog.near, far: game.scene.fog.far };
    if (game.cam) game.cam.dist = Math.max(game.cam.dist, 12);
    puff(true);
    fxT = 0.25;
    toast(SKY_TEXT.on);
  }

  // Back on our own feet: the costume off, the look and the fog as they were.
  function finish(quiet = false) {
    if (!kind) return;
    dropAll();
    if (swapped) wear(false);
    costume?.dispose();
    costume = null;
    const p = game.me.root.position;
    if (game.mode === 'street') {
      roof = landAt?.roof || null;
      p.y = roof ? roof.h : 0;
    }
    if (savedFog && game.scene.fog) Object.assign(game.scene.fog, savedFog);
    savedFog = null; savedLook = null;
    kind = null; phase = null; landAt = null;
    if (!quiet) toast(roof ? SKY_TEXT.roof : SKY_TEXT.off);
  }

  // A free spot to land on (not inside a building), near (x, z).
  function landingSpot(x, z) {
    if (!game.blocked?.(x, z)) return { x, z };
    for (let r = 1; r <= 40; r += 1) {
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos((a / 16) * Math.PI * 2) * r, pz = z + Math.sin((a / 16) * Math.PI * 2) * r;
        if (!game.blocked(px, pz)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }

  function land() {
    const p = game.me.root.position;
    // Over a building: down onto its roof. Otherwise the nearest free ground.
    const r = roofs.at(p.x, p.z);
    if (r && Roofs.inside(r, p.x, p.z, 0.6)) landAt = { x: p.x, z: p.z, y: r.h, roof: r };
    else { const s = landingSpot(p.x, p.z); landAt = { ...s, y: 0, roof: null }; }
    phase = 'off'; t = 0;
  }

  // The chat code: true when it was ours (and we are an operator).
  async function command(code) {
    const k = typeof code === 'string' && !COSTUMES[code] && code !== 'off' ? skyCode(code) : code;
    if (!k || !(await isOperator())) return false;
    if (k === 'off' || k === kind) {
      if (!kind) toast(SKY_TEXT.none);
      else if (phase !== 'off') land();
      return true;
    }
    if (game.mode !== 'street') { toast(SKY_TEXT.street); return true; }
    if (game.busy || carried) { toast(SKY_TEXT.busy); return true; }
    if (kind) { // another costume, up in the air: change over
      const keep = savedLook, fog = savedFog;
      if (swapped) wear(false);
      savedLook = keep; savedFog = fog;
    }
    roof = null;
    start(k);
    return true;
  }

  function updateFog(y) {
    const fog = game.scene.fog;
    if (!fog || !savedFog) return;
    const k = clamp01(y / 80);
    fog.near = savedFog.near + (500 - savedFog.near) * k;
    fog.far = savedFog.far + (1700 - savedFog.far) * k;
  }

  // Walking about on a roof (not off its edge).
  function walkRoof(dt, p, mx, my, yaw, fast) {
    const mag = Math.min(1, Math.hypot(mx, my));
    p.y = roof.h;
    if (mag < 0.05) return 0;
    const sp = (fast ? 6.5 : 3.4) * mag;
    const fx0 = -Math.sin(yaw), fz0 = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const dx = (fx0 * my + rx * mx) * sp * dt, dz = (fz0 * my + rz * mx) * sp * dt;
    if (Roofs.inside(roof, p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
    else if (Roofs.inside(roof, p.x + dx, p.z)) p.x += dx;
    else if (Roofs.inside(roof, p.x, p.z + dz)) p.z += dz;
    let d = Math.atan2(dx, dz) - game.me.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    game.me.root.rotation.y += d * Math.min(1, dt * 12);
    return fast ? 1 : 0.45;
  }

  // Each frame while flying, carried or on a roof, in place of walking.
  // Returns the walk speed for the body's clip.
  function fly(dt, p, mx, my, yaw, fast) {
    if (kind && dashBtn) fast = true;
    if (game.mode !== 'street') { // a warp or a door: back on foot
      if (carried) { carried = null; releaseCarried(game.me); }
      roof = null;
      finish(true);
      return 0;
    }
    if (carried) {
      const f = game.others?.players.get(carried.flyer);
      if (!f || f.hidden || !parseFlight(f.target?.fl)) { letGo(false); return 0; }
      placeCarried(f.ch, carried.pose, carried.slot, game.me);
      return 0;
    }
    if (!kind) return roof ? walkRoof(dt, p, mx, my, yaw, fast) : 0;
    const C = COSTUMES[kind];
    t += dt;
    climb = 0;
    let off = false;
    if (phase === 'on') {
      if (!swapped && t >= C.swapAt && (C.model || Object.keys(C.look).some((k) => savedLook[k] != null))) { wear(true); if (C.model) puff(true); }
      // Up off the ground once dressed.
      if (t > C.ready - 0.6 && p.y < (roof ? roof.h : 0) + LIFT) p.y += dt * 6;
      if ((fxT -= dt) <= 0 && t < C.ready) { fxT = 0.35; puff(t < 0.8); }
      if (t >= C.ready) { phase = 'fly'; t = 0; roof = null; }
      vel.multiplyScalar(Math.exp(-dt * 4));
    } else if (phase === 'off') {
      // Down to the landing spot, then the costume comes off.
      const dx = landAt.x - p.x, dz = landAt.z - p.z, d = Math.hypot(dx, dz);
      if (p.y > landAt.y + 0.01 || d > 0.05) {
        t = 0;
        const step = Math.min(d, FAST * dt);
        if (d > 0.05) { p.x += (dx / d) * step; p.z += (dz / d) * step; }
        p.y = Math.max(landAt.y, p.y - Math.max(CLIMB, (p.y - landAt.y) * 1.5) * dt);
        hf = clamp01(step / dt / SKY_SPEED);
      } else {
        off = true;
        if (t < dt * 1.5) puff(true);
        hf = 0;
        if (t >= OFF_DUR) { finish(); return 0; }
      }
      vel.set(0, 0, 0);
    } else {
      const k = game.input?.keys;
      climb = climbBtn || ((k?.has('Space') || k?.has('KeyR') ? 1 : 0) - (k?.has('KeyC') || k?.has('KeyF') ? 1 : 0));
      const sp = fast ? FAST : SKY_SPEED;
      const fx0 = -Math.sin(yaw), fz0 = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      v1.set((fx0 * my + rx * mx) * sp, climb * (fast ? FAST_CLIMB : CLIMB), (fz0 * my + rz * mx) * sp);
      vel.lerp(v1, 1 - Math.exp(-dt * 3));
      p.addScaledVector(vel, dt);
      p.y = Math.min(TOP, Math.max(0, p.y));
      const b = game.bounds;
      if (b) {
        p.x = Math.min(b.maxX + 150, Math.max(b.minX - 150, p.x));
        p.z = Math.min(b.maxZ + 150, Math.max(b.minZ - 150, p.z));
      }
    }
    const ground = landAt?.y ?? 0;
    fist += ((kind === 'seoulman' && p.y > ground + 0.3 ? 1 : 0) - fist) * Math.min(1, dt * 5);
    const across = Math.hypot(vel.x, vel.z);
    if (phase !== 'off') hf += (clamp01(across / SKY_SPEED) - hf) * Math.min(1, dt * 4);
    // Face where we fly, banking into turns.
    const me = game.me;
    if (across > 0.5) {
      let d = Math.atan2(vel.x, vel.z) - me.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      me.root.rotation.y += d * Math.min(1, dt * 5);
    }
    let turn = me.root.rotation.y - lastRy;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    lastRy = me.root.rotation.y;
    roll += (THREE.MathUtils.clamp(-turn / Math.max(dt, 1e-3) * 0.25, -0.6, 0.6) * hf - roll) * Math.min(1, dt * 4);
    const flames = phase === 'fly' || (phase === 'on' && t > C.ready - 0.6) || (phase === 'off' && !off);
    costume.update(me, dt, { phase, t, off, hf, climb, roll, y: p.y - (roof && phase === 'on' ? roof.h : 0), fist, carry: carryPose, flames });
    updateFog(p.y);
    return 0;
  }

  // ---------- Messages from others ----------
  function onMsg(from, e) {
    const m = parseSkyMsg(e);
    if (!m) return false;
    if (m.target !== game.myId || game.isBlocked?.(from)) return true;
    const name = nameOf(from);
    if (m.verb === 'invite' && m.pose) {
      if (!canRide()) { send('no', from); return true; }
      invite = { from, pose: m.pose, slot: m.slot, until: performance.now() + 20000 };
      showPanel('🦸 ' + fmt(L(SKY_TEXT.ask), { name, pose: L(SKY_TEXT[m.pose]) }), [
        ['🕊️ ' + L(SKY_TEXT.yes), accept],
        [L(SKY_TEXT.no), () => { invite = null; send('no', from); }],
      ]);
    } else if (m.verb === 'join') {
      const a = asked.get(from);
      asked.delete(from);
      const ok = kind && phase === 'fly' && a && a.until > performance.now() && a.pose === m.pose && a.slot === m.slot
        && (!carryPose || carryPose === m.pose) && !carriers.has(m.slot) && m.slot < carrySeats(m.pose);
      if (ok) { carriers.set(m.slot, from); carryPose = m.pose; toast(SKY_TEXT.joined, { name }); }
      else send('end', from);
    } else if (m.verb === 'no') {
      asked.delete(from);
      toast(SKY_TEXT.declined, { name });
    } else if (m.verb === 'leave') {
      for (const [s, id] of carriers) if (id === from) { carriers.delete(s); toast(SKY_TEXT.left, { name }); }
      if (!carriers.size) carryPose = null;
    } else if (m.verb === 'end' && carried?.flyer === from) {
      letGo(false);
    }
    return true;
  }
  function gone(id) {
    for (const [s, pid] of carriers) if (pid === id) carriers.delete(s);
    if (!carriers.size) carryPose = null;
    asked.delete(id);
    if (carried?.flyer === id) letGo(false);
    if (invite?.from === id) { invite = null; closePanel(); }
    const r = remotes.get(id);
    if (r) { r.costume.dispose(); remotes.delete(id); }
  }

  // Our state for others: the height, the flight, being carried.
  function state(st) {
    const p = game.me.root.position;
    if (kind || carried || roof) st.y = Math.round(p.y * 100) / 100;
    if (kind) st.fl = encodeFlight(kind, carryPose);
    if (carried) st.cr = encodeCarried(carried.flyer, carried.pose, carried.slot);
  }

  // Someone else, each frame (core/players.js): their costume, flying pose,
  // or a place in a flyer's arms.
  function remote(q, all, dt) {
    const f = parseFlight(q.target?.fl);
    let r = remotes.get(q.id);
    const pos = q.ch.root.position;
    if (f && !q.hidden) {
      if (!r || r.kind !== f.kind) {
        r?.costume.dispose();
        r = { kind: f.kind, costume: new SkyCostume(f.kind), t: 0, hf: 0, px: pos.x, pz: pos.z };
        remotes.set(q.id, r);
      }
      r.t += dt;
      const C = COSTUMES[f.kind];
      const sp = Math.hypot(pos.x - r.px, pos.z - r.pz) / Math.max(dt, 1e-3);
      r.px = pos.x; r.pz = pos.z;
      r.hf += (clamp01(sp / SKY_SPEED) - r.hf) * Math.min(1, dt * 3);
      const ph = r.t < C.ready ? 'on' : 'fly';
      r.costume.update(q.ch, dt, { phase: ph, t: r.t, off: false, hf: r.hf, climb: 0, roll: 0, y: pos.y, fist: pos.y > 0.3 ? 1 : 0, carry: f.carry, flames: ph === 'fly' || r.t > C.ready - 0.6 });
    } else if (r) { r.costume.dispose(); remotes.delete(q.id); }
    const c = parseCarried(q.target?.cr);
    const flyer = c && (c.flyer === game.myId ? (kind ? game.me : null) : all.players.get(c.flyer)?.ch);
    if (flyer && !q.hidden) placeCarried(flyer, c.pose, c.slot, q.ch);
    else if (q.ch.__carryPose) releaseCarried(q.ch);
  }

  return {
    command,
    fly,
    isOperator, // (am_operator on the server; also lets operators through the zoo's gap)
    onMsg,
    gone,
    state,
    remote,
    // Every frame: the sprites, the buttons, offers running out.
    update(dt) {
      fx.update(dt);
      const now = performance.now();
      for (const [id, a] of asked) if (a.until < now) asked.delete(id);
      if (invite && invite.until < now) { invite = null; closePanel(); }
      if (panel && !invite && !(kind && phase === 'fly')) closePanel();
      refreshPad();
    },
    land() { if (kind && phase !== 'off') land(); },
    stop() { finish(true); },
    get active() { return !!kind; },
    // Flying, carried, or on a roof: the flight moves us, not walking.
    get busy() { return !!(kind || carried || roof); },
    get kind() { return kind; },
    get carrying() { return carryPose; },
  };
}

export { CARRY_POSES };
