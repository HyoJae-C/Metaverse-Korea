// How an upgraded dish (강화 +1 to +30) looks: every 5 levels it steps up
// to a new look, a little bigger, on a finer dish, with a stronger effect.
// Used wherever a dish is shown in 3D (on a picnic mat, a home table, in
// the hand). Kept small: a few shared meshes per dish, animated by tick(t).
//
//   +0   plain      white plate, medal rim
//   +5   정성       brass (놋쇠) bowl, warm glow, steam, sparkles circling
//   +10  달인       black lacquer tray inlaid with mother-of-pearl (나전), soft light column
//   +15  명인       small red 소반 table with a gold edge, petals drifting round
//   +20  명장       celadon (청자) plate on the 소반, clouds circling, jade light
//   +25  수라       royal red lacquer table (수라상), gold beams turning
//   +30  천하일미       a golden two-step 수라상: beams all round, halo rings,
//                   embers rising and little fireworks bursting overhead
// (look: which of these a tier wears; 1 is kept for a plate with only a glow)
import * as THREE from 'three';

export const DISH_LEVEL_MAX = 30;
export const TIERS = [
  { at: 0, id: 'plain', ko: '기본', scale: 1, look: 0 },
  { at: 5, id: 'jeongseong', ko: '정성', scale: 1.1, look: 2 },
  { at: 10, id: 'dalin', ko: '달인', scale: 1.2, look: 3 },
  { at: 15, id: 'myeongin', ko: '명인', scale: 1.3, look: 4 },
  { at: 20, id: 'myeongjang', ko: '명장', scale: 1.4, look: 5 },
  { at: 25, id: 'sura', ko: '수라', scale: 1.5, look: 6 },
  { at: 30, id: 'cheonha', ko: '천하일미', scale: 1.7, look: 7 },
];
// The look for an upgrade level (0-30).
export function tierOf(level) {
  const n = Math.max(0, Math.min(DISH_LEVEL_MAX, level | 0));
  let out = TIERS[0];
  for (const t of TIERS) if (n >= t.at) out = t;
  return out;
}
export const tierIndex = (level) => TIERS.indexOf(tierOf(level));

const RIM = { g: '#e8b923', s: '#9aa3ad', b: '#c27c3a', n: '#f6f1e6' };
const mats = {};
const lam = (c) => (mats['l' + c] ||= new THREE.MeshLambertMaterial({ color: c }));
const glowMat = (c, o) => (mats[`g${c}${o}`] ||= new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
const geo = {};
const G = (k, f) => (geo[k] ||= f());

// A soft round glow lying flat (a disc fading out from a bright middle).
let glowTex = null;
function glowTexture() {
  if (glowTex || typeof document === 'undefined') return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
// A fade from bright at the bottom to nothing at the top (light columns).
let fadeTex = null;
function fadeTexture() {
  if (fadeTex || typeof document === 'undefined') return fadeTex;
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 64;
  const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 1, 64);
  fadeTex = new THREE.CanvasTexture(c);
  return fadeTex;
}
function glow(color, r, opacity) {
  const m = (mats[`d${color}${opacity}`] ||= new THREE.MeshBasicMaterial({ color, map: glowTexture(), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  const d = new THREE.Mesh(G('glow', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), m);
  d.scale.set(r * 2, 1, r * 2);
  return d;
}

// The dish's plate (or tray, table) for its tier, with the medal on the rim.
// Returns { group, top } where top is the height the food sits at.
function base(tier, medal) {
  const g = new THREE.Group();
  const rim = (r, y, c = RIM[medal] || RIM.n) => {
    const m = new THREE.Mesh(G('rim' + r, () => new THREE.TorusGeometry(r, 0.014, 6, 28).rotateX(Math.PI / 2)), lam(c));
    m.position.y = y;
    g.add(m);
  };
  const plate = (color, y = 0.012) => {
    const p = new THREE.Mesh(G('plate', () => new THREE.CylinderGeometry(0.2, 0.17, 0.025, 24)), lam(color));
    p.position.y = y;
    g.add(p);
  };
  const soban = (top, edge) => { // a small round table on four legs
    const t = new THREE.Mesh(G('soban', () => new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28)), lam(top));
    t.position.y = 0.13;
    const e = new THREE.Mesh(G('sobanEdge', () => new THREE.TorusGeometry(0.3, 0.012, 6, 32).rotateX(Math.PI / 2)), lam(edge));
    e.position.y = 0.145;
    g.add(t, e);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const leg = new THREE.Mesh(G('leg', () => new THREE.BoxGeometry(0.035, 0.12, 0.035)), lam(top));
      leg.position.set(Math.cos(a) * 0.22, 0.06, Math.sin(a) * 0.22);
      g.add(leg);
    }
    return 0.145;
  };
  switch (tier.look) {
    case 0:
    case 1:
      plate('#ffffff');
      rim(0.19, 0.026);
      return { group: g, top: 0.025 };
    case 2: { // a brass bowl-plate (놋그릇)
      plate('#d4ad55');
      rim(0.19, 0.026, '#f1d27a');
      rim(0.13, 0.026);
      return { group: g, top: 0.025 };
    }
    case 3: { // a black lacquer tray with mother-of-pearl dots (나전)
      const tray = new THREE.Mesh(G('tray', () => new THREE.CylinderGeometry(0.27, 0.25, 0.035, 8)), lam('#1c1a22'));
      tray.position.y = 0.018;
      g.add(tray);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        const pearl = new THREE.Mesh(G('pearl', () => new THREE.CircleGeometry(0.022, 6).rotateX(-Math.PI / 2)), glowMat('#cfe8ff', 0.85));
        pearl.position.set(Math.cos(a) * 0.225, 0.037, Math.sin(a) * 0.225);
        g.add(pearl);
      }
      plate('#ffffff', 0.048);
      rim(0.19, 0.062);
      return { group: g, top: 0.06 };
    }
    case 4: {
      const y = soban('#8e2a1e', '#e8b923');
      plate('#ffffff', y + 0.014);
      rim(0.19, y + 0.028);
      return { group: g, top: y + 0.027 };
    }
    case 5: { // celadon (청자) on a 소반
      const y = soban('#5b2a1c', '#e8b923');
      plate('#a9cdb8', y + 0.014);
      rim(0.19, y + 0.028, '#d8efe2');
      rim(0.14, y + 0.028);
      return { group: g, top: y + 0.027 };
    }
    case 6: { // a royal red lacquer table, wider, gold edges
      const t = new THREE.Mesh(G('sura', () => new THREE.BoxGeometry(0.62, 0.035, 0.62)), lam('#b3261e'));
      t.position.y = 0.16;
      const e = new THREE.Mesh(G('suraEdge', () => new THREE.BoxGeometry(0.65, 0.012, 0.65)), lam('#e8b923'));
      e.position.y = 0.146; // (a gold trim under the red top)
      g.add(t, e);
      for (const [x, z] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]]) {
        const leg = new THREE.Mesh(G('suraLeg', () => new THREE.CylinderGeometry(0.025, 0.035, 0.15, 8)), lam('#7d1912'));
        leg.position.set(x, 0.075, z);
        g.add(leg);
      }
      plate('#fffaf0', 0.2);
      rim(0.19, 0.214, '#e8b923');
      rim(0.15, 0.214);
      return { group: g, top: 0.213 };
    }
    default: { // the golden 수라상: two steps, gold top, red trim, gold plate
      const low = new THREE.Mesh(G('suraLow', () => new THREE.BoxGeometry(0.72, 0.05, 0.72)), lam('#8e1b14'));
      low.position.y = 0.025;
      const t = new THREE.Mesh(G('suraTop', () => new THREE.BoxGeometry(0.66, 0.04, 0.66)), lam('#f0c13a'));
      t.position.y = 0.22;
      const e = new THREE.Mesh(G('suraTrim', () => new THREE.BoxGeometry(0.69, 0.014, 0.69)), lam('#b3261e'));
      e.position.y = 0.203;
      g.add(low, t, e);
      for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
        const leg = new THREE.Mesh(G('suraGoldLeg', () => new THREE.CylinderGeometry(0.028, 0.04, 0.15, 8)), lam('#c79a22'));
        leg.position.set(x, 0.125, z);
        g.add(leg);
      }
      plate('#fff6d8', 0.255);
      rim(0.19, 0.269, '#ffd84d');
      rim(0.15, 0.269, '#b3261e');
      return { group: g, top: 0.268 };
    }
  }
}

// Effects for the tier, around a dish whose food top is at y. Returns a
// tick(t) that animates them (t in seconds).
function effects(tier, g, y) {
  const ticks = [];
  const i = tier.look;
  if (i >= 1) { // a warm glow under the plate, brighter each tier
    const c = ['', '#ffb347', '#ffd36b', '#cfe8ff', '#ff9a8a', '#9ff0c8', '#ffe27a', '#ffd84d'][i];
    const d = glow(c, 0.32 + i * 0.05, 0.35 + i * 0.06);
    d.position.y = 0.004;
    g.add(d);
    ticks.push((t) => { d.material.opacity = (0.35 + i * 0.06) * (0.8 + 0.2 * Math.sin(t * 2)); });
  }
  if (i === 1 || i === 2) { // steam rising
    const puffs = [0, 1, 2].map((k) => {
      const p = new THREE.Mesh(G('puff', () => new THREE.SphereGeometry(0.035, 8, 6)), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false }));
      g.add(p);
      return [p, k / 3];
    });
    ticks.push((t) => {
      for (const [p, o] of puffs) {
        const f = (t * 0.45 + o) % 1;
        p.position.set(Math.sin((f + o) * 6) * 0.03, y + 0.12 + f * 0.35, 0);
        p.scale.setScalar(0.6 + f * 1.4);
        p.material.opacity = 0.45 * (1 - f);
      }
    });
  }
  if (i >= 2) { // sparkles circling (more and faster each tier)
    const color = ['', '', '#fff1b0', '#e6f4ff', '#ffe0a3', '#d9fff0', '#fff6c8', '#fffbe0'][i];
    const n = 4 + i * 2;
    const star = G('star', () => { const s = new THREE.OctahedronGeometry(0.022, 0); s.scale(1, 1.6, 1); return s; });
    const stars = Array.from({ length: n }, (_, k) => { const s = new THREE.Mesh(star, glowMat(color, 0.95)); g.add(s); return [s, k / n]; });
    const r = 0.3 + i * 0.03;
    ticks.push((t) => {
      for (const [s, o] of stars) {
        const a = (o + t * (0.08 + i * 0.02)) * Math.PI * 2;
        s.position.set(Math.cos(a) * r, y + 0.12 + 0.12 * Math.sin(a * 2 + o * 9), Math.sin(a) * r);
        s.scale.setScalar(0.6 + 0.5 * Math.abs(Math.sin(t * 3 + o * 20)));
        s.rotation.y = t * 2;
      }
    });
  }
  if (i >= 3) { // a soft light column
    const color = ['', '', '', '#bfe0ff', '#ffd27a', '#a8f0cf', '#ffe27a', '#ffe27a'][i];
    const o = 0.13 + (i - 3) * 0.04;
    const m = new THREE.MeshBasicMaterial({ color, map: fadeTexture(), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const col = new THREE.Mesh(G('column', () => new THREE.CylinderGeometry(0.24, 0.27, 0.9, 24, 1, true).translate(0, 0.5, 0)), m);
    col.position.y = 0.01;
    g.add(col);
    ticks.push((t) => { m.opacity = o * (0.75 + 0.25 * Math.sin(t * 1.5)); });
  }
  if (i === 4) { // petals drifting round
    const petals = Array.from({ length: 8 }, (_, k) => {
      const p = new THREE.Mesh(G('petal', () => new THREE.CircleGeometry(0.045, 5)), lam(k % 2 ? '#ffb7c5' : '#ffd36b'));
      p.material.side = THREE.DoubleSide;
      g.add(p);
      return [p, k / 8];
    });
    ticks.push((t) => {
      for (const [p, o] of petals) {
        const f = (t * 0.15 + o) % 1, a = (o + t * 0.1) * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.42, y + 0.6 - f * 0.55, Math.sin(a) * 0.42);
        p.rotation.set(t * 2 + o * 9, t + o * 5, 0);
      }
    });
  }
  if (i === 5) { // little clouds circling (구름 문양)
    const clouds = Array.from({ length: 3 }, (_, k) => {
      const c = new THREE.Group();
      for (const [x, s] of [[-0.04, 0.035], [0, 0.05], [0.045, 0.035]]) {
        const b = new THREE.Mesh(G('cloud' + s, () => new THREE.SphereGeometry(s, 10, 8)), lam('#ffffff'));
        b.position.x = x;
        c.add(b);
      }
      g.add(c);
      return [c, k / 3];
    });
    ticks.push((t) => {
      for (const [c, o] of clouds) {
        const a = (o + t * 0.07) * Math.PI * 2;
        c.position.set(Math.cos(a) * 0.48, y + 0.32 + 0.04 * Math.sin(t + o * 6), Math.sin(a) * 0.48);
        c.rotation.y = -a;
      }
    });
  }
  if (i >= 6) { // gold beams turning, like a royal halo (twice as many at 수라)
    const beams = new THREE.Group(), n = i === 6 ? 6 : 12;
    for (let k = 0; k < n; k++) {
      const long = i === 7 && k % 2 === 0;
      const b = new THREE.Mesh(G(long ? 'beamLong' : 'beam', () => new THREE.PlaneGeometry(0.07, long ? 1.6 : 1.1).translate(0, long ? 0.8 : 0.55, 0)), new THREE.MeshBasicMaterial({ color: long ? '#fff3b0' : '#ffd84d', map: fadeTexture(), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      b.rotation.set(0, (k * Math.PI) / n, 0.35);
      const holder = new THREE.Group();
      holder.rotation.y = (k * Math.PI * 2) / n;
      holder.add(b);
      beams.add(holder);
    }
    beams.position.y = y;
    g.add(beams);
    ticks.push((t) => { beams.rotation.y = t * 0.4; });
  }
  if (i === 7) {
    // Two gold halo rings, tilted, turning opposite ways.
    const rings = [[0.4, 0.4, 0.22], [0.5, 0.7, -0.25]].map(([r, h, tilt]) => {
      const ring = new THREE.Mesh(G('halo' + r, () => new THREE.TorusGeometry(r, 0.012, 6, 48).rotateX(Math.PI / 2)), glowMat('#ffe27a', 0.8));
      ring.position.y = y + h;
      ring.rotation.z = tilt;
      g.add(ring);
      return ring;
    });
    // Gold embers rising from the table.
    const ember = G('ember', () => new THREE.OctahedronGeometry(0.016, 0));
    const embers = Array.from({ length: 16 }, (_, k) => { const e = new THREE.Mesh(ember, glowMat(k % 3 ? '#ffd84d' : '#ff8a5c', 0.95)); g.add(e); return [e, k / 16, (k * 2.4) % (Math.PI * 2)]; });
    // Little fireworks over the dish, one burst every 2.4 s in 오방색.
    const FW = ['#ff4d4d', '#ffd84d', '#4da6ff', '#ffffff', '#5ce08a'];
    const spark = G('spark', () => new THREE.SphereGeometry(0.018, 6, 4));
    const bursts = [0, 1].map((b) => {
      const grp = new THREE.Group();
      const parts = Array.from({ length: 14 }, (_, k) => {
        const a = (k / 14) * Math.PI * 2, el = ((k % 3) - 1) * 0.5;
        const m = new THREE.Mesh(spark, new THREE.MeshBasicMaterial({ color: FW[(b * 2 + k) % FW.length], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        grp.add(m);
        return [m, new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el))];
      });
      g.add(grp);
      return [grp, parts, b * 1.2];
    });
    ticks.push((t) => {
      rings[0].rotation.y = t * 0.8;
      rings[1].rotation.y = -t * 0.5;
      for (const [e, o, a] of embers) {
        const f = (t * 0.35 + o) % 1;
        e.position.set(Math.cos(a + t * 0.3) * (0.2 + f * 0.25), y + f * 1.2, Math.sin(a + t * 0.3) * (0.2 + f * 0.25));
        e.material.opacity = 0.95 * (1 - f);
        e.rotation.y = t * 3;
      }
      for (const [grp, parts, o] of bursts) {
        const f = ((t + o) % 2.4) / 2.4;
        const k = (Math.floor((t + o) / 2.4) * 7 + o * 10) % 6;
        grp.position.set(Math.cos(k) * 0.3, y + 1.0 + 0.15 * Math.sin(k * 3), Math.sin(k) * 0.3);
        for (const [m, d] of parts) {
          m.position.copy(d).multiplyScalar(0.05 + f * 0.35);
          m.position.y -= f * f * 0.12; // (falling a little as they fade)
          m.material.opacity = f < 0.1 ? f * 10 : 1 - f;
        }
      }
    });
  }
  return (t) => { for (const f of ticks) f(t); };
}

// A dish (its 3D model, as from makeHeld) shown at an upgrade level: on the
// tier's plate or table, scaled up, with its effects. `tray: false` for a
// dish in the hand (no plate, only the size and the effects).
export function makeTierDish(model, level, { medal = 'n', tray = true } = {}) {
  const tier = tierOf(level);
  if (!tier.at && !tray) return model; // (a plain dish in the hand: nothing to add)
  const g = new THREE.Group();
  g.name = 'dish-tier:' + tier.id;
  let top = 0;
  if (tray) { const b = base(tier, medal); g.add(b.group); top = b.top; }
  model.scale.multiplyScalar(tier.scale);
  model.position.y = top;
  g.add(model);
  const tick = effects(tier, g, top);
  g.userData.tick = tick;
  tick(0);
  if (tier.at) live.add(g);
  return g;
}

// Every upgraded dish on show animates from the game loop (tickDishes);
// one taken out of the scene drops off the list.
const live = new Set();
export function tickDishes(t) {
  for (const g of live) {
    if (!g.parent) { if (g.userData.seen) live.delete(g); continue; } // (not added yet, or gone)
    g.userData.seen = true;
    if (g.visible) g.userData.tick(t);
  }
}
