// What Gimpo Airport looks like (loaded by game/gimpo-walk.js when you come
// near): the two terminals on their OSM outlines at 1/4 (glass walls, a pale
// roof, the name on the kerb side), the roof deck with glass railings and a
// departures board, the runways (half the real width, Yozi 2026-11-21) with
// their markings, yellow taxi lines, jet bridges, apron light masts, and
// MODU AIR planes at half size: parked nose-in at the stands and one taking
// off or landing every 20 minutes (core/gimpo-flights.js). Merged per
// colour and instanced: a dozen or so draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from '../core/three-kit.js';
import { gimpoFlights } from '../core/gimpo-flights.js';
import { deckParts } from './gimpo-walk.js';

// MODU AIR's colours (Yozi 2026-11-21: the made-up airline): white body, one colour each.
export const LIVERIES = ['#2f8fe0', '#ff6f5e', '#2bb39a', '#f2b632', '#8a63d2'];
const C = { glass: '#6f97b8', glassIntl: '#9fd0ee', mullion: '#eef2f5', door: '#46657f', roof: '#c9ced4', frame: '#d4dae0', runway: '#4a4d52', mark: '#f4f4f0', taxi: '#f0c419', bridge: '#9fb3a8', deck: '#a89683', apron: '#b9bcc0', mast: '#8c949c', lamp: '#fff3c4', bench: '#7a5a3c' };

const shapeOf = (p) => new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
function slab(p, y0, y1) {
  const g = y1 > y0 ? new THREE.ExtrudeGeometry(shapeOf(p), { depth: y1 - y0, bevelEnabled: false }) : new THREE.ShapeGeometry(shapeOf(p));
  g.rotateX(-Math.PI / 2).translate(0, y0, 0);
  return g.index ? g.toNonIndexed() : g;
}

// The plane, nose to +z, wheels on y 0: { white, color, dark } geometries.
export function planeGeometry(P) {
  const L = P.len, R = 1.0, axisY = 1.9; // fuselage radius 1 m (half of the real 4 m), its axis 1.9 m up
  const white = [], color = [], dark = [];
  const put = (list, g, x, y, z, rx = 0, ry = 0, rz = 0) => { g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); list.push(g.index ? g.toNonIndexed() : g); };
  const body = L * 0.72;
  put(white, new THREE.CylinderGeometry(R, R, body, 14, 1, true), 0, axisY, -L * 0.03, Math.PI / 2);
  put(white, new THREE.SphereGeometry(R, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.6, 1), 0, axisY, body / 2 - L * 0.03, Math.PI / 2); // the nose
  put(white, new THREE.ConeGeometry(R, L * 0.25, 14, 1, true), 0, axisY + 0.35, -body / 2 - L * 0.03 - L * 0.12, -Math.PI / 2); // the tail cone
  // Wings: a thin swept slab each side.
  const wing = (s) => {
    const sh = new THREE.Shape([new THREE.Vector2(0, 2.2), new THREE.Vector2(0, -1.4), new THREE.Vector2(s * P.span / 2, -3.6), new THREE.Vector2(s * P.span / 2, -2.6)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, axisY - 0.55, 0.6);
    return g.toNonIndexed();
  };
  white.push(wing(1), wing(-1));
  // Tail: the fin (the airline's colour) and the stabilisers.
  const fin = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(3.2, 0), new THREE.Vector2(1.2, P.h - axisY - 0.6), new THREE.Vector2(0.2, P.h - axisY - 0.6)]);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.2, bevelEnabled: false });
  fg.rotateY(Math.PI / 2); fg.translate(0.1, axisY + 0.6, -L * 0.5 + 0.4);
  color.push(fg.toNonIndexed());
  const stab = (s) => {
    const sh = new THREE.Shape([new THREE.Vector2(0, 0.8), new THREE.Vector2(0, -1.0), new THREE.Vector2(s * 3.4, -1.9), new THREE.Vector2(s * 3.4, -1.1)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, axisY + 0.5, -L * 0.5 + 1.6);
    return g.toNonIndexed();
  };
  white.push(stab(1), stab(-1));
  // A stripe of colour along the belly and the engines' fronts.
  put(color, new THREE.CylinderGeometry(R * 1.005, R * 1.005, body * 0.92, 14, 1, true, Math.PI * 0.62, Math.PI * 0.76), 0, axisY, -L * 0.03, Math.PI / 2);
  for (const s of [1, -1]) {
    put(white, new THREE.CylinderGeometry(0.55, 0.5, 2.4, 12), s * 3.1, axisY - 1.05, 2.0, Math.PI / 2);
    put(color, new THREE.CylinderGeometry(0.56, 0.56, 0.3, 12), s * 3.1, axisY - 1.05, 3.1, Math.PI / 2);
    put(dark, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), s * 3.1, axisY - 1.05, 3.27, Math.PI / 2);
  }
  // Windows: a dark band each side; the cockpit; the wheels.
  for (const s of [1, -1]) put(dark, new THREE.BoxGeometry(0.04, 0.22, body * 0.8), s * (R - 0.01), axisY + 0.3, -L * 0.03);
  put(dark, new THREE.BoxGeometry(1.2, 0.3, 0.6), 0, axisY + 0.45, body / 2 + 0.55, -0.5);
  for (const [x, z] of [[0, L * 0.33], [1.4, 0.2], [-1.4, 0.2]]) {
    put(dark, new THREE.CylinderGeometry(0.06, 0.06, axisY - R, 6), x, (axisY - R) / 2 + 0.25, z);
    put(dark, new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10), x, 0.3, z, 0, 0, Math.PI / 2);
  }
  return { white: mergeGeometries(white), color: mergeGeometries(color), dark: mergeGeometries(dark), axisY };
}

// "MODU AIR" on both sides of the fuselage (one textured mesh per plane).
function titleGeometry(P, axisY) {
  const a = new THREE.PlaneGeometry(6, 0.8); a.rotateY(Math.PI / 2); a.translate(1.02, axisY + 0.62, 1.2);
  const b = new THREE.PlaneGeometry(6, 0.8); b.rotateY(-Math.PI / 2); b.translate(-1.02, axisY + 0.62, 1.2);
  return mergeGeometries([a, b]);
}

export function buildGimpoSite({ scene, l, lowSpec = false }) {
  const group = new THREE.Group();
  group.name = 'gimpo';
  group.position.set(l.x, 0, l.z);
  const [ux, uz] = l.u, [vx, vz] = l.v;
  const W = (u, v) => [u * ux + v * vx, u * uz + v * vz]; // airport frame -> the group's (local) frame
  const quad = ([u0, v0, u1, v1]) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => W(u, v));
  const parts = new Map();
  const add = (color, g) => { if (!parts.has(color)) parts.set(color, []); parts.get(color).push(g); };
  const yawU = Math.atan2(ux, uz), yawV = Math.atan2(vx, vz); // facing +u, facing +v
  const boxAt = (color, u, v, y, w, h, d, yaw = yawU) => { // w across, d along the facing
    const g = new THREE.BoxGeometry(w, h, d); g.rotateY(yaw); const [x, z] = W(u, v); g.translate(x, y, z); add(color, g.toNonIndexed());
  };

  // --- The terminals: glass walls under a pale roof with a white rim ----------
  // The international terminal's glass is lighter, so it reads as a glass
  // hall from the road (Yozi 2026-11-21); both get window frames: white
  // mullions every 3 m and a transom at each floor.
  const intlStands = l.intlStands || [];
  for (const [p, glassColor] of [[l.domestic, C.glass], [l.intl, C.glassIntl]]) {
    add(glassColor, slab(p, 0, l.h - 0.6));
    add(C.frame, slab(p, l.h - 0.6, l.h - 0.15));
    add(C.roof, slab(p, l.h - 0.15, l.h));
    for (let i = 0; i < p.length; i++) {
      const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length], len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 1) continue;
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / 3));
      for (let k = 0; k < n; k++) { // mullions (the corner one too)
        const f = k / n, g = new THREE.BoxGeometry(0.22, l.h - 0.6, 0.22);
        g.translate(x0 + (x1 - x0) * f, (l.h - 0.6) / 2, z0 + (z1 - z0) * f); add(C.mullion, g.toNonIndexed());
      }
      for (const y of [2.1, 4.2]) { // a transom at each floor
        const g = new THREE.BoxGeometry(0.18, 0.18, len); g.rotateY(yaw); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); add(C.mullion, g.toNonIndexed());
      }
    }
  }
  if (l.intlDoor) { // the international terminal's front door: glass doors under a canopy on posts
    const { u, v0, v1 } = l.intlDoor;
    for (let v = v0 + 2; v < v1 - 1; v += 4) boxAt(C.door, u - 0.1, v, 1.3, 0.3, 2.6, 2.8, yawV);
    boxAt(C.frame, u - 3.2, (v0 + v1) / 2, 3.45, 6.4, 0.3, v1 - v0, yawV); // the canopy (w across u, d along v)
    for (let v = v0 + 1; v <= v1 - 1; v += (v1 - v0 - 2) / 4) boxAt(C.mast, u - 6, v, 1.65, 0.25, 3.3, 0.25);
  }

  // --- The roof deck: floors, the stair, glass railings, benches -------------------
  const d = deckParts(l);
  for (const r of d.flat) add(C.deck, slab(quad(r), l.h, l.h + 0.06));
  { // the stair: steps up from the forecourt along u
    const [u0, v0, , v1] = d.stair, n = 26;
    for (let i = 0; i < n; i++) {
      const a = u0 + (i / n) * d.run, b = u0 + ((i + 1) / n) * d.run, y = ((i + 1) / n) * d.y;
      add(C.deck, slab(quad([a, v0, b, v1]), 0, y));
    }
  }
  const glass = [];
  const rail = (u0, v0, u1, v1, y0, y1) => { // a glass pane along a line, 1.1 m high
    const len = Math.hypot(u1 - u0, v1 - v0), g = new THREE.PlaneGeometry(len, 1.1);
    const [x0, z0] = W(u0, v0), [x1, z1] = W(u1, v1);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2 + 0.55, (z0 + z1) / 2);
    if (y1 !== y0) { const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const along = ((pos.getX(i) - x0) * (x1 - x0) + (pos.getZ(i) - z0) * (z1 - z0)) / (len * len); pos.setY(i, pos.getY(i) - (y0 + y1) / 2 + y0 + (y1 - y0) * Math.min(1, Math.max(0, along))); } }
    glass.push(g);
  };
  const [bu0, bv0, bu1] = l.deck.balcony;
  rail(bu0, bv0, bu1, bv0, l.h, l.h); // the airside edge
  rail(bu0, bv0, bu0, -6, l.h, l.h); rail(bu1, bv0, bu1, -6, l.h, l.h);
  const [su0, sv0, , sv1] = d.stair, top = su0 + d.run, [wu0, , wu1] = l.deck.walk;
  rail(su0 + 1.5, sv1, top, sv1, (1.5 / d.run) * d.y, d.y); rail(top, sv1, wu1, sv1, d.y, d.y);
  rail(su0 + 1.5, sv0, top, sv0, (1.5 / d.run) * d.y, d.y); rail(top, sv0, wu0, sv0, d.y, d.y);
  rail(wu1, sv0, wu1, sv1, d.y, d.y);
  const glassMesh = new THREE.Mesh(mergeGeometries(glass), new THREE.MeshLambertMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  group.add(glassMesh);
  for (let i = 0; i < 4; i++) boxAt(C.bench, bu0 + 4 + i * 8, -4.2, l.h + 0.25, 0.5, 0.45, 2.2); // benches facing the runways

  // --- Runways and taxi lines --------------------------------------------------------
  for (const p of l.aprons || []) add(C.apron, slab(p, 0.03, 0.03)); // concrete, over the street's paving colour
  const flat = (color, u0, v0, u1, v1, y) => add(color, slab(quad([u0, v0, u1, v1]), y, y));
  for (const r of Object.values(l.runways)) {
    const hw = r.w / 2;
    flat(C.runway, r.u0, r.v - hw, r.u1, r.v + hw, 0.035);
    for (let u = r.u0 + 40; u < r.u1 - 40; u += 18) flat(C.mark, u, r.v - 0.2, u + 9, r.v + 0.2, 0.045); // the centre line
    flat(C.mark, r.u0, r.v - hw + 0.4, r.u1, r.v - hw + 0.8, 0.045); flat(C.mark, r.u0, r.v + hw - 0.8, r.u1, r.v + hw - 0.4, 0.045); // the edges
    for (const [a, s] of [[r.u0 + 3, 1], [r.u1 - 3, -1]]) for (let k = -3; k <= 3; k++) { // the piano keys at both ends
      const v = r.v + k * (hw / 4.2);
      flat(C.mark, Math.min(a, a + s * 14), v - 0.6, Math.max(a, a + s * 14), v + 0.6, 0.045);
    }
  }
  const fly = l.fly;
  const taxiLine = (pts) => { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; flat(C.taxi, Math.min(a[0], b[0]) - 0.15, Math.min(a[1], b[1]) - 0.15, Math.max(a[0], b[0]) + 0.15, Math.max(a[1], b[1]) + 0.15, 0.04); } };
  taxiLine([[fly.exitU, fly.taxiV], [fly.holdU - 30, fly.taxiV]]);
  taxiLine([[fly.holdU - 30, fly.taxiV], [fly.holdU - 30, l.runways[fly.depart.runway].v]]);
  taxiLine([[fly.exitU, fly.taxiV], [fly.exitU, l.runways[fly.land.runway].v]]);
  for (const s of l.stands) taxiLine([[s.u, fly.taxiV], [s.u, s.v + l.plane.len / 2]]);
  for (const s of intlStands) taxiLine([[s.u - l.plane.len / 2, s.v], [s.u + l.plane.len / 2 + 30, s.v]]);

  // --- Jet bridges and light masts --------------------------------------------------
  for (const s of l.stands) {
    if (!s.bridge) continue; // (a remote stand past the terminal's end: no bridge)
    const noseV = s.v + l.plane.len / 2;
    boxAt(C.bridge, s.u - 2.6, (noseV - 6) / 2 - 0.2, 2.6, 2.2, 2.0, Math.abs(-6 - noseV) + 0.6, yawV);
    boxAt(C.mast, s.u - 2.6, noseV + 0.6, 0.8, 0.3, 1.6, 0.3);
  }
  for (const s of intlStands) { // from the wall (s.wall) out to the plane's nose, along u
    const noseU = s.u - l.plane.len / 2;
    boxAt(C.bridge, (s.wall + noseU) / 2 + 0.2, s.v - 2.6, 2.6, 2.2, 2.0, noseU - s.wall + 0.6, yawU);
    boxAt(C.mast, noseU - 0.6, s.v - 2.6, 0.8, 0.3, 1.6, 0.3);
  }
  const lamps = [];
  for (let u = -110; u <= 110; u += 55) {
    boxAt(C.mast, u, fly.taxiV + 6, 6, 0.35, 12, 0.35);
    const [x, z] = W(u, fly.taxiV + 6); lamps.push([x, z]);
  }
  for (const [x, z] of lamps) { const g = new THREE.BoxGeometry(1.6, 0.5, 1.0); g.translate(x, 12.1, z); add(C.lamp, g.toNonIndexed()); }

  for (const [color, geos] of parts) {
    const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, ...(color === C.lamp ? { emissive: '#fff0b0', emissiveIntensity: 0.8 } : {}) }));
    m.receiveShadow = !lowSpec;
    m.matrixAutoUpdate = false;
    group.add(m);
  }

  // --- The names on the kerb side -----------------------------------------------------
  // The airport's name on the domestic terminal (where the deck is), and the
  // international terminal's over its door.
  const nameSign = (top, bottom, w, at, yaw) => {
    const tex = canvasTex(1024, 192, (g) => {
      g.fillStyle = '#1f3c5a'; g.fillRect(0, 0, 1024, 192);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 92px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif'; g.fillText(top, 512, 70);
      g.font = '700 44px system-ui, sans-serif'; g.fillText(bottom, 512, 152);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, (w * 3) / 16), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(at[0], l.h - 1.7, at[1]); m.rotation.y = yaw;
    group.add(m);
  };
  nameSign('김포국제공항', 'GIMPO INTERNATIONAL AIRPORT', 16, W(-5, 13.4), yawV);
  if (l.intlDoor) nameSign('국제선', 'INTERNATIONAL', 12, W(l.intlDoor.u - 0.3, (l.intlDoor.v0 + l.intlDoor.v1) / 2), yawU + Math.PI);

  // --- The departures board on the deck -----------------------------------------------
  const board = document.createElement('canvas'); board.width = 512; board.height = 256;
  const boardTex = new THREE.CanvasTexture(board); boardTex.colorSpace = THREE.SRGBColorSpace;
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: boardTex }));
  { const [x, z] = W(l.deck.walk[0] + 4, l.deck.balcony[1] + 0.4); boardMesh.position.set(x, l.h + 2.6, z); boardMesh.rotation.y = yawV; } // on the airside edge, facing the people on the deck
  group.add(boardMesh);
  { const g = new THREE.BoxGeometry(3.4, 1.8, 0.12); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: '#2a2f36' })); m.position.copy(boardMesh.position); m.rotation.y = boardMesh.rotation.y; m.translateZ(-0.08); group.add(m);
    for (const sx of [-1.4, 1.4]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), m.material); post.position.copy(m.position); post.rotation.y = m.rotation.y; post.translateX(sx); post.translateZ(-0.1); post.position.y = l.h + 1.3; group.add(post); } }
  let boardText = '';
  const drawBoard = (next, now) => {
    let line = '— : —';
    let kind = '';
    if (next) {
      const s = Math.max(0, Math.round((next.start - now) / 1000));
      line = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      kind = next.kind;
    }
    const key = kind + line;
    if (key === boardText) return;
    boardText = key;
    const g = board.getContext('2d');
    g.fillStyle = '#10151c'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#f2b632'; g.font = '800 40px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('MODU AIR', 256, 52);
    g.fillStyle = '#ffffff'; g.font = '700 34px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    g.fillText(kind === 'landing' ? '다음 착륙 · Next landing' : kind ? '다음 이륙 · Next takeoff' : '야간 운항 없음 · No night flights', 256, 120);
    g.fillStyle = '#7fe08a'; g.font = '800 84px ui-monospace, Menlo, monospace';
    g.fillText(line, 256, 218);
    boardTex.needsUpdate = true;
  };

  // --- The planes ------------------------------------------------------------------
  const geo = planeGeometry(l.plane);
  const n = l.stands.length + intlStands.length + 1; // the parked ones (domestic, then international) and the one flying
  const mats = {
    white: new THREE.MeshLambertMaterial({ color: '#f7f8fa' }),
    color: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    dark: new THREE.MeshLambertMaterial({ color: '#273038' }),
  };
  const title = canvasTex(512, 64, (g) => { g.clearRect(0, 0, 512, 64); g.fillStyle = '#1f3c5a'; g.font = 'italic 800 52px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MODU AIR', 256, 34); });
  const meshes = [
    new THREE.InstancedMesh(geo.white, mats.white, n),
    new THREE.InstancedMesh(geo.color, mats.color, n),
    new THREE.InstancedMesh(geo.dark, mats.dark, n),
    new THREE.InstancedMesh(titleGeometry(l.plane, geo.axisY), new THREE.MeshBasicMaterial({ map: title, transparent: true, side: THREE.DoubleSide }), n),
  ];
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) meshes[1].setColorAt(i, col.set(LIVERIES[i % LIVERIES.length]));
  for (const m of meshes) { m.castShadow = !lowSpec; m.frustumCulled = false; group.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), S = new THREE.Vector3(1, 1, 1), Pv = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const place = (i, x, y, z, yaw, pitch) => {
    E.set(-pitch, yaw, 0); Q.setFromEuler(E); Pv.set(x - l.x, y, z - l.z);
    M.compose(Pv, Q, S);
    for (const m of meshes) m.setMatrixAt(i, M);
  };
  const hide = (i) => { for (const m of meshes) m.setMatrixAt(i, ZERO); };
  intlStands.forEach((s, j) => { const [x, z] = W(s.u, s.v); place(l.stands.length + j, x + l.x, 0, z + l.z, s.ry, 0); }); // (always parked)
  const flights = gimpoFlights(l);
  let lastEmpty = null, t = 0;
  const update = (p, dt) => {
    t += dt;
    const now = Date.now();
    const empty = flights.empty(now);
    if (empty !== lastEmpty) {
      lastEmpty = empty;
      l.stands.forEach((s, i) => { if (i === empty) hide(i); else { const [x, z] = W(s.u, s.v); place(i, x + l.x, 0, z + l.z, s.ry, 0); } });
    }
    const f = flights.at(now);
    if (f) { place(n - 1, f.x, f.y, f.z, f.yaw, f.pitch); meshes[1].setColorAt(n - 1, col.set(LIVERIES[f.stand % LIVERIES.length])); meshes[1].instanceColor.needsUpdate = true; }
    else hide(n - 1);
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    if (t > 0.5) { t = 0; if (Math.hypot(p.x - l.x, p.z - l.z) < 200) drawBoard(flights.next(now), now); }
  };
  drawBoard(flights.next(Date.now()), Date.now());
  update({ x: l.x, z: l.z }, 0);
  scene.add(group);
  group.updateMatrixWorld(true); // (main.js FarCull measures its parts' boxes in the world at once: before the first frame they would sit at the origin, far away, and stay hidden)
  return { group, update, flights };
}
