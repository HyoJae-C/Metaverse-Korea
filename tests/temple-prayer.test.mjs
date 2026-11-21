// Praying at the temples and the cathedral (game/prayer.js), the moktak
// heard in the temples (game/moktak.js), and the silent dharma halls
// (core/dharma-hall.js, stores.json "dharmahall") (Yozi 2026-11-15).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prayerSpots } from '../src/game/prayer.js';
import { moktakSources, moktakGain, MOKTAK } from '../src/game/moktak.js';
import { STUDIO_MOVES } from '../src/core/studio-moves.js';
import { DHARMA_LAYOUT, ROOM_DHARMA } from '../src/core/dharma-hall.js';
import { inPolygon } from '../src/core/seoul-grid.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const world = (id) => {
  const d = region.districts.find((q) => q.id === id), m = read(d.map), [ox, oz] = d.offset;
  const mv = (p) => p.map(([x, z]) => [x + ox, z + oz]);
  return { landmarks: m.landmarks.map((l) => ({ ...l, x: l.x + ox, z: l.z + oz })), solid: [...m.buildings, ...m.blockers].map((b) => mv(b.p)) };
};
const jg = world('gyeongbokgung'), bg = world('samseong');
const landmarks = [...jg.landmarks, ...bg.landmarks];

test('a prayer spot at each temple, open ground, facing its Buddha', () => {
  const spots = prayerSpots(landmarks);
  assert.equal(spots.length, 2, 'Bongeunsa\'s mat and Jogyesa\'s Daeungjeon');
  for (const s of spots) {
    assert.ok(![...jg.solid, ...bg.solid].some((p) => inPolygon(s.x, s.z, p)), `the spot at ${s.x.toFixed(1)}, ${s.z.toFixed(1)} is open`);
    assert.ok(STUDIO_MOVES[s.pose], 'a pose everyone can be shown');
  }
  const m = landmarks.find((l) => l.type === 'maitreya'), mat = spots.find((s) => s.y > 0);
  assert.ok(Math.abs(Math.hypot(mat.x - m.x, mat.z - m.z) - 3.6) < 0.01, 'on the red mat, up on the terrace');
  assert.ok(Math.abs(Math.cos(mat.face - (m.ry + Math.PI)) - 1) < 1e-9, 'facing the statue');
});

test('the prayer poses: palms together, a temple bow comes and goes', () => {
  const up = STUDIO_MOVES.pray(0.1 + 4), down = STUDIO_MOVES.pray(1.5);
  assert.ok(down.spine[0] > up.spine[0] + 0.6, 'bowing low, then up again');
  assert.deepEqual(STUDIO_MOVES.prayc(0).armL, [0, 0, -1.3], 'hands together in the cathedral');
});

test('the moktak: heard by each Daeungjeon, gone outside the temple', () => {
  const src = moktakSources(landmarks);
  assert.equal(src.length, 2);
  assert.equal(moktakGain(0), 1);
  assert.equal(moktakGain(MOKTAK.far + 1), 0);
  assert.ok(moktakGain((MOKTAK.near + MOKTAK.far) / 2) > 0 && moktakGain((MOKTAK.near + MOKTAK.far) / 2) < 1);
});

test('the silent dharma halls: a door in front of each Daeungjeon, cushions facing the Buddhas', () => {
  const stores = read('stores.json').stores.filter((s) => s.workshop === 'dharmahall');
  assert.deepEqual(stores.map((s) => s.id).sort(), ['bongeunsa-daeungjeon', 'jogyesa-daeungjeon']);
  const j = jg.landmarks.find((l) => l.type === 'jogyesa'), b = bg.landmarks.find((l) => l.type === 'bongeunsa');
  const h = b.halls.find((q) => q[6] === '大雄殿');
  const fronts = { 'jogyesa-daeungjeon': [j.x, j.z + 3.5, 0], 'bongeunsa-daeungjeon': [b.x + h[0] + Math.sin(h[4]) * h[3] / 2, b.z + h[1] + Math.cos(h[4]) * h[3] / 2, h[4]] };
  for (const s of stores) {
    const [fx, fz, ry] = fronts[s.id];
    const dist = Math.hypot(s.at[0] - fx, s.at[1] - fz);
    assert.ok(dist > 1 && dist < 3.5, `${s.id}: the door just in front of the hall (${dist.toFixed(1)} m)`);
    assert.ok(Math.abs(s.face - ry) < 0.01, `${s.id}: you come out facing away from the hall`);
    assert.ok(![...jg.solid, ...bg.solid].some((p) => inPolygon(s.at[0], s.at[1], p)), `${s.id}: the door on open ground`);
  }
  const { cushions, altar, pray } = DHARMA_LAYOUT;
  assert.ok(cushions.xs.length * cushions.zs.length >= 24, 'room for many people');
  assert.ok(Math.min(...cushions.zs) > pray.z + pray.r - 0.5 && pray.z > altar.z + altar.d / 2, 'the prayer spot between the altar and the cushions');
  assert.ok(Math.max(...cushions.zs) < ROOM_DHARMA.d / 2 - 1.2, 'the door side clear');
  assert.ok(!cushions.xs.some((x) => Math.abs(x) < 0.7), 'an aisle down the middle');
});
