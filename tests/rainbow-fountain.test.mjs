import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fountainAt, nextFountain, nightAt, jetAt, sceneAt, nearBridge, BRIDGE, SCENES, MOVES,
  SHOW_SECONDS, DUSK_SECONDS, DAWN_SECONDS, NOTICE_SECONDS, FINALE, SKIP_HOURS_KST,
} from '../src/core/rainbow-fountain.js';
import { FIREWORKS_HOURS_KST, SHOW_SECONDS as FIREWORKS_SECONDS } from '../src/core/fireworks-show.js';
import { TRACKS } from '../src/data/tracks.js';
import { STRINGS } from '../src/i18n/strings.js';

const KST = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

test('a 20-minute show at half past the hour, Korean time', () => {
  const start = KST(2026, 11, 9, 19, 30);
  assert.equal(fountainAt(start - (NOTICE_SECONDS + 5) * 1000), null, 'nothing before the notice');
  assert.equal(fountainAt(start - NOTICE_SECONDS * 1000 + 1000).start, start, 'the one-minute notice');
  const mid = fountainAt(start + 600e3);
  assert.ok(mid.on && mid.night === 1);
  assert.ok(!fountainAt(start + (SHOW_SECONDS + 5) * 1000).on, 'the jets stop after 20 minutes');
  assert.equal(fountainAt(start + (SHOW_SECONDS + DAWN_SECONDS + 1) * 1000), null);
  assert.equal(fountainAt(KST(2026, 11, 9, 19, 5)), null, 'nothing at five past');
  assert.equal(nextFountain(KST(2026, 11, 9, 19, 5)), start);
});

test('never while the Yeouido fireworks are on', () => {
  assert.deepEqual(SKIP_HOURS_KST, FIREWORKS_HOURS_KST);
  for (const h of FIREWORKS_HOURS_KST) {
    for (let m = 0; m < FIREWORKS_SECONDS / 60; m += 5) assert.ok(!fountainAt(KST(2026, 11, 9, h, m))?.on, `${h}:${m}`);
    assert.equal(nextFountain(KST(2026, 11, 9, h, 10)), KST(2026, 11, 9, h + 1, 30), 'the next one is after the fireworks');
  }
  // Every other hour has one: 22 shows a day.
  let n = 0;
  for (let h = 0; h < 24; h++) if (fountainAt(KST(2026, 11, 9, h, 40))?.on) n++;
  assert.equal(n, 22);
});

test('the sky round the bridge darkens before and brightens after, smoothly', () => {
  assert.equal(nightAt(-DUSK_SECONDS - 1), 0);
  assert.equal(nightAt(0), 1);
  assert.equal(nightAt(SHOW_SECONDS + DAWN_SECONDS + 1), 0);
  let prev = 0;
  for (let t = -DUSK_SECONDS; t <= 0; t += 1) { const v = nightAt(t); assert.ok(v >= prev); prev = v; }
});

test('the jets: off outside the show, come up gently, every move used, a full rainbow finale', () => {
  const n = 46, j = {};
  assert.equal(jetAt(-1, 0, n, j).reach, 0);
  assert.equal(jetAt(SHOW_SECONDS, 0, n, j).reach, 0);
  assert.ok(jetAt(0.5, 10, n, j).reach < 0.1, 'the first second is gentle');
  const seen = new Set();
  for (let t = 0; t < SHOW_SECONDS; t += 0.5) {
    seen.add(sceneAt(t).scene.move);
    for (let k = 0; k < n; k += 9) {
      jetAt(t, k, n, j);
      assert.ok(j.reach >= 0 && j.reach <= 1 && j.hue >= 0 && j.hue < 1 && j.sat >= 0 && j.sat <= 1, `t ${t} jet ${k}`);
    }
  }
  assert.deepEqual([...seen].sort(), [...MOVES].sort());
  // The finale: every jet near full strength, in different colours.
  const hues = new Set();
  for (let k = 0; k < n; k++) { jetAt(FINALE[0] + 20, k, n, j); assert.ok(j.reach > 0.85); hues.add(Math.round(j.hue * 6) % 6); }
  assert.ok(hues.size >= 5, 'the whole rainbow along the bridge');
  // Changes between scenes blend: no jet jumps by much in a twentieth of a second.
  for (let t = 0.05; t < SHOW_SECONDS; t += 0.05) for (const k of [0, 23]) {
    const a = jetAt(t - 0.05, k, n, {}).reach, b = jetAt(t, k, n, {}).reach;
    if (Math.abs(t - FINALE[0]) > 0.1) assert.ok(Math.abs(a - b) < 0.25, `t ${t.toFixed(2)} jet ${k}: ${a} -> ${b}`);
  }
  assert.ok(SCENES.every((s) => s.len >= 30), 'each scene long enough to watch');
});

test('it is on Banpo Bridge, and its night reaches the park lawn but not Itaewon', () => {
  const region = read('region.json');
  const district = region.districts.find((d) => d.id === 'banpo-jamwon');
  const map = read(district.map);
  const jamsu = map.landmarks.find((l) => l.type === 'jamsu');
  assert.ok(Math.hypot(jamsu.x + district.offset[0] - BRIDGE.x, jamsu.z + district.offset[1] - BRIDGE.z) < 1, 'BRIDGE is the jamsu landmark');
  const park = map.landmarks.find((l) => l.type === 'hanpark' && l.store === 'banpo-jamwon-hangang');
  assert.ok(nearBridge(park.x + district.offset[0], park.z + district.offset[1]) > 0.99, 'Moonlight Square (the park on the street) sees the show');
  const itaewon = region.districts.find((d) => d.id === 'itaewon');
  assert.equal(nearBridge(...itaewon.offset), 0, 'Itaewon Station keeps its day');
  const sign = map.landmarks.find((l) => l.type === 'sign' && l.title?.en === 'Moonlight Rainbow Fountain');
  assert.ok(sign && /April to October/.test(sign.text.en) && sign.text.ko && sign.text.ja && sign.text.zh, 'a board with the real season');
});

test('its music and notices', () => {
  const track = TRACKS.find((x) => x.id === 'rainbowfountain');
  assert.ok(track?.hidden, 'its own music, not in the record list');
  for (const k of ['fountain.soon', 'fountain.on', 'fountain.photo', 'fountain.next']) assert.ok(STRINGS.en[k] && STRINGS.ko[k], k);
  assert.match(STRINGS.en['fountain.next'], /\{min\}/);
});
