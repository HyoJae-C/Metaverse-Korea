// 물광 from the Gangnam skin clinic (Yozi 2026-11-27): one treatment, 7 days
// of shine, carried in the look so everyone sees it (core/glow.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : /Gradient|Pattern/.test(k) ? () => grad : /ImageData/.test(k) ? () => ({ data: new Uint8ClampedArray(4 * 64 * 64) }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const el = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {} } });
globalThis.document = { createElement: el, createElementNS: el, getElementById: () => null, body: el() };

const { GLOW_MS, DAY_MS, GLOW_PRICE, glowLeft, glowDays, canTreat, treated, glowOver } = await import('../src/core/glow.js');
const { sanitizeLook } = await import('../src/data/appearance.js');
const { buildInterior } = await import('../src/core/interior.js');
const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8')).stores;

test('a treatment shines for 7 days, then it is over', () => {
  const now = Date.UTC(2026, 10, 27, 5);
  const look = treated({ skin: 'fair' }, now);
  assert.equal(look.glow, now + GLOW_MS);
  assert.equal(glowDays(look, now), 7);
  assert.equal(glowDays(look, now + GLOW_MS - 1), 1);
  assert.equal(glowLeft(look, now + GLOW_MS), 0);
  assert.equal(glowOver(look, now + GLOW_MS - 1), null);
  assert.deepEqual(glowOver(look, now + GLOW_MS), { skin: 'fair', glow: null });
  assert.equal(glowOver({ skin: 'fair' }, now), null);
});

test('a new treatment only in the last day, so days are not thrown away', () => {
  const now = Date.UTC(2026, 10, 27, 5);
  const look = treated({}, now);
  assert.equal(canTreat({}, now), true);
  assert.equal(canTreat(look, now), false);
  assert.equal(canTreat(look, now + GLOW_MS - DAY_MS - 1), false);
  assert.equal(canTreat(look, now + GLOW_MS - DAY_MS), true);
  assert.ok(GLOW_PRICE > 0);
});

test('the look keeps a shine that is on, and drops one over or too far off (edited saves, wrong clocks)', () => {
  const now = Date.now();
  assert.equal(sanitizeLook({ glow: now + DAY_MS }).glow, now + DAY_MS);
  assert.equal(sanitizeLook({ glow: now - 1 }).glow, null);
  assert.equal(sanitizeLook({ glow: now + GLOW_MS * 3 }).glow, null);
  assert.equal(sanitizeLook({ glow: 'soon' }).glow, null);
  assert.equal(sanitizeLook({}).glow, null);
});

test('the skin clinic is in Gangnam by the two cosmetic clinics, with treatment beds under LED lamps', () => {
  const s = stores.find((x) => x.workshop === 'derm');
  assert.equal(s.district, 'gangnam');
  for (const id of ['bitna-clinic', 'saebom-clinic']) {
    const c = stores.find((x) => x.id === id);
    assert.ok(Math.hypot(c.at[0] - s.at[0], c.at[1] - s.at[1]) < 60, `by ${id}`);
  }
  const room = buildInterior(s);
  const beds = room.seats.filter((q) => q.derm);
  assert.equal(beds.length, 3);
  for (const b of beds) {
    assert.ok(b.lie && b.lamp?.length === 3);
    assert.ok(Math.hypot(b.lamp[0] - b.x, b.lamp[2] - (b.z - 1)) < 0.3, 'the lamp is over the pillow');
  }
});
