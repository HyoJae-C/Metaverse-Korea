import test from 'node:test';
import assert from 'node:assert/strict';
import { stageOf, stepOf, diameterOf, rollable, pushResult, crewSize, canTop, encodeBalls, parseBalls, pushMsg, headMsg, hatMsg, parseSnowMsg, snowPose, holdSpeed, rollGrowth, holdPose, validHat, hatOf, hatLook, MAX_N, CREW_WINDOW_MS, ROLL_PER_STEP, chillStep, COLD_AFTER, PRESS_CHILL, encodeDucks, parseDucks, MAX_DUCKS, helperRel, HELPER_SIDE } from '../src/core/snowballs.js';

test('eight stages of twenty presses, growing all the way', () => {
  assert.equal(stageOf(0), 1);
  assert.equal(stageOf(19), 1);
  assert.equal(stageOf(20), 2);
  assert.equal(stageOf(60), 4);
  assert.equal(stageOf(120), 7);
  assert.equal(stageOf(140), 8);
  assert.equal(stageOf(MAX_N), 8);
  assert.equal(diameterOf(MAX_N), 2.3); // (the biggest stays as big as before)
  assert.equal(stepOf(65), 5);
  for (let n = 1; n <= MAX_N; n++) assert.ok(diameterOf(n) > diameterOf(n - 1));
  assert.equal(diameterOf(60), 0.6); // waist-high at stage 4
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
  assert.equal(pushResult(138, 1).grow, 1);
  assert.equal(pushResult(139, 1).grow, 1); // stage 7 finishes alone: the giant starts at 0/20
  assert.deepEqual([stageOf(140), stepOf(140)], [8, 0]);
  assert.deepEqual([pushResult(140, 1).grow, pushResult(140, 1).why], [0, 'heavy']);
  assert.equal(pushResult(140, 2).grow, 1);
  // all 20 giant steps take two people
  let n = 140, pushes = 0;
  while (pushResult(n, 2).grow) { n += 1; pushes++; }
  assert.deepEqual([n, pushes], [MAX_N, 20]);
  assert.deepEqual([pushResult(145, 1).move, pushResult(145, 1).why], [0, 'heavy']);
  assert.ok(pushResult(145, 2).move > 0);
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
  assert.equal(canTop(110, 120), true); // stage 6 lifts fine
  assert.equal(canTop(130, 150), true); // and stage 7
  assert.equal(canTop(145, 150), true); // even a giant on a bigger giant
  assert.equal(canTop(50, 110), true); // stage 3 on stage 6
  assert.equal(canTop(110, 110), false); // (the bottom has to be bigger)
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
  assert.equal(snowPose(150), 'snowshoulder'); // a giant: both push from behind, facing it
  assert.equal(snowPose(150, true), 'snowpushhigh');
});

test('grab and walk: a heavy ball slows you, a friend holding on speeds you up', () => {
  assert.equal(holdSpeed(30), 1); // (still gathering)
  assert.ok(holdSpeed(70) < 1);
  assert.ok(holdSpeed(110) < holdSpeed(70)); // bigger is heavier
  assert.ok(holdSpeed(110, 2) > holdSpeed(110, 1));
  assert.equal(holdSpeed(145, 1), 0); // a giant won't move for one person
  assert.ok(holdSpeed(145, 2) > 0);
});

test('a walked ball grows with the ground it covers, faster with friends', () => {
  assert.equal(rollGrowth(30, 1, 5), 0);
  assert.ok(Math.abs(rollGrowth(70, 1, ROLL_PER_STEP) - 1) < 1e-9);
  assert.ok(Math.abs(rollGrowth(70, 2, ROLL_PER_STEP) - 2) < 1e-9);
  assert.equal(rollGrowth(140, 1, 10), 0); // the giant needs a friend from 0/20
  assert.equal(rollGrowth(130, 1, 100), 10);
  assert.equal(rollGrowth(140, 2, 100), MAX_N - 140);
  assert.equal(rollGrowth(MAX_N, 3, 10), 0);
});

test('holding poses: the friend takes the other one', () => {
  assert.notEqual(holdPose(70), holdPose(70, true));
  assert.notEqual(holdPose(110), holdPose(110, true));
  for (const n of [70, 110, 145]) for (const h of [false, true]) assert.notEqual(holdPose(n, h), 'snowback'); // both face the ball, pushing from behind
  // a friend holding on stands behind the ball beside the owner
  assert.equal(helperRel(Math.PI * 0.9), HELPER_SIDE);
  assert.equal(helperRel(-0.1), -HELPER_SIDE);
  assert.equal(helperRel(Math.PI * 1.5), -HELPER_SIDE);
});

test('a hat on a snowman', () => {
  const t = hatOf({ head: 'bucket', hatColor: 'mint' });
  assert.equal(t, 'bucket~mint');
  assert.deepEqual(hatLook(t), { head: 'bucket', hatColor: 'mint' });
  assert.equal(hatOf({ head: null }), null);
  assert.equal(validHat('cap'), true);
  assert.equal(validHat('a;b'), false);
  assert.equal(validHat('x:y'), false);
  const s = encodeBalls([{ k: 1, x: 0, z: 0, n: 120, h: 80, ry: 1, t }, { k: 2, x: 1, z: 1, n: 70, t: 'cap' }]);
  const [man, ball] = parseBalls(s);
  assert.equal(man.t, t);
  assert.equal(ball.t, undefined); // (only a snowman wears one)
  assert.deepEqual(parseSnowMsg(hatMsg('u1', 3, 'cap')), { kind: 'hat', owner: 'u1', k: 3, t: 'cap' });
  assert.equal(parseSnowMsg('sbt:u1:3:bad;hat'), null);
});

test('working the snow too long makes your hands cold; resting warms them', () => {
  let c = 0, cold = false;
  for (let i = 0; i < COLD_AFTER - 1; i++) ({ chill: c, cold } = chillStep(c, 1, 1));
  assert.equal(cold, false);
  ({ chill: c, cold } = chillStep(c, 1, 1));
  assert.equal(cold, true);
  assert.equal(c, 0); // (after warming up, start over)
  const presses = Math.ceil(COLD_AFTER / PRESS_CHILL);
  c = 0; cold = false; let n = 0;
  while (n < 100 && !cold) { ({ chill: c, cold } = chillStep(c, 0, 0, 1)); n++; }
  assert.equal(n, presses);
  assert.ok(chillStep(10, 4).chill < 10); // resting
});

test('snow ducks round-trip, newest kept', () => {
  const list = Array.from({ length: MAX_DUCKS + 3 }, (_, i) => ({ x: i, z: -i, ry: 0.5 }));
  const back = parseDucks(encodeDucks(list.slice(-MAX_DUCKS)));
  assert.equal(back.length, MAX_DUCKS);
  assert.deepEqual(back.at(-1), { x: MAX_DUCKS + 2, z: -(MAX_DUCKS + 2), ry: 0.5 });
  assert.deepEqual(parseDucks('1,2,x;3,4,0'), [{ x: 3, z: 4, ry: 0 }]);
  assert.deepEqual(parseDucks(null), []);
});
