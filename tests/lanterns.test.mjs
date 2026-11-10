import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WISH, WISHES, WISH_COLORS, lanternAt, ambientLanterns, encodeLantern, decodeLantern, canFloat, wishFrom, wishTo, muralSign, FIGURE_KINDS, BANCHADO, banchadoPanels } from '../src/core/lanterns.js';
import { FURNITURE, LAMP_IDS } from '../src/core/furniture.js';
import { ITEMS } from '../src/core/inventory.js';
import { usable } from '../src/ui/shop-ui.js';

const g = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const s = g.streams[0];
const ww = s.water / 2;
const now = 1_800_000_000;

test('the festival data: known figures in the water, clear of the stones and the bridge decks', () => {
  const f = s.lanterns;
  assert.ok(f.figures.length >= 4);
  for (const x of f.figures) {
    assert.ok(FIGURE_KINDS.includes(x.kind), x.kind);
    assert.ok(x.u > 4 && x.u < s.len - 4);
    for (const st of s.stones) assert.ok(Math.abs(x.u - st.u) > 5, `figure on the stones at ${x.u}`);
    for (const b of s.bridges) assert.ok(Math.abs(x.u - b.u) > b.w / 2 + 2, `figure under ${b.name.en}`);
  }
  // The mural, the tunnel and the wish corner don't overlap, and stairs don't cut through the mural or tunnel.
  const spans = [f.mural, f.tunnel, f.wish].sort((p, q) => p.from - q.from);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i - 1].to < spans[i].from, 'festival corners overlap');
  // Nor do they run under a bridge.
  for (const c of spans) for (const b of s.bridges) assert.ok(c.to < b.u - b.w / 2 || c.from > b.u + b.w / 2, `under ${b.name.en}`);
  for (const st of s.stairs) {
    const [a, b] = [Math.min(st.u, st.u + st.dir * 12), Math.max(st.u, st.u + st.dir * 12)];
    if (st.side === f.mural.side) assert.ok(b < f.mural.from || a > f.mural.to, 'a stair through the mural');
    if (st.side === f.tunnel.side) assert.ok(b < f.tunnel.from || a > f.tunnel.to, 'a stair through the tunnel');
  }
  assert.ok(muralSign(s).u < f.mural.from);
});

test('a wish lantern drifts east, comes to rest by the east end, spreads across the water and fades', () => {
  const L = { id: 'abc123', c: 2, w: 1, u0: wishFrom(s) + 2, v: 3.4, t0: now };
  assert.equal(lanternAt(s, L, now - 1), null);
  const a = lanternAt(s, L, now + 10), b = lanternAt(s, L, now + 40);
  assert.ok(b.u > a.u && a.moving);
  const rest = lanternAt(s, L, now + WISH.life - 5);
  assert.ok(!rest.moving && rest.u > wishTo(s) - 20 && rest.u < wishTo(s) - 2);
  assert.ok(Math.abs(rest.v) < ww);
  assert.equal(lanternAt(s, L, now + WISH.life + 1), null);
});

test('lanterns float by on their own, the same for everyone, and spread out at the end', () => {
  const a = ambientLanterns(s, now);
  assert.ok(a.length >= WISH.life / WISH.every - 1 && a.length <= WISH.life / WISH.every + 1);
  assert.deepEqual(a, ambientLanterns(s, now));
  const stops = a.map((L) => lanternAt(s, L, now)).filter((x) => !x.moving).map((x) => x.u);
  assert.ok(new Set(stops.map((u) => Math.round(u))).size > stops.length / 2, 'they pile up on one spot');
  for (const L of a) { assert.ok(WISH_COLORS[L.c] && WISHES[L.w]); }
});

test("another player's lantern: round trip, and junk is dropped", () => {
  const L = { id: 'k3j9x0', c: 4, w: 7, u0: wishFrom(s) + 5, v: -3.4, t0: now - 30 };
  assert.deepEqual(decodeLantern(encodeLantern(L), s, now), { ...L, u0: +L.u0.toFixed(1), v: +L.v.toFixed(2) });
  for (const bad of [null, 42, '', 'x|1|1', 'a b|1|1|420|0|' + now, `id|99|1|420|0|${now}`, `id|1|99|420|0|${now}`, `id|1|1|10|0|${now}`, `id|1|1|420|40|${now}`,
    `id|1|1|420|0|${now + 3600}`, `id|1|1|420|0|${now - WISH.life - 10}`, 'x'.repeat(80)]) assert.equal(decodeLantern(bad, s, now), null, String(bad));
});

test('you can float one only from the walkway by the water in the wish corner', () => {
  const from = wishFrom(s);
  assert.ok(canFloat(s, from + 10, ww + 1));
  assert.ok(canFloat(s, from + 10, -ww - 1));
  assert.ok(!canFloat(s, from - 10, ww + 1)); // before the corner
  assert.ok(!canFloat(s, from + 10, 0)); // in the water
  assert.ok(!canFloat(s, from + 10, ww + 5)); // by the wall
});

test('every lamp is furniture, an item and sold in exactly one lighting shop', () => {
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  const sold = stores.flatMap((st) => (st.products || []).filter((p) => p.furniture).map((p) => [st, p]));
  assert.equal(sold.length, LAMP_IDS.length);
  for (const [id] of LAMP_IDS) {
    assert.ok(FURNITURE.find((f) => f.id === id && f.item === id), id);
    assert.ok(ITEMS[id]?.lamp, id);
    assert.equal(sold.filter(([, p]) => p.furniture === id).length, 1, id);
  }
  for (const [st, p] of sold) {
    assert.ok(usable(p), p.id);
    assert.ok(p.name?.en && p.name?.ko && p.desc?.en && p.price > 0, p.id);
    assert.ok(st.products.every((q) => q.furniture), `${st.id} sells something that isn't a lamp`);
  }
});

test('the procession panels fill the wall in order, with gaps, keeping each segment roughly its shape', () => {
  const len = 94, h = 2.1, gap = 0.16;
  const ps = banchadoPanels(len, h, gap);
  assert.equal(ps.length, BANCHADO.rows.length);
  assert.equal(ps[0][0], 0);
  for (let i = 1; i < ps.length; i++) assert.ok(Math.abs(ps[i][0] - (ps[i - 1][0] + ps[i - 1][1] + gap)) < 1e-9);
  const last = ps.at(-1);
  assert.ok(Math.abs(last[0] + last[1] - len) < 1e-9);
  ps.forEach(([, w], i) => { const shape = (h * BANCHADO.w) / BANCHADO.rows[i][1]; assert.ok(w / shape > 0.85 && w / shape < 1.15, `panel ${i} stretched`); });
  // The rows tile the atlas image top to bottom.
  let y = 0;
  for (const [ry, rh] of BANCHADO.rows) { assert.equal(ry, y); y += rh; }
  assert.equal(y, BANCHADO.h);
});
