import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_PASS, passLeft, startPass } from '../src/core/board-pass.js';

const box = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('the board game café\'s pass: 5,000 for three hours, kept across visits, gone when the time is up', () => {
  assert.equal(BOARD_PASS.fee, 5000);
  assert.equal(BOARD_PASS.ms, 3 * 60 * 60 * 1000);
  const s = box(), t0 = 1_800_000_000_000;
  assert.equal(passLeft(t0, s), 0); // none yet
  assert.equal(startPass('op-1', t0, s), t0 + BOARD_PASS.ms);
  assert.equal(passLeft(t0, s), BOARD_PASS.ms);
  assert.equal(passLeft(t0 + 60 * 60 * 1000, s), 2 * 60 * 60 * 1000); // an hour later (out and back in)
  assert.equal(passLeft(t0 + BOARD_PASS.ms, s), 0); // time is up
  assert.equal(JSON.parse(s.getItem('mk.boardPass')).op, 'op-1'); // the payment it came from
});

test('the pass: a broken or made-up record never gives more than one pass\'s time', () => {
  const s = box(), t0 = 1_800_000_000_000;
  s.setItem('mk.boardPass', '{oops');
  assert.equal(passLeft(t0, s), 0);
  s.setItem('mk.boardPass', JSON.stringify({ until: 'tomorrow' }));
  assert.equal(passLeft(t0, s), 0);
  s.setItem('mk.boardPass', JSON.stringify({ until: t0 + 99 * BOARD_PASS.ms }));
  assert.equal(passLeft(t0, s), BOARD_PASS.ms);
  assert.equal(passLeft(t0, null), 0); // (no storage at all)
});
