// Bosingak (보신각) on Jongno: a two-storey bell pavilion. A tall granite
// base with steps up the side, an open upper floor (5 bays by 4) with red
// posts, a railing and painted beams, a hipped tile roof, and the great
// bronze bell hanging in the middle with the wooden striker (당목) beside it
// on two ropes. Visual only: the map's blocker keeps you off the base.
//
// strikeBell() (data/bosingak.js) swings the striker into the bell: the
// tick here animates it. main.js calls it when someone rings, and on every
// New Year's stroke.
import * as THREE from 'three';
import { curvedRoof } from './hanok.js';
import { mergeStatic } from './bukchon-models.js';
import { strikePose, sinceStrike } from '../data/bosingak.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function box(g, sx, sy, sz, x, y, z, c) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
const C = {
  stone: '#cfc6b2', stoneDark: '#aaa08a', post: '#9a3428', beam: '#2f7a62', beamRed: '#a23a2c', floor: '#7a5236',
  rail: '#8a3226', bronze: '#5d6b5a', bronzeDark: '#46524a', log: '#8a6a44', rope: '#d9c9a0',
  roof: new THREE.Color('#4a4f57'), roofEnd: new THREE.Color('#8a3a2c'),
};
const tileMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });

// The size of it, in metres (the base is BOSINGAK.base in the map: 16 × 12).
export const BELL_HOUSE = { w: 16, d: 12, baseH: 3.2, postH: 5.4, bellH: 3.2, bellR: 1.15 };

function bellPavilion(g) {
  const H = BELL_HOUSE, hw = H.w / 2, hd = H.d / 2, y0 = H.baseH;
  const fixed = new THREE.Group();
  // The granite base: a plinth, the dressed-stone body, a cap. Steps up the west side.
  box(fixed, H.w + 1.2, 0.4, H.d + 1.2, 0, 0.2, 0, C.stoneDark);
  box(fixed, H.w, y0 - 0.6, H.d, 0, 0.4 + (y0 - 0.6) / 2, 0, C.stone);
  for (let y = 1.0; y < y0 - 0.3; y += 0.6) box(fixed, H.w + 0.04, 0.05, H.d + 0.04, 0, y, 0, C.stoneDark); // courses of stone
  box(fixed, H.w + 0.6, 0.35, H.d + 0.6, 0, y0 - 0.17, 0, C.stoneDark);
  for (let i = 0; i < 8; i++) box(fixed, 2.4, 0.4, 1, -hw - 1.2, 0.2 + i * 0.4, hd - 1.5 - i * 1, C.stone); // steps up the side, front to back
  box(fixed, H.w - 0.4, 0.2, H.d - 0.4, 0, y0 + 0.1, 0, C.floor); // the wooden floor
  // Posts round the edge (6 along the front, 5 along the side) and a railing between.
  const xs = [-hw + 0.6, -hw / 2 - 0.2, -1.5, 1.5, hw / 2 + 0.2, hw - 0.6], zs = [-hd + 0.6, -hd / 2, 0, hd / 2, hd - 0.6];
  const posts = [];
  for (const x of xs) for (const z of [zs[0], zs[4]]) posts.push([x, z]);
  for (const z of zs.slice(1, 4)) for (const x of [xs[0], xs[5]]) posts.push([x, z]);
  for (const [x, z] of posts) box(fixed, 0.55, H.postH, 0.55, x, y0 + 0.2 + H.postH / 2, z, C.post);
  const railY = y0 + 1.1;
  for (const z of [zs[0], zs[4]]) {
    box(fixed, H.w - 1.2, 0.12, 0.14, 0, railY, z, C.rail);
    box(fixed, H.w - 1.2, 0.1, 0.1, 0, y0 + 0.5, z, C.rail);
    for (let x = -hw + 1; x < hw - 0.8; x += 0.5) box(fixed, 0.06, 0.6, 0.06, x, y0 + 0.8, z, C.rail);
  }
  // The side railings; the west one has a gap where the steps arrive (z -3.5..-1.5).
  const sideRail = (x, z0, z1) => {
    box(fixed, 0.14, 0.12, z1 - z0, x, railY, (z0 + z1) / 2, C.rail);
    for (let z = z0 + 0.4; z < z1; z += 0.5) box(fixed, 0.06, 0.6, 0.06, x, y0 + 0.8, z, C.rail);
  };
  sideRail(xs[5], zs[0], zs[4]);
  sideRail(xs[0], zs[0], -3.5);
  sideRail(xs[0], -1.5, zs[4]);
  // Painted beams on the posts, a deep band of dancheong under the eaves.
  const top = y0 + 0.2 + H.postH;
  for (const z of [zs[0], zs[4]]) {
    box(fixed, H.w - 0.6, 0.6, 0.62, 0, top - 0.3, z, C.beam);
    box(fixed, H.w - 0.6, 0.18, 0.66, 0, top - 0.75, z, C.beamRed);
  }
  for (const x of [xs[0], xs[5]]) box(fixed, 0.62, 0.6, H.d - 0.6, x, top - 0.3, 0, C.beam);
  box(fixed, 0.5, 0.5, H.d - 0.8, 0, top - 0.5, 0, C.beam); // the beam the bell hangs from
  box(fixed, H.w + 0.6, 0.5, H.d + 0.6, 0, top + 0.25, 0, C.beamRed); // brackets under the roof
  for (const geo of curvedRoof(H.w + 4.4, H.d + 4.4, 3.6, { hip: true, lift: 0.7, seg: 8, rows: 3, color: C.roof, end: C.roofEnd })) {
    const m = new THREE.Mesh(geo, tileMat);
    m.position.set(0, top + 0.5, 0);
    fixed.add(m);
  }
  g.add(fixed);
  mergeStatic(fixed);
  // The name board (普信閣) under the front eaves, facing Jongno.
  const board = nameBoard('普信閣');
  board.position.set(0, top - 1.4, hd - 0.2);
  g.add(board);

  // The bell, hung from the beam: a bronze body that flares a little at the
  // mouth, a band of relief round the shoulder and the mouth, the dragon loop on top.
  const bell = new THREE.Group();
  const prof = [[0, 0], [1.0, 0], [1.0, 0.25], [0.93, 0.6], [0.88, 1.4], [0.86, 2.3], [0.74, 2.8], [0.45, 3.05], [0, 3.1]].map(([r, y]) => new THREE.Vector2(r * H.bellR, (y / 3.1) * H.bellH));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), mat(C.bronze));
  bell.add(body);
  for (const [y, r] of [[0.2, 1.02], [H.bellH * 0.78, 0.9]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(H.bellR * r, H.bellR * r, 0.22, 18, 1, true), mat(C.bronzeDark));
    band.position.y = y;
    bell.add(band);
  }
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 6, 12), mat(C.bronzeDark));
  loop.position.y = H.bellH + 0.3;
  bell.add(loop);
  // The striking seat (당좌): a round boss low on the east side, where the log hits.
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), mat(C.bronzeDark));
  seat.rotation.z = Math.PI / 2;
  seat.position.set(H.bellR * 0.9, H.bellH * 0.3, 0);
  bell.add(seat);
  const hang = top - 0.8 - H.bellH - 0.5; // the bell's mouth height
  bell.position.set(0, hang, 0);
  g.add(bell);
  box(g, 0.08, 0.6, 0.08, 0, top - 1.05, 0, C.bronzeDark); // the hanger

  // The striker: a log along x on two ropes from the beams above, east of the bell.
  const pivotY = top - 0.8, logY = hang + H.bellH * 0.3, rope = pivotY - logY;
  const striker = new THREE.Group();
  striker.position.set(H.bellR * 0.95 + 1.45, pivotY, 0); // at rest the log's end just meets the striking seat
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 2.8, 10), mat(C.log));
  log.rotation.z = Math.PI / 2;
  log.position.set(0, -rope, 0);
  striker.add(log);
  for (const sz of [-0.5, 0.5]) for (const sx of [-0.9, 0.9]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, rope, 4), mat(C.rope));
    r.position.set(sx, -rope / 2, sz * 0.4);
    striker.add(r);
  }
  for (const sx of [-0.9, 0.9]) box(g, 0.3, 0.3, 1.2, striker.position.x + sx, pivotY + 0.1, 0, C.beam); // where the ropes tie on
  g.add(striker);

  return () => {
    const { pull, shake } = strikePose(sinceStrike());
    striker.rotation.z = pull * 0.55; // the log swings out east and back
    bell.rotation.z = shake ? Math.sin(performance.now() / 1000 * 31) * 0.012 * shake : 0;
  };
}

function nameBoard(text) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#1d1b22'; x.fillRect(0, 0, 384, 128);
  x.strokeStyle = '#2f7a62'; x.lineWidth = 10; x.strokeRect(5, 5, 374, 118);
  x.fillStyle = '#f2e6c4'; x.font = '700 80px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 192, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
}

export const BOSINGAK_BUILD = { bosingak: (g) => bellPavilion(g) };
