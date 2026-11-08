import test from 'node:test';
import assert from 'node:assert/strict';
import { stageOf, stepOf, diameterOf, rollable, pushResult, crewSize, canTop, encodeBalls, parseBalls, pushMsg, headMsg, parseSnowMsg, snowPose, MAX_N, CREW_WINDOW_MS } from '../src/core/snowballs.js';

test('seven stages of twenty presses, growing all the way', () => {
  assert.equal(stageOf(0), 1);
  assert.equal(stageOf(19), 1);
  assert.equal(stageOf(20), 2);
  assert.equal(stageOf(60), 4);
  assert.equal(stageOf(120), 7);
  assert.equal(stageOf(MAX_N), 7);
  assert.equal(stepOf(65), 5);
  for (let n = 1; n <= MAX_N; n++) assert.ok(diameterOf(n) > diameterOf(n - 1));
  assert.equal(diameterOf(60), 0.7); // waist-high at stage 4
});

test('gather by hand for stages 1-3, roll from stage 4', () => {
  assert.equal(rollable(59), false);
  assert.equal(rollable(60), true);
  assert.equal(pushResult(30, 1).why, 'gather');
});

test('a friend pushing rolls it further', () => {
  const alone = pushResult(70, 1), two = pushResult(70, 2);
  assert.equal(alone.grow, 1);
  assert.ok(two.move > alone.move);
});

test('becoming a giant, and rolling one, takes two people', () => {
  assert.equal(pushResult(118, 1).grow, 1);
  assert.deepEqual([pushResult(119, 1).grow, pushResult(119, 1).why], [0, 'friend']);
  assert.equal(pushResult(119, 2).grow, 1);
  assert.deepEqual([pushResult(125, 1).move, pushResult(125, 1).why], [0, 'heavy']);
  assert.ok(pushResult(125, 2).move > 0);
  assert.equal(pushResult(MAX_N, 3).grow, 0);
});

test('people pushing within the window count as a crew', () => {
  const now = 10000;
  assert.equal(crewSize([{ who: 'a', at: now }, { who: 'a', at: now - 100 }], now), 1);
  assert.equal(crewSize([{ who: 'a', at: now }, { who: 'b', at: now - 500 }], now), 2);
  assert.equal(crewSize([{ who: 'a', at: now }, { who: 'b', at: now - CREW_WINDOW_MS - 1 }], now), 1);
});

test('a snowman head is smaller and liftable', () => {
  assert.equal(canTop(90, 120), true);
  assert.equal(canTop(110, 120), false); // stage 6: too heavy to lift
  assert.equal(canTop(50, 40), false);
});

test('balls go through the state and messages', () => {
  const list = [{ k: 1, x: 1.234, z: -5, n: 70 }, { k: 2, x: 3, z: 4, n: 120, h: 90, ry: 1.5 }];
  assert.equal(encodeBalls(list), '1,1.23,-5.00,70;2,3.00,4.00,120,90,1.50');
  assert.deepEqual(parseBalls(encodeBalls(list)), [{ k: 1, x: 1.23, z: -5, n: 70 }, { k: 2, x: 3, z: 4, n: 120, h: 90, ry: 1.5 }]);
  assert.deepEqual(parseBalls('1,0,0,999;x'), []);
  assert.deepEqual(parseSnowMsg(pushMsg('abc', 3, -1.2)), { kind: 'push', owner: 'abc', k: 3, yaw: -1.2 });
  assert.deepEqual(parseSnowMsg(headMsg('abc', 3, 50, 0.5)), { kind: 'head', owner: 'abc', k: 3, n: 50, ry: 0.5 });
  assert.equal(parseSnowMsg('wave'), null);
});

test('a different pose for each size, and for a friend helping', () => {
  assert.equal(snowPose(10), 'snowscoop');
  assert.equal(snowPose(70), 'snowpush');
  assert.equal(snowPose(70, true), 'snowpushhigh');
  assert.equal(snowPose(130), 'snowback');
  assert.equal(snowPose(130, true), 'snowshoulder');
});
