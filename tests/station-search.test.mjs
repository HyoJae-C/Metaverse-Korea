import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stationMatches } from '../src/core/station-search.js';
import { routeStationAt, routeLayout } from '../src/core/subway.js';
import { STRINGS } from '../src/i18n/strings.js';

const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
const stations = region.subway.stations.filter((s) => s.exits?.length);
const find = (q) => stations.filter((s) => stationMatches(s.name, q)).map((s) => s.id);

test('station search: English, Korean, Japanese, case, spaces and a typed suffix', () => {
  assert.deepEqual(find('myeongdong'), ['myeongdong-station']);
  assert.deepEqual(find('MYEONG dong station'), ['myeongdong-station']);
  assert.deepEqual(find('명동역'), ['myeongdong-station']);
  assert.deepEqual(find('明洞'), ['myeongdong-station']);
  assert.ok(find('seoul').includes('seoul-station'));
  assert.equal(find('').length, stations.length);
  assert.deepEqual(find('zzzz'), []);
});

test('station search: Korean while typing and by initial consonants', () => {
  assert.ok(find('며').includes('myeongdong-station')); // 명 not finished yet
  assert.ok(find('명ㄷ').includes('myeongdong-station'));
  assert.ok(find('설').includes('seoul-station')); // on the way to 서울
  assert.ok(find('ㅁㄷ').includes('myeongdong-station'));
  assert.ok(find('ㄱㄴ').includes('gangnam-station'));
});

test('a tap on the route map finds the station next to it', () => {
  const pts = routeLayout(stations);
  pts.forEach(([x, y], i) => {
    const nameX = x > 500 ? x + 120 : x - 120; // on the name, beside the dot
    assert.equal(routeStationAt(stations.length, nameX, y + 20), i);
    assert.equal(routeStationAt(stations.length, x, y), i);
  });
  assert.equal(routeStationAt(stations.length, 500, -500), -1);
});

test('the new station picker strings exist in every language', () => {
  for (const [lang, s] of Object.entries(STRINGS)) {
    if (!s['metro.recent']) continue; // a language that falls back to English
    for (const k of ['metro.search', 'metro.tab.map', 'metro.mapTap', 'metro.none']) assert.ok(s[k], `${lang} lacks ${k}`);
  }
});
