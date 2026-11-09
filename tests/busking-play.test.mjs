import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuskingPlay } from '../src/game/busking-play.js';
import { STAGE_R } from '../src/core/busking.js';
import { SINGER } from '../src/core/busking-layout.js';

// Starting to busk must leave you on the stage: the frame loop stops busking
// as soon as busking.stageAt() no longer finds you there.
// The speech bubble only needs a bare element and a layer to add it to.
globalThis.document ??= { createElement: () => ({ style: {}, remove() {} }) };

test('startBusking puts you on the stage, so busking keeps going', () => {
  const zone = { x: -2961, z: -230 };
  const stageAt = (x, z) => (Math.hypot(x - zone.x - SINGER[0], z - zone.z - SINGER[1]) < STAGE_R ? zone : null);
  const pos = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
  const game = {
    busking: { start() {}, stageAt },
    me: { root: { position: pos, rotation: { y: 0 } } },
    myLabel: { tag: null, bubble: null }, $: () => ({ appendChild() {} }), STALE: {}, shop: { toast() {} }, action: null,
  };
  const play = createBuskingPlay(game);
  play.startBusking(zone);
  assert.ok(stageAt(pos.x, pos.z), `at ${pos.x}, ${pos.z}, off the stage`);
  assert.equal(game.action, game.STALE);
});
