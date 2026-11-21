// Haechi (해치) design drafts: a traditional guardian beast (one horn, curly
// mane, scales, a bell) in the game's simple low-poly style. Faces +z, feet
// at y = 0. All blue (Yozi 2026-11-21). Three looks: 'stone' (blue stone, sitting like
// a palace statue), 'gold' (blue with a gold mane, walking) and 'dancheong'
// (sky blue chibi with palace-paint trim).
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const smat = (c) => (mats['s' + c] ||= new THREE.MeshLambertMaterial({ color: c }));

function part(g, geo, color, [x, y, z], s = [1, 1, 1], r = [0, 0, 0], flat = true) {
  const m = new THREE.Mesh(geo, flat ? mat(color) : smat(color));
  m.position.set(x, y, z);
  m.scale.set(...s);
  m.rotation.set(...r);
  m.castShadow = true;
  g.add(m);
  return m;
}
const ball = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const caps = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 7);

// Eyes in the same style as the players (dark oval + white shine), plus
// a curly brow over each.
function face(g, c, hx, hy, hz, hr) {
  for (const s of [-1, 1]) {
    part(g, ball(hr * 0.16, 10, 8), 0x2b2230, [hx + s * hr * 0.42, hy + hr * 0.12, hz + hr * 0.82], [0.9, 1.2, 0.6], [0, 0, 0], false);
    part(g, ball(hr * 0.05, 6, 4), 0xffffff, [hx + s * hr * 0.42 + hr * 0.05, hy + hr * 0.2, hz + hr * 0.92], [1, 1, 1], [0, 0, 0], false);
    part(g, ball(hr * 0.13, 6, 4), c.mane, [hx + s * hr * 0.42, hy + hr * 0.4, hz + hr * 0.78], [1.5, 0.6, 0.8], [0, 0, -s * 0.3]);
    if (c.cheek) part(g, new THREE.CircleGeometry(hr * 0.12, 10), c.cheek, [hx + s * hr * 0.68, hy - hr * 0.12, hz + hr * 0.72], [1, 1, 1], [0, s * 0.6, 0], false);
  }
}

// A round head with a lion snout, open grin with two fangs, the horn, ears
// and a ring of mane curls behind it.
function head(g, c, [hx, hy, hz], hr) {
  part(g, ball(hr, 10, 8), c.body, [hx, hy, hz], [1.08, 0.98, 1]);
  part(g, ball(hr * 0.5, 8, 6), c.snout, [hx, hy - hr * 0.3, hz + hr * 0.78], [1.35, 0.8, 0.9]);
  part(g, ball(hr * 0.17, 6, 5), c.nose, [hx, hy - hr * 0.12, hz + hr * 1.18], [1.3, 0.9, 1]);
  part(g, new THREE.BoxGeometry(hr * 0.75, hr * 0.13, hr * 0.2), 0x6a2a2a, [hx, hy - hr * 0.52, hz + hr * 1.08]);
  for (const s of [-1, 1]) part(g, new THREE.ConeGeometry(hr * 0.07, hr * 0.2, 4), 0xfaf6ea, [hx + s * hr * 0.24, hy - hr * 0.5, hz + hr * 1.16], [1, 1, 1], [Math.PI, 0, 0]);
  face(g, c, hx, hy, hz, hr);
  // The single horn on the forehead (what makes it a haechi).
  part(g, new THREE.ConeGeometry(hr * 0.15, hr * 0.7, 6), c.horn, [hx, hy + hr * 1.12, hz + hr * 0.25], [1, 1, 1], [0.35, 0, 0]);
  part(g, new THREE.TorusGeometry(hr * 0.14, hr * 0.04, 4, 8), c.trim, [hx, hy + hr * 0.84, hz + hr * 0.15], [1, 1, 1], [Math.PI / 2 - 0.35, 0, 0]);
  for (const s of [-1, 1]) part(g, new THREE.ConeGeometry(hr * 0.17, hr * 0.32, 5), c.body, [hx + s * hr * 0.72, hy + hr * 0.72, hz - hr * 0.1], [1, 1, 0.6], [0, 0, -s * 0.6]);
  // Mane: two rings of curls round the back of the head, and a beard.
  const n = 11;
  for (let ring = 0; ring < 2; ring++) {
    const rr = hr * (ring ? 1.08 : 0.9), off = ring ? 0.5 : 0, z = hz - hr * (ring ? 0.45 : 0.15);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.8 + (i + off) * (Math.PI * 1.6) / (n - 1) + Math.PI / 2;
      if (ring && i === n - 1) continue;
      part(g, ball(hr * (ring ? 0.3 : 0.26), 6, 5), ring ? c.mane : c.mane2, [hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.95, z], [1, 1, 0.8]);
    }
  }
  for (let i = -2; i <= 2; i++) part(g, ball(hr * 0.2, 6, 5), c.mane, [hx + i * hr * 0.2, hy - hr * 0.88 - Math.abs(i) * -hr * 0.04, hz + hr * 0.62 - Math.abs(i) * hr * 0.12]);
}

// A curly tail rising from (x, y, z) backwards and up, ending in a flame puff.
function tail(g, c, [x, y, z], len) {
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = t * Math.PI * 1.15;
    const r = len * 0.12 * (1 - t * 0.35);
    part(g, ball(r, 6, 5), c.body, [x, y + Math.sin(a) * len * 0.5 + t * len * 0.3, z - Math.sin(a * 0.6 + 0.2) * len * 0.45]);
  }
  const tx = x, ty = y + len * 0.3 + Math.sin(Math.PI * 1.15) * len * 0.5, tz = z - Math.sin(Math.PI * 0.69 + 0.2) * len * 0.45;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(g, ball(len * 0.11, 6, 5), i % 2 ? c.mane : c.mane2, [tx + Math.cos(a) * len * 0.1, ty + len * 0.06 + Math.sin(a) * len * 0.1, tz - len * 0.05]);
  }
}

// Collar and bell.
function bell(g, c, [x, y, z], r, tilt = 0) {
  part(g, new THREE.TorusGeometry(r, r * 0.12, 4, 12), c.collar, [x, y, z], [1, 1, 1], [Math.PI / 2 + tilt, 0, 0]);
  part(g, ball(r * 0.32, 8, 6), 0xf0c040, [x, y - r * 0.25, z + r * 0.95], [1, 1.05, 1], [0, 0, 0], false);
}

// Scales: flat little plates in rows on the back/chest.
function scales(g, c, pts, r) {
  for (const p of pts) part(g, ball(r, 6, 4), c.scale, p, [1, 0.45, 1.1], [0.4, 0, 0]);
}

const LOOKS = {
  stone: { body: 0x7d98b8, snout: 0xa9bdd3, nose: 0x3b4d66, mane: 0x55708f, mane2: 0x6582a3, horn: 0xe2d2a8, trim: 0xe2d2a8, scale: 0x6c88a8, collar: 0x8f3a34, cheek: null },
  gold: { body: 0x3f78d0, snout: 0xcfe0f5, nose: 0x22355e, mane: 0xf2c14e, mane2: 0xffdb7a, horn: 0xfff3c4, trim: 0xf2c14e, scale: 0x5f95e0, collar: 0xd9473b, cheek: 0xff9f8a },
  dancheong: { body: 0x86c8ec, snout: 0xf3ecdc, nose: 0x2a4a80, mane: 0x2f55a8, mane2: 0xe3573f, horn: 0xf3c64a, trim: 0xe3573f, scale: 0x5fa9d8, collar: 0x3aa58a, cheek: 0xff9f8a },
};

export const HAECHI_INFO = {
  stone: 'A · 청석 해치 (광화문 석상처럼 앉은 자세)',
  gold: 'B · 파랑·금빛 해치 (걷는 자세, 방울)',
  dancheong: 'C · 하늘 단청 해치 (머리 큰 귀여운 비율)',
};

export function createHaechi(kind = 'gold') {
  const c = LOOKS[kind], g = new THREE.Group();
  if (kind === 'stone') {
    // Sitting like the statues at Gwanghwamun: haunches down, front legs
    // straight, chest up. About 1.9 m to the horn tip.
    for (const s of [-1, 1]) {
      part(g, ball(0.34, 9, 7), c.body, [s * 0.27, 0.32, -0.3], [0.85, 0.95, 1.15]);
      part(g, ball(0.15, 7, 5), c.body, [s * 0.32, 0.09, 0.0], [1, 0.6, 1.6]);
      part(g, caps(0.11, 0.5), c.body, [s * 0.19, 0.42, 0.26]);
      part(g, ball(0.14, 7, 5), c.body, [s * 0.19, 0.08, 0.36], [1, 0.6, 1.3]);
      for (const t of [-1, 0, 1]) part(g, ball(0.045, 5, 4), c.snout, [s * 0.19 + t * 0.06, 0.06, 0.48]);
      // Curls on the elbows like the carved ones.
      part(g, ball(0.09, 6, 5), c.mane, [s * 0.29, 0.62, 0.2]);
      part(g, ball(0.09, 6, 5), c.mane, [s * 0.47, 0.42, -0.25]);
    }
    part(g, caps(0.36, 0.45), c.body, [0, 0.72, -0.08], [1, 1, 0.9], [0.4, 0, 0]);
    scales(g, c, [[0, 0.75, 0.24], [-0.13, 0.66, 0.24], [0.13, 0.66, 0.24], [0, 0.56, 0.27], [-0.13, 0.86, 0.2], [0.13, 0.86, 0.2]], 0.08);
    bell(g, c, [0, 1.0, 0.13], 0.27, -0.35);
    head(g, c, [0, 1.33, 0.22], 0.36);
    tail(g, c, [0, 0.4, -0.55], 0.8);
  } else if (kind === 'gold') {
    // Walking on all fours, head up, tail high. About 1.6 m to the horn tip.
    part(g, caps(0.3, 0.55), c.body, [0, 0.72, -0.02], [1, 1, 1], [Math.PI / 2 - 0.12, 0, 0]);
    const legs = [[-0.19, 0.38, 0.12], [0.19, 0.38, -0.12], [-0.19, -0.42, -0.1], [0.19, -0.42, 0.1]];
    for (const [x, z, sw] of legs) {
      const pv = new THREE.Group();
      pv.position.set(x, 0.62, z);
      pv.rotation.x = sw * 2.2;
      g.add(pv);
      part(pv, caps(0.1, 0.38), c.body, [0, -0.28, 0]);
      part(pv, ball(0.13, 7, 5), c.body, [0, -0.54, 0.05], [1, 0.6, 1.3]);
      part(pv, ball(0.08, 6, 5), c.mane, [x > 0 ? 0.08 : -0.08, -0.12, -0.03]);
    }
    scales(g, c, [[0, 0.99, -0.25], [0, 1.0, 0.0], [-0.14, 0.95, -0.12], [0.14, 0.95, -0.12], [-0.14, 0.94, 0.14], [0.14, 0.94, 0.14], [0, 0.98, -0.45]], 0.075);
    bell(g, c, [0, 0.9, 0.37], 0.24, -0.6);
    head(g, c, [0, 1.12, 0.52], 0.33);
    tail(g, c, [0, 0.82, -0.52], 0.75);
  } else {
    // Chibi like the players (big head on a small body). About 1.35 m.
    part(g, caps(0.27, 0.35), c.body, [0, 0.48, -0.08], [1, 1, 1], [Math.PI / 2 - 0.25, 0, 0]);
    for (const [x, z] of [[-0.17, 0.18], [0.17, 0.18], [-0.17, -0.3], [0.17, -0.3]]) {
      part(g, caps(0.1, 0.18), c.body, [x, 0.22, z]);
      part(g, ball(0.12, 7, 5), c.snout, [x, 0.07, z + 0.04], [1, 0.6, 1.25]);
    }
    scales(g, c, [[0, 0.74, -0.12], [-0.12, 0.7, -0.2], [0.12, 0.7, -0.2], [0, 0.7, -0.32]], 0.07);
    // A dancheong band on the back like the eaves of a palace.
    part(g, new THREE.TorusGeometry(0.27, 0.035, 4, 14), c.trim, [0, 0.5, -0.2], [1, 1, 0.9]);
    part(g, new THREE.TorusGeometry(0.28, 0.025, 4, 14), c.horn, [0, 0.5, -0.27], [1, 1, 0.9]);
    bell(g, c, [0, 0.66, 0.18], 0.2, -0.5);
    head(g, c, [0, 0.92, 0.25], 0.38);
    tail(g, c, [0, 0.5, -0.4], 0.6);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.18, depthWrite: false }));
  blob.position.y = 0.01;
  g.add(blob);
  return g;
}
