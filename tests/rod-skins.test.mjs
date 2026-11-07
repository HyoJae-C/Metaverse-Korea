import test from 'node:test';
import assert from 'node:assert/strict';
import { ROD_SKINS, RodSkins, rodKind, rodSkin } from '../src/core/rod-skins.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const wallet = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } });

test('rod skins: free basic, rising prices, names in four languages', () => {
  assert.equal(ROD_SKINS[0].id, 'basic');
  assert.equal(ROD_SKINS[0].price, 0);
  for (let i = 1; i < ROD_SKINS.length; i++) assert.ok(ROD_SKINS[i].price > ROD_SKINS[i - 1].price, ROD_SKINS[i].id);
  for (const s of ROD_SKINS) for (const l of ['ko', 'en', 'ja', 'zh']) assert.ok(s.name[l], `${s.id} ${l}`);
  assert.equal(rodKind('basic'), 'rod');
  assert.equal(rodKind('gold'), 'rod:gold');
  assert.equal(rodKind('nope'), 'rod');
  assert.equal(rodSkin('nope').id, 'basic');
});

test('buying spends once, wears it, and is remembered; short of coins buys nothing', () => {
  const st = store();
  const r = new RodSkins(st);
  const w = wallet(100);
  assert.equal(r.buy('gold', w), false);
  assert.equal(w.coins, 100);
  assert.equal(r.equipped, 'basic');
  assert.equal(r.buy('bamboo', w), true);
  assert.equal(w.coins, 50);
  assert.equal(r.equipped, 'bamboo');
  assert.equal(r.equip('basic'), true);
  assert.equal(r.buy('bamboo', w), true); // already owned: wearing it again is free
  assert.equal(w.coins, 50);
  assert.equal(r.equip('aurora'), false);
  const again = new RodSkins(st);
  assert.ok(again.has('bamboo'));
  assert.equal(again.equipped, 'bamboo');
});
