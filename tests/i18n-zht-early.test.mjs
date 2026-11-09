// 繁體中文 is made from the simplified Chinese file. Before that file has
// arrived (picked on the start screen, or a slow download), t() must fall
// back to English instead of throwing: it used to read STRINGS.zh[key] with
// no zh loaded, which broke the start screen and the HUD for 繁體 players.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { documentElement: {}, body: null, querySelectorAll: () => [] };

test('繁體 before the Chinese file arrives shows English, no crash', async () => {
  const { setLanguage, t, getLanguage } = await import('../src/core/i18n.js');
  assert.doesNotThrow(() => setLanguage('zht'));
  assert.equal(getLanguage(), 'zht');
  assert.equal(t('hud.online', { n: 3 }).length > 0, true);
});
