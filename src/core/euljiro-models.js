// Euljiro & Dongdaemun landmarks (map "landmarks" in districts/euljiro.json):
// Dongdaemun Design Plaza (one long, curved silver building with a grass
// roof walk), the stretch of the Seoul City Wall in Dongdaemun History &
// Culture Park with its two-arch water gate, and Namsangol's hanok gate.
// And Sungnyemun (Namdaemun) on its stone base. Low-poly and stylised. Visual only: collision comes from the map's
// blockers.
import * as THREE from 'three';
import { addBox } from './three-kit.js';
import { hipRoofGeometry } from './landmarks.js';

const mats = {};
const mat = (c, smooth = false) => (mats[c + smooth] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: !smooth }));
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);

// A closed outline ([[x, z], …], metres) as a shape in the x / -z plane,
// pulled in towards its centre by `inset` metres (an extrusion's bevel grows
// it back out).
function outlineShape(p, inset = 0) {
  const cx = p.reduce((t, q) => t + q[0], 0) / p.length, cz = p.reduce((t, q) => t + q[1], 0) / p.length;
  const s = new THREE.Shape();
  p.forEach(([x, z], i) => {
    const d = Math.hypot(x - cx, z - cz) || 1, k = Math.max(0.1, 1 - inset / d);
    const px = cx + (x - cx) * k, py = -(cz + (z - cz) * k);
    if (i === 0) s.moveTo(px, py); else s.lineTo(px, py);
  });
  s.closePath();
  return s;
}

// One of the great gates: a granite base with one round-topped arch
// through it (along z), a low parapet, and a two-storey pavilion with red
// posts, painted brackets and two hipped tile roofs; the name board hangs
// upright under the upper eaves, facing +z. o.W: base width; o.board: the
// name's characters, top to bottom.
function greatGate(g, o) {
  const stone = '#cfc4ae', W = o.W, D = 12, B = 8.5, A = 2.5; // base width, depth, height; arch half-width
  for (const sx of [-1, 1]) box(g, W / 2 - A, B, D, sx * (A + (W / 2 - A) / 2), B / 2, 0, stone);
  // Above the arch: a block with the round top cut out.
  const s = new THREE.Shape();
  s.moveTo(-A, 4.2); s.lineTo(-A, B); s.lineTo(A, B); s.lineTo(A, 4.2);
  s.absarc(0, 4.2, A, 0, Math.PI, false);
  const top = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 10 });
  top.translate(0, 0, -D / 2);
  g.add(new THREE.Mesh(top, mat(stone)));
  for (let y = 1.4; y < B; y += 1.4) box(g, W + 0.06, 0.06, D + 0.06, 0, y, 0, '#b3a78f'); // courses
  // The parapet round the top, a gap at each end for the stairs.
  for (const sz of [-1, 1]) box(g, W - 4, 1, 0.6, 0, B + 0.5, sz * (D / 2 - 0.3), '#bfb298');
  // Lower storey.
  const red = '#a23a2c', green = '#2f8f6b', wall = '#f1e7d2';
  box(g, 20, 0.5, 9, 0, B + 0.25, 0, '#b9ae98');
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) box(g, 0.6, 4.2, 0.6, -9 + i * 3.6, B + 2.6, sz * 3.8, red);
  box(g, 18.6, 3.4, 7, 0, B + 2.4, 0, wall);
  box(g, 21, 0.8, 9.4, 0, B + 4.9, 0, green); // painted brackets
  const roof = (w, d, h, y) => {
    const r = new THREE.Mesh(hipRoofGeometry(w, d, h), new THREE.MeshLambertMaterial({ color: '#3d4450', flatShading: true, side: THREE.DoubleSide }));
    r.position.y = y;
    g.add(r);
    box(g, Math.max(1, w - d * 0.9) + 0.6, h * 0.15, h * 0.15, 0, y + h * 1.04, 0, '#2b3038'); // ridge
  };
  roof(27, 14, 2.6, B + 5.3);
  // Upper storey.
  box(g, 16, 3.6, 6, 0, B + 9.2, 0, wall);
  for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) box(g, 0.5, 3.6, 0.5, -7.2 + i * 3.6, B + 9.2, sz * 3, red);
  box(g, 17.4, 0.7, 7.4, 0, B + 11.3, 0, green);
  roof(23, 11.5, 3.6, B + 11.6);
  // The name board, upright (as on the real gates), facing +z.
  const c = typeof document !== 'undefined' && document.createElement('canvas');
  const x = c && c.getContext && c.getContext('2d');
  if (x) {
    c.width = 96; c.height = 256;
    x.fillStyle = '#2b2a33'; x.fillRect(0, 0, 96, 256);
    x.strokeStyle = '#d4a73a'; x.lineWidth = 8; x.strokeRect(4, 4, 88, 248);
    x.fillStyle = '#f3eee4'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const n = o.board.length, step = 232 / n;
    x.font = `bold ${Math.round(step * 0.82)}px serif`;
    o.board.forEach((ch, i) => x.fillText(ch, 48, 14 + step * (i + 0.5)));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 3.4), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(0, B + 8.4, 4.75);
    g.add(board);
  }
}

// Heunginjimun at half the real size (Yozi, 2026-11-11), drawn after the
// real gate's proportions (photos and OSM): a wide, low granite base (its
// height under half the whole), one round arch, stepped wing walls going
// down either side with grass on their slopes, and a two-storey pavilion
// whose roofs stay narrower than the base. Local x: across the arch (along
// the wall); z: through it. The board faces +z. Sizes in HEUNG_GATE so the
// map builder can fit its blockers to them.
export const HEUNG_GATE = { W: 13, D: 8, H: 3.8, A: 1.3, wing: 3.6 };
function heungGate(g) {
  const { W, D, H, A, wing } = HEUNG_GATE, S = 2.0; // S: where the arch's round top starts
  const stone = '#cfc4ae', line = '#b3a78f', grass = '#6f9a52';
  for (const sx of [-1, 1]) box(g, W / 2 - A, H, D, sx * (A + (W / 2 - A) / 2), H / 2, 0, stone);
  const sh = new THREE.Shape();
  sh.moveTo(-A, S); sh.lineTo(-A, H); sh.lineTo(A, H); sh.lineTo(A, S);
  sh.absarc(0, S, A, 0, Math.PI, false);
  const top = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 10 });
  top.translate(0, 0, -D / 2);
  g.add(new THREE.Mesh(top, mat(stone)));
  for (let y = 0.95; y < H; y += 0.95) box(g, W + 0.04, 0.04, D + 0.04, 0, y, 0, line); // courses
  // The wing walls: four steps down either side, grass on each tread.
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const h = H * (0.82 - i * 0.18), w = wing / 4, x = sx * (W / 2 + w * (i + 0.5));
    box(g, w, h, D * 0.8, x, h / 2, 0, stone);
    box(g, w + 0.02, 0.12, D * 0.8 - 0.3, x, h + 0.06, 0, grass);
  }
  // The parapet round the top, gaps at the ends.
  for (const sz of [-1, 1]) box(g, W - 2.4, 0.55, 0.35, 0, H + 0.27, sz * (D / 2 - 0.18), '#bfb298');
  // The pavilion.
  const red = '#a23a2c', green = '#2f8f6b', wall = '#f1e7d2';
  box(g, 10.2, 0.25, 6.2, 0, H + 0.12, 0, '#b9ae98');
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) box(g, 0.3, 2, 0.3, -4.5 + i * 1.8, H + 1.25, sz * 2.7, red);
  box(g, 9.2, 1.6, 5, 0, H + 1.1, 0, wall);
  box(g, 10.4, 0.4, 6.2, 0, H + 2.2, 0, green); // painted brackets
  const roof = (w, d, h, y) => {
    const r = new THREE.Mesh(hipRoofGeometry(w, d, h), new THREE.MeshLambertMaterial({ color: '#3d4450', flatShading: true, side: THREE.DoubleSide }));
    r.position.y = y;
    g.add(r);
    box(g, Math.max(0.6, w - d * 0.9) + 0.3, h * 0.15, h * 0.15, 0, y + h * 1.04, 0, '#2b3038'); // ridge
    box(g, w - 0.4, 0.08, d - 0.4, 0, y + 0.02, 0, '#e8e2d6'); // the pale eave line
  };
  roof(11.6, 7.2, 1.2, H + 2.4);
  box(g, 7.6, 1.5, 4, 0, H + 3.5, 0, wall);
  for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) box(g, 0.26, 1.5, 0.26, -3.6 + i * 1.8, H + 3.5, sz * 2.05, red);
  box(g, 8.6, 0.35, 4.8, 0, H + 4.4, 0, green);
  roof(10.6, 6.4, 1.6, H + 4.55);
  // The name board under the upper eaves, facing +z, like the real one
  // (Korea Heritage Service photo): wider than tall, white characters on
  // deep blue in two columns read right to left (興仁 | 之門), in a frame
  // painted with flowers.
  const c = typeof document !== 'undefined' && document.createElement('canvas');
  const x = c && c.getContext && c.getContext('2d');
  if (x) {
    c.width = 256; c.height = 200;
    x.fillStyle = '#2f5a52'; x.fillRect(0, 0, 256, 200); // the frame
    for (let i = 0; i < 26; i++) { // its flowers, round the edge
      const t = i / 26, per = 2 * (256 + 200);
      let d = t * per, fx, fy;
      if (d < 256) { fx = d; fy = 11; } else if ((d -= 256) < 200) { fx = 245; fy = d; } else if ((d -= 200) < 256) { fx = 256 - d; fy = 189; } else { fx = 11; fy = 200 - (d - 256); }
      x.fillStyle = i % 2 ? '#f3eee4' : '#c8443a';
      x.beginPath(); x.arc(fx, fy, 6, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#1f2d4a'; x.fillRect(24, 24, 208, 152);
    x.fillStyle = '#f3eee4'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 64px serif';
    [['興', 180, 64], ['仁', 180, 138], ['之', 76, 64], ['門', 76, 138]].forEach(([t, tx, ty]) => x.fillText(t, tx, ty));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.17), new THREE.MeshBasicMaterial({ map: tex }));
    board.position.set(0, H + 3.6, 2.2);
    g.add(board);
  }
}

// The ongseong (옹성): the half-moon wall round the gate's front, as tall as
// the gate's base, with a crenellated parapet (a loophole in each merlon)
// and a low clipped hedge round its foot. l.arc: the wall's middle line,
// metres from the landmark's x, z (its middle; not "p", which the map would
// move as world points); l.h: its height.
function ongseong(g, l) {
  const h = l.h || 3.4, T = 1.6, stone = '#cbbfa6';
  const hedgeAt = [];
  const P = l.arc;
  for (let i = 1; i < P.length; i++) {
    const [x0, z0] = P[i - 1], [x1, z1] = P[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const seg = new THREE.Group();
    box(seg, len + 0.5, h, T, 0, h / 2, 0, stone);
    // (the segment's local +z, after its turn, points away from the middle
    // or towards it: merlons go on the outer edge)
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, a = -Math.atan2(z1 - z0, x1 - x0);
    const out = Math.sign(mx * Math.sin(a) + mz * Math.cos(a)) || 1;
    for (let y = 0.85; y < h; y += 0.85) box(seg, len + 0.52, 0.04, T + 0.04, 0, y, 0, '#b3a78f');
    const n = Math.max(1, Math.round(len / 1.5));
    for (let k = 0; k < n; k++) {
      const u = -len / 2 + (k + 0.5) * (len / n);
      box(seg, len / n - 0.35, 0.75, 0.4, u, h + 0.37, out * (T / 2 - 0.2), '#bfb298'); // merlon, on the outer edge
      box(seg, 0.14, 0.2, 0.42, u, h + 0.35, out * (T / 2 - 0.2), '#3b3a36'); // its loophole
    }
    seg.position.set(mx, 0, mz);
    seg.rotation.y = a;
    g.add(seg);
    for (let k = 0; k < Math.ceil(len / 1.2); k++) hedgeAt.push([x0 + ((x1 - x0) * (k + 0.5)) / Math.ceil(len / 1.2), z0 + ((z1 - z0) * (k + 0.5)) / Math.ceil(len / 1.2), -Math.atan2(z1 - z0, x1 - x0)]);
  }
  // The hedge, just outside the wall.
  const hedge = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.7, 0.7), mat('#4f8f45'), hedgeAt.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  hedgeAt.forEach(([x, z, a], i) => {
    const dx = x, dz = z, d = Math.hypot(dx, dz) || 1, o = T / 2 + 0.75;
    hedge.setMatrixAt(i, m4.compose(v.set(x + (dx / d) * o, 0.35, z + (dz / d) * o), q.setFromAxisAngle(up, a), one));
  });
  g.add(hedge);
}

// DDP's entrance banner: the runway's name and "go in" in Korean and English
// (a landmark's own art, like the gate boards).
function ddpBannerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 205;
  const x = c.getContext('2d');
  x.fillStyle = '#24212b'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#ffe9c4'; x.lineWidth = 6; x.strokeRect(10, 10, c.width - 20, c.height - 20);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const title = '👠 커브 런웨이 · CURVE RUNWAY';
  let px = 72;
  do x.font = `900 ${px -= 2}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`; while (px > 30 && x.measureText(title).width > c.width - 70);
  x.fillText(title, 512, 80);
  x.fillStyle = '#ffd166';
  x.font = '800 46px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  x.fillText('입장 ENTRANCE  ▼  DDP 홀 HALL', 512, 152);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
let flagTex = null;
function ddpFlagTexture() {
  if (flagTex) return flagTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 384;
  const x = c.getContext('2d');
  x.fillStyle = '#5b4a7a'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#ffe9c4'; x.fillRect(0, 0, c.width, 14); x.fillRect(0, c.height - 14, c.width, 14);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 62px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  ['런', '웨', '이'].forEach((ch, i) => x.fillText(ch, 64, 92 + i * 78));
  x.font = '60px system-ui, sans-serif';
  x.fillText('👠', 64, 330);
  flagTex = new THREE.CanvasTexture(c);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  return flagTex;
}

export const EULJIRO_BUILD = {
  // DDP: a silver body with rounded edges (the map outline l.outline, relative to x, z, extruded
  // with a deep bevel), dark panel seams, a strip of green on the roof walk,
  // and a glass-fronted way in facing the plaza (south).
  ddp(g, l) {
    const p = l.outline, H = 15, bev = 6;
    const zMax = Math.max(...p.map((q) => q[1]));
    const geo = new THREE.ExtrudeGeometry(outlineShape(p, bev), { depth: H - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 12 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bev, 0);
    g.add(new THREE.Mesh(geo, mat('#c9ced6', true)));
    // Panel seams: thin dark bands round the body (on the straight part of the wall).
    for (const y of [bev + 0.2, H - bev - 0.2]) {
      const band = new THREE.Mesh(new THREE.ExtrudeGeometry(outlineShape(p, -0.08), { depth: 0.16, bevelEnabled: false }), mat('#9aa1ab'));
      band.rotation.x = -Math.PI / 2;
      band.position.y = y;
      g.add(band);
    }
    // The roof walk: a green strip along the top with a pale path.
    const roof = new THREE.Mesh(new THREE.ShapeGeometry(outlineShape(p.map(([x, z]) => [x * 0.75, z * 0.35 - 6]))), mat('#86b56f'));
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = H + 0.3;
    g.add(roof);
    // The way in on the plaza side: a dark glass gap under a lip.
    const front = zMax - 1.2;
    box(g, 14, 5, 3, 0, 2.5, front, '#2f3a48');
    box(g, 16, 0.5, 4, 0, 5.3, front + 0.6, '#aeb4bd');
    // So you can tell you can go in: a big banner over the way in, tall
    // banners on poles either side, and a carpet out onto the plaza.
    const gapFront = front + 1.5;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4), new THREE.MeshBasicMaterial({ map: ddpBannerTexture() }));
    banner.position.set(0, 7.1, front + 2.65);
    g.add(banner);
    box(g, 12.4, 0.16, 0.16, 0, 8.35, front + 2.62, '#3a3545'); // its rail
    for (const sx of [-1, 1]) {
      box(g, 0.14, 7, 0.14, sx * 8.6, 3.5, gapFront + 1.2, '#9aa1ab');
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.2), new THREE.MeshBasicMaterial({ map: ddpFlagTexture(), side: THREE.DoubleSide }));
      flag.position.set(sx * 7.85, 4.6, gapFront + 1.2);
      g.add(flag);
    }
    const carpetLen = 9;
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.2, carpetLen).rotateX(-Math.PI / 2), mat('#5b4a7a', true));
    carpet.position.set(0, 0.03, gapFront + carpetLen / 2);
    g.add(carpet);
    const edge = new THREE.MeshBasicMaterial({ color: '#ffe9c4' });
    for (const sx of [-1.6, 1.6]) {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.12, carpetLen).rotateX(-Math.PI / 2), edge);
      e.position.set(sx, 0.035, gapFront + carpetLen / 2);
      g.add(e);
    }
  },
  // The Seoul City Wall (한양도성) in the park, running north-south: granite
  // courses, a stepped parapet on top, and the two-arch water gate
  // (이간수문) near its south end. l.len: length along z.
  citywall(g, l) {
    const len = l.len || 90, H = 5.5;
    box(g, 4, H, len, 0, H / 2, 0, '#cbbfa6');
    for (let y = 1.1; y < H; y += 1.1) box(g, 4.06, 0.06, len, 0, y, 0, '#b3a78f'); // courses
    const n = Math.floor(len / 2.4);
    for (let i = 0; i < n; i++) if (i % 2 === 0) box(g, 1.2, 1, 2.2, 0, H + 0.5, -len / 2 + 1.2 + i * 2.4, '#bfb298'); // parapet
    // The water gate: two dark arches through the wall (seen from both sides).
    // l.gates: 0 for a plain stretch (beside Sungnyemun).
    if (l.gates !== 0) for (const z of [len / 2 - 14, len / 2 - 8]) {
      for (const sx of [-1, 1]) {
        const arch = new THREE.Mesh(new THREE.CircleGeometry(1.8, 12, 0, Math.PI), mat('#3b3a36'));
        arch.position.set(sx * 2.04, 1.6, z);
        arch.rotation.y = sx * Math.PI / 2;
        g.add(arch);
        box(g, 0.04, 1.6, 3.6, sx * 2.04, 0.8, z, '#3b3a36');
      }
    }
  },
  // Sungnyemun (숭례문): its arch runs north-south, the board faces south.
  sungnyemun: (g) => greatGate(g, { W: 28, board: ['崇', '禮', '門'] }),
  // Heunginjimun (흥인지문): at half the real size, the real one's
  // proportions (heungGate), its four-character name board (the only great
  // gate with four); the ongseong round its front is its own landmark.
  heunginjimun: (g) => heungGate(g),
  ongseong,
  // Namsangol's gate: two posts, a beam and a small tiled roof over a gap
  // in the wall.
  hanokgate(g) {
    for (const sx of [-1, 1]) box(g, 0.45, 3.4, 0.45, sx * 2.6, 1.7, 0, '#6b4630');
    box(g, 5.8, 0.45, 0.6, 0, 3.3, 0, '#6b4630');
    const r = new THREE.Mesh(hipRoofGeometry(7.4, 3.2, 1.3), new THREE.MeshLambertMaterial({ color: '#4a5059', flatShading: true, side: THREE.DoubleSide }));
    r.position.y = 3.5;
    g.add(r);
  },
};
