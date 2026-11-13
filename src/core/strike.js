// NEON STRIKE: the PC방's team shooter (screen in game/strike.js). Rules only,
// no three.js, so the tests run them in node: the four guns, where a bullet
// lands on a body, the two maps, moving into walls, bots, and a team match
// (first team to the kill target, or the most kills when the time is up).
//
// Damage (Yozi 2026-11-14): the body takes the most of an ordinary hit and
// hands and feet a little less. The exact middle of the head (CORE_K of the
// head's radius) is the precise shot: the battle rifle and the sniper kill
// with it, the two fast guns do CORE_MUL × their body damage. The rest of
// the head counts as the body.
//
// Players stand on the floor (y = 0) and face `yaw` (0 looks along +z, the
// way three.js turns a model with rotation.y). A shot leaves from the aim
// point over the right shoulder (aimFrom) along yaw and pitch, which is
// where the third-person camera looks, so the cross in the middle of the
// screen is where it lands.

export const TICK = 1 / 30;
export const HP = 100;
export const MATCH_SECS = 300;
export const RESPAWN_SECS = 3;
export const PROTECT_SECS = 1.5; // just respawned: no damage
export const WARMUP_SECS = 3;
export const KILL_TARGET = [10, 20, 25, 30]; // by players a side (1v1 … 4v4)
export const CORE_K = 0.45; // the head's middle: this share of its radius
export const CORE_MUL = 2.5;
export const RADIUS = 0.3; // a player, against walls
export const WALK = 4.2; // m/s
export const SHOULDER = { up: 1.12, side: 0.45 }; // the aim point: above the feet, to the right

// The guns: shots a second, magazine, reload seconds, damage on the body
// and on a hand or foot, what the head's middle does ('kill' or × body),
// spread (radians, standing still / moving), how fast you walk with it,
// and how far a bullet still does damage.
export const GUNS = {
  sparrow: { rate: 12, mag: 35, reload: 1.8, body: 14, limb: 10, core: CORE_MUL, spread: [0.018, 0.05], walk: 1.05, range: 45, auto: true, sound: 1500 },
  magpie: { rate: 8, mag: 30, reload: 2.0, body: 20, limb: 15, core: CORE_MUL, spread: [0.01, 0.04], walk: 1, range: 60, auto: true, sound: 1100 },
  hawk: { rate: 5, mag: 20, reload: 2.2, body: 34, limb: 25, core: 'kill', spread: [0.006, 0.035], walk: 0.95, range: 70, auto: true, sound: 760 },
  eagle: { rate: 1 / 1.2, mag: 5, reload: 3.0, body: 80, limb: 55, core: 'kill', spread: [0.06, 0.11], scoped: 0.0005, walk: 0.88, range: 140, auto: false, scope: true, sound: 420 },
};
export const GUN_IDS = Object.keys(GUNS);

export const ZONES = ['core', 'head', 'body', 'limb'];
// Damage of one bullet on a zone ('core', 'head', 'body', 'limb').
export function damageOf(gunId, zone) {
  const g = GUNS[gunId];
  if (zone === 'core') return g.core === 'kill' ? HP : Math.round(g.body * g.core);
  if (zone === 'limb') return g.limb;
  return g.body; // body, or the head off its middle
}
// Bullets to bring a full player down on one zone.
export const shotsToKill = (gunId, zone) => Math.ceil(HP / damageOf(gunId, zone));

// ── The body ─────────────────────────────────────────────────────────────
// Boxes and the head's sphere in the player's own frame (feet at 0, facing
// +z, +x on its left), measured on the tall in-game build (game/strike.js
// BUILD) holding a gun. [x0, y0, z0, x1, y1, z1].
export const HB = {
  head: { y: 0.99, z: 0.02, r: 0.21 },
  body: [-0.19, 0.32, -0.14, 0.19, 0.78, 0.14],
  limbs: [
    [-0.2, 0, -0.12, 0.2, 0.32, 0.12], // legs and feet
    [-0.34, 0.55, 0.14, -0.06, 0.78, 0.5], // the right arm out holding the gun (the gun is on the right)
    [0.19, 0.55, -0.08, 0.3, 0.78, 0.14], // the left upper arm, at the side
  ],
  chest: 0.56, // where bots aim, and what "can I see them" looks at
};

// Where along a ray (o + d·t, d unit) it enters a box, or Infinity.
export function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let t0 = 0, t1 = Infinity;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < b[i] || o[i] > b[i + 3]) return Infinity; continue; }
    let a = (b[i] - o[i]) / d[i], c = (b[i + 3] - o[i]) / d[i];
    if (a > c) { const s = a; a = c; c = s; }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    if (t0 > t1) return Infinity;
  }
  return t0;
}
// A ray against one player: { t, zone } of the first part it touches, or null.
export function rayPlayer(o, d, p) {
  // Into the player's frame.
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const rx = o[0] - p.x, rz = o[2] - p.z;
  const lx = rx * c - rz * s, lz = rx * s + rz * c, ly = o[1];
  const dx = d[0] * c - d[2] * s, dz = d[0] * s + d[2] * c, dy = d[1];
  let best = null;
  const take = (t, zone) => { if (t < Infinity && (!best || t < best.t)) best = { t, zone }; };
  // The head: a sphere; the closest the ray passes to its middle says core or not.
  const h = HB.head, hx = -lx, hy = h.y - ly, hz = h.z - lz;
  const along = hx * dx + hy * dy + hz * dz;
  const miss2 = hx * hx + hy * hy + hz * hz - along * along;
  if (along > 0 && miss2 <= h.r * h.r) take(Math.max(0, along - Math.sqrt(h.r * h.r - miss2)), miss2 <= (h.r * CORE_K) ** 2 ? 'core' : 'head');
  take(rayBox(lx, ly, lz, dx, dy, dz, HB.body), 'body');
  for (const b of HB.limbs) take(rayBox(lx, ly, lz, dx, dy, dz, b), 'limb');
  return best;
}

// ── Maps ─────────────────────────────────────────────────────────────────
// Boxes [x, z, w, d, h, colour index] on a floor size[0] × size[1] (centred
// on 0), each team's spawn points, and places bots like to go. Made up for
// this game. Colours index the map's palette (game/strike.js draws them).
export const MAPS = {
  warehouse: {
    size: [44, 32],
    palette: ['#5b6270', '#c8873a', '#2f6fa8', '#b8423a', '#8a8f99', '#d9c27a'],
    floor: '#3b3f47', sky: ['#1a2238', '#e08a4a'], fog: '#2a2f3d',
    boxes: [
      // the outer wall
      [0, -16.5, 45, 1, 5, 0], [0, 16.5, 45, 1, 5, 0], [-22.5, 0, 1, 34, 5, 0], [22.5, 0, 1, 34, 5, 0],
      // shipping containers through the middle
      [-6, -6, 6, 2.4, 2.6, 2], [6, 6, 6, 2.4, 2.6, 3], [0, 0, 2.4, 6, 2.6, 4],
      [-14, 7, 2.4, 6, 2.6, 3], [14, -7, 2.4, 6, 2.6, 2],
      // crate stacks (low ones you shoot over)
      [-10, -1, 1.4, 1.4, 1.2, 1], [10, 1, 1.4, 1.4, 1.2, 1], [-3, 9, 1.4, 1.4, 1.2, 1], [3, -9, 1.4, 1.4, 1.2, 1],
      [-17, -9, 2, 2, 2.2, 1], [17, 9, 2, 2, 2.2, 1], [-8, 12, 1.4, 1.4, 2.4, 1], [8, -12, 1.4, 1.4, 2.4, 1],
      // pillars holding the roof
      [-11, -11, 0.8, 0.8, 5, 4], [11, 11, 0.8, 0.8, 5, 4], [-11, 11, 0.8, 0.8, 5, 4], [11, -11, 0.8, 0.8, 5, 4],
      // the forklift bay walls by each spawn
      [-18, 2, 0.5, 5, 1.1, 5], [18, -2, 0.5, 5, 1.1, 5],
    ],
    spawns: [
      [[-20, -12], [-20, -4], [-20, 4], [-20, 12], [-16, 0]],
      [[20, 12], [20, 4], [20, -4], [20, -12], [16, 0]],
    ],
    points: [[0, -10], [0, 10], [-8, 4], [8, -4], [-14, -2], [14, 2], [-4, -13], [4, 13]],
  },
  market: {
    size: [40, 36],
    palette: ['#6a5578', '#e05a4f', '#f2b84b', '#3fa38a', '#7d6ab0', '#e8e0d0'],
    floor: '#3a3344', sky: ['#0e0b22', '#7a3fb0'], fog: '#1d1830',
    boxes: [
      // the shop fronts round the square
      [0, -18.5, 41, 1, 6, 0], [0, 18.5, 41, 1, 6, 0], [-20.5, 0, 1, 38, 6, 0], [20.5, 0, 1, 38, 6, 0],
      // two rows of buildings make three alleys
      [-10, -9, 8, 6, 4.5, 0], [10, -9, 8, 6, 4.5, 0], [-10, 9, 8, 6, 4.5, 0], [10, 9, 8, 6, 4.5, 0],
      // market stalls (counters you shoot over) down the middle street
      [-4, -3, 2.6, 1.2, 1.05, 1], [4, 3, 2.6, 1.2, 1.05, 2], [-4, 4, 2.6, 1.2, 1.05, 3], [4, -4, 2.6, 1.2, 1.05, 4],
      [0, 0, 1.2, 1.2, 2.2, 5],
      // carts and a delivery truck in the side alleys
      [-17, -1, 2, 3.4, 2.4, 2], [17, 1, 2, 3.4, 2.4, 3], [-2, -14, 1.6, 1.6, 1.0, 1], [2, 14, 1.6, 1.6, 1.0, 4],
      [-10, -15, 1.2, 1.2, 1.2, 5], [10, 15, 1.2, 1.2, 1.2, 5],
      [-15, 15, 1.2, 1.2, 1.2, 3], [15, -15, 1.2, 1.2, 1.2, 2],
    ],
    spawns: [
      [[-18, -16], [-18, -8], [-18, 8], [-18, 16], [-14, 0]],
      [[18, 16], [18, 8], [18, -8], [18, -16], [14, 0]],
    ],
    points: [[0, -14], [0, 14], [0, 6], [0, -6], [-14, 0], [14, 0], [-6, 0], [6, 0]],
  },
};
export const MAP_IDS = Object.keys(MAPS);

// Boxes as [x0, y0, z0, x1, y1, z1], once per map.
const solidCache = new Map();
export function solids(mapId) {
  if (!solidCache.has(mapId)) solidCache.set(mapId, MAPS[mapId].boxes.map(([x, z, w, d, h]) => [x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2]));
  return solidCache.get(mapId);
}
// The first wall a ray meets within `max`, or max.
export function rayWalls(mapId, o, d, max = 200) {
  let best = max;
  for (const b of solids(mapId)) { const t = rayBox(o[0], o[1], o[2], d[0], d[1], d[2], b); if (t < best) best = t; }
  return best;
}
export const STEP_OVER = 0.35; // lower than this you walk through (nothing is, now)
// Slide a player out of every wall it overlaps (a circle against boxes).
export function pushOut(mapId, p) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of solids(mapId)) {
      if (b[4] < STEP_OVER) continue;
      const cx = Math.max(b[0], Math.min(p.x, b[3])), cz = Math.max(b[2], Math.min(p.z, b[5]));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (RADIUS - d) / d; p.x += dx * k; p.z += dz * k; continue; }
      // The middle is inside the box: out the nearest side.
      const outs = [[b[0] - RADIUS - p.x, 0], [b[3] + RADIUS - p.x, 0], [0, b[2] - RADIUS - p.z], [0, b[5] + RADIUS - p.z]];
      outs.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
      p.x += outs[0][0]; p.z += outs[0][1];
    }
  }
}

// ── Walking for bots: a 1 m grid, and the distance from every cell to a goal ──
function gridOf(mapId) {
  const m = MAPS[mapId];
  if (m._grid) return m._grid;
  const W = Math.ceil(m.size[0]), D = Math.ceil(m.size[1]), x0 = -W / 2, z0 = -D / 2;
  const open = new Uint8Array(W * D);
  const pad = RADIUS + 0.1;
  for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i + 0.5, z = z0 + j + 0.5;
    open[j * W + i] = solids(mapId).some((b) => b[4] >= STEP_OVER && x > b[0] - pad && x < b[3] + pad && z > b[2] - pad && z < b[5] + pad) ? 0 : 1;
  }
  return (m._grid = { W, D, x0, z0, open, fields: new Map() });
}
const cellOf = (g, x, z) => {
  const i = Math.max(0, Math.min(g.W - 1, Math.floor(x - g.x0))), j = Math.max(0, Math.min(g.D - 1, Math.floor(z - g.z0)));
  return j * g.W + i;
};
function fieldTo(g, goal) {
  if (g.fields.has(goal)) return g.fields.get(goal);
  const dist = new Int16Array(g.W * g.D).fill(-1);
  const q = [goal];
  dist[goal] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], i = c % g.W, j = (c - i) / g.W;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= g.W || nj >= g.D) continue;
      const n = nj * g.W + ni;
      if (dist[n] >= 0 || !g.open[n]) continue;
      dist[n] = dist[c] + 1;
      q.push(n);
    }
  }
  g.fields.set(goal, dist);
  return dist;
}
// Which way to walk (a unit [x, z]) from (x, z) toward the cell `goal`.
export function pathStep(mapId, x, z, gx, gz) {
  const g = gridOf(mapId), goal = cellOf(g, gx, gz);
  const dist = fieldTo(g, goal);
  const here = cellOf(g, x, z), i = here % g.W, j = (here - i) / g.W;
  let best = null, bestD = dist[here] >= 0 ? dist[here] : 1e9;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= g.W || nj >= g.D) continue;
    const n = nj * g.W + ni;
    if (dist[n] < 0) continue;
    if (di && dj && (!g.open[j * g.W + ni] || !g.open[nj * g.W + i])) continue; // no cutting a corner
    const dd = dist[n] + (di && dj ? 0.4 : 0);
    if (dd < bestD) { bestD = dd; best = n; }
  }
  const to = best == null ? [gx, gz] : [g.x0 + (best % g.W) + 0.5, g.z0 + Math.floor(best / g.W) + 0.5];
  const dx = to[0] - x, dz = to[1] - z, len = Math.hypot(dx, dz);
  return len < 1e-6 ? [0, 0] : [dx / len, dz / len];
}

// ── A seeded random ──
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Where a player's shots leave from, and the unit direction of yaw/pitch.
export function aimFrom(p) {
  return [p.x - Math.cos(p.yaw) * SHOULDER.side, SHOULDER.up, p.z + Math.sin(p.yaw) * SHOULDER.side];
}
export function dirOf(yaw, pitch) {
  const c = Math.cos(pitch);
  return [Math.sin(yaw) * c, Math.sin(pitch), Math.cos(yaw) * c];
}

// Made-up street-food names for the bots.
export const BOT_NAMES = [
  { en: 'Hotteok', ko: '호떡', ja: 'ホットク', zh: '糖饼' },
  { en: 'Bungeoppang', ko: '붕어빵', ja: 'プンオパン', zh: '鲫鱼饼' },
  { en: 'Tanghulu', ko: '탕후루', ja: 'タンフル', zh: '糖葫芦' },
  { en: 'Sundae', ko: '순대', ja: 'スンデ', zh: '血肠' },
  { en: 'Mandu', ko: '만두', ja: 'マンドゥ', zh: '饺子' },
  { en: 'Gimbap', ko: '김밥', ja: 'キンパ', zh: '紫菜包饭' },
  { en: 'Twigim', ko: '튀김', ja: 'ティギム', zh: '炸物' },
  { en: 'Eomuk', ko: '어묵', ja: 'オムク', zh: '鱼糕' },
];

// ── The match ────────────────────────────────────────────────────────────
// players: [{ id, name, team (0|1), gun, bot }] (a side short of `size` is
// filled with bots). The match moves the players it controls (from their
// input, and the bots). With two people (core/strike-net.js) the host's match
// decides everything; the other person's player is `remote` there: it goes
// where their messages say (setRemote) and its hits are claims the host
// checks (claim). The guest's match (`guest`: their id) only moves their own
// player and shows the rest from the host's snapshots (apply).
//   step(inputs) → events. inputs: { [id]: { mx, mz, yaw, pitch, fire, reload, scope } }
//   (mx, mz: -1..1, right and forward of where the player looks)
export function createMatch({ map = 'warehouse', size = 4, players = [], seed = 7, botSkill = 1, guest = null } = {}) {
  const R = rng(seed);
  const m = {
    map, size, phase: 'warmup', t: 0, left: MATCH_SECS, target: KILL_TARGET[Math.max(1, Math.min(4, size)) - 1],
    score: [0, 0], players: [], winner: null, seed, guest, out: [],
  };
  const used = new Set();
  const addPlayer = (q, team, i) => {
    const p = {
      id: q.id, name: q.name, team, bot: !!q.bot, remote: !!q.remote, look: q.look || null, nameKey: q.nameKey ?? null,
      gun: GUNS[q.gun] ? q.gun : 'magpie', nextGun: null,
      x: 0, z: 0, yaw: team ? -Math.PI / 2 : Math.PI / 2, pitch: 0, vx: 0, vz: 0,
      hp: HP, ammo: 0, reload: 0, cool: 0, dead: false, respawn: 0, protect: 0, scoped: false, firing: false,
      kills: 0, deaths: 0, heads: 0, slot: i, lastHitBy: null, spawns: 0, net: null, lastShot: -9, shotsLeft: 0,
      ai: q.bot ? { goal: null, goalT: 0, target: null, seen: 0, err: [0, 0], strafe: 1, strafeT: 0, react: 0 } : null,
    };
    p.ammo = GUNS[p.gun].mag;
    m.players.push(p);
    return p;
  };
  for (const team of [0, 1]) {
    const mine = players.filter((q) => q.team === team).slice(0, size);
    mine.forEach((q, i) => addPlayer(q, team, i));
    for (let i = mine.length; i < size; i++) {
      let k = Math.floor(R() * BOT_NAMES.length);
      while (used.has(k) && used.size < BOT_NAMES.length) k = (k + 1) % BOT_NAMES.length;
      used.add(k);
      addPlayer({ id: 'bot' + team + i, nameKey: k, bot: true, gun: GUN_IDS[Math.floor(R() * GUN_IDS.length)] }, team, i);
    }
  }
  const spawnAt = (p) => {
    const pts = MAPS[map].spawns[p.team];
    // The spawn point farthest from any living enemy (the first time: by slot).
    let pt = pts[p.slot % pts.length];
    if (m.phase !== 'warmup') {
      let bestD = -1;
      for (const q of pts) {
        let near = 1e9;
        for (const e of m.players) if (e.team !== p.team && !e.dead) near = Math.min(near, Math.hypot(e.x - q[0], e.z - q[1]));
        near += R() * 3;
        if (near > bestD) { bestD = near; pt = q; }
      }
    }
    p.x = pt[0]; p.z = pt[1];
    p.yaw = p.team ? -Math.PI / 2 : Math.PI / 2; p.pitch = 0;
    if (p.nextGun) { p.gun = p.nextGun; p.nextGun = null; }
    p.hp = HP; p.ammo = GUNS[p.gun].mag; p.reload = 0; p.cool = 0; p.dead = false; p.protect = PROTECT_SECS; p.scoped = false; p.lastHitBy = null;
    p.spawns++; p.net = null; p.vx = p.vz = 0; p.shotsLeft = GUNS[p.gun].mag;
    if (p.ai) { p.ai.goal = null; p.ai.target = null; }
  };
  if (guest) for (const p of m.players) if (p.id !== guest) { p.remote = true; p.bot = false; p.ai = null; }
  for (const p of m.players) spawnAt(p);
  m.byId = (id) => m.players.find((p) => p.id === id);

  // One bullet from p: what it hits. Returns the event.
  function shoot(p, ev) {
    const g = GUNS[p.gun];
    const moving = Math.hypot(p.vx, p.vz) > 0.5;
    let spread = g.scope && p.scoped ? g.scoped : g.spread[moving ? 1 : 0];
    if (g.scope && p.scoped && moving) spread = g.spread[0];
    const o = aimFrom(p);
    const base = dirOf(p.yaw, p.pitch);
    // A random tilt inside the spread cone.
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * spread;
    const yaw = p.yaw + Math.cos(a) * r / Math.max(0.2, Math.cos(p.pitch)), pitch = p.pitch + Math.sin(a) * r;
    const d = spread ? dirOf(yaw, pitch) : base;
    const wall = rayWalls(map, o, d, g.range);
    let hit = null;
    for (const q of m.players) {
      if (q === p || q.dead) continue;
      const h = rayPlayer(o, d, q);
      if (h && h.t < wall && (!hit || h.t < hit.t)) hit = { ...h, q };
    }
    const t = hit ? hit.t : wall;
    const shot = { k: 'shot', by: p.id, gun: p.gun, from: o, to: [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t], wall: !hit && wall < g.range };
    ev.push(shot);
    if (hit) {
      shot.hit = hit.q.id; shot.zone = hit.zone;
      if (hit.q.team !== p.team) {
        if (guest) { if (!hit.q.protect) ev.push({ k: 'hit', by: p.id, to: hit.q.id, zone: hit.zone, dmg: 0, hp: hit.q.hp, claim: true }); } else damage(hit.q, p, hit.zone, ev);
      }
    }
    // The guest's shots go to the host, who decides (claim).
    if (guest) m.out.push([o, d, t, hit && hit.q.team !== p.team ? m.players.indexOf(hit.q) : -1, hit ? ZONES.indexOf(hit.zone) : 0, shot.wall ? 1 : 0]);
    return shot;
  }
  function damage(q, by, zone, ev) {
    if (q.protect > 0 || q.dead || m.phase !== 'play') return;
    const dmg = Math.min(q.hp, damageOf(by.gun, zone));
    q.hp -= dmg;
    q.lastHitBy = by.id;
    ev.push({ k: 'hit', by: by.id, to: q.id, zone, dmg, hp: q.hp });
    if (q.ai && !q.ai.target) { q.ai.target = by.id; q.ai.react = 0.25; q.ai.err = [(R() - 0.5) * 0.3, (R() - 0.5) * 0.15]; }
    if (q.hp <= 0) {
      q.dead = true; q.respawn = RESPAWN_SECS; q.deaths++; q.scoped = false; q.firing = false;
      by.kills++;
      if (zone === 'core') by.heads++;
      m.score[by.team]++;
      ev.push({ k: 'kill', by: by.id, to: q.id, zone, gun: by.gun });
      if (m.score[by.team] >= m.target) end(by.team, ev);
    }
  }
  function end(winner, ev) {
    if (m.phase === 'over') return;
    m.phase = 'over'; m.winner = winner;
    for (const p of m.players) { p.firing = false; p.scoped = false; }
    ev.push({ k: 'over', winner });
  }

  // ── Bots ──
  const sees = (p, q) => {
    const o = aimFrom(p), tx = q.x - o[0], ty = HB.chest - o[1], tz = q.z - o[2], len = Math.hypot(tx, ty, tz);
    if (len > GUNS[p.gun].range) return false;
    return rayWalls(map, o, [tx / len, ty / len, tz / len], len) >= len - 0.3;
  };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function botInput(p, dt) {
    const ai = p.ai, g = GUNS[p.gun], inp = { mx: 0, mz: 0, yaw: p.yaw, pitch: p.pitch, fire: false, reload: false, scope: false };
    // Look for someone to shoot, a few times a second.
    ai.seen -= dt;
    if (ai.seen <= 0) {
      ai.seen = 0.2 + R() * 0.15;
      let best = null, bestD = 1e9;
      for (const q of m.players) {
        if (q.team === p.team || q.dead) continue;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < bestD && sees(p, q)) { best = q; bestD = d; }
      }
      if (best && best.id !== ai.target) {
        ai.target = best.id;
        ai.react = (0.35 + R() * 0.3) / botSkill; // a moment to notice
        ai.err = [(R() - 0.5) * 0.35, (R() - 0.5) * 0.18];
      } else if (!best && ai.target) {
        const q = m.byId(ai.target);
        if (q && !q.dead) ai.goal = [q.x, q.z]; // go where they were seen last
        ai.target = null;
      }
    }
    const q = ai.target ? m.byId(ai.target) : null;
    if (q && !q.dead) {
      // Turn toward their chest (the aim wobbles in, then holds a little off).
      const o = aimFrom(p), tx = q.x - o[0], tz = q.z - o[2], flat = Math.hypot(tx, tz);
      const want = Math.atan2(tx, tz) + ai.err[0], wantP = Math.atan2(HB.chest - o[1], flat) + ai.err[1];
      const turn = 5 * dt * botSkill;
      inp.yaw = p.yaw + Math.max(-turn, Math.min(turn, wrap(want - p.yaw)));
      inp.pitch = p.pitch + Math.max(-turn, Math.min(turn, wantP - p.pitch));
      const settle = 0.06 + 0.05 / botSkill; // how far off the aim stays
      for (let i = 0; i < 2; i++) ai.err[i] += ((R() - 0.5) * settle * 2 - ai.err[i]) * Math.min(1, dt * 2.2 * botSkill);
      ai.react -= dt;
      const onIt = Math.abs(wrap(want - inp.yaw)) < 0.12;
      if (ai.react <= 0 && onIt && p.ammo > 0) inp.fire = g.auto ? true : p.cool <= 0;
      if (g.scope) inp.scope = flat > 8;
      // Side-step while shooting; the sniper stands still to aim.
      ai.strafeT -= dt;
      if (ai.strafeT <= 0) { ai.strafeT = 0.6 + R() * 1.2; ai.strafe = R() < 0.5 ? -1 : 1; }
      if (!(g.scope && inp.scope)) inp.mx = ai.strafe * 0.8;
      if (flat > g.range * 0.6) inp.mz = 0.6; // too far: closer
    } else {
      // Walk to a place on the map (or where someone was last seen).
      ai.goalT -= dt;
      const pts = MAPS[map].points;
      if (!ai.goal || ai.goalT <= 0 || Math.hypot(ai.goal[0] - p.x, ai.goal[1] - p.z) < 1.5) {
        const enemyHalf = R() < 0.5;
        const sp = MAPS[map].spawns[1 - p.team];
        ai.goal = enemyHalf ? sp[Math.floor(R() * sp.length)].slice() : pts[Math.floor(R() * pts.length)].slice();
        ai.goalT = 8 + R() * 6;
      }
      const [wx, wz] = pathStep(map, p.x, p.z, ai.goal[0], ai.goal[1]);
      const want = Math.atan2(wx, wz);
      const turn = 6 * dt;
      inp.yaw = p.yaw + Math.max(-turn, Math.min(turn, wrap(want - p.yaw)));
      inp.pitch = p.pitch * 0.9;
      // Walk the way the path goes, whichever way the bot is turned.
      const c = Math.cos(inp.yaw), s = Math.sin(inp.yaw);
      inp.mz = wx * s + wz * c; inp.mx = -(wx * c - wz * s);
      if (p.ammo < g.mag * 0.4) inp.reload = true;
    }
    return inp;
  }

  // A player moved from outside drifts to where it was last said to be.
  function follow(p, dt) {
    const n = p.net;
    if (!n) { p.vx = p.vz = 0; return; }
    n.age += dt;
    if (n.age < 0.5) { n.x += n.vx * dt; n.z += n.vz * dt; }
    const k = Math.min(1, dt * 12);
    const nx = p.x + (n.x - p.x) * k, nz = p.z + (n.z - p.z) * k;
    p.vx = (nx - p.x) / dt; p.vz = (nz - p.z) / dt;
    p.x = nx; p.z = nz;
    p.yaw = wrap(p.yaw + wrap(n.yaw - p.yaw) * k); p.pitch += (n.pitch - p.pitch) * k;
  }
  m.step = function step(inputs = {}) {
    const ev = [], dt = TICK;
    m.t += dt;
    if (guest) { if (m.phase === 'play') m.left = Math.max(0, m.left - dt); } // (the host's clock corrects it)
    else if (m.phase === 'warmup') {
      if (m.t >= WARMUP_SECS) { m.phase = 'play'; ev.push({ k: 'go' }); }
    } else if (m.phase === 'play') {
      m.left -= dt;
      if (m.left <= 0) { m.left = 0; end(m.score[0] === m.score[1] ? -1 : m.score[0] > m.score[1] ? 0 : 1, ev); }
    }
    for (const p of m.players) {
      if (p.dead) {
        if (!guest && m.phase === 'play' && (p.respawn -= dt) <= 0) { spawnAt(p); ev.push({ k: 'spawn', id: p.id }); }
        else if (guest && p.respawn > 0) p.respawn -= dt;
        continue;
      }
      if (p.protect > 0) p.protect -= dt;
      if (p.remote) { follow(p, dt); continue; }
      const inp = m.phase === 'over' ? {} : p.bot ? botInput(p, dt) : inputs[p.id] || {};
      const g = GUNS[p.gun];
      if (inp.yaw != null && Number.isFinite(inp.yaw)) p.yaw = wrap(inp.yaw);
      if (inp.pitch != null && Number.isFinite(inp.pitch)) p.pitch = Math.max(-1.2, Math.min(1.2, inp.pitch));
      p.scoped = !!(g.scope && inp.scope && p.reload <= 0);
      // Walking (no moving during the countdown, a little slower while scoped).
      let mx = Math.max(-1, Math.min(1, inp.mx || 0)), mz = Math.max(-1, Math.min(1, inp.mz || 0));
      const len = Math.hypot(mx, mz);
      if (len > 1) { mx /= len; mz /= len; }
      const sp = m.phase === 'warmup' ? 0 : WALK * g.walk * (p.scoped ? 0.45 : 1);
      const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
      // Forward is (sin, cos); the player's right is (-cos, sin).
      p.vx = (s * mz - c * mx) * sp; p.vz = (c * mz + s * mx) * sp;
      p.x += p.vx * dt; p.z += p.vz * dt;
      pushOut(map, p);
      // The gun.
      if (p.cool > 0) p.cool -= dt;
      if (p.reload > 0) {
        if ((p.reload -= dt) <= 0) { p.reload = 0; p.ammo = g.mag; ev.push({ k: 'loaded', id: p.id }); }
      } else if ((inp.reload && p.ammo < g.mag) || (inp.fire && p.ammo <= 0)) {
        p.reload = g.reload; p.scoped = false; ev.push({ k: 'reload', id: p.id });
      }
      const wantFire = !!inp.fire && m.phase === 'play';
      if (wantFire && p.reload <= 0 && p.ammo > 0 && p.cool <= 0 && (g.auto || !p.firing)) {
        p.ammo--; p.cool += 1 / g.rate;
        if (p.cool < 0) p.cool = 0;
        shoot(p, ev);
        if (p.ammo === 0) { p.reload = g.reload; p.scoped = false; ev.push({ k: 'reload', id: p.id }); }
      }
      p.firing = wantFire;
      if (p.cool < 0) p.cool = 0;
    }
    return ev;
  };

  // ── Two people (core/strike-net.js packs these) ──
  // Host: where the other person's player is now.
  m.setRemote = (id, st) => {
    const p = m.byId(id);
    if (!p || !p.remote || p.dead || !st) return;
    const ok = [st.x, st.z, st.yaw, st.pitch].every(Number.isFinite);
    if (!ok || st.spawns !== p.spawns) return; // (from before they went down)
    const [w, h] = MAPS[map].size;
    const x = Math.max(-w / 2, Math.min(w / 2, st.x)), z = Math.max(-h / 2, Math.min(h / 2, st.z));
    const was = p.net;
    p.net = { x, z, yaw: st.yaw, pitch: Math.max(-1.2, Math.min(1.2, st.pitch)), vx: 0, vz: 0, age: 0 };
    if (was && was.age > 0.02) { p.net.vx = Math.max(-6, Math.min(6, (x - was.x0) / was.age)); p.net.vz = Math.max(-6, Math.min(6, (z - was.z0) / was.age)); }
    p.net.x0 = x; p.net.z0 = z;
    if (!was) { p.x = x; p.z = z; p.yaw = st.yaw; }
    p.scoped = !!st.scoped;
    if (GUNS[st.next] && st.next !== p.gun) {
      if (m.phase === 'warmup') { p.gun = st.next; p.ammo = GUNS[p.gun].mag; p.shotsLeft = 0; } else p.nextGun = st.next;
    }
  };
  // Host: the other person says they shot (and maybe whom). Believed when it
  // could be so: their gun's rate and magazine, the one hit an enemy up and
  // near the bullet's line, no wall before it. Returns the events.
  m.claim = (id, shot) => {
    const ev = [], p = m.byId(id);
    if (!p || !p.remote || p.dead || m.phase !== 'play' || !Array.isArray(shot)) return ev;
    const [o, d, t, ti, zi, wall] = shot;
    if (![...(o || []), ...(d || []), t].every(Number.isFinite) || o.length !== 3 || d.length !== 3) return ev;
    const g = GUNS[p.gun];
    // No faster than the gun fires (a little slack for bunched messages), and it reloads.
    if (m.t - p.lastShot < 0.6 / g.rate) return ev;
    if (p.shotsLeft <= 0) { if (m.t - p.lastShot < g.reload * 0.8) return ev; p.shotsLeft = g.mag; }
    p.lastShot = m.t; p.shotsLeft--;
    const len = Math.hypot(d[0], d[1], d[2]) || 1, dir = [d[0] / len, d[1] / len, d[2] / len];
    const from = aimFrom(p);
    const tt = Math.max(0, Math.min(g.range, t));
    const e = { k: 'shot', by: id, gun: p.gun, from, to: [o[0] + dir[0] * tt, o[1] + dir[1] * tt, o[2] + dir[2] * tt], wall: !!wall };
    ev.push(e);
    const q = m.players[ti];
    if (!q || q.team === p.team || q.dead) return ev;
    if (Math.hypot(o[0] - from[0], o[2] - from[2]) > 3) return ev; // not from where they stand
    // Their bullet's line passes the one they name, and no wall is in between.
    const rx = q.x - o[0], ry = 0.6 - o[1], rz = q.z - o[2], along = rx * dir[0] + ry * dir[1] + rz * dir[2];
    if (along < 0 || along > g.range) return ev;
    const off = Math.hypot(rx - dir[0] * along, rz - dir[2] * along);
    if (off > 1.5) return ev;
    if (rayWalls(map, o, dir, along) < along - 0.5) return ev;
    e.hit = q.id; e.zone = ZONES[zi] || 'body';
    damage(q, p, e.zone, ev);
    return ev;
  };
  // Host: everything the guest needs to show the match.
  m.snapshot = () => ({
    ph: m.phase, t: +m.t.toFixed(2), left: +m.left.toFixed(1), sc: m.score.slice(), w: m.winner,
    p: m.players.map((p) => [+p.x.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2), p.hp, (p.dead ? 1 : 0) | (p.scoped ? 2 : 0) | (p.protect > 0 ? 4 : 0), GUN_IDS.indexOf(p.gun), p.kills, p.deaths, p.spawns, +p.respawn.toFixed(1)]),
  });
  // Guest: the host's snapshot. Returns events (spawn, go, over) for the screen.
  m.apply = (s) => {
    const ev = [];
    if (!s || !Array.isArray(s.p) || s.p.length !== m.players.length) return ev;
    if (s.ph !== m.phase) {
      if (s.ph === 'play' && m.phase === 'warmup') ev.push({ k: 'go' });
      if (s.ph === 'over') { m.winner = s.w; ev.push({ k: 'over', winner: s.w }); }
      m.phase = s.ph;
    }
    m.t = s.t; m.left = s.left; m.score = [s.sc[0] | 0, s.sc[1] | 0];
    s.p.forEach((a, i) => {
      const p = m.players[i], [x, z, yaw, pitch, hp, flags, gi, kills, deaths, spawns, respawn] = a;
      const mine = p.id === guest;
      const dead = !!(flags & 1);
      p.hp = hp; p.kills = kills; p.deaths = deaths; p.respawn = respawn;
      if (spawns !== p.spawns) {
        // Back on the map (or the first place): there, with the gun they chose.
        p.spawns = spawns; p.x = x; p.z = z; p.yaw = yaw; p.pitch = 0; p.net = null; p.dead = dead;
        p.gun = GUN_IDS[gi] || p.gun;
        if (mine) { p.ammo = GUNS[p.gun].mag; p.reload = 0; p.cool = 0; p.nextGun = null; }
        ev.push({ k: 'spawn', id: p.id });
      }
      if (dead && !p.dead) { p.dead = true; p.scoped = false; p.firing = false; }
      if (!dead) p.dead = false;
      p.protect = flags & 4 ? Math.max(p.protect, 0.3) : 0;
      if (mine) return;
      p.gun = GUN_IDS[gi] || p.gun;
      p.scoped = !!(flags & 2);
      const was = p.net;
      p.net = { x, z, yaw, pitch, vx: 0, vz: 0, age: 0, x0: x, z0: z };
      if (was && was.age > 0.02) { p.net.vx = Math.max(-6, Math.min(6, (x - was.x0) / was.age)); p.net.vz = Math.max(-6, Math.min(6, (z - was.z0) / was.age)); }
    });
    return ev;
  };
  // The other person left: a bot plays on for them.
  m.toBot = (id) => {
    const p = m.byId(id);
    if (!p || !p.remote) return;
    p.remote = false; p.bot = true; p.net = null;
    p.ai = { goal: null, goalT: 0, target: null, seen: 0, err: [0, 0], strafe: 1, strafeT: 0, react: 0 };
  };
  // Pick the gun you come back with next time (or now, while waiting to start).
  m.chooseGun = (id, gun) => {
    const p = m.byId(id);
    if (!p || !GUNS[gun]) return;
    p.nextGun = gun;
    if (m.phase === 'warmup') { p.gun = gun; p.ammo = GUNS[gun].mag; p.reload = 0; }
  };
  // The scoreboard: each team best first.
  m.board = () => [0, 1].map((team) => m.players.filter((p) => p.team === team).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths));
  return m;
}

// The saved choices (map, team size, gun) and a record.
const KEY = 'mk.strike';
export function loadStrike(store) {
  let r = {};
  try { r = JSON.parse(store?.getItem(KEY) || '{}') || {}; } catch { r = {}; }
  return {
    map: MAPS[r.map] ? r.map : 'warehouse', size: r.size >= 1 && r.size <= 4 ? Math.floor(r.size) : 4,
    gun: GUNS[r.gun] ? r.gun : 'magpie', wins: Math.max(0, r.wins | 0), played: Math.max(0, r.played | 0), best: Math.max(0, r.best | 0),
  };
}
export function saveStrike(store, rec) {
  try { store?.setItem(KEY, JSON.stringify(rec)); } catch { /* full or blocked */ }
}
export function afterStrike(store, { won, kills }) {
  const rec = loadStrike(store);
  rec.played++;
  if (won) rec.wins++;
  rec.best = Math.max(rec.best, kills | 0);
  saveStrike(store, rec);
  return rec;
}
