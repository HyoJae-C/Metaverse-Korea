import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeMatches } from '../src/ui/map-view.js';

const bunsik = {
  category: 'restaurant',
  name: { ko: '떡잎 분식', en: 'Ddeokip Bunsik' },
  tagline: { en: 'Korean snack bar' },
  products: [{ name: { en: 'Tteokbokki', ko: '떡볶이' } }],
};

test('search matches names in any language, products and category, ignoring case and spaces', () => {
  assert.ok(storeMatches(bunsik, 'ddeokip', null));
  assert.ok(storeMatches(bunsik, '떡잎분식', null));
  assert.ok(storeMatches(bunsik, 'TTEOKBOKKI', null));
  assert.ok(storeMatches(bunsik, '떡볶이', null));
  assert.ok(storeMatches(bunsik, 'restaurant', null, 'Restaurant'));
  assert.ok(storeMatches(bunsik, '식당', null, '식당'));
  assert.ok(!storeMatches(bunsik, 'lipstick', null));
});

test('category filter', () => {
  assert.ok(storeMatches(bunsik, '', 'restaurant'));
  assert.ok(!storeMatches(bunsik, '', 'cafe'));
  assert.ok(storeMatches(bunsik, '', null));
});
