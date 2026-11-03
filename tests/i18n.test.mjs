import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, STRINGS } from '../src/i18n/strings.js';
import { localName, languageFromBrowser } from '../src/core/i18n.js';
import { s2t } from '../src/i18n/hant.js';

test('eight languages in the order the picker shows them, English first', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['en', 'es', 'ko', 'zh', 'zht', 'id', 'ar', 'ja']);
});

for (const code of ['id', 'ar']) {
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
