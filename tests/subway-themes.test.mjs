import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUBWAY_THEMES, STATION_THEMES } from '../src/data/subway-themes.js';
import { STRINGS } from '../src/i18n/strings.js';

const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
const ids = region.subway.stations.filter((s) => s.exits?.length).map((s) => s.id);

test('every station with exits has a theme, and every theme key is a real station', () => {
  const themeIds = new Set(SUBWAY_THEMES.map((t) => t.id));
  for (const id of ids) assert.ok(STATION_THEMES[id]?.length, `${id} has no theme (it would show only under All)`);
  for (const [id, list] of Object.entries(STATION_THEMES)) {
    assert.ok(ids.includes(id), `${id} is not a station`);
    for (const t of list) assert.ok(themeIds.has(t), `${id}: unknown theme ${t}`);
  }
});

test('each theme tab has stations and a label in every language', () => {
  for (const t of SUBWAY_THEMES) {
    assert.ok(Object.values(STATION_THEMES).some((l) => l.includes(t.id)), `${t.id} is empty`);
    for (const [lang, s] of Object.entries(STRINGS)) assert.ok(s[t.key], `${lang} lacks ${t.key}`);
  }
});
