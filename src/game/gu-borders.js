// Gu (district) borders on the street: a purple line on the ground where two
// gu meet (seoul.json borders, from OpenStreetMap's admin_level=6 outlines;
// scripts/build-seoul.mjs), the same purple as on the map.
//
// Light on purpose: the line is a flat ribbon cut into 400 m tiles, one mesh
// each, and tiles past 300 m are hidden (the fog hides them anyway), checked
// four times a second.
import * as THREE from 'three';
import { inPoly } from '../core/geom.js';
import { GU_BORDER_COLOR } from '../ui/map-view.js';

const TILE = 400; // m
const SHOW_M = 300; // tiles nearer than this (to their nearest edge) are drawn
const STEP = 4; // m between points, so the line follows hills
const HALF_W = 0.35; // m: a 70 cm line
const LIFT = 0.1; // m above the ground: over roads (4–6 cm) and crossings

// Points every `step` m along a line.
export function densify(line, step = STEP) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

// The gu at (x, z), or null (outside Seoul, or no overview).
export function guAt(seoul, x, z) {
  for (const d of seoul?.gu || []) if (inPoly(x, z, d.p)) return d;
  return null;
}

// game: { scene, seoul, groundY(x, z), getMe() → { x, z }, onStreet() → bool }
export function createGuBorders(game) {
  const { seoul } = game;
  const group = new THREE.Group();
  group.name = 'gu-borders';
  const mat = new THREE.MeshBasicMaterial({ color: GU_BORDER_COLOR, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // Quads by tile: { key: { pos: [], x0, z0 } }
  const tiles = new Map();
  for (const raw of seoul?.borders || []) {
    const p = densify(raw);
    const ys = p.map(([x, z]) => (game.groundY?.(x, z) || 0) + LIFT);
    // Each point's sideways offset: across the average of its two segments.
    const side = p.map((q, i) => {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      return [(-dz / L) * HALF_W, (dx / L) * HALF_W];
    });
    for (let i = 1; i < p.length; i++) {
      const mx = (p[i - 1][0] + p[i][0]) / 2, mz = (p[i - 1][1] + p[i][1]) / 2;
      const key = Math.floor(mx / TILE) + ',' + Math.floor(mz / TILE);
      if (!tiles.has(key)) tiles.set(key, { pos: [], x0: Math.floor(mx / TILE) * TILE, z0: Math.floor(mz / TILE) * TILE });
      const t = tiles.get(key).pos;
      const v = (j, s) => [p[j][0] + side[j][0] * s, ys[j], p[j][1] + side[j][1] * s];
      const a = v(i - 1, 1), b = v(i - 1, -1), c = v(i, 1), d = v(i, -1);
      // Two triangles facing up.
      t.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
  }
  const meshes = [];
  for (const { pos, x0, z0 } of tiles.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.matrixAutoUpdate = false;
    m.renderOrder = 1;
    m.visible = false;
    group.add(m);
    meshes.push({ m, x0, z0 });
  }
  game.scene.add(group);

  let timer = 0;
  function update(dt) {
    timer -= dt;
    if (timer > 0) return;
    timer = 0.25;
    const street = game.onStreet();
    group.visible = street;
    if (!street) return;
    const { x, z } = game.getMe();
    for (const t of meshes) {
      const dx = Math.max(t.x0 - x, 0, x - t.x0 - TILE), dz = Math.max(t.z0 - z, 0, z - t.z0 - TILE);
      t.m.visible = dx * dx + dz * dz < SHOW_M * SHOW_M;
    }
  }

  return { update, group, guAt: (x, z) => guAt(seoul, x, z) };
}
