import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installMode, isIOS, shouldNudge, NUDGE_GAP_MS } from '../src/core/install.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const KAKAO = `${IPHONE} KAKAOTALK 10.8.0`;
const INSTA = `${ANDROID} Instagram 350.0.0.0`;
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

test('which install guide fits the browser', () => {
  assert.equal(installMode({ ua: IPHONE }), 'ios');
  assert.equal(installMode({ ua: IPAD_DESKTOP, platform: 'MacIntel', touchPoints: 5 }), 'ios');
  assert.equal(installMode({ ua: IPAD_DESKTOP, platform: 'MacIntel', touchPoints: 0 }), 'desktop');
  assert.equal(installMode({ ua: ANDROID }), 'android');
  assert.equal(installMode({ ua: ANDROID, canPrompt: true }), 'prompt');
  assert.equal(installMode({ ua: KAKAO }), 'inapp');
  assert.equal(installMode({ ua: INSTA, canPrompt: true }), 'inapp');
  assert.equal(installMode({ ua: WIN }), 'desktop');
  assert.equal(installMode({ ua: WIN, canPrompt: true }), 'prompt');
  assert.equal(installMode({ ua: IPHONE, standalone: true }), 'installed');
  assert.ok(isIOS(IPHONE));
});

test('the home screen nudge shows on phones a couple of times at most', () => {
  const now = Date.now();
  assert.equal(shouldNudge({ mode: 'ios', touch: true, now }), true);
  assert.equal(shouldNudge({ mode: 'ios', touch: false, now }), false);
  assert.equal(shouldNudge({ mode: 'installed', touch: true, now }), false);
  assert.equal(shouldNudge({ mode: 'android', touch: true, done: true, now }), false);
  assert.equal(shouldNudge({ mode: 'android', touch: true, shown: 1, lastAt: now - 1000, now }), false);
  assert.equal(shouldNudge({ mode: 'android', touch: true, shown: 1, lastAt: now - NUDGE_GAP_MS, now }), true);
  assert.equal(shouldNudge({ mode: 'prompt', touch: true, shown: 2, lastAt: 1, now }), false);
});

test('the web app manifest has what browsers need to install it', () => {
  const m = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.name, 'Another Seoul');
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, './');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
});

test('the service worker never touches other sites (Supabase, Google sign-in)', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /url\.origin !== self\.location\.origin\) return/);
  assert.match(sw, /req\.method !== 'GET'\) return/);
  // network-first really asks the server, past Pages' 10-minute browser cache
  assert.match(sw, /fetch\(req, \{ cache: 'no-cache' \}\)/);
});
