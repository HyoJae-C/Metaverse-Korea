import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whereDue, startWhereReports, WHERE_MOVE_MS, WHERE_IDLE_MS, WHERE_PLACE_MS } from '../src/net/where.js';
import { describePlace, agoText, fitView, clusterPoints } from '../src/admin/view.js';

const at = (x, z, place = 'street') => ({ x, z, place });

test('the first spot is always reported', () => {
  assert.equal(whereDue(null, at(0, 0), 0), true);
});

test('walking reports every few seconds, standing still only a heartbeat', () => {
  const last = { ...at(0, 0), t: 0 };
  assert.equal(whereDue(last, at(10, 0), WHERE_MOVE_MS - 1), false, 'too soon');
  assert.equal(whereDue(last, at(10, 0), WHERE_MOVE_MS), true, 'moved');
  assert.equal(whereDue(last, at(0.5, 0), WHERE_MOVE_MS * 2), false, 'barely moved');
  assert.equal(whereDue(last, at(0, 0), WHERE_IDLE_MS), true, 'heartbeat');
});

test('walking into a shop is reported quickly', () => {
  const last = { ...at(0, 0), t: 0 };
  assert.equal(whereDue(last, at(0, 0, 'ongi-cafe'), WHERE_PLACE_MS - 1), false);
  assert.equal(whereDue(last, at(0, 0, 'ongi-cafe'), WHERE_PLACE_MS), true);
});

test('reports stop for the visit when the server is not set up', async () => {
  let calls = 0, x = 0;
  const stop = startWhereReports({ get: () => at((x += 50), 0), send: async () => { calls++; return false; }, interval: 5 });
  await new Promise((r) => setTimeout(r, 60));
  stop();
  assert.equal(calls, 1);
});

test('nothing is sent while get() has no spot', async () => {
  let calls = 0;
  const stop = startWhereReports({ get: () => null, send: async () => { calls++; return true; }, interval: 5 });
  await new Promise((r) => setTimeout(r, 30));
  stop();
  assert.equal(calls, 0);
});

test('admin view helpers', () => {
  const stores = new Map([['ongi-cafe', { name: { en: 'Ongi Café', ko: '온기 카페' } }]]);
  assert.equal(describePlace('street', stores), 'On the street');
  assert.equal(describePlace('ongi-cafe', stores), 'In Ongi Café');
  assert.equal(describePlace('gone-shop', stores), 'In gone-shop');
  assert.equal(agoText(2), 'now');
  assert.equal(agoText(42), '42 s ago');
  assert.equal(agoText(300), '5 min ago');
  assert.equal(agoText(7300), '2 h ago');
  assert.equal(fitView([], 100, 100), null);
  const v = fitView([[0, 0], [1000, 500]], 1200, 800);
  assert.equal(v.cx, 500);
  assert.equal(v.cz, 250);
  assert.ok(v.scale > 0 && v.scale <= (1200 - 120) / 1000);
  assert.equal(fitView([[5, 5]], 800, 600).scale, 1.5, 'one player: street level');
});

test('live map counts mode groups players close on screen', () => {
  const pts = [{ sx: 0, sy: 0 }, { sx: 10, sy: 5 }, { sx: 300, sy: 300 }, { sx: 5, sy: -8 }];
  const groups = clusterPoints(pts, 40);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].items.length, 3);
  assert.equal(groups[1].items.length, 1);
  assert.ok(Math.abs(groups[0].sx - 5) < 1e-9 && Math.abs(groups[0].sy + 1) < 1e-9);
  assert.equal(clusterPoints([], 40).length, 0);
  // Zoomed in far enough, nobody is grouped.
  assert.equal(clusterPoints(pts, 4).length, 4);
});
