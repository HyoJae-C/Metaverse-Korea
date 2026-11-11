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
