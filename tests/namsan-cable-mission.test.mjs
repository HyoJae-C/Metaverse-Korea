import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNamsanCable } from '../src/game/namsan-cable.js';
import { CABLE } from '../src/core/cablecar.js';

// The cable car has no room to walk into since it is ridden from outside
// (#618), so getting in must count as visiting its store: the daily mission
// '남산 하늘 케이블카 방문하기' could not be finished (2026-11-16).
function setup() {
  const events = [];
  const pos = { x: 0, z: 0, set(x, _y, z) { this.x = x; this.z = z; } };
  const game = {
    me: { root: { position: pos, rotation: { y: 0 } }, play() {} }, mode: 'street',
    wallet: { coins: 100000, lastOp: 'op1', spend(n) { if (this.coins < n) return false; this.coins -= n; return true; }, refund(n) { this.coins += n; } },
    shop: { toast() {} }, t: (k) => k, L: (x) => (x && x.en) || '', fmt: (s) => s,
    missionEvent: (k, id) => events.push(id ? k + ':' + id : k), resend() {}, clearAction() {},
  };
  const landmarks = [{ type: 'cablecar', x: 0, z: 0, path: [[0, 0, 5, 0], [0, 100, 60, 50]] }];
  const cable = createNamsanCable(game, { landmarks, low: { x: 0, z: -5 }, top: [0, 105], topOut: { x: 0, z: 110, ry: 0 } });
  return { cable, events, game };
}
const atTime = (t, f) => { const now = Date.now; Date.now = () => t * 1000; try { return f(); } finally { Date.now = now; } };

test('boarding at the lower station counts as visiting the cable car store', () => {
  const { cable, events, game } = setup();
  atTime(CABLE.cycle * 1000, () => { // cabin 0 at the lower station, doors open
    const a = cable.act({ x: 0, z: -5 });
    assert.ok(a?.key.startsWith('cable-board:low'), a?.key);
    a.run();
  });
  assert.ok(cable.busy);
  assert.equal(game.wallet.coins, 100000 - CABLE.fare);
  assert.deepEqual(events, ['ride', 'visit:namsan-sky-cable']);
});

test('boarding at the top (the free way down) also counts as the visit', () => {
  const { cable, events } = setup();
  atTime(CABLE.cycle * 1000 + CABLE.half, () => { // cabin 0 at the top
    const a = cable.act({ x: 0, z: 105 });
    assert.ok(a?.key.startsWith('cable-board:top'), a?.key);
    a.run();
  });
  assert.deepEqual(events, ['visit:namsan-sky-cable']);
});

test('no coins: no ride and no visit', () => {
  const { cable, events, game } = setup();
  game.wallet.coins = 0;
  atTime(CABLE.cycle * 1000, () => cable.act({ x: 0, z: -5 }).run());
  assert.ok(!cable.busy);
  assert.deepEqual(events, []);
});
