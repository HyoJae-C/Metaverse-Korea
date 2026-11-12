import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAITS, BAIT_PACK, BAIT_DAILY, BaitHook, baitById, baitEntry, kstDay } from '../src/core/bait.js';
import { AVAILABLE_FISH, PARK_FISH, baitedChance, chanceAt, luckyChance, rollCatch, TRASH } from '../src/core/fishing.js';
import { LocalBaitShop } from '../src/core/bait-shop.js';
import { cleanEntry } from '../src/core/bag.js';
import { HELD_KINDS } from '../src/core/held.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const tiers = (park, lucky, bait) => {
  const t = [0, 0, 0, 0, 0, 0];
  for (const f of AVAILABLE_FISH) t[f.rarity] += baitedChance(f, park, lucky, bait);
  return t;
};
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('three baits on top of the free one, five a pack, one pack of each a day (Yozi 2026-11-12)', () => {
  assert.deepEqual(BAITS.map((b) => b.id), ['mid', 'high', 'top']);
  assert.deepEqual(BAITS.map((b) => [b.rare, b.legend, b.price]), [[4, 0.1, 2500], [6, 0.2, 7500], [9, 1, 15000]]);
  assert.equal(BAIT_PACK, 5);
  assert.equal(BAIT_DAILY, 1);
  for (let i = 1; i < BAITS.length; i++) assert.ok(BAITS[i].rare > BAITS[i - 1].rare && BAITS[i].legend > BAITS[i - 1].legend);
});

test('a bait sets ★3+ and ★5 at every park, keeps ★2, and the odds still add up to 100%', () => {
  for (const park of [...Object.keys(PARK_FISH), null]) {
    for (const lucky of [false, true]) {
      const plain = tiers(park, lucky, null);
      for (const b of BAITS) {
        const t = tiers(park, lucky, b);
        close(t[3] + t[4] + t[5], b.rare, `${park} ${b.id} ★3+`);
        close(t[5], b.legend, `${park} ${b.id} ★5`);
        close(t[2], plain[2], `${park} ${b.id} ★2 kept`);
        close(t.reduce((a, c) => a + c, 0), 100, `${park} ${b.id} total`);
        close(t[4] / t[3], plain[4] / plain[3], `${park} ${b.id} ★3:★4`);
        assert.ok(t[3] + t[4] + t[5] > plain[3] + plain[4] + plain[5], 'better than without');
      }
    }
  }
  // Without a bait nothing changes.
  for (const f of AVAILABLE_FISH) {
    assert.equal(baitedChance(f, 'banpo-hangang', false, null), chanceAt(f, 'banpo-hangang'));
    assert.equal(baitedChance(f, 'banpo-hangang', true, null), luckyChance(f, 'banpo-hangang'));
  }
});

test('within a tier each kind keeps its share; other parks’ rare kinds still never bite', () => {
  const top = baitById('top');
  for (const f of AVAILABLE_FISH) {
    const base = chanceAt(f, 'mangwon-hangang');
    if (!base) assert.equal(baitedChance(f, 'mangwon-hangang', false, top), 0, f.id);
  }
  const whale = AVAILABLE_FISH.find((f) => f.id === 'whale'); // Ttukseom's legend
  close(baitedChance(whale, 'ttukseom-hangang', false, top), 1, 'whale with premium bait');
});

test('rollCatch with a bait lands the legend at the bait’s rate', () => {
  const top = baitById('top');
  // Walk the whole roll range in even steps: the share of legends is the bait's ★5 chance (after the boot).
  let legends = 0, rare = 0, n = 40000;
  for (let i = 0; i < n; i++) {
    const f = rollCatch(() => (i + 0.5) / n, false, 'ttukseom-hangang', 0, top);
    if (f !== TRASH && f.rarity === 5) legends++;
    if (f !== TRASH && f.rarity >= 3) rare++;
  }
  assert.ok(Math.abs(legends / n - 0.0096) < 0.0005, `legend ${legends / n}`);
  assert.ok(Math.abs(rare / n - 0.0864) < 0.001, `rare ${rare / n}`);
});

test('the hook: put a bait on, one a bite, what was on before comes back', () => {
  const s = memory();
  const h = new BaitHook(s);
  assert.equal(h.bait, null);
  assert.equal(h.use(), null); // plain bait: nothing used
  assert.equal(h.put({ kind: 'bait', b: 'mid', sips: 5 }), null);
  assert.equal(h.use().id, 'mid');
  assert.equal(new BaitHook(s).left, 4); // saved
  assert.deepEqual(h.put({ kind: 'bait', b: 'top', sips: 5 }), { kind: 'bait', b: 'mid', sips: 4 });
  for (let i = 0; i < 5; i++) assert.equal(h.use().id, 'top');
  assert.equal(h.bait, null);
  assert.equal(new BaitHook(s).bait, null);
  assert.equal(h.put({ kind: 'bait', b: 'nope', sips: 5 }), null);
  assert.equal(h.bait, null);
});

test('bait in the bag and the hand: only known baits, up to five', () => {
  assert.deepEqual(cleanEntry({ kind: 'bait', b: 'high', sips: 9 }), { kind: 'bait', b: 'high', sips: 5 });
  assert.equal(cleanEntry({ kind: 'bait', b: 'gold', sips: 3 }), null);
  assert.equal(cleanEntry({ kind: 'bait', b: 'top', sips: 0 }), null);
  assert.equal(baitEntry({ b: 'top', sips: 2 }).sips, 2);
  assert.ok(HELD_KINDS.includes('bait'));
});

test('the stall (offline): one pack of each a day, new stock at 00:00 KST, a retry charges once', async () => {
  let coins = 30000;
  const wallet = { spend: (n) => (coins >= n ? ((coins -= n), true) : false) };
  const shop = new LocalBaitShop(wallet, memory());
  const t0 = Date.parse('2026-11-12T14:30:00Z'); // 23:30 KST
  assert.equal(kstDay(t0), '2026-11-12');
  assert.deepEqual((await shop.info(t0)).bought, {});
  assert.deepEqual(await shop.buy({ requestId: 'a', b: 'top', price: 15000 }, null, t0), { charged: true });
  assert.deepEqual(await shop.buy({ requestId: 'a', b: 'top', price: 15000 }, null, t0), { charged: false }); // the same tap again
  assert.equal(coins, 15000);
  assert.deepEqual(await shop.buy({ requestId: 'b', b: 'top', price: 15000 }, null, t0), { error: 'limit' });
  assert.deepEqual(await shop.buy({ requestId: 'c', b: 'mid', price: 100 }, null, t0), { error: 'price', price: 2500 });
  assert.deepEqual(await shop.buy({ requestId: 'c', b: 'mid', price: 2500 }, null, t0), { charged: true });
  assert.deepEqual((await shop.info(t0)).bought, { top: 1, mid: 1 });
  const t1 = Date.parse('2026-11-12T15:00:00Z'); // 00:00 KST the next day
  assert.equal(kstDay(t1), '2026-11-13');
  assert.deepEqual((await shop.info(t1)).bought, {});
  assert.deepEqual(await shop.buy({ requestId: 'd', b: 'top', price: 15000 }, null, t1), { error: 'coins' });
  assert.deepEqual(await shop.buy({ requestId: 'e', b: 'high', price: 7500 }, null, t1), { charged: true });
});
