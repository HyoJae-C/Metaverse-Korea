// Myeongdong's shops stand by real shops of their kind: cosmetics where the
// real ones crowd (8-gil and Myeongdong-gil), restaurants north of the
// crossing, by the Chinese embassy and up 10-gil (Yozi 2026-11-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHOPS } from '../scripts/build-myeongdong.mjs';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;

test('each Myeongdong shop is within 15 m of the real shop it stands for (or says why)', () => {
  for (const sh of SHOPS) {
    const s = stores.find((q) => q.id === sh.id);
    assert.ok(s, sh.id);
    assert.equal(s.district, 'myeongdong', sh.id);
    const d = Math.hypot(s.at[0] - sh.near[0], s.at[1] - sh.near[1]);
    assert.ok(d < (sh.within || 15) + 0.1, `${sh.id}: ${d.toFixed(1)} m from ${sh.real}`);
  }
});

test('more cosmetics than restaurants: the carts are the street food', () => {
  const cat = (c) => SHOPS.filter((sh) => stores.find((q) => q.id === sh.id).category === c).length;
  assert.ok(cat('beauty') >= 6, 'cosmetics');
  assert.ok(cat('restaurant') >= 2 && cat('restaurant') < cat('beauty'), 'restaurants');
});

test('the shops right by the yard south-west stay low, so the cathedral shows from 10-gil', () => {
  // (Yozi 2026-11-11: the one beside the yard hid the cathedral from the station side.)
  const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/myeongdong.json', import.meta.url)));
  const yard = map.areas.find((a) => a.k === 'plaza').p;
  const seg = (q, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz); };
  const toYard = (q) => Math.min(...yard.map((a, i) => seg(q, a, yard[(i + 1) % yard.length])));
  const near = map.buildings.filter((b) => !b.custom).map((b) => ({ h: b.h, c: [b.p.reduce((t, q) => t + q[0], 0) / b.p.length, b.p.reduce((t, q) => t + q[1], 0) / b.p.length] }))
    .filter((b) => b.c[1] > 10 && toYard(b.c) < 9);
  assert.ok(near.length >= 1);
  for (const b of near) assert.ok(b.h <= 5, `${b.c.map((v) => v.toFixed(0))}: ${b.h} m`);
});
