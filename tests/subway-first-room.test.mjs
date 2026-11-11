// Walking down a subway exit when the station is the first room of the visit:
// enterStore downloads the rooms first and returns a promise. The hall must
// wait for it and put you at the foot of the stairs (it once read the hall
// before it existed, threw every frame, and you ended up past the gates and
// on a train: Dongmyo, Yozi 2026-11-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => ({ classList: { add() {}, remove() {} } }) };
const { createSubway } = await import('../src/game/subway.js');

test('the first room being a station: wait for the rooms, then stand at the stairs', async () => {
  const station = { id: 'dongmyo-station', name: { en: 'Dongmyo' }, exits: [{ n: 3, at: [0, 0], ry: 0 }, { n: 4, at: [50, 0], ry: 0 }] };
  let interior = null, release, calls = 0;
  const moves = [];
  const game = {
    get interior() { return interior; }, get mode() { return interior ? 'store' : 'street'; },
    riding: false, seated: false, me: { root: { position: { x: 0 } } },
    enterStore(front) {
      calls++;
      return new Promise((res) => { release = () => { interior = { store: front.store, scene: 'hall', subway: { stairs: [{ arrive: { x: -17, z: -13.5, ry: 1.57 } }, { arrive: { x: -17, z: 13.5, ry: 1.57 } }] } }; res(); }; });
    },
    moveMeTo: (scene, x, z) => moves.push([scene, x, z]),
  };
  const sub = createSubway([station], game);
  const p = { x: 0, z: 1.5, y: 0 }; // well down exit 3's stairs
  for (let k = 0; k < 5; k++) sub.updateSubway(0.016, p, p.x, p.z); // frames while the rooms download
  assert.equal(calls, 1, 'asked for the room once');
  release();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(moves.at(-1), ['hall', -17, -13.5]);
});
