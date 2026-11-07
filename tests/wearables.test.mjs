import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS, isWorn } from '../src/core/inventory.js';
import { sanitizeLook, DEFAULT_LOOK } from '../src/data/appearance.js';
import { comingSoon } from '../src/ui/shop-ui.js';
import { storeIcon } from '../src/core/store-icons.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;

test('every shop product to wear is a real item that a look keeps (also over the network)', () => {
  let n = 0;
  for (const s of stores) for (const p of s.products || []) {
    const id = p.item || p.outfit;
    if (!id) continue;
    n++;
    const it = ITEMS[id];
    assert.ok(it?.wear && it.price > 0 && it.name?.en && it.name?.ko, `${s.id}/${p.id}: ${id}`);
    const look = sanitizeLook({ ...DEFAULT_LOOK, ...it.wear });
    assert.ok(isWorn(it, look), `${id} survives sanitizeLook`);
    if (it.off) assert.ok(!isWorn(it, sanitizeLook({ ...look, ...it.off })), `${id} comes off`);
  }
  assert.ok(n >= 70, `${n} products to wear`);
});

test('the clothes and accessory shops are open; one icon per kind of shop', () => {
  for (const id of ['monoroom', 'denim-lab', 'cloud-steps', 'gaeul-vintage', 'wide-pants', 'tteugae-knit', 'cap-yard', 'canvas-room', 'sudo-shoes', 'ttoryeot-optical', 'banjjak-earrings', 'ear-candy', 'graffiti-caps', 'street-kick', 'vintage-garage', 'hat-atelier']) {
    const s = stores.find((x) => x.id === id);
    assert.ok(s && !comingSoon(s), `${id} is open`);
  }
  assert.ok(stores.every((s) => !s.icon), 'no per-shop icons');
  for (const c of ['fashion', 'restaurant', 'cafe']) assert.equal(new Set(stores.filter((s) => s.category === c && !s.perfumery).map(storeIcon)).size, 1, c);
});
