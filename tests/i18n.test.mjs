import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, STRINGS } from '../src/i18n/strings.js';
import { localName, languageFromBrowser } from '../src/core/i18n.js';
import { s2t } from '../src/i18n/hant.js';

test('ten languages in the order the picker shows them, English first', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['en', 'es', 'ko', 'zh', 'zht', 'id', 'vi', 'hi', 'ar', 'ja']);
});

for (const code of ['id', 'ar', 'vi', 'hi']) {
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
  const { readFileSync } = await import('node:fs');
  const files = ['src/main.js', 'src/ui/bike-shop-ui.js', 'src/game/pool.js', 'src/game/tarot.js', 'src/game/arcade.js', 'src/game/basketball.js', 'src/game/skate.js', 'src/core/inventory.js', 'src/data/starter-quests.js', 'src/data/updates.js',
    'src/ui/map-view.js', 'src/ui/emblem-ui.js', 'src/ui/shop-ui.js', 'src/ui/counter-ui.js', 'src/ui/duck-ui.js'];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    const n = (re) => (src.match(re) || []).length;
    assert.equal(n(/\bvi: ['[]/g), n(/\bar: ['[]/g), f);
    assert.equal(n(/\bhi: ['[]/g), n(/\bar: ['[]/g), f);
  }
});
