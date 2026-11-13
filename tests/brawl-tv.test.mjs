import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded, newMatch, stepMatch, packMatch, createMatch } from '../src/core/brawl.js';
import { createCaster, createViewer, createScreens, TV, BATCH, KEY_EVERY } from '../src/core/brawl-tv.js';
import { createSession } from '../src/core/brawl-net.js';

const randomInput = (rand) => {
  const inp = { mx: rand() < 0.5 ? 1 : rand() < 0.3 ? -1 : 0, mz: rand() < 0.05 ? (rand() < 0.5 ? 1 : -1) : 0 };
  for (const b of ['lp', 'rp', 'lk', 'rk']) if (rand() < 0.06) inp[b] = true;
  return inp;
};
const same = (a, b) => assert.equal(JSON.stringify(packMatch(a)), JSON.stringify(packMatch(b)));

test('brawl tv: the screen plays the very match the player played, a moment later', () => {
  const m = newMatch('ninja', 'tank', true), rand = seeded(8), wire = [];
  const cast = createCaster((x) => wire.push(x), { b: 'p2', n: ['Ann', 'Ben'] }), view = createViewer();
  const at = []; // the player's match after each tick
  cast.start(m);
  let seen = 0;
  for (let k = 0; k < 2000; k++) {
    const ia = randomInput(rand), ib = randomInput(rand);
    stepMatch(m, ia, ib); cast.step(ia, ib, m);
    at.push(JSON.stringify(packMatch(m)));
    while (wire.length) assert.equal(view.heard('p1', wire.shift()), true);
    const before = JSON.stringify(view.match && packMatch(view.match));
    view.tick();
    const after = JSON.stringify(packMatch(view.match));
    if (after !== before) { assert.equal(after, at[seen], 'tick ' + seen); seen++; }
  }
  assert.ok(seen > 1900, 'kept up (' + seen + ')');
  assert.deepEqual(view.info, { b: 'p2', n: ['Ann', 'Ben'] });
  assert.equal(view.from, 'p1');
});

test('brawl tv: someone who walks in late joins at the next whole match; a lost batch is mended by it', () => {
  const m = newMatch('boxer', 'dancer', true), rand = seeded(2), view = createViewer();
  let k = 0, lose = false;
  const cast = createCaster((x) => { if (k >= 450 && !(lose && x.startsWith(TV + 'i'))) view.heard('p1', x); }, { b: 'r2', n: ['Ann', ''] });
  cast.start(m);
  for (; k < 3000; k++) {
    lose = k > 1000 && k < 1000 + BATCH; // one batch of inputs never arrives
    const ia = randomInput(rand), ib = randomInput(rand);
    stepMatch(m, ia, ib); cast.step(ia, ib, m);
    view.tick();
    if (k === 500) assert.equal(view.match, null, 'nothing until a whole match arrives');
    if (k === KEY_EVERY * 2 + 60) assert.ok(view.match, 'then it plays');
  }
  for (let i = 0; i < 200; i++) view.tick(); // play out what is left
  same(view.match, m);
});

test('brawl tv: a match against the game\'s own rival is shown too (the rival\'s inputs are sent)', () => {
  const m = createMatch({ level: 3, rand: seeded(5), style: 'kicker', rivalStyle: 'grappler' }), rand = seeded(6), view = createViewer();
  const cast = createCaster((x) => view.heard('solo', x), { b: 'r3', n: ['Ann', ''] });
  m.onStep = (ia, ib) => cast.step(ia, ib, m);
  cast.start(m);
  for (let k = 0; k < 1500; k++) { m.step(randomInput(rand)); view.tick(); }
  cast.end();
  assert.equal(view.match, null, 'the screen is free again when the match ends');
  assert.equal(view.from, null);
});

test('brawl tv: two matches on two screens, a third is not shown, a silent one gives way', () => {
  const tv = createScreens(2);
  const mk = (id) => { const m = newMatch(); const c = createCaster((x) => tv.heard(id, x), { b: 'r0', n: [id, ''] }); c.start(m); return { m, c }; };
  const a = mk('a'), b = mk('b'), c = mk('c');
  assert.deepEqual(tv.views.map((v) => v.from), ['a', 'b']);
  const run = (who, n) => { for (let k = 0; k < n; k++) { for (const p of who) { stepMatch(p.m); p.c.step({}, {}, p.m); } for (const v of tv.views) v.tick(); } };
  run([a, b, c], 400);
  assert.deepEqual(tv.views.map((v) => v.from), ['a', 'b'], 'the third waits');
  a.c.end();
  assert.equal(tv.views[0].from, null);
  run([b, c], KEY_EVERY + 10);
  assert.deepEqual(tv.views.map((v) => v.from), ['c', 'b'], 'and takes the screen that came free');
  run([c], 400); // b goes silent (closed the tab)
  assert.equal(tv.views[1].from, null, 'a match that fell silent leaves the screen');
  assert.equal(tv.heard('x', 'wave'), false);
});

test('brawl tv: the host of a two-player match sends what is certain, in order', () => {
  const sent = [], wire = [[], []];
  const s = [0, 1].map((side) => createSession({ side, styles: ['mystic', 'brawler'], send: (x) => wire[1 - side].push(JSON.parse(JSON.stringify(x))), onSure: side ? undefined : (ia, ib, m) => sent.push([ia, ib, JSON.stringify(packMatch(m))]) }));
  const rand = seeded(12);
  for (let k = 0; k < 900; k++) for (const side of [0, 1]) { for (const x of wire[side].splice(0)) s[side].receive(x); s[side].tick(randomInput(rand)); }
  const ref = newMatch('mystic', 'brawler', true);
  assert.ok(sent.length > 800);
  for (const [ia, ib] of sent) stepMatch(ref, ia, ib);
  same(ref, s[0].certain);
});
