import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FishContest, contestMsg, parseContest, fishLength, sizeOk, CONTEST_MS, COUNTDOWN_MS, ASK_WAIT, FINAL_WAIT } from '../src/core/fish-contest.js';

test('messages go out and come back the same', () => {
  for (const verb of ['ok', 'no', 'quit']) assert.deepEqual(parseContest(contestMsg(verb, 'p-1', 'c1')), { verb, to: 'p-1', cid: 'c1' });
  assert.deepEqual(parseContest(contestMsg('ask', 'p-1', 'c1', 'sum')), { verb: 'ask', to: 'p-1', cid: 'c1', rule: 'sum' });
  assert.deepEqual(parseContest(contestMsg('ask', 'p-1', 'c1', 'bogus')), { verb: 'ask', to: 'p-1', cid: 'c1', rule: 'rare' });
  assert.deepEqual(parseContest(contestMsg('fish', 'p-1', 'c1', 'carp', 61)), { verb: 'fish', to: 'p-1', cid: 'c1', fish: 'carp', cm: 61 });
  assert.deepEqual(parseContest(contestMsg('end', 'p-1', 'c1', 61, 'carp', [0, 5, 3, 1, 0, 0])), { verb: 'end', to: 'p-1', cid: 'c1', cm: 61, fish: 'carp', by: [0, 5, 3, 1, 0, 0] });
  assert.deepEqual(parseContest(contestMsg('end', 'p-1', 'c1', 0, null, [0, 0, 0, 0, 0, 0])), { verb: 'end', to: 'p-1', cid: 'c1', cm: 0, fish: null, by: [0, 0, 0, 0, 0, 0] });
  for (const bad of ['fc:fish:p:c', 'fc:end:p:c:carp:61', 'fc:ask:p:c', 'fc:ask:p:c:carp:1', 'fc:win:p:c', 'fc:ok:p', 'fc:ok:p:c:x', 'hi5:p']) assert.equal(parseContest(bad), null, bad);
});

test('a fish is 80-120% of its usual length, and a made-up length is refused', () => {
  assert.equal(fishLength('carp', () => 0), 48);
  assert.equal(fishLength('carp', () => 0.999999), 72);
  assert.ok(sizeOk('carp', 72));
  assert.ok(!sizeOk('carp', 300));
  assert.ok(!sizeOk('old-boot', 10));
  assert.ok(!sizeOk('no-such-fish', 10));
});

function pair() {
  let t = 1000;
  const now = () => t;
  const a = new FishContest(now), b = new FishContest(now);
  return { a, b, step: (ms) => { t += ms; } };
}

test('ask, accept, 3-2-1, three minutes, then both finals give the same result', () => {
  const { a, b, step } = pair();
  assert.ok(a.ask('B', 'c1'));
  assert.equal(b.heard('A', { verb: 'ask', to: 'B', cid: 'c1' }), 'asked');
  assert.ok(b.asked('A'));
  assert.equal(b.accept('A'), 'c1');
  assert.equal(a.heard('B', { verb: 'ok', to: 'A', cid: 'c1' }), 'start');
  assert.equal(a.phase(), 'count');
  assert.equal(a.caught('carp'), null); // not before the start
  step(COUNTDOWN_MS);
  assert.equal(a.phase(), 'fish');
  const cmA = a.caught('carp', () => 0.5); // 60 cm
  assert.equal(cmA, 60);
  assert.equal(b.heard('A', { verb: 'fish', to: 'B', cid: 'c1', fish: 'carp', cm: cmA }), 'fish');
  assert.equal(b.caught('old-boot'), null); // the boot doesn't count
  b.caught('minnow', () => 0.5);
  assert.equal(a.final(), null); // not yet
  step(CONTEST_MS);
  assert.equal(a.phase(), 'wait');
  const fa = a.final(), fb = b.final();
  assert.equal(fa.cm, 60);
  assert.equal(a.final(), null); // once
  assert.equal(a.result(), null); // waiting for B's final
  a.heard('B', { verb: 'end', to: 'A', cid: 'c1', ...fb });
  b.heard('A', { verb: 'end', to: 'B', cid: 'c1', ...fa });
  const ra = a.result(), rb = b.result();
  assert.equal(ra.win, 'me');
  assert.equal(rb.win, 'them');
  assert.equal(ra.me.cm, rb.them.cm);
  assert.equal(a.result(), null); // once
  assert.ok(!a.on);
});

test('a late final: the result uses the catches heard so far', () => {
  const { a, b, step } = pair();
  a.ask('B', 'c'); b.heard('A', { verb: 'ask', to: 'B', cid: 'c' }); b.accept('A'); a.heard('B', { verb: 'ok', to: 'A', cid: 'c' });
  step(COUNTDOWN_MS + 1000);
  a.heard('B', { verb: 'fish', to: 'A', cid: 'c', fish: 'carp', cm: 70 });
  step(CONTEST_MS);
  a.final();
  step(FINAL_WAIT);
  const r = a.result();
  assert.equal(r.win, 'them');
  assert.equal(r.them.cm, 70);
});

test('an ask runs out, a wrong cid or a stranger is ignored, quitting ends it', () => {
  const { a, b, step } = pair();
  a.ask('B', 'c');
  step(ASK_WAIT);
  assert.equal(a.heard('B', { verb: 'ok', to: 'A', cid: 'c' }), null);
  a.ask('B', 'd');
  assert.equal(a.heard('B', { verb: 'ok', to: 'A', cid: 'x' }), null);
  assert.equal(a.heard('B', { verb: 'ok', to: 'A', cid: 'd' }), 'start');
  assert.equal(a.heard('C', { verb: 'fish', to: 'A', cid: 'd', fish: 'carp', cm: 60 }), null);
  assert.equal(a.heard('X', { verb: 'ask', to: 'A', cid: 'e' }), 'busy');
  assert.equal(a.heard('B', { verb: 'quit', to: 'A', cid: 'd' }), 'quit');
  assert.ok(!a.on);
  assert.equal(a.quit(), null);
  void b;
});

test('the same longest fish: more fish wins, else a tie', () => {
  const { a, b, step } = pair();
  a.ask('B', 'c'); b.heard('A', { verb: 'ask', to: 'B', cid: 'c' }); b.accept('A'); a.heard('B', { verb: 'ok', to: 'A', cid: 'c' });
  step(COUNTDOWN_MS);
  a.caught('carp', () => 0.5); a.caught('minnow', () => 0.5);
  step(CONTEST_MS);
  a.final();
  a.heard('B', { verb: 'end', to: 'A', cid: 'c', cm: 60, fish: 'carp', by: [0, 0, 1, 0, 0, 0] });
  assert.equal(a.result().win, 'me');
});

test('rarer beats longer: a short ★ fish wins over a long common one (Yozi)', async () => {
  const { better, winner } = await import('../src/core/fish-contest.js');
  const { fishById } = await import('../src/core/fishing.js');
  assert.ok(fishById('axolotl').rarity > fishById('cutlassfish').rarity);
  assert.ok(better({ fish: 'axolotl', cm: 20 }, { fish: 'cutlassfish', cm: 140 }));
  assert.ok(better({ fish: 'carp', cm: 70 }, { fish: 'carp', cm: 50 }));
  assert.equal(winner({ fish: 'carp', cm: 60, by: [0, 3] }, { fish: 'carp', cm: 60, by: [0, 2] }), 'me');
  assert.equal(winner({ fish: null, cm: 0, by: [] }, { fish: null, cm: 0, by: [] }), 'tie');
});

test('the asker picks the rule: ★ added up, or the longest fish', async () => {
  const { winner } = await import('../src/core/fish-contest.js');
  const many = { fish: 'carp', cm: 60, by: [0, 3, 3] }, one = { fish: 'axolotl', cm: 20, by: [0, 0, 0, 1] };
  assert.equal(winner(many, one, 'sum'), 'me'); // 9 ★ against 3
  assert.equal(winner(many, one, 'rare'), 'them');
  assert.equal(winner({ fish: 'cutlassfish', cm: 140, by: [0, 1] }, one, 'long'), 'me');
  // The same total (6 ★): more of the highest ★ wins (Yozi), then the longer fish.
  assert.equal(winner({ fish: 'carp', cm: 50, by: [0, 6] }, { fish: 'axolotl', cm: 20, by: [0, 1, 0, 0, 0, 1] }, 'sum'), 'them');
  assert.equal(winner({ fish: 'carp', cm: 90, by: [0, 0, 0, 2] }, { fish: 'carp', cm: 40, by: [0, 0, 1, 0, 1] }, 'sum'), 'them'); // 6 each: their ★4 beats my ★3s
  assert.equal(winner({ fish: 'carp', cm: 50, by: [0, 0, 3] }, { fish: 'carp', cm: 40, by: [0, 0, 3] }, 'sum'), 'me');
  const { a, b, step } = pair();
  a.ask('B', 'c', 'long');
  b.heard('A', parseContest(contestMsg('ask', 'B', 'c', 'long')));
  assert.equal(b.ruleOf('A'), 'long');
  b.accept('A');
  a.heard('B', { verb: 'ok', to: 'A', cid: 'c' });
  assert.equal(a.rule, 'long');
  assert.equal(b.rule, 'long');
  step(COUNTDOWN_MS);
  a.caught('axolotl', () => 0.5); a.caught('cutlassfish', () => 0.5);
  assert.equal(a.c.me.fish, 'cutlassfish'); // longest, not rarest
  const { fishById } = await import('../src/core/fishing.js');
  assert.equal(a.c.me.by[fishById('axolotl').rarity] + a.c.me.by[fishById('cutlassfish').rarity], 2);
});
