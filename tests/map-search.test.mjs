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

test('search ignores case, spaces and dashes; districts have a centre for the edge badges', async () => {
  const { storeMatches: m, districtCentres } = await import('../src/ui/map-view.js');
  const store = { category: 'cafe', name: { en: 'Nyang Nyang Cafe', ko: '냥냥카페' } };
  for (const q of ['NYANG', 'nyangnyang', 'Nyang-Nyang', 'CAFE', '냥냥 카페']) assert.ok(m(store, q), q);
  const map = { meta: { districts: [{ id: 'seongsu' }, { id: 'itaewon' }] }, buildings: [
    { d: 'seongsu', p: [[0, 0], [10, 20]] }, { d: 'itaewon', p: [[-1300, 380], [-1280, 400]] }] };
  const c = districtCentres(map);
  assert.deepEqual(c.map((d) => [d.id, d.x, d.z]), [['seongsu', 5, 10], ['itaewon', -1290, 390]]);
  assert.equal(c[1].name.ko, '이태원');
});
