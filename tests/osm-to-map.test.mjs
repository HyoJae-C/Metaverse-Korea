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
