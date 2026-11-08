// The Cotton Candy Express's 3D model (the track and timing are coaster.js):
// white icing rails on a pink spine, chocolate supports, a striped station
// with its sign, a chocolate tunnel, candy-cane arches the train dives
// through, and two hot-pink trains of four cars. The rails are one tube
// each, sleepers and supports are instanced, so the whole ride is a handful
// of draw calls. buildCoaster() also adds the colliders: the supports, and
// the stretches low enough that you could walk into a passing train.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { CARS, CAR_GAP, GATE, PLATFORM, S_TUNNEL, TRAINS, frameAt, trackPoints, trainAt, LENGTH } from './coaster.js';

const mat = matCache({ flatShading: true });
export const TRAIN_PINK = '#ff5f9e';
const ICING = '#fffaf3';
const CHOC = '#7a4a2e';

export const COASTER_NAME = { ko: '솜사탕 특급', en: 'Cotton Candy Express', ja: 'わたあめ特急', zh: '棉花糖特快', es: 'Expreso Algodón de Azúcar', id: 'Ekspres Gulali', vi: 'Tàu Lượn Kẹo Bông', hi: 'कॉटन कैंडी एक्सप्रेस', fr: 'Express Barbe à Papa', th: 'สายไหมเอ็กซ์เพรส', ar: 'قطار غزل البنات السريع' };
// The boarding spot's own sign ("this is where you get on").
export const BOARD_SIGN = { ko: '타는 곳', en: 'BOARDING', ja: 'のりば', zh: '乘车处', es: 'EMBARQUE', id: 'NAIK DI SINI', vi: 'LÊN TÀU', hi: 'यहाँ से बैठें', fr: 'EMBARQUEMENT', th: 'ทางขึ้น', ar: 'الصعود' };
const WALK_UNDER = 1.9; // rail height you can walk under

// The station's sign: Korean as built, or the player's language (translate).
function signBoard() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = TRAIN_PINK; g.fillRect(0, 0, 512, 160);
    g.fillStyle = ICING;
    for (let i = 0; i < 512; i += 40) { g.beginPath(); g.arc(i + 20, 0, 18, 0, Math.PI); g.fill(); } // frosting drips
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = lang ? COASTER_NAME[lang] || COASTER_NAME.en : COASTER_NAME.ko;
    g.font = `900 ${big.length > 14 ? 44 : 64}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    g.lineWidth = 10; g.strokeStyle = '#b8336e'; g.strokeText(big, 256, 88, 490);
    g.fillText(big, 256, 88, 490);
    g.font = '800 26px system-ui, sans-serif';
    g.fillStyle = '#ffe27a'; g.fillText(lang ? '🍭' : 'COTTON CANDY EXPRESS', 256, 140, 490);
    tex.needsUpdate = true;
  };
  draw(null);
  return { tex, draw };
}

// The boarding sign and the floor mark at the gate: Korean as built (with
// the English under it), or the player's language when translated.
function boardingTex(w, h, floor) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = floor ? '#ff5f9e' : '#fffaf3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = floor ? '#fffaf3' : TRAIN_PINK; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = lang ? BOARD_SIGN[lang] || BOARD_SIGN.en : BOARD_SIGN.ko;
    g.fillStyle = floor ? '#fffaf3' : '#b8336e';
    g.font = `900 ${floor ? 64 : 76}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    g.fillText('🎢 ' + big, w / 2, h * (floor ? 0.36 : 0.4), w - 40);
    g.font = `800 ${floor ? 34 : 38}px system-ui, sans-serif`;
    g.fillStyle = floor ? '#ffe27a' : TRAIN_PINK;
    g.fillText(lang ? '⬆ ⬆ ⬆' : 'BOARDING ⬆', w / 2, h * 0.76, w - 40);
    tex.needsUpdate = true;
  };
  draw(null);
  return { tex, draw };
}

// One car, nose towards +z, rails at y = 0 (the seats are SEAT_H above).
function makeCar(front) {
  const g = new THREE.Group();
  const box = (sx, sy, sz, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  box(1.15, 0.36, 1.5, 0, 0.12, 0, TRAIN_PINK); // tub
  box(1.2, 0.08, 1.56, 0, 0.32, 0, ICING); // icing rim
  box(1.0, 0.42, 0.14, 0, 0.5, -0.62, TRAIN_PINK); // seat back
  box(1.04, 0.06, 0.18, 0, 0.73, -0.62, ICING);
  box(0.9, 0.06, 0.06, 0, 0.62, 0.32, '#c9c9d4'); // lap bar
  if (front) {
    const nose = box(1.1, 0.5, 0.5, 0, 0.2, 0.9, TRAIN_PINK);
    nose.rotation.x = -0.35;
    for (const sx of [-0.28, 0.28]) box(0.16, 0.16, 0.04, sx, 0.32, 1.12, '#2b2230'); // eyes
    const cream = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(ICING));
    cream.position.set(0, 0.5, 0.82);
    g.add(cream);
  }
  box(0.9, 0.12, 1.2, 0, -0.12, 0, '#9ca9af'); // wheels and chassis
  return g;
}

const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3();
const basis = (f) => { _x.set(-f.rx, -f.ry, -f.rz); _y.set(f.ux, f.uy, f.uz); _z.set(f.fx, f.fy, f.fz); return _m.makeBasis(_x, _y, _z); };
// Place o on the track at s (its +z along the way, +y up the banked track).
export function placeOnTrack(o, s, f = {}) {
  frameAt(s, f);
  basis(f);
  o.quaternion.setFromRotationMatrix(_m);
  o.position.set(f.x, f.y, f.z);
}

// Adds the ride to the scene; block(x, z, sx, sz) adds a collider.
// opts.lowSpec: fewer supports and flags.
export function buildCoaster(scene, block, { lowSpec = false } = {}) {
  const pts = trackPoints();
  const f = {};
  // Rails and spine: offset copies of the centre line, as closed tubes.
  const rail = (side, down) => {
    const v = [];
    for (let i = 0; i < pts.length; i += 3) {
      frameAt(pts[i].s, f);
      v.push(new THREE.Vector3(f.x + f.rx * side - f.ux * down, f.y + f.ry * side - f.uy * down, f.z + f.rz * side - f.uz * down));
    }
    return new THREE.CatmullRomCurve3(v, true);
  };
  const tubes = Math.round(pts.length / 2);
  for (const side of [-0.34, 0.34]) scene.add(new THREE.Mesh(new THREE.TubeGeometry(rail(side, 0), tubes, 0.07, 6, true), mat(ICING)));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(rail(0, 0.26), tubes, 0.15, 7, true), mat('#ff8fb8')));

  // Sleepers every 1.1 m.
  const sleepN = Math.floor(LENGTH / 1.1);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.86, 0.07, 0.16), mat('#ff8fb8'), sleepN);
  for (let i = 0; i < sleepN; i++) {
    frameAt(i * 1.1, f);
    basis(f);
    _m.setPosition(f.x - f.ux * 0.12, f.y - f.uy * 0.12, f.z - f.uz * 0.12);
    sleepers.setMatrixAt(i, _m);
  }
  scene.add(sleepers);

  // Supports: chocolate columns from the ground up to the spine, a striped
  // cap on each. Low stretches rest on short blocks instead.
  const gap = lowSpec ? 7 : 5;
  const legs = [];
  for (let s = 2; s < LENGTH; s += gap) {
    frameAt(s, f);
    if (f.y < 1.1) continue;
    legs.push([f.x - f.ux * 0.3, f.y - f.uy * 0.3 - 0.12, f.z - f.uz * 0.3]);
  }
  const legMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 7).translate(0, 0.5, 0), mat(CHOC), legs.length);
  legs.forEach(([x, y, z], i) => { legMesh.setMatrixAt(i, _m.compose(_v.set(x, 0, z), _q.identity(), _s.set(1, y, 1))); block(x, z, 0.5, 0.5); });
  scene.add(legMesh);
  // Where the rails are too low to walk under, the track itself blocks
  // (all but the station, where the platform edge does it).
  for (let s = 0; s < LENGTH; s += 0.9) {
    frameAt(s, f);
    if (f.y >= WALK_UNDER) continue;
    if (f.x > -32.5 && f.x < -29.5 && f.z > PLATFORM.z0 - 2 && f.z < PLATFORM.z1 + 2) continue;
    block(f.x, f.z, 1.3, 1.3);
  }

  // Chocolate tunnel over the second drop: a tube round the track.
  {
    const v = [];
    for (let s = S_TUNNEL[0]; s <= S_TUNNEL[1]; s += 1) { frameAt(s, f); v.push(new THREE.Vector3(f.x + f.ux * 0.7, f.y + f.uy * 0.7, f.z + f.uz * 0.7)); }
    if (v.length > 2) {
      const tun = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), v.length * 2, 1.65, 10, false), new THREE.MeshLambertMaterial({ color: '#5a3422', side: THREE.DoubleSide, flatShading: true }));
      scene.add(tun);
      // Sprinkles round the mouths.
      for (const end of [v[0], v[v.length - 1]]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.18, 6, 16), mat('#ff8fb8'));
        ring.position.copy(end);
        ring.lookAt(end.x + (v[1].x - v[0].x), end.y, end.z + (v[1].z - v[0].z));
        scene.add(ring);
      }
    }
  }

  // Candy-cane arches the train shoots through, and flags close by the track.
  const arches = [];
  for (const s of [LENGTH * 0.47, LENGTH * 0.55, LENGTH * 0.72, LENGTH * 0.78]) {
    frameAt(s, f);
    if (f.y > 9) continue;
    const g = new THREE.Group();
    for (const side of [-1.15, 1.15]) {
      for (let k = 0; k < 4; k++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, (f.y + 2.4) / 4, 8), mat(k % 2 ? ICING : '#ff5a5f'));
        seg.position.set(side, -f.y + ((k + 0.5) * (f.y + 2.4)) / 4, 0);
        g.add(seg);
      }
    }
    const top = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 6, 12, Math.PI), mat('#ff5a5f'));
    top.position.y = 2.4;
    g.add(top);
    g.position.set(f.x, f.y, f.z);
    g.rotation.y = Math.atan2(f.fx, f.fz);
    scene.add(g);
    arches.push(g);
    block(f.x + f.rx * 1.15, f.z + f.rz * 1.15, 0.35, 0.35);
    block(f.x - f.rx * 1.15, f.z - f.rz * 1.15, 0.35, 0.35);
  }
  const flagN = lowSpec ? 18 : 36;
  const flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 0.45).translate(0.35, 0, 0), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), flagN);
  const flagCols = ['#ff8fb8', '#8fe3c7', '#ffe27a', '#c9a8ff', '#8fd0ff'].map((c) => new THREE.Color(c));
  const flagAt = [];
  for (let i = 0; i < flagN; i++) {
    frameAt(((i + 0.5) / flagN) * LENGTH, f);
    const side = i % 2 ? 1 : -1;
    flagAt.push({ x: f.x + f.rx * side * 1.25, y: f.y + 1.5, z: f.z + f.rz * side * 1.25, ry: Math.atan2(f.fx, f.fz) + Math.PI });
    flags.setColorAt(i, flagCols[i % flagCols.length]);
  }
  scene.add(flags);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 5).translate(0, -0.5, 0), mat('#d9dde2'), flagN);
  flagAt.forEach((p, i) => poles.setMatrixAt(i, _m.compose(_v.set(p.x, p.y + 0.25, p.z), _q.identity(), _s.set(1, 1.6, 1))));
  scene.add(poles);
  const waveFlags = (t) => {
    flagAt.forEach((p, i) => {
      _q.setFromAxisAngle(_y.set(0, 1, 0), p.ry + Math.sin(t * 5 + i) * 0.35);
      flags.setMatrixAt(i, _m.compose(_v.set(p.x, p.y, p.z), _q, _s.set(1, 1, 1)));
    });
    flags.instanceMatrix.needsUpdate = true;
  };
  waveFlags(0);

  // Station: a deck along the east side of the rails, a striped roof on
  // candy posts, the sign over the way in, and a little control booth.
  const P = PLATFORM, len = P.z1 - P.z0, mid = (P.z0 + P.z1) / 2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, len), mat('#fff3d6'));
  deck.position.set(P.x, 0.04, mid);
  scene.add(deck);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, len), mat('#ffe27a'));
  edge.position.set(P.x - 1.25, 0.09, mid); // the yellow line
  scene.add(edge);
  for (const z of [P.z0, P.z1]) for (const x of [-32.6, -27]) {
    for (let k = 0; k < 4; k++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8), mat(k % 2 ? ICING : TRAIN_PINK));
      seg.position.set(x, 0.4 + k * 0.8, z);
      scene.add(seg);
    }
    block(x, z, 0.35, 0.35);
  }
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.18, len / 7 + 0.02), mat(i % 2 ? ICING : '#ff8fb8'));
    r.position.set(-29.8, 3.35, P.z0 + (i + 0.5) * (len / 7));
    scene.add(r);
  }
  // The platform edge: a low candy rail between the deck and the rails, with
  // a gap where you get on (the train stops with its cars at the gap).
  const railTo = (z0, z1) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, z1 - z0), mat(TRAIN_PINK)); r.position.set(P.x - 1.35, 0.4, (z0 + z1) / 2); scene.add(r); block(P.x - 1.35, (z0 + z1) / 2, 0.2, z1 - z0); };
  railTo(P.z0, -3.2);
  railTo(5, P.z1);
  block(-31, mid, 2.2, len + 0.6); // nobody walks along the rails
  const sign = signBoard();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), new THREE.MeshBasicMaterial({ map: sign.tex }));
  board.position.set(P.x + 1.4, 4.2, P.z1 - 2);
  board.rotation.y = Math.PI / 2;
  scene.add(board);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 4.3), mat('#b8336e'));
  back.position.set(P.x + 1.33, 4.2, P.z1 - 2);
  scene.add(back);

  // Where you get on: a pink mark on the deck at the gate (its arrows point
  // at the train), and a tall sign at the platform's way in.
  const mark = boardingTex(512, 320, true);
  const mat2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), new THREE.MeshLambertMaterial({ map: mark.tex }));
  mat2.position.set(GATE.x - 0.5, 0.1, GATE.z);
  scene.add(mat2);
  const post = boardingTex(512, 300, false);
  const sx = -25.9, sz = GATE.z - 1.5;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), mat(TRAIN_PINK));
  pole.position.set(sx, 1.3, sz);
  scene.add(pole);
  for (const ry of [Math.PI / 2, -Math.PI / 2]) { // readable from the park and from the platform
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1), new THREE.MeshBasicMaterial({ map: post.tex }));
    face.position.set(sx + Math.sin(ry) * 0.04, 2.55, sz);
    face.rotation.y = ry;
    scene.add(face);
  }
  block(sx, sz, 0.3, 0.3);

  // The trains.
  const trains = [];
  for (let k = 0; k < TRAINS; k++) {
    const cars = [];
    for (let c = 0; c < CARS; c++) { const car = makeCar(c === 0); scene.add(car); cars.push(car); }
    trains.push(cars);
  }
  let t = 0;
  const tick = (now, dt) => {
    t += dt;
    for (let k = 0; k < TRAINS; k++) {
      const tr = trainAt(now, k);
      trains[k].forEach((car, c) => placeOnTrack(car, tr.s - 0.9 - c * CAR_GAP, f));
    }
    if (!lowSpec) waveFlags(t);
    else if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) waveFlags(t);
  };
  tick(Date.now() / 1000, 0);
  return { tick, trains, arches, setSignLang: (lang) => { sign.draw(lang); mark.draw(lang); post.draw(lang); } };
}
