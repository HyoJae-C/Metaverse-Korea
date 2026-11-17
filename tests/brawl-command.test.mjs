import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newFighter, stepFight, startMove, moveTicks, STYLE_IDS, STYLES, copyMatch, newMatch, packMatch, unpackMatch } from '../src/core/brawl.js';
import { createSoloCaster, createScreens, KEY_EVERY, TV } from '../src/core/brawl-tv.js';

const pair = () => { const a = newFighter(0), b = newFighter(1); a.x = -0.4; b.x = 0.4; return [a, b]; };
// The first move a press starts (within 18 ticks), for a style.
function first(style, inp, meter = 100, gap = 0.8) {
  const a = newFighter(0, style), b = newFighter(1); a.x = -gap / 2; b.x = gap / 2; a.sp = meter;
  const ev = stepFight(a, b, inp);
  for (let i = 0; i < 18 && a.st === 'idle'; i++) ev.push(...stepFight(a, b));
  return { a, ev };
}
test('the same keys for every style: J string, K jump, L dodge, U shot, I special 1, S + I special 2, close toward + J grab', () => {
  for (const style of STYLE_IDS) {
    const slot = STYLES[style].slot;
    assert.equal(first(style, { p: true }).a.move, 'lp', style + ' J');
    assert.equal(first(style, { k: true }).a.st, 'jump', style + ' K');
    assert.equal(first(style, { dash: -1 }).a.st, 'dodge', style + ' L');
    assert.equal(first(style, { s1: true }, 0, 2.5).a.move, 'ranged', style + ' U');
    const one = first(style, { s2: true });
    assert.equal(one.a.move, slot, style + ' I'); assert.equal(one.a.sp, 50);
    const two = first(style, { s2: true, mz: -1 });
    assert.equal(two.a.move, 'super', style + ' S + I'); assert.equal(two.a.sp, 0);
    assert.equal(first(style, { s2: true, mz: -1 }, 60).a.move, slot, style + ' S + I without a full bar: special 1');
    assert.equal(first(style, { mx: 1, p: true }, 0, 0.75).a.move, 'grab', style + ' close toward + J');
    assert.equal(first(style, { mx: 1, s1: true }, 0, 0.75).a.move, 'grab', style + ' close toward + U');
    assert.equal(first(style, { mx: 1, p: true }, 0, 1.2).a.move, 'lp', style + ' toward + J from further: the jab');
  }
});
test('without the bar, I does nothing; holding S guards and stands still', () => {
  const { a } = first('brawler', { s2: true }, 0);
  assert.equal(a.st, 'idle');
  const [c, d] = pair(); const x = c.x;
  for (let i = 0; i < 30; i++) stepFight(c, d, { mz: -1, mx: 1 });
  assert.ok(c.guard); assert.equal(c.x, x);
});
test('copies never share mutable state', () => {
  const m = newMatch('brawler', 'ninja', true);
  m.a.buf.p = 5;
  const c = copyMatch(m), u = unpackMatch(JSON.parse(JSON.stringify(packMatch(m))));
  assert.deepEqual(u.a.buf, m.a.buf);
  c.a.buf.p = 1; assert.equal(m.a.buf.p, 5);
});
test('all styles normal hits lose 25 percent before rounding; specials keep their damage', () => {
  for (const style of STYLE_IDS) for (const id of ['lp', 'rp', 'lk', 'rk', 'upper', 'palm', 'fly']) {
    const [a, b] = pair(); a.style = style;
    const f = newFighter(0, style); a.mv = f.mv; a.sp = 100;
    startMove(a, id);
    const hits = [];
    for (let i = 0; i < moveTicks(a.mv[id]) + 90; i++) hits.push(...stepFight(a, b));
    const h = hits.find(e => e.k === 'hit');
    assert.ok(h, style + '/' + id);
    const base = id === 'palm' && a.mv[id].shot ? a.mv[id].shot.dmg : a.mv[id].dmg;
    assert.equal(h.dmg, Math.max(1, Math.round(base * (['palm', 'fly'].includes(id) ? 1 : 0.75))), style + '/' + id);
  }
});
test('solo broadcast sends status only, keeps late viewers informed, and clears on exit', () => {
  const messages = [], tv = createScreens(2);
  const cast = createSoloCaster(text => { messages.push(text); tv.heard('solo-player', text); });
  cast.start();
  for (let i = 0; i < KEY_EVERY * 3; i++) { cast.step(); tv.views.forEach(v => v.tick()); }
  assert.ok(messages.every(s => s === TV + 'p'));
  assert.equal(messages.length, 4);
  assert.equal(tv.views[0].info.solo, true); assert.equal(tv.views[0].match, null);
  cast.end(); assert.equal(tv.views[0].from, null);
  const count = messages.length; cast.step(); cast.end(); assert.equal(messages.length, count);
});
test('the grab breaks a guard but is a beat slower: a jab thrown at the same time wins', async () => {
  const { MOVES } = await import('../src/core/brawl.js');
  assert.ok(MOVES.grab.startup >= MOVES.lp.startup + 3, 'slower to come out than a jab');
  const a = newFighter(0), b = newFighter(1); a.x = -0.37; b.x = 0.37;
  const ev = stepFight(a, b, { mx: 1, p: true }, { p: true });
  for (let i = 0; i < 40; i++) ev.push(...stepFight(a, b));
  assert.ok(ev.some((e) => e.k === 'hit' && e.by === 1 && e.move === 'lp'), 'the jab lands first');
  assert.ok(!ev.some((e) => e.k === 'hit' && e.move === 'grab'), 'and stops the grab');
});
