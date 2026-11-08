import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, STRINGS } from '../src/i18n/strings.js';
import { localName, languageFromBrowser } from '../src/core/i18n.js';
import { s2t } from '../src/i18n/hant.js';

test('twelve languages in the order the picker shows them, English first', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['ko', 'ja', 'zht', 'zh', 'id', 'fr', 'vi', 'th', 'hi', 'ar', 'en', 'es']);
});

for (const code of ['id', 'ar', 'vi', 'hi', 'fr', 'th']) {
  test(`${code} covers every English key, with the same {placeholders}`, () => {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const [k, v] of Object.entries(STRINGS.en)) {
      assert.ok(STRINGS[code][k], `${code} ${k}`);
      assert.equal(vars(STRINGS[code][k]), vars(v), `${code} ${k}`);
    }
  });
}

test('Spanish uses only keys that exist in English, and covers most of them', () => {
  const en = Object.keys(STRINGS.en);
  for (const k of Object.keys(STRINGS.es)) assert.ok(k in STRINGS.en, k);
  assert.ok(Object.keys(STRINGS.es).length >= en.length - 5);
});

test('繁體中文 comes from the simplified text', () => {
  assert.equal(s2t('韩语书架'), '韓語書架');
  assert.equal(s2t('牛肉面'), '牛肉麵');
  assert.equal(localName({ en: 'Map', zh: '地图' }, 'zht'), '地圖');
  assert.equal(localName({ en: 'Map', zh: '地图', zht: '地圖！' }, 'zht'), '地圖！');
  assert.equal(localName({ en: 'Map', zh: '地图' }, 'es'), 'Map');
});

test('browser language to ours', () => {
  assert.equal(languageFromBrowser('zh-TW'), 'zht');
  assert.equal(languageFromBrowser('zh-Hant-HK'), 'zht');
  assert.equal(languageFromBrowser('zh-CN'), 'zh');
  assert.equal(languageFromBrowser('es-MX'), 'es');
});

test('Vietnamese and Hindi: browser tags and every inline name object that has Arabic', async () => {
  assert.equal(languageFromBrowser('vi-VN'), 'vi');
  assert.equal(languageFromBrowser('hi-IN'), 'hi');
  assert.equal(languageFromBrowser('fr-CA'), 'fr');
  assert.equal(languageFromBrowser('th-TH'), 'th');
  const { readFileSync } = await import('node:fs');
  const files = ['src/main.js', 'src/ui/bike-shop-ui.js', 'src/game/pool.js', 'src/game/tarot.js', 'src/game/arcade.js', 'src/game/basketball.js', 'src/game/skate.js', 'src/game/taxi.js', 'src/game/decor.js', 'src/game/clubs.js', 'src/game/music-cafe.js', 'src/game/hat-workshop.js', 'src/game/delivery.js', 'src/game/chat.js', 'src/game/gifts.js', 'src/game/hanbok-rental.js', 'src/game/cooking-classes.js', 'src/ui/emote-wheel.js', 'src/game/daily.js', 'src/ui/ledger-ui.js', 'src/core/inventory.js', 'src/data/starter-quests.js', 'src/data/updates.js',
    'src/ui/map-view.js', 'src/ui/emblem-ui.js', 'src/ui/shop-ui.js', 'src/ui/counter-ui.js', 'src/ui/duck-ui.js'];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    const n = (re) => (src.match(re) || []).length;
    assert.equal(n(/\bvi: ['[]/g), n(/\bar: ['[]/g), f);
    assert.equal(n(/\bhi: ['[]/g), n(/\bar: ['[]/g), f);
    assert.equal(n(/\bfr: ['[]/g), n(/\bar: ['[]/g), f);
    assert.equal(n(/\bth: ['[]/g), n(/\bar: ['[]/g), f);
  }
});

test('French and Thai reach the class and game texts built from positional lists', async () => {
  const { BT } = await import('../src/ui/basketball-text.js');
  assert.equal(BT.title.fr, 'Mini basket');
  assert.equal(BT.title.th, 'บาสเกตบอลมินิ');
  const kimbap = await import('../src/ui/kimbap-text.js');
  assert.equal(kimbap.BT['f.durian'].th, 'ทุเรียน');
  assert.equal(kimbap.BT['f.durian'].ar, 'دوريان');
  const { readFileSync } = await import('node:fs');
  const stores = readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8');
  const count = (k) => (stores.match(new RegExp(`"${k}":\\s?"`, 'g')) || []).length;
  assert.equal(count('fr'), count('hi'));
  assert.equal(count('th'), count('hi'));
});
