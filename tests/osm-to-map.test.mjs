import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { osmToMap, makeProjector } from '../scripts/lib/osm-to-map.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/overpass-mini.json', import.meta.url)));
const region = { id: 'test', center: { lat: 37.5446, lon: 127.0557 } };

test('projector puts centre at origin, east is +x, north is -z', () => {
  const p = makeProjector(region.center);
  assert.deepEqual(p.toLocal(37.5446, 127.0557), [0, 0]);
  const [x] = p.toLocal(37.5446, 127.0567);
  assert.ok(x > 85 && x < 90, `x=${x}`);
  const [, z] = p.toLocal(37.5456, 127.0557);
  assert.ok(z < -110 && z > -112, `z=${z}`);
});

test('converts roads, buildings, rail and stations', () => {
  const m = osmToMap(fixture, region);
  assert.equal(m.roads.length, 1, 'tunnel footway is skipped');
  assert.equal(m.roads[0].n.en, 'Yeonmujang-gil');
  assert.equal(m.roads[0].w, 10);
  assert.equal(m.buildings.length, 1);
  assert.equal(m.buildings[0].p.length, 4, 'closing node removed');
  assert.equal(m.buildings[0].h, 12.8);
  assert.equal(m.rail[0].e, 1);
  assert.equal(m.pois[0].name.en, 'Seongsu');
  assert.match(m.meta.attribution, /OpenStreetMap/);
});

test('clips long roads to the region bbox plus margin', () => {
  const f = { elements: [
    { type: 'node', id: 1, lat: 37.5446, lon: 127.0557 },
    { type: 'node', id: 2, lat: 37.5446, lon: 127.0600 },
    { type: 'node', id: 3, lat: 37.5446, lon: 127.1000 },
    { type: 'way', id: 9, nodes: [1, 2, 3], tags: { highway: 'primary' } },
  ] };
  const r = { ...region, bbox: { south: 37.544, west: 127.055, north: 37.545, east: 127.057 } };
  const m = osmToMap(f, r);
  assert.equal(m.roads.length, 1);
  assert.equal(m.roads[0].p.length, 2, 'far node dropped, crossing segment kept');
});

test('weather helpers', async () => {
  const { weatherKind, daylight, localHour } = await import('../src/core/weather.js');
  assert.equal(weatherKind(0), 'clear');
  assert.equal(weatherKind(63), 'rain');
  assert.equal(weatherKind(73), 'snow');
  assert.equal(daylight(12), 1);
  assert.equal(daylight(0), 0);
  assert.equal(localHour(9, new Date('2026-11-01T03:00:00Z')), 12);
});

test('tags apartments and low-rise homes', async () => {
  const { buildingKind } = await import('../scripts/lib/osm-to-map.mjs');
  assert.equal(buildingKind({ building: 'apartments' }), 'apt');
  assert.equal(buildingKind({ building: 'house' }), 'villa');
  assert.equal(buildingKind({ building: 'residential' }), 'villa');
  assert.equal(buildingKind({ building: 'yes' }), null);
});
