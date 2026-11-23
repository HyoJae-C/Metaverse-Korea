import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, RecipeBook, recipePage, recipeOf } from '../src/core/recipe-book.js';
import { EN } from '../src/i18n/en.js';
import { KO } from '../src/i18n/ko.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const dish = (g, q) => ({ kind: 'gift', sips: 1, name: g, icon: '🍱', g, q });

test('16 pages, the 5 cooking-class dishes cookable today', () => {
  assert.equal(RECIPES.length, 16);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, 16);
  assert.deepEqual(RECIPES.filter((r) => r.cook).map((r) => r.id).sort(), ['bibimbap', 'japchae', 'kimbap', 'kimchi', 'tteok']);
  for (const r of RECIPES) {
    assert.ok(EN['recipe.d.' + r.id], r.id);
    assert.ok(KO['recipe.d.' + r.id], r.id);
  }
});

test('bibim and mul naengmyeon share one page', () => {
  assert.equal(recipePage('bibimnaengmyeon'), 'naengmyeon');
  assert.equal(recipePage('mulnaengmyeon'), 'naengmyeon');
  const b = new RecipeBook(mem());
  assert.equal(b.cooked('bibimnaengmyeon', 80), true);
  assert.equal(b.cooked('mulnaengmyeon', 40), false);
  assert.equal(b.count('naengmyeon'), 2);
  assert.equal(b.kinds, 1);
});

test('cooking writes a page with the count and best medal, and it is saved', () => {
  const s = mem();
  const b = new RecipeBook(s);
  assert.equal(b.cooked('kimbap', 40), true);
  assert.equal(b.cooked('kimbap', 95), false);
  assert.equal(b.cooked('pizza', 95), false);
  assert.equal(b.count('kimbap'), 2);
  assert.equal(b.best('kimbap'), 'gold');
  const again = new RecipeBook(s);
  assert.equal(again.count('kimbap'), 2);
  assert.equal(again.total, 2);
});

test('dishes already in the bag fill the book once', () => {
  const s = mem();
  const b = new RecipeBook(s);
  b.fill([dish('japchae', 95), dish('japchae', 20), { kind: 'gift', icon: '🫙', name: 'Homemade kimchi' }, dish('mat', 0)]);
  assert.equal(b.count('japchae'), 2);
  assert.equal(b.best('japchae'), 'gold');
  assert.ok(b.has('kimchi'));
  assert.equal(b.kinds, 2);
  const later = new RecipeBook(s);
  later.fill([dish('kimbap', 90)]); // not a fresh book: nothing more
  assert.equal(later.has('kimbap'), false);
});

test('a bag entry from a class maps to its page', () => {
  assert.deepEqual(recipeOf(dish('tteok', 70)), { id: 'tteok', score: 70 });
  assert.equal(recipeOf(dish('frisbee', 1)), null);
});
