import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { dartPinMsg, parseDartPin, dartPack, dartColorOf, pickDartColor, DART_COLORS, parseDarts } from '../src/core/arcade.js';
import { DartPins } from '../src/core/dart-pins.js';

test('a dart pin message round-trips and rejects junk', () => {
  const m = parseDartPin(dartPinMsg(1, 3, dartPack(0.25), dartPack(-0.5)));
  assert.deepEqual({ board: m.board, color: m.color }, { board: 1, color: 3 });
  assert.ok(Math.abs(m.x - 0.25) < 1e-9 && Math.abs(m.y + 0.5) < 1e-9);
  for (const bad of ['dartpin:9:0:1:1', 'dartpin:0:8:1:1', 'dartpin:0:0:5000:1', 'dartpin:0:0:1', 'x']) assert.equal(parseDartPin(bad), null);
  assert.equal(parseDarts(dartPinMsg(0, 0, 2000, 2000)), null); // not mistaken for a darts duel message
});

test('flight colours: from the id, moved past taken ones', () => {
  const c = dartColorOf('player-a');
  assert.ok(c >= 0 && c < DART_COLORS.length);
  assert.equal(dartColorOf('player-a'), c);
  assert.equal(pickDartColor(c, []), c);
  assert.equal(pickDartColor(c, [c]), (c + 1) % DART_COLORS.length);
  assert.equal(pickDartColor(7, [7, 0]), 1);
});

test('darts stick in the board, 3 per thrower, and come out', () => {
  const scene = new THREE.Scene();
  const pins = new DartPins(scene, [{ x: -6.94, y: 1.6, z: -1.4, ry: Math.PI / 2, r: 0.276 }, { x: -6.94, y: 1.6, z: 0.4, ry: Math.PI / 2, r: 0.276 }]);
  const m = pins.add('a', 0, 2, 0, 0, 0);
  assert.ok(Math.abs(m.position.x + 6.936) < 1e-6 && Math.abs(m.position.y - 1.6) < 1e-6 && Math.abs(m.position.z + 1.4) < 1e-6);
  // Board x to the thrower's right (looking at the left wall, that is -z); y down.
  const r = pins.add('a', 0, 2, 1, 1, 0);
  assert.ok(Math.abs(r.position.z - (-1.4 - 0.276)) < 1e-6 && Math.abs(r.position.y - (1.6 - 0.276)) < 1e-6);
  pins.add('a', 0, 2, 0, 0, 0); pins.add('a', 0, 2, 0, 0, 0);
  assert.equal(pins.count('a'), 3);
  pins.add('b', 1, 5, 0, 0, 0);
  assert.deepEqual(pins.colorsInUse('a'), [5]);
  assert.equal(scene.children.length, 4);
  assert.equal(pins.add('a', 7, 2, 0, 0), null); // no such board
  pins.update(200);
  assert.equal(scene.children.length, 0);
});

test('up to 4 players: the start message, darts each, turns and teams', async () => {
  const { dartsGoMsg, parseDartsGo, dartsEach, throwerOf, teamOf } = await import('../src/core/arcade.js');
  const ids = ['host-1', 'b-2', 'c-3', 'd-4'];
  assert.deepEqual(parseDartsGo(dartsGoMsg('b-2', 't', ids)), { to: 'b-2', mode: 't', ids });
  assert.deepEqual(parseDartsGo(dartsGoMsg('b-2', 'f', ids.slice(0, 3))).ids, ids.slice(0, 3));
  assert.equal(parseDartsGo(dartsGoMsg('b-2', 't', ids.slice(0, 3))), null); // 2:2 needs four
  assert.equal(parseDartsGo(dartsGoMsg('b-2', 'f', ['a'])), null);
  assert.equal(parseDartsGo(dartsGoMsg('b-2', 'f', [...ids, 'e-5'])), null);
  assert.equal(parseDartsGo(dartsGoMsg('b-2', 'f', ['a', 'a'])), null);
  assert.equal(parseDartsGo('dartsgo:b:f:a,b c'), null);
  assert.equal(dartsEach(2), 10);
  assert.equal(dartsEach(4), 6);
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => throwerOf(n, 3)), [0, 1, 2, 0, 1]);
  // 2:2: line-up places 0 and 2 against 1 and 3, so the teams take turns.
  assert.deepEqual([0, 1, 2, 3].map(teamOf), [0, 1, 0, 1]);
});
