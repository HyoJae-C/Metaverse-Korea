// The skate park scenery (map landmark "skatepark"): a concrete pad,
// quarter pipes with steel coping, a funbox, two wooden kickers, grind
// rails, a chain-link fence with the gate on the north side, floodlights,
// benches and painted walls (original street art, no real crews or brands).
// The shapes come from the layout in skatepark.js, so what you see is what
// you ride on. Collision is the map's "blockers" (parkBlockers).
import * as THREE from 'three';
import { PARK, RAMPS, RAILS, QP_WALL } from './skatepark.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const CONCRETE = '#c4c1ba', CONCRETE_DARK = '#a9a59d', STEEL = '#d9dde2', WOOD = '#c99a62', YELLOW = '#f2c230';

function box(g, sx, sy, sz, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof c === 'string' ? mat(c) : c);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
// A side profile [x, y] (in park x and height) pushed across z0..z1.
function profile(g, pts, z0, z1, m) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) sh.lineTo(x, y);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, z0);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, m);
  g.add(mesh);
  return mesh;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Painted wall art: bold blobs, drips and letters in spray-can colours.
function graffiti(seed, words) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return canvasTex(1024, 256, (x, w, h) => {
    x.fillStyle = '#5b5f66'; x.fillRect(0, 0, w, h);
    const cols = ['#ff3ea5', '#b6ff3b', '#3dd6ff', '#ffd93d', '#ff7a2f', '#9b6bff', '#ffffff'];
    for (let i = 0; i < 14; i++) {
      x.fillStyle = cols[Math.floor(rnd() * cols.length)];
      x.globalAlpha = 0.85;
      x.beginPath();
      x.ellipse(rnd() * w, rnd() * h, 30 + rnd() * 90, 20 + rnd() * 50, rnd() * 3, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 22; i++) { // drips
      x.fillStyle = cols[Math.floor(rnd() * cols.length)];
      const dx = rnd() * w, dy = 60 + rnd() * 120;
      x.fillRect(dx, dy, 5, 30 + rnd() * 60);
    }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    words.forEach((wd, i) => {
      const cx = (w / words.length) * (i + 0.5), cy = h / 2 + (rnd() - 0.5) * 40;
      x.save();
      x.translate(cx, cy);
      x.rotate((rnd() - 0.5) * 0.25);
      x.font = `900 ${wd.length > 4 ? 96 : 120}px "Arial Black", "Noto Sans KR", system-ui, sans-serif`;
      x.lineWidth = 16; x.strokeStyle = '#1d1b22'; x.strokeText(wd, 0, 0, w / words.length - 20);
      x.fillStyle = cols[i % cols.length]; x.fillText(wd, 0, 0, w / words.length - 20);
      x.restore();
    });
  });
}

export function buildSkatepark(g) {
  const { hx, hz, gate } = PARK;
  // The pad: smooth concrete with saw-cut joints every 4 m.
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({
    map: canvasTex(1024, 704, (x, w, h) => {
      x.fillStyle = '#cfccc5'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(80,76,70,0.09)'; x.lineWidth = 1.5;
      for (let i = 1; i < 16; i++) { x.beginPath(); x.moveTo((i * w) / 16, 0); x.lineTo((i * w) / 16, h); x.stroke(); }
      for (let i = 1; i < 11; i++) { x.beginPath(); x.moveTo(0, (i * h) / 11); x.lineTo(w, (i * h) / 11); x.stroke(); }
      x.fillStyle = 'rgba(60,60,70,0.08)';
      for (let i = 0; i < 1500; i++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }),
  }));
  pad.position.y = 0.03;
  g.add(pad);

  for (const r of RAMPS) {
    if (r.kind === 'quarter') {
      // Curve up to the coping, then the deck (as thick as the wall behind it).
      const pts = [];
      for (let k = 0; k <= 16; k++) { const s = k / 16; pts.push([r.u0 + r.dir * s * r.len, r.h * s * s + 0.03]); }
      const top = r.u0 + r.dir * r.len, back = top + r.dir * QP_WALL;
      pts.push([back, r.h + 0.03], [back, 0], [r.u0, 0]);
      profile(g, pts, r.z0, r.z1, mat(CONCRETE));
      const cop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, r.z1 - r.z0, 10).rotateX(Math.PI / 2), mat(STEEL));
      cop.position.set(top, r.h + 0.05, (r.z0 + r.z1) / 2);
      g.add(cop);
      // A painted wall above the deck, facing the park.
      const wall = new THREE.Group();
      box(wall, 0.25, 1.6, r.z1 - r.z0, 0, 0.8, 0, CONCRETE_DARK);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(r.z1 - r.z0, 1.5), new THREE.MeshLambertMaterial({ map: graffiti(r.dir > 0 ? 11 : 29, r.dir > 0 ? ['SKATE', '송파', 'FLY'] : ['JAMSIL', 'RIDE', '묘기']) }));
      art.rotation.y = -r.dir * Math.PI / 2;
      art.position.set(-r.dir * 0.13, 0.8, 0);
      wall.add(art);
      wall.position.set(back - r.dir * 0.12, r.h + 0.03, (r.z0 + r.z1) / 2);
      g.add(wall);
      // Yellow safety paint along the sides.
      for (const z of [r.z0, r.z1]) box(g, r.len, 0.04, 0.08, r.u0 + r.dir * r.len / 2, 0.06, z, YELLOW);
    } else if (r.kind === 'funbox') {
      const a = r.top / 2 + r.len, b = r.top / 2;
      profile(g, [[-a, 0], [-b, r.h], [b, r.h], [a, 0]], r.z0, r.z1, mat(CONCRETE));
      for (const sx of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, r.z1 - r.z0, 8).rotateX(Math.PI / 2), mat(STEEL));
        edge.position.set(sx * b, r.h + 0.02, (r.z0 + r.z1) / 2);
        g.add(edge);
      }
      box(g, r.top - 0.4, 0.02, r.z1 - r.z0 - 0.6, 0, r.h + 0.012, (r.z0 + r.z1) / 2, '#d8d4cc');
    } else if (r.kind === 'kicker') {
      const pts = [];
      for (let k = 0; k <= 8; k++) { const s = k / 8; pts.push([r.u0 + r.dir * s * r.len, r.h * Math.pow(s, 1.25) + 0.03]); }
      pts.push([r.u0 + r.dir * r.len, 0]);
      profile(g, pts, r.z0, r.z1, mat(WOOD));
      // A steel lip.
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, r.z1 - r.z0, 8).rotateX(Math.PI / 2), mat(STEEL));
      lip.position.set(r.u0 + r.dir * r.len, r.h + 0.03, (r.z0 + r.z1) / 2);
      g.add(lip);
    }
  }

  for (const rail of RAILS) {
    const [ax, az] = rail.a, [bx, bz] = rail.b;
    const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 10).rotateX(Math.PI / 2), mat(YELLOW));
    bar.position.set((ax + bx) / 2, rail.h, (az + bz) / 2);
    bar.rotation.y = ang;
    g.add(bar);
    const n = Math.max(2, Math.round(len / 3) + 1);
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      box(g, 0.08, rail.h, 0.08, ax + (bx - ax) * t, rail.h / 2, az + (bz - az) * t, '#3a3d44');
      box(g, 0.3, 0.03, 0.3, ax + (bx - ax) * t, 0.045, az + (bz - az) * t, '#3a3d44');
    }
  }

  // Chain-link fence round the pad, open at the gate.
  const mesh = new THREE.MeshLambertMaterial({
    map: canvasTex(64, 64, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = '#9aa3ad'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
    }), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide,
  });
  mesh.map.wrapS = mesh.map.wrapT = THREE.RepeatWrapping;
  const FH = 1.8;
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const tex = mesh.map.clone();
    tex.repeat.set(len / 0.5, FH / 0.5);
    tex.needsUpdate = true;
    const m = mesh.clone();
    m.map = tex;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, FH), m);
    panel.position.set((x0 + x1) / 2, FH / 2 + 0.05, (z0 + z1) / 2);
    panel.rotation.y = Math.atan2(z1 - z0, x1 - x0) * -1;
    panel.userData.noShadow = true;
    g.add(panel);
    const n = Math.max(1, Math.round(len / 4));
    for (let k = 0; k <= n; k++) box(g, 0.08, FH + 0.1, 0.08, x0 + ((x1 - x0) * k) / n, (FH + 0.1) / 2, z0 + ((z1 - z0) * k) / n, '#7b838c');
    box(g, len, 0.06, 0.06, (x0 + x1) / 2, FH + 0.08, (z0 + z1) / 2, '#7b838c').rotation.y = panel.rotation.y;
  };
  fence(-hx, -hz, gate[0], -hz);
  fence(gate[1], -hz, hx, -hz);
  fence(-hx, hz, hx, hz);
  fence(-hx, -hz, -hx, hz);
  fence(hx, -hz, hx, hz);

  // The gate: two posts and a bright board over the way in.
  const gx = (gate[0] + gate[1]) / 2, gw = gate[1] - gate[0];
  for (const x of [gate[0], gate[1]]) box(g, 0.35, 4.4, 0.35, x, 2.2, -hz, '#2b2d33');
  const board = canvasTex(1024, 256, (x, w, h) => {
    const grd = x.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#ff3ea5'); grd.addColorStop(0.5, '#7a3cff'); grd.addColorStop(1, '#3dd6ff');
    x.fillStyle = grd; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1d1b22'; x.fillRect(10, 10, w - 20, h - 20);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#b6ff3b'; x.font = '900 100px "Arial Black", system-ui, sans-serif';
    x.fillText('OLYMPIC PARK SKATE PARK', w / 2, 100, w - 60);
    x.fillStyle = '#ffffff'; x.font = '800 60px "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif';
    x.fillText('🛹 올림픽공원 스케이트파크 🚲', w / 2, 192, w - 80);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.6, (gw + 0.6) / 4, 0.2), [mat('#1d1b22'), mat('#1d1b22'), mat('#1d1b22'), mat('#1d1b22'), new THREE.MeshBasicMaterial({ map: board }), new THREE.MeshBasicMaterial({ map: board })]);
  sign.position.set(gx, 4.4 + (gw + 0.6) / 8, -hz);
  sign.rotation.y = Math.PI; // reads from the road (north)
  g.add(sign);

  // Floodlights in the four corners, turned in towards the middle.
  for (const [x, z] of [[-hx + 1, -hz + 1], [hx - 1, -hz + 1], [-hx + 1, hz - 1], [hx - 1, hz - 1]]) {
    box(g, 0.22, 7, 0.22, x, 3.5, z, '#5d636b');
    const head = box(g, 1.4, 0.5, 0.3, x, 7, z, '#3a3d44');
    head.rotation.y = Math.atan2(-x, -z);
    const lamp = box(g, 1.2, 0.36, 0.05, x - Math.sign(x) * 0.17, 7, z - Math.sign(z) * 0.17, new THREE.MeshBasicMaterial({ color: '#fff7d6' }));
    lamp.rotation.y = head.rotation.y;
  }

  // Benches inside along the north fence, west of the gate (out of the lines).
  for (const x of [-14, -8, -2, 4]) {
    box(g, 2.2, 0.08, 0.55, x, 0.45, -hz + 1.2, WOOD);
    for (const sx of [-0.9, 0.9]) box(g, 0.08, 0.45, 0.5, x + sx, 0.225, -hz + 1.2, '#3a3d44');
  }
  // A few cones by the south kickers.
  for (const [x, z] of [[-3, 16], [0, 16.5], [3, 16]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 10), mat('#ff7a2f'));
    cone.position.set(x, 0.28, z);
    g.add(cone);
  }
}
