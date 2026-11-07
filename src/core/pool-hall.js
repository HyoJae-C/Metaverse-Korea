// Olympic Park Pool: the indoor hall (layout and rules in core/pool.js).
// A 50 m competition pool with lane ropes, starting blocks and a scoreboard,
// stands along the back wall, a diving pool with 1 m / 3 m springboards and
// a 5 m platform, and a rest corner with a round leisure pool, tubes and
// loungers. Swimwear lockers are by the entrance (pick another
// swimsuit there; you are in swimwear as soon as you come in, main.js), the
// lifeguard sits by the competition pool.
// Signs are bilingual (Korean and English) like the other interiors.
import * as THREE from 'three';
import { POOL_ROOM, WATER_Y, SWIM_Y, COMP, LANE_W, DIVE, LEISURE, BOARDS, laneZ } from './pool.js';
import { createCharacter } from './character.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// Square tiles with grout lines.
const tileTex = (base, grout, n = 4) => canvasTex(128, 128, (g, w) => {
  g.fillStyle = base; g.fillRect(0, 0, w, w);
  g.strokeStyle = grout; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { const p = (i / n) * w; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, w); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
});
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
function fit(g, text, size, maxW, weight = 800) {
  let s = size;
  g.font = `${weight} ${s}px ${FONT}`;
  while (g.measureText(text).width > maxW && s > 12) g.font = `${weight} ${(s -= 4)}px ${FONT}`;
}

export const LIFEGUARD_LOOK = { model: 'swim-red', hair: 'black', skin: 'warm', shirt: 'coral' };
const SWIM_COLORS = ['#24407a', '#ff7a6b', '#7cd3c7', '#ffd93d']; // the swimsuits in the cabinet (data/characters)
const SWIM_BOTTOMS = ['#24407a', '#ff7a6b', '#1f4e8c', '#1d1b22'];
const AMBIENT_LOOKS = [
  { model: 'swim-navy', hair: 'espresso', skin: 'fair', shirt: 'sky' },
  { model: 'swim-mint', hair: 'black', skin: 'tan', shirt: 'mint' },
  { model: 'swim-coral', hair: 'blonde', skin: 'fair', shirt: 'peach' },
];

export function buildPoolHall(store, ROOM = POOL_ROOM, EXIT = { x: 0, z: ROOM.d / 2 - 0.9 }) {
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dff1fb');
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfe3f2, 1.8));
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(-10, 30, 12);
  scene.add(sun);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const box = (sx, sy, sz, x, y, z, color, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof color === 'string' ? mat(color) : color);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const plane = (sx, sz, x, y, z, material) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), material);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  // ---- the deck, with holes for the pools ----
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2); shape.lineTo(w / 2, -d / 2); shape.lineTo(w / 2, d / 2); shape.lineTo(-w / 2, d / 2); shape.closePath();
  const rectHole = (r) => { const p = new THREE.Path(); p.moveTo(r.x0, -r.z1); p.lineTo(r.x1, -r.z1); p.lineTo(r.x1, -r.z0); p.lineTo(r.x0, -r.z0); p.closePath(); shape.holes.push(p); };
  rectHole(COMP); rectHole(DIVE);
  const ch = new THREE.Path(); ch.absarc(LEISURE.x, -LEISURE.z, LEISURE.r, 0, Math.PI * 2, true); shape.holes.push(ch);
  const deckTex = tileTex('#eef3f5', '#cfdbe0', 4);
  deckTex.repeat.set(0.5, 0.5);
  deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: deckTex }));
  scene.add(deck);
  // A darker band round each pool's edge (the coping), so the edge reads.
  const copingMat = mat('#9fb7c2');
  const coping = (r) => {
    const t = 0.35;
    box(r.x1 - r.x0 + t * 2, 0.04, t, (r.x0 + r.x1) / 2, 0.02, r.z0 - t / 2, copingMat);
    box(r.x1 - r.x0 + t * 2, 0.04, t, (r.x0 + r.x1) / 2, 0.02, r.z1 + t / 2, copingMat);
    box(t, 0.04, r.z1 - r.z0, r.x0 - t / 2, 0.02, (r.z0 + r.z1) / 2, copingMat);
    box(t, 0.04, r.z1 - r.z0, r.x1 + t / 2, 0.02, (r.z0 + r.z1) / 2, copingMat);
  };
  coping(COMP); coping(DIVE);
  const rim = new THREE.Mesh(new THREE.RingGeometry(LEISURE.r, LEISURE.r + 0.35, 48).rotateX(-Math.PI / 2), copingMat);
  rim.position.set(LEISURE.x, 0.02, LEISURE.z);
  scene.add(rim);

  // ---- walls: pale blue, a band of tall windows along the back ----
  const wallMat = new THREE.MeshLambertMaterial({ color: '#f4f9fc' });
  const wall = (len, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    scene.add(m);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.2), mat('#2f7fc1'));
    band.position.set(x + Math.sin(ry) * 0.02, 0.6, z + Math.cos(ry) * 0.02);
    band.rotation.y = ry;
    scene.add(band);
  };
  wall(w, 0, -d / 2, 0);
  wall(d, -w / 2, 0, Math.PI / 2);
  wall(d, w / 2, 0, -Math.PI / 2);
  wall(w, 0, d / 2, Math.PI);
  const glass = new THREE.MeshBasicMaterial({ color: '#bfe6ff' });
  for (let x = -w / 2 + 3; x < w / 2 - 2; x += 4) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), glass);
    win.position.set(x + 1.7, 9.6, -d / 2 + 0.03);
    scene.add(win);
  }
  // Exit door on the front wall.
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), mat('#2f7fc1'));
  door.rotation.y = Math.PI;
  door.position.set(EXIT.x, 1.3, d / 2 - 0.03);
  scene.add(door);
  plane(2.4, 1.2, EXIT.x, 0.01, d / 2 - 0.7, mat('#2f7fc1'));

  // ---- signs (Korean · English) ----
  const signTex = (ko, en, bg, fg = '#ffffff') => canvasTex(1024, 256, (g, cw, chh) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, chh);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    fit(g, ko, 120, cw - 60); g.fillText(ko, cw / 2, 96);
    fit(g, en, 64, cw - 60, 700); g.fillText(en, cw / 2, 196);
  });
  const sign = (ko, en, x, y, z, ry, sw, bg = '#2f7fc1') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 4), new THREE.MeshBasicMaterial({ map: signTex(ko, en, bg) }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  };
  sign('올림픽공원 수영장', 'OLYMPIC PARK POOL', -11, 6.4, -d / 2 + 0.05, 0, 16);
  // A wave logo next to it (an original mark, not the Olympic rings).
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(256, 256, (g) => {
    g.fillStyle = '#2f7fc1'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 16; g.lineCap = 'round';
    for (const y of [100, 140, 180]) { g.beginPath(); for (let x = 40; x <= 216; x += 4) g.lineTo(x, y + Math.sin((x / 176) * Math.PI * 3) * 12); g.stroke(); }
  }) }));
  logo.position.set(-21.5, 6.4, -d / 2 + 0.05);
  scene.add(logo);

  // ---- a pool basin: tiled walls going down, a floor, the water ----
  const wallTex = tileTex('#bfe8f7', '#9bd3ea', 4);
  const water = [];
  const waterTex = canvasTex(256, 256, (g, s) => {
    g.fillStyle = '#ffffff00'; g.clearRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
    for (let i = 0; i < 22; i++) { // soft wobbly caustic lines
      const x = (i * 97) % s, y = (i * 53) % s, r = 18 + (i % 5) * 7;
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, i, 0, Math.PI * 1.3); g.stroke();
    }
  }, [1, 1]);
  const waterMat = new THREE.MeshLambertMaterial({ color: '#36aee0', transparent: true, opacity: 0.62, depthWrite: false });
  const shineMat = new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.5, depthWrite: false });
  const basin = (r, depth, floorColor) => {
    const sx = r.x1 - r.x0, sz = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const side = (len, x, z, ry) => {
      const t = wallTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 2, depth / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, depth), new THREE.MeshLambertMaterial({ map: t }));
      m.position.set(x, -depth / 2, z); m.rotation.y = ry; scene.add(m);
    };
    side(sx, cx, r.z0, 0); side(sx, cx, r.z1, Math.PI); side(sz, r.x0, cz, Math.PI / 2); side(sz, r.x1, cz, -Math.PI / 2);
    plane(sx, sz, cx, -depth, cz, mat(floorColor));
    water.push(plane(sx, sz, cx, WATER_Y, cz, waterMat));
    const sh = plane(sx, sz, cx, WATER_Y + 0.01, cz, shineMat.clone());
    sh.material.map = waterTex.clone(); sh.material.map.needsUpdate = true; sh.material.map.repeat.set(sx / 8, sz / 8);
    water.push(sh);
  };
  basin(COMP, COMP.depth, '#8fd3ee');
  basin(DIVE, DIVE.depth, '#5fb6e0');
  // Lane lines on the floor of the competition pool (dark blue, with a T at each end).
  for (let i = 0; i < COMP.lanes; i++) {
    const z = laneZ(i);
    plane(COMP.x1 - COMP.x0 - 4, 0.25, (COMP.x0 + COMP.x1) / 2, -COMP.depth + 0.01, z, mat('#1f4e8c'));
    for (const x of [COMP.x0 + 2, COMP.x1 - 2]) plane(0.25, 1, x, -COMP.depth + 0.01, z, mat('#1f4e8c'));
  }
  // The round leisure pool.
  {
    const { x, z, r, depth } = LEISURE;
    const t = wallTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 1);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 48, 1, true), new THREE.MeshLambertMaterial({ map: t, side: THREE.BackSide }));
    cyl.position.set(x, -depth / 2, z);
    scene.add(cyl);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat('#a8e2f2'));
    fl.position.set(x, -depth, z); scene.add(fl);
    const wtr = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#5cc8e8', transparent: true, opacity: 0.6, depthWrite: false }));
    wtr.position.set(x, WATER_Y, z); scene.add(wtr); water.push(wtr);
  }

  // ---- lane ropes: floats, red near the walls, blue and white between ----
  const ROPE_GAP = 0.32;
  const perRope = Math.floor((COMP.x1 - COMP.x0) / ROPE_GAP);
  const ropes = COMP.lanes - 1;
  const floats = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshLambertMaterial({ color: '#ffffff' }), perRope * ropes);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0;
  for (let r = 1; r <= ropes; r++) {
    const z = COMP.z0 + LANE_W * r;
    for (let i = 0; i < perRope; i++) {
      const x = COMP.x0 + ROPE_GAP * (i + 0.5);
      m4.makeScale(1.3, 0.8, 0.8).setPosition(x, WATER_Y + 0.03, z);
      floats.setMatrixAt(k, m4);
      const fromEnd = Math.min(x - COMP.x0, COMP.x1 - x);
      floats.setColorAt(k, col.set(fromEnd < 5 ? '#e5383b' : i % 4 < 2 ? '#2f7fc1' : '#ffffff'));
      k++;
    }
  }
  scene.add(floats);

  // ---- starting blocks at the west end, numbered ----
  for (let i = 0; i < COMP.lanes; i++) {
    const z = laneZ(i), x = COMP.x0 - 0.55;
    box(0.6, 0.5, 0.6, x, 0.25, z, '#e9eef0');
    const top = box(0.7, 0.08, 0.66, x + 0.04, 0.55, z, '#2f7fc1');
    top.rotation.z = -0.12;
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.36), new THREE.MeshBasicMaterial({ map: canvasTex(64, 52, (g, cw, chh) => {
      g.fillStyle = '#1f4e8c'; g.fillRect(0, 0, cw, chh); g.fillStyle = '#fff'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), cw / 2, chh / 2 + 2);
    }) }));
    num.position.set(x - 0.31, 0.27, z); num.rotation.y = -Math.PI / 2;
    scene.add(num);
    block(x, z, 0.7, 0.7);
  }
  // Backstroke flags: a line of pennants across the pool 5 m from each end.
  for (const fx of [COMP.x0 + 5, COMP.x1 - 5]) {
    for (const pz of [COMP.z0 - 0.7, COMP.z1 + 0.7]) { box(0.08, 2, 0.08, fx, 1, pz, '#c9d3d8'); block(fx, pz, 0.3, 0.3); }
    box(0.02, 0.02, COMP.z1 - COMP.z0 + 1.4, fx, 1.95, (COMP.z0 + COMP.z1) / 2, '#5a6670');
    for (let z = COMP.z0 - 0.4; z < COMP.z1 + 0.4; z += 0.45) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), mat(['#e5383b', '#ffffff', '#2f7fc1'][Math.round((z - COMP.z0) / 0.45 + 30) % 3]));
      tri.position.set(fx, 1.8, z); tri.rotation.x = Math.PI; scene.add(tri);
    }
  }

  // ---- the scoreboard on the west wall: race results after a race ----
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 1024; boardCanvas.height = 420;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const drawBoard = (title, rows) => {
    const g = boardCanvas.getContext('2d');
    g.fillStyle = '#10161f'; g.fillRect(0, 0, 1024, 420);
    g.fillStyle = '#ffd93d'; g.textAlign = 'left'; g.textBaseline = 'middle';
    fit(g, title, 52, 960); g.fillText(title, 32, 46);
    g.font = `700 36px ${FONT}`;
    rows.slice(0, 8).forEach((r, i) => {
      const y = 106 + i * 40;
      g.fillStyle = r.me ? '#7cf2ff' : '#e8eef5';
      g.fillText(r.place || '', 40, y);
      g.fillText(r.lane || '', 130, y);
      fit(g, r.name || '', 36, 520, 700); g.fillText(r.name || '', 230, y);
      g.font = `700 36px ${FONT}`; g.textAlign = 'right'; g.fillText(r.time || '', 990, y); g.textAlign = 'left';
    });
    boardTex.needsUpdate = true;
  };
  drawBoard('OLYMPIC PARK POOL · 50 m', [
    { place: '', lane: 'LANE', name: 'Race from the blocks at this end!', time: '' },
    { place: '', lane: '', name: '출발대에서 50m 레이스를 시작해요', time: '' },
  ]);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(14, 14 * 420 / 1024), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(-w / 2 + 0.06, 6.2, (COMP.z0 + COMP.z1) / 2);
  board.rotation.y = Math.PI / 2;
  scene.add(board);
  box(0.2, 6.4, 14.6, -w / 2 + 0.1, 6.2, (COMP.z0 + COMP.z1) / 2, '#2b3440');
  board.position.x += 0.12;

  // ---- stands along the back wall ----
  const seatColors = ['#2f7fc1', '#ffd93d', '#e5383b', '#39b56a', '#1d1b22'];
  for (let i = 0; i < 3; i++) {
    const z = -d / 2 + 2.4 - i * 0.8, y = 0.5 * (i + 1);
    box(COMP.x1 - COMP.x0, y, 0.8, (COMP.x0 + COMP.x1) / 2, y / 2, z, '#c9d3d8');
    for (let x = COMP.x0 + 0.6; x < COMP.x1 - 0.4; x += 0.75) box(0.5, 0.12, 0.42, x, y + 0.06, z + 0.1, seatColors[Math.floor((x - COMP.x0) / 6) % seatColors.length]);
  }
  block((COMP.x0 + COMP.x1) / 2, -d / 2 + 1.4, COMP.x1 - COMP.x0, 2.8);

  // ---- the diving tower east of the diving pool ----
  const concrete = mat('#dcd8d0');
  for (const b of BOARDS) {
    const px = DIVE.x1 + 2.2; // pedestal / column
    box(1.2, b.h, 1.2, px, b.h / 2, b.z, concrete);
    block(px, b.z, 1.3, 1.3);
    const x0 = b.tip - 0.4, x1 = px + 0.6, len = x1 - x0;
    if (b.kind === 'platform') {
      box(len, 0.3, 2.4, (x0 + x1) / 2, b.h - 0.15, b.z, concrete);
      box(len, 0.02, 2.3, (x0 + x1) / 2, b.h + 0.01, b.z, mat('#4f8fbf')); // non-slip top
      for (const s of [-1, 1]) box(len - 1.2, 0.05, 0.05, (x0 + x1) / 2 + 0.6, b.h + 1, b.z + s * 1.15, '#c9d3d8'); // rails
    } else {
      box(len, 0.08, 0.6, (x0 + x1) / 2, b.h - 0.04, b.z, mat('#f4f1ea'));
      box(len, 0.02, 0.5, (x0 + x1) / 2, b.h + 0.005, b.z, mat('#4f8fbf'));
      box(0.3, 0.3, 0.7, px - 1.6, b.h - 0.22, b.z, '#2f7fc1'); // the fulcrum
    }
    // The ladder up the back.
    const lx = DIVE.x1 + 3.1;
    for (const s of [-1, 1]) box(0.06, b.h + 1, 0.06, lx, (b.h + 1) / 2, b.z + s * 0.3, '#b8c2c8');
    for (let y = 0.3; y < b.h; y += 0.3) box(0.05, 0.05, 0.6, lx, y, b.z, '#b8c2c8');
    const lbl = sign(`${b.h}m`, b.kind === 'platform' ? 'PLATFORM' : 'SPRINGBOARD', px, b.h + 1.1, b.z, -Math.PI / 2, 1.6);
    lbl.position.x += 0.62;
  }
  sign('다이빙', 'DIVING', (DIVE.x0 + DIVE.x1) / 2, 6.4, -d / 2 + 0.05, 0, 8);

  // ---- rest corner: loungers, little tables, plants; tubes to borrow ----
  const seats = [];
  for (let i = 0; i < 6; i++) {
    const z = 4.4 + i * 2.6, x = w / 2 - 2.2;
    box(2.0, 0.42, 0.85, x, 0.21, z, '#f4f1ea');
    box(1.9, 0.12, 0.8, x, 0.48, z, ['#ffd93d', '#7cd3c7', '#ff9bb3'][i % 3]); // cushion (top at 0.54)
    const back = box(0.7, 0.1, 0.8, x + 0.85, 0.72, z, ['#ffd93d', '#7cd3c7', '#ff9bb3'][i % 3]);
    back.rotation.z = 0.5;
    seats.push({ x: x - 0.25, z, ry: -Math.PI / 2, stand: [x - 1.7, z], lie: true, lounger: true });
    block(x, z, 2.1, 0.9);
    if (i < 5) { // a side table with a drink between loungers
      box(0.45, 0.5, 0.45, x + 0.4, 0.25, z + 1.3, '#ffffff');
      box(0.08, 0.16, 0.08, x + 0.4, 0.58, z + 1.3, '#ff9b85');
      block(x + 0.4, z + 1.3, 0.5, 0.5);
    }
  }
  const plant = (x, z) => {
    box(0.6, 0.6, 0.6, x, 0.3, z, '#c98b4f');
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshLambertMaterial({ color: '#4f9a45', flatShading: true }));
    leaf.position.set(x, 1.1, z); leaf.scale.y = 1.3; scene.add(leaf);
    block(x, z, 0.7, 0.7);
  };
  for (const [x, z] of [[19, 6], [19, 19], [36, 2.2], [-38, 20], [-38, 4], [14.5, 20.5]]) plant(x, z);
  sign('휴식 풀', 'LEISURE POOL', LEISURE.x, 4.4, d / 2 - 0.05, Math.PI, 6);
  // The tube rack.
  const rackX = LEISURE.x - LEISURE.r - 2.6, rackZ = LEISURE.z + 2.5;
  box(0.1, 1.6, 1.6, rackX, 0.8, rackZ, '#b8c2c8');
  const tubeColors = ['#ff6b6b', '#ffd93d', '#4fc3f7', '#ff9bb3'];
  tubeColors.forEach((c, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 10, 20), mat(c));
    t.position.set(rackX + 0.18, 0.62 + (i % 2) * 0.55, rackZ - 0.4 + Math.floor(i / 2) * 0.8);
    t.rotation.y = Math.PI / 2;
    scene.add(t);
  });
  block(rackX, rackZ, 0.6, 1.8);

  // ---- lockers and benches by the entrance (you change on the way in) ----
  // Swimwear lockers along the front wall, left of the door, with a glass
  // cabinet of swimsuits at the end: pick another swimsuit there.
  for (let i = 0; i < 9; i++) {
    const x = -11.5 + i * 0.95;
    box(0.9, 2.2, 0.5, x, 1.1, d / 2 - 0.3, i % 2 ? '#7cc4f2' : '#5aaee6');
    box(0.12, 0.12, 0.02, x + 0.3, 1.2, d / 2 - 0.56, '#ffffff'); // handle
    box(0.5, 0.06, 0.02, x, 1.9, d / 2 - 0.56, '#1f4e8c'); // vent
  }
  block(-11.5 + 4 * 0.95, d / 2 - 0.3, 9 * 0.95, 0.6);
  const cab = { x: -13.6, z: d / 2 - 0.45 };
  box(1.9, 2.3, 0.1, cab.x, 1.15, cab.z + 0.35, '#f4f1ea'); // back, sides, top and bottom: open at the front, behind glass
  for (const sx of [-1, 1]) box(0.1, 2.3, 0.8, cab.x + sx * 0.9, 1.15, cab.z, '#f4f1ea');
  box(1.9, 0.12, 0.8, cab.x, 2.24, cab.z, '#f4f1ea');
  box(1.9, 0.5, 0.8, cab.x, 0.25, cab.z, '#f4f1ea');
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.7), new THREE.MeshLambertMaterial({ color: '#d8f1ff', transparent: true, opacity: 0.35 }));
  pane.position.set(cab.x, 1.25, cab.z - 0.41); pane.rotation.y = Math.PI;
  scene.add(pane);
  box(1.6, 0.03, 0.03, cab.x, 2.0, cab.z - 0.3, '#8a8f99'); // hanging rail
  SWIM_COLORS.forEach((c, i) => { // a swimsuit on a hanger
    const x = cab.x - 0.6 + i * 0.4;
    box(0.3, 0.42, 0.06, x, 1.65, cab.z - 0.32, c);
    box(0.24, 0.16, 0.06, x, 1.36, cab.z - 0.32, SWIM_BOTTOMS[i]);
    box(0.02, 0.12, 0.02, x, 1.92, cab.z - 0.32, '#8a8f99');
  });
  block(cab.x, cab.z, 2, 0.9);
  sign('수영복 보관함', 'SWIMWEAR LOCKERS', -9, 3.1, d / 2 - 0.05, Math.PI, 5);
  // Benches in front of the lockers.
  for (const x of [-10, -6]) { box(2.4, 0.4, 0.5, x, 0.2, d / 2 - 2.6, '#c98b4f'); block(x, d / 2 - 2.6, 2.5, 0.6); }

  // ---- the lifeguard's high chair by the competition pool ----
  const lg = { x: -11, z: COMP.z1 + 1.6, y: 1.6 };
  for (const [sx, sz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) box(0.08, lg.y, 0.08, lg.x + sx, lg.y / 2, lg.z + sz, '#ffffff');
  box(1.1, 0.1, 1.1, lg.x, lg.y - 0.05, lg.z, '#e5383b');
  for (let y = 0.4; y < lg.y; y += 0.4) box(0.9, 0.05, 0.05, lg.x, y, lg.z + 0.48, '#ffffff'); // rungs at the back
  const parasolPole = box(0.05, 1.8, 0.05, lg.x + 0.5, lg.y + 0.9, lg.z + 0.5, '#ffffff');
  const parasol = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 12), mat('#e5383b'));
  parasol.position.set(lg.x + 0.5, parasolPole.position.y + 1, lg.z + 0.5);
  scene.add(parasol);
  block(lg.x, lg.z, 1.2, 1.2);
  const clerk = { x: lg.x, z: lg.z, y: lg.y, ry: Math.PI };

  // Floating tubes in the leisure pool (just to look at).
  const drift = tubeColors.slice(0, 3).map((c, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 10, 20).rotateX(Math.PI / 2), mat(c));
    scene.add(t);
    return { t, a: i * 2.1, r: 1.6 + i * 0.9, s: 0.08 + i * 0.03 };
  });

  // ---- a few swimmers to keep the place lively ----
  // One does laps in lane 1, two lounge in tubes in the leisure pool.
  const ambient = AMBIENT_LOOKS.map((look, i) => {
    const c = createCharacter(look);
    scene.add(c.root);
    c.activity(i === 0 ? 'swim' : 'tube');
    return { ch: c, i, x: COMP.x0 + 6, dir: 1, a: i * 3 };
  });
  let raceOn = false;

  const stations = {
    lockers: [{ x: cab.x, z: cab.z - 1.2 }, { x: -9.6, z: d / 2 - 1.4 }, { x: -6, z: d / 2 - 1.4 }],
    tubes: [{ x: rackX + 0.9, z: rackZ }],
    blocks: Array.from({ length: COMP.lanes }, (_, i) => ({ x: COMP.x0 - 1.3, z: laneZ(i), lane: i })),
    ladders: BOARDS.map((b) => ({ x: b.foot[0], z: b.foot[1], board: b.id })),
  };

  let t = 0;
  const animate = (dt) => {
    t += dt;
    for (const m of water) if (m.material.map) { m.material.map.offset.x = (t * 0.02) % 1; m.material.map.offset.y = Math.sin(t * 0.3) * 0.05; }
    for (const o of drift) {
      o.a += dt * o.s;
      o.t.position.set(LEISURE.x + Math.cos(o.a) * o.r, WATER_Y + 0.05 + Math.sin(t * 1.6 + o.r) * 0.03, LEISURE.z + Math.sin(o.a) * o.r);
      o.t.rotation.y = o.a;
    }
    for (const s of ambient) {
      const r = s.ch.root;
      if (s.i === 0) { // laps in lane 1 (out of the way during a race)
        r.visible = !raceOn;
        s.x += s.dir * 1.5 * dt;
        if (s.x > COMP.x1 - 1.2 || s.x < COMP.x0 + 1.2) { s.dir = -s.dir; s.x = Math.max(COMP.x0 + 1.2, Math.min(COMP.x1 - 1.2, s.x)); }
        r.position.set(s.x, SWIM_Y, laneZ(0));
        r.rotation.y = s.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        s.ch.animate(dt, 0.7, false);
      } else {
        s.a += dt * 0.12;
        const rr = s.i === 1 ? 2.2 : 3.4;
        r.position.set(LEISURE.x + Math.cos(s.a + s.i * 2.5) * rr, SWIM_Y, LEISURE.z + Math.sin(s.a + s.i * 2.5) * rr);
        r.rotation.y = -s.a;
        s.ch.animate(dt, 0, false);
      }
    }
  };

  return {
    scene, products: [], colliders, seats, clerk, trainer: null, barkeep: null, turntable: null, tv: null, stations, animate, see: null,
    room: ROOM, exit: EXIT, noExit: false, pool: true,
    drawBoard,
    setRaceMode(on) { raceOn = on; },
  };
}
