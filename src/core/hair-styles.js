// Hairstyles from the hair salon and lip colours from Petal Lip, built on top
// of a pack model's head. Made in the head mesh's own units (the head is about
// ±1 across, the eyes at height `ey`, the face toward +z) and sharing the
// model's material: every vertex samples one cell of the colour atlas, so the
// hair takes the model's own hair colour or the salon's dye for free.
import * as THREE from 'three';


// Which faces of the model's own head are hair on the scalp (hidden when you
// pick a style), and which stay: eyebrows, moustaches and beards are on the
// front of the face, below the forehead.
export function isScalpHair(cx, cy, cz, ey) {
  if (cz > 0.5 && cy < ey + 0.3 && Math.abs(cx) < 0.7) return false; // brows, beard
  return true;
}

// Point every vertex at one atlas cell, shading top to bottom like the
// atlas's own gradient (light at the top of a cell, darker lower down).
export function paintCell(geo, [cx, cy], atlas, light = 0.15, dark = 0.8) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const h = Math.max(1e-6, max.y - min.y);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / h; // 0 bottom .. 1 top
    uv[i * 2] = (cx + 0.5) / atlas.cols;
    uv[i * 2 + 1] = (cy + light + (1 - t) * (dark - light)) / atlas.rows;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const sphere = (r, ws = 22, hs = 16, t0 = 0, tl = Math.PI) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, t0, tl);

// The hair for one style, as a group in head units. ey: eye height.
export function buildHair(style, material, atlas, ey) {
  const g = new THREE.Group();
  g.name = 'hairStyle';
  const hairCell = atlas.hair;
  const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(paintCell(geo, hairCell, atlas), material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const top = ey + 0.3; // forehead line
  // Every style starts from a cap over the skull, leaving the face clear.
  const cap = (r = 0.97, cover = 0.52, tilt = -0.42, y = 0.04) => add(sphere(r, 24, 14, 0, Math.PI * cover), 0, y, -0.04, 1.02, 1, 1, tilt);
  switch (style) {
    case 'short': // 짧은 커트
      cap();
      break;
    case 'crop': // 투블럭: short sides, a little volume on top
      cap(0.93, 0.5, -0.38, 0.02);
      add(sphere(0.8, 18, 10, 0, Math.PI * 0.42), 0, 0.2, 0.0, 1.05, 0.9, 1.08, -0.2);
      break;
    case 'bangs': // 앞머리: a straight fringe over the forehead
      cap(0.97, 0.56, -0.25);
      add(new THREE.SphereGeometry(1.0, 20, 6, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.18, Math.PI * 0.27), 0, 0.02, -0.02, 1.03, 1, 1);
      break;
    case 'bob': { // 단발: chin-length all round, open at the face
      cap(0.99, 0.55, -0.3);
      const shell = new THREE.CylinderGeometry(0.97, 1.02, 0.95, 24, 2, true, Math.PI * 0.3, Math.PI * 1.4);
      add(shell, 0, -0.3, -0.06);
      break;
    }
    case 'long': { // 긴 생머리: down the back, past the shoulders
      cap(0.99, 0.55, -0.3);
      const shell = new THREE.CylinderGeometry(0.97, 1.0, 1.0, 24, 2, true, Math.PI * 0.32, Math.PI * 1.36);
      add(shell, 0, -0.32, -0.06);
      add(new THREE.BoxGeometry(1.7, 1.3, 0.3, 4, 4, 1), 0, -1.2, -0.62, 1, 1, 1, 0.12);
      break;
    }
    case 'pony': // 포니테일
      cap(0.97, 0.55, -0.3);
      add(sphere(0.2, 12, 10), 0, 0.35, -0.95);
      add(new THREE.CapsuleGeometry(0.22, 0.75, 6, 12), 0, -0.2, -1.12, 1, 1, 0.85, 0.3);
      break;
    case 'twin': // 양갈래
      cap(0.97, 0.55, -0.3);
      for (const s of [-1, 1]) {
        add(sphere(0.17, 12, 10), 0.86 * s, 0.05, -0.25);
        add(new THREE.CapsuleGeometry(0.2, 0.7, 6, 12), 1.0 * s, -0.5, -0.32, 0.9, 1, 0.9, 0, 0, 0.18 * s);
      }
      break;
    case 'bun': // 똥머리
      cap(0.97, 0.55, -0.3);
      add(sphere(0.42, 16, 12), 0, 0.98, -0.25, 1, 0.9, 1);
      break;
    case 'curly': { // 뽀글 파마: a cloud of curls
      cap(0.98, 0.52, -0.35);
      const curl = sphere(0.3, 10, 8);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const ring = i % 2 ? 0.55 : 0.9;
        const x = Math.cos(a) * 0.95, z = Math.sin(a) * 0.95 - 0.08;
        if (z > 0.55 && Math.abs(x) < 0.6) continue; // keep the face clear
        add(curl, x, 0.2 + ring * 0.35, z);
      }
      for (const [x, y, z] of [[0, 0.95, -0.1], [-0.45, 0.85, 0.15], [0.45, 0.85, 0.15], [-0.4, 0.85, -0.5], [0.4, 0.85, -0.5], [0, 0.8, 0.45]]) add(curl, x, y, z, 1.1, 1.1, 1.1);
      break;
    }
    case 'pomp': // 포마드: swept up and back from the forehead
      cap(0.94, 0.52, -0.4, 0.0);
      add(new THREE.CapsuleGeometry(0.3, 0.75, 6, 14), 0, 0.68, 0.48, 1.25, 1, 0.9, -0.35, 0, Math.PI / 2);
      break;
    default:
      return null;
  }
  return g;
}

// Eye shapes from the clinics: scale (sx, sy) and tilt (radians, outer
// corner up) of each eye round its centre, and how far it comes forward.
export const EYE_TRANSFORM = {
  big: { sx: 1.4, sy: 1.4, tilt: 0, dz: 0.025 },
  round: { sx: 1.1, sy: 1.4, tilt: 0, dz: 0.02 },
  cat: { sx: 1.35, sy: 1.0, tilt: 0.16, dz: 0.015 },
  puppy: { sx: 1.2, sy: 1.3, tilt: -0.22, dz: 0.015 },
};

// Petal Lip tints: a soft upper and lower lip, a little wider than the
// model's own small mouth so the colour reads from the street.
export function buildLips(color, at) {
  const g = new THREE.Group();
  g.name = 'lips';
  const m = new THREE.MeshLambertMaterial({ color });
  const upper = new THREE.Mesh(sphere(1, 18, 10), m);
  upper.scale.set(0.17, 0.045, 0.06);
  upper.position.set(0, 0.035, 0);
  const lower = new THREE.Mesh(sphere(1, 18, 10), m);
  lower.scale.set(0.15, 0.055, 0.065);
  lower.position.set(0, -0.035, 0);
  g.add(upper, lower);
  g.position.copy(at);
  return g;
}
