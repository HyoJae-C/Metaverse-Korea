import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOLK_YARD, FOLK_SOLID, folkBlockers, propToWorld } from '../src/data/folk-yard.js';
import { FOLK_GAMES } from '../src/core/folk-props.js';
import { FT, FOLK_LINES } from '../src/ui/folk-text.js';
import { CollisionMap } from '../src/core/collision.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/euljiro.json', import.meta.url)));
const yard = map.landmarks.find((l) => l.type === 'folkyard');
const plaza = map.areas.find((a) => a.k === 'plaza' && a.p.length === 4 && a.p[0][0] < yard.x && a.p[2][0] > yard.x && a.p[0][1] < yard.z && a.p[2][1] > yard.z).p;
const [px0, pz0] = plaza[0], [px1, pz1] = plaza[2];
const solid = new CollisionMap(map.buildings.concat(map.blockers));
const gate = map.landmarks.find((l) => l.type === 'hanokgate');

test('the yard sits in the middle of Namsangol\'s plaza, behind the gate', () => {
  assert.ok(yard, 'folkyard landmark in euljiro.json');
  assert.equal(yard.x, (px0 + px1) / 2);
  assert.equal(yard.z, (pz0 + pz1) / 2);
  assert.equal(gate.x, yard.x, 'the gate opens onto the middle of the yard');
});

test('every game has a prop on the plaza and a free spot to stand', () => {
  assert.deepEqual(Object.keys(FOLK_YARD.props).sort(), FOLK_GAMES.map((g) => g.id).sort());
  for (const g of FOLK_GAMES) {
    const [x, z] = propToWorld(yard, g.id, [0, 0]);
    assert.ok(x > px0 + 2 && x < px1 - 2 && z > pz0 + 2 && z < pz1 - 2, g.id + ' on the plaza');
    const [sx, sz] = propToWorld(yard, g.id, g.stand);
    assert.ok(!solid.blocked(sx, sz, 0.3), g.id + ': you can stand at its spot');
    // You play facing the hanok at the back, with the gate behind you.
    assert.ok(sz < z, g.id + ': the stand is on the gate side');
    for (const h of FOLK_GAMES) if (h !== g) {
      const [hx, hz] = propToWorld(yard, h.id, h.stand);
      assert.ok(Math.hypot(sx - hx, sz - hz) > g.radius + h.radius, `${g.id} and ${h.id} spots don't overlap`);
    }
  }
});

test('the walk in from the gate stays open', () => {
  for (let z = gate.z + 1; z < yard.z + 8; z += 0.5) {
    for (const dx of [-2, 0, 2]) assert.ok(!solid.blocked(yard.x + dx, z, 0.4), `lane blocked at ${dx}, ${z}`);
  }
  for (const [x] of Object.values(FOLK_YARD.props)) assert.ok(Math.abs(x) > 6, 'props keep off the middle lane');
});

test('the locals are already there, and not inside anything solid', () => {
  const ids = FOLK_YARD.people.map((w) => w.id);
  assert.equal(FOLK_YARD.people.filter((w) => w.game === 'yut').length, 3, 'three locals wait at the yut mat');
  for (const sp of Object.values(FOLK_YARD.speaker)) assert.ok(ids.includes(sp));
  for (const w of FOLK_YARD.people) {
    if (w.on) continue; // Suni stands on the seesaw's end
    const [x, z] = propToWorld(yard, w.game, w.at);
    assert.ok(!solid.blocked(x, z, 0.2), w.id + ' inside a blocker');
  }
});

test('the map\'s blockers are the props\' solid parts', () => {
  const want = folkBlockers(yard);
  assert.equal(want.length, Object.values(FOLK_SOLID).flat().length);
  for (const b of want) assert.ok(map.blockers.some((m) => JSON.stringify(m.p) === JSON.stringify(b.p)), 'run node scripts/build-euljiro.mjs');
});

test('the yard\'s words are there in every language', () => {
  for (const k of ['courtyard', 'teacher', 'yut.open', 'tuho.open', 'jegi.open', 'neol.open', 'yut.grandma', 'neol.partner']) {
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(FT[k]?.[l], `${k}.${l}`);
  }
  assert.ok(FOLK_LINES.neolHello);
});
